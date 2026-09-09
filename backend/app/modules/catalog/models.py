"""Modelos de catálogo: familias, competencias, skills, rúbricas y capacitación.

Fuente normativa de datos: `docs/build/02_API_CONTRACT.md` §2 (códigos exactos)
y `docs/04_Arquitectura_Tecnica_Backend.md` §5.2.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class JobFamily(Base):
    __tablename__ = "job_families"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    role_objective: Mapped[str] = mapped_column(Text, nullable=False)

    competencies: Mapped[list["Competency"]] = relationship(back_populates="job_family")


class Competency(Base):
    __tablename__ = "competencies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_family_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("job_families.id"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # TECHNICAL | BEHAVIORAL
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    is_core: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    job_family: Mapped[JobFamily] = relationship(back_populates="competencies")
    rubrics: Mapped[list["Rubric"]] = relationship(back_populates="competency")


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, default="")


class Rubric(Base):
    """`levels` es dato semilla versionado (docs/05 §6.1), no código.

    Insertar una rúbrica nueva o subir su versión no requiere redeploy.
    """

    __tablename__ = "rubrics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    competency_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("competencies.id"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    levels: Mapped[list] = mapped_column(JSONB, nullable=False)
    evidence_guidelines: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    competency: Mapped[Competency] = relationship(back_populates="rubrics")


class LearningCatalogEntry(Base):
    """Catálogo de capacitación (A4, `docs/build/02_API_CONTRACT.md` `LearningRecommendation`)."""

    __tablename__ = "learning_catalog"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    competency_code: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # COURSE | CERTIFICATION
    provider: Mapped[str] = mapped_column(String(120), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    estimated_effort: Mapped[str] = mapped_column(String(60), nullable=False)
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="CATALOG")  # CATALOG | WEB
    url: Mapped[str | None] = mapped_column(String(500), nullable=True)
