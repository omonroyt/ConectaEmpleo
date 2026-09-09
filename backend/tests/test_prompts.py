"""B11: arquitectura de prompts en 4 capas (docs/05 §9).

Cubre el criterio de cierre 1 de B11:
- La Constitución (docs/05 §9.2) aparece, literal, en la composición de las 9
  operaciones de `AIPort`.
- Ningún archivo de `app/ai/prompts/` contiene el texto de una rúbrica o de
  una pregunta del banco (esas llegan como datos en runtime, nunca en un
  archivo de prompt — docs/05 §6.1, Master Prompt §24).
- Un prompt por operación (con la única excepción documentada de
  `evaluate_competencies`/`build_talent_profile`, que comparten el rol del
  agente evaluador).
- `prompt_version` tiene el formato `<agente>/<archivo>`.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from app.ai.port import AI_OPERATIONS
from app.ai.prompts.loader import compose_system_prompt, load_constitution, prompt_version_for

_PROMPTS_DIR = Path(__file__).resolve().parents[1] / "app" / "ai" / "prompts"

# Nombres de CAMPO de `RubricSpec`/pregunta (`app/ai/contracts/base.py`) se
# pueden mencionar en prosa para describir el contrato de salida (capa 3) --
# eso no es lo que esta prueba prohíbe. Lo que nunca debe aparecer es
# CONTENIDO real de una rúbrica o de una pregunta del banco (docs/05 §6.1,
# Master Prompt §24): un bloque con forma de JSON de datos, un `question_id`
# real del banco (`docs/build/06_INTERVIEW_SYSTEM.md` §1: `HA-01`, `SA-07`,
# `HE-03`, `HM-05`, ...) o el texto literal de una pregunta/descriptor ya
# existente en la documentación.
_QUESTION_ID_PATTERN = re.compile(r"\b[A-Z]{2,4}-\d{2}\b")
_JSON_DATA_BLOB_PATTERN = re.compile(r'"[A-Za-z_]+"\s*:\s*[\[{]')
_FORBIDDEN_LITERAL_SNIPPETS = [
    # Descriptor literal de RubricLevelDTO nivel 0 (docs/05 §6.2 ejemplo INVENTORY_CONTROL).
    "no aporta ejemplos ni describe prácticas",
    # Texto literal de la pregunta HA-01 del banco (docs/build/06_INTERVIEW_SYSTEM.md §2).
    "cuéntame una tarea concreta que hayas realizado en excel",
    # `risk_flag_triggers.when` literal del mismo ejemplo de banco.
    "propone modificar datos para hacerlos coincidir",
]


def _all_prompt_files() -> list[Path]:
    return sorted(p for p in _PROMPTS_DIR.rglob("*.md") if p.is_file())


def test_constitution_file_exists_and_is_literal() -> None:
    text = load_constitution()
    # Frase textual de docs/05 §9.2, punto 4 -- el sesgo más probable y más
    # dañino del producto (perfiles operativos, registro coloquial).
    assert "La forma de hablar no es la competencia." in text
    assert "Formas parte de Conecta Empleo" in text


@pytest.mark.parametrize("operation", AI_OPERATIONS)
def test_constitution_present_in_every_composed_prompt(operation: str) -> None:
    composed = compose_system_prompt(operation)
    assert "Formas parte de Conecta Empleo" in composed
    assert "La forma de hablar no es la competencia." in composed


@pytest.mark.parametrize("operation", AI_OPERATIONS)
def test_prompt_version_has_agent_slash_file_format(operation: str) -> None:
    version = prompt_version_for(operation)
    assert "/" in version
    folder, _, name = version.partition("/")
    assert (_PROMPTS_DIR / folder / f"{name}.md").exists()


@pytest.mark.parametrize("path", _all_prompt_files(), ids=lambda p: p.name)
def test_no_prompt_file_contains_rubric_or_question_content(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    lowered = text.lower()

    for snippet in _FORBIDDEN_LITERAL_SNIPPETS:
        assert snippet not in lowered, f"{path} contiene el texto literal '{snippet}' de una rúbrica/pregunta."

    match = _QUESTION_ID_PATTERN.search(text)
    assert match is None, f"{path} contiene un question_id aparente del banco: {match.group(0) if match else ''}"

    match = _JSON_DATA_BLOB_PATTERN.search(text)
    assert match is None, f"{path} contiene un bloque con forma de JSON de datos: {match.group(0) if match else ''}"


def test_all_nine_operations_have_a_registered_prompt() -> None:
    for operation in AI_OPERATIONS:
        # No debe lanzar PromptNotRegisteredError ni FileNotFoundError.
        compose_system_prompt(operation)


def test_assessor_is_the_only_prompt_shared_by_two_operations() -> None:
    from app.ai.prompts.loader import OPERATION_PROMPT_PATH

    counts: dict[tuple[str, str], list[str]] = {}
    for operation, path in OPERATION_PROMPT_PATH.items():
        counts.setdefault(path, []).append(operation)

    shared = {path: ops for path, ops in counts.items() if len(ops) > 1}
    assert shared == {("assessor", "v1"): ["evaluate_competencies", "build_talent_profile"]}
