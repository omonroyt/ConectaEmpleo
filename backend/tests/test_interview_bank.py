"""Tests mínimos de master prompt §31 sobre el banco de preguntas de entrevista
(`app/seeds/interview_bank/*.json`) y las rúbricas (`app/seeds/rubrics/*.json`).

No dependen de la base de datos para la parte estructural (leen los JSON
directamente), salvo `test_every_competency_has_a_complete_rubric_in_db` y
`test_seeded_questions_reference_a_real_competency_in_db`, que sí requieren
que `python -m app.seeds.run` ya haya corrido (igual que el resto de
`tests/test_catalog.py`).
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.seeds.families import COMPETENCIES_BY_FAMILY

BANK_DIR = Path(__file__).resolve().parent.parent / "app" / "seeds" / "interview_bank"
RUBRICS_DIR = Path(__file__).resolve().parent.parent / "app" / "seeds" / "rubrics"

BANK_FILES = {
    "ADMIN_ASSISTANT": "admin_assistant.json",
    "HEAVY_MACHINERY_OPERATOR": "heavy_machinery_operator.json",
    "WAREHOUSE_SUPERVISOR": "warehouse_supervisor.json",
}

# master prompt §22: temas que ninguna pregunta debe tocar ni usar para scoring.
FORBIDDEN_TERMS = [
    "edad",
    "género",
    "genero",
    "estado civil",
    "embarazo",
    "religi",  # religión / religioso
    "orientación",
    "orientacion",
    "política",
    "politica",
    "étnic",
    "etnic",
    "salud",
    "familia",
]


def _load_bank(family_code: str) -> list[dict]:
    with open(BANK_DIR / BANK_FILES[family_code], encoding="utf-8") as fh:
        return json.load(fh)


def _load_rubric(family_code: str) -> list[dict]:
    with open(RUBRICS_DIR / BANK_FILES[family_code], encoding="utf-8") as fh:
        return json.load(fh)


ALL_FAMILY_CODES = list(BANK_FILES)


# ---------------------------------------------------------------------------
# Estructura (master prompt §31 "Estructura")
# ---------------------------------------------------------------------------


def test_exactly_three_profiles_exist() -> None:
    assert set(BANK_FILES) == {"ADMIN_ASSISTANT", "HEAVY_MACHINERY_OPERATOR", "WAREHOUSE_SUPERVISOR"}
    assert len(BANK_FILES) == 3


@pytest.mark.parametrize("family_code", ALL_FAMILY_CODES)
def test_each_profile_loads_and_has_14_questions_7_hard_7_soft(family_code: str) -> None:
    questions = _load_bank(family_code)
    assert len(questions) == 14

    hard = [q for q in questions if q["block"] == "HARD"]
    soft = [q for q in questions if q["block"] == "SOFT"]
    assert len(hard) == 7
    assert len(soft) == 7


@pytest.mark.parametrize("family_code", ALL_FAMILY_CODES)
def test_question_ids_are_unique_and_stable_within_family(family_code: str) -> None:
    questions = _load_bank(family_code)
    ids = [q["question_id"] for q in questions]
    assert len(ids) == len(set(ids))
    # Estables: siguen el prefijo del perfil (HA/SA, HE/SE, HM/SM) del master prompt.
    for question_id in ids:
        assert re.match(r"^[A-Z]{2}-\d{2}$", question_id), question_id


@pytest.mark.parametrize("family_code", ALL_FAMILY_CODES)
def test_no_question_text_is_empty(family_code: str) -> None:
    questions = _load_bank(family_code)
    for question in questions:
        assert question["text"].strip(), question["question_id"]


@pytest.mark.parametrize("family_code", ALL_FAMILY_CODES)
def test_every_question_references_a_competency_that_exists_in_the_seed(family_code: str) -> None:
    valid_codes = {c["code"] for c in COMPETENCIES_BY_FAMILY[family_code]}
    questions = _load_bank(family_code)
    for question in questions:
        assert question["competency_code"] in valid_codes, question["question_id"]
    # Cobertura 1:1 — cada una de las 14 competencias tiene exactamente una pregunta.
    referenced = {q["competency_code"] for q in questions}
    assert referenced == valid_codes


# ---------------------------------------------------------------------------
# Evaluación / rúbricas (master prompt §31 "Evaluación")
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("family_code", ALL_FAMILY_CODES)
def test_every_competency_has_a_rubric_with_5_levels_and_complete_score_mapping(family_code: str) -> None:
    rubrics = _load_rubric(family_code)
    assert len(rubrics) == 14

    for rubric in rubrics:
        levels = rubric["levels"]
        assert len(levels) == 5
        assert sorted(level["level"] for level in levels) == [0, 1, 2, 3, 4]
        for level in levels:
            assert level["descriptor"].strip()

        assert rubric["score_mapping"] == {"0": 0, "1": 25, "2": 50, "3": 75, "4": 100}


@pytest.mark.parametrize("family_code", ALL_FAMILY_CODES)
def test_rubric_competencies_match_question_bank_competencies(family_code: str) -> None:
    rubric_codes = {r["competency_code"] for r in _load_rubric(family_code)}
    question_codes = {q["competency_code"] for q in _load_bank(family_code)}
    assert rubric_codes == question_codes


# ---------------------------------------------------------------------------
# Safety / reglas (master prompt §31 "Safety / reglas")
# ---------------------------------------------------------------------------


def test_heavy_machinery_hydraulic_leak_question_triggers_safety_critical_high() -> None:
    questions = _load_bank("HEAVY_MACHINERY_OPERATOR")
    hm05 = next(q for q in questions if q["question_id"] == "HM-05")
    triggers = hm05["risk_flag_triggers"]
    assert any(t["code"] == "SAFETY_CRITICAL" and t["severity"] == "high" for t in triggers)


def test_warehouse_integrity_question_never_favors_merchandise_over_a_person() -> None:
    rubrics = _load_rubric("WAREHOUSE_SUPERVISOR")
    se07 = next(r for r in rubrics if r["competency_code"] == "WAREHOUSE_SA_07")
    level_0 = next(level for level in se07["levels"] if level["level"] == 0)
    # El nivel 0 debe describir explícitamente la conducta que nunca se premia:
    # confrontar o arriesgarse por proteger la mercancía.
    assert "mercanc" in level_0["descriptor"].lower()
    assert "confront" in level_0["descriptor"].lower() or "arriesg" in level_0["descriptor"].lower()
    # Ningún nivel 3 o 4 (evidencia sólida/fuerte) debe premiar esa conducta.
    for level in se07["levels"]:
        if level["level"] >= 3:
            assert "prioriza" not in level["descriptor"].lower() or "seguridad" in level["descriptor"].lower()

    questions = _load_bank("WAREHOUSE_SUPERVISOR")
    se07_question = next(q for q in questions if q["question_id"] == "SE-07")
    assert any(t["code"] == "PHYSICAL_SAFETY_RISK" and t["severity"] == "high" for t in se07_question["risk_flag_triggers"])


def test_admin_confidentiality_breach_produces_a_flag() -> None:
    questions = _load_bank("ADMIN_ASSISTANT")
    sa07 = next(q for q in questions if q["question_id"] == "SA-07")
    assert any(t["code"] == "CONFIDENTIALITY_BREACH" for t in sa07["risk_flag_triggers"])


# ---------------------------------------------------------------------------
# §22 — ningún texto toca temas prohibidos (recorre los 42 textos reales).
# ---------------------------------------------------------------------------


def test_no_question_text_mentions_a_prohibited_topic() -> None:
    all_texts: list[tuple[str, str]] = []
    for family_code in ALL_FAMILY_CODES:
        for question in _load_bank(family_code):
            all_texts.append((question["question_id"], question["text"]))
            if question.get("no_experience_variant"):
                all_texts.append((f"{question['question_id']}-no-experience", question["no_experience_variant"]))

    assert len(all_texts) >= 42

    violations = []
    for question_id, text in all_texts:
        lowered = text.lower()
        for term in FORBIDDEN_TERMS:
            if term in lowered:
                violations.append((question_id, term))

    assert violations == [], f"Preguntas con términos prohibidos de §22: {violations}"


# ---------------------------------------------------------------------------
# Integración con la base de datos ya sembrada (igual supuesto que test_catalog.py).
# ---------------------------------------------------------------------------


def test_seeded_interview_questions_reference_a_real_competency_in_db(client: TestClient) -> None:
    families = {f["code"]: f for f in client.get("/api/v1/job-families").json()}
    for family_code in ALL_FAMILY_CODES:
        family_id = families[family_code]["id"]
        competencies = {c["code"] for c in client.get(f"/api/v1/job-families/{family_id}/competencies").json()}
        questions = client.get(f"/api/v1/job-families/{family_id}/interview-questions").json()
        assert len(questions) == 14
        for question in questions:
            assert question["competency_code"] in competencies
