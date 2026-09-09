"""B6 — entrevista adaptativa: recorrido completo, idempotencia, presupuesto,
follow-ups y demo mode (docs/build/06_INTERVIEW_SYSTEM.md, docs/05 §4).

Usa `AI_ADAPTER=deterministic` (default de `Settings`), así que
`app.ai.adapters.deterministic.DeterministicAdapter.next_interview_question`
decide los follow-ups: solo propone `PROBE` cuando la única respuesta que ve
(la del turno base bajo revisión) tiene 12 o más palabras (ver
`app/ai/orchestration/interview_flow.py::_maybe_create_followup`, que le pasa
un `history` de un solo turno a propósito para que la decisión dependa
exclusivamente de esa respuesta). Los tests explotan esa regla deliberadamente:
respuestas cortas (<12 palabras) nunca disparan follow-up; una respuesta larga
sí.
"""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.catalog.models import JobFamily
from app.modules.interviews.models import InterviewSession, InterviewTurn

SHORT_ANSWER = "Reviso todo con cuidado y lo registro correctamente."  # 8 palabras
LONG_ANSWER = (
    "Primero reviso la orden de compra completa, comparo cada artículo con el inventario "
    "físico y reporto cualquier diferencia al supervisor de inmediato."
)  # > 12 palabras


def _register_candidate(client: TestClient, email: str) -> str:
    resp = client.post("/api/v1/auth/register", json={"email": email, "password": "demo1234", "role": "CANDIDATE"})
    assert resp.status_code == 201
    return resp.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _setup_candidate_with_family(client: TestClient, db_session: Session, email: str, family_code: str = "ADMIN_ASSISTANT") -> str:
    token = _register_candidate(client, email)
    family_id = str(
        db_session.query(JobFamily.id).filter(JobFamily.code == family_code).scalar()
    )
    resp = client.post("/api/v1/candidates/me/job-family", json={"job_family_id": family_id}, headers=_auth(token))
    assert resp.status_code == 200
    return token


def _create_interview(client: TestClient, token: str) -> dict:
    resp = client.post("/api/v1/interviews", json={"mode": "TEXT"}, headers=_auth(token))
    assert resp.status_code == 201
    return resp.json()


def test_full_interview_14_base_turns_hard_then_soft_no_repeated_question_id(
    client: TestClient, db_session: Session, unique_email: str
) -> None:
    token = _setup_candidate_with_family(client, db_session, unique_email)
    session = _create_interview(client, token)
    interview_id = session["id"]
    assert session["question_budget"] == 14

    seen_question_ids: list[str] = []
    blocks: list[str] = []
    turns_seen = 0
    finished = False
    finish_reason = None

    while not finished and turns_seen < 40:  # cota de seguridad contra un bug de bucle infinito
        next_resp = client.get(f"/api/v1/interviews/{interview_id}/next-question", headers=_auth(token))
        assert next_resp.status_code == 200
        body = next_resp.json()
        if body["finished"]:
            finished = True
            finish_reason = body["finish_reason"]
            break

        turn = body["turn"]
        assert turn["is_follow_up"] is False  # SHORT_ANSWER nunca dispara follow-up (< 12 palabras)
        assert turn["question_id"] not in seen_question_ids
        seen_question_ids.append(turn["question_id"])
        blocks.append(turn["block"])
        turns_seen += 1

        answer_resp = client.post(
            f"/api/v1/interviews/{interview_id}/answers",
            json={"answer_text": SHORT_ANSWER, "mode": "TEXT"},
            headers=_auth(token),
        )
        assert answer_resp.status_code == 200
        if answer_resp.json()["finished"]:
            finished = True
            finish_reason = answer_resp.json()["finish_reason"]

    assert len(seen_question_ids) == 14
    assert len(set(seen_question_ids)) == 14
    assert blocks[:7] == ["HARD"] * 7
    assert blocks[7:] == ["SOFT"] * 7
    assert finished is True
    assert finish_reason == "COVERAGE_SUFFICIENT"

    db_session.expire_all()
    db_row = db_session.get(InterviewSession, uuid.UUID(interview_id))
    assert db_row.status == "COMPLETED"
    assert db_row.questions_asked == 14  # los follow-ups (aquí ninguno) nunca cuentan aquí


def test_next_question_is_idempotent_on_reopen(client: TestClient, db_session: Session, unique_email: str) -> None:
    token = _setup_candidate_with_family(client, db_session, unique_email)
    session = _create_interview(client, token)
    interview_id = session["id"]

    first = client.get(f"/api/v1/interviews/{interview_id}/next-question", headers=_auth(token)).json()
    assert first["finished"] is False
    first_turn_id = first["turn"]["id"]
    budget_after_first_call = first["progress"]["asked"]

    # Reabrir sin responder: debe devolver EXACTAMENTE el mismo turno, sin
    # consumir presupuesto (el frontend depende de esto).
    for _ in range(3):
        reopened = client.get(f"/api/v1/interviews/{interview_id}/next-question", headers=_auth(token)).json()
        assert reopened["finished"] is False
        assert reopened["turn"]["id"] == first_turn_id
        assert reopened["progress"]["asked"] == budget_after_first_call


def test_create_interview_reuses_in_progress_session(client: TestClient, db_session: Session, unique_email: str) -> None:
    token = _setup_candidate_with_family(client, db_session, unique_email)
    first = _create_interview(client, token)
    second = _create_interview(client, token)
    assert first["id"] == second["id"]


def test_followup_does_not_increment_base_question_counter(
    client: TestClient, db_session: Session, unique_email: str
) -> None:
    token = _setup_candidate_with_family(client, db_session, unique_email)
    session = _create_interview(client, token)
    interview_id = session["id"]

    first = client.get(f"/api/v1/interviews/{interview_id}/next-question", headers=_auth(token)).json()
    base_turn = first["turn"]
    assert base_turn["is_follow_up"] is False
    base_question_id = base_turn["question_id"]

    answer_resp = client.post(
        f"/api/v1/interviews/{interview_id}/answers",
        json={"answer_text": LONG_ANSWER, "mode": "TEXT"},
        headers=_auth(token),
    ).json()

    assert answer_resp["finished"] is False
    followup_turn = answer_resp["turn"]
    assert followup_turn["is_follow_up"] is True
    assert followup_turn["question_id"] == base_question_id  # hereda el question_id de la base
    # El contador de preguntas base NO avanzó por el follow-up.
    assert answer_resp["progress"]["asked"] == 1

    db_session.expire_all()
    db_row = db_session.get(InterviewSession, uuid.UUID(interview_id))
    assert db_row.questions_asked == 1
    assert db_row.coverage_state["base_questions_answered"] == 1
    assert db_row.coverage_state["follow_ups_for_current_question"] == 1

    followups = (
        db_session.query(InterviewTurn)
        .filter(InterviewTurn.session_id == uuid.UUID(interview_id), InterviewTurn.is_follow_up.is_(True))
        .all()
    )
    assert len(followups) == 1
    assert followups[0].references_turn_id is not None


def test_backend_enforces_budget_even_if_agent_keeps_probing(
    client: TestClient, db_session: Session, unique_email: str
) -> None:
    """El presupuesto lo impone el orquestador: `INTERVIEW_MAX_FOLLOWUPS_PER_QUESTION`
    (2) topa los follow-ups aunque el adaptador siga proponiendo `PROBE` en
    cada respuesta larga, y la entrevista igual termina en exactamente 14
    preguntas base."""

    token = _setup_candidate_with_family(client, db_session, unique_email)
    session = _create_interview(client, token)
    interview_id = session["id"]

    base_answers = 0
    followup_answers = 0
    finished = False
    finish_reason = None
    guard = 0

    while not finished and guard < 60:
        guard += 1
        next_resp = client.get(f"/api/v1/interviews/{interview_id}/next-question", headers=_auth(token)).json()
        if next_resp["finished"]:
            finished = True
            finish_reason = next_resp["finish_reason"]
            break
        turn = next_resp["turn"]
        # Siempre respuesta larga: el adaptador determinista propondría PROBE
        # indefinidamente si el orquestador no topara los follow-ups.
        answer_resp = client.post(
            f"/api/v1/interviews/{interview_id}/answers",
            json={"answer_text": LONG_ANSWER, "mode": "TEXT"},
            headers=_auth(token),
        ).json()
        if turn["is_follow_up"]:
            followup_answers += 1
        else:
            base_answers += 1
        if answer_resp["finished"]:
            finished = True
            finish_reason = answer_resp["finish_reason"]

    assert finished is True
    assert finish_reason in ("COVERAGE_SUFFICIENT", "BUDGET_EXHAUSTED")
    assert base_answers == 14
    # Como máximo 2 follow-ups por pregunta base -> como máximo 28 en total.
    assert followup_answers <= 28

    db_session.expire_all()
    db_row = db_session.get(InterviewSession, uuid.UUID(interview_id))
    assert db_row.questions_asked == 14


def test_demo_mode_trims_to_three_plus_three(
    client: TestClient, db_session: Session, unique_email: str, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.ai.orchestration.interview_flow.get_settings",
        lambda: _DemoSettings(),
    )

    token = _setup_candidate_with_family(client, db_session, unique_email)
    session = _create_interview(client, token)
    assert session["question_budget"] == 6

    blocks = []
    finished = False
    guard = 0
    interview_id = session["id"]
    while not finished and guard < 20:
        guard += 1
        next_resp = client.get(f"/api/v1/interviews/{interview_id}/next-question", headers=_auth(token)).json()
        if next_resp["finished"]:
            finished = True
            break
        blocks.append(next_resp["turn"]["block"])
        answer_resp = client.post(
            f"/api/v1/interviews/{interview_id}/answers",
            json={"answer_text": SHORT_ANSWER, "mode": "TEXT"},
            headers=_auth(token),
        ).json()
        if answer_resp["finished"]:
            finished = True

    assert blocks == ["HARD"] * 3 + ["SOFT"] * 3


class _DemoSettings:
    """Doble mínimo de `Settings` con `interview_demo_mode=True` (evita
    reconstruir el objeto Pydantic completo solo para este flag)."""

    def __init__(self) -> None:
        from app.config import get_settings

        real = get_settings()
        for field in type(real).model_fields:
            setattr(self, field, getattr(real, field))
        self.interview_demo_mode = True
        self.interview_question_budget = 14
