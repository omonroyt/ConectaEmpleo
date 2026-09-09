"""Lecturas de catálogo (job_families, competencies, skills)."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.contracts.base import RubricLevelDTO, RubricSpec
from app.core.errors import NotFoundError
from app.modules.catalog.models import Competency, InterviewQuestion, JobFamily, Rubric, Skill


def list_job_families(db: Session) -> list[JobFamily]:
    return list(db.execute(select(JobFamily).order_by(JobFamily.name)).scalars().all())


def get_job_family_or_404(db: Session, job_family_id: uuid.UUID) -> JobFamily:
    job_family = db.get(JobFamily, job_family_id)
    if job_family is None:
        raise NotFoundError("Familia de puesto no encontrada.")
    return job_family


def list_competencies(db: Session, job_family_id: uuid.UUID) -> list[Competency]:
    get_job_family_or_404(db, job_family_id)
    stmt = select(Competency).where(Competency.job_family_id == job_family_id).order_by(Competency.name)
    return list(db.execute(stmt).scalars().all())


def list_skills(db: Session) -> list[Skill]:
    return list(db.execute(select(Skill).order_by(Skill.category, Skill.name)).scalars().all())


def list_interview_questions(db: Session, job_family_id: uuid.UUID) -> list[tuple[InterviewQuestion, Competency]]:
    """Devuelve las 14 preguntas del banco de una familia, ordenadas por `sequence`.

    Cada fila viene emparejada con su `Competency` para que el router arme
    `competency_code`/`competency_name` sin una segunda consulta (docs/build/06
    §2: útil para la pantalla de preparación de entrevista y para depurar).
    """
    get_job_family_or_404(db, job_family_id)
    stmt = (
        select(InterviewQuestion, Competency)
        .join(Competency, InterviewQuestion.competency_id == Competency.id)
        .where(InterviewQuestion.job_family_id == job_family_id)
        .order_by(InterviewQuestion.sequence)
    )
    return [(q, c) for q, c in db.execute(stmt).all()]


def _active_rubric_for(db: Session, competency_id: uuid.UUID) -> Rubric | None:
    stmt = (
        select(Rubric)
        .where(Rubric.competency_id == competency_id, Rubric.is_active.is_(True))
        .order_by(Rubric.version.desc())
        .limit(1)
    )
    return db.execute(stmt).scalars().first()


def rubric_spec_for_competency(db: Session, competency: Competency) -> RubricSpec | None:
    """Construye el `RubricSpec` inyectable en runtime (docs/05 §6.2) para una competencia.

    `None` si la competencia no tiene rúbrica activa sembrada todavía (no
    debería ocurrir para las 42 competencias del master prompt, pero el
    orquestador/evaluador deben tolerarlo sin reventar — B6/B7 no
    implementan los niveles PROVISIONAL/BASELINE completos de docs/05 §6.3
    por estar fuera del alcance del MVP de hackatón: las 42 rúbricas ya están
    sembradas 1:1 con las 42 competencias, así que el caso "sin rúbrica" es
    defensivo, no esperado).
    """

    rubric = _active_rubric_for(db, competency.id)
    if rubric is None:
        return None
    guidelines = rubric.evidence_guidelines or {}
    return RubricSpec(
        competency_code=competency.code,
        competency_name=competency.name,
        type=competency.type,
        is_core=competency.is_core,
        version=rubric.version,
        source="SPECIFIC",
        what_to_probe=guidelines.get("what_to_probe", []),
        levels=[RubricLevelDTO.model_validate(level) for level in rubric.levels],
        positive_signals=guidelines.get("positive_signals", []),
        negative_signals=guidelines.get("negative_signals", []),
        score_mapping={str(k): v for k, v in guidelines.get("score_mapping", {}).items()},
    )


def resolve_rubric_specs_for_family(db: Session, job_family_id: uuid.UUID) -> list[RubricSpec]:
    """Todas las `RubricSpec` de una familia, en el orden de `Competency.name`."""

    competencies = list_competencies(db, job_family_id)
    specs = [rubric_spec_for_competency(db, c) for c in competencies]
    return [s for s in specs if s is not None]
