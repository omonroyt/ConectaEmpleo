"""A1 Perfilador — `CVParse*` (modo EXTRACT) y `CVConversation*` (modo BUILD).

docs/05 §7 A1. Operaciones 1 y 2 de las 9 de `AIPort` v1.1.
"""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.ai.contracts.base import (
    AIBaseModel,
    ClaimDTO,
    ContractVersion,
    EducationItemDTO,
    ExperienceItemDTO,
)


class SkillClaimDTO(AIBaseModel):
    code: str
    name: str
    level: int | None = Field(default=None, ge=1, le=4)


class CertificationDTO(AIBaseModel):
    name: str
    issuer: str | None = None
    year: int | None = None


# --- Operación 1: parse_cv (modo EXTRACT) ---


class CVParseRequest(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    document_id: str
    job_family_code: str | None = None
    document_text: str = Field(min_length=1)


class CVParseResult(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    status: Literal["PARSED", "FAILED"]
    confidence: float = Field(ge=0, le=1)
    experience: list[ExperienceItemDTO] = Field(default_factory=list)
    education: list[EducationItemDTO] = Field(default_factory=list)
    skills: list[SkillClaimDTO] = Field(default_factory=list)
    certifications: list[CertificationDTO] = Field(default_factory=list)
    claims: list[ClaimDTO] = Field(default_factory=list)


# --- Operación 2: build_cv_conversationally (modo BUILD) ---


class CVConversationRequest(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    job_family_code: str | None = None
    turn_index: int = Field(ge=0)
    max_turns: int = Field(ge=1)
    last_answer: str | None = None
    answers_so_far: dict[str, str] = Field(default_factory=dict)


class CVConversationResult(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    agent_message: str
    field_captured: str | None = None
    captured_value: str | None = None
    done: bool = False
