"""Esquemas Pydantic v2 de vacantes (`docs/build/02_API_CONTRACT.md` §3)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

RequirementKind = Literal["MANDATORY", "DESIRABLE"]
WorkMode = Literal["ONSITE", "HYBRID", "REMOTE"]
VacancyStatus = Literal["DRAFT", "OPEN", "CLOSED"]
Level = Literal[1, 2, 3, 4]

#: Orden fijo de los seis componentes (`MatchComponent` del contrato). Se usa
#: tanto para serializar `VacancyWeights` como para la normalización RB-07 —
#: el último componente en este orden es el que absorbe el residuo de
#: redondeo, así que el orden debe ser estable entre llamadas.
WEIGHT_COMPONENTS: tuple[str, ...] = ("TECHNICAL", "BEHAVIORAL", "EXPERIENCE", "EVIDENCE", "SALARY", "LOCATION")


class Location(BaseModel):
    city: str
    state: str


class VacancyWeights(BaseModel):
    TECHNICAL: float
    BEHAVIORAL: float
    EXPERIENCE: float
    EVIDENCE: float
    SALARY: float
    LOCATION: float


class VacancyRequirement(BaseModel):
    id: uuid.UUID
    competency_code: str | None
    skill_code: str | None
    label: str
    kind: RequirementKind
    min_level: Level
    weight: float


class Vacancy(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    job_family_id: uuid.UUID
    title: str
    description: str
    location: Location | None
    work_mode: WorkMode
    salary_min: int | None
    salary_max: int | None
    positions_count: int
    status: VacancyStatus
    created_at: datetime
    requirements: list[VacancyRequirement]
    weights: VacancyWeights
    last_match_run_id: uuid.UUID | None
    shortlist_count: int


class VacancyInput(BaseModel):
    """`docs/build/02_API_CONTRACT.md` §3.

    D-04: **no incluye `work_schedule`** (tipo de jornada). Se decidió
    retirarlo del alcance en vez de agregarlo: ningún archivo del frontend ya
    construido (`frontend/src/features/employer/vacancies/*`) lo referencia —
    F6 lo omitió de la UI "por no tener dónde persistirlo" (bitácora de F6),
    así que agregarlo hoy no habilitaría ninguna pantalla existente y sería
    alcance especulativo. Si una vacante futura necesita distinguir
    jornada completa/parcial, es un campo aditivo sobre este mismo modelo.
    """

    job_family_id: uuid.UUID
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    location: Location | None = None
    work_mode: WorkMode = "ONSITE"
    salary_min: int | None = None
    salary_max: int | None = None
    positions_count: int = Field(default=1, ge=1)


class VacancyPatch(BaseModel):
    """`Partial<VacancyInput> & {status?}` del contrato (`vacancies.update`)."""

    job_family_id: uuid.UUID | None = None
    title: str | None = None
    description: str | None = None
    location: Location | None = None
    work_mode: WorkMode | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    positions_count: int | None = None
    status: VacancyStatus | None = None


class RequirementInput(BaseModel):
    competency_code: str | None = None
    skill_code: str | None = None
    label: str
    kind: RequirementKind
    min_level: Level
    weight: float = 0


class RequirementWarning(BaseModel):
    text: str
    reason: str


class RequirementResolution(BaseModel):
    mapped: list[RequirementInput]
    unmapped: list[str]
    warnings: list[RequirementWarning]
    suggested_weights: VacancyWeights
