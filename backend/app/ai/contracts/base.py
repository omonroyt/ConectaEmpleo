"""Tipos compartidos por los contratos de `AIPort` v1.1 (docs/05 §8, docs/04 §6.2).

Deliberadamente **no** reutiliza los schemas de `app/modules/candidates/schemas.py`:
el contrato de IA es una superficie versionada independiente del contrato HTTP
(`docs/build/02_API_CONTRACT.md`). Acoplarlos haría que cambiar la API pública
invalidara evaluaciones ya persistidas, o viceversa. Es una decisión de diseño
de este bloque (B4), anotada en la bitácora de `docs/build/00_BUILD_STATE.md`.

`CandidateSnapshotForAI` es el DTO que hace cumplir la invariante I-05: carece
**físicamente** de `full_name`, `photo_url`, `birth_date` y `gender`. No es que
esos campos se omitan al serializar — la clase no los declara, así que no hay
forma de que aparezcan en `model_dump()` / `model_dump_json()` por accidente.
Ver `tests/test_ai_snapshot.py` para el test que lo verifica en frío.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ContractVersion = Literal["1.0", "1.1"]

CoverageStatus = Literal["UNTOUCHED", "PARTIAL", "SUFFICIENT"]
RubricSource = Literal["SPECIFIC", "PROVISIONAL", "BASELINE"]
QuestionIntent = Literal["PROBE", "SCENARIO", "CLARIFY", "SWITCH"]
#: Calidad de la evidencia que aporta **una** respuesta, no de la persona.
#: Gobierna si vale la pena repreguntar; nunca es un juicio ni una nota.
EvidenceQuality = Literal["SUFFICIENT", "PARTIAL", "VAGUE", "OFF_TOPIC", "NO_EXPERIENCE"]


class AIBaseModel(BaseModel):
    """Base estricta: rechaza campos no declarados en cualquier contrato de IA.

    Un campo extra silenciosamente ignorado es exactamente el tipo de bug que
    la invariante I-01 (nada se persiste sin validar) busca prevenir.
    """

    model_config = ConfigDict(extra="forbid")


class LocationDTO(AIBaseModel):
    city: str
    state: str


class ExperienceItemDTO(AIBaseModel):
    company: str
    position: str
    start_date: str
    end_date: str | None = None
    is_current: bool = False
    description: str = ""
    skills: list[str] = Field(default_factory=list)


class EducationItemDTO(AIBaseModel):
    institution: str
    degree: str
    start_year: int
    end_year: int | None = None


class CandidateSnapshotForAI(AIBaseModel):
    """Snapshot anonimizado del candidato para cualquier request a `AIPort` (I-05).

    Nunca declarar aquí `full_name`, `photo_url`, `birth_date` ni `gender`.
    """

    anon_code: str
    job_family_code: str | None = None
    location: LocationDTO | None = None
    availability: str | None = None
    salary_expectation_min: int | None = None
    salary_expectation_max: int | None = None
    education: list[EducationItemDTO] = Field(default_factory=list)
    experience: list[ExperienceItemDTO] = Field(default_factory=list)
    bio: str | None = None


class RubricLevelDTO(AIBaseModel):
    level: int = Field(ge=0, le=4)
    label: str
    descriptor: str


class RubricSpec(AIBaseModel):
    """Rúbrica inyectada en runtime (docs/05 §6.2). Nunca vive en un prompt."""

    competency_code: str
    competency_name: str
    type: Literal["TECHNICAL", "BEHAVIORAL"]
    is_core: bool = False
    version: int
    source: RubricSource
    what_to_probe: list[str] = Field(default_factory=list)
    levels: list[RubricLevelDTO]
    positive_signals: list[str] = Field(default_factory=list)
    negative_signals: list[str] = Field(default_factory=list)
    score_mapping: dict[str, int] = Field(default_factory=dict)


class ClaimDTO(AIBaseModel):
    skill_code: str | None = None
    statement: str
    claimed_level: Literal[1, 2, 3, 4] | None = None
    source: Literal["CV", "CONVERSATION", "MANUAL"] = "CV"
    # B5: apunta al fragmento que originó el claim (docs/05 §7 A1: "cada skill
    # detectada genera un claim con source_ref"). Opcional y por defecto None
    # para no romper contratos v1.1 ya emitidos por B4 que no lo llenaban.
    source_ref: dict | None = None


class AnswerInterpretation(AIBaseModel):
    """Capa de comprensión entre la respuesta cruda y la siguiente pregunta.

    El transcript de voz llega con muletillas, repeticiones y frases cortadas
    ("Sí, te puedo compartir lo que hice. Eh,..."). Citarlo literalmente
    produce repreguntas incoherentes, así que **antes** de decidir qué
    preguntar se traduce a contexto utilizable: qué dijo la persona, sobre qué
    temas, qué le falta a esa respuesta para ser evidencia y, si procede, sobre
    qué conviene profundizar (`probe_focus`).

    Dos reglas duras, ambas verificadas por tests:

    1. `clean_answer` **no agrega** información que la persona no dijo. Es
       limpieza de disfluencias, no reescritura ni interpretación creativa.
    2. `clean_answer` **conserva el registro y el vocabulario** de la persona.
       Subir el registro de una respuesta coloquial rompería la prueba de
       equidad de `docs/build/06_INTERVIEW_SYSTEM.md` §8.4 y contradice la
       Constitución ("La forma de hablar no es la competencia").

    `answer_text` crudo se conserva siempre en `interview_turns` — esto es una
    lectura derivada, nunca un reemplazo de la evidencia original.
    """

    #: Respuesta sin muletillas ni repeticiones, en primera persona, mismo léxico.
    clean_answer: str = ""
    #: 1-2 frases: qué dijo realmente la persona.
    summary: str = ""
    #: Herramientas, sistemas, tareas o cifras mencionadas ("Excel", "conciliación semanal").
    topics: list[str] = Field(default_factory=list)
    evidence_quality: EvidenceQuality = "PARTIAL"
    #: Qué le falta a la respuesta para ser evidencia ("acción concreta", "resultado").
    missing_elements: list[str] = Field(default_factory=list)
    #: Claims del CV con los que esta respuesta choca (texto del claim, no un veredicto).
    contradicts_claims: list[str] = Field(default_factory=list)
    #: Tema ya traducido sobre el que profundizar, o `None` si no hace falta.
    probe_focus: str | None = None


class TurnDTO(AIBaseModel):
    turn_id: str
    sequence: int
    question_text: str
    target_competency_code: str
    question_intent: QuestionIntent
    references_turn_id: str | None = None
    answer_text: str | None = None
    #: Lectura interpretada de `answer_text` (aditivo, `None` en turnos sin
    #: respuesta o anteriores a la capa de comprensión).
    interpretation: AnswerInterpretation | None = None
