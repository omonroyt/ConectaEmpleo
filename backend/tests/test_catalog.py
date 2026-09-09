"""Tests de catálogo: códigos exactos del catálogo realineado al master prompt
(docs/build/06_INTERVIEW_SYSTEM.md §1 — 3 familias × 14 competencias = 42).

Asumen que `python -m app.seeds.run` ya corrió contra la base de test (la
misma de docker-compose). Si el catálogo no está sembrado, estos tests fallan
con una lista vacía — es la señal correcta de "corre las semillas primero".
"""

from __future__ import annotations

from fastapi.testclient import TestClient

EXPECTED_FAMILY_CODES = {"ADMIN_ASSISTANT", "HEAVY_MACHINERY_OPERATOR", "WAREHOUSE_SUPERVISOR"}

EXPECTED_COMPETENCIES_BY_FAMILY = {
    "ADMIN_ASSISTANT": {
        "ADMIN_HA_01", "ADMIN_HA_02", "ADMIN_HA_03", "ADMIN_HA_04",
        "ADMIN_HA_05", "ADMIN_HA_06", "ADMIN_HA_07",
        "ADMIN_SA_01", "ADMIN_SA_02", "ADMIN_SA_03", "ADMIN_SA_04",
        "ADMIN_SA_05", "ADMIN_SA_06", "ADMIN_SA_07",
    },
    "HEAVY_MACHINERY_OPERATOR": {
        "HEAVY_HM_01", "HEAVY_HM_02", "HEAVY_HM_03", "HEAVY_HM_04",
        "HEAVY_HM_05", "HEAVY_HM_06", "HEAVY_HM_07",
        "HEAVY_SM_01", "HEAVY_SM_02", "HEAVY_SM_03", "HEAVY_SM_04",
        "HEAVY_SM_05", "HEAVY_SM_06", "HEAVY_SM_07",
    },
    "WAREHOUSE_SUPERVISOR": {
        "WAREHOUSE_HE_01", "WAREHOUSE_HE_02", "WAREHOUSE_HE_03", "WAREHOUSE_HE_04",
        "WAREHOUSE_HE_05", "WAREHOUSE_HE_06", "WAREHOUSE_HE_07",
        "WAREHOUSE_SA_01", "WAREHOUSE_SA_02", "WAREHOUSE_SA_03", "WAREHOUSE_SA_04",
        "WAREHOUSE_SA_05", "WAREHOUSE_SA_06", "WAREHOUSE_SA_07",
    },
}

CORE_COMPETENCIES_BY_FAMILY = {
    "ADMIN_ASSISTANT": {"ADMIN_HA_01", "ADMIN_HA_02", "ADMIN_HA_03", "ADMIN_HA_07", "ADMIN_SA_07"},
    "HEAVY_MACHINERY_OPERATOR": {
        "HEAVY_HM_01", "HEAVY_HM_02", "HEAVY_HM_03", "HEAVY_HM_05", "HEAVY_SM_01", "HEAVY_SM_07",
    },
    "WAREHOUSE_SUPERVISOR": {
        "WAREHOUSE_HE_01", "WAREHOUSE_HE_02", "WAREHOUSE_HE_03", "WAREHOUSE_HE_07", "WAREHOUSE_SA_07",
    },
}


def test_job_families_has_exactly_the_three_contract_codes(client: TestClient) -> None:
    resp = client.get("/api/v1/job-families")
    assert resp.status_code == 200
    families = resp.json()
    codes = {f["code"] for f in families}
    assert codes == EXPECTED_FAMILY_CODES
    assert len(families) == 3


def test_each_family_has_14_competencies_with_exact_codes_and_core_flags(client: TestClient) -> None:
    families = {f["code"]: f for f in client.get("/api/v1/job-families").json()}

    for family_code, expected_codes in EXPECTED_COMPETENCIES_BY_FAMILY.items():
        family_id = families[family_code]["id"]
        resp = client.get(f"/api/v1/job-families/{family_id}/competencies")
        assert resp.status_code == 200
        competencies = resp.json()
        assert len(competencies) == 14

        codes = {c["code"] for c in competencies}
        assert codes == expected_codes

        core_codes = {c["code"] for c in competencies if c["is_core"]}
        assert core_codes == CORE_COMPETENCIES_BY_FAMILY[family_code]

        technical = {c["code"] for c in competencies if c["type"] == "TECHNICAL"}
        behavioral = {c["code"] for c in competencies if c["type"] == "BEHAVIORAL"}
        assert len(technical) == 7
        assert len(behavioral) == 7

        for competency in competencies:
            assert competency["type"] in ("TECHNICAL", "BEHAVIORAL")
            assert competency["description"]


def test_job_family_interview_questions_returns_14_ordered_by_sequence(client: TestClient) -> None:
    families = {f["code"]: f for f in client.get("/api/v1/job-families").json()}

    for family_code, expected_codes in EXPECTED_COMPETENCIES_BY_FAMILY.items():
        family_id = families[family_code]["id"]
        resp = client.get(f"/api/v1/job-families/{family_id}/interview-questions")
        assert resp.status_code == 200
        questions = resp.json()
        assert len(questions) == 14

        sequences = [q["sequence"] for q in questions]
        assert sequences == sorted(sequences)

        hard = [q for q in questions if q["block"] == "HARD"]
        soft = [q for q in questions if q["block"] == "SOFT"]
        assert len(hard) == 7
        assert len(soft) == 7

        question_ids = {q["question_id"] for q in questions}
        assert len(question_ids) == 14

        competency_codes = {q["competency_code"] for q in questions}
        assert competency_codes == expected_codes

        for question in questions:
            assert question["text"].strip()
            assert isinstance(question["evaluates"], list) and question["evaluates"]
            assert isinstance(question["risk_flag_triggers"], list)


def test_skills_catalog_is_seeded(client: TestClient) -> None:
    resp = client.get("/api/v1/skills")
    assert resp.status_code == 200
    skills = resp.json()
    assert len(skills) >= 40
    codes = {s["code"] for s in skills}
    # Muestra representativa de las tres familias (ofimática, maquinaria, almacén).
    assert {"EXCEL_INTERMEDIATE", "FORKLIFT_OPERATION", "SAP_WMS"}.issubset(codes)


def test_unknown_job_family_returns_404(client: TestClient) -> None:
    resp = client.get("/api/v1/job-families/00000000-0000-0000-0000-000000000000/competencies")
    assert resp.status_code == 404
    assert resp.json()["code"] == "NOT_FOUND"


def test_unknown_job_family_interview_questions_returns_404(client: TestClient) -> None:
    resp = client.get("/api/v1/job-families/00000000-0000-0000-0000-000000000000/interview-questions")
    assert resp.status_code == 404
    assert resp.json()["code"] == "NOT_FOUND"
