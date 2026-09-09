"""Esquemas Pydantic v2 de `Company`/`VerificationView` (`docs/build/02_API_CONTRACT.md` §3).

`Location` se duplica a propósito respecto a `app/modules/candidates/schemas.py`
(mismo patrón que `app/ai/contracts/base.py::LocationDTO`): cada módulo de
dominio declara su propia forma de contrato HTTP para no acoplar `companies`
con `candidates` por un tipo tan pequeño.
"""

from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel

CompanySize = Literal["1-10", "11-50", "51-200", "200+"]
WorkMode = Literal["ONSITE", "HYBRID", "REMOTE"]
VerificationStatus = Literal["UNVERIFIED", "PENDING", "VERIFIED"]


class Location(BaseModel):
    city: str
    state: str


class Company(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    legal_name: str
    trade_name: str
    industry: str
    size: CompanySize | None
    location: Location | None
    work_mode: WorkMode | None
    logo_url: str | None
    description: str | None
    verification_status: VerificationStatus


class CompanyPatch(BaseModel):
    """`Partial<Omit<Company, "id" | "user_id" | "verification_status">>` del contrato."""

    legal_name: str | None = None
    trade_name: str | None = None
    industry: str | None = None
    size: CompanySize | None = None
    location: Location | None = None
    work_mode: WorkMode | None = None
    logo_url: str | None = None
    description: str | None = None


class VerificationCheck(BaseModel):
    label: str
    done: bool


class VerificationView(BaseModel):
    status: VerificationStatus
    checks: list[VerificationCheck]


class CompanySummary(BaseModel):
    """D-06 (`docs/build/00_BUILD_STATE.md`): resumen para el home de empresa.

    No forma parte de `docs/build/02_API_CONTRACT.md` §3 (es aditivo, decidido
    en B8) — evita que el frontend pida la shortlist de cada vacante para
    calcular "Desbloqueos" en el cliente. `candidates_in_selection` y
    `unlocks` dependen de tablas que todavía no existen (`match_results`/
    `candidate_unlocks` llegan en B9/B10): devuelven 0 hasta entonces.
    """

    active_vacancies: int
    candidates_in_selection: int
    unlocks: int
