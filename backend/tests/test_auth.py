"""Tests de identidad: registro, login, /auth/me, credenciales inválidas,
unicidad de email y unicidad/formato de `anon_code`.
"""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.candidates.models import CandidateProfile
from app.modules.companies.models import Company
from app.modules.identity.models import User


def test_register_login_me_flow(client: TestClient, unique_email: str) -> None:
    register_resp = client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "demo1234", "role": "CANDIDATE"},
    )
    assert register_resp.status_code == 201
    body = register_resp.json()
    assert body["user"]["email"] == unique_email
    assert body["user"]["role"] == "CANDIDATE"
    assert "access_token" in body

    login_resp = client.post(
        "/api/v1/auth/login", json={"email": unique_email, "password": "demo1234"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == unique_email


def test_invalid_credentials_returns_401_with_code(client: TestClient, unique_email: str) -> None:
    client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "demo1234", "role": "CANDIDATE"},
    )

    resp = client.post(
        "/api/v1/auth/login", json={"email": unique_email, "password": "wrong-password"}
    )
    assert resp.status_code == 401
    body = resp.json()
    assert body["code"] == "INVALID_CREDENTIALS"
    assert body["message"]


def test_login_unknown_email_returns_401(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/auth/login", json={"email": "no-existe@demo.mx", "password": "whatever1"}
    )
    assert resp.status_code == 401
    assert resp.json()["code"] == "INVALID_CREDENTIALS"


def test_me_without_token_returns_401(client: TestClient) -> None:
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_duplicate_email_is_rejected(client: TestClient, unique_email: str) -> None:
    payload = {"email": unique_email, "password": "demo1234", "role": "CANDIDATE"}
    first = client.post("/api/v1/auth/register", json=payload)
    assert first.status_code == 201

    second = client.post("/api/v1/auth/register", json=payload)
    assert second.status_code == 409
    assert second.json()["code"] == "EMAIL_ALREADY_EXISTS"


def test_register_candidate_creates_profile_with_unique_anon_code(
    client: TestClient, db_session: Session, unique_email: str
) -> None:
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "demo1234", "role": "CANDIDATE"},
    )
    assert resp.status_code == 201
    user_id = resp.json()["user"]["id"]

    user = db_session.get(User, user_id)
    assert user is not None

    profile = db_session.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).one()
    assert profile.anon_code.startswith("CND-")
    assert len(profile.anon_code) == len("CND-XXXX")
    assert profile.status == "DRAFT"

    # Registrar un segundo candidato debe producir un anon_code distinto.
    resp2 = client.post(
        "/api/v1/auth/register",
        json={"email": f"second.{unique_email}", "password": "demo1234", "role": "CANDIDATE"},
    )
    assert resp2.status_code == 201
    user2_id = resp2.json()["user"]["id"]
    profile2 = (
        db_session.query(CandidateProfile).filter(CandidateProfile.user_id == user2_id).one()
    )
    assert profile2.anon_code != profile.anon_code


def test_register_company_creates_unverified_company(
    client: TestClient, db_session: Session, unique_email: str
) -> None:
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "demo1234", "role": "COMPANY"},
    )
    assert resp.status_code == 201
    user_id = resp.json()["user"]["id"]

    company = db_session.query(Company).filter(Company.user_id == user_id).one()
    assert company.verification_status == "UNVERIFIED"


def test_register_rejects_short_password(client: TestClient, unique_email: str) -> None:
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "short", "role": "CANDIDATE"},
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "VALIDATION_ERROR"
