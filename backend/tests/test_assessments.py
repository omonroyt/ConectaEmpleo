"""B7 — evaluación por rúbricas, invariantes I-02/I-03/I-04 y scoring
(`docs/build/06_INTERVIEW_SYSTEM.md` §4, `docs/04` §6.3).

Los workers de job (`evaluate_worker`/`profile_build_worker`) se llaman aquí
**directamente** (con un `Job` de mentiras que solo trae `.payload`), no vía
`POST /interviews/{id}/complete` + `BackgroundTasks`: ese endpoint dispara
`run_job`, que abre su propia `SessionLocal()` en una conexión nueva y por
tanto no ve las filas que la transacción de prueba (`db_session`, con
rollback al final) todavía no comiteó de verdad a la base — la misma
limitación ya documentada en `tests/test_documents.py` para `CV_PARSE`. El
recorrido con `BackgroundTasks` real sí se verifica contra un servidor
corriendo de verdad (ver reporte del cierre de esta tarea).
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.contracts.assessment import CompetencyScore, EvaluationResult
from app.ai.adapters.deterministic import DeterministicAdapter
from app.ai.contracts.base import TurnDTO
from app.core.errors import DomainError
from app.modules.assessments import service
from app.modules.assessments.jobs import evaluate_worker, profile_build_worker
from app.modules.assessments.models import TalentProfile
from app.modules.candidates.models import CandidateProfile
from app.modules.catalog.models import JobFamily
from app.modules.catalog.service import resolve_rubric_specs_for_family
from app.modules.interviews.models import InterviewSession


class _FakeJob:
    def __init__(self, payload: dict) -> None:
        self.payload = payload


def _register_candidate(client: TestClient, email: str) -> str:
    resp = client.post("/api/v1/auth/register", json={"email": email, "password": "demo1234", "role": "CANDIDATE"})
    assert resp.status_code == 201
    return resp.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _setup_candidate_with_family(client: TestClient, db_session: Session, email: str, family_code: str = "ADMIN_ASSISTANT") -> tuple[str, uuid.UUID]:
    token = _register_candidate(client, email)
    family_id = db_session.query(JobFamily.id).filter(JobFamily.code == family_code).scalar()
    resp = client.post("/api/v1/candidates/me/job-family", json={"job_family_id": str(family_id)}, headers=_auth(token))
    assert resp.status_code == 200
    return token, family_id


def _run_full_interview(client: TestClient, token: str, interview_id: str, answer_fn) -> None:
    """`answer_fn(question_id, block) -> str` para turnos base; los follow-ups
    siempre reciben una respuesta corta de relleno (para no encadenar más de
    uno por pregunta y no ensuciar el conteo de palabras de la base)."""

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


#: >=25 palabras -> nivel 4 (banda máxima) en `DeterministicAdapter._band_for_words`.
LEVEL4_ANSWER = " ".join(["Reviso", "verifico", "documento", "comunico", "coordino"] * 6)
#: >=6 y <15 palabras -> nivel 2.
LEVEL2_ANSWER = " ".join(["Reviso", "avanzo", "colaboro", "reviso", "avanzo", "colaboro", "reviso", "avanzo"])


def _get_session(db_session: Session, candidate_id: uuid.UUID) -> InterviewSession:
    return db_session.execute(
        select(InterviewSession).where(InterviewSession.candidate_id == candidate_id)
    ).scalars().one()


# ---------------------------------------------------------------------------
# I-04: score fuera de rango es error de validación, nunca clamp.
# ---------------------------------------------------------------------------


def test_i04_score_out_of_range_raises_not_clamps() -> None:
    with pytest.raises(Exception):
        CompetencyScore(
            competency_code="ADMIN_HA_01",
            competency_name="Excel",
            type="TECHNICAL",
            rubric_version=1,
            rubric_source="SPECIFIC",
            score=120,
            rubric_level=4,
            confidence=0.8,
            justification="x" * 25,
            evidence_turn_ids=["11111111-1111-1111-1111-111111111111"],
        )


# ---------------------------------------------------------------------------
# I-02: evidence_turn_ids debe referenciar turnos reales de ESA sesión.
# ---------------------------------------------------------------------------


def test_i02_rejects_evaluation_citing_nonexistent_turns(client: TestClient, db_session: Session, unique_email: str) -> None:
    token, family_id = _setup_candidate_with_family(client, db_session, unique_email)
    client.post("/api/v1/interviews", json={"mode": "TEXT"}, headers=_auth(token))

    profile = db_session.query(CandidateProfile).filter(CandidateProfile.job_family_id == family_id).order_by(CandidateProfile.created_at.desc()).first()
    session = _get_session(db_session, profile.id)

    fake_evaluation = EvaluationResult(
        evaluations=[
            CompetencyScore(
                competency_code="ADMIN_HA_01",
                competency_name="Excel y hojas de cálculo",
                type="TECHNICAL",
                rubric_version=1,
                rubric_source="SPECIFIC",
                score=100,
                rubric_level=4,
                confidence=0.9,
                justification="Cita un turno que no existe en esta sesión" + "." * 10,
                evidence_turn_ids=[str(uuid.uuid4())],  # turno inexistente
            )
        ]
    )

    with pytest.raises(DomainError):
        service.validate_evidence_turn_ids(db_session, session_id=session.id, evaluations=fake_evaluation.evaluations)


# ---------------------------------------------------------------------------
# I-03: is_verified solo se activa con evidencia documental aceptada.
# ---------------------------------------------------------------------------


def test_i03_is_verified_requires_accepted_documentary_evidence(client: TestClient, db_session: Session, unique_email: str) -> None:
    token, family_id = _setup_candidate_with_family(client, db_session, unique_email)
    profile = db_session.query(CandidateProfile).filter(CandidateProfile.job_family_id == family_id).order_by(CandidateProfile.created_at.desc()).first()

    # Evidencia de tipo entrevista (no documental): nunca verifica, sin importar `accepted_for_verification`.
    skill = service.accept_skill_evidence(
        db_session,
        candidate_id=profile.id,
        skill_code="ADMIN_HA_01",
        skill_name="Excel",
        evidence_type="INTERVIEW_ANSWER",
        accepted_for_verification=True,
    )
    assert skill.is_verified is False

    # Documental pero NO aceptada: tampoco verifica.
    skill = service.accept_skill_evidence(
        db_session,
        candidate_id=profile.id,
        skill_code="ADMIN_HA_01",
        skill_name="Excel",
        evidence_type="DOCUMENT",
        accepted_for_verification=False,
    )
    assert skill.is_verified is False

    # Documental Y aceptada: única combinación que verifica.
    skill = service.accept_skill_evidence(
        db_session,
        candidate_id=profile.id,
        skill_code="ADMIN_HA_01",
        skill_name="Excel",
        evidence_type="DOCUMENT",
        accepted_for_verification=True,
    )
    assert skill.is_verified is True


def test_no_ai_contract_can_declare_is_verified() -> None:
    """Refuerzo estructural de I-03: ningún DTO que un agente pueda rellenar
    declara el campo `is_verified` -- así que no hay forma de que un agente lo
    escriba, ni por accidente ni a propósito."""

    from app.ai.contracts.assessment import CandidateSkillDTO, CompetencyScore as CS

    assert "is_verified" not in CandidateSkillDTO.model_fields
    assert "is_verified" not in CS.model_fields


# ---------------------------------------------------------------------------
# Scoring exacto (docs/build/06 §4)
# ---------------------------------------------------------------------------


def test_seven_level4_hard_answers_yield_hard_skills_score_100(
    client: TestClient, db_session: Session, unique_email: str
) -> None:
    token, family_id = _setup_candidate_with_family(client, db_session, unique_email)
    resp = client.post("/api/v1/interviews", json={"mode": "TEXT"}, headers=_auth(token))
    interview_id = resp.json()["id"]

    def _answer(question_id: str, block: str) -> str:
        return LEVEL4_ANSWER if block == "HARD" else "no sé bien, poco"

    _run_full_interview(client, token, interview_id, _answer)

    profile = db_session.query(CandidateProfile).filter(CandidateProfile.job_family_id == family_id).order_by(CandidateProfile.created_at.desc()).first()
    session = _get_session(db_session, profile.id)

    evaluate_worker(db_session, _FakeJob({"interview_session_id": str(session.id)}))
    profile_build_worker(db_session, _FakeJob({"interview_session_id": str(session.id)}))

    talent_profile = db_session.execute(
        select(TalentProfile).where(TalentProfile.candidate_id == profile.id, TalentProfile.is_current.is_(True))
    ).scalars().one()
    assert talent_profile.hard_skills_score == 100


def test_known_mix_yields_exact_interview_score(client: TestClient, db_session: Session, unique_email: str) -> None:
    token, family_id = _setup_candidate_with_family(client, db_session, unique_email)
    resp = client.post("/api/v1/interviews", json={"mode": "TEXT"}, headers=_auth(token))
    interview_id = resp.json()["id"]

    def _answer(question_id: str, block: str) -> str:
        return LEVEL4_ANSWER if block == "HARD" else LEVEL2_ANSWER

    _run_full_interview(client, token, interview_id, _answer)

    profile = db_session.query(CandidateProfile).filter(CandidateProfile.job_family_id == family_id).order_by(CandidateProfile.created_at.desc()).first()
    session = _get_session(db_session, profile.id)

    evaluate_worker(db_session, _FakeJob({"interview_session_id": str(session.id)}))
    profile_build_worker(db_session, _FakeJob({"interview_session_id": str(session.id)}))

    talent_profile = db_session.execute(
        select(TalentProfile).where(TalentProfile.candidate_id == profile.id, TalentProfile.is_current.is_(True))
    ).scalars().one()
    # hard = 28/28*100 = 100 ; soft = 14/28*100 = 50 ; interview = 0.5*100+0.5*50 = 75
    assert talent_profile.hard_skills_score == 100
    assert talent_profile.soft_skills_score == 50
    assert talent_profile.interview_score == 75
    assert talent_profile.overall_score == 75
    assert talent_profile.overall_label == "Evidencia sólida con áreas puntuales de desarrollo"
    assert talent_profile.coverage == "FULL"


# ---------------------------------------------------------------------------
# Prueba de sesgo (docs/build/06 §8.4, la más importante) — contra el
# DeterministicAdapter, estable y barata. Para correrla contra el agente real:
# instanciar `AgenticAdapter()` (requiere `ANTHROPIC_API_KEY`) en vez de
# `DeterministicAdapter()`, y comparar `EvaluationResult.evaluations[i].score`
# de la misma manera -- ver `tests/test_interview_live_agentic.py` para el
# patrón de prueba real gateada por variable de entorno.
# ---------------------------------------------------------------------------


def test_formal_vs_colloquial_registers_score_within_ten_points(db_session: Session) -> None:
    rubrics = resolve_rubric_specs_for_family(db_session, db_session.query(JobFamily.id).filter(JobFamily.code == "WAREHOUSE_SUPERVISOR").scalar())
    rubric = next(r for r in rubrics if r.competency_code == "WAREHOUSE_HE_01")

    formal_text = (
        "Realizo un reconteo físico inmediato del producto en cuestión y reviso los movimientos "
        "registrados en el sistema durante la última semana para identificar el origen de la diferencia. "
        "Si no logro explicarla, reporto el hallazgo a mi supervisor y solicito autorización antes de "
        "realizar cualquier ajuste en el inventario."
    )
    colloquial_text = (
        "Pos ahí le vuelvo a contar la mercancía luego luego y checo los movimientos de la semana en el "
        "sistema pa' ver de dónde salió la diferencia. Si no le hallo, le aviso a mi jefe y espero que me "
        "autorice antes de mover cualquier cosa en el inventario."
    )

    adapter = DeterministicAdapter()

    def _score_for(text: str) -> int:
        turn = TurnDTO(
            turn_id=str(uuid.uuid4()),
            sequence=1,
            question_text="¿Qué pasos seguirías para investigar y corregir la diferencia?",
            target_competency_code="WAREHOUSE_HE_01",
            question_intent="SCENARIO",
            answer_text=text,
        )
        from app.ai.contracts.assessment import EvaluationRequest

        request = EvaluationRequest(
            session_id=str(uuid.uuid4()),
            job_family_code="WAREHOUSE_SUPERVISOR",
            transcript=[turn],
            rubrics=[rubric],
        )
        result = adapter.evaluate_competencies(request)
        return result.evaluations[0].score

    formal_score = _score_for(formal_text)
    colloquial_score = _score_for(colloquial_text)

    assert abs(formal_score - colloquial_score) <= 10, (
        f"El registro coloquial no debe penalizarse frente al formal: formal={formal_score}, "
        f"coloquial={colloquial_score}"
    )
