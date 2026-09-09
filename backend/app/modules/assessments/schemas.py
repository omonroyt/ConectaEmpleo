"""Esquemas Pydantic de evaluación y perfil de talento (`docs/build/02_API_CONTRACT.md`
§3, extendidos con los campos aditivos de `docs/build/06_INTERVIEW_SYSTEM.md` §7)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

CompetencyType = Literal["TECHNICAL", "BEHAVIORAL"]
RubricSource = Literal["SPECIFIC", "PROVISIONAL", "BASELINE"]
Coverage = Literal["FULL", "PARTIAL"]
Severity = Literal["low", "medium", "high"]


class CompetencyEvaluation(BaseModel):
    competency_code: str
    competency_name: str
    type: CompetencyType
    score: int = Field(ge=0, le=100)
    rubric_level: int = Field(ge=0, le=4)
    confidence: float = Field(ge=0, le=1)
    justification: str
    evidence_turn_ids: list[str]
    limitations: str | None
    rubric_source: RubricSource
    # Aditivo docs/build/06 §7: trazabilidad pregunta <-> evaluación.
    question_id: str | None = None


class CandidateSkill(BaseModel):
    skill_code: str
    skill_name: str
    is_declared: bool
    is_evaluated: bool
    is_verified: bool
    evaluated_score: int | None
    confidence: float | None
    evidence_summary: str | None


class RiskFlag(BaseModel):
    """Master prompt §18: evidencia, nunca una decisión automática."""

    code: str
    severity: Severity
    question_id: str | None
    description: str


class Inconsistency(BaseModel):
    claim: str
    observed_evidence: str
    severity: Severity


class TalentProfile(BaseModel):
    id: uuid.UUID
    version: int
    generated_at: datetime
    overall_score: int = Field(ge=0, le=100)
    overall_label: str
    top_skills: list[CandidateSkill]
    evaluations: list[CompetencyEvaluation]
    strengths: list[str]
    evidence_gaps: list[str]
    summary_text: str
    # --- Aditivos docs/build/06 §7 ---
    hard_skills_score: int = Field(ge=0, le=100)
    soft_skills_score: int = Field(ge=0, le=100)
    interview_score: int = Field(ge=0, le=100)
    coverage: Coverage
    risk_flags: list[RiskFlag] = Field(default_factory=list)
    inconsistencies: list[Inconsistency] = Field(default_factory=list)


class FeedbackReport(BaseModel):
    candidate_note: str
    company_note: str
    generated_at: datetime


class LearningRecommendation(BaseModel):
    type: Literal["COURSE", "CERTIFICATION"]
    provider: str
    title: str
    estimated_effort: str
    source: Literal["CATALOG", "WEB"]
    url: str | None


class LearningGap(BaseModel):
    competency_code: str
    competency_name: str
    current_level: int
    target_level: int
    why_it_matters: str
    recommendations: list[LearningRecommendation]


class LearningPath(BaseModel):
    gaps: list[LearningGap]
