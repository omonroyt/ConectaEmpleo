"""Jobs `INTERVIEW_EVALUATE` y `PROFILE_BUILD`, encadenados desde
`POST /interviews/{id}/complete` (docs/build/00_BUILD_STATE.md, fila B7).

Mismo patrón de `app/core/jobs.py` (docs/04 §9): cada worker recibe la
sesión activa y la fila `Job` ya en `RUNNING`, y no debe comitear por su
cuenta más allá de lo que el propio dominio necesite (aquí sí comiteamos
explícitamente dentro de `assessments/service.py`, igual que hace
`documents/service.py::cv_parse_worker` — es una excepción ya establecida en
el proyecto para poder registrar estados intermedios, ver comentario de B5).

`complete()` devuelve un único `job_id` (el de `INTERVIEW_EVALUATE`), tal
como exige el contrato (`interviews.complete(id) → JobRef`). El job de
`PROFILE_BUILD` se crea y corre **desde aquí** una vez que la evaluación
terminó bien -- por eso "encadenados": el frontend nunca necesita conocer el
segundo `job_id`, pero ambos quedan en la tabla `jobs` para auditoría
(`GET /admin/ai-invocations`/`jobs` de B13). Si el perfil quedó construido, al
final se recalcula el ranking de las vacantes abiertas de su familia (un
`MATCH_RUN` por vacante).
"""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.core.jobs import Job, create_job, run_job
from app.database import SessionLocal
from app.modules.assessments import service
from app.modules.interviews.models import InterviewSession
from app.modules.matching import service as matching_service
from app.modules.matching.jobs import create_match_run_job, match_run_worker


def create_evaluate_job(db: Session, *, session_id: uuid.UUID) -> Job:
    return create_job(db, type_="INTERVIEW_EVALUATE", payload={"interview_session_id": str(session_id)})


def evaluate_worker(db: Session, job: Job) -> str | None:
    session_id = uuid.UUID(job.payload["interview_session_id"])
    session = db.get(InterviewSession, session_id)
    if session is None:
        raise ValueError(f"La sesión de entrevista {session_id} ya no existe.")

    result = service.run_evaluation(db, session)
    rows = service.persist_evaluations(db, candidate_id=session.candidate_id, session=session, result=result)
    return f"{len(rows)} evaluaciones persistidas para la sesión {session_id}"


def profile_build_worker(db: Session, job: Job) -> str | None:
    session_id = uuid.UUID(job.payload["interview_session_id"])
    session = db.get(InterviewSession, session_id)
    if session is None:
        raise ValueError(f"La sesión de entrevista {session_id} ya no existe.")

    profile_row = service.build_and_persist_talent_profile(db, session=session)
    return str(profile_row.id)


def run_interview_pipeline(evaluate_job_id: uuid.UUID, session_id: uuid.UUID) -> None:
    """Callback de `BackgroundTasks`: corre `INTERVIEW_EVALUATE` y, si tuvo
    éxito, encadena `PROFILE_BUILD`. Si A3 falla, el candidato queda
    `PENDING_EVALUATION` (reintentable) y `PROFILE_BUILD` ni se crea — A3 no
    tiene fallback funcional (docs/05 §11.1: "una calificación mala es peor
    que una calificación ausente")."""

    run_job(evaluate_job_id, evaluate_worker)

    db = SessionLocal()
    try:
        evaluate_job = db.get(Job, evaluate_job_id)
        if evaluate_job is None or evaluate_job.status != "DONE":
            return
        profile_job = create_job(db, type_="PROFILE_BUILD", payload={"interview_session_id": str(session_id)})
        profile_job_id = profile_job.id
    finally:
        db.close()

    run_job(profile_job_id, profile_build_worker)
    refresh_rankings_after_evaluation(profile_job_id, session_id)


def refresh_rankings_after_evaluation(profile_job_id: uuid.UUID, session_id: uuid.UUID) -> None:
    """Tras `PROFILE_BUILD`, recalcula el ranking de las vacantes abiertas de la
    familia del candidato: quien acaba de evaluarse aparece en el talento
    compatible sin que la empresa tenga que volver a correr el matching. Es el
    mismo job `MATCH_RUN` que dispara `POST /vacancies/{id}/match-runs`, uno por
    vacante; el cálculo es determinista y no llama a la IA."""

    db = SessionLocal()
    try:
        profile_job = db.get(Job, profile_job_id)
        session = db.get(InterviewSession, session_id)
        if profile_job is None or profile_job.status != "DONE" or session is None:
            return
        vacancy_ids = matching_service.open_vacancy_ids_for_candidate(db, candidate_id=session.candidate_id)
        match_job_ids = [create_match_run_job(db, vacancy_id=vacancy_id).id for vacancy_id in vacancy_ids]
    finally:
        db.close()

    for job_id in match_job_ids:
        run_job(job_id, match_run_worker)
