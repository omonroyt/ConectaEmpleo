"""Esquemas de `GET /admin/ai-invocations` (B13): lectura de bitácora de
`ai_invocations` para depurar la demo en vivo sin abrir la base."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict


class AIInvocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    operation: str
    contract_version: str
    prompt_version: str
    adapter: str
    provider: str | None
    model: str | None
    latency_ms: int
    tokens_in: int | None
    tokens_out: int | None
    retries: int
    status: str
    error: str | None
    created_at: datetime


T = TypeVar("T")


class Paginated(BaseModel, Generic[T]):
    items: list[T]
    total: int
