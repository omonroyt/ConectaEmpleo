"""`GET/PATCH /companies/me` · `GET /companies/me/verification` · `GET /companies/me/summary`.

`docs/build/02_API_CONTRACT.md` §4. El último endpoint es aditivo (D-04 de
`docs/build/00_BUILD_STATE.md`), decidido en B8.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import require_company
from app.database import get_db
from app.modules.companies import service
from app.modules.companies.schemas import Company, CompanyPatch, CompanySummary, VerificationView
from app.modules.identity.models import User

router = APIRouter(prefix="/companies/me", tags=["companies"])


@router.get("", response_model=Company)
def get_my_company(current_user: User = Depends(require_company), db: Session = Depends(get_db)) -> Company:
    company = service.get_company_by_user_id(db, user_id=current_user.id)
    return service.to_schema(company)


@router.patch("", response_model=Company)
def patch_my_company(
    patch: CompanyPatch,
    current_user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> Company:
    company = service.get_company_by_user_id(db, user_id=current_user.id)
    company = service.apply_patch(db, company, patch)
    return service.to_schema(company)


@router.get("/verification", response_model=VerificationView)
def get_my_verification(
    current_user: User = Depends(require_company), db: Session = Depends(get_db)
) -> VerificationView:
    company = service.get_company_by_user_id(db, user_id=current_user.id)
    return service.compute_verification(company)


@router.get("/summary", response_model=CompanySummary)
def get_my_summary(current_user: User = Depends(require_company), db: Session = Depends(get_db)) -> CompanySummary:
    company = service.get_company_by_user_id(db, user_id=current_user.id)
    return service.build_summary(db, company)
