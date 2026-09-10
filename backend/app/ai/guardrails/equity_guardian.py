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
4. B14 — preguntas que devuelven el transcript crudo a la persona: una cita
   literal de su respuesta anterior (`VERBATIM_QUOTE`) o restos de
   transcripción como muletillas y frases cortadas (`TRANSCRIPT_ARTIFACT`).
   Es la garantía por código de que la capa de comprensión ocurrió: si el
   agente (o el adaptador determinista) se saltó la interpretación y copió
   palabras, la pregunta no se emite. Ver `app/ai/contracts/base.py`
   (`AnswerInterpretation`).

Al bloquear, pide **una** reformulación (parámetro `retry`); si vuelve a
fallar, usa la pregunta de respaldo del banco (`fallback_text`). Todo bloqueo
se registra en `ai_invocations` con el motivo (docs/05 §7 S2: "esa bitácora es
evidencia demostrable de que el sistema aplica controles de no
discriminación").
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
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


#: B14 — restos de transcripción que nunca deben aparecer en una pregunta
#: emitida. Solo tokens que en español escrito no son palabras de contenido
#: (`este`, `pues` o `bueno` sí lo son y no se listan: bloquearlos produciría
#: falsos positivos sobre preguntas perfectamente correctas).
TRANSCRIPT_ARTIFACT_PATTERNS: tuple[str, ...] = (
    r"\beh+\b",
    r"\behm+\b",
    r"\bem+\b",
    r"\bmm+h?\b",
    r"\bhmm+\b",
    r"\baj[áa]\b",
    r"\bo sea\b",
    #: Cita cortada con puntos suspensivos: la firma exacta de "pegué un
    #: fragmento del transcript" ("Mencionó que \"Sí, te puedo... \"").
    r"[\"“”][^\"“”]*(?:…|\.\.\.)\s*[\"“”]",
)

#: Palabras seguidas idénticas a la respuesta anterior a partir de las cuales
#: se considera cita literal y no paráfrasis.
VERBATIM_SPAN_WORDS = 5


def _normalized_words(text: str) -> list[str]:
    """Palabras en minúsculas, sin acentos ni puntuación — para comparar contenido."""

    decomposed = unicodedata.normalize("NFD", text or "")
    stripped = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return re.findall(r"[0-9a-z]+", stripped.lower())


def _shares_verbatim_span(question_text: str, previous_answer: str, span: int = VERBATIM_SPAN_WORDS) -> str | None:
    """Devuelve el tramo copiado de `previous_answer`, o `None` si no hay ninguno."""

    question_words = _normalized_words(question_text)
    answer_words = _normalized_words(previous_answer)
    if len(question_words) < span or len(answer_words) < span:
        return None

    answer_spans = {
        " ".join(answer_words[i : i + span]) for i in range(len(answer_words) - span + 1)
    }
    for i in range(len(question_words) - span + 1):
        candidate = " ".join(question_words[i : i + span])
        if candidate in answer_spans:
            return candidate
    return None


class GuardianViolation:
    __slots__ = ("kind", "detail")

    def __init__(self, kind: str, detail: str) -> None:
        self.kind = kind
        self.detail = detail

    def __repr__(self) -> str:  # pragma: no cover — solo para logs/depuración
        return f"{self.kind}:{self.detail}"


def find_violations(question_text: str | None, previous_answer: str | None = None) -> list[GuardianViolation]:
    """Reglas duras deterministas. `None`/vacío no viola nada (no hay pregunta que emitir).

    `previous_answer` es el transcript crudo de la respuesta que la pregunta
    profundiza, cuando lo hay: habilita la detección de cita literal
    (`VERBATIM_QUOTE`). Sin él siguen aplicando todas las demás reglas.
    """

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

    for pattern in TRANSCRIPT_ARTIFACT_PATTERNS:
        match = re.search(pattern, question_text, flags=re.IGNORECASE)
        if match:
            violations.append(GuardianViolation("TRANSCRIPT_ARTIFACT", match.group(0).strip()))

    if previous_answer:
        span = _shares_verbatim_span(question_text, previous_answer)
        if span is not None:
            violations.append(GuardianViolation("VERBATIM_QUOTE", span))

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
    previous_answer: str | None = None,
) -> tuple[InterviewTurnResult, bool]:
    """Revisa `proposal` y devuelve `(resultado_final, fue_bloqueado_alguna_vez)`.

    - Sin violaciones: devuelve `proposal` tal cual.
    - Con violaciones: registra el bloqueo, pide **una** reformulación a
      través de `retry` (si se da). Si la reformulación también viola reglas
      (o `retry` es `None` / lanza / no trae texto), cae al banco
      (`fallback_text`), también registrado.

    `previous_answer` (B14) es el transcript de la respuesta que se profundiza:
    con él, una repregunta que copie palabras de la persona se bloquea como
    `VERBATIM_QUOTE`. La `AnswerInterpretation` de la propuesta se conserva en
    el resultado final incluso cuando se cae al banco — la comprensión de la
    respuesta es válida aunque la redacción de la pregunta no lo fuera.
    """

    violations = find_violations(proposal.question_text, previous_answer)
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
            violations_2 = find_violations(reformulated.question_text, previous_answer)
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
        answer_interpretation=proposal.answer_interpretation,
        question_text=fallback_text,
        target_competency_code=proposal.target_competency_code,
        question_intent=fallback_intent,
        references_turn_id=proposal.references_turn_id,
        rationale="Guardián de Equidad: se usó la pregunta del banco tras bloquear dos propuestas.",
        coverage_update=proposal.coverage_update,
    )
    return fallback, True
