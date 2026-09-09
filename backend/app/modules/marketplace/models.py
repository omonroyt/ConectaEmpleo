"""Modelos `candidate_unlocks` (docs/04 §5.7) y `applications` (D-07, aditiva).

**`candidate_unlocks`** (docs/04 §5.7, HU-M04): la **presencia de la fila** es
lo que hace visible la identidad de un candidato para una empresa en el
contexto de una vacante -- no hay una bandera `is_unlocked` mutable en
`candidate_profiles` que un bug pudiera dejar prendida para todo el mundo.
Único por `(company_id, candidate_id, vacancy_id)`: si la empresa vuelve a
correr el match y el candidato aparece en un `match_result` nuevo, el
desbloqueo ya hecho sigue siendo válido (se busca por esta terna, no por
`source_match_result_id`) -- `source_match_result_id` solo queda como
auditoría de **cuál** resultado disparó el primer desbloqueo.

**`applications`**: no está en el listado literal de `docs/04 §5.7` (esa
sección es anterior al marketplace de candidato, D-07 en
`docs/build/00_BUILD_STATE.md`), pero es la tabla mínima que exige el
contrato (`Application` — `docs/build/02_API_CONTRACT.md` §3,
`POST /vacancies/{id}/apply` / `GET /candidates/me/applications`). Única por
`(candidate_id, vacancy_id)`: postularse dos veces a la misma vacante no crea
una segunda fila.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

APPLICATION_STATUSES = ("APPLIED", "VIEWED", "SHORTLISTED", "CLOSED")


class CandidateUnlock(Base):
    __tablename__ = "candidate_unlocks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False, index=True
    )
    vacancy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vacancies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    source_match_result_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("match_results.id"), nullable=True
    )

    __table_args__ = (
        UniqueConstraint("company_id", "candidate_id", "vacancy_id", name="uq_unlock_company_candidate_vacancy"),
    )


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False, index=True
    )
    vacancy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vacancies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="APPLIED")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("candidate_id", "vacancy_id", name="uq_application_candidate_vacancy"),)
