"""Ciclo de vida de un job (`app/core/jobs.py`, docs/04 §9).

Usa `SessionLocal` real directamente (no los fixtures `client`/`db_session`,
que envuelven cada test en una transacción con rollback): `run_job` abre su
propia sesión a propósito, como lo haría en producción dentro de
`BackgroundTasks`, así que probarlo de verdad requiere que sus escrituras
lleguen a la base real. Cada test limpia su propia fila al terminar.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.jobs import Job, create_job, run_job
from app.database import SessionLocal


def _cleanup(job_id) -> None:
    db = SessionLocal()
    try:
        job = db.get(Job, job_id)
        if job is not None:
            db.delete(job)
            db.commit()
    finally:
        db.close()


def test_job_lifecycle_success_reaches_done_with_progress_and_result_ref() -> None:
    db: Session = SessionLocal()
    try:
        job = create_job(db, type_="MATCH_RUN", payload={"note": "test"})
        job_id = job.id
        assert job.status == "QUEUED"
    finally:
        db.close()

    def _worker(worker_db: Session, worker_job: Job) -> str:
        assert worker_job.status == "RUNNING"
        return "some-result-ref"

    try:
        run_job(job_id, _worker)

        db2 = SessionLocal()
        try:
            finished = db2.get(Job, job_id)
            assert finished.status == "DONE"
            assert finished.progress == 100
            assert finished.result_ref == "some-result-ref"
            assert finished.error is None
            assert finished.finished_at is not None
        finally:
            db2.close()
    finally:
        _cleanup(job_id)


def test_job_lifecycle_failure_marks_failed_and_discards_partial_writes() -> None:
    db: Session = SessionLocal()
    try:
        job = create_job(db, type_="CV_PARSE", payload={})
        job_id = job.id
    finally:
        db.close()

    def _failing_worker(worker_db: Session, worker_job: Job) -> str:
        # Escritura a medias que debe descartarse: nunca se comitea explícitamente aquí.
        worker_job.result_ref = "should-not-be-persisted"
        raise RuntimeError("fallo simulado del worker")

    try:
        run_job(job_id, _failing_worker)

        db2 = SessionLocal()
        try:
            finished = db2.get(Job, job_id)
            assert finished.status == "FAILED"
            assert "fallo simulado" in (finished.error or "")
            # La escritura a medias del worker (`result_ref`) nunca se comiteó (HU-C03).
            assert finished.result_ref is None
        finally:
            db2.close()
    finally:
        _cleanup(job_id)
