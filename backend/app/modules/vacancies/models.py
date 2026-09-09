"""Modelos `vacancies` / `vacancy_requirements` (docs/04 §5.6).

**Desviación aditiva respecto al listado literal de columnas de docs/04 §5.6**:
esa sección no menciona dónde vive `VacancyWeights` (los seis componentes del
match, `docs/build/02_API_CONTRACT.md` §3), pero el contrato exige que
`Vacancy.weights` exista y que `PUT /vacancies/{id}/weights` lo persista
normalizado (RB-07) para que un match viejo siga siendo explicable. Se agrega
como columna `weights (jsonb)` en `vacancies` — igual que hace
`frontend/src/api/mock/index.ts` (guarda `vacancy.weights` directo en el
objeto de la vacante) — en vez de una tabla aparte, porque siempre son
exactamente los mismos seis componentes fijos, nunca una colección variable.
Anotado en la bitácora de `docs/build/00_BUILD_STATE.md`.

`weight` en `vacancy_requirements` se modela como `Integer`, no `Numeric`
como sugiere la prosa de docs/04 ("weight (decimal)"): RB-07 siempre redondea
a enteros (mismo algoritmo que `normalizeWeights`/`normalizeRequirementWeights`
del mock), así que un tipo decimal no aporta precisión real y complica la
serialización JSON sin necesidad.

D-04 (`docs/build/00_BUILD_STATE.md`): **no se agrega `work_schedule`**. Se
retira del alcance — ver el docstring de `VacancyInput` en `schemas.py`.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

#: Pesos por defecto del matching (`docs/build/02_API_CONTRACT.md` §2), duplicado
#: a propósito respecto a `app/ai/adapters/deterministic.py::DEFAULT_WEIGHTS`
#: (mismo motivo documentado ahí: uno es dato semilla de dominio, el otro es la
#: sugerencia que devuelve A5 RESOLVE).
DEFAULT_WEIGHTS: dict[str, int] = {
    "TECHNICAL": 40,
    "BEHAVIORAL": 20,
    "EXPERIENCE": 15,
    "EVIDENCE": 10,
    "SALARY": 8,
    "LOCATION": 7,
}


class Vacancy(Base):
    __tablename__ = "vacancies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True
    )
    job_family_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("job_families.id"), nullable=False, index=True
    )

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")

    location_city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    location_state: Mapped[str | None] = mapped_column(String(120), nullable=True)
    work_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="ONSITE")

    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    positions_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT")
    weights: Mapped[dict] = mapped_column(JSONB, nullable=False, default=lambda: dict(DEFAULT_WEIGHTS))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    requirements: Mapped[list["VacancyRequirement"]] = relationship(
        back_populates="vacancy", cascade="all, delete-orphan", order_by="VacancyRequirement.created_at"
    )


class VacancyRequirement(Base):
    __tablename__ = "vacancy_requirements"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vacancy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vacancies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    competency_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("competencies.id"), nullable=True
    )
    skill_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("skills.id"), nullable=True)

    label: Mapped[str] = mapped_column(String(300), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)  # MANDATORY | DESIRABLE
    min_level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    weight: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    vacancy: Mapped[Vacancy] = relationship(back_populates="requirements")
