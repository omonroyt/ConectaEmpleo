"""`REGISTRATION_ENABLED=false`: el registro responde 403 y el login sigue funcionando.

Es el cierre que protege las APIs reales durante la evaluación del hackatón:
solo entran las cuentas sembradas (`python -m app.seeds.jury`).
"""

from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app


def _close_registration() -> None:
    closed = get_settings().model_copy(update={"registration_enabled": False})
    app.dependency_overrides[get_settings] = lambda: closed


@pytest.fixture()
def registration_closed() -> Generator[None, None, None]:
    _close_registration()
    yield
    app.dependency_overrides.pop(get_settings, None)


def test_register_is_rejected_when_registration_is_closed(
    client: TestClient, unique_email: str, registration_closed: None
) -> None:
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "demo1234", "role": "CANDIDATE"},
    )
    assert resp.status_code == 403
    body = resp.json()
    assert body["code"] == "REGISTRATION_CLOSED"
    assert body["message"]


def test_existing_accounts_still_log_in_when_registration_is_closed(
    client: TestClient, unique_email: str
) -> None:
    created = client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": "demo1234", "role": "COMPANY"},
    )
    assert created.status_code == 201

    _close_registration()
    try:
        resp = client.post("/api/v1/auth/login", json={"email": unique_email, "password": "demo1234"})
    finally:
        app.dependency_overrides.pop(get_settings, None)
    assert resp.status_code == 200
