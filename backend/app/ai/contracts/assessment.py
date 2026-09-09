"""A3 Evaluador — `Evaluation*` / `CompetencyScore` y `TalentProfile*`.

docs/05 §7 A3, docs/04 §6.2 y §6.3 (invariantes I-02, I-03, I-04). Operaciones
4 y 5 de las 9 de `AIPort` v1.1.

Las validaciones de este archivo son las que hacen cumplir I-04 en código: un
`score` fuera de 0-100 o un `rubric_level` fuera de 0-4 lanzan
`pydantic.ValidationError` al construir el modelo — nunca se recortan (clamp)
silenciosamente. Ver `tests/test_ai_contracts.py::test_score_out_of_range_is_rejected_not_clamped`.
"""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.ai.contracts.base import (
    AIBaseModel,
    CandidateSnapshotForAI,
    ClaimDTO,
    ContractVersion,
    RubricSource,
    RubricSpec,
    TurnDTO,
)


class CompetencyScore(AIBaseModel):
    competency_code: str
    competency_name: str
    type: Literal["TECHNICAL", "BEHAVIORAL"]
    rubric_version: int
    rubric_source: RubricSource
    score: int = Field(ge=0, le=100)  # I-04: fuera de rango => ValidationError, nunca clamp
    rubric_level: int = Field(ge=0, le=4)
    confidence: float = Field(ge=0, le=1)
    justification: str = Field(min_length=20)
    evidence_turn_ids: list[str] = Field(min_length=1)  # obliga a citar evidencia (I-02 se valida en el service)
    limitations: str | None = None


# --- Operación 4: evaluate_competencies ---


class EvaluationRequest(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    session_id: str
    job_family_code: str
    transcript: list[TurnDTO]
    rubrics: list[RubricSpec]
    claims: list[ClaimDTO] = Field(default_factory=list)


class EvaluationResult(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    evaluations: list[CompetencyScore] = Field(min_length=1)


# --- Operación 5: build_talent_profile ---


class CandidateSkillDTO(AIBaseModel):
    skill_code: str
    skill_name: str
    is_declared: bool = False
    is_evaluated: bool = False
    evaluated_score: int | None = Field(default=None, ge=0, le=100)
    confidence: float | None = Field(default=None, ge=0, le=1)
    evidence_summary: str | None = None


class TalentProfileRequest(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    candidate_snapshot: CandidateSnapshotForAI
    evaluations: list[CompetencyScore]
    claims: list[ClaimDTO] = Field(default_factory=list)


class TalentProfileResult(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    overall_score: int = Field(ge=0, le=100)
    overall_label: str
    top_skills: list[CandidateSkillDTO] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    evidence_gaps: list[str] = Field(default_factory=list)
    summary_text: str = Field(min_length=1)
