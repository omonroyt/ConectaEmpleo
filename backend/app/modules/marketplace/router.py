"""B10 — marketplace, anonimización, desbloqueo, comparador, finalistas y
marketplace del candidato (D-07). `docs/build/02_API_CONTRACT.md` §4.

**Orden de inclusión en `app/main.py`**: este router se registra **antes**
que `vacancies_router` a propósito. `GET /vacancies/open` es de un solo
segmento, igual de "forma" que `GET /vacancies/{vacancy_id}` de
`vacancies_router` -- FastAPI/Starlette prueba las rutas en el orden en que
se agregaron al `app`, la primera que matchea gana. Si `vacancies_router` se
registrara primero, una petición a `/vacancies/open` sería capturada por
`{vacancy_id}="open"` y jamás llegaría a este router. Documentado también en
`docs/build/00_BUILD_STATE.md`.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.security import require_candidate, require_company
from app.database import get_db
from app.modules.candidates.service import get_profile_by_user_id
from app.modules.companies import service as companies_service
from app.modules.identity.models import User
from app.modules.marketplace import service
from app.modules.marketplace.schemas import (
    AnonymousCandidateCard,
    Application,
    CompareView,
    Opportunity,
    ShortlistEntry,
    ShortlistStageInput,
    UnlockedCandidateProfile,
)
from app.modules.matching import service as matching_service
from app.modules.vacancies import service as vacancies_service

router = APIRouter(tags=["marketplace"])


def _company_id_for(current_user: User, db: Session) -> uuid.UUID:
    return companies_service.get_company_by_user_id(db, user_id=current_user.id).id


# ---------------------------------------------------------------------------
# GET /vacancies/open* -- marketplace del candidato (D-07). Ver nota de orden
# de router arriba: DEBEN quedar antes de `vacancies_router` en `main.py`.
# ---------------------------------------------------------------------------


@router.get("/vacancies/open", response_model=list[Opportunity])
def list_open_vacancies(
    current_user: User = Depends(require_candidate), db: Session = Depends(get_db)
) -> list[Opportunity]:
    candidate = get_profile_by_user_id(db, user_id=current_user.id)
    return service.list_open_opportunities(db, candidate=candidate)


@router.get("/vacancies/open/{vacancy_id}", response_model=Opportunity)
def get_open_vacancy(
    vacancy_id: uuid.UUID,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> Opportunity:
    candidate = get_profile_by_user_id(db, user_id=current_user.id)
    return service.get_open_opportunity_or_404(db, vacancy_id=vacancy_id, candidate=candidate)


@router.post("/vacancies/{vacancy_id}/apply", response_model=Application)
def apply_to_vacancy(
    vacancy_id: uuid.UUID,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> Application:
    candidate = get_profile_by_user_id(db, user_id=current_user.id)
    application = service.apply_to_vacancy(db, candidate_id=candidate.id, vacancy_id=vacancy_id)
    return Application.model_validate(application, from_attributes=True)


@router.get("/candidates/me/applications", response_model=list[Application])
def list_my_applications(
    current_user: User = Depends(require_candidate), db: Session = Depends(get_db)
) -> list[Application]:
    candidate = get_profile_by_user_id(db, user_id=current_user.id)
    rows = service.list_my_applications(db, candidate_id=candidate.id)
    return [Application.model_validate(r, from_attributes=True) for r in rows]


# ---------------------------------------------------------------------------
# Ranking anónimo, explicación y desbloqueo (empresa)
# ---------------------------------------------------------------------------


@router.get("/match-results/{match_result_id}", response_model=AnonymousCandidateCard)
def get_match_result(
    match_result_id: uuid.UUID,
    current_user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> AnonymousCandidateCard:
    company_id = _company_id_for(current_user, db)
    result = matching_service.get_match_result_for_company_or_404(db, match_result_id=match_result_id, company_id=company_id)
    result = service.ensure_explanation(db, result)  # A5 EXPLAIN bajo demanda (docs/05 §7)
    return service.to_anonymous_card(db, result, company_id=company_id)


@router.post("/match-results/{match_result_id}/unlock", response_model=UnlockedCandidateProfile)
def unlock_match_result(
    match_result_id: uuid.UUID,
    current_user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> UnlockedCandidateProfile:
    company_id = _company_id_for(current_user, db)
    result = matching_service.get_match_result_for_company_or_404(db, match_result_id=match_result_id, company_id=company_id)
    unlock = service.unlock_candidate(db, result=result, company_id=company_id)
    return service.build_unlocked_profile(db, result, company_id=company_id, unlock=unlock)


@router.get("/match-results/{match_result_id}/full", response_model=UnlockedCandidateProfile)
def get_full_profile(
    match_result_id: uuid.UUID,
    current_user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> UnlockedCandidateProfile:
    company_id = _company_id_for(current_user, db)
    result = matching_service.get_match_result_for_company_or_404(db, match_result_id=match_result_id, company_id=company_id)
    unlock = service.require_unlock(db, result=result, company_id=company_id)  # 403 UNLOCK_REQUIRED sin fila
    return service.build_unlocked_profile(db, result, company_id=company_id, unlock=unlock)


@router.put("/match-results/{match_result_id}/shortlist", response_model=ShortlistEntry | None)
def set_shortlist_stage(
    match_result_id: uuid.UUID,
    payload: ShortlistStageInput,
    current_user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> ShortlistEntry | None:
    company_id = _company_id_for(current_user, db)
    result = matching_service.get_match_result_for_company_or_404(db, match_result_id=match_result_id, company_id=company_id)
    return service.set_shortlist_stage(db, result=result, company_id=company_id, stage=payload.stage)


# ---------------------------------------------------------------------------
# Comparador y finalistas (por vacante)
# ---------------------------------------------------------------------------


@router.get("/vacancies/{vacancy_id}/compare", response_model=CompareView)
def compare_candidates(
    vacancy_id: uuid.UUID,
    ids: str = Query(..., description="IDs de match_result separados por coma, máximo 3"),
    current_user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> CompareView:
    company_id = _company_id_for(current_user, db)
    vacancy = vacancies_service.get_vacancy_for_company_or_404(db, vacancy_id=vacancy_id, company_id=company_id)
    match_result_ids = [uuid.UUID(part) for part in ids.split(",") if part.strip()]
    return service.compare(db, vacancy=vacancy, match_result_ids=match_result_ids, company_id=company_id)


@router.get("/vacancies/{vacancy_id}/shortlist", response_model=list[ShortlistEntry])
def get_shortlist(
    vacancy_id: uuid.UUID,
    current_user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> list[ShortlistEntry]:
    company_id = _company_id_for(current_user, db)
    vacancy = vacancies_service.get_vacancy_for_company_or_404(db, vacancy_id=vacancy_id, company_id=company_id)
    return service.get_shortlist(db, vacancy=vacancy, company_id=company_id)
