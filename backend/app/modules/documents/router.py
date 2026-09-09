"""`POST /candidates/me/cv` · `POST /candidates/me/certifications` · `GET /candidates/me/documents`.

`docs/build/02_API_CONTRACT.md` §4. `GET .../documents?type=` resuelve la
deuda D-01 de `docs/build/00_BUILD_STATE.md` (listar certificaciones ya
subidas, que el mock del frontend no podía hacer).
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.jobs import run_job
from app.core.security import require_candidate
from app.database import get_db
from app.modules.documents import service
from app.modules.documents.models import Document
from app.modules.documents.schemas import DocumentRef, DocumentType
from app.modules.documents.service import cv_parse_worker
from app.modules.documents.storage import get_storage
from app.modules.identity.models import User

router = APIRouter(prefix="/candidates/me", tags=["documents"])


class JobRef(BaseModel):
    job_id: uuid.UUID


def _to_ref(document: Document) -> DocumentRef:
    storage = get_storage()
    return DocumentRef(
        id=document.id,
        type=document.type,
        original_filename=document.original_filename,
        mime_type=document.mime_type,
        size_bytes=document.size_bytes,
        status=document.status,
        uploaded_at=document.uploaded_at,
        url=storage.url_for(document.storage_key),
    )


@router.post("/cv", response_model=JobRef, status_code=202)
def upload_cv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> JobRef:
    job = service.upload_cv(db, owner_user_id=current_user.id, upload_file=file)
    background_tasks.add_task(run_job, job.id, cv_parse_worker)
    return JobRef(job_id=job.id)


@router.post("/certifications", response_model=DocumentRef)
def upload_certification(
    file: UploadFile = File(...),
    skill_code: str | None = Form(default=None),
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> DocumentRef:
    document = service.upload_certification(
        db, owner_user_id=current_user.id, upload_file=file, skill_code=skill_code
    )
    return _to_ref(document)


@router.get("/documents", response_model=list[DocumentRef])
def list_my_documents(
    type: DocumentType | None = Query(default=None),
    current_user: User = Depends(require_candidate),
    db: Session = Depends(get_db),
) -> list[DocumentRef]:
    documents = service.list_documents(db, owner_user_id=current_user.id, type_filter=type)
    return [_to_ref(d) for d in documents]
