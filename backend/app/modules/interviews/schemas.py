"""Esquemas Pydantic de entrevista (`docs/build/02_API_CONTRACT.md` §3, §4).

Campos aditivos de `docs/build/06_INTERVIEW_SYSTEM.md` §7 en `InterviewTurn`
(`question_id`, `is_follow_up`, `block`) — no rompen nada del frontend ya
construido (aditivo puro, campos nuevos con default seguro).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

InterviewStatus = Literal["PENDING", "IN_PROGRESS", "COMPLETED", "ABANDONED"]
InterviewMode = Literal["VOICE", "TEXT"]
QuestionIntent = Literal["PROBE", "SCENARIO", "CLARIFY", "SWITCH"]
CoverageStatus = Literal["UNTOUCHED", "PARTIAL", "SUFFICIENT"]
FinishReason = Literal["BUDGET_EXHAUSTED", "COVERAGE_SUFFICIENT", "AGENT_FINISH"]


class InterviewSession(BaseModel):
    id: uuid.UUID
    status: InterviewStatus
    mode: InterviewMode
    question_budget: int
    questions_asked: int
    coverage_state: dict = Field(default_factory=dict)
    started_at: datetime | None
    completed_at: datetime | None


class InterviewTurn(BaseModel):
    id: uuid.UUID
    sequence: int
    question_text: str
    target_competency_code: str
    question_intent: QuestionIntent
    references_turn_id: uuid.UUID | None
    answer_text: str | None
    answer_received_at: datetime | None
    audio_url: str | None = None
    # --- Aditivos docs/build/06 §7 ---
    question_id: str | None = None
    is_follow_up: bool = False
    block: Literal["HARD", "SOFT"] | None = None


class NextQuestion(BaseModel):
    turn: InterviewTurn | None
    finished: bool
    finish_reason: FinishReason | None
    progress: dict[str, int]


class AnswerInput(BaseModel):
    answer_text: str = Field(min_length=1)
    mode: InterviewMode = "TEXT"


class InterviewProgress(BaseModel):
    asked: int
    budget: int
    percent: int
    coverage: dict[str, CoverageStatus]


class CreateInterviewInput(BaseModel):
    mode: InterviewMode = "TEXT"
