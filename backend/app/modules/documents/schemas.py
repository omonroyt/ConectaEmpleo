"""Esquemas Pydantic de `DocumentRef`, `CVExtraction` y `Claim` (`docs/build/02_API_CONTRACT.md` §3)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.modules.candidates.schemas import EducationItem, ExperienceItem

DocumentType = Literal["CV", "CERTIFICATION", "OTHER", "AUDIO_ANSWER"]
DocumentStatus = Literal["UPLOADED", "PROCESSING", "PARSED", "FAILED"]
ClaimSource = Literal["CV", "CONVERSATION", "MANUAL"]
ClaimedLevel = Literal[1, 2, 3, 4]


class DocumentRef(BaseModel):
    id: uuid.UUID
    type: DocumentType
    original_filename: str
    mime_type: str
    size_bytes: int
    status: DocumentStatus
    uploaded_at: datetime
    url: str | None


class SourceRef(BaseModel):
    excerpt: str | None = None
    page: int | None = None
    turn: int | None = None


class Claim(BaseModel):
    id: uuid.UUID
    source: ClaimSource
    skill_code: str | None
    statement: str
    claimed_level: ClaimedLevel | None
    needs_validation: bool
    source_ref: SourceRef | None


class ExtractionSkill(BaseModel):
    code: str
    name: str
    level: ClaimedLevel | None = None


class ExtractionCertification(BaseModel):
    name: str
    issuer: str | None = None
    year: int | None = None


class CVExtraction(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID | None
    status: DocumentStatus
    confidence: float
    experience: list[ExperienceItem]
    education: list[EducationItem]
    skills: list[ExtractionSkill]
    certifications: list[ExtractionCertification]
    claims: list[Claim]
    confirmed_by_candidate: bool
    confirmed_at: datetime | None


class CVExtractionPatch(BaseModel):
    """`Partial<Pick<CVExtraction, ...>>` del contrato — todo opcional a propósito."""

    experience: list[ExperienceItem] | None = None
    education: list[EducationItem] | None = None
    skills: list[ExtractionSkill] | None = None
    certifications: list[ExtractionCertification] | None = None
    claims: list[Claim] | None = None
