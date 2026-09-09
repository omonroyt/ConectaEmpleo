"""Lecturas de catálogo (job_families, competencies, skills)."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.modules.catalog.models import Competency, JobFamily, Skill


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
