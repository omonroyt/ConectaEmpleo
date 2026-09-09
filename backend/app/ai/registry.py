"""Selección de adaptador por operación (docs/04 §6.4, docs/05 §11.2).

Única puerta de entrada para obtener un `AIPort`. Los módulos de dominio y
`app/ai/invoke.py` llaman a `get_adapter(operation)`; nunca importan
`app/ai/adapters/deterministic.py` (o el futuro `agentic.py`) directamente.

Reglas de resolución, en orden:
1. `AI_MODE=demo` fuerza `deterministic` para las 9 operaciones sin excepción
   (modo demo de la presentación, docs/05 §11.2). Es intencional que esto
   ignore cualquier override por operación.
2. Si no, se usa el override de grupo (`AI_ADAPTER_<GRUPO>`) si está fijado.
3. Si no hay override, se usa el default global `AI_ADAPTER`.

`AgenticAdapter` no existe todavía (llega en B11): pedir `agentic` para
cualquier operación levanta `AdapterNotImplementedError` con un mensaje claro
en vez de degradar en silencio a determinista o fingir una respuesta real.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from app.ai.adapters.deterministic import DeterministicAdapter
from app.ai.port import AI_OPERATIONS, AIPort
from app.config import Settings, get_settings

AdapterGroup = Literal["cv", "interview", "assessment", "advisory", "matching"]

#: Mapa operación -> grupo de configuración. Ver `.env.example` (`AI_ADAPTER_*`).
_OPERATION_GROUP: dict[str, AdapterGroup] = {
    "parse_cv": "cv",
    "build_cv_conversationally": "cv",
    "next_interview_question": "interview",
    "evaluate_competencies": "assessment",
    "build_talent_profile": "assessment",
    "generate_feedback_report": "advisory",
    "recommend_learning_path": "advisory",
    "explain_match": "matching",
    "resolve_vacancy_requirements": "matching",
}

assert set(_OPERATION_GROUP) == set(AI_OPERATIONS), "Registry desincronizado de AIPort.AI_OPERATIONS"


class AdapterNotImplementedError(RuntimeError):
    """`AI_ADAPTER*=agentic` pedido antes de que `AgenticAdapter` exista (B11)."""


class UnknownAIOperationError(ValueError):
    """`operation` no es una de las 9 operaciones declaradas en `AIPort`."""


def resolve_adapter_name(operation: str, settings: Settings | None = None) -> Literal["deterministic", "agentic"]:
    """Nombre del adaptador ('deterministic' | 'agentic') para `operation`, sin instanciarlo."""

    if operation not in _OPERATION_GROUP:
        raise UnknownAIOperationError(
            f"'{operation}' no es una operación de AIPort. Operaciones válidas: {AI_OPERATIONS}."
        )
    settings = settings or get_settings()
    if settings.ai_mode == "demo":
        return "deterministic"

    group = _OPERATION_GROUP[operation]
    override = getattr(settings, f"ai_adapter_{group}")
    return override or settings.ai_adapter


@lru_cache
def _deterministic_singleton() -> DeterministicAdapter:
    # Sin estado propio (lee siempre de la DB en cada llamada) -> seguro de cachear.
    return DeterministicAdapter()


def get_adapter(operation: str, settings: Settings | None = None) -> AIPort:
    """Devuelve la instancia de `AIPort` que debe atender `operation`."""

    name = resolve_adapter_name(operation, settings)
    if name == "deterministic":
        return _deterministic_singleton()

    # Punto de extensión de B11: `from app.ai.adapters.agentic import AgenticAdapter`.
    raise AdapterNotImplementedError(
        f"AI_ADAPTER para la operación '{operation}' está fijado en 'agentic', pero "
        "AgenticAdapter todavía no existe (llega en B11). Usa 'deterministic' o AI_MODE=demo."
    )
