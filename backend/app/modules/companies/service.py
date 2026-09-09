"""Servicios de dominio para empresa. En B1-B2 solo se crea el registro vacío."""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.modules.companies.models import Company


def create_empty_company(db: Session, *, user_id: uuid.UUID) -> Company:
    company = Company(
        user_id=user_id,
        legal_name="",
        trade_name="",
        industry="",
        verification_status="UNVERIFIED",
    )
    db.add(company)
    return company
