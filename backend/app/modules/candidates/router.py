"""`GET/PATCH /candidates/me` · `POST /candidates/me/job-family` · `GET /candidates/me/status`.

`docs/build/02_API_CONTRACT.md` §4.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import require_candidate
from app.database import get_db
from app.modules.candidates import service
from app.modules.candidates.schemas import (
    CandidateProfile,
    CandidateProfilePatch,
    CandidateStatusView,
    JobFamilySelection,
)
from app.modules.identity.models import User

router = APIRouter(prefix="/candidates/me", tags=["candidates"])


@router.get("", response_model=CandidateProfile)
def get_my_profile(
    current_user: User = Depends(require_candidate), db: Session = Depends(get_db)
) -> CandidateProfile:
    profile = service.get_profile_by_user_id(db, user_id=current_user.id)
    return service.to_schema(profile)


@router.patch("", response_model=CandidateProfile)
def patch_my_profile(
    patch: CandidateProfilePatch,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CandidateProfile:
    profile = service.get_profile_by_user_id(db, user_id=current_user.id)
    profile = service.apply_patch(db, profile, patch)
    return service.to_schema(profile)


@router.post("/job-family", response_model=CandidateProfile)
def set_job_family(
    payload: JobFamilySelection,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CandidateProfile:
    profile = service.get_profile_by_user_id(db, user_id=current_user.id)
    profile = service.set_job_family(db, profile, job_family_id=payload.job_family_id)
    return service.to_schema(profile)


@router.get("/status", response_model=CandidateStatusView)
def get_my_status(
    current_user: User = Depends(require_candidate), db: Session = Depends(get_db)
) -> CandidateStatusView:
    profile = service.get_profile_by_user_id(db, user_id=current_user.id)
    return service.compute_status_view(db, profile)
