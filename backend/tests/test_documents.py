"""Tests de `documents` (B3): validación de upload, subida de CV/certificación, listado (D-01).

La ejecución completa del job `CV_PARSE` hasta `DONE` (background real) se
verifica contra un servidor corriendo de verdad (criterio de cierre de B3+B4,
ver reporte del subagente) y en `tests/test_jobs.py` de forma aislada: dentro
de `TestClient`, el worker corre en una sesión de base de datos distinta a la
transacción de prueba (`db_session`, con rollback al final) y no puede ver
filas que esa transacción todavía no comiteó de verdad — es una limitación
conocida del patrón de test transaccional con `BackgroundTasks`, no del
comportamiento en producción.
"""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.documents.models import Document

PDF_BYTES = b"%PDF-1.4\n%mock pdf content for testing purposes only\n%%EOF"
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"0" * 100


def _register_candidate(client: TestClient, email: str) -> str:
    resp = client.post(
        "/api/v1/auth/register", json={"email": email, "password": "demo1234", "role": "CANDIDATE"}
    )
    assert resp.status_code == 201
    return resp.json()["access_token"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_upload_cv_returns_202_with_job_id_and_creates_document(
    client: TestClient, db_session: Session, unique_email: str
) -> None:
    token = _register_candidate(client, unique_email)
    resp = client.post(
        "/api/v1/candidates/me/cv",
        files={"file": ("cv-ejemplo.pdf", PDF_BYTES, "application/pdf")},
        headers=_auth_headers(token),
    )
    assert resp.status_code == 202
    body = resp.json()
    assert "job_id" in body

    documents = db_session.query(Document).filter(Document.type == "CV").all()
    assert any(d.original_filename == "cv-ejemplo.pdf" for d in documents)


def test_upload_rejects_unsupported_mime_type(client: TestClient, unique_email: str) -> None:
    token = _register_candidate(client, unique_email)
    resp = client.post(
        "/api/v1/candidates/me/cv",
        files={"file": ("notes.txt", b"esto no es un documento valido", "text/plain")},
        headers=_auth_headers(token),
    )
    assert resp.status_code == 415
    body = resp.json()
    assert body["code"] == "UNSUPPORTED_MEDIA_TYPE"
    assert body["message"]


def test_upload_rejects_file_larger_than_10mb(client: TestClient, unique_email: str) -> None:
    token = _register_candidate(client, unique_email)
    oversized = b"%PDF-1.4\n" + b"0" * (10 * 1024 * 1024 + 1)
    resp = client.post(
        "/api/v1/candidates/me/cv",
        files={"file": ("grande.pdf", oversized, "application/pdf")},
        headers=_auth_headers(token),
    )
    assert resp.status_code == 413
    assert resp.json()["code"] == "UPLOAD_TOO_LARGE"


def test_upload_certification_and_list_documents_by_type(
    client: TestClient, unique_email: str
) -> None:
    token = _register_candidate(client, unique_email)

    upload_resp = client.post(
        "/api/v1/candidates/me/certifications",
        files={"file": ("licencia-montacargas.png", PNG_BYTES, "image/png")},
        headers=_auth_headers(token),
    )
    assert upload_resp.status_code == 200
    ref = upload_resp.json()
    assert ref["type"] == "CERTIFICATION"
    assert ref["status"] == "UPLOADED"
    assert ref["url"] is not None

    # D-01: la certificación subida debe poder listarse después, no solo devolverse al subir.
    list_resp = client.get(
        "/api/v1/candidates/me/documents",
        params={"type": "CERTIFICATION"},
        headers=_auth_headers(token),
    )
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) == 1
    assert items[0]["id"] == ref["id"]

    cv_list_resp = client.get(
        "/api/v1/candidates/me/documents",
        params={"type": "CV"},
        headers=_auth_headers(token),
    )
    assert cv_list_resp.json() == []
