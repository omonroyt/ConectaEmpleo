"""Modelo `companies` (docs/04 §5.1)."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

DEFAULT_VERIFICATION_STATUS = "UNVERIFIED"


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False, index=True
    )

    legal_name: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    trade_name: Mapped[str] = mapped_column(String(300), nullable=False, default="")
    industry: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    size: Mapped[str | None] = mapped_column(String(10), nullable=True)  # 1-10 | 11-50 | 51-200 | 200+

    location_city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    location_state: Mapped[str | None] = mapped_column(String(120), nullable=True)
    work_mode: Mapped[str | None] = mapped_column(String(20), nullable=True)  # ONSITE | HYBRID | REMOTE

    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    verification_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=DEFAULT_VERIFICATION_STATUS
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
