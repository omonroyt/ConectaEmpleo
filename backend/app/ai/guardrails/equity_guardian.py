"""S2 — Guardián de Equidad (docs/05 §7 S2, §10.4; Master Prompt §22).

Filtro determinista que corre **entre** la propuesta de A2 (o del banco) y su
emisión al candidato. No es un agente: es una función de Python, cara de
saltarse y barata de auditar — coherente con el principio de docs/05 §2.1
("orquestación determinista, razonamiento delegado").

Bloquea:
1. Preguntas sobre los temas prohibidos del Master Prompt §22 (edad, género,
   estado civil, embarazo, religión, orientación sexual, afiliación política,
   origen étnico, salud, situación familiar).
2. Preguntas con más de una interrogante (`question_text.count("?") > 1`).
3. Preguntas que revelan el criterio de calificación (mencionan rúbrica,
   puntaje, score, nivel 0-4, etc.).

Al bloquear, pide **una** reformulación (parámetro `retry`); si vuelve a
fallar, usa la pregunta de respaldo del banco (`fallback_text`). Todo bloqueo
se registra en `ai_invocations` con el motivo (docs/05 §7 S2: "esa bitácora es
evidencia demostrable de que el sistema aplica controles de no
discriminación").
"""

from __future__ import annotations

import hashlib
from collections.abc import Callable

from sqlalchemy.orm import Session

from app.ai.contracts.interview import InterviewTurnResult
from app.ai.models import AIInvocation

#: Master Prompt §22. Coincide con `tests/test_interview_bank.py::FORBIDDEN_TERMS`
#: (mismo criterio, aplicado ahora en runtime y no solo sobre el banco semilla).
FORBIDDEN_TOPIC_TERMS: tuple[str, ...] = (
    "edad",
    "género",
    "genero",
    "estado civil",
    "casad",
    "soltera",
    "soltero",
    "embarazo",
    "embarazad",
    "religi",
    "orientación sexual",
    "orientacion sexual",
    "afiliación política",
    "afiliacion politica",
    "partido político",
    "étnic",
    "etnic",
    "raza",
    "condición médica",
    "condicion medica",
    "enfermedad",
    "discapacidad",
    "situación familiar",
    "situacion familiar",
    "hijos",
    "salud mental",
    "estatus migratorio",
    "nacionalidad",
)

#: Términos que revelarían el criterio interno de calificación (Master Prompt §20: "no revelar la puntuación").
SCORING_REVEAL_TERMS: tuple[str, ...] = (
    "rúbrica",
    "rubrica",
    "puntaj",
    "calificaci",
    "vas a ser evaluad",
    "te voy a calificar",
    "nivel 0",
    "escala de 0 a 4",
    "score",
    "respuesta correcta",
    "respuesta esperada",
)


class GuardianViolation:
    __slots__ = ("kind", "detail")

    def __init__(self, kind: str, detail: str) -> None:
        self.kind = kind
        self.detail = detail

    def __repr__(self) -> str:  # pragma: no cover — solo para logs/depuración
        return f"{self.kind}:{self.detail}"


def find_violations(question_text: str | None) -> list[GuardianViolation]:
    """Reglas duras deterministas. `None`/vacío no viola nada (no hay pregunta que emitir)."""

    if not question_text or not question_text.strip():
        return []

    violations: list[GuardianViolation] = []
    lowered = question_text.lower()

    for term in FORBIDDEN_TOPIC_TERMS:
        if term in lowered:
            violations.append(GuardianViolation("FORBIDDEN_TOPIC", term))

    if question_text.count("?") > 1:
        violations.append(GuardianViolation("MULTIPLE_QUESTIONS", f'{question_text.count("?")} signos de interrogación'))

    for term in SCORING_REVEAL_TERMS:
        if term in lowered:
            violations.append(GuardianViolation("SCORING_REVEALED", term))

    return violations


def _log_block(
    db: Session,
    *,
    session_id: str,
    attempt: int,
    question_text: str,
    violations: list[GuardianViolation],
) -> None:
    digest = hashlib.sha256(f"{session_id}|{attempt}|{question_text}".encode("utf-8")).hexdigest()
    row = AIInvocation(
        operation="equity_guardian_block",
        contract_version="1.1",
        prompt_version="n/a",
        adapter="guardian",
        provider=None,
        model=None,
        input_digest=digest,
        raw_output={
            "session_id": session_id,
            "attempt": attempt,
            "blocked_text": question_text,
            "reasons": [f"{v.kind}:{v.detail}" for v in violations],
        },
        latency_ms=0,
        tokens_in=None,
        tokens_out=None,
        retries=attempt - 1,
        status="GUARDIAN_BLOCKED",
        error=", ".join(f"{v.kind}:{v.detail}" for v in violations),
    )
    db.add(row)
    db.commit()


def review_question(
    db: Session,
    *,
    session_id: str,
    proposal: InterviewTurnResult,
    fallback_text: str,
    fallback_intent: str = "SCENARIO",
    retry: Callable[[str], InterviewTurnResult | None] | None = None,
) -> tuple[InterviewTurnResult, bool]:
    """Revisa `proposal` y devuelve `(resultado_final, fue_bloqueado_alguna_vez)`.

    - Sin violaciones: devuelve `proposal` tal cual.
    - Con violaciones: registra el bloqueo, pide **una** reformulación a
      través de `retry` (si se da). Si la reformulación también viola reglas
      (o `retry` es `None` / lanza / no trae texto), cae al banco
      (`fallback_text`), también registrado.
    """

    violations = find_violations(proposal.question_text)
    if not violations:
        return proposal, False

    _log_block(db, session_id=session_id, attempt=1, question_text=proposal.question_text or "", violations=violations)

    if retry is not None:
        reason = "; ".join(f"{v.kind.lower()}: {v.detail}" for v in violations)
        try:
            reformulated = retry(reason)
        except Exception:  # noqa: BLE001 — una falla de reformulación cae al banco, no rompe la entrevista
            reformulated = None

        if reformulated is not None and reformulated.question_text:
            violations_2 = find_violations(reformulated.question_text)
            if not violations_2:
                return reformulated, True
            _log_block(
                db,
                session_id=session_id,
                attempt=2,
                question_text=reformulated.question_text,
                violations=violations_2,
            )

    fallback = InterviewTurnResult(
        action=proposal.action if proposal.action in ("ASK", "PROBE") else "ASK",
        question_text=fallback_text,
        target_competency_code=proposal.target_competency_code,
        question_intent=fallback_intent,
        references_turn_id=proposal.references_turn_id,
        rationale="Guardián de Equidad: se usó la pregunta del banco tras bloquear dos propuestas.",
        coverage_update=proposal.coverage_update,
    )
    return fallback, True
