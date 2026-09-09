"""Verificación de punta a punta de B5 (CV) y B8 (empresa/vacantes) con peticiones reales.

Levanta la app en proceso con `TestClient` (mismo stack HTTP que uvicorn) y
recorre los dos flujos completos, afirmando en cada paso. No sustituye a
`pytest`: sirve para comprobar el recorrido tal como lo hará el frontend.

Uso:
    DATABASE_URL="postgresql+psycopg://conecta:conecta@localhost:5433/conecta" \
        .venv/Scripts/python.exe scripts/verify_b5_b8.py
"""

from __future__ import annotations

import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

CV_PDF = Path(__file__).resolve().parents[2] / "frontend" / "public" / "demo" / "cv-ejemplo.pdf"

passed = 0
failed: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    global passed
    if condition:
        passed += 1
        print(f"  OK  {label}" + (f" -> {detail}" if detail else ""))
    else:
        failed.append(label)
        print(f"  FALLA  {label}" + (f" -> {detail}" if detail else ""))


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def main() -> int:
    client = TestClient(app)
    stamp = uuid.uuid4().hex[:8]

    print("\n=== B5 · Candidato: CV, extracción y confirmación ===")
    email = f"cand-{stamp}@demo.mx"
    resp = client.post(
        "/api/v1/auth/register", json={"email": email, "password": "demo1234", "role": "CANDIDATE"}
    )
    check("registro de candidato", resp.status_code == 201, f"HTTP {resp.status_code}")
    token = resp.json()["access_token"]

    families = client.get("/api/v1/job-families").json()
    warehouse = next(f for f in families if f["code"] == "WAREHOUSE_SUPERVISOR")
    resp = client.post(
        "/api/v1/candidates/me/job-family",
        json={"job_family_id": warehouse["id"]},
        headers=auth(token),
    )
    check("selección de familia laboral", resp.status_code == 200)

    step = client.get("/api/v1/candidates/me/status", headers=auth(token)).json()["next_step"]
    check("next_step tras onboarding", step == "CV", step)

    check("PDF de prueba disponible", CV_PDF.exists(), str(CV_PDF))
    with CV_PDF.open("rb") as fh:
        resp = client.post(
            "/api/v1/candidates/me/cv",
            files={"file": ("cv-ejemplo.pdf", fh, "application/pdf")},
            headers=auth(token),
        )
    check("subida de CV devuelve 202 con job_id", resp.status_code == 202, f"HTTP {resp.status_code}")
    job_id = resp.json()["job_id"]

    status = ""
    for _ in range(40):
        job = client.get(f"/api/v1/jobs/{job_id}", headers=auth(token)).json()
        status = job["status"]
        if status in ("DONE", "FAILED"):
            break
        time.sleep(0.25)
    check("job de parseo termina en DONE", status == "DONE", status)

    resp = client.get("/api/v1/candidates/me/cv/extraction", headers=auth(token))
    check("extracción disponible", resp.status_code == 200, f"HTTP {resp.status_code}")
    extraction = resp.json()
    check("la extracción trae claims citables", len(extraction.get("claims", [])) > 0,
          f"{len(extraction.get('claims', []))} claims")
    check("extracción sin confirmar todavía", extraction["confirmed_by_candidate"] is False)

    step = client.get("/api/v1/candidates/me/status", headers=auth(token)).json()["next_step"]
    check("next_step pide revisar claims", step == "REVIEW_CLAIMS", step)

    resp = client.patch(
        "/api/v1/candidates/me/cv/extraction",
        json={
            "experience": [
                {
                    "id": "exp-1",
                    "company": "Almacenes del Bajío",
                    "position": "Encargado de almacén",
                    "start_date": "2019-03-01",
                    "end_date": None,
                    "is_current": True,
                    "description": "Control de inventarios y recepción de mercancía.",
                    "skills": [],
                }
            ]
        },
        headers=auth(token),
    )
    check("confirmación de la extracción", resp.status_code == 200, f"HTTP {resp.status_code}")
    check("queda marcada como confirmada", resp.json()["confirmed_by_candidate"] is True)

    profile = client.get("/api/v1/candidates/me", headers=auth(token)).json()
    check("la experiencia se copió al perfil", len(profile["experience"]) > 0,
          f"{len(profile['experience'])} puestos")
    check("el candidato avanzó a CV_READY", profile["status"] == "CV_READY", profile["status"])
    step = client.get("/api/v1/candidates/me/status", headers=auth(token)).json()["next_step"]
    check("next_step apunta a la entrevista", step == "INTERVIEW", step)

    print("\n=== B5 · CV conversacional (A1 modo BUILD) ===")
    email2 = f"cand2-{stamp}@demo.mx"
    token2 = client.post(
        "/api/v1/auth/register", json={"email": email2, "password": "demo1234", "role": "CANDIDATE"}
    ).json()["access_token"]
    client.post(
        "/api/v1/candidates/me/job-family",
        json={"job_family_id": warehouse["id"]},
        headers=auth(token2),
    )

    resp = client.post("/api/v1/cv-builder/sessions", headers=auth(token2))
    check("creación de sesión conversacional", resp.status_code == 201, f"HTTP {resp.status_code}")
    reply = resp.json()
    session_id = reply["session"]["id"]
    check("Sofía abre con una pregunta", len(reply["agent_message"]["text"]) > 10,
          reply["agent_message"]["text"][:60])

    answers = [
        "Trabajé cuatro años como encargado de almacén en una distribuidora de refacciones.",
        "Recibía la mercancía, la contaba contra la orden de compra y la acomodaba por rotación.",
        "Usaba montacargas y un sistema WMS para registrar entradas y salidas todos los días.",
        "Antes fui auxiliar de almacén dos años en una tienda de materiales de construcción.",
        "Terminé el bachillerato técnico en logística en el CBTIS de mi ciudad.",
        "Tengo certificación vigente de montacarguista que renové el año pasado.",
        "Puedo empezar de inmediato y busco entre catorce y dieciocho mil pesos al mes.",
        "Vivo en León y no tengo problema para moverme a la zona industrial.",
    ]
    done = False
    for text in answers:
        resp = client.post(
            f"/api/v1/cv-builder/sessions/{session_id}/messages",
            json={"text": text},
            headers=auth(token2),
        )
        if resp.status_code != 200:
            break
        done = resp.json()["done"]
        if done:
            break
    check("la conversación avanza los 8 turnos", resp.status_code == 200, f"HTTP {resp.status_code}")
    check("la conversación se marca terminada", done is True, str(done))

    resp = client.post(f"/api/v1/cv-builder/sessions/{session_id}/finalize", headers=auth(token2))
    check("finalize crea la extracción", resp.status_code == 200, f"HTTP {resp.status_code}")

    resp = client.get(f"/api/v1/cv-builder/sessions/{session_id}/document", headers=auth(token2))
    check("el CV generado es descargable", resp.status_code == 200 and bool(resp.json().get("url")),
          resp.json().get("url", "")[:60])

    print("\n=== B8 · Empresa, vacante, requisitos y pesos ===")
    email3 = f"empresa-{stamp}@demo.mx"
    resp = client.post(
        "/api/v1/auth/register", json={"email": email3, "password": "demo1234", "role": "COMPANY"}
    )
    check("registro de empresa", resp.status_code == 201, f"HTTP {resp.status_code}")
    ctoken = resp.json()["access_token"]

    resp = client.patch(
        "/api/v1/companies/me",
        json={
            "legal_name": "Logística del Bajío S.A. de C.V.",
            "trade_name": "Logística del Bajío",
            "industry": "Logística y transporte",
            "size": "51-200",
            "location": {"city": "León", "state": "Guanajuato"},
            "description": "Centro de distribución regional.",
        },
        headers=auth(ctoken),
    )
    check("actualización del perfil de empresa", resp.status_code == 200, f"HTTP {resp.status_code}")

    resp = client.get("/api/v1/companies/me/verification", headers=auth(ctoken))
    check("vista de verificación con checks", resp.status_code == 200 and len(resp.json()["checks"]) > 0,
          f"{len(resp.json().get('checks', []))} checks")

    resp = client.post(
        "/api/v1/vacancies",
        json={
            "job_family_id": warehouse["id"],
            "title": "Encargado de turno de almacén",
            "description": (
                "Busco encargado de almacén que sepa manejar montacargas y llevar "
                "control de inventario en Excel, máximo 30 años"
            ),
            "location": {"city": "León", "state": "Guanajuato"},
            "work_mode": "ONSITE",
            "salary_min": 14000,
            "salary_max": 18000,
            "positions_count": 2,
        },
        headers=auth(ctoken),
    )
    check("creación de vacante", resp.status_code in (200, 201), f"HTTP {resp.status_code}")
    vacancy_id = resp.json()["id"]

    resp = client.post(f"/api/v1/vacancies/{vacancy_id}/resolve-requirements", headers=auth(ctoken))
    check("resolución de requisitos", resp.status_code == 200, f"HTTP {resp.status_code}")
    resolution = resp.json()
    check("mapea requisitos al catálogo", len(resolution["mapped"]) > 0,
          f"{len(resolution['mapped'])} mapeados")
    warnings = resolution.get("warnings", [])
    check("detecta el límite de edad como discriminatorio", len(warnings) > 0,
          warnings[0]["text"] if warnings else "sin advertencias")
    mapped_text = " ".join(str(m) for m in resolution["mapped"]).lower()
    check("la advertencia no entra al mapeo", "30 años" not in mapped_text and "edad" not in mapped_text)

    resp = client.put(
        f"/api/v1/vacancies/{vacancy_id}/requirements",
        json=[
            {
                "competency_code": "INVENTORY_CONTROL",
                "skill_code": None,
                "label": "Control de inventarios",
                "kind": "MANDATORY",
                "min_level": 3,
                "weight": 0,
            },
            {
                "competency_code": "FORKLIFT_SAFETY",
                "skill_code": None,
                "label": "Seguridad en montacargas",
                "kind": "MANDATORY",
                "min_level": 2,
                "weight": 0,
            },
        ],
        headers=auth(ctoken),
    )
    check("guardado de requisitos", resp.status_code == 200, f"HTTP {resp.status_code}")

    resp = client.put(
        f"/api/v1/vacancies/{vacancy_id}/weights",
        json={
            "TECHNICAL": 80,
            "BEHAVIORAL": 40,
            "EXPERIENCE": 30,
            "EVIDENCE": 20,
            "SALARY": 16,
            "LOCATION": 14,
        },
        headers=auth(ctoken),
    )
    check("guardado de pesos sin normalizar", resp.status_code == 200, f"HTTP {resp.status_code}")
    weights = resp.json()["weights"]
    total = sum(weights.values())
    check("los pesos quedan normalizados a 100 (RB-07)", abs(total - 100) < 0.51, f"suma = {total}")

    resp = client.get("/api/v1/vacancies", headers=auth(ctoken))
    check("la vacante aparece en la lista de la empresa", resp.status_code == 200 and len(resp.json()) > 0,
          f"{len(resp.json())} vacantes")

    print("\n=== B8 · Aislamiento entre empresas ===")
    other = client.post(
        "/api/v1/auth/register",
        json={"email": f"otra-{stamp}@demo.mx", "password": "demo1234", "role": "COMPANY"},
    ).json()["access_token"]
    resp = client.get(f"/api/v1/vacancies/{vacancy_id}", headers=auth(other))
    check("otra empresa no puede leer la vacante ajena", resp.status_code in (403, 404),
          f"HTTP {resp.status_code}")

    print(f"\n{passed} verificaciones en verde" + (f", {len(failed)} fallidas" if failed else ", 0 fallidas"))
    for label in failed:
        print(f"  - {label}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
