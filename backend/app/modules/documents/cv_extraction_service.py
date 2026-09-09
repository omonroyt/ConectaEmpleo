"""Servicio de dominio de `cv_extractions`/`claims` (docs/04 §5.3, HU-C03/C04/C05).

Dos caminos alimentan este servicio con la misma forma de datos:
- `documents/service.py::cv_parse_worker` (A1 modo EXTRACT, `parse_cv`).
- `cv_builder/service.py::finalize_session` (A1 modo BUILD, CV conversacional).

Ambos llaman a `create_extraction(...)` con la lista de ítems ya en la forma
del contrato HTTP (`ExperienceItem`/`EducationItem` requieren `id`, que los
DTOs de `AIPort` no traen — se sintetiza aquí, una sola vez, para que el resto
del backend nunca tenga que decidir cómo generarlo).

La extracción vive separada de `candidate_profiles` hasta que
`confirm_extraction()` la aplica (HU-C05): copia `experience`/`education` al
perfil, marca `confirmed_by_candidate` y mueve el perfil a `CV_READY`. Antes
de eso, ni `parse_cv` ni el CV conversacional tocan el perfil (HU-C03).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.contracts.profiling import CVParseResult
from app.core.errors import NotFoundError
from app.modules.candidates.models import CandidateProfile
from app.modules.candidates.schemas import EducationItem, ExperienceItem
from app.modules.documents.models import Claim
from app.modules.documents.models import CVExtraction as CVExtractionModel
from app.modules.documents.models import Document
from app.modules.documents.schemas import (
    Claim as ClaimSchema,
)
from app.modules.documents.schemas import (
    CVExtraction as CVExtractionSchema,
)
from app.modules.documents.schemas import (
    CVExtractionPatch,
    ExtractionCertification,
    ExtractionSkill,
    SourceRef,
)


def _new_id() -> str:
    return str(uuid.uuid4())


def _experience_dict_from_dto(dto) -> dict:  # noqa: ANN001 — DTO de app.ai.contracts.base.ExperienceItemDTO
    return {
        "id": _new_id(),
        "company": dto.company,
        "position": dto.position,
        "start_date": dto.start_date,
        "end_date": dto.end_date,
        "is_current": dto.is_current,
        "description": dto.description,
        "skills": list(dto.skills),
    }


def _education_dict_from_dto(dto) -> dict:  # noqa: ANN001 — DTO de app.ai.contracts.base.EducationItemDTO
    return {
        "id": _new_id(),
        "institution": dto.institution,
        "degree": dto.degree,
        "start_year": dto.start_year,
        "end_year": dto.end_year,
    }


class ClaimInput:
    """Datos suficientes para insertar una fila `claims`, sin acoplarse a un DTO concreto."""

    def __init__(
        self,
        *,
        source: str,
        skill_code: str | None,
        statement: str,
        claimed_level: int | None,
        needs_validation: bool = True,
        source_ref: dict | None = None,
    ) -> None:
        self.source = source
        self.skill_code = skill_code
        self.statement = statement
        self.claimed_level = claimed_level
        self.needs_validation = needs_validation
        self.source_ref = source_ref


def create_extraction(
    db: Session,
    *,
    candidate_id: uuid.UUID,
    document_id: uuid.UUID | None,
    confidence: float,
    experience: list[dict],
    education: list[dict],
    skills: list[dict],
    certifications: list[dict],
    claims: list[ClaimInput],
    raw_payload: dict,
    ai_invocation_id: uuid.UUID | None,
    contract_version: str = "1.1",
) -> CVExtractionModel:
    """Persiste una `CVExtraction` nueva más sus `claims`. No toca `candidate_profiles`."""

    extraction = CVExtractionModel(
        document_id=document_id,
        candidate_id=candidate_id,
        status="PARSED",
        confidence=confidence,
        raw_payload=raw_payload,
        normalized_payload={
            "experience": experience,
            "education": education,
            "skills": skills,
            "certifications": certifications,
        },
        contract_version=contract_version,
        ai_invocation_id=ai_invocation_id,
        confirmed_by_candidate=False,
        confirmed_at=None,
    )
    db.add(extraction)
    db.flush()  # obtiene extraction.id sin comitear todavía

    for claim_input in claims:
        db.add(
            Claim(
                candidate_id=candidate_id,
                cv_extraction_id=extraction.id,
                source=claim_input.source,
                skill_code=claim_input.skill_code,
                statement=claim_input.statement,
                claimed_level=claim_input.claimed_level,
                needs_validation=claim_input.needs_validation,
                source_ref=claim_input.source_ref,
            )
        )

    db.commit()
    db.refresh(extraction)
    return extraction


def persist_extraction_from_parse(
    db: Session,
    *,
    document: Document,
    candidate_id: uuid.UUID,
    result: CVParseResult,
    ai_invocation_id: uuid.UUID | None,
) -> CVExtractionModel:
    """Convierte un `CVParseResult` (A1 EXTRACT) en `CVExtraction` + `claims` persistidos."""

    experience = [_experience_dict_from_dto(e) for e in result.experience]
    education = [_education_dict_from_dto(e) for e in result.education]
    skills = [{"code": s.code, "name": s.name, "level": s.level} for s in result.skills]
    certifications = [
        {"name": c.name, "issuer": c.issuer, "year": c.year} for c in result.certifications
    ]
    claims = [
        ClaimInput(
            source=c.source,
            skill_code=c.skill_code,
            statement=c.statement,
            claimed_level=c.claimed_level,
            needs_validation=True,
            source_ref=c.source_ref,
        )
        for c in result.claims
    ]

    return create_extraction(
        db,
        candidate_id=candidate_id,
        document_id=document.id,
        confidence=result.confidence,
        experience=experience,
        education=education,
        skills=skills,
        certifications=certifications,
        claims=claims,
        raw_payload=result.model_dump(mode="json"),
        ai_invocation_id=ai_invocation_id,
    )


def get_latest_extraction(db: Session, *, candidate_id: uuid.UUID) -> CVExtractionModel:
    extraction = db.execute(
        select(CVExtractionModel)
        .where(CVExtractionModel.candidate_id == candidate_id)
        .order_by(CVExtractionModel.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    if extraction is None:
        raise NotFoundError(
            "Todavía no tienes una extracción de CV. Sube tu CV o complétalo por conversación."
        )
    return extraction


def get_pending_extraction(db: Session, *, candidate_id: uuid.UUID) -> CVExtractionModel | None:
    """Igual que `get_latest_extraction` pero sin lanzar (usado por `compute_status_view`)."""

    return db.execute(
        select(CVExtractionModel)
        .where(CVExtractionModel.candidate_id == candidate_id)
        .order_by(CVExtractionModel.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()


def _claim_to_schema(claim: Claim) -> ClaimSchema:
    return ClaimSchema(
        id=claim.id,
        source=claim.source,
        skill_code=claim.skill_code,
        statement=claim.statement,
        claimed_level=claim.claimed_level,
        needs_validation=claim.needs_validation,
        source_ref=SourceRef.model_validate(claim.source_ref) if claim.source_ref else None,
    )


def to_schema(db: Session, extraction: CVExtractionModel) -> CVExtractionSchema:
    claims = list(
        db.execute(
            select(Claim)
            .where(Claim.cv_extraction_id == extraction.id)
            .order_by(Claim.created_at)
        )
        .scalars()
        .all()
    )
    payload = extraction.normalized_payload or {}
    return CVExtractionSchema(
        id=extraction.id,
        document_id=extraction.document_id,
        status=extraction.status,
        confidence=extraction.confidence,
        experience=[ExperienceItem.model_validate(e) for e in payload.get("experience", [])],
        education=[EducationItem.model_validate(e) for e in payload.get("education", [])],
        skills=[ExtractionSkill.model_validate(s) for s in payload.get("skills", [])],
        certifications=[ExtractionCertification.model_validate(c) for c in payload.get("certifications", [])],
        claims=[_claim_to_schema(c) for c in claims],
        confirmed_by_candidate=extraction.confirmed_by_candidate,
        confirmed_at=extraction.confirmed_at,
    )


def confirm_extraction(
    db: Session, *, profile: CandidateProfile, patch: CVExtractionPatch
) -> CVExtractionSchema:
    """Aplica `patch` (`exclude_unset`), copia experiencia/educación al perfil y confirma (HU-C05).

    Mueve `candidate_profiles.status` a `CV_READY` sin importar el estado
    previo — confirmar la extracción es, por definición, el paso que cierra
    "tengo un CV listo para usar en la entrevista".
    """

    extraction = get_latest_extraction(db, candidate_id=profile.id)
    data = patch.model_dump(exclude_unset=True)

    payload = dict(extraction.normalized_payload or {})
    if "experience" in data:
        payload["experience"] = data["experience"]
    if "education" in data:
        payload["education"] = data["education"]
    if "skills" in data:
        payload["skills"] = data["skills"]
    if "certifications" in data:
        payload["certifications"] = data["certifications"]
    extraction.normalized_payload = payload

    if "claims" in data:
        db.query(Claim).filter(Claim.cv_extraction_id == extraction.id).delete()
        for claim_data in data["claims"]:
            db.add(
                Claim(
                    candidate_id=profile.id,
                    cv_extraction_id=extraction.id,
                    source=claim_data["source"],
                    skill_code=claim_data.get("skill_code"),
                    statement=claim_data["statement"],
                    claimed_level=claim_data.get("claimed_level"),
                    needs_validation=claim_data.get("needs_validation", True),
                    source_ref=claim_data.get("source_ref"),
                )
            )

    extraction.confirmed_by_candidate = True
    extraction.confirmed_at = datetime.now(timezone.utc)
    db.add(extraction)

    profile.experience = payload.get("experience", [])
    profile.education = payload.get("education", [])
    profile.status = "CV_READY"
    db.add(profile)

    db.commit()
    db.refresh(extraction)
    return to_schema(db, extraction)
