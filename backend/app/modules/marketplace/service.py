"""Servicios de dominio de B10: tarjetas anónimas, desbloqueo, comparador,
finalistas y marketplace del candidato (D-07).

**Anonimización estructural**: `to_anonymous_card` arma un
`AnonymousCandidateCard` leyendo únicamente lo que esa clase declara (nunca
`full_name`/`photo_url`/`birth_date`/`gender`, ver `marketplace/schemas.py`).
`build_unlocked_profile` es la **única** función que además llama a
`_select_identity_columns` (columnas identificables), y solo se invoca tras
comprobar que existe una fila en `candidate_unlocks` (`require_unlock`).

**HU-M04**: `require_unlock` no lee ninguna bandera en `candidate_profiles` --
la única fuente de verdad es la presencia de la fila.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.contracts.matching import (
    BreakdownItemDTO,
    MatchExplanationRequest,
    MatchExplanationResult,
    PenaltyDTO,
)
from app.ai.invoke import invoke
from app.ai.prompts.loader import prompt_version_for
from app.core.errors import NotFoundError, UnlockRequiredError
from app.modules.assessments import service as assessments_service
from app.modules.candidates.models import CandidateProfile
from app.modules.candidates.schemas import EducationItem, ExperienceItem
from app.modules.catalog.models import JobFamily
from app.modules.companies.models import Company
from app.modules.documents.models import Document
from app.modules.documents.schemas import DocumentRef
from app.modules.documents.storage import get_storage
from app.modules.identity.models import User
from app.modules.marketplace.explain import build_key_differences
from app.modules.marketplace.models import Application, CandidateUnlock
from app.modules.marketplace.schemas import (
    AnonymousCandidateCard,
    BreakdownItem,
    CompareCriterion,
    CompareView,
    Location,
    Opportunity,
    Penalty,
    ShortlistEntry,
    UnlockedCandidateProfile,
)
from app.modules.matching import service as matching_service
from app.modules.matching.engine import compute_match, score_label_for
from app.modules.matching.models import MatchResult
from app.modules.vacancies.models import Vacancy
from app.modules.vacancies.schemas import VacancyRequirement as VacancyRequirementSchema
from app.modules.vacancies.service import _requirement_code_lookup

#: Criterios fijos del comparador (mismos 7 que `frontend/src/api/mock/index.ts::compare`).
COMPARE_CRITERIA: list[CompareCriterion] = [
    CompareCriterion(key="total_score", label="Compatibilidad total"),
    CompareCriterion(key="TECHNICAL", label="Técnico"),
    CompareCriterion(key="BEHAVIORAL", label="Conductual"),
    CompareCriterion(key="EXPERIENCE", label="Experiencia"),
    CompareCriterion(key="EVIDENCE", label="Evidencia"),
    CompareCriterion(key="SALARY", label="Salario"),
    CompareCriterion(key="LOCATION", label="Ubicación"),
]

MAX_COMPARE_CANDIDATES = 3


# ---------------------------------------------------------------------------
# anon_code / job_family_code — lecturas mínimas y no protegidas
# ---------------------------------------------------------------------------


def _anon_code_for(db: Session, candidate_id: uuid.UUID) -> str:
    return db.execute(select(CandidateProfile.anon_code).where(CandidateProfile.id == candidate_id)).scalar_one()


def _job_family_code_for(db: Session, job_family_id: uuid.UUID) -> str:
    family = db.get(JobFamily, job_family_id)
    return family.code if family else ""


# ---------------------------------------------------------------------------
# Desbloqueo (HU-M04)
# ---------------------------------------------------------------------------


def get_unlock(db: Session, *, company_id: uuid.UUID, candidate_id: uuid.UUID, vacancy_id: uuid.UUID) -> CandidateUnlock | None:
    return db.execute(
        select(CandidateUnlock).where(
            CandidateUnlock.company_id == company_id,
            CandidateUnlock.candidate_id == candidate_id,
            CandidateUnlock.vacancy_id == vacancy_id,
        )
    ).scalars().first()


def is_unlocked(db: Session, *, company_id: uuid.UUID, candidate_id: uuid.UUID, vacancy_id: uuid.UUID) -> bool:
    return get_unlock(db, company_id=company_id, candidate_id=candidate_id, vacancy_id=vacancy_id) is not None


def unlock_candidate(db: Session, *, result: MatchResult, company_id: uuid.UUID) -> CandidateUnlock:
    """Operación de escritura auditada (docs/04 §8): idempotente -- desbloquear
    dos veces no crea una segunda fila ni pisa `unlocked_at` original."""

    existing = get_unlock(db, company_id=company_id, candidate_id=result.candidate_id, vacancy_id=result.vacancy_id)
    if existing is not None:
        return existing

    unlock = CandidateUnlock(
        company_id=company_id,
        candidate_id=result.candidate_id,
        vacancy_id=result.vacancy_id,
        source_match_result_id=result.id,
    )
    db.add(unlock)
    db.commit()
    db.refresh(unlock)
    return unlock


def require_unlock(db: Session, *, result: MatchResult, company_id: uuid.UUID) -> CandidateUnlock:
    unlock = get_unlock(db, company_id=company_id, candidate_id=result.candidate_id, vacancy_id=result.vacancy_id)
    if unlock is None:
        raise UnlockRequiredError()
    return unlock


# ---------------------------------------------------------------------------
# A5 EXPLAIN — se genera bajo demanda y se congela (docs/05 §7 A5)
# ---------------------------------------------------------------------------


def ensure_explanation(db: Session, result: MatchResult) -> MatchResult:
    if result.explanation_text:
        return result

    next_score = matching_service.next_best_score(db, result)
    request = MatchExplanationRequest(
        total_score=result.total_score,
        next_best_score=next_score,
        breakdown=[BreakdownItemDTO(**item) for item in result.breakdown],
        penalties=[PenaltyDTO(**p) for p in result.penalties],
        strengths=list(result.strengths),
        gaps=list(result.gaps),
    )
    explanation: MatchExplanationResult = invoke(
        db, "explain_match", request, MatchExplanationResult, prompt_version=prompt_version_for("explain_match")
    )
    result.explanation_text = explanation.explanation_text
    db.add(result)
    db.commit()
    db.refresh(result)
    return result


# ---------------------------------------------------------------------------
# Tarjeta anónima
# ---------------------------------------------------------------------------


def to_anonymous_card(db: Session, result: MatchResult, *, company_id: uuid.UUID, vacancy: Vacancy | None = None) -> AnonymousCandidateCard:
    vacancy = vacancy or db.get(Vacancy, result.vacancy_id)
    extra = result.extra or {}
    return AnonymousCandidateCard(
        match_result_id=result.id,
        anon_code=_anon_code_for(db, result.candidate_id),
        job_family_code=_job_family_code_for(db, vacancy.job_family_id),
        rank_position=result.rank_position,
        total_score=result.total_score,
        score_label=score_label_for(result.total_score),
        breakdown=[BreakdownItem(**item) for item in result.breakdown],
        penalties=[Penalty(**p) for p in result.penalties],
        strengths=list(result.strengths),
        gaps=list(result.gaps),
        skills=assessments_service.get_candidate_skills(db, candidate_id=result.candidate_id),
        evidence_counts=extra.get("evidence_counts", {"declared": 0, "evaluated": 0, "verified": 0}),
        years_experience=extra.get("years_experience", 0),
        availability=extra.get("availability", "ONE_MONTH"),
        geo_band=extra.get("geo_band", "FAR"),
        salary_band=extra.get("salary_band", "No especificado"),
        explanation_text=result.explanation_text,
        shortlist_stage=result.shortlist_stage,
        is_unlocked=is_unlocked(db, company_id=company_id, candidate_id=result.candidate_id, vacancy_id=result.vacancy_id),
    )


def build_unlocked_profile(db: Session, result: MatchResult, *, company_id: uuid.UUID, unlock: CandidateUnlock) -> UnlockedCandidateProfile:
    """Solo se llama tras `require_unlock`. Aquí -- y únicamente aquí -- se leen
    los atributos identificables del candidato."""

    card = to_anonymous_card(db, result, company_id=company_id)

    profile = db.get(CandidateProfile, result.candidate_id)
    if profile is None:
        raise NotFoundError("El candidato ya no existe.")
    user = db.get(User, profile.user_id)

    talent_profile_row = assessments_service.get_current_talent_profile(db, candidate_id=profile.id)
    talent_profile = assessments_service.to_talent_profile_schema(db, talent_profile_row)

    documents = list(db.execute(select(Document).where(Document.owner_user_id == profile.user_id)).scalars().all())
    storage = get_storage()
    document_refs = [
        DocumentRef(
            id=d.id,
            type=d.type,
            original_filename=d.original_filename,
            mime_type=d.mime_type,
            size_bytes=d.size_bytes,
            status=d.status,
            uploaded_at=d.uploaded_at,
            url=storage.url_for(d.storage_key),
        )
        for d in documents
    ]

    location = (
        Location(city=profile.location_city or "No especificado", state=profile.location_state or "")
        if profile.location_city or profile.location_state
        else Location(city="No especificado", state="")
    )

    return UnlockedCandidateProfile(
        **card.model_dump(),
        candidate_id=profile.id,
        full_name=profile.full_name or "Nombre no disponible",
        email=user.email if user else "no-disponible@conectaempleo.mx",
        phone=profile.phone,
        photo_url=profile.photo_url,
        location=location,
        experience=[ExperienceItem.model_validate(e) for e in profile.experience],
        education=[EducationItem.model_validate(e) for e in profile.education],
        documents=document_refs,
        talent_profile=talent_profile,
        # Nota de decisión: no se invoca A4 (`generate_feedback_report`) aquí --
        # generaría una llamada de IA en cada apertura del perfil desbloqueado
        # solo para rellenar un campo opcional del contrato. `company_note`
        # queda `null`; documentado en la bitácora de B9/B10.
        company_note=None,
        unlocked_at=unlock.unlocked_at,
    )


# ---------------------------------------------------------------------------
# Comparador
# ---------------------------------------------------------------------------


def compare(db: Session, *, vacancy: Vacancy, match_result_ids: list[uuid.UUID], company_id: uuid.UUID) -> CompareView:
    ids = match_result_ids[:MAX_COMPARE_CANDIDATES]
    results = [
        r
        for r in (
            db.execute(select(MatchResult).where(MatchResult.id == mid, MatchResult.vacancy_id == vacancy.id)).scalars().first()
            for mid in ids
        )
        if r is not None
    ]
    cards = [to_anonymous_card(db, r, company_id=company_id, vacancy=vacancy) for r in results]
    return CompareView(criteria=COMPARE_CRITERIA, candidates=cards, key_differences=build_key_differences(cards))


# ---------------------------------------------------------------------------
# Finalistas / shortlist
# ---------------------------------------------------------------------------


def get_shortlist(db: Session, *, vacancy: Vacancy, company_id: uuid.UUID) -> list[ShortlistEntry]:
    results = list(
        db.execute(
            select(MatchResult).where(MatchResult.vacancy_id == vacancy.id, MatchResult.shortlist_stage.is_not(None))
        )
        .scalars()
        .all()
    )
    return [
        ShortlistEntry(
            match_result_id=r.id,
            anon_code=_anon_code_for(db, r.candidate_id),
            stage=r.shortlist_stage,
            is_unlocked=is_unlocked(db, company_id=company_id, candidate_id=r.candidate_id, vacancy_id=r.vacancy_id),
            total_score=r.total_score,
            added_at=r.shortlisted_at or datetime.now(timezone.utc),
        )
        for r in results
    ]


def set_shortlist_stage(db: Session, *, result: MatchResult, company_id: uuid.UUID, stage: str | None) -> ShortlistEntry | None:
    result.shortlist_stage = stage
    result.shortlisted_at = datetime.now(timezone.utc) if stage else None
    db.add(result)
    db.commit()
    db.refresh(result)
    if stage is None:
        return None
    return ShortlistEntry(
        match_result_id=result.id,
        anon_code=_anon_code_for(db, result.candidate_id),
        stage=stage,
        is_unlocked=is_unlocked(db, company_id=company_id, candidate_id=result.candidate_id, vacancy_id=result.vacancy_id),
        total_score=result.total_score,
        added_at=result.shortlisted_at,
    )


# ---------------------------------------------------------------------------
# Marketplace del candidato (D-07)
# ---------------------------------------------------------------------------


def _vacancy_requirements_schema(db: Session, vacancy: Vacancy) -> list[VacancyRequirementSchema]:
    schemas = []
    for requirement in vacancy.requirements:
        competency_code, skill_code = _requirement_code_lookup(db, requirement)
        schemas.append(
            VacancyRequirementSchema(
                id=requirement.id,
                competency_code=competency_code,
                skill_code=skill_code,
                label=requirement.label,
                kind=requirement.kind,
                min_level=requirement.min_level,
                weight=requirement.weight,
            )
        )
    return schemas


def _opportunity_for(db: Session, vacancy: Vacancy, *, candidate: CandidateProfile | None, applied_vacancy_ids: set[uuid.UUID]) -> Opportunity:
    company = db.get(Company, vacancy.company_id)
    location = (
        Location(city=vacancy.location_city or "", state=vacancy.location_state or "")
        if vacancy.location_city or vacancy.location_state
        else None
    )

    compatibility: int | None = None
    compatibility_label: str | None = None
    why_fit: list[str] = []
    missing_evidence: list[str] = []

    # Compatibilidad "en vivo" (no persistida, distinta de un `match_run` de
    # empresa): solo tiene sentido si el candidato ya está EVALUATED en la
    # misma familia laboral de la vacante -- mismo criterio de elegibilidad
    # que RB-01 usa para el ranking de empresa.
    if (
        candidate is not None
        and candidate.status == "EVALUATED"
        and candidate.job_family_id == vacancy.job_family_id
    ):
        view = matching_service.build_candidate_view(db, candidate.id)
        context = matching_service.build_vacancy_context(db, vacancy)
        computed = compute_match(view, context)
        compatibility = computed.total_score
        compatibility_label = score_label_for(computed.total_score)
        why_fit = list(computed.strengths)
        missing_evidence = list(computed.gaps)

    return Opportunity(
        vacancy_id=vacancy.id,
        title=vacancy.title,
        company_trade_name=company.trade_name if company else "",
        company_verified=bool(company and company.verification_status == "VERIFIED"),
        location=location,
        work_mode=vacancy.work_mode,
        salary_min=vacancy.salary_min,
        salary_max=vacancy.salary_max,
        job_family_code=_job_family_code_for(db, vacancy.job_family_id),
        compatibility=compatibility,
        compatibility_label=compatibility_label,
        why_fit=why_fit,
        missing_evidence=missing_evidence,
        requirements=_vacancy_requirements_schema(db, vacancy),
        description=vacancy.description,
        applied=vacancy.id in applied_vacancy_ids,
    )


def list_open_opportunities(db: Session, *, candidate: CandidateProfile) -> list[Opportunity]:
    vacancies = list(db.execute(select(Vacancy).where(Vacancy.status == "OPEN")).scalars().all())
    applied_ids = set(
        db.execute(select(Application.vacancy_id).where(Application.candidate_id == candidate.id)).scalars().all()
    )
    return [_opportunity_for(db, v, candidate=candidate, applied_vacancy_ids=applied_ids) for v in vacancies]


def get_open_opportunity_or_404(db: Session, *, vacancy_id: uuid.UUID, candidate: CandidateProfile) -> Opportunity:
    vacancy = db.execute(select(Vacancy).where(Vacancy.id == vacancy_id, Vacancy.status == "OPEN")).scalars().first()
    if vacancy is None:
        raise NotFoundError("La vacante no existe o ya no está abierta.")
    applied_ids = set(
        db.execute(select(Application.vacancy_id).where(Application.candidate_id == candidate.id)).scalars().all()
    )
    return _opportunity_for(db, vacancy, candidate=candidate, applied_vacancy_ids=applied_ids)


def apply_to_vacancy(db: Session, *, candidate_id: uuid.UUID, vacancy_id: uuid.UUID) -> Application:
    vacancy = db.execute(select(Vacancy).where(Vacancy.id == vacancy_id, Vacancy.status == "OPEN")).scalars().first()
    if vacancy is None:
        raise NotFoundError("La vacante no existe o ya no está abierta.")

    existing = db.execute(
        select(Application).where(Application.candidate_id == candidate_id, Application.vacancy_id == vacancy_id)
    ).scalars().first()
    if existing is not None:
        return existing

    application = Application(candidate_id=candidate_id, vacancy_id=vacancy_id, status="APPLIED")
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


def list_my_applications(db: Session, *, candidate_id: uuid.UUID) -> list[Application]:
    return list(
        db.execute(
            select(Application).where(Application.candidate_id == candidate_id).order_by(Application.created_at.desc())
        )
        .scalars()
        .all()
    )
