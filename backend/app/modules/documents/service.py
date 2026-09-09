"""Servicios de dominio para `documents` (docs/04 §5.3).

`upload_cv` es asíncrono (202 + `job_id`, docs/04 §9): el parseo real ocurre
en `run_cv_parse_job`, que corre en `BackgroundTasks` vía `app/core/jobs.py`.
`upload_certification` es síncrono (el contrato HTTP la devuelve como
`DocumentRef` directo, sin job).

**Límite de alcance con B5**: `run_cv_parse_job` ejercita `AIPort.parse_cv` de
punta a punta (job `CV_PARSE` completo, `ai_invocations` poblada) pero usa un
texto de marcador de posición derivado del nombre del archivo como
`document_text` — igual que hace `frontend/src/api/mock/engine/cv.ts`, que
tampoco lee el contenido real. La extracción real de texto (`pypdf` /
`python-docx`) y la persistencia en `cv_extractions`/`claims` son alcance de
B5 (`docs/build/05_BACKEND_TASKS.md` fila B5). Este worker solo garantiza que
el documento termina en `PARSED`/`FAILED` y dispara la operación de IA
correspondiente; B5 debe reemplazar el texto de marcador de posición y
agregar la persistencia de la extracción, sin tener que tocar el contrato del
job ni el endpoint de subida.
"""

from __future__ import annotations

import uuid

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.contracts.profiling import CVParseRequest, CVParseResult
from app.ai.invoke import invoke
from app.core.errors import AIProviderError, AIValidationError
from app.core.jobs import Job, create_job
from app.modules.candidates.models import CandidateProfile
from app.modules.catalog.models import JobFamily
from app.modules.documents.models import Document
from app.modules.documents.storage import get_storage
from app.modules.documents.validation import validate_upload


def _read_upload(upload_file: UploadFile) -> bytes:
    upload_file.file.seek(0)
    return upload_file.file.read()


def list_documents(db: Session, *, owner_user_id: uuid.UUID, type_filter: str | None = None) -> list[Document]:
    query = select(Document).where(Document.owner_user_id == owner_user_id)
    if type_filter:
        query = query.where(Document.type == type_filter)
    query = query.order_by(Document.uploaded_at.desc())
    return list(db.execute(query).scalars().all())


def _store_document(
    db: Session, *, owner_user_id: uuid.UUID, doc_type: str, upload_file: UploadFile
) -> Document:
    content = _read_upload(upload_file)
    filename = upload_file.filename or doc_type.lower()
    mime = validate_upload(filename=filename, content=content)

    storage = get_storage()
    storage_key = storage.save(owner_user_id=owner_user_id, doc_type=doc_type, filename=filename, content=content)

    document = Document(
        owner_user_id=owner_user_id,
        type=doc_type,
        storage_key=storage_key,
        original_filename=filename,
        mime_type=mime,
        size_bytes=len(content),
        status="UPLOADED",
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def upload_cv(db: Session, *, owner_user_id: uuid.UUID, upload_file: UploadFile) -> Job:
    document = _store_document(db, owner_user_id=owner_user_id, doc_type="CV", upload_file=upload_file)
    job = create_job(db, type_="CV_PARSE", payload={"document_id": str(document.id)})
    return job


def upload_certification(
    db: Session, *, owner_user_id: uuid.UUID, upload_file: UploadFile, skill_code: str | None = None
) -> Document:
    # `skill_code` viaja en el contrato (`uploadCertification(file, skillCode?)`) para que B7
    # pueda vincular la evidencia documental a una `skill_evidences` cuando esa tabla exista.
    # `documents` (docs/04 §5.3) no tiene columna para ello; no se persiste aquí a propósito.
    del skill_code
    return _store_document(db, owner_user_id=owner_user_id, doc_type="CERTIFICATION", upload_file=upload_file)


def cv_parse_worker(db: Session, job: Job) -> str | None:
    """Worker del job `CV_PARSE`. Ver límite de alcance con B5 en el docstring del módulo."""

    document_id = uuid.UUID(job.payload["document_id"])
    document = db.get(Document, document_id)
    if document is None:
        raise ValueError(f"El documento {document_id} ya no existe.")

    document.status = "PROCESSING"
    db.flush()

    job_family_code = None
    profile = db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == document.owner_user_id)
    ).scalar_one_or_none()
    if profile is not None and profile.job_family_id is not None:
        family = db.get(JobFamily, profile.job_family_id)
        job_family_code = family.code if family else None

    placeholder_text = (
        f"Documento subido por el candidato: {document.original_filename}. "
        "Extracción real de texto (pypdf/python-docx) es alcance de B5; este backend "
        "usa un texto de marcador de posición para ejercitar AIPort.parse_cv y el runner de jobs."
    )
    request = CVParseRequest(document_id=str(document.id), job_family_code=job_family_code, document_text=placeholder_text)

    try:
        result = invoke(db, "parse_cv", request, CVParseResult, prompt_version="v1")
    except (AIProviderError, AIValidationError):
        document.status = "FAILED"
        db.commit()  # commit explícito: si no, el rollback de run_job() lo descartaría (ver app/core/jobs.py)
        raise

    document.status = "PARSED" if result.status == "PARSED" else "FAILED"
    return str(document.id)
