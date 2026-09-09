"""`AIPort` v1.1 — las 9 operaciones que el backend conoce (docs/05 §8).

Ni una más. El número de agentes, su orquestación interna y su estrategia de
razonamiento (docs/05 §3-§7) pueden cambiar por completo sin tocar esta
interfaz. Ningún módulo de dominio importa de `app/ai/adapters/*` — solo de
este archivo y de `app/ai/contracts/*` (regla no negociable, `backend/CLAUDE.md`).

**Desviación respecto a docs/04 §6.1 y docs/05 §8**: ahí el protocolo se
declara con `async def`. Este backend usa SQLAlchemy síncrono en todo lo
demás (decisión de B0, ver `app/database.py`) y FastAPI ya ejecuta las
dependencias síncronas en threadpool, así que declarar el puerto con `def`
evita mezclar dos estilos de concurrencia sin necesidad real en un adaptador
determinista. Cuando B11 conecte clientes HTTP reales (Anthropic/OpenAI), si
el cliente es async, `AgenticAdapter` puede envolver la llamada con
`asyncio.run` o correr en un hilo — el contrato Protocol no cambia. Anotado en
la bitácora de `docs/build/00_BUILD_STATE.md`.
"""

from __future__ import annotations

from typing import Protocol

from app.ai.contracts.advisory import (
    FeedbackRequest,
    FeedbackResult,
    LearningPathRequest,
    LearningPathResult,
)
from app.ai.contracts.assessment import (
    EvaluationRequest,
    EvaluationResult,
    TalentProfileRequest,
    TalentProfileResult,
)
from app.ai.contracts.interview import InterviewTurnRequest, InterviewTurnResult
from app.ai.contracts.matching import (
    MatchExplanationRequest,
    MatchExplanationResult,
    RequirementResolutionRequest,
    RequirementResolutionResult,
)
from app.ai.contracts.profiling import (
    CVConversationRequest,
    CVConversationResult,
    CVParseRequest,
    CVParseResult,
)


class AIPort(Protocol):
    # --- v1.0 (docs/04 §6.1) ---
    def parse_cv(self, req: CVParseRequest) -> CVParseResult: ...

    def build_cv_conversationally(self, req: CVConversationRequest) -> CVConversationResult: ...

    def next_interview_question(self, req: InterviewTurnRequest) -> InterviewTurnResult: ...

    def evaluate_competencies(self, req: EvaluationRequest) -> EvaluationResult: ...

    def build_talent_profile(self, req: TalentProfileRequest) -> TalentProfileResult: ...

    def explain_match(self, req: MatchExplanationRequest) -> MatchExplanationResult: ...

    # --- v1.1 (docs/05 §8) ---
    def generate_feedback_report(self, req: FeedbackRequest) -> FeedbackResult: ...

    def recommend_learning_path(self, req: LearningPathRequest) -> LearningPathResult: ...

    def resolve_vacancy_requirements(
        self, req: RequirementResolutionRequest
    ) -> RequirementResolutionResult: ...


#: Nombres exactos de las 9 operaciones, en el orden de `docs/05 §8`. Fuente
#: única para `app/ai/registry.py` y `app/ai/invoke.py` — evita que un typo en
#: un nombre de operación pase silenciosamente.
AI_OPERATIONS: tuple[str, ...] = (
    "parse_cv",
    "build_cv_conversationally",
    "next_interview_question",
    "evaluate_competencies",
    "build_talent_profile",
    "explain_match",
    "generate_feedback_report",
    "recommend_learning_path",
    "resolve_vacancy_requirements",
)
