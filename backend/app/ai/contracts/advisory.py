"""A4 Consejero de Desarrollo — `Feedback*` y `LearningPath*` (docs/05 §7 A4).

Operaciones 7 y 8 de las 9 de `AIPort` v1.1 (extensión v1.1, docs/05 §8).
"""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.ai.contracts.base import AIBaseModel, CandidateSnapshotForAI, ContractVersion
from app.ai.contracts.assessment import CompetencyScore


class FeedbackRequest(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    candidate_snapshot: CandidateSnapshotForAI
    evaluations: list[CompetencyScore]
    overall_label: str


class FeedbackResult(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    candidate_note: str = Field(min_length=1)
    company_note: str = Field(min_length=1)


class LearningCatalogEntryDTO(AIBaseModel):
    """Entrada real del catálogo (`learning_catalog`), inyectada por el backend.

    El agente **nunca inventa** un curso o una URL (docs/05 §7 A4): solo elige
    y prioriza entre las entradas que se le entregan aquí.
    """

    competency_code: str
    type: Literal["COURSE", "CERTIFICATION"]
    provider: str
    title: str
    estimated_effort: str
    source: Literal["CATALOG", "WEB"] = "CATALOG"
    url: str | None = None


class LearningRecommendationDTO(AIBaseModel):
    type: Literal["COURSE", "CERTIFICATION"]
    provider: str
    title: str
    estimated_effort: str
    source: Literal["CATALOG", "WEB"] = "CATALOG"
    url: str | None = None


class LearningGapDTO(AIBaseModel):
    competency_code: str
    competency_name: str
    current_level: int = Field(ge=0, le=4)
    target_level: int = Field(ge=0, le=4)
    why_it_matters: str
    recommendations: list[LearningRecommendationDTO] = Field(default_factory=list)


class LearningPathRequest(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    evaluations: list[CompetencyScore]
    catalog_entries: list[LearningCatalogEntryDTO] = Field(default_factory=list)


class LearningPathResult(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    gaps: list[LearningGapDTO] = Field(max_length=3)  # docs/05 §7 A4: máximo 3 brechas
