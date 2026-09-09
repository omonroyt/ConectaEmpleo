"""Criterio de cierre 4 de B6/B7: corrida corta contra el agente real
(`AI_ADAPTER_INTERVIEW=agentic`) para comprobar que produce preguntas válidas
que pasan el Guardián de Equidad.

**No corre en `pytest` por defecto** (gasta tokens reales de Anthropic). Se
ejecuta explícitamente con:

    RUN_LIVE_LLM_SMOKE=1 pytest tests/test_interview_live_agentic.py -v -s

Requiere `ANTHROPIC_API_KEY` real (mismo gate que `tests/test_llm_smoke.py`,
que ya demostró la llamada real contra `resolve_vacancy_requirements`; este
archivo ejercita `next_interview_question`, la operación que consume el
Guardián de Equidad).

Simula 3 turnos de follow-up sucesivos (la forma en que el orquestador real
invoca al agente, ver `app/ai/orchestration/interview_flow.py::_maybe_create_followup`):
cada turno pasa un `history` de un solo turno "candidato" con una respuesta
larga, para maximizar la probabilidad de que el agente proponga `PROBE`, y
cada pregunta propuesta se pasa por `equity_guardian.find_violations` para
confirmar que no toca temas prohibidos ni hace más de una pregunta.

Costo aproximado: `claude-sonnet-5` cuesta $2.00 / 1M tokens de entrada y
$10.00 / 1M de salida. Con `llm_max_tokens` bajo (300) y un contexto de
entrada de un par de KB por turno (snapshot + una rúbrica + un turno), 3
turnos rondan 2,000-3,000 tokens de entrada y unos 300-600 de salida en
total -- del orden de **$0.01-0.02 USD** por corrida completa. La cifra real
que reportó esta tarea se imprime al final de la prueba.
"""

from __future__ import annotations

import os
import uuid

import pytest
from sqlalchemy.orm import Session

from app.ai.adapters.agentic import AgenticAdapter
from app.ai.contracts.base import CandidateSnapshotForAI, TurnDTO
from app.ai.contracts.interview import InterviewTurnRequest, InterviewTurnResult
from app.ai.guardrails import equity_guardian
from app.config import get_settings
from app.modules.catalog.models import JobFamily
from app.modules.catalog.service import resolve_rubric_specs_for_family

pytestmark = pytest.mark.skipif(
    not (os.environ.get("RUN_LIVE_LLM_SMOKE") and get_settings().anthropic_api_key),
    reason=(
        "Prueba real contra Anthropic (gasta tokens). Se salta salvo que se pida "
        "explícitamente con RUN_LIVE_LLM_SMOKE=1 y ANTHROPIC_API_KEY configurada."
    ),
)

LONG_ANSWER = (
    "Primero reviso la orden de compra completa, comparo cada artículo con el inventario físico "
    "y reporto cualquier diferencia al supervisor de inmediato antes de continuar."
)


def test_three_agentic_followup_turns_pass_the_equity_guardian(db_session: Session) -> None:
    settings = get_settings().model_copy(update={"llm_max_tokens": 300, "llm_temperature": 0.3})
    adapter = AgenticAdapter(settings=settings)

    family_id = db_session.query(JobFamily.id).filter(JobFamily.code == "WAREHOUSE_SUPERVISOR").scalar()
    rubrics = resolve_rubric_specs_for_family(db_session, family_id)
    rubric = next(r for r in rubrics if r.competency_code == "WAREHOUSE_HE_01")

    snapshot = CandidateSnapshotForAI(anon_code="CND-TEST", job_family_code="WAREHOUSE_SUPERVISOR")

    total_input_tokens = 0
    total_output_tokens = 0
    live_results: list[InterviewTurnResult] = []
    fallback_count = 0

    for turn_number in range(3):
        turn = TurnDTO(
            turn_id=str(uuid.uuid4()),
            sequence=1,
            question_text=(
                "Al finalizar un conteo físico detectas que una cantidad no coincide con el sistema. "
                "¿Qué pasos seguirías para investigar y corregir la diferencia?"
            ),
            target_competency_code="WAREHOUSE_HE_01",
            question_intent="SCENARIO",
            answer_text=LONG_ANSWER,
        )
        request = InterviewTurnRequest(
            session_id=f"live-smoke-{turn_number}",
            job_family_code="WAREHOUSE_SUPERVISOR",
            candidate_snapshot=snapshot,
            rubrics=[rubric],
            claims=[],
            history=[turn],
            coverage_state={"WAREHOUSE_HE_01": "PARTIAL"},
            remaining_questions=10,
        )

        result = adapter.next_interview_question(request)

        # Contrato: como máximo una pregunta por turno, sin importar si la
        # respuesta vino del proveedor real o (rara vez, ante una falla de
        # validación agotada en el proveedor) del fallback determinista.
        assert result.action in ("ASK", "PROBE", "SWITCH_COMPETENCY", "FINISH")
        if result.question_text:
            violations = equity_guardian.find_violations(result.question_text)
            assert violations == [], f"El agente real produjo una pregunta bloqueable: {violations}"

        response = adapter.last_response
        if response is None:
            # El SDK ya agotó sus reintentos de validación EN el proveedor real
            # (docs/05 §8) y `LLMFailoverPolicy` cayó al fallback funcional
            # (docs/05 §11.1 nivel 2) -- ocurre ocasionalmente por variabilidad
            # real del modelo, no es un bug de este test. Se cuenta y se sigue;
            # la aserción de cierre exige que la MAYORÍA de los turnos sí hayan
            # sido reales, no los 3 sin excepción.
            fallback_count += 1
            continue

        assert response.provider == "anthropic"
        total_input_tokens += response.input_tokens
        total_output_tokens += response.output_tokens
        live_results.append(result)

    assert len(live_results) >= 2, (
        f"Se esperaban al menos 2 de 3 turnos respondidos por el proveedor real; "
        f"{fallback_count} cayeron al fallback determinista."
    )

    input_cost = total_input_tokens / 1_000_000 * 2.00
    output_cost = total_output_tokens / 1_000_000 * 10.00
    print(  # noqa: T201 -- salida deliberada para el reporte de cierre de B6/B7
        "\n--- Corrida real contra claude-sonnet-5 (next_interview_question) ---\n"
        f"turnos_reales={len(live_results)}/3 fallback_count={fallback_count}\n"
        f"tokens_in={total_input_tokens} tokens_out={total_output_tokens} "
        f"costo_estimado=${input_cost + output_cost:.4f} USD\n"
        f"preguntas propuestas={[r.question_text for r in live_results]}\n"
    )
