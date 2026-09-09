"""Esquemas del CV conversacional (`docs/build/02_API_CONTRACT.md` §3, A1 modo BUILD)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.modules.documents.schemas import CVExtractionPatch

CVBuilderSessionStatus = Literal["ACTIVE", "FINALIZED"]
CVBuilderMessageRole = Literal["agent", "candidate"]


class CVBuilderSession(BaseModel):
    id: uuid.UUID
    status: CVBuilderSessionStatus
    turn: int
    max_turns: int
    draft: CVExtractionPatch


class CVBuilderMessage(BaseModel):
    id: uuid.UUID
    role: CVBuilderMessageRole
    text: str
    created_at: datetime


class CVBuilderReply(BaseModel):
    session: CVBuilderSession
    agent_message: CVBuilderMessage
    done: bool


class CVDocument(BaseModel):
    id: uuid.UUID
    url: str
    generated_at: datetime


class SendMessageInput(BaseModel):
    text: str
