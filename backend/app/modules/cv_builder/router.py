"""CV conversacional (A1 modo BUILD): `POST /cv-builder/sessions` y derivados.

`docs/build/02_API_CONTRACT.md` §4, filas `cvBuilder.*`. El adaptador de IA es
sin estado a propósito (`docs/05 §7 A1`): la sesión, los turnos y el documento
generado se persisten aquí, no en la capa de IA.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import require_candidate
from app.database import get_db
from app.modules.candidates import service as candidates_service
from app.modules.cv_builder import service
from app.modules.cv_builder.schemas import (
    CVBuilderReply,
    CVDocument,
    SendMessageInput,
)
from app.modules.documents.schemas import CVExtraction
from app.modules.identity.models import User

router = APIRouter(prefix="/cv-builder", tags=["cv-builder"])


@router.post("/sessions", response_model=CVBuilderReply, status_code=201)
def create_session(
    current_user: User = Depends(require_candidate), db: Session = Depends(get_db)
) -> CVBuilderReply:
    profile = candidates_service.get_profile_by_user_id(db, user_id=current_user.id)
    return service.create_session(db, profile=profile)


@router.post("/sessions/{session_id}/messages", response_model=CVBuilderReply)
def send_message(
    session_id: uuid.UUID,
    payload: SendMessageInput,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CVBuilderReply:
    profile = candidates_service.get_profile_by_user_id(db, user_id=current_user.id)
    session = service.get_session(db, session_id=session_id, candidate_id=profile.id)
    return service.send_message(db, session=session, profile=profile, text=payload.text)


@router.post("/sessions/{session_id}/finalize", response_model=CVExtraction)
def finalize_session(
    session_id: uuid.UUID,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CVExtraction:
    profile = candidates_service.get_profile_by_user_id(db, user_id=current_user.id)
    session = service.get_session(db, session_id=session_id, candidate_id=profile.id)
    return service.finalize_session(db, session=session, profile=profile)


@router.get("/sessions/{session_id}/document", response_model=CVDocument)
def get_document(
    session_id: uuid.UUID,
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> CVDocument:
    profile = candidates_service.get_profile_by_user_id(db, user_id=current_user.id)
    session = service.get_session(db, session_id=session_id, candidate_id=profile.id)
    return service.get_document(session)
