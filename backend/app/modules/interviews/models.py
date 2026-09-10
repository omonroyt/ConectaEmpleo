"""Modelos `interview_sessions` e `interview_turns` (docs/04 §5.4).

Campos aditivos de `docs/build/06_INTERVIEW_SYSTEM.md` §7 y §6:
- `InterviewTurn.question_id` / `.is_follow_up` / `.block`: trazabilidad al
  banco de preguntas semilla (`app/seeds/interview_bank/*.json`) y a si un
  turno cuenta como pregunta base o como seguimiento.
- `InterviewSession.mode`: `TEXT|VOICE`, ya presente en el contrato HTTP
  (`docs/build/02_API_CONTRACT.md` `InterviewSession.mode`) pero no en la
  tabla de docs/04 §5.4 (se agrega aquí porque el backend la necesita).
- `InterviewSession.finish_reason`: campo interno (no viaja en el contrato
  `InterviewSession`, sí en `NextQuestion.finish_reason`) para poder responder
  de forma idempotente a `GET .../next-question` una vez la sesión ya
  terminó, sin tener que volver a derivar la razón de cierre.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

INTERVIEW_STATUSES = ("PENDING", "IN_PROGRESS", "COMPLETED", "ABANDONED")
INTERVIEW_MODES = ("VOICE", "TEXT")
QUESTION_INTENTS = ("PROBE", "SCENARIO", "CLARIFY", "SWITCH")
FINISH_REASONS = ("BUDGET_EXHAUSTED", "COVERAGE_SUFFICIENT", "AGENT_FINISH")

#: Forma por defecto de `coverage_state` (docs/build/06_INTERVIEW_SYSTEM.md §6).
DEFAULT_COVERAGE_STATE: dict = {
    "phase": "HARD",
    "current_question_id": None,
    "base_questions_answered": 0,
    "follow_ups_for_current_question": 0,
    "answered_question_ids": [],
    "claims_to_validate": [],
    "contradictions": [],
    "consecutive_weak_answers": 0,
}


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False, index=True
    )
    job_family_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("job_families.id"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    mode: Mapped[str] = mapped_column(String(10), nullable=False, default="TEXT")
    question_budget: Mapped[int] = mapped_column(Integer, nullable=False)
    questions_asked: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    coverage_state: Mapped[dict] = mapped_column(JSONB, nullable=False, default=lambda: dict(DEFAULT_COVERAGE_STATE))
    finish_reason: Mapped[str | None] = mapped_column(String(30), nullable=True)
    agent_version: Mapped[str] = mapped_column(String(20), nullable=False, default="v1")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class InterviewTurn(Base):
    __tablename__ = "interview_turns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interview_sessions.id"), nullable=False, index=True
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    target_competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("competencies.id"), nullable=False, index=True
    )
    question_intent: Mapped[str] = mapped_column(String(20), nullable=False, default="SCENARIO")
    references_turn_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interview_turns.id"), nullable=True
    )
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    answer_received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    #: Lectura interpretada de `answer_text` (`AnswerInterpretation` serializada,
    #: ver `app/ai/contracts/base.py`). `answer_text` conserva SIEMPRE el
    #: transcript crudo: esto es una lectura derivada y auditable, nunca un
    #: reemplazo de la evidencia original.
    answer_interpretation: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ai_invocation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_invocations.id"), nullable=True
    )
    # --- Aditivos de docs/build/06_INTERVIEW_SYSTEM.md §7 ---
    question_id: Mapped[str | None] = mapped_column(String(20), nullable=True)  # "HA-01"; null en follow-ups libres
    is_follow_up: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    block: Mapped[str | None] = mapped_column(String(10), nullable=True)  # HARD | SOFT
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
