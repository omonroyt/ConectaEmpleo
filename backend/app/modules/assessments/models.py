"""Modelos de evidencia y evaluación (docs/04 §5.5).

Campos aditivos de `docs/build/06_INTERVIEW_SYSTEM.md` §7:
- `CompetencyEvaluation.question_id`: trazabilidad pregunta ↔ evaluación.
- `TalentProfile.hard_skills_score/soft_skills_score/interview_score/coverage/
  risk_flags/inconsistencies`.

Dos desviaciones aditivas respecto al esquema literal de docs/04 §5.5,
documentadas en `docs/build/00_BUILD_STATE.md`:
1. `CompetencyEvaluation.interview_session_id` (fk, no está en docs/04): hace
   falta para poder validar la invariante I-02 ("`evidence_turn_ids` deben
   referenciar turnos reales de **esa sesión**") sin tener que recorrer
   `interview_turns` para inferir a qué sesión pertenece cada evaluación.
2. `CandidateSkill.skill_code` (string) en vez de `skill_id` (fk a
   `skills.id`): mismo motivo que `claims.skill_code` en B5
   (`app/modules/documents/models.py`) — el código de competencia evaluado no
   siempre existe todavía como fila en el catálogo `skills` (son catálogos
   distintos: `competencies` vs. `skills`), así que forzar la FK rompería la
   invariante "candidate_skills solo lo escribe el backend a partir de
   evidencia real".
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

RUBRIC_SOURCES = ("SPECIFIC", "PROVISIONAL", "BASELINE")
SKILL_EVIDENCE_TYPES = ("INTERVIEW_ANSWER", "DOCUMENT", "EXTERNAL")
COVERAGE_VALUES = ("FULL", "PARTIAL")


class CompetencyEvaluation(Base):
    __tablename__ = "competency_evaluations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False, index=True
    )
    interview_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interview_sessions.id"), nullable=False, index=True
    )
    competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("competencies.id"), nullable=False, index=True
    )
    rubric_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("rubrics.id"), nullable=True)
    rubric_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    rubric_source: Mapped[str] = mapped_column(String(20), nullable=False, default="SPECIFIC")
    score: Mapped[int] = mapped_column(Integer, nullable=False)  # 0-100, I-04 validado antes de llegar aquí
    rubric_level: Mapped[int] = mapped_column(Integer, nullable=False)  # 0-4
    confidence: Mapped[float] = mapped_column(Float, nullable=False)  # 0-1
    justification: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_refs: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)  # [turn_id]
    limitations: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_invocation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_invocations.id"), nullable=True
    )
    # --- Aditivo docs/build/06 §7 ---
    question_id: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CandidateSkill(Base):
    """Tres banderas independientes, nunca un enum (docs/04 §5.5, RF-12)."""

    __tablename__ = "candidate_skills"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False, index=True
    )
    skill_code: Mapped[str] = mapped_column(String(80), nullable=False)
    skill_name: Mapped[str] = mapped_column(String(200), nullable=False)
    is_declared: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_evaluated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    evaluated_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    evidence_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (UniqueConstraint("candidate_id", "skill_code", name="uq_candidate_skill_code"),)


class SkillEvidence(Base):
    """Invariante de dominio (docs/04 §5.5): `is_verified=true` en `CandidateSkill`
    solo si existe al menos una fila aquí con `type IN (DOCUMENT, EXTERNAL)` y
    `accepted_for_verification=true`. Se aplica en `assessments/service.py`
    (I-03), nunca por un agente."""

    __tablename__ = "skill_evidences"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_skill_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_skills.id"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # INTERVIEW_ANSWER | DOCUMENT | EXTERNAL
    document_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)
    interview_turn_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interview_turns.id"), nullable=True
    )
    accepted_for_verification: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TalentProfile(Base):
    __tablename__ = "talent_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    overall_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    overall_label: Mapped[str] = mapped_column(String(80), nullable=False, default="")
    top_skills: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    strengths: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    evidence_gaps: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    summary_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # --- Aditivos docs/build/06 §7 ---
    hard_skills_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    soft_skills_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    interview_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    coverage: Mapped[str] = mapped_column(String(10), nullable=False, default="FULL")
    risk_flags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    inconsistencies: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
