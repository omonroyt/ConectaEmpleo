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

`AgenticAdapter` (B11, `app/ai/adapters/agentic.py`) implementa las 9
operaciones contra Claude Sonnet 5 real, con caída interna al
`DeterministicAdapter` ante falla de proveedor (docs/05 §11.1, sin segundo
proveedor real — ver `app/ai/adapters/llm/failover.py`). Fijar
`AI_ADAPTER=agentic` (global o por grupo, `AI_ADAPTER_<GRUPO>=agentic`)
selecciona un `AgenticAdapter` singleton para esa operación.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from app.ai.adapters.agentic import AgenticAdapter
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
    """Reservado por compatibilidad: `AgenticAdapter` ya existe desde B11.

    Se conserva la clase (en vez de borrarla) porque `docs/build/00_BUILD_STATE.md`
    y código de pruebas anteriores a B11 podían referenciarla; hoy no la lanza
    ninguna ruta de `get_adapter`.
    """


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


@lru_cache
def _agentic_singleton() -> AgenticAdapter:
    # `AgenticAdapter` construye su propio `AnthropicClient` y `CircuitBreaker`
    # internos a partir de `get_settings()` -- cachearlo evita reabrir un
    # cliente HTTP nuevo (y, más importante, un `CircuitBreaker` nuevo que
    # olvida el historial de fallas) en cada llamada.
    return AgenticAdapter()


def get_adapter(operation: str, settings: Settings | None = None) -> AIPort:
    """Devuelve la instancia de `AIPort` que debe atender `operation`."""

    name = resolve_adapter_name(operation, settings)
    if name == "deterministic":
        return _deterministic_singleton()
    return _agentic_singleton()
