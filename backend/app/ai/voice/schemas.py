"""Esquemas HTTP del router de voz (docs/build/02_API_CONTRACT.md, ampliado en B12).

Estos tipos son del **transporte HTTP** (`router.py`), distintos de
`ports.py` (contrato interno STT/TTS) — misma separación que ya existe entre
`app/modules/*/schemas.py` y `app/ai/contracts/*.py` en el resto del backend.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Persona = Literal["profiler", "interviewer"]


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    persona: Persona
    turn_id: str | None = None


class VoiceQuota(BaseModel):
    characters_used: int
    character_budget: int
    threshold_pct: float
    budget_used_pct: float
    voice_available: bool
    reason: str | None = None


class STTResponse(BaseModel):
    status: Literal["OK", "TRANSCRIPTION_FAILED"]
    transcript: str
    message: str | None = None
