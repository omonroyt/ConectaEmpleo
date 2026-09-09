"""Tests de catálogo: códigos exactos del contrato (`docs/build/02_API_CONTRACT.md` §2).

Asumen que `python -m app.seeds.run` ya corrió contra la base de test (la
misma de docker-compose). Si el catálogo no está sembrado, estos tests fallan
con una lista vacía — es la señal correcta de "corre las semillas primero".
"""

from __future__ import annotations

from fastapi.testclient import TestClient

EXPECTED_FAMILY_CODES = {"ADMIN_ASSISTANT", "HEAVY_MACHINERY_OPERATOR", "WAREHOUSE_SUPERVISOR"}

EXPECTED_COMPETENCIES_BY_FAMILY = {
    "ADMIN_ASSISTANT": {
        "OFFICE_TOOLS", "DOCUMENT_CONTROL", "SCHEDULING_COORDINATION", "CUSTOMER_SERVICE",
        "WRITTEN_COMMUNICATION", "ORGANIZATION_PRIORITIZATION", "TEAM_COLLABORATION", "PROBLEM_SOLVING",
    },
    "HEAVY_MACHINERY_OPERATOR": {
        "MACHINERY_OPERATION", "SAFETY_PROTOCOLS", "PREVENTIVE_MAINTENANCE", "LOAD_HANDLING",
        "SITE_SIGNALING", "RISK_AWARENESS", "INSTRUCTION_FOLLOWING", "TEAM_COORDINATION",
    },
    "WAREHOUSE_SUPERVISOR": {
        "INVENTORY_CONTROL", "FORKLIFT_SAFETY", "WMS_ERP_SYSTEMS", "RECEIVING_DISPATCH",
        "STORAGE_ORGANIZATION", "TEAM_COORDINATION", "PROBLEM_SOLVING", "DISCREPANCY_RESOLUTION",
    },
}

CORE_COMPETENCIES_BY_FAMILY = {
    "ADMIN_ASSISTANT": {"OFFICE_TOOLS", "DOCUMENT_CONTROL", "CUSTOMER_SERVICE", "ORGANIZATION_PRIORITIZATION"},
    "HEAVY_MACHINERY_OPERATOR": {"MACHINERY_OPERATION", "SAFETY_PROTOCOLS", "LOAD_HANDLING", "RISK_AWARENESS"},
    "WAREHOUSE_SUPERVISOR": {"INVENTORY_CONTROL", "FORKLIFT_SAFETY", "RECEIVING_DISPATCH", "TEAM_COORDINATION"},
}


def test_job_families_has_exactly_the_three_contract_codes(client: TestClient) -> None:
    resp = client.get("/api/v1/job-families")
    assert resp.status_code == 200
    families = resp.json()
    codes = {f["code"] for f in families}
    assert codes == EXPECTED_FAMILY_CODES
    assert len(families) == 3


def test_each_family_has_8_competencies_with_exact_codes_and_core_flags(client: TestClient) -> None:
    families = {f["code"]: f for f in client.get("/api/v1/job-families").json()}

    for family_code, expected_codes in EXPECTED_COMPETENCIES_BY_FAMILY.items():
        family_id = families[family_code]["id"]
        resp = client.get(f"/api/v1/job-families/{family_id}/competencies")
        assert resp.status_code == 200
        competencies = resp.json()
        assert len(competencies) == 8

        codes = {c["code"] for c in competencies}
        assert codes == expected_codes

        core_codes = {c["code"] for c in competencies if c["is_core"]}
        assert core_codes == CORE_COMPETENCIES_BY_FAMILY[family_code]

        for competency in competencies:
            assert competency["type"] in ("TECHNICAL", "BEHAVIORAL")
            assert competency["description"]


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
