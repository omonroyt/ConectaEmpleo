"""Esquemas Pydantic de matching (`docs/build/02_API_CONTRACT.md` §3)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel

MatchComponentType = Literal["TECHNICAL", "BEHAVIORAL", "EXPERIENCE", "EVIDENCE", "SALARY", "LOCATION"]
PenaltyReason = Literal["MANDATORY_UNMET", "SALARY_OUT_OF_RANGE", "LOCATION_FAR"]


class BreakdownItem(BaseModel):
    component: MatchComponentType
    weight: float
    raw: float
    contribution: float


class Penalty(BaseModel):
    reason: PenaltyReason
    requirement: str
    points: float


class MatchRun(BaseModel):
    id: uuid.UUID
    vacancy_id: uuid.UUID
    executed_at: datetime
    algorithm_version: str
    candidates_evaluated: int


T = TypeVar("T")


class Paginated(BaseModel, Generic[T]):
    items: list[T]
    total: int
