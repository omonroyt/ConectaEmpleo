"""S2 Guardián de Equidad (`app/ai/guardrails/equity_guardian.py`), docs/05 §7 S2."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.contracts.interview import InterviewTurnResult
from app.ai.guardrails import equity_guardian
from app.ai.models import AIInvocation


def _proposal(text: str) -> InterviewTurnResult:
    return InterviewTurnResult(
        action="ASK",
        question_text=text,
        target_competency_code="ADMIN_HA_01",
        question_intent="SCENARIO",
        rationale="test",
        coverage_update={},
    )


def test_find_violations_detects_forbidden_topic() -> None:
    violations = equity_guardian.find_violations("¿Qué edad tienes y por qué dejaste tu trabajo anterior?")
    assert any(v.kind == "FORBIDDEN_TOPIC" for v in violations)


def test_find_violations_detects_multiple_questions() -> None:
    violations = equity_guardian.find_violations("¿Qué harías primero? ¿Y después qué revisarías?")
    assert any(v.kind == "MULTIPLE_QUESTIONS" for v in violations)


def test_find_violations_detects_scoring_reveal() -> None:
    violations = equity_guardian.find_violations("Si respondes bien te doy un puntaje de nivel 4 en la rúbrica.")
    assert any(v.kind == "SCORING_REVEALED" for v in violations)


def test_clean_question_has_no_violations() -> None:
    assert equity_guardian.find_violations("Cuéntame una vez que tuviste que priorizar varias tareas urgentes.") == []


def test_blocked_question_is_logged_to_ai_invocations_with_reason(db_session: Session) -> None:
    proposal = _proposal("¿Cuál es tu religión y cómo afecta tu forma de trabajar?")

    final, blocked = equity_guardian.review_question(
        db_session,
        session_id="test-session-guardian",
        proposal=proposal,
        fallback_text="Cuéntame de una tarea concreta en la que usaste Excel.",
        retry=None,
    )

    assert blocked is True
    assert final.question_text == "Cuéntame de una tarea concreta en la que usaste Excel."

    logged = db_session.execute(
        select(AIInvocation).where(AIInvocation.operation == "equity_guardian_block")
    ).scalars().all()
    assert len(logged) >= 1
    row = logged[-1]
    assert row.status == "GUARDIAN_BLOCKED"
    assert "FORBIDDEN_TOPIC" in (row.error or "")
    assert row.raw_output["session_id"] == "test-session-guardian"


def test_successful_reformulation_is_used_without_falling_back(db_session: Session) -> None:
    proposal = _proposal("¿Cuál es tu estado civil y cómo organizas tu trabajo?")

    def _retry(reason: str) -> InterviewTurnResult:
        assert "estado civil" in reason.lower() or "forbidden_topic" in reason.lower()
        return _proposal("¿Cómo organizas tu trabajo cuando tienes varios pendientes al mismo tiempo?")

    final, blocked = equity_guardian.review_question(
        db_session,
        session_id="test-session-reformulate",
        proposal=proposal,
        fallback_text="pregunta de respaldo del banco",
        retry=_retry,
    )

    assert blocked is True
    assert final.question_text == "¿Cómo organizas tu trabajo cuando tienes varios pendientes al mismo tiempo?"
    assert final.question_text != "pregunta de respaldo del banco"


def test_reformulation_still_blocked_falls_back_to_bank_question(db_session: Session) -> None:
    proposal = _proposal("¿Cuál es tu edad?")

    def _retry(reason: str) -> InterviewTurnResult:
        # Reformulación que sigue tocando un tema prohibido: debe volver a bloquearse.
        return _proposal("¿En qué año naciste y qué edad representa eso hoy?")

    final, blocked = equity_guardian.review_question(
        db_session,
        session_id="test-session-double-block",
        proposal=proposal,
        fallback_text="Cuéntame una tarea reciente relacionada con el puesto.",
        retry=_retry,
    )

    assert blocked is True
    assert final.question_text == "Cuéntame una tarea reciente relacionada con el puesto."

    logged = db_session.execute(
        select(AIInvocation).where(AIInvocation.operation == "equity_guardian_block")
    ).scalars().all()
    assert len(logged) >= 2  # un bloqueo por cada intento (propuesta original + reformulación)
