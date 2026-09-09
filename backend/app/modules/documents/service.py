"""Servicios de dominio para `documents` (docs/04 §5.3).

`upload_cv` es asíncrono (202 + `job_id`, docs/04 §9): el parseo real ocurre
en `cv_parse_worker`, que corre en `BackgroundTasks` vía `app/core/jobs.py`.
`upload_certification` es síncrono (el contrato HTTP la devuelve como
`DocumentRef` directo, sin job).

**B5**: `cv_parse_worker` lee el archivo real del `StoragePort`, extrae texto
con `extraction.py` (`pypdf`/`python-docx`) y llama a `AIPort.parse_cv` con
ese texto real. Un PDF escaneado, dañado o una imagen sin texto seleccionable
no rompen el job: `CVTextExtractionError` se traduce en `Document.status =
FAILED` con un mensaje accionable en `Job.error`, **sin tocar el perfil**
(HU-C03) — ni siquiera se llega a invocar `AIPort.parse_cv`. Si la extracción
de texto sí produce contenido utilizable, el resultado validado de
`parse_cv` se persiste como `CVExtraction` + `claims`
(`cv_extraction_service.py`), separado del perfil hasta que el candidato la
confirme (`PATCH /candidates/me/cv/extraction`, HU-C05).
"""

from __future__ import annotations

import uuid

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.contracts.profiling import CVParseRequest, CVParseResult
from app.ai.invoke import invoke
from app.ai.models import AIInvocation
from app.core.errors import AIProviderError, AIValidationError
from app.core.jobs import Job, create_job
from app.modules.candidates.models import CandidateProfile
from app.modules.catalog.models import JobFamily
from app.modules.documents import cv_extraction_service
from app.modules.documents.extraction import CVTextExtractionError, extract_text
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
    """Worker del job `CV_PARSE`. Ver docstring del módulo para el alcance de B5."""

    document_id = uuid.UUID(job.payload["document_id"])
    document = db.get(Document, document_id)
    if document is None:
        raise ValueError(f"El documento {document_id} ya no existe.")

    document.status = "PROCESSING"
    db.flush()

    profile = db.execute(
        select(CandidateProfile).where(CandidateProfile.user_id == document.owner_user_id)
    ).scalar_one_or_none()
    if profile is None:
        raise ValueError(f"No existe un perfil de candidato para el usuario {document.owner_user_id}.")

    job_family_code = None
    if profile.job_family_id is not None:
        family = db.get(JobFamily, profile.job_family_id)
        job_family_code = family.code if family else None

    storage = get_storage()
    content = storage.load(document.storage_key)

    try:
        document_text = extract_text(mime_type=document.mime_type, content=content)
    except CVTextExtractionError:
        # HU-C03: texto insuficiente (PDF escaneado, imagen, archivo dañado) -> FAILED,
        # el perfil no se toca, y ni siquiera se invoca AIPort.parse_cv con basura.
        document.status = "FAILED"
        db.commit()
        raise

    request = CVParseRequest(document_id=str(document.id), job_family_code=job_family_code, document_text=document_text)

    try:
        result = invoke(db, "parse_cv", request, CVParseResult, prompt_version="v1")
    except (AIProviderError, AIValidationError):
        document.status = "FAILED"
        db.commit()  # commit explícito: si no, el rollback de run_job() lo descartaría (ver app/core/jobs.py)
        raise

    if result.status != "PARSED":
        document.status = "FAILED"
        db.commit()
        raise AIValidationError(
            "El análisis de IA no pudo extraer un CV utilizable de este documento."
        )

    document.status = "PARSED"

    ai_invocation = db.execute(
        select(AIInvocation)
        .where(AIInvocation.operation == "parse_cv")
        .order_by(AIInvocation.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    extraction = cv_extraction_service.persist_extraction_from_parse(
        db,
        document=document,
        candidate_id=profile.id,
        result=result,
        ai_invocation_id=ai_invocation.id if ai_invocation is not None else None,
    )
    return str(extraction.id)
