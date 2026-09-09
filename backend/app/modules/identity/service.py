"""Lógica de registro y login."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import EmailAlreadyExistsError, InvalidCredentialsError
from app.core.security import hash_password, verify_password
from app.modules.candidates.service import create_empty_profile
from app.modules.companies.service import create_empty_company
from app.modules.identity.models import User
from app.modules.identity.schemas import RegisterInput


def register_user(db: Session, data: RegisterInput) -> User:
    existing = db.execute(select(User).where(User.email == data.email)).scalar_one_or_none()
    if existing is not None:
        raise EmailAlreadyExistsError()

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
        is_active=True,
    )
    db.add(user)
    db.flush()  # asigna user.id sin cerrar la transacción

    if data.role == "CANDIDATE":
        create_empty_profile(db, user_id=user.id)
    elif data.role == "COMPANY":
        create_empty_company(db, user_id=user.id)

    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, *, email: str, password: str) -> User:
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise InvalidCredentialsError()
    return user
