"""`GET /job-families` · `GET /job-families/{id}/competencies` · `GET /skills`."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.catalog import service
from app.modules.catalog.schemas import Competency, JobFamily, Skill

router = APIRouter(tags=["catalog"])


@router.get("/job-families", response_model=list[JobFamily])
def get_job_families(db: Session = Depends(get_db)) -> list[JobFamily]:
    families = service.list_job_families(db)
    return [JobFamily.model_validate(f) for f in families]


@router.get("/job-families/{job_family_id}/competencies", response_model=list[Competency])
def get_job_family_competencies(
    job_family_id: uuid.UUID, db: Session = Depends(get_db)
) -> list[Competency]:
    competencies = service.list_competencies(db, job_family_id)
    return [Competency.model_validate(c) for c in competencies]


@router.get("/skills", response_model=list[Skill])
def get_skills(db: Session = Depends(get_db)) -> list[Skill]:
    skills = service.list_skills(db)
    return [Skill.model_validate(s) for s in skills]
