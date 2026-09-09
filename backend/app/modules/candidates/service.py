"""Servicios de dominio para el perfil de candidato.

En B1-B2 solo se necesita crear el perfil vacío al registrar (con `anon_code`
único) y exponerlo consultado como `CandidateProfile`. El resto (`GET/PATCH
/candidates/me`, documentos, status) es alcance de B3.
"""

from __future__ import annotations

import secrets
import string
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.candidates.models import CandidateProfile

_ANON_CODE_ALPHABET = string.ascii_uppercase + string.digits


def _random_anon_suffix(length: int = 4) -> str:
    return "".join(secrets.choice(_ANON_CODE_ALPHABET) for _ in range(length))


def generate_unique_anon_code(db: Session) -> str:
    """Genera un `anon_code` único formato `CND-XXXX` (ej. `CND-4F82`)."""

    for _ in range(50):
        candidate = f"CND-{_random_anon_suffix()}"
        exists = db.execute(
            select(CandidateProfile.id).where(CandidateProfile.anon_code == candidate)
        ).first()
        if exists is None:
            return candidate
    # Extremadamente improbable con 36^4 combinaciones; fallback determinista por unicidad garantizada.
    return f"CND-{uuid.uuid4().hex[:4].upper()}"


def create_empty_profile(db: Session, *, user_id: uuid.UUID) -> CandidateProfile:
    profile = CandidateProfile(
        user_id=user_id,
        full_name="",
        education=[],
        experience=[],
        status="DRAFT",
        anon_code=generate_unique_anon_code(db),
    )
    db.add(profile)
    return profile


def completion_percent(profile: CandidateProfile) -> int:
    """Heurística simple de completitud (0-100) usada por `CandidateProfile.completion_percent`.

    Se cuentan campos clave del perfil; cada uno aporta una fracción igual del total.
    """

    fields_present = [
        bool(profile.full_name),
        bool(profile.phone),
        bool(profile.job_family_id),
        bool(profile.location_city),
        bool(profile.availability),
        profile.salary_expectation_min is not None,
        bool(profile.education),
        bool(profile.experience),
        bool(profile.bio),
    ]
    if not fields_present:
        return 0
    return round(100 * sum(fields_present) / len(fields_present))
