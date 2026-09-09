"""B11 criterio de cierre 2: prueba de humo REAL contra la API de Anthropic.

Gasta pocos tokens a propósito (`LLM_MAX_TOKENS` bajo, `free_text` corto).
**No corre en `pytest` por defecto** -- el criterio 1 de B11 exige que
`pytest` sea verde sin gastar tokens; este archivo solo se ejecuta cuando se
pide explícitamente:

    RUN_LIVE_LLM_SMOKE=1 pytest tests/test_llm_smoke.py -v

Requiere `ANTHROPIC_API_KEY` real en `backend/.env` (o en el entorno). Se
salta automáticamente si no está configurada o si no se pidió explícitamente,
para que un checkout nuevo o un CI sin credenciales no fallen ni gasten nada.

Llama a `AgenticAdapter.resolve_vacancy_requirements` directamente (no a
través de `app/ai/invoke.py`, fuera del alcance de archivos de B11 -- ver la
nota en `app/ai/adapters/agentic.py`), valida la respuesta contra su contrato
Pydantic, y registra manualmente la fila de `ai_invocations` con los datos
reales de proveedor/modelo/latencia/tokens que expone
`AgenticAdapter.last_response`, demostrando que la información necesaria para
poblar esa tabla sí está disponible en el punto donde `invoke.py` debería
leerla.
"""

from __future__ import annotations

import hashlib
import os

import pytest
from sqlalchemy.orm import Session

from app.ai.adapters.agentic import AgenticAdapter
from app.ai.contracts.matching import (
    CatalogCompetencyRefDTO,
    RequirementResolutionRequest,
    RequirementResolutionResult,
)
from app.ai.models import AIInvocation
from app.ai.prompts.loader import prompt_version_for
from app.config import get_settings

pytestmark = pytest.mark.skipif(
    not (os.environ.get("RUN_LIVE_LLM_SMOKE") and get_settings().anthropic_api_key),
    reason=(
        "Prueba de humo real (gasta tokens de Anthropic). Se salta salvo que se pida "
        "explícitamente con RUN_LIVE_LLM_SMOKE=1 y ANTHROPIC_API_KEY configurada."
    ),
)


def test_resolve_vacancy_requirements_against_real_anthropic_api(db_session: Session) -> None:
    settings = get_settings().model_copy(update={"llm_max_tokens": 512, "llm_temperature": 0.0})
    adapter = AgenticAdapter(settings=settings)

    req = RequirementResolutionRequest(
        job_family_code="ADMIN_ASSISTANT",
        free_text="Buscamos a alguien que sepa usar Excel y controlar el archivo documental.",
        catalog_competencies=[
            CatalogCompetencyRefDTO(code="OFFICE_TOOLS", name="Herramientas de oficina", type="TECHNICAL"),
            CatalogCompetencyRefDTO(code="DOCUMENT_CONTROL", name="Control documental y archivo", type="TECHNICAL"),
        ],
        catalog_skills=[],
    )

    result = adapter.resolve_vacancy_requirements(req)

    # 1. La respuesta valida contra su contrato Pydantic.
    validated = RequirementResolutionResult.model_validate(result.model_dump())
    assert isinstance(validated, RequirementResolutionResult)

    # 2. De verdad vino del proveedor real, no del fallback determinista.
    response = adapter.last_response
    assert response is not None, (
        "adapter.last_response es None: la llamada cayó al DeterministicAdapter "
        "(falla de proveedor o de validación) en vez de completar contra Anthropic."
    )
    assert response.provider == "anthropic"
    assert response.model == settings.llm_primary_model
    assert response.latency_ms > 0
    assert response.input_tokens > 0
    assert response.output_tokens > 0

    # 3. Queda registrada en ai_invocations con proveedor, modelo, latencia y tokens.
    digest = hashlib.sha256(req.model_dump_json().encode("utf-8")).hexdigest()
    row = AIInvocation(
        operation="resolve_vacancy_requirements",
        contract_version=req.contract_version,
        prompt_version=prompt_version_for("resolve_vacancy_requirements"),
        adapter="agentic",
        provider=response.provider,
        model=response.model,
        input_digest=digest,
        raw_output=validated.model_dump(mode="json"),
        latency_ms=response.latency_ms,
        tokens_in=response.input_tokens,
        tokens_out=response.output_tokens,
        retries=response.retries,
        status="SUCCESS",
        error=None,
    )
    db_session.add(row)
    db_session.commit()
    db_session.refresh(row)

    persisted = db_session.get(AIInvocation, row.id)
    assert persisted is not None
    assert persisted.provider == "anthropic"
    assert persisted.model == settings.llm_primary_model
    assert persisted.tokens_in and persisted.tokens_out
    assert persisted.latency_ms > 0

    print(  # noqa: T201 -- salida deliberada de la prueba de humo para el reporte de cierre
        "\n--- Prueba de humo real: resolve_vacancy_requirements ---\n"
        f"provider={persisted.provider} model={persisted.model} "
        f"latency_ms={persisted.latency_ms} tokens_in={persisted.tokens_in} "
        f"tokens_out={persisted.tokens_out} retries={persisted.retries}\n"
        f"mapped={[m.label for m in validated.mapped]}\n"
        f"unmapped={validated.unmapped}\n"
        f"warnings={[w.text for w in validated.warnings]}\n"
    )
