"""Esquemas Pydantic v2 equivalentes a `JobFamily`/`Competency`/`Skill` del contrato."""

from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict

JobFamilyCode = Literal["ADMIN_ASSISTANT", "HEAVY_MACHINERY_OPERATOR", "WAREHOUSE_SUPERVISOR"]
CompetencyType = Literal["TECHNICAL", "BEHAVIORAL"]


class JobFamily(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: JobFamilyCode
    name: str
    role_objective: str


class Competency(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_family_id: uuid.UUID
    code: str
    name: str
    type: CompetencyType
    description: str
    is_core: bool


class Skill(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    category: str


InterviewBlock = Literal["HARD", "SOFT"]


class FollowUpSuggestion(BaseModel):
    """Uno de los tipos de seguimiento adaptativo de master prompt §19."""

    type: Literal["PROFUNDIZACION", "PROCEDIMIENTO", "VERIFICACION", "RIESGO", "CONSISTENCIA", "RESULTADO"]
    text: str


class RiskFlagTrigger(BaseModel):
    """Condición que, de observarse en la respuesta, produce una `RiskFlag` (master prompt §18)."""

    code: str
    severity: Literal["low", "medium", "high"]
    when: str


class InterviewQuestion(BaseModel):
    """Pregunta base del banco de entrevista (docs/build/06_INTERVIEW_SYSTEM.md §2).

    `question_id` (ej. `HA-01`) es estable: es la llave de comparabilidad entre
    candidatos y entre versiones del banco. El campo `text` es la pregunta
    literal del master prompt del cliente — nunca vive en un prompt de LLM.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_family_id: uuid.UUID
    question_id: str
    block: InterviewBlock
    sequence: int
    competency_id: uuid.UUID
    competency_code: str
    competency_name: str
    text: str
    evaluates: list[str]
    suggested_follow_ups: list[FollowUpSuggestion]
    no_experience_variant: str | None
    risk_flag_triggers: list[RiskFlagTrigger]
    version: int
