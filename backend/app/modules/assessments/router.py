"""`GET /candidates/me/talent-profile` · `/skills` · `/feedback` · `/learning-path`.

`docs/build/02_API_CONTRACT.md` §4.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import require_candidate
from app.database import get_db
from app.modules.assessments import service
from app.modules.assessments.schemas import CandidateSkill, FeedbackReport, LearningPath, TalentProfile
from app.modules.candidates.service import get_profile_by_user_id
from app.modules.identity.models import User

router = APIRouter(prefix="/candidates/me", tags=["assessments"])


@router.get("/talent-profile", response_model=TalentProfile)
def get_talent_profile(
    current_user: User = Depends(require_candidate), db: Session = Depends(get_db)
) -> TalentProfile:
    profile = get_profile_by_user_id(db, user_id=current_user.id)
    row = service.get_current_talent_profile(db, candidate_id=profile.id)
    return service.to_talent_profile_schema(db, row)


@router.get("/skills", response_model=list[CandidateSkill])
def get_skills(current_user: User = Depends(require_candidate), db: Session = Depends(get_db)) -> list[CandidateSkill]:
    profile = get_profile_by_user_id(db, user_id=current_user.id)
    return service.get_candidate_skills(db, candidate_id=profile.id)


@router.get("/feedback", response_model=FeedbackReport)
def get_feedback(current_user: User = Depends(require_candidate), db: Session = Depends(get_db)) -> FeedbackReport:
    profile = get_profile_by_user_id(db, user_id=current_user.id)
    return service.get_feedback_report(db, candidate_id=profile.id)


@router.get("/learning-path", response_model=LearningPath)
def get_learning_path(current_user: User = Depends(require_candidate), db: Session = Depends(get_db)) -> LearningPath:
    profile = get_profile_by_user_id(db, user_id=current_user.id)
    return service.get_learning_path(db, candidate_id=profile.id)
