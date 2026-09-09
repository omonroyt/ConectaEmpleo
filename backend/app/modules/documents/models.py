"""Modelos `documents`, `cv_extractions` y `claims` (docs/04 §5.3).

`CVExtraction` y `Claim` son de B5: la extracción vive **separada** del
perfil hasta que el candidato la confirma (`PATCH .../cv/extraction`, HU-C05)
— por eso `CVExtraction` no toca `candidate_profiles` directamente, y
`compute_status_view` (`candidates/service.py`) usa
`CVExtraction.confirmed_by_candidate`, no `Document.status`, para decidir
`REVIEW_CLAIMS`.

Dos desviaciones aditivas respecto al esquema literal de docs/04 §5.3,
documentadas también en `docs/build/00_BUILD_STATE.md`:
1. `claims.skill_code` (string) en vez de `skill_id` (fk a `skills.id`): el
   contrato HTTP (`docs/build/02_API_CONTRACT.md` `Claim`) expone
   `skill_code`, no un id interno, y una skill detectada por el adaptador de
   IA no siempre existe todavía en el catálogo `skills` — forzar la FK
   obligaría a autoextender el catálogo dentro de una transacción de job,
   que es una responsabilidad distinta (RB futura, no de B5).
2. `claims.cv_extraction_id` (fk nullable, no está en docs/04): permite que
   `GET/PATCH /candidates/me/cv/extraction` muestre y reemplace exactamente
   los claims de *esa* extracción pendiente, sin arrastrar claims de
   extracciones anteriores o de una entrevista futura (B6) que también
   escribirán en esta misma tabla por `candidate_id`.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

DOCUMENT_TYPES = ("CV", "CERTIFICATION", "OTHER", "AUDIO_ANSWER")
DOCUMENT_STATUSES = ("UPLOADED", "PROCESSING", "PARSED", "FAILED")
CLAIM_SOURCES = ("CV", "CONVERSATION", "MANUAL")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="UPLOADED")
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CVExtraction(Base):
    """Extracción de CV pendiente de confirmación (docs/04 §5.3, HU-C03/C05).

    `normalized_payload` guarda `experience`/`education`/`skills`/
    `certifications` ya en la forma del contrato HTTP (con `id` sintético por
    ítem, ver `cv_extraction_service.py`). `raw_payload` guarda la salida
    cruda del `AIPort` (`CVParseResult`/ensamblado del CV conversacional) tal
    cual, para auditoría/depuración — nunca se sirve directo al cliente.
    """

    __tablename__ = "cv_extractions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PARSED")
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    raw_payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    normalized_payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    contract_version: Mapped[str] = mapped_column(String(10), nullable=False, default="1.1")
    ai_invocation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_invocations.id"), nullable=True
    )
    confirmed_by_candidate: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Claim(Base):
    """Afirmación de habilidad/experiencia con trazabilidad a su origen (docs/04 §5.3)."""

    __tablename__ = "claims"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False, index=True
    )
    cv_extraction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cv_extractions.id"), nullable=True, index=True
    )
    source: Mapped[str] = mapped_column(String(20), nullable=False)
    skill_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    claimed_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    needs_validation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    source_ref: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
