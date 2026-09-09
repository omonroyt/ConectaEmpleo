"""Modelos `match_runs` / `match_results` (docs/04 §5.7).

Desviaciones aditivas respecto al listado literal de columnas de docs/04 §5.7,
documentadas también en `docs/build/00_BUILD_STATE.md` (mismo patrón que otras
tareas: `interview_session_id` en B7, `weights` en `Vacancy` de B8):

1. `MatchResult.vacancy_id`: docs/04 solo pone `match_run_id` (de donde se
   podría derivar el `vacancy_id` vía `MatchRun.vacancy_id`), pero
   desnormalizarlo aquí evita un join extra en cada consulta de marketplace
   (`GET /vacancies/{id}/compare`, `GET /vacancies/{id}/shortlist`, chequeos
   de propiedad) que se ejecutan mucho más seguido que un `match_run`.
2. `MatchResult.extra` (jsonb): guarda `evidence_counts`, `years_experience`,
   `geo_band`, `salary_band` y `availability` -- los campos descriptivos de
   `AnonymousCandidateCard` que **no** son parte del score (`total_score`/
   `breakdown`/`penalties` sí son columnas propias, son los que exige
   auditar). Se calculan una sola vez en el momento del run (con el mismo
   `MatchComputation` que produce el `breakdown`) y se congelan aquí en vez de
   recalcularse en cada lectura, para que la tarjeta de un ranking viejo siga
   mostrando exactamente lo que se vio en su momento -- mismo espíritu que
   `weights_snapshot`.
3. `MatchResult.shortlist_stage` / `shortlisted_at`: el contrato
   (`docs/build/02_API_CONTRACT.md` `ShortlistEntry`, `PUT
   /match-results/{id}/shortlist`) exige poder marcar una etapa de finalista
   por resultado; se modela como columnas mutables de este resultado (no como
   una tabla aparte) porque el finalista siempre se refiere a un resultado de
   un run concreto -- si la empresa vuelve a correr el match, el nuevo run
   trae resultados nuevos y el shortlist se reconstruye sobre ellos. Documentado
   en la bitácora de B9/B10.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

SHORTLIST_STAGES = ("REVIEW", "INTERVIEW", "FINALIST")


class MatchRun(Base):
    __tablename__ = "match_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vacancy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vacancies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    executed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    algorithm_version: Mapped[str] = mapped_column(String(40), nullable=False)
    #: Copia de `Vacancy.weights` en el instante del run (docs/04 §5.7): un
    #: ranking viejo sigue siendo explicable aunque la empresa cambie los
    #: pesos después.
    weights_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    candidates_evaluated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    results: Mapped[list["MatchResult"]] = relationship(
        back_populates="match_run", cascade="all, delete-orphan", order_by="MatchResult.rank_position"
    )


class MatchResult(Base):
    __tablename__ = "match_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    match_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("match_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id"), nullable=False, index=True
    )
    vacancy_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("vacancies.id", ondelete="CASCADE"), nullable=False, index=True
    )

    total_score: Mapped[int] = mapped_column(Integer, nullable=False)
    breakdown: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    penalties: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    strengths: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    gaps: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    explanation_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    rank_position: Mapped[int] = mapped_column(Integer, nullable=False)

    # --- Aditivos (ver docstring del módulo) ---
    extra: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    shortlist_stage: Mapped[str | None] = mapped_column(String(20), nullable=True)
    shortlisted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    match_run: Mapped[MatchRun] = relationship(back_populates="results")

    __table_args__ = (UniqueConstraint("match_run_id", "candidate_id", name="uq_match_result_run_candidate"),)
