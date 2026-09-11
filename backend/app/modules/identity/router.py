"""`POST /auth/register` · `POST /auth/login` · `GET /auth/me` (docs/build/02_API_CONTRACT.md §4)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.core.errors import RegistrationClosedError
from app.core.security import create_access_token, get_current_user
from app.database import get_db
from app.modules.identity import service
from app.modules.identity.models import User as UserModel
from app.modules.identity.schemas import AuthResponse, LoginInput, RegisterInput
from app.modules.identity.schemas import User as UserSchema

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(
    payload: RegisterInput,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AuthResponse:
    # Con `REGISTRATION_ENABLED=false` solo entran las cuentas sembradas: nadie de
    # fuera puede abrir cuentas que consuman las APIs de IA y de voz. Las semillas
    # llaman a `service.register_user` directo, así que el cierre no las afecta.
    if not settings.registration_enabled:
        raise RegistrationClosedError()
    user = service.register_user(db, payload)
    token = create_access_token(user_id=user.id, role=user.role)
    return AuthResponse(access_token=token, user=UserSchema.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginInput, db: Session = Depends(get_db)) -> AuthResponse:
    user = service.authenticate_user(db, email=payload.email, password=payload.password)
    token = create_access_token(user_id=user.id, role=user.role)
    return AuthResponse(access_token=token, user=UserSchema.model_validate(user))


@router.get("/me", response_model=UserSchema)
def me(current_user: UserModel = Depends(get_current_user)) -> UserSchema:
    return UserSchema.model_validate(current_user)
