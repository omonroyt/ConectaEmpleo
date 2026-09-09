"""Job `MATCH_RUN` (docs/04 §5.8/§9): `POST /vacancies/{id}/match-runs` → 202
`{job_id}`, corrido en background con el mismo patrón de `app/core/jobs.py`
que ya usan `CV_PARSE`/`INTERVIEW_EVALUATE`/`PROFILE_BUILD`.
"""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.core.jobs import Job, create_job
from app.modules.matching import service


def create_match_run_job(db: Session, *, vacancy_id: uuid.UUID) -> Job:
    return create_job(db, type_="MATCH_RUN", payload={"vacancy_id": str(vacancy_id)})


def match_run_worker(db: Session, job: Job) -> str | None:
    vacancy_id = uuid.UUID(job.payload["vacancy_id"])
    match_run = service.run_match(db, vacancy_id=vacancy_id)
    return str(match_run.id)
