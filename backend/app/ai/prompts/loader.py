"""Cargador de prompts en 4 capas (docs/05 §9.1, §9.3). Ver `app/ai/prompts/__init__.py`.

Únicamente compone texto de archivo (capas 1–3); la capa 4 (contexto runtime:
rúbricas, historial, snapshot del candidato) la arma `AgenticAdapter` en el
mensaje de usuario, siempre como datos delimitados, nunca como instrucciones
(docs/05 §10.4).
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

_PROMPTS_DIR = Path(__file__).resolve().parent
_CONSTITUTION_FILE = _PROMPTS_DIR / "constitution" / "v1.md"

#: Operación de `AIPort` -> (carpeta de agente, nombre de archivo sin extensión)
#: dentro de `app/ai/prompts/`. `evaluate_competencies` y `build_talent_profile`
#: comparten `assessor/v1.md` a propósito: ambas son responsabilidad del mismo
#: agente evaluador (A3), con el mismo rol, los mismos límites y el mismo
#: contrato de fondo — lo que cambia entre ellas es la TAREA concreta (EVALUATE
#: vs. PROFILE), que es contexto de capa 4, no rol ni contrato de capa 2/3.
#: Las demás 7 operaciones tienen cada una su propio archivo — "un prompt por
#: operación" tal como exige `backend/CLAUDE.md`.
OPERATION_PROMPT_PATH: dict[str, tuple[str, str]] = {
    "parse_cv": ("profiler", "extract_v1"),
    "build_cv_conversationally": ("profiler", "build_v1"),
    # v2 (B14): v1 + capa de comprensión obligatoria antes de preguntar. v1 se
    # conserva sin editar porque `ai_invocations.prompt_version` de entrevistas
    # ya corridas apunta a él y esa bitácora debe seguir siendo reproducible.
    "next_interview_question": ("interviewer", "v2"),
    "evaluate_competencies": ("assessor", "v1"),
    "build_talent_profile": ("assessor", "v1"),
    "generate_feedback_report": ("advisor", "feedback_v1"),
    "recommend_learning_path": ("advisor", "learning_v1"),
    "resolve_vacancy_requirements": ("analyst", "resolve_v1"),
    "explain_match": ("analyst", "explain_v1"),
}


class PromptNotRegisteredError(ValueError):
    """`operation` no tiene una capa 2/3 registrada en `OPERATION_PROMPT_PATH`."""


def _read_nonempty(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Prompt no encontrado: {path}")
    text = path.read_text(encoding="utf-8")
    if not text.strip():
        raise ValueError(f"Prompt vacío: {path}")
    return text


@lru_cache
def load_constitution() -> str:
    """Capa 1: la Constitución de docs/05 §9.2, literal. Presente en las 9 operaciones."""

    return _read_nonempty(_CONSTITUTION_FILE)


def _operation_prompt_path(operation: str) -> tuple[str, str]:
    try:
        return OPERATION_PROMPT_PATH[operation]
    except KeyError as exc:
        raise PromptNotRegisteredError(
            f"'{operation}' no tiene prompt registrado en app/ai/prompts/loader.py."
        ) from exc


@lru_cache
def _load_role_and_contract(folder: str, name: str) -> str:
    """Capas 2 (rol) + 3 (contrato): viven juntas en un solo archivo por operación."""

    return _read_nonempty(_PROMPTS_DIR / folder / f"{name}.md")


def prompt_version_for(operation: str) -> str:
    """`prompt_version` a persistir en `ai_invocations` para `operation`."""

    folder, name = _operation_prompt_path(operation)
    return f"{folder}/{name}"


def compose_system_prompt(operation: str) -> str:
    """Compone capas 1+2+3 para `operation` en un único `system` string.

    La capa 4 (contexto) nunca se agrega aquí — la arma `AgenticAdapter` como
    mensaje de usuario, con los datos de runtime (docs/05 §9.1).
    """

    constitution = load_constitution()
    folder, name = _operation_prompt_path(operation)
    role_and_contract = _load_role_and_contract(folder, name)
    return f"{constitution.strip()}\n\n---\n\n{role_and_contract.strip()}"
