"""Esquemas Pydantic v2 equivalentes a los tipos TypeScript de `docs/build/02_API_CONTRACT.md` §3."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal["CANDIDATE", "COMPANY"]


class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Role


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    role: Role
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    user: User
