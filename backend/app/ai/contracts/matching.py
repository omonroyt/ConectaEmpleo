"""A5 Analista de Compatibilidad — `RequirementResolution*` y `MatchExplanation*`.

docs/05 §7 A5. Operaciones 6 y 9 de las 9 de `AIPort` v1.1. El agente **nunca**
calcula un porcentaje (I-07): `explain_match` redacta prosa sobre un
`breakdown` ya calculado por el motor determinista (B9, futuro).
"""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.ai.contracts.base import AIBaseModel, ContractVersion

MatchComponent = Literal["TECHNICAL", "BEHAVIORAL", "EXPERIENCE", "EVIDENCE", "SALARY", "LOCATION"]


class BreakdownItemDTO(AIBaseModel):
    component: MatchComponent
    weight: float
    raw: float
    contribution: float


class PenaltyDTO(AIBaseModel):
    reason: Literal["MANDATORY_UNMET", "SALARY_OUT_OF_RANGE", "LOCATION_FAR"]
    requirement: str
    points: float


# --- Operación 6: explain_match ---


class MatchExplanationRequest(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    total_score: int = Field(ge=0, le=100)
    next_best_score: int | None = Field(default=None, ge=0, le=100)
    breakdown: list[BreakdownItemDTO]
    penalties: list[PenaltyDTO] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)


class MatchExplanationResult(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    explanation_text: str = Field(min_length=1, max_length=1200)  # ~120 palabras


# --- Operación 9: resolve_vacancy_requirements ---


class CatalogCompetencyRefDTO(AIBaseModel):
    code: str
    name: str
    type: Literal["TECHNICAL", "BEHAVIORAL"]


class CatalogSkillRefDTO(AIBaseModel):
    code: str
    name: str


class RequirementResolutionRequest(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    job_family_code: str
    free_text: str = Field(min_length=1)
    catalog_competencies: list[CatalogCompetencyRefDTO] = Field(default_factory=list)
    catalog_skills: list[CatalogSkillRefDTO] = Field(default_factory=list)


class RequirementInputDTO(AIBaseModel):
    competency_code: str | None = None
    skill_code: str | None = None
    label: str
    kind: Literal["MANDATORY", "DESIRABLE"]
    min_level: int = Field(ge=1, le=4)
    weight: float = Field(ge=0, le=100)


class RequirementWarningDTO(AIBaseModel):
    text: str
    reason: str


class RequirementResolutionResult(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    mapped: list[RequirementInputDTO] = Field(default_factory=list)
    unmapped: list[str] = Field(default_factory=list)
    warnings: list[RequirementWarningDTO] = Field(default_factory=list)
    suggested_weights: dict[str, int] = Field(default_factory=dict)
