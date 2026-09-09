"""Servicios de dominio para el perfil de candidato.

B3 agrega: lectura/edición (`GET/PATCH /candidates/me`), selección de familia,
cálculo de `next_step` (`GET /candidates/me/status`) y el DTO
`CandidateSnapshotForAI` que hace cumplir la invariante I-05.
"""

from __future__ import annotations

import secrets
import string
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.contracts.base import CandidateSnapshotForAI, EducationItemDTO, ExperienceItemDTO, LocationDTO
from app.core.errors import NotFoundError
from app.modules.candidates.models import CandidateProfile
from app.modules.candidates.schemas import (
    CandidateProfile as CandidateProfileSchema,
)
from app.modules.candidates.schemas import (
    CandidateProfilePatch,
    CandidateStatusView,
    EducationItem,
    ExperienceItem,
    Location,
)
from app.modules.catalog.models import JobFamily

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


def get_profile_by_user_id(db: Session, *, user_id: uuid.UUID) -> CandidateProfile:
    profile = db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == user_id)
    ).scalar_one_or_none()
    if profile is None:
        raise NotFoundError("No se encontró un perfil de candidato para esta cuenta.")
    return profile


def to_schema(profile: CandidateProfile) -> CandidateProfileSchema:
    """Arma `CandidateProfile` del contrato a partir de las columnas planas del modelo.

    Necesario porque `location` es un objeto anidado en el contrato pero
    `location_city`/`location_state` son columnas separadas, y
    `completion_percent` no es una columna: se calcula aquí mismo.
    """

    location = (
        Location(city=profile.location_city or "", state=profile.location_state or "")
        if profile.location_city or profile.location_state
        else None
    )
    return CandidateProfileSchema(
        id=profile.id,
        user_id=profile.user_id,
        full_name=profile.full_name,
        phone=profile.phone,
        photo_url=profile.photo_url,
        birth_date=profile.birth_date,
        gender=profile.gender,
        job_family_id=profile.job_family_id,
        location=location,
        availability=profile.availability,
        salary_expectation_min=profile.salary_expectation_min,
        salary_expectation_max=profile.salary_expectation_max,
        education=[EducationItem.model_validate(e) for e in profile.education],
        experience=[ExperienceItem.model_validate(e) for e in profile.experience],
        bio=profile.bio,
        status=profile.status,
        anon_code=profile.anon_code,
        completion_percent=completion_percent(profile),
    )


def apply_patch(db: Session, profile: CandidateProfile, patch: CandidateProfilePatch) -> CandidateProfile:
    """Aplica solo los campos presentes en el patch (`exclude_unset`), como PATCH real."""

    data = patch.model_dump(exclude_unset=True)

    if "location" in data:
        location = data.pop("location")
        profile.location_city = location["city"] if location else None
        profile.location_state = location["state"] if location else None
    if "education" in data:
        profile.education = data.pop("education")
    if "experience" in data:
        profile.experience = data.pop("experience")

    for field, value in data.items():
        setattr(profile, field, value)

    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def set_job_family(db: Session, profile: CandidateProfile, *, job_family_id: uuid.UUID) -> CandidateProfile:
    family = db.get(JobFamily, job_family_id)
    if family is None:
        raise NotFoundError("La familia laboral indicada no existe.")
    profile.job_family_id = family.id
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def compute_status_view(db: Session, profile: CandidateProfile) -> CandidateStatusView:
    """Calcula `next_step` con la misma máquina de estados que el mock del frontend.

    (`frontend/src/api/mock/index.ts`, `candidate.status()`). Desde B5,
    "hay una extracción sin confirmar" usa la señal real
    `cv_extractions.confirmed_by_candidate` (antes era una aproximación con
    `Document.status == "PARSED"`, documentada como deuda en B3-B4).
    `interview_session_id` y `has_talent_profile` quedan `None`/`False` hasta
    B6/B7, que son quienes crean esas tablas.
    """

    from app.modules.documents.cv_extraction_service import (  # import local: evita ciclo candidates<->documents
        get_pending_extraction,
    )

    next_step: str
    if profile.status == "DRAFT":
        if not profile.job_family_id:
            next_step = "ONBOARDING"
        else:
            extraction = get_pending_extraction(db, candidate_id=profile.id)
            next_step = (
                "REVIEW_CLAIMS" if extraction is not None and not extraction.confirmed_by_candidate else "CV"
            )
    elif profile.status in ("CV_READY", "INTERVIEWING"):
        next_step = "INTERVIEW"
    elif profile.status == "PENDING_EVALUATION":
        next_step = "WAITING_EVALUATION"
    elif profile.status == "EVALUATED":
        next_step = "DONE"
    else:
        next_step = "ONBOARDING"

    return CandidateStatusView(
        status=profile.status,
        next_step=next_step,
        interview_session_id=profile.interview_session_id,
        has_talent_profile=False,  # B7 crea `talent_profiles`
    )


def build_candidate_snapshot_for_ai(profile: CandidateProfile) -> CandidateSnapshotForAI:
    """DTO que hace cumplir la invariante I-05 (docs/04 §6.3, §8).

    `CandidateSnapshotForAI` carece **físicamente** de `full_name`,
    `photo_url`, `birth_date` y `gender` — no se están omitiendo aquí, la
    clase ni siquiera declara esos campos. Ver `tests/test_ai_snapshot.py`.
    """

    location = (
        LocationDTO(city=profile.location_city or "", state=profile.location_state or "")
        if profile.location_city or profile.location_state
        else None
    )
    return CandidateSnapshotForAI(
        anon_code=profile.anon_code,
        job_family_code=None,  # se resuelve desde `JobFamily.code` en el servicio que arma el request
        location=location,
        availability=profile.availability,
        salary_expectation_min=profile.salary_expectation_min,
        salary_expectation_max=profile.salary_expectation_max,
        education=[
            EducationItemDTO(
                institution=e.get("institution", ""),
                degree=e.get("degree", ""),
                start_year=e.get("start_year", 0),
                end_year=e.get("end_year"),
            )
            for e in profile.education
        ],
        experience=[
            ExperienceItemDTO(
                company=e.get("company", ""),
                position=e.get("position", ""),
                start_date=e.get("start_date", ""),
                end_date=e.get("end_date"),
                is_current=e.get("is_current", False),
                description=e.get("description", ""),
                skills=e.get("skills", []),
            )
            for e in profile.experience
        ],
        bio=profile.bio,
    )
