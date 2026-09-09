"""Servicios de dominio para empresa.

B1-B2 solo creaban el registro vacío al registrar el usuario. B8 agrega
lectura/edición (`GET/PATCH /companies/me`), la vista de verificación
(RF-14, visual en el MVP) y el resumen de home (D-06).
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.modules.companies.models import Company
from app.modules.companies.schemas import (
    Company as CompanySchema,
)
from app.modules.companies.schemas import (
    CompanyPatch,
    CompanySummary,
    Location,
    VerificationCheck,
    VerificationView,
)


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


def get_company_by_user_id(db: Session, *, user_id: uuid.UUID) -> Company:
    company = db.execute(select(Company).where(Company.user_id == user_id)).scalar_one_or_none()
    if company is None:
        raise NotFoundError("No se encontró una empresa para esta cuenta.")
    return company


def to_schema(company: Company) -> CompanySchema:
    location = (
        Location(city=company.location_city or "", state=company.location_state or "")
        if company.location_city or company.location_state
        else None
    )
    return CompanySchema(
        id=company.id,
        user_id=company.user_id,
        legal_name=company.legal_name,
        trade_name=company.trade_name,
        industry=company.industry,
        size=company.size,
        location=location,
        work_mode=company.work_mode,
        logo_url=company.logo_url,
        description=company.description,
        verification_status=company.verification_status,
    )


def apply_patch(db: Session, company: Company, patch: CompanyPatch) -> Company:
    """PATCH real (`exclude_unset`): un campo ausente en el body no se toca."""

    data = patch.model_dump(exclude_unset=True)

    if "location" in data:
        location = data.pop("location")
        company.location_city = location["city"] if location else None
        company.location_state = location["state"] if location else None

    for field, value in data.items():
        setattr(company, field, value)

    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def compute_verification(company: Company) -> VerificationView:
    """`VerificationView` con checks derivados de datos reales del perfil (RF-14).

    Verificación **visual** en el MVP: no hay validación legal real (RFC,
    acta constitutiva, etc.) — los tres primeros checks solo reflejan si la
    empresa llenó su perfil, y el cuarto refleja el `verification_status`
    guardado (que hoy nadie más que un operador humano cambiaría a mano; no
    hay endpoint que lo mute). Mismo criterio que
    `frontend/src/api/mock/index.ts::company.verification()`, con un check
    adicional de descripción porque el prompt de la tarea lo pide
    explícitamente como ejemplo.
    """

    checks = [
        VerificationCheck(label="Razón social registrada", done=bool(company.legal_name.strip())),
        VerificationCheck(label="Industria definida", done=bool(company.industry.strip())),
        VerificationCheck(
            label="Ubicación registrada",
            done=bool(company.location_city or company.location_state),
        ),
        VerificationCheck(
            label="Descripción de la empresa", done=bool(company.description and company.description.strip())
        ),
        VerificationCheck(
            label="Verificación de dominio (demo)", done=company.verification_status == "VERIFIED"
        ),
    ]
    return VerificationView(status=company.verification_status, checks=checks)


def build_summary(db: Session, company: Company) -> CompanySummary:
    """D-06: resumen para el home de empresa, sin que el frontend pida N recursos.

    `candidates_in_selection` (shortlist) y `unlocks` dependen de
    `match_results`/`candidate_unlocks`, que no existen todavía (B9/B10) —
    devuelven 0 explícitamente hasta entonces; quien construya B9/B10 solo
    tiene que reemplazar esos dos conteos por consultas reales, sin tocar la
    forma de `CompanySummary` ni este endpoint.
    """

    from app.modules.vacancies.models import Vacancy  # import local: evita ciclo companies<->vacancies

    active_vacancies = db.execute(
        select(Vacancy.id).where(Vacancy.company_id == company.id, Vacancy.status == "OPEN")
    ).all()

    return CompanySummary(
        active_vacancies=len(active_vacancies),
        candidates_in_selection=0,  # B10: contar match_results con shortlist_stage != null
        unlocks=0,  # B10: contar candidate_unlocks por vacantes de esta empresa
    )
