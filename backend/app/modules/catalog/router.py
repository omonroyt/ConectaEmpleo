"""`GET /job-families` · `GET /job-families/{id}/competencies` ·
`GET /job-families/{id}/interview-questions` · `GET /skills`."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.modules.catalog import service
from app.modules.catalog.schemas import Competency, InterviewQuestion, JobFamily, Skill

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


@router.get("/job-families/{job_family_id}/interview-questions", response_model=list[InterviewQuestion])
def get_job_family_interview_questions(
    job_family_id: uuid.UUID, db: Session = Depends(get_db)
) -> list[InterviewQuestion]:
    rows = service.list_interview_questions(db, job_family_id)
    return [
        InterviewQuestion(
            id=question.id,
            job_family_id=question.job_family_id,
            question_id=question.question_id,
            block=question.block,
            sequence=question.sequence,
            competency_id=question.competency_id,
            competency_code=competency.code,
            competency_name=competency.name,
            text=question.text,
            evaluates=question.evaluates,
            suggested_follow_ups=question.suggested_follow_ups,
            no_experience_variant=question.no_experience_variant,
            risk_flag_triggers=question.risk_flag_triggers,
            version=question.version,
        )
        for question, competency in rows
    ]


@router.get("/skills", response_model=list[Skill])
def get_skills(db: Session = Depends(get_db)) -> list[Skill]:
    skills = service.list_skills(db)
    return [Skill.model_validate(s) for s in skills]
