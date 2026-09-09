"""Modelo `ai_invocations` (docs/04 §5.8) — bitácora de toda llamada a `AIPort`.

Cada fila que produce `app/ai/invoke.py` (éxito o falla) queda aquí: operación,
versión de contrato y de prompt, adaptador, modelo, digest de entrada, salida
cruda, latencia, tokens y estado. Es el registro que permite depurar la demo
en vivo (`GET /admin/ai-invocations`, B13) sin abrir la base directamente.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AIInvocation(Base):
    __tablename__ = "ai_invocations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    operation: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    contract_version: Mapped[str] = mapped_column(String(10), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(20), nullable=False, default="n/a")
    adapter: Mapped[str] = mapped_column(String(20), nullable=False)  # deterministic | agentic
    provider: Mapped[str | None] = mapped_column(String(30), nullable=True)  # anthropic | openai | None
    model: Mapped[str | None] = mapped_column(String(60), nullable=True)

    input_digest: Mapped[str] = mapped_column(String(64), nullable=False)  # sha256 del request serializado
    raw_output: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tokens_in: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tokens_out: Mapped[int | None] = mapped_column(Integer, nullable=True)
    retries: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    status: Mapped[str] = mapped_column(String(20), nullable=False)  # SUCCESS | VALIDATION_FAILED | PROVIDER_FAILED
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
