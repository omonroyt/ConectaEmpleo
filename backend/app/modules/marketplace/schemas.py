"""Esquemas Pydantic de B10 — marketplace, anonimización y desbloqueo.

`docs/build/02_API_CONTRACT.md` §3: `AnonymousCandidateCard`,
`UnlockedCandidateProfile`, `CompareView`, `ShortlistEntry`, `Opportunity`,
`Application`.

**Anonimización estructural (docs/04 §8, I-05, RB-05)**: `AnonymousCandidateCard`
y `UnlockedCandidateProfile` son dos clases Pydantic **distintas**, la segunda
extiende a la primera agregando campos -- no hay un solo modelo con
`full_name: str | None` condicional. `AnonymousCandidateCard` no declara (ni
puede devolver por accidente) `full_name`, `photo_url`, `birth_date` ni
`gender`; son literalmente atributos que la clase no tiene. Ver
`tests/test_matching_privacy.py`.

D-02 (`docs/build/00_BUILD_STATE.md`): `UnlockedCandidateProfile.unlocked_at`
resuelto aquí -- viene de la fila real de `candidate_unlocks`.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.modules.assessments.schemas import CandidateSkill, TalentProfile
from app.modules.candidates.schemas import Availability, EducationItem, ExperienceItem
from app.modules.catalog.schemas import JobFamilyCode
from app.modules.documents.schemas import DocumentRef
from app.modules.matching.schemas import BreakdownItem, Penalty
from app.modules.vacancies.schemas import Location, VacancyRequirement, WorkMode

GeoBand = Literal["SAME_CITY", "UNDER_30KM", "UNDER_80KM", "FAR"]
ShortlistStage = Literal["REVIEW", "INTERVIEW", "FINALIST"]
ApplicationStatus = Literal["APPLIED", "VIEWED", "SHORTLISTED", "CLOSED"]


class AnonymousCandidateCard(BaseModel):
    match_result_id: uuid.UUID
    anon_code: str
    job_family_code: JobFamilyCode
    rank_position: int
    total_score: int
    score_label: str
    breakdown: list[BreakdownItem]
    penalties: list[Penalty]
    strengths: list[str]
    gaps: list[str]
    skills: list[CandidateSkill]
    evidence_counts: dict[str, int]
    years_experience: int
    availability: Availability
    geo_band: GeoBand
    salary_band: str
    explanation_text: str | None
    shortlist_stage: ShortlistStage | None
    is_unlocked: bool


class UnlockedCandidateProfile(AnonymousCandidateCard):
    candidate_id: uuid.UUID
    full_name: str
    email: str
    phone: str | None
    photo_url: str | None
    location: Location
    experience: list[ExperienceItem]
    education: list[EducationItem]
    documents: list[DocumentRef]
    talent_profile: TalentProfile
    company_note: str | None
    #: D-02: la fecha real de `candidate_unlocks.unlocked_at`.
    unlocked_at: datetime


class CompareCriterion(BaseModel):
    key: str
    label: str


class CompareView(BaseModel):
    criteria: list[CompareCriterion]
    candidates: list[AnonymousCandidateCard]
    key_differences: list[str]


class ShortlistEntry(BaseModel):
    match_result_id: uuid.UUID
    anon_code: str
    stage: ShortlistStage
    is_unlocked: bool
    total_score: int
    added_at: datetime


class ShortlistStageInput(BaseModel):
    stage: ShortlistStage | None  # null = quitar de la selección


# ---------------------------------------------------------------------------
# Marketplace del candidato (D-07)
# ---------------------------------------------------------------------------


class Opportunity(BaseModel):
    vacancy_id: uuid.UUID
    title: str
    company_trade_name: str
    company_verified: bool
    location: Location | None
    work_mode: WorkMode
    salary_min: int | None
    salary_max: int | None
    job_family_code: JobFamilyCode
    compatibility: int | None
    compatibility_label: str | None
    why_fit: list[str]
    missing_evidence: list[str]
    requirements: list[VacancyRequirement]
    description: str
    applied: bool


class Application(BaseModel):
    id: uuid.UUID
    vacancy_id: uuid.UUID
    status: ApplicationStatus
    created_at: datetime
