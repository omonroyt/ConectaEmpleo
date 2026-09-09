"""Tests de `GET/PATCH /candidates/me`, `/job-family` y `/status` (B3).

`next_step` replica la máquina de estados de `frontend/src/api/mock/index.ts`
(`candidate.status()`), documentada en `app/modules/candidates/service.py::compute_status_view`.
"""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.candidates.models import CandidateProfile
from app.modules.catalog.models import JobFamily
from app.modules.documents.models import CVExtraction, Document


def _register_candidate(client: TestClient, email: str) -> tuple[str, str]:
    resp = client.post(
        "/api/v1/auth/register", json={"email": email, "password": "demo1234", "role": "CANDIDATE"}
    )
    assert resp.status_code == 201
    body = resp.json()
    return body["access_token"], body["user"]["id"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_get_my_profile_returns_scaffold_with_completion_percent(
    client: TestClient, unique_email: str
) -> None:
    token, _ = _register_candidate(client, unique_email)
    resp = client.get("/api/v1/candidates/me", headers=_auth_headers(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["anon_code"].startswith("CND-")
    assert body["status"] == "DRAFT"
    assert body["completion_percent"] == 0
    assert body["education"] == []
    assert body["experience"] == []


def test_patch_my_profile_updates_fields_and_completion_percent(
    client: TestClient, unique_email: str
) -> None:
    token, _ = _register_candidate(client, unique_email)
    patch = {
        "full_name": "Juana Pérez",
        "phone": "5512345678",
        "location": {"city": "León", "state": "Guanajuato"},
        "availability": "IMMEDIATE",
        "bio": "Auxiliar de almacén con 3 años de experiencia.",
    }
    resp = client.patch("/api/v1/candidates/me", json=patch, headers=_auth_headers(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["full_name"] == "Juana Pérez"
    assert body["location"] == {"city": "León", "state": "Guanajuato"}
    assert body["completion_percent"] > 0

    # Un segundo PATCH parcial no debe borrar los campos ya guardados.
    resp2 = client.patch(
        "/api/v1/candidates/me", json={"phone": "5599998888"}, headers=_auth_headers(token)
    )
    assert resp2.status_code == 200
    body2 = resp2.json()
    assert body2["phone"] == "5599998888"
    assert body2["full_name"] == "Juana Pérez"  # se preservó


def test_set_job_family_updates_profile_and_rejects_unknown_id(
    client: TestClient, db_session: Session, unique_email: str
) -> None:
    token, _ = _register_candidate(client, unique_email)
    family = db_session.query(JobFamily).filter(JobFamily.code == "WAREHOUSE_SUPERVISOR").one()

    resp = client.post(
        "/api/v1/candidates/me/job-family",
        json={"job_family_id": str(family.id)},
        headers=_auth_headers(token),
    )
    assert resp.status_code == 200
    assert resp.json()["job_family_id"] == str(family.id)

    bad_resp = client.post(
        "/api/v1/candidates/me/job-family",
        json={"job_family_id": "00000000-0000-0000-0000-000000000000"},
        headers=_auth_headers(token),
    )
    assert bad_resp.status_code == 404
    assert bad_resp.json()["code"] == "NOT_FOUND"


def test_status_next_step_onboarding_without_job_family(
    client: TestClient, unique_email: str
) -> None:
    token, _ = _register_candidate(client, unique_email)
    resp = client.get("/api/v1/candidates/me/status", headers=_auth_headers(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "DRAFT"
    assert body["next_step"] == "ONBOARDING"
    assert body["has_talent_profile"] is False


def test_status_next_step_cv_after_job_family_set(
    client: TestClient, db_session: Session, unique_email: str
) -> None:
    token, _ = _register_candidate(client, unique_email)
    family = db_session.query(JobFamily).first()
    client.post(
        "/api/v1/candidates/me/job-family",
        json={"job_family_id": str(family.id)},
        headers=_auth_headers(token),
    )
    resp = client.get("/api/v1/candidates/me/status", headers=_auth_headers(token))
    assert resp.json()["next_step"] == "CV"


def test_status_next_step_review_claims_when_cv_parsed(
    client: TestClient, db_session: Session, unique_email: str
) -> None:
    token, user_id = _register_candidate(client, unique_email)
    family = db_session.query(JobFamily).first()
    client.post(
        "/api/v1/candidates/me/job-family",
        json={"job_family_id": str(family.id)},
        headers=_auth_headers(token),
    )
    profile = db_session.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).one()
    document = Document(
        owner_user_id=uuid.UUID(user_id),
        type="CV",
        storage_key="fake/key.pdf",
        original_filename="cv.pdf",
        mime_type="application/pdf",
        size_bytes=10,
        status="PARSED",
    )
    db_session.add(document)
    db_session.flush()

    # Desde B5 la señal de "hay algo que revisar" es la extracción sin
    # confirmar, no el estado del documento: un CV puede quedar `PARSED` y
    # aun así no haber nada que el candidato deba revisar todavía.
    db_session.add(
        CVExtraction(
            document_id=document.id,
            candidate_id=profile.id,
            status="PARSED",
            confidence=0.8,
            confirmed_by_candidate=False,
        )
    )
    db_session.commit()

    resp = client.get("/api/v1/candidates/me/status", headers=_auth_headers(token))
    assert resp.json()["next_step"] == "REVIEW_CLAIMS"


def test_status_stays_on_cv_when_extraction_already_confirmed(
    client: TestClient, db_session: Session, unique_email: str
) -> None:
    """Una extracción ya confirmada no debe volver a pedir revisión."""

    token, user_id = _register_candidate(client, unique_email)
    family = db_session.query(JobFamily).first()
    client.post(
        "/api/v1/candidates/me/job-family",
        json={"job_family_id": str(family.id)},
        headers=_auth_headers(token),
    )
    profile = db_session.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).one()
    db_session.add(
        CVExtraction(
            candidate_id=profile.id,
            status="PARSED",
            confidence=0.9,
            confirmed_by_candidate=True,
        )
    )
    db_session.commit()

    resp = client.get("/api/v1/candidates/me/status", headers=_auth_headers(token))
    assert resp.json()["next_step"] == "CV"


def test_status_next_step_for_each_remaining_profile_status(
    client: TestClient, db_session: Session, unique_email: str
) -> None:
    token, user_id = _register_candidate(client, unique_email)
    profile = db_session.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).one()

    expectations = {
        "CV_READY": "INTERVIEW",
        "INTERVIEWING": "INTERVIEW",
        "PENDING_EVALUATION": "WAITING_EVALUATION",
        "EVALUATED": "DONE",
    }
    for status, expected_next_step in expectations.items():
        profile.status = status
        db_session.commit()
        resp = client.get("/api/v1/candidates/me/status", headers=_auth_headers(token))
        assert resp.json()["next_step"] == expected_next_step, status
