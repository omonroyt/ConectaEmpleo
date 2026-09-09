"""`POST /vacancies/{id}/match-runs` · `GET /match-runs/{id}/results` (B9).

`docs/build/02_API_CONTRACT.md` §4. Requiere `require_company` y verifica
propiedad de la vacante (`vacancies_service.get_vacancy_for_company_or_404`,
mismo criterio de 404 de B8: "una vacante de otra empresa no es accesible").
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.jobs import run_job
from app.core.security import require_company
from app.database import get_db
from app.modules.companies import service as companies_service
from app.modules.identity.models import User
from app.modules.marketplace import service as marketplace_service
from app.modules.marketplace.schemas import AnonymousCandidateCard
from app.modules.matching import service
from app.modules.matching.jobs import create_match_run_job, match_run_worker
from app.modules.matching.schemas import Paginated
from app.modules.vacancies import service as vacancies_service

router = APIRouter(tags=["matching"])


class JobRef(BaseModel):
    job_id: uuid.UUID


def _company_id_for(current_user: User, db: Session) -> uuid.UUID:
    return companies_service.get_company_by_user_id(db, user_id=current_user.id).id


@router.post("/vacancies/{vacancy_id}/match-runs", response_model=JobRef, status_code=202)
def create_match_run(
    vacancy_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> JobRef:
    company_id = _company_id_for(current_user, db)
    # 404 (no 403) si la vacante es de otra empresa -- misma decisión que B8.
    vacancies_service.get_vacancy_for_company_or_404(db, vacancy_id=vacancy_id, company_id=company_id)

    job = create_match_run_job(db, vacancy_id=vacancy_id)
    background_tasks.add_task(run_job, job.id, match_run_worker)
    return JobRef(job_id=job.id)


@router.get("/match-runs/{match_run_id}/results", response_model=Paginated[AnonymousCandidateCard])
def get_match_run_results(
    match_run_id: uuid.UUID,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> Paginated[AnonymousCandidateCard]:
    company_id = _company_id_for(current_user, db)
    match_run = service.get_match_run_for_company_or_404(db, match_run_id=match_run_id, company_id=company_id)
    items, total = service.list_results(db, match_run_id=match_run.id, limit=limit, offset=offset)
    cards = [marketplace_service.to_anonymous_card(db, r, company_id=company_id) for r in items]
    return Paginated(items=cards, total=total)
