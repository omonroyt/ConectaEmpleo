"""`POST/GET /vacancies` · `GET/PATCH /vacancies/{id}` · `PUT .../requirements`
· `PUT .../weights` · `POST .../resolve-requirements`.

`docs/build/02_API_CONTRACT.md` §4.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import require_company
from app.database import get_db
from app.modules.companies import service as companies_service
from app.modules.identity.models import User
from app.modules.vacancies import service
from app.modules.vacancies.schemas import (
    RequirementInput,
    RequirementResolution,
    Vacancy,
    VacancyInput,
    VacancyPatch,
    VacancyWeights,
)

router = APIRouter(prefix="/vacancies", tags=["vacancies"])


class ResolveRequirementsInput(BaseModel):
    free_text: str | None = None


def _company_id_for(current_user: User, db: Session) -> uuid.UUID:
    return companies_service.get_company_by_user_id(db, user_id=current_user.id).id


@router.post("", response_model=Vacancy, status_code=201)
def create_vacancy(
    payload: VacancyInput,
    current_user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> Vacancy:
    company_id = _company_id_for(current_user, db)
    vacancy = service.create_vacancy(db, company_id=company_id, payload=payload)
    return service.to_schema(db, vacancy)


@router.get("", response_model=list[Vacancy])
def list_vacancies(
    current_user: User = Depends(require_company), db: Session = Depends(get_db)
) -> list[Vacancy]:
    company_id = _company_id_for(current_user, db)
    vacancies = service.list_vacancies_for_company(db, company_id=company_id)
    return [service.to_schema(db, v) for v in vacancies]


@router.get("/{vacancy_id}", response_model=Vacancy)
def get_vacancy(
    vacancy_id: uuid.UUID,
    current_user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> Vacancy:
    company_id = _company_id_for(current_user, db)
    vacancy = service.get_vacancy_for_company_or_404(db, vacancy_id=vacancy_id, company_id=company_id)
    return service.to_schema(db, vacancy)


@router.patch("/{vacancy_id}", response_model=Vacancy)
def patch_vacancy(
    vacancy_id: uuid.UUID,
    patch: VacancyPatch,
    current_user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> Vacancy:
    company_id = _company_id_for(current_user, db)
    vacancy = service.get_vacancy_for_company_or_404(db, vacancy_id=vacancy_id, company_id=company_id)
    vacancy = service.apply_patch(db, vacancy, patch)
    return service.to_schema(db, vacancy)


@router.put("/{vacancy_id}/requirements", response_model=Vacancy)
def put_requirements(
    vacancy_id: uuid.UUID,
    requirements: list[RequirementInput],
    current_user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> Vacancy:
    company_id = _company_id_for(current_user, db)
    vacancy = service.get_vacancy_for_company_or_404(db, vacancy_id=vacancy_id, company_id=company_id)
    vacancy = service.set_requirements(db, vacancy, requirements)
    return service.to_schema(db, vacancy)


@router.put("/{vacancy_id}/weights", response_model=Vacancy)
def put_weights(
    vacancy_id: uuid.UUID,
    weights: VacancyWeights,
    current_user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> Vacancy:
    company_id = _company_id_for(current_user, db)
    vacancy = service.get_vacancy_for_company_or_404(db, vacancy_id=vacancy_id, company_id=company_id)
    vacancy = service.set_weights(db, vacancy, weights)
    return service.to_schema(db, vacancy)


@router.post("/{vacancy_id}/resolve-requirements", response_model=RequirementResolution)
def resolve_requirements(
    vacancy_id: uuid.UUID,
    payload: ResolveRequirementsInput | None = None,
    current_user: User = Depends(require_company),
    db: Session = Depends(get_db),
) -> RequirementResolution:
    """Interpreta los requisitos escritos en lenguaje natural (A5 modo RESOLVE).

    El cuerpo es opcional: sin él se usa la descripción ya guardada de la
    vacante, que es el caso normal cuando la empresa entra a "perfil ideal"
    justo después de crearla.
    """

    company_id = _company_id_for(current_user, db)
    vacancy = service.get_vacancy_for_company_or_404(db, vacancy_id=vacancy_id, company_id=company_id)
    free_text = (payload.free_text if payload else None) or vacancy.description
    return service.resolve_requirements_for_text(db, vacancy, free_text)
