"""Servicio de dominio de entrevistas: envoltura HTTP sobre `InterviewOrchestrator`.

`docs/build/02_API_CONTRACT.md` §4, filas `interviews.*`. La máquina de
estados vive en `app/ai/orchestration/interview_flow.py`; este módulo solo
resuelve propiedad (¿esta sesión es de este candidato?), construye/valida
esquemas HTTP y traduce errores de dominio.
"""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.ai.orchestration.interview_flow import InterviewOrchestrator
from app.core.errors import NotFoundError, ValidationDomainError
from app.modules.candidates.models import CandidateProfile
from app.modules.catalog.models import Competency
from app.modules.interviews.models import InterviewSession, InterviewTurn
from app.modules.interviews.schemas import (
    AnswerInput,
    InterviewProgress,
)
from app.modules.interviews.schemas import (
    InterviewSession as InterviewSessionSchema,
)
from app.modules.interviews.schemas import (
    InterviewTurn as InterviewTurnSchema,
)
from app.modules.interviews.schemas import (
    NextQuestion,
)


def get_session_or_404(db: Session, *, session_id: uuid.UUID, candidate_id: uuid.UUID) -> InterviewSession:
    session = db.get(InterviewSession, session_id)
    if session is None or session.candidate_id != candidate_id:
        raise NotFoundError("La entrevista solicitada no existe.")
    return session


def to_session_schema(session: InterviewSession) -> InterviewSessionSchema:
    return InterviewSessionSchema(
        id=session.id,
        status=session.status,
        mode=session.mode,
        question_budget=session.question_budget,
        questions_asked=session.questions_asked,
        coverage_state=session.coverage_state or {},
        started_at=session.started_at,
        completed_at=session.completed_at,
    )


def _competency_code(db: Session, competency_id: uuid.UUID) -> str:
    competency = db.get(Competency, competency_id)
    return competency.code if competency else ""


def to_turn_schema(db: Session, turn: InterviewTurn) -> InterviewTurnSchema:
    return InterviewTurnSchema(
        id=turn.id,
        sequence=turn.sequence,
        question_text=turn.question_text,
        target_competency_code=_competency_code(db, turn.target_competency_id),
        question_intent=turn.question_intent,
        references_turn_id=turn.references_turn_id,
        answer_text=turn.answer_text,
        answer_received_at=turn.answer_received_at,
        audio_url=None,
        question_id=turn.question_id,
        is_follow_up=turn.is_follow_up,
        block=turn.block,
    )


def create_session(db: Session, *, profile: CandidateProfile, mode: str = "TEXT") -> InterviewSessionSchema:
    if profile.job_family_id is None:
        raise ValidationDomainError("Selecciona primero una familia laboral antes de iniciar la entrevista.")

    orchestrator = InterviewOrchestrator(db)
    session = orchestrator.create_or_reuse_session(
        candidate_id=profile.id, job_family_id=profile.job_family_id, mode=mode
    )

    if profile.interview_session_id != session.id or profile.status == "CV_READY":
        profile.interview_session_id = session.id
        if profile.status in ("DRAFT", "CV_READY"):
            profile.status = "INTERVIEWING"
        db.add(profile)
        db.commit()

    return to_session_schema(session)


def get_session(db: Session, *, session_id: uuid.UUID, candidate_id: uuid.UUID) -> InterviewSessionSchema:
    session = get_session_or_404(db, session_id=session_id, candidate_id=candidate_id)
    return to_session_schema(session)


def next_question(db: Session, *, session_id: uuid.UUID, candidate_id: uuid.UUID) -> NextQuestion:
    session = get_session_or_404(db, session_id=session_id, candidate_id=candidate_id)
    orchestrator = InterviewOrchestrator(db)
    turn, finished, reason, progress = orchestrator.next_question(session)
    return NextQuestion(
        turn=to_turn_schema(db, turn) if turn is not None else None,
        finished=finished,
        finish_reason=reason,
        progress=progress,
    )


def submit_answer(
    db: Session, *, session_id: uuid.UUID, candidate_id: uuid.UUID, payload: AnswerInput
) -> NextQuestion:
    session = get_session_or_404(db, session_id=session_id, candidate_id=candidate_id)
    orchestrator = InterviewOrchestrator(db)
    pending = orchestrator._pending_turn(session)  # noqa: SLF001 — mismo módulo conceptual (service <-> orchestrator)
    if pending is None:
        raise ValidationDomainError(
            "No hay una pregunta pendiente de responder; llama a next-question primero."
        )

    turn, finished, reason, progress = orchestrator.submit_answer(session, pending, payload.answer_text)
    return NextQuestion(
        turn=to_turn_schema(db, turn) if turn is not None else None,
        finished=finished,
        finish_reason=reason,
        progress=progress,
    )


def get_progress(db: Session, *, session_id: uuid.UUID, candidate_id: uuid.UUID) -> InterviewProgress:
    session = get_session_or_404(db, session_id=session_id, candidate_id=candidate_id)
    orchestrator = InterviewOrchestrator(db)
    summary = orchestrator.progress_summary(session)
    percent = round(100 * summary["asked"] / summary["budget"]) if summary["budget"] else 0
    return InterviewProgress(
        asked=summary["asked"],
        budget=summary["budget"],
        percent=percent,
        coverage=orchestrator.coverage_map(session),
    )


def list_turns(db: Session, *, session_id: uuid.UUID, candidate_id: uuid.UUID) -> list[InterviewTurnSchema]:
    session = get_session_or_404(db, session_id=session_id, candidate_id=candidate_id)
    orchestrator = InterviewOrchestrator(db)
    return [to_turn_schema(db, t) for t in orchestrator._turns(session)]  # noqa: SLF001


def ensure_completed(db: Session, *, session_id: uuid.UUID, candidate_id: uuid.UUID) -> InterviewSession:
    """Usado por `POST /interviews/{id}/complete`: fuerza el cierre si el
    candidato ya respondió todo lo necesario pero el cliente no volvió a
    llamar a `next-question` para que el orquestador lo detectara."""

    session = get_session_or_404(db, session_id=session_id, candidate_id=candidate_id)
    if session.status == "COMPLETED":
        return session

    orchestrator = InterviewOrchestrator(db)
    turn, finished, _reason, _progress = orchestrator.next_question(session)
    if not finished or turn is not None:
        raise ValidationDomainError(
            "La entrevista todavía tiene preguntas pendientes; no se puede completar."
        )
    db.refresh(session)
    return session
