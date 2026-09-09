"""Orquestación de B9: arma las vistas anonimizadas, corre el motor determinista
(`engine.py`) y persiste `match_runs`/`match_results`.

**I-05 / RB-05 en la consulta misma**: `_select_candidate_row` usa
`select(CandidateProfile.<columna>, ...)` -- una lista explícita de columnas,
nunca `select(CandidateProfile)` ni `db.get(CandidateProfile, id)` -- así que
`full_name`, `photo_url`, `birth_date` y `gender` **no se traen de la base**
en absoluto durante el cálculo de matching, no solo se omiten después.

**RB-01**: solo entran al run los candidatos con `status="EVALUATED"`, un
`talent_profile` vigente y la **misma familia laboral que la vacante**
(decisión de B9: los `competency_code` de otra familia no calzan con los
requisitos de esta vacante, así que incluir candidatos de otra familia solo
produciría ceros ruidosos en TECHNICAL/BEHAVIORAL; documentado también en la
bitácora de `docs/build/00_BUILD_STATE.md`).
"""

from __future__ import annotations

import uuid
from dataclasses import asdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.modules.assessments.models import CandidateSkill, CompetencyEvaluation, TalentProfile
from app.modules.candidates.models import CandidateProfile
from app.modules.catalog.models import Competency
from app.modules.matching import engine
from app.modules.matching.models import MatchResult, MatchRun
from app.modules.vacancies.models import Vacancy
from app.modules.vacancies.service import _requirement_code_lookup  # reutiliza el mismo resolvedor de B8


# ---------------------------------------------------------------------------
# Elegibilidad (RB-01)
# ---------------------------------------------------------------------------


def eligible_candidate_ids_for_vacancy(db: Session, vacancy: Vacancy) -> list[uuid.UUID]:
    current_profile_ids = select(TalentProfile.candidate_id).where(TalentProfile.is_current.is_(True))
    rows = db.execute(
        select(CandidateProfile.id).where(
            CandidateProfile.status == "EVALUATED",
            CandidateProfile.job_family_id == vacancy.job_family_id,
            CandidateProfile.id.in_(current_profile_ids),
        )
    ).scalars().all()
    return list(rows)


# ---------------------------------------------------------------------------
# Vista del candidato para el motor (I-05 / RB-05)
# ---------------------------------------------------------------------------


def _select_candidate_row(db: Session, candidate_id: uuid.UUID):
    """Columnas explícitas -- ver docstring del módulo. NUNCA agregar aquí
    `full_name`, `photo_url`, `birth_date` ni `gender`."""

    return db.execute(
        select(
            CandidateProfile.id,
            CandidateProfile.anon_code,
            CandidateProfile.location_city,
            CandidateProfile.location_state,
            CandidateProfile.availability,
            CandidateProfile.salary_expectation_min,
            CandidateProfile.salary_expectation_max,
            CandidateProfile.experience,
        ).where(CandidateProfile.id == candidate_id)
    ).one()


def _evaluations_for(db: Session, candidate_id: uuid.UUID) -> tuple[engine.EvaluationInput, ...]:
    rows = db.execute(
        select(
            CompetencyEvaluation.score,
            CompetencyEvaluation.rubric_level,
            CompetencyEvaluation.confidence,
            Competency.code,
            Competency.name,
            Competency.type,
        )
        .join(Competency, Competency.id == CompetencyEvaluation.competency_id)
        .where(CompetencyEvaluation.candidate_id == candidate_id, CompetencyEvaluation.is_current.is_(True))
    ).all()
    return tuple(
        engine.EvaluationInput(
            competency_code=code, competency_name=name, type=type_, score=score, rubric_level=level, confidence=confidence
        )
        for score, level, confidence, code, name, type_ in rows
    )


def _skills_for(db: Session, candidate_id: uuid.UUID) -> tuple[engine.SkillInput, ...]:
    rows = db.execute(
        select(
            CandidateSkill.skill_code,
            CandidateSkill.skill_name,
            CandidateSkill.is_declared,
            CandidateSkill.is_evaluated,
            CandidateSkill.is_verified,
            CandidateSkill.evaluated_score,
            CandidateSkill.confidence,
            CandidateSkill.evidence_summary,
        ).where(CandidateSkill.candidate_id == candidate_id)
    ).all()
    return tuple(
        engine.SkillInput(
            skill_code=code,
            skill_name=name,
            is_declared=declared,
            is_evaluated=evaluated,
            is_verified=verified,
            evaluated_score=score,
            confidence=confidence,
            evidence_summary=summary,
        )
        for code, name, declared, evaluated, verified, score, confidence, summary in rows
    )


def build_candidate_view(db: Session, candidate_id: uuid.UUID) -> engine.MatchingCandidateView:
    row = _select_candidate_row(db, candidate_id)
    experience = tuple(
        engine.ExperienceItemInput(
            start_date=item.get("start_date", ""),
            end_date=item.get("end_date"),
            skills=tuple(item.get("skills", []) or []),
        )
        for item in (row.experience or [])
    )
    return engine.MatchingCandidateView(
        candidate_id=str(row.id),
        anon_code=row.anon_code,
        location_city=row.location_city,
        location_state=row.location_state,
        availability=row.availability,
        salary_expectation_min=row.salary_expectation_min,
        salary_expectation_max=row.salary_expectation_max,
        experience=experience,
        evaluations=_evaluations_for(db, candidate_id),
        skills=_skills_for(db, candidate_id),
    )


# ---------------------------------------------------------------------------
# Vista de la vacante
# ---------------------------------------------------------------------------


def build_vacancy_context(db: Session, vacancy: Vacancy) -> engine.VacancyMatchContext:
    requirements = []
    for requirement in vacancy.requirements:
        competency_code, skill_code = _requirement_code_lookup(db, requirement)
        requirements.append(
            engine.RequirementInput(
                label=requirement.label,
                kind=requirement.kind,
                min_level=requirement.min_level,
                competency_code=competency_code,
                skill_code=skill_code,
            )
        )
    return engine.VacancyMatchContext(
        weights=dict(vacancy.weights),
        requirements=tuple(requirements),
        location_city=vacancy.location_city,
        location_state=vacancy.location_state,
        salary_min=vacancy.salary_min,
        salary_max=vacancy.salary_max,
    )


# ---------------------------------------------------------------------------
# Ejecución del run (worker de `MATCH_RUN`, ver jobs.py)
# ---------------------------------------------------------------------------


def run_match(db: Session, *, vacancy_id: uuid.UUID) -> MatchRun:
    vacancy = db.get(Vacancy, vacancy_id)
    if vacancy is None:
        raise NotFoundError("La vacante ya no existe.")

    candidate_ids = eligible_candidate_ids_for_vacancy(db, vacancy)

    match_run = MatchRun(
        vacancy_id=vacancy.id,
        algorithm_version=engine.ALGORITHM_VERSION,
        weights_snapshot=dict(vacancy.weights),
        candidates_evaluated=len(candidate_ids),
    )
    db.add(match_run)
    db.flush()

    vacancy_context = build_vacancy_context(db, vacancy)
    computations: list[tuple[uuid.UUID, engine.MatchComputation]] = []
    for candidate_id in candidate_ids:
        candidate_view = build_candidate_view(db, candidate_id)
        computed = engine.compute_match(candidate_view, vacancy_context)
        computations.append((candidate_id, computed))

    # Orden estable: score desc y, ante empate, `candidate_id` asc -- para que
    # el `rank_position` sea reproducible incluso si dos candidatos empatan
    # (determinismo, criterio de cierre de la tarea).
    computations.sort(key=lambda pair: (-pair[1].total_score, str(pair[0])))

    for position, (candidate_id, computed) in enumerate(computations, start=1):
        db.add(
            MatchResult(
                match_run_id=match_run.id,
                candidate_id=candidate_id,
                vacancy_id=vacancy.id,
                total_score=computed.total_score,
                breakdown=[asdict(item) for item in computed.breakdown],
                penalties=[asdict(p) for p in computed.penalties],
                strengths=list(computed.strengths),
                gaps=list(computed.gaps),
                explanation_text=None,
                rank_position=position,
                extra={
                    "evidence_counts": computed.evidence_counts,
                    "years_experience": computed.years_experience,
                    "geo_band": computed.geo_band,
                    "salary_band": computed.salary_band,
                    # No es parte del cálculo del motor (no tiene peso ni
                    # contribución): es un dato descriptivo de la tarjeta,
                    # igual que en `buildAnonymousCard` del mock.
                    "availability": candidate_view.availability or "ONE_MONTH",
                },
            )
        )

    db.commit()
    db.refresh(match_run)
    return match_run


# ---------------------------------------------------------------------------
# Lecturas
# ---------------------------------------------------------------------------


def get_match_run_or_404(db: Session, match_run_id: uuid.UUID) -> MatchRun:
    run = db.get(MatchRun, match_run_id)
    if run is None:
        raise NotFoundError("El run de matching no existe.")
    return run


def get_match_run_for_company_or_404(db: Session, *, match_run_id: uuid.UUID, company_id: uuid.UUID) -> MatchRun:
    """404 si el run no existe **o** su vacante pertenece a otra empresa (mismo
    criterio ya establecido en B8: nunca confirmar con un 403 que un id ajeno existe)."""

    run = db.execute(
        select(MatchRun)
        .join(Vacancy, Vacancy.id == MatchRun.vacancy_id)
        .where(MatchRun.id == match_run_id, Vacancy.company_id == company_id)
    ).scalars().first()
    if run is None:
        raise NotFoundError("El run de matching no existe.")
    return run


def list_results(db: Session, *, match_run_id: uuid.UUID, limit: int, offset: int) -> tuple[list[MatchResult], int]:
    total = db.execute(
        select(MatchResult.id).where(MatchResult.match_run_id == match_run_id)
    ).all()
    items = list(
        db.execute(
            select(MatchResult)
            .where(MatchResult.match_run_id == match_run_id)
            .order_by(MatchResult.rank_position.asc())
            .limit(limit)
            .offset(offset)
        )
        .scalars()
        .all()
    )
    return items, len(total)


def get_match_result_for_company_or_404(db: Session, *, match_result_id: uuid.UUID, company_id: uuid.UUID) -> MatchResult:
    result = db.execute(
        select(MatchResult)
        .join(Vacancy, Vacancy.id == MatchResult.vacancy_id)
        .where(MatchResult.id == match_result_id, Vacancy.company_id == company_id)
    ).scalars().first()
    if result is None:
        raise NotFoundError("El resultado de matching no existe.")
    return result


def next_best_score(db: Session, result: MatchResult) -> int | None:
    """El score del siguiente candidato en el mismo run (para A5 EXPLAIN: "por
    qué quedó arriba del siguiente", docs/05 §7 A5)."""

    next_result = db.execute(
        select(MatchResult.total_score)
        .where(MatchResult.match_run_id == result.match_run_id, MatchResult.rank_position == result.rank_position + 1)
    ).scalar()
    return next_result
