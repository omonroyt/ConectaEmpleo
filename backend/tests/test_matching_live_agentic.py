"""B9/B10 criterio de cierre 4: prueba de humo REAL contra Claude Sonnet 5
para `explain_match` (A5 EXPLAIN).

Mismo patrón que `tests/test_llm_smoke.py` (B11): gastar pocos tokens a
propósito, gateada por `RUN_LIVE_LLM_SMOKE=1`, se salta si no hay
`ANTHROPIC_API_KEY`. Llama a `AgenticAdapter.explain_match` directamente
(no vía `invoke.py`) y valida las reglas duras de A5 EXPLAIN (docs/05 §7)
contra la respuesta real del proveedor: ningún porcentaje distinto de
`total_score`, máximo ~120 palabras, y que de verdad vino de Anthropic (no
del fallback determinista).

    RUN_LIVE_LLM_SMOKE=1 pytest tests/test_matching_live_agentic.py -v -s
"""

from __future__ import annotations

import os
import re

import pytest

from app.ai.adapters.agentic import AgenticAdapter
from app.ai.contracts.matching import BreakdownItemDTO, MatchExplanationRequest, MatchExplanationResult
from app.config import get_settings

pytestmark = pytest.mark.skipif(
    not (os.environ.get("RUN_LIVE_LLM_SMOKE") and get_settings().anthropic_api_key),
    reason=(
        "Prueba de humo real (gasta tokens de Anthropic). Se salta salvo que se pida "
        "explícitamente con RUN_LIVE_LLM_SMOKE=1 y ANTHROPIC_API_KEY configurada."
    ),
)


def test_explain_match_against_real_anthropic_api_respects_hard_rules() -> None:
    settings = get_settings().model_copy(update={"llm_max_tokens": 512, "llm_temperature": 0.2})
    adapter = AgenticAdapter(settings=settings)

    request = MatchExplanationRequest(
        total_score=77,
        next_best_score=67,
        breakdown=[
            BreakdownItemDTO(component="TECHNICAL", weight=40, raw=93.5, contribution=37.4),
            BreakdownItemDTO(component="BEHAVIORAL", weight=20, raw=96.1, contribution=19.22),
            BreakdownItemDTO(component="EXPERIENCE", weight=15, raw=0, contribution=0),
            BreakdownItemDTO(component="EVIDENCE", weight=10, raw=50, contribution=5),
            BreakdownItemDTO(component="SALARY", weight=8, raw=100, contribution=8),
            BreakdownItemDTO(component="LOCATION", weight=7, raw=100, contribution=7),
        ],
        penalties=[],
        strengths=["Excel y hojas de cálculo: evidencia sólida (100/100)", "Comunicación: evidencia sólida (95/100)"],
        gaps=["Experiencia relevante insuficiente"],
    )

    result = adapter.explain_match(request)

    # 1. Valida contra el contrato.
    validated = MatchExplanationResult.model_validate(result.model_dump())
    text = validated.explanation_text

    # 2. Vino del proveedor real, no del fallback determinista.
    response = adapter.last_response
    assert response is not None, (
        "adapter.last_response es None: la llamada cayó al DeterministicAdapter "
        "(falla de proveedor o de validación) en vez de completar contra Anthropic."
    )
    assert response.provider == "anthropic"
    assert response.input_tokens > 0
    assert response.output_tokens > 0

    print(f"\n--- explanation_text real (Anthropic) ---\n{text}\n")  # noqa: T201

    # 3. Regla dura de A5 EXPLAIN (docs/05 §7): si el texto menciona un
    # porcentaje, nunca puede ser distinto de total_score -- el modelo real
    # puede optar por no usar el símbolo "%" en absoluto (p. ej. "un puntaje
    # de 77"), lo cual también cumple la regla (no está prohibido omitirlo,
    # solo está prohibido inventar uno distinto).
    percentages = [float(m) for m in re.findall(r"(\d+(?:\.\d+)?)\s*%", text)]
    assert all(p == request.total_score for p in percentages), (
        f"la explicación menciona un % distinto de total_score={request.total_score}: {percentages}"
    )
    # ...y máximo ~120 palabras (con algo de margen para el proveedor real).
    word_count = len(text.split())
    assert word_count <= 140, f"explicación de {word_count} palabras, se esperaba <=~120: {text!r}"

    # 4. Nunca sugiere contratar ni predice desempeño (RB-03/RB-04) -- chequeo heurístico.
    lowered = text.lower()
    for banned in ("contratar", "recomiendo contratarlo", "va a rendir", "tendrá un buen desempeño"):
        assert banned not in lowered, f"la explicación viola RB-03/RB-04 ('{banned}'): {text!r}"

    cost_in = response.input_tokens
    cost_out = response.output_tokens
    # Precios de `claude-sonnet-5` documentados en la bitácora de B6/B7: $2.00/$10.00 por millón de tokens.
    usd = cost_in / 1_000_000 * 2.00 + cost_out / 1_000_000 * 10.00

    print(  # noqa: T201 -- salida deliberada de la prueba de humo para el reporte de cierre
        "\n--- Prueba de humo real: explain_match (A5 EXPLAIN) ---\n"
        f"provider={response.provider} model={response.model} latency_ms={response.latency_ms} "
        f"tokens_in={cost_in} tokens_out={cost_out} costo_estimado_usd={usd:.5f}\n"
        f"explanation_text={text!r}\n"
    )
