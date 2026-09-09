"""Servicios de dominio para vacantes, requisitos, pesos y A5 RESOLVE (B8).

RB-07 (`docs/04_Arquitectura_Tecnica_Backend.md` §5.6): los pesos se
normalizan a 100 **al guardar** y se persiste el valor normalizado, tanto
para `VacancyWeights` (`PUT /vacancies/{id}/weights`) como para el peso por
requisito (`PUT /vacancies/{id}/requirements`). El algoritmo replica
exactamente `normalizeWeights`/`normalizeRequirementWeights` de
`frontend/src/api/mock/index.ts`: escala proporcional al total, redondea cada
componente salvo el último, y el último absorbe el residuo para que la suma
sea siempre exactamente 100 (incluso con errores de redondeo). Si el total es
0 (D-05: el frontend envía peso 0 por requisito porque su UI no edita pesos
individuales), reparte partes iguales con el mismo truco de residuo.
"""

from __future__ import annotations

import math
import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.contracts.matching import (
    CatalogCompetencyRefDTO,
    CatalogSkillRefDTO,
    RequirementResolutionRequest,
    RequirementResolutionResult,
)
from app.ai.invoke import invoke
from app.core.errors import NotFoundError
from app.modules.catalog.models import Competency, JobFamily, Skill
from app.modules.vacancies.models import DEFAULT_WEIGHTS, Vacancy, VacancyRequirement
from app.modules.vacancies.schemas import (
    Location,
    RequirementInput,
    RequirementResolution,
    RequirementWarning,
)
from app.modules.vacancies.schemas import (
    Vacancy as VacancySchema,
)
from app.modules.vacancies.schemas import (
    VacancyInput,
    VacancyPatch,
    VacancyRequirement as VacancyRequirementSchema,
    VacancyWeights,
    WEIGHT_COMPONENTS,
)


def _round_half_up(value: float) -> int:
    """Redondeo "mitad hacia arriba", igual que `Math.round` de JS (el mock)."""

    return int(math.floor(value + 0.5))


def _normalize_to_100(values: Sequence[float]) -> list[int]:
    """Normaliza una secuencia de pesos a enteros que suman exactamente 100.

    Preserva el orden de `values`. El último elemento absorbe el residuo de
    redondeo (mismo truco que el mock: nunca se pierde ni se gana un punto).
    Si la suma es <= 0 (D-05: pesos todos en 0), reparte partes iguales.
    """

    n = len(values)
    if n == 0:
        return []
    total = sum(values)
    if total <= 0:
        equal = _round_half_up(100 / n)
        return [100 - equal * (n - 1) if i == n - 1 else equal for i in range(n)]

    result: list[int] = []
    running = 0
    for i, value in enumerate(values):
        if i == n - 1:
            result.append(100 - running)
        else:
            scaled = _round_half_up(value / total * 100)
            result.append(scaled)
            running += scaled
    return result


def normalize_weights_dict(weights: dict[str, float]) -> dict[str, int]:
    values = [weights[key] for key in WEIGHT_COMPONENTS]
    normalized = _normalize_to_100(values)
    return dict(zip(WEIGHT_COMPONENTS, normalized, strict=True))


def _resolve_competency_id(db: Session, *, code: str, job_family_id: uuid.UUID) -> uuid.UUID:
    competency = db.execute(
        select(Competency).where(Competency.code == code, Competency.job_family_id == job_family_id)
    ).scalar_one_or_none()
    if competency is None:
        raise NotFoundError(f"La competencia '{code}' no existe en el catálogo de esta familia laboral.")
    return competency.id


def _resolve_skill_id(db: Session, *, code: str) -> uuid.UUID:
    skill = db.execute(select(Skill).where(Skill.code == code)).scalar_one_or_none()
    if skill is None:
        raise NotFoundError(f"La skill '{code}' no existe en el catálogo.")
    return skill.id


def create_vacancy(db: Session, *, company_id: uuid.UUID, payload: VacancyInput) -> Vacancy:
    family = db.get(JobFamily, payload.job_family_id)
    if family is None:
        raise NotFoundError("La familia laboral indicada no existe.")

    vacancy = Vacancy(
        company_id=company_id,
        job_family_id=payload.job_family_id,
        title=payload.title,
        description=payload.description,
        location_city=payload.location.city if payload.location else None,
        location_state=payload.location.state if payload.location else None,
        work_mode=payload.work_mode,
        salary_min=payload.salary_min,
        salary_max=payload.salary_max,
        positions_count=payload.positions_count,
        status="DRAFT",
        weights=dict(DEFAULT_WEIGHTS),
    )
    db.add(vacancy)
    db.commit()
    db.refresh(vacancy)
    return vacancy


def list_vacancies_for_company(db: Session, *, company_id: uuid.UUID) -> list[Vacancy]:
    stmt = select(Vacancy).where(Vacancy.company_id == company_id).order_by(Vacancy.created_at.desc())
    return list(db.execute(stmt).scalars().all())


def get_vacancy_for_company_or_404(db: Session, *, vacancy_id: uuid.UUID, company_id: uuid.UUID) -> Vacancy:
    """404 (no 403) si la vacante no existe **o** pertenece a otra empresa.

    Decisión de cierre de B8: se elige 404 sobre 403 para no confirmarle a una
    empresa que un id de vacante ajena existe (mismo criterio que
    `NotFoundError` en el resto del backend, ej. `job-family` inexistente en
    B3). Documentado también en `docs/build/00_BUILD_STATE.md`.
    """

    vacancy = db.execute(
        select(Vacancy).where(Vacancy.id == vacancy_id, Vacancy.company_id == company_id)
    ).scalar_one_or_none()
    if vacancy is None:
        raise NotFoundError("La vacante no existe.")
    return vacancy


def apply_patch(db: Session, vacancy: Vacancy, patch: VacancyPatch) -> Vacancy:
    data = patch.model_dump(exclude_unset=True)

    if "job_family_id" in data and data["job_family_id"] is not None:
        family = db.get(JobFamily, data["job_family_id"])
        if family is None:
            raise NotFoundError("La familia laboral indicada no existe.")

    if "location" in data:
        location = data.pop("location")
        vacancy.location_city = location["city"] if location else None
        vacancy.location_state = location["state"] if location else None

    for field, value in data.items():
        setattr(vacancy, field, value)

    db.add(vacancy)
    db.commit()
    db.refresh(vacancy)
    return vacancy


def set_weights(db: Session, vacancy: Vacancy, weights: VacancyWeights) -> Vacancy:
    normalized = normalize_weights_dict(weights.model_dump())
    vacancy.weights = normalized
    db.add(vacancy)
    db.commit()
    db.refresh(vacancy)
    return vacancy


def set_requirements(db: Session, vacancy: Vacancy, requirements: list[RequirementInput]) -> Vacancy:
    """Reemplaza todos los requisitos de la vacante (`PUT`, no `PATCH`)."""

    weights = _normalize_to_100([r.weight for r in requirements]) if requirements else []

    vacancy.requirements.clear()
    db.flush()

    for item, normalized_weight in zip(requirements, weights, strict=True):
        competency_id = (
            _resolve_competency_id(db, code=item.competency_code, job_family_id=vacancy.job_family_id)
            if item.competency_code
            else None
        )
        skill_id = _resolve_skill_id(db, code=item.skill_code) if item.skill_code else None
        vacancy.requirements.append(
            VacancyRequirement(
                competency_id=competency_id,
                skill_id=skill_id,
                label=item.label,
                kind=item.kind,
                min_level=item.min_level,
                weight=normalized_weight,
            )
        )

    db.add(vacancy)
    db.commit()
    db.refresh(vacancy)
    return vacancy


def _requirement_code_lookup(db: Session, requirement: VacancyRequirement) -> tuple[str | None, str | None]:
    competency_code = None
    skill_code = None
    if requirement.competency_id is not None:
        competency = db.get(Competency, requirement.competency_id)
        competency_code = competency.code if competency else None
    if requirement.skill_id is not None:
        skill = db.get(Skill, requirement.skill_id)
        skill_code = skill.code if skill else None
    return competency_code, skill_code


def to_schema(db: Session, vacancy: Vacancy) -> VacancySchema:
    location = (
        Location(city=vacancy.location_city or "", state=vacancy.location_state or "")
        if vacancy.location_city or vacancy.location_state
        else None
    )
    requirement_schemas = []
    for requirement in vacancy.requirements:
        competency_code, skill_code = _requirement_code_lookup(db, requirement)
        requirement_schemas.append(
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

    weights_map = {**dict(DEFAULT_WEIGHTS), **(vacancy.weights or {})}

    # B9/B10: import local para evitar un ciclo de imports en tiempo de carga
    # de módulo (`matching.service` importa `_requirement_code_lookup` de
    # este archivo; `matching.models` en cambio no importa nada de
    # `vacancies`, así que este import es seguro aquí).
    from app.modules.matching.models import MatchResult, MatchRun

    last_run_id = db.execute(
        select(MatchRun.id).where(MatchRun.vacancy_id == vacancy.id).order_by(MatchRun.executed_at.desc()).limit(1)
    ).scalar()
    shortlist_count = 0
    if last_run_id is not None:
        shortlist_count = len(
            db.execute(
                select(MatchResult.id).where(
                    MatchResult.match_run_id == last_run_id, MatchResult.shortlist_stage.is_not(None)
                )
            ).all()
        )

    return VacancySchema(
        id=vacancy.id,
        company_id=vacancy.company_id,
        job_family_id=vacancy.job_family_id,
        title=vacancy.title,
        description=vacancy.description,
        location=location,
        work_mode=vacancy.work_mode,
        salary_min=vacancy.salary_min,
        salary_max=vacancy.salary_max,
        positions_count=vacancy.positions_count,
        status=vacancy.status,
        created_at=vacancy.created_at,
        requirements=requirement_schemas,
        weights=VacancyWeights(**weights_map),
        last_match_run_id=last_run_id,  # B9: última corrida de matching, si existe
        shortlist_count=shortlist_count,  # B10: finalistas marcados en esa última corrida
    )


def resolve_requirements_for_text(db: Session, vacancy: Vacancy, free_text: str) -> RequirementResolution:
    """A5 modo RESOLVE (`docs/05` §7 A5): interpreta `free_text` en lenguaje natural.

    El contrato (`vacancies.resolveRequirements(id, freeText)`) sí manda un
    texto explícito en el body del endpoint; `router.py` usa
    `vacancy.description` como valor por defecto si el body no trae
    `free_text`, para que el criterio de cierre ("`POST
    /vacancies/{id}/resolve-requirements` mostrando el mapeo") funcione
    directo sobre la descripción ya guardada al crear la vacante.
    """
    family = db.get(JobFamily, vacancy.job_family_id)
    if family is None:
        raise NotFoundError("La familia laboral de la vacante no existe.")

    competencies = db.execute(
        select(Competency).where(Competency.job_family_id == vacancy.job_family_id)
    ).scalars().all()
    skills = db.execute(select(Skill)).scalars().all()

    request = RequirementResolutionRequest(
        job_family_code=family.code,
        free_text=free_text,
        catalog_competencies=[
            CatalogCompetencyRefDTO(code=c.code, name=c.name, type=c.type) for c in competencies
        ],
        catalog_skills=[CatalogSkillRefDTO(code=s.code, name=s.name) for s in skills],
    )

    result: RequirementResolutionResult = invoke(
        db,
        "resolve_vacancy_requirements",
        request,
        RequirementResolutionResult,
        prompt_version="v1",
    )

    mapped = [
        RequirementInput(
            competency_code=item.competency_code,
            skill_code=item.skill_code,
            label=item.label,
            kind=item.kind,
            min_level=item.min_level,
            weight=item.weight,
        )
        for item in result.mapped
    ]
    warnings = [RequirementWarning(text=w.text, reason=w.reason) for w in result.warnings]
    suggested_weights = {**dict(DEFAULT_WEIGHTS), **result.suggested_weights}

    return RequirementResolution(
        mapped=mapped,
        unmapped=list(result.unmapped),
        warnings=warnings,
        suggested_weights=VacancyWeights(**suggested_weights),
    )
