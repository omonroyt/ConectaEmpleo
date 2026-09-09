"""`POST /interviews` · `GET /interviews/{id}` · `.../next-question` ·
`.../answers` · `.../progress` · `.../complete` · `.../turns`.

`docs/build/02_API_CONTRACT.md` §4, filas `interviews.*`.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import require_candidate
from app.database import get_db
from app.modules.assessments.jobs import create_evaluate_job, run_interview_pipeline
from app.modules.candidates.service import get_profile_by_user_id
from app.modules.identity.models import User
from app.modules.interviews import service
from app.modules.interviews.schemas import (
    AnswerInput,
    CreateInterviewInput,
    InterviewProgress,
)
from app.modules.interviews.schemas import (
    InterviewSession as InterviewSessionSchema,
)
from app.modules.interviews.schemas import (
    InterviewTurn as InterviewTurnSchema,
)
from app.modules.interviews.schemas import (
    NextQuestion,
)

router = APIRouter(prefix="/interviews", tags=["interviews"])


class JobRef(BaseModel):
    job_id: uuid.UUID


@router.post("", response_model=InterviewSessionSchema, status_code=201)
def create_interview(
    payload: CreateInterviewInput = CreateInterviewInput(),
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> InterviewSessionSchema:
    profile = get_profile_by_user_id(db, user_id=current_user.id)
    return service.create_session(db, profile=profile, mode=payload.mode)


@router.get("/{interview_id}", response_model=InterviewSessionSchema)
def get_interview(
    interview_id: uuid.UUID,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> InterviewSessionSchema:
    profile = get_profile_by_user_id(db, user_id=current_user.id)
    return service.get_session(db, session_id=interview_id, candidate_id=profile.id)


@router.get("/{interview_id}/next-question", response_model=NextQuestion)
def get_next_question(
    interview_id: uuid.UUID,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> NextQuestion:
    profile = get_profile_by_user_id(db, user_id=current_user.id)
    return service.next_question(db, session_id=interview_id, candidate_id=profile.id)


@router.post("/{interview_id}/answers", response_model=NextQuestion)
def post_answer(
    interview_id: uuid.UUID,
    payload: AnswerInput,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> NextQuestion:
    profile = get_profile_by_user_id(db, user_id=current_user.id)
    return service.submit_answer(db, session_id=interview_id, candidate_id=profile.id, payload=payload)


@router.get("/{interview_id}/progress", response_model=InterviewProgress)
def get_progress(
    interview_id: uuid.UUID,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> InterviewProgress:
    profile = get_profile_by_user_id(db, user_id=current_user.id)
    return service.get_progress(db, session_id=interview_id, candidate_id=profile.id)


@router.get("/{interview_id}/turns", response_model=list[InterviewTurnSchema])
def get_turns(
    interview_id: uuid.UUID,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> list[InterviewTurnSchema]:
    profile = get_profile_by_user_id(db, user_id=current_user.id)
    return service.list_turns(db, session_id=interview_id, candidate_id=profile.id)


@router.post("/{interview_id}/complete", response_model=JobRef, status_code=202)
def complete_interview(
    interview_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> JobRef:
    profile = get_profile_by_user_id(db, user_id=current_user.id)
    session = service.ensure_completed(db, session_id=interview_id, candidate_id=profile.id)

    profile.status = "PENDING_EVALUATION"
    db.add(profile)
    db.commit()

    job = create_evaluate_job(db, session_id=session.id)
    background_tasks.add_task(run_interview_pipeline, job.id, session.id)
    return JobRef(job_id=job.id)
