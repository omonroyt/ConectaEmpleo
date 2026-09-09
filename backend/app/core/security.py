"""Hashing de contraseñas, JWT y dependencias de autorización por rol.

`role` viaja en el claim del JWT (docs/build/02_API_CONTRACT.md §1) y también
se valida contra la fila de `users` en cada request (evita que un token viejo
siga siendo válido si el rol cambiara, aunque en el MVP el rol es inmutable).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.errors import ForbiddenRoleError, UnauthorizedError
from app.database import get_db
from app.modules.identity.models import User

settings = get_settings()

_pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

_bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(plain_password: str) -> str:
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return _pwd_context.verify(plain_password, password_hash)
    except ValueError:
        return False


def create_access_token(*, user_id: uuid.UUID, role: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.jwt_expire_minutes)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise UnauthorizedError("No autenticado.")
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = uuid.UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise UnauthorizedError("Sesión inválida o expirada.") from exc

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise UnauthorizedError("Sesión inválida o expirada.")
    return user


def require_candidate(user: User = Depends(get_current_user)) -> User:
    if user.role != "CANDIDATE":
        raise ForbiddenRoleError("Esta acción es solo para cuentas de candidato.")
    return user


def require_company(user: User = Depends(get_current_user)) -> User:
    if user.role != "COMPANY":
        raise ForbiddenRoleError("Esta acción es solo para cuentas de empresa.")
    return user
