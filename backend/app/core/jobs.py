"""Operaciones asíncronas: modelo `jobs` (docs/04 §5.8) y su runner (docs/04 §9).

Patrón único para las cuatro operaciones lentas (`CV_PARSE`, `INTERVIEW_EVALUATE`,
`PROFILE_BUILD`, `MATCH_RUN`):

```
POST /algo         -> 202 { job_id }      (create_job + BackgroundTasks.add_task(run_job, ...))
GET  /jobs/{id}     -> { status, progress, result_ref }   (polling cada 1.5-2 s)
```

Ciclo de vida `QUEUED -> RUNNING -> DONE | FAILED`. La garantía de esta pieza
(y la razón por la que vive en `app/core/`, no en un módulo de dominio): **un
job fallido nunca deja el perfil en un estado inconsistente** (HU-C03). Se
logra así: `run_job` le pasa al `worker` la misma sesión de SQLAlchemy con la
que va a marcar el job `DONE`; el `worker` puede mutar filas de dominio en esa
sesión pero **no debe comitear por su cuenta**. Si el `worker` lanza cualquier
excepción, `run_job` hace `rollback()` antes de marcar `FAILED` — así se
descarta también cualquier escritura a medias que el `worker` haya dejado
pendiente. Si el `worker` termina bien, su(s) cambio(s) y el `DONE` del job se
comitean juntos, atómicamente.

Upgrade path documentado en docs/04 §9: si `BackgroundTasks` no alcanza,
Redis + `arq` con el mismo contrato de tabla, sin tocar el frontend.
"""

from __future__ import annotations

import uuid
from collections.abc import Callable
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.core.errors import NotFoundError
from app.database import Base, SessionLocal, get_db

logger = structlog.get_logger("jobs")

JOB_TYPES = ("CV_PARSE", "INTERVIEW_EVALUATE", "PROFILE_BUILD", "MATCH_RUN")
JOB_STATUSES = ("QUEUED", "RUNNING", "DONE", "FAILED")

#: Firma del worker de un job: recibe la sesión activa y la fila `Job` (ya en
#: RUNNING) y devuelve el `result_ref` final, o `None`. No debe comitear.
JobWorker = Callable[[Session, "Job"], "str | None"]


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="QUEUED")
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    result_ref: Mapped[str | None] = mapped_column(String(200), nullable=True)
    error: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class JobSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    status: str
    progress: int
    result_ref: str | None
    error: str | None


def create_job(db: Session, *, type_: str, payload: dict | None = None) -> Job:
    if type_ not in JOB_TYPES:
        raise ValueError(f"Tipo de job desconocido: {type_!r}. Válidos: {JOB_TYPES}.")
    job = Job(type=type_, status="QUEUED", payload=payload or {}, progress=0)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def get_job(db: Session, job_id: uuid.UUID) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise NotFoundError("El job solicitado no existe.")
    return job


def run_job(job_id: uuid.UUID, worker: JobWorker) -> None:
    """Corre `worker` para `job_id` en una sesión propia. Pensado para `BackgroundTasks.add_task`."""

    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        if job is None:
            logger.warning("job_not_found_at_start", job_id=str(job_id))
            return

        job.status = "RUNNING"
        db.commit()

        try:
            result_ref = worker(db, job)
        except Exception as exc:  # noqa: BLE001 — cualquier falla del worker marca el job FAILED
            db.rollback()  # descarta cualquier escritura a medias del worker (HU-C03)
            job = db.get(Job, job_id)
            if job is not None:
                job.status = "FAILED"
                job.error = str(exc)[:2000]
                job.finished_at = datetime.now(timezone.utc)
                db.commit()
            logger.error("job_failed", job_id=str(job_id), error=str(exc))
            return

        job.status = "DONE"
        job.progress = 100
        job.result_ref = result_ref
        job.finished_at = datetime.now(timezone.utc)
        db.commit()
        logger.info("job_done", job_id=str(job_id), type=job.type)
    finally:
        db.close()


router = APIRouter(tags=["jobs"])


@router.get("/jobs/{job_id}", response_model=JobSchema)
def get_job_endpoint(job_id: uuid.UUID, db: Session = Depends(get_db)) -> JobSchema:
    job = get_job(db, job_id)
    return JobSchema.model_validate(job)
