"""Esquemas Pydantic v2 de `CandidateProfile` (`docs/build/02_API_CONTRACT.md` §3)."""

from __future__ import annotations

import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

CandidateStatus = Literal["DRAFT", "CV_READY", "INTERVIEWING", "PENDING_EVALUATION", "EVALUATED"]
Availability = Literal["IMMEDIATE", "TWO_WEEKS", "ONE_MONTH"]
NextStep = Literal["ONBOARDING", "CV", "REVIEW_CLAIMS", "INTERVIEW", "WAITING_EVALUATION", "DONE"]


class Location(BaseModel):
    city: str
    state: str


class ExperienceItem(BaseModel):
    id: str
    company: str
    position: str
    start_date: str
    end_date: str | None = None
    is_current: bool = False
    description: str = ""
    skills: list[str] = Field(default_factory=list)


class EducationItem(BaseModel):
    id: str
    institution: str
    degree: str
    start_year: int
    end_year: int | None = None


class CandidateProfile(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    phone: str | None
    photo_url: str | None
    birth_date: date | None
    gender: str | None
    job_family_id: uuid.UUID | None
    location: Location | None
    availability: Availability | None
    salary_expectation_min: int | None
    salary_expectation_max: int | None
    education: list[EducationItem]
    experience: list[ExperienceItem]
    bio: str | None
    status: CandidateStatus
    anon_code: str
    completion_percent: int


class CandidateProfilePatch(BaseModel):
    """`Partial<Pick<CandidateProfile, ...>>` del contrato — todo opcional a propósito."""

    full_name: str | None = None
    phone: str | None = None
    photo_url: str | None = None
    birth_date: date | None = None
    gender: str | None = None
    location: Location | None = None
    availability: Availability | None = None
    salary_expectation_min: int | None = None
    salary_expectation_max: int | None = None
    education: list[EducationItem] | None = None
    experience: list[ExperienceItem] | None = None
    bio: str | None = None


class JobFamilySelection(BaseModel):
    job_family_id: uuid.UUID


class CandidateStatusView(BaseModel):
    status: CandidateStatus
    next_step: NextStep
    interview_session_id: uuid.UUID | None
    has_talent_profile: bool
