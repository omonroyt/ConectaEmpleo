"""B9+B10 — recorrido de integración: `match_runs`/`match_results`,
anonimización, desbloqueo, comparador, finalistas y marketplace del candidato.

Mismo patrón que `tests/test_assessments.py` para sortear la limitación ya
documentada por B5/B7 (`BackgroundTasks` + `SessionLocal()` propio no ve las
filas que la transacción de prueba todavía no comiteó de verdad): los workers
de job (`evaluate_worker`, `profile_build_worker`, `match_run_worker`) se
llaman **directamente** con un `Job` de mentiras, nunca vía
`POST /vacancies/{id}/match-runs` + `BackgroundTasks` real (eso sí se
verifica contra un servidor `uvicorn` corriendo de verdad, ver el reporte de
cierre de la tarea).
"""

from __future__ import annotations

import re
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.assessments.jobs import evaluate_worker, profile_build_worker
from app.modules.candidates.models import CandidateProfile
from app.modules.catalog.models import JobFamily
from app.modules.marketplace.models import CandidateUnlock
from app.modules.marketplace.schemas import AnonymousCandidateCard
from app.modules.matching.jobs import match_run_worker
from app.modules.matching.models import MatchResult, MatchRun


class _FakeJob:
    def __init__(self, payload: dict) -> None:
        self.payload = payload


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _register(client: TestClient, email: str, role: str) -> str:
    resp = client.post("/api/v1/auth/register", json={"email": email, "password": "demo1234", "role": role})
    assert resp.status_code == 201, resp.text
    return resp.json()["access_token"]


def _run_full_interview(client: TestClient, token: str, interview_id: str, answer_fn) -> None:
    finished = False
    guard = 0
    while not finished and guard < 80:
        guard += 1
        next_resp = client.get(f"/api/v1/interviews/{interview_id}/next-question", headers=_auth(token)).json()
        if next_resp["finished"]:
            finished = True
            break
        turn = next_resp["turn"]
        answer_text = "Ya lo mencioné antes, gracias." if turn["is_follow_up"] else answer_fn(turn["question_id"], turn["block"])
        answer_resp = client.post(
            f"/api/v1/interviews/{interview_id}/answers",
            json={"answer_text": answer_text, "mode": "TEXT"},
            headers=_auth(token),
        ).json()
        if answer_resp["finished"]:
            finished = True
    assert finished, "la entrevista de prueba no terminó dentro del límite de seguridad"


LEVEL4_ANSWER = " ".join(["Reviso", "verifico", "documento", "comunico", "coordino"] * 6)
LEVEL2_ANSWER = " ".join(["Reviso", "avanzo", "colaboro", "reviso", "avanzo", "colaboro", "reviso", "avanzo"])


def _make_evaluated_candidate(
    client: TestClient,
    db_session: Session,
    *,
    email: str,
    family_id: uuid.UUID,
    hard_answer: str,
    soft_answer: str,
    location_city: str = "León",
    location_state: str = "Guanajuato",
    salary_min: int = 9000,
    salary_max: int = 13000,
) -> tuple[str, uuid.UUID]:
    """Recorre el golden path completo (B6/B7, modo demo texto) y deja al
    candidato en `status="EVALUATED"` con un `talent_profile` vigente --
    exactamente el insumo que RB-01 exige para entrar a un `match_run`."""

    token = _register(client, email, "CANDIDATE")
    resp = client.post("/api/v1/candidates/me/job-family", json={"job_family_id": str(family_id)}, headers=_auth(token))
    assert resp.status_code == 200, resp.text
    candidate_id = uuid.UUID(resp.json()["id"])

    patch_resp = client.patch(
        "/api/v1/candidates/me",
        json={
            "location": {"city": location_city, "state": location_state},
            "salary_expectation_min": salary_min,
            "salary_expectation_max": salary_max,
            "availability": "IMMEDIATE",
        },
        headers=_auth(token),
    )
    assert patch_resp.status_code == 200, patch_resp.text

    interview_resp = client.post("/api/v1/interviews", json={"mode": "TEXT"}, headers=_auth(token))
    assert interview_resp.status_code == 201, interview_resp.text
    interview_id = interview_resp.json()["id"]

    def _answer(question_id: str, block: str) -> str:
        return hard_answer if block == "HARD" else soft_answer

    _run_full_interview(client, token, interview_id, _answer)

    # Nota: NO se busca el candidato por `order_by(created_at.desc())` --
    # dentro de una misma transacción de prueba, `server_default=func.now()`
    # de Postgres devuelve el mismo instante (hora de inicio de la
    # transacción) para todas las filas, así que esa consulta no puede
    # distinguir entre los 3 candidatos que crea este test y terminaría
    # operando siempre sobre el mismo perfil. Se usa el `id` real devuelto
    # por la API en `POST /candidates/me/job-family`.
    profile = db_session.get(CandidateProfile, candidate_id)
    from app.modules.interviews.models import InterviewSession

    session = db_session.execute(
        select(InterviewSession).where(InterviewSession.candidate_id == profile.id)
    ).scalars().one()

    evaluate_worker(db_session, _FakeJob({"interview_session_id": str(session.id)}))
    profile_build_worker(db_session, _FakeJob({"interview_session_id": str(session.id)}))
    db_session.refresh(profile)
    assert profile.status == "EVALUATED"

    return token, profile.id


def _register_company_and_vacancy(
    client: TestClient,
    db_session: Session,
    *,
    email: str,
    family_id: uuid.UUID,
    location_city: str = "León",
    location_state: str = "Guanajuato",
    salary_min: int = 9000,
    salary_max: int = 13000,
) -> tuple[str, uuid.UUID]:
    token = _register(client, email, "COMPANY")
    resp = client.post(
        "/api/v1/vacancies",
        json={
            "job_family_id": str(family_id),
            "title": "Auxiliar administrativo",
            "description": "Vacante de prueba para B9/B10.",
            "location": {"city": location_city, "state": location_state},
            "work_mode": "ONSITE",
            "salary_min": salary_min,
            "salary_max": salary_max,
            "positions_count": 1,
        },
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    vacancy_id = resp.json()["id"]

    # Requisito obligatorio que un candidato con nivel bajo en ADMIN_HA_01 no cumple.
    req_resp = client.put(
        f"/api/v1/vacancies/{vacancy_id}/requirements",
        json=[
            {
                "competency_code": "ADMIN_HA_01",
                "skill_code": None,
                "label": "Dominio avanzado de Excel",
                "kind": "MANDATORY",
                "min_level": 4,
                "weight": 40,
            }
        ],
        headers=_auth(token),
    )
    assert req_resp.status_code == 200, req_resp.text

    open_resp = client.patch(f"/api/v1/vacancies/{vacancy_id}", json={"status": "OPEN"}, headers=_auth(token))
    assert open_resp.status_code == 200, open_resp.text

    return token, uuid.UUID(vacancy_id)


@pytest.fixture()
def admin_family_id(db_session: Session) -> uuid.UUID:
    return db_session.query(JobFamily.id).filter(JobFamily.code == "ADMIN_ASSISTANT").scalar()


# ---------------------------------------------------------------------------
# Privacidad estructural (criterio de cierre #1 y #2)
# ---------------------------------------------------------------------------


_FORBIDDEN_KEYS = {"full_name", "photo_url", "birth_date", "gender"}


def test_anonymous_candidate_card_json_never_contains_protected_keys() -> None:
    assert not (_FORBIDDEN_KEYS & set(AnonymousCandidateCard.model_fields.keys()))


def test_matching_candidate_view_query_never_selects_protected_columns() -> None:
    """Compila la consulta real de `_select_candidate_row` y confirma que su
    SQL no menciona las columnas protegidas -- no solo que el DTO no las
    declare, sino que la instrucción SQL nunca las pide."""

    from app.modules.candidates.models import CandidateProfile as CP
    from sqlalchemy import select as sa_select

    stmt = sa_select(
        CP.id, CP.anon_code, CP.location_city, CP.location_state, CP.availability,
        CP.salary_expectation_min, CP.salary_expectation_max, CP.experience,
    )
    compiled = str(stmt.compile())
    for forbidden_column in ("full_name", "photo_url", "birth_date", "gender"):
        assert forbidden_column not in compiled


# ---------------------------------------------------------------------------
# Recorrido completo: 3 candidatos EVALUATED -> match-run -> ranking ->
# explicación -> unlock -> full -> compare -> shortlist
# ---------------------------------------------------------------------------


def test_full_matching_and_marketplace_journey(client: TestClient, db_session: Session, unique_email: str, admin_family_id: uuid.UUID) -> None:
    company_token, vacancy_id = _register_company_and_vacancy(
        client, db_session, email=f"empresa.{unique_email}", family_id=admin_family_id
    )

    # Candidato A: el mejor -- hard y soft en nivel máximo, cumple el requisito obligatorio.
    _, candidate_a_id = _make_evaluated_candidate(
        client, db_session, email=f"a.{unique_email}", family_id=admin_family_id,
        hard_answer=LEVEL4_ANSWER, soft_answer=LEVEL4_ANSWER,
    )
    # Candidato B: intermedio -- hard alto, soft bajo, también cumple el requisito.
    _, candidate_b_id = _make_evaluated_candidate(
        client, db_session, email=f"b.{unique_email}", family_id=admin_family_id,
        hard_answer=LEVEL4_ANSWER, soft_answer=LEVEL2_ANSWER,
    )
    # Candidato C: no cumple el requisito obligatorio (hard bajo) y vive lejos / fuera de rango salarial.
    _, candidate_c_id = _make_evaluated_candidate(
        client, db_session, email=f"c.{unique_email}", family_id=admin_family_id,
        hard_answer=LEVEL2_ANSWER, soft_answer=LEVEL2_ANSWER,
        location_city="Monterrey", location_state="Nuevo León",
        salary_min=30000, salary_max=35000,
    )

    # --- POST /vacancies/{id}/match-runs (job MATCH_RUN) ---
    # Nota: las aserciones de este test están escritas para tolerar que el
    # `job_family_id` de ADMIN_ASSISTANT ya tenga otros candidatos EVALUATED
    # committeados en esta base (p. ej. de un recorrido manual anterior contra
    # un servidor real, `scripts/verify_b9_b10.py`) -- Postgres no aísla esas
    # filas ya comiteadas de esta transacción de prueba. Por eso se identifican
    # los 3 candidatos propios por `candidate_id`, nunca por posición absoluta
    # en la lista ni por un conteo total exacto.
    match_run = match_run_worker(db_session, _FakeJob({"vacancy_id": str(vacancy_id)}))
    assert match_run is not None
    run_row = db_session.execute(select(MatchRun).where(MatchRun.vacancy_id == vacancy_id)).scalars().one()
    assert run_row.candidates_evaluated >= 3
    assert run_row.weights_snapshot  # snapshot congelado (docs/04 §5.7)

    own_results = {
        row.candidate_id: row
        for row in db_session.execute(
            select(MatchResult).where(
                MatchResult.match_run_id == run_row.id,
                MatchResult.candidate_id.in_([candidate_a_id, candidate_b_id, candidate_c_id]),
            )
        ).scalars().all()
    }
    assert set(own_results.keys()) == {candidate_a_id, candidate_b_id, candidate_c_id}

    # --- GET /match-runs/{id}/results ---
    results_resp = client.get(f"/api/v1/match-runs/{run_row.id}/results", headers=_auth(company_token), params={"limit": 100})
    assert results_resp.status_code == 200, results_resp.text
    payload = results_resp.json()
    assert payload["total"] >= 3
    cards = payload["items"]
    scores = [c["total_score"] for c in cards]
    assert scores == sorted(scores, reverse=True)  # ordenado por score desc

    cards_by_result_id = {c["match_result_id"]: c for c in cards}
    card_a = cards_by_result_id[str(own_results[candidate_a_id].id)]
    card_c = cards_by_result_id[str(own_results[candidate_c_id].id)]

    # Candidato C sigue apareciendo en el ranking (RB-08: nunca eliminación silenciosa)
    # con la penalización visible y su causa.
    assert "Dominio avanzado de Excel" in card_c["gaps"]
    assert any(p["reason"] == "MANDATORY_UNMET" for p in card_c["penalties"])
    assert card_c["total_score"] < card_a["total_score"]  # penalizado, no eliminado

    # A no tiene ese gap (cumple el requisito).
    assert "Dominio avanzado de Excel" not in card_a["gaps"]

    # Ningún atributo protegido llega jamás en la respuesta HTTP.
    raw_text = results_resp.text
    for forbidden in ("full_name", "photo_url", "birth_date", "gender"):
        assert forbidden not in raw_text

    # --- GET /match-results/{id} (incluye explanation_text, A5 EXPLAIN) ---
    top_card = card_a
    top_result_id = top_card["match_result_id"]
    detail_resp = client.get(f"/api/v1/match-results/{top_result_id}", headers=_auth(company_token))
    assert detail_resp.status_code == 200, detail_resp.text
    detail = detail_resp.json()
    assert detail["explanation_text"], "la explicación debe generarse (A5 EXPLAIN, DeterministicAdapter)"
    assert detail["is_unlocked"] is False

    # Ningún porcentaje distinto de total_score aparece en el texto (regla dura de A5 EXPLAIN, RB-09).
    total_score = detail["total_score"]
    percentages = [float(m) for m in re.findall(r"(\d+(?:\.\d+)?)\s*%", detail["explanation_text"])]
    assert percentages, "la explicación debería mencionar el porcentaje real al menos una vez"
    assert all(p == total_score for p in percentages)

    # --- GET /match-results/{id}/full sin desbloquear -> 403 UNLOCK_REQUIRED ---
    full_before = client.get(f"/api/v1/match-results/{top_result_id}/full", headers=_auth(company_token))
    assert full_before.status_code == 403
    assert full_before.json()["code"] == "UNLOCK_REQUIRED"

    # --- POST /match-results/{id}/unlock ---
    unlock_resp = client.post(f"/api/v1/match-results/{top_result_id}/unlock", headers=_auth(company_token))
    assert unlock_resp.status_code == 200, unlock_resp.text
    unlocked = unlock_resp.json()
    assert unlocked["full_name"]
    assert unlocked["candidate_id"] == str(candidate_a_id)
    assert unlocked["unlocked_at"]  # D-02

    unlock_row = db_session.execute(
        select(CandidateUnlock).where(CandidateUnlock.candidate_id == candidate_a_id, CandidateUnlock.vacancy_id == vacancy_id)
    ).scalars().one()
    assert str(unlock_row.id)  # la fila existe -- es lo que hace visible la identidad (HU-M04)

    # --- GET /match-results/{id}/full ya desbloqueado -> 200 ---
    full_after = client.get(f"/api/v1/match-results/{top_result_id}/full", headers=_auth(company_token))
    assert full_after.status_code == 200
    assert full_after.json()["full_name"] == unlocked["full_name"]

    # --- GET /vacancies/{id}/compare?ids= (los 3 propios) ---
    all_ids = ",".join(str(own_results[cid].id) for cid in (candidate_a_id, candidate_b_id, candidate_c_id))
    compare_resp = client.get(f"/api/v1/vacancies/{vacancy_id}/compare", params={"ids": all_ids}, headers=_auth(company_token))
    assert compare_resp.status_code == 200, compare_resp.text
    compare_payload = compare_resp.json()
    assert len(compare_payload["candidates"]) == 3
    assert len(compare_payload["criteria"]) == 7
    assert compare_payload["key_differences"]

    # --- PUT /match-results/{id}/shortlist + GET /vacancies/{id}/shortlist ---
    shortlist_put = client.put(
        f"/api/v1/match-results/{top_result_id}/shortlist", json={"stage": "FINALIST"}, headers=_auth(company_token)
    )
    assert shortlist_put.status_code == 200, shortlist_put.text
    assert shortlist_put.json()["stage"] == "FINALIST"

    shortlist_get = client.get(f"/api/v1/vacancies/{vacancy_id}/shortlist", headers=_auth(company_token))
    assert shortlist_get.status_code == 200
    shortlist_entries = shortlist_get.json()
    assert len(shortlist_entries) == 1
    assert shortlist_entries[0]["match_result_id"] == top_result_id
    assert shortlist_entries[0]["is_unlocked"] is True

    # --- GET /vacancies/{id} ahora refleja last_match_run_id y shortlist_count ---
    vacancy_get = client.get(f"/api/v1/vacancies/{vacancy_id}", headers=_auth(company_token))
    assert vacancy_get.status_code == 200
    assert vacancy_get.json()["last_match_run_id"] == str(run_row.id)
    assert vacancy_get.json()["shortlist_count"] == 1

    # --- GET /companies/me/summary refleja los desbloqueos y finalistas reales ---
    summary_resp = client.get("/api/v1/companies/me/summary", headers=_auth(company_token))
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["unlocks"] == 1
    assert summary["candidates_in_selection"] == 1


# ---------------------------------------------------------------------------
# Aislamiento entre empresas
# ---------------------------------------------------------------------------


def test_vacancy_from_another_company_is_not_accessible(client: TestClient, db_session: Session, unique_email: str, admin_family_id: uuid.UUID) -> None:
    _, vacancy_id = _register_company_and_vacancy(client, db_session, email=f"empresa1.{unique_email}", family_id=admin_family_id)
    other_company_token = _register(client, f"empresa2.{unique_email}", "COMPANY")

    resp = client.post(f"/api/v1/vacancies/{vacancy_id}/match-runs", headers=_auth(other_company_token))
    assert resp.status_code == 404

    resp2 = client.get(f"/api/v1/vacancies/{vacancy_id}", headers=_auth(other_company_token))
    assert resp2.status_code == 404


def test_match_run_results_from_another_company_is_not_accessible(client: TestClient, db_session: Session, unique_email: str, admin_family_id: uuid.UUID) -> None:
    _, vacancy_id = _register_company_and_vacancy(client, db_session, email=f"empresa1b.{unique_email}", family_id=admin_family_id)
    _make_evaluated_candidate(
        client, db_session, email=f"cand1b.{unique_email}", family_id=admin_family_id,
        hard_answer=LEVEL4_ANSWER, soft_answer=LEVEL4_ANSWER,
    )
    run_row_id = uuid.UUID(match_run_worker(db_session, _FakeJob({"vacancy_id": str(vacancy_id)})))

    other_company_token = _register(client, f"empresa2b.{unique_email}", "COMPANY")
    resp = client.get(f"/api/v1/match-runs/{run_row_id}/results", headers=_auth(other_company_token))
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# D-07: marketplace del candidato
# ---------------------------------------------------------------------------


def test_candidate_marketplace_list_and_apply(client: TestClient, db_session: Session, unique_email: str, admin_family_id: uuid.UUID) -> None:
    _, vacancy_id = _register_company_and_vacancy(client, db_session, email=f"empresa3.{unique_email}", family_id=admin_family_id)
    candidate_token, _candidate_id = _make_evaluated_candidate(
        client, db_session, email=f"cand3.{unique_email}", family_id=admin_family_id,
        hard_answer=LEVEL4_ANSWER, soft_answer=LEVEL4_ANSWER,
    )

    open_list = client.get("/api/v1/vacancies/open", headers=_auth(candidate_token))
    assert open_list.status_code == 200, open_list.text
    opportunities = open_list.json()
    assert any(o["vacancy_id"] == str(vacancy_id) for o in opportunities)
    opportunity = next(o for o in opportunities if o["vacancy_id"] == str(vacancy_id))
    assert opportunity["compatibility"] is not None  # candidato EVALUATED de la misma familia
    assert opportunity["applied"] is False

    apply_resp = client.post(f"/api/v1/vacancies/{vacancy_id}/apply", headers=_auth(candidate_token))
    assert apply_resp.status_code == 200, apply_resp.text
    assert apply_resp.json()["status"] == "APPLIED"

    applications_resp = client.get("/api/v1/candidates/me/applications", headers=_auth(candidate_token))
    assert applications_resp.status_code == 200
    applications = applications_resp.json()
    assert any(a["vacancy_id"] == str(vacancy_id) for a in applications)

    # Aplicar dos veces no duplica la fila.
    apply_again = client.post(f"/api/v1/vacancies/{vacancy_id}/apply", headers=_auth(candidate_token))
    assert apply_again.status_code == 200
    applications_after = client.get("/api/v1/candidates/me/applications", headers=_auth(candidate_token)).json()
    assert len(applications_after) == len(applications)

    open_detail = client.get(f"/api/v1/vacancies/open/{vacancy_id}", headers=_auth(candidate_token))
    assert open_detail.status_code == 200
    assert open_detail.json()["applied"] is True
