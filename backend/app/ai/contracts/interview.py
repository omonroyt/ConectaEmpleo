"""A2 Entrevistador — `InterviewTurn*` (docs/05 §7 A2, docs/04 §6.2).

Operación 3 de las 9 de `AIPort` v1.1. El agente **no califica** — solo decide
la siguiente acción de la entrevista.
"""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.ai.contracts.base import (
    AIBaseModel,
    AnswerInterpretation,
    CandidateSnapshotForAI,
    ClaimDTO,
    ContractVersion,
    CoverageStatus,
    QuestionIntent,
    RubricSpec,
    TurnDTO,
)

InterviewAction = Literal["ASK", "PROBE", "SWITCH_COMPETENCY", "FINISH"]


class InterviewTurnRequest(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    session_id: str
    job_family_code: str
    candidate_snapshot: CandidateSnapshotForAI
    rubrics: list[RubricSpec]
    claims: list[ClaimDTO] = Field(default_factory=list)
    history: list[TurnDTO] = Field(default_factory=list)
    coverage_state: dict[str, CoverageStatus] = Field(default_factory=dict)
    remaining_questions: int = Field(ge=0)
    # B6 — Guardián de Equidad (docs/05 §7 S2, docs/build/00_BUILD_STATE.md B6):
    # cuando el Guardián bloquea una propuesta, pide **una** reformulación
    # pasando aquí el motivo del bloqueo (nunca el texto bloqueado en sí, para
    # no anclar al agente a repetir la misma redacción). `None` en cualquier
    # llamada normal fuera de un reintento de reformulación. Campo aditivo:
    # opcional, no rompe ninguna llamada existente.
    guardian_feedback: str | None = None


class InterviewTurnResult(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    # --- Capa de comprensión (B14) ---
    # Va **antes** de `action` y `question_text` a propósito: el esquema se
    # llena en orden, así que el agente está obligado a interpretar la
    # respuesta anterior antes de decidir qué preguntar. Es la etapa intermedia
    # que evita citar el transcript crudo ("Mencionó que 'Sí, eh,...'").
    # Aditivo y opcional: `None` cuando no hay respuesta previa que interpretar
    # (primera pregunta del recorrido) o cuando el adaptador no la produjo.
    answer_interpretation: AnswerInterpretation | None = None
    action: InterviewAction
    question_text: str | None = None
    target_competency_code: str | None = None
    question_intent: QuestionIntent | None = None
    references_turn_id: str | None = None
    rationale: str = Field(min_length=1)
    coverage_update: dict[str, CoverageStatus] = Field(default_factory=dict)
