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
