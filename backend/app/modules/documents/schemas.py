"""Esquemas Pydantic de `DocumentRef` (`docs/build/02_API_CONTRACT.md` §3)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel

DocumentType = Literal["CV", "CERTIFICATION", "OTHER", "AUDIO_ANSWER"]
DocumentStatus = Literal["UPLOADED", "PROCESSING", "PARSED", "FAILED"]


class DocumentRef(BaseModel):
    id: uuid.UUID
    type: DocumentType
    original_filename: str
    mime_type: str
    size_bytes: int
    status: DocumentStatus
    uploaded_at: datetime
    url: str | None
