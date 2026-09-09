"""A2 Entrevistador — `InterviewTurn*` (docs/05 §7 A2, docs/04 §6.2).

Operación 3 de las 9 de `AIPort` v1.1. El agente **no califica** — solo decide
la siguiente acción de la entrevista.
"""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.ai.contracts.base import (
    AIBaseModel,
    CandidateSnapshotForAI,
    ClaimDTO,
    ContractVersion,
    CoverageStatus,
    QuestionIntent,
    RubricSpec,
    TurnDTO,
)

InterviewAction = Literal["ASK", "PROBE", "SWITCH_COMPETENCY", "FINISH"]


class InterviewTurnRequest(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    session_id: str
    job_family_code: str
    candidate_snapshot: CandidateSnapshotForAI
    rubrics: list[RubricSpec]
    claims: list[ClaimDTO] = Field(default_factory=list)
    history: list[TurnDTO] = Field(default_factory=list)
    coverage_state: dict[str, CoverageStatus] = Field(default_factory=dict)
    remaining_questions: int = Field(ge=0)


class InterviewTurnResult(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    action: InterviewAction
    question_text: str | None = None
    target_competency_code: str | None = None
    question_intent: QuestionIntent | None = None
    references_turn_id: str | None = None
    rationale: str = Field(min_length=1)
    coverage_update: dict[str, CoverageStatus] = Field(default_factory=dict)
