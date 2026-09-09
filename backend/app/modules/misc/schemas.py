"""Esquemas de los mocks P2 (`docs/build/02_API_CONTRACT.md` §3):
`Notification`, `MessageThread`, `Plan`."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class Notification(BaseModel):
    id: str
    title: str
    body: str
    created_at: datetime
    read: bool


class MessageThread(BaseModel):
    id: str
    counterpart: str
    last_message: str
    updated_at: datetime
    unread: int


class Plan(BaseModel):
    id: str
    name: str
    price_mxn: int
    features: list[str]
    highlighted: bool
