"""`tts_usage_events` — contador persistido de caracteres sintetizados.

Decisión de la tarea B12 (sección B, "elige y documenta"): **tabla propia**,
no `ai_invocations`. `ai_invocations` (docs/04 §5.8) modela una invocación al
`AIPort` de texto — exige `contract_version`, `prompt_version`, `adapter`
(`deterministic`/`agentic`) e `input_digest`, ninguno de los cuales tiene un
significado natural para "cuántos caracteres le mandamos a Flash v2.5". Forzar
la voz dentro de ese esquema habría significado columnas siempre nulas o con
valores inventados solo para satisfacer NOT NULL — justo el tipo de
acoplamiento fortuito que docs/05 evita separando puertos de voz de `AIPort`.

Una fila por intento de síntesis (éxito o fallo), igual que `ai_invocations`
registra éxito y fallo (docs/05 §8): permite auditar picos de consumo y
depurar la demo sin abrir la base directamente. El presupuesto (`quota.py`)
solo suma las filas `SUCCESS` — un intento fallido no llegó a sintetizar
audio, así que ElevenLabs no lo factura.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

TTS_USAGE_STATUSES = ("SUCCESS", "PROVIDER_FAILED")


class TTSUsageEvent(Base):
    __tablename__ = "tts_usage_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    characters: Mapped[int] = mapped_column(Integer, nullable=False)
    persona: Mapped[str] = mapped_column(String(20), nullable=False)  # "profiler" | "interviewer"
    voice_id: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # SUCCESS | PROVIDER_FAILED
    turn_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
