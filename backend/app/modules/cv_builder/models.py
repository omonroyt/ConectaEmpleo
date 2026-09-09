"""Persistencia del CV conversacional (A1 modo BUILD, docs/05 §7 A1).

No existe en `docs/04 §5` (esas tablas no estaban diseñadas todavía): B5 las
agrega de forma aditiva porque `DeterministicAdapter.build_cv_conversationally`
es deliberadamente sin estado (recibe `turn_index`/`last_answer`/
`answers_so_far`, devuelve el siguiente turno) — alguien tiene que guardar la
sesión entre requests HTTP, y esa responsabilidad es de B5 según la bitácora
de B3-B4 (`docs/build/00_BUILD_STATE.md`).

`follow_up_asked` implementa la regla de docs/05 §7: "si la respuesta es muy
breve, repregunta con un ejemplo concreto" y "acepta 'no sé' sin insistir más
de una vez" — es una decisión de orquestación de sesión (cuántas veces
repreguntar), no del adaptador de IA, así que vive aquí, no en
`deterministic.py`.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

CV_BUILDER_SESSION_STATUSES = ("ACTIVE", "FINALIZED")
CV_BUILDER_MESSAGE_ROLES = ("agent", "candidate")


class CVBuilderSession(Base):
    __tablename__ = "cv_builder_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")
    turn_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_turns: Mapped[int] = mapped_column(Integer, nullable=False, default=8)
    follow_up_asked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    current_question_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    answers: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    cv_extraction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cv_extractions.id"), nullable=True
    )
    document_storage_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    document_generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CVBuilderMessage(Base):
    __tablename__ = "cv_builder_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cv_builder_sessions.id"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(10), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
