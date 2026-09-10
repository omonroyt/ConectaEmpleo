"""B14 — capa de comprensión entre la respuesta y la siguiente pregunta.

El bug que originó este bloque: con el transcript de voz crudo, la repregunta
salía como `Mencionó que "Sí, te puedo compartir lo que hice. Eh,..."; cuénteme
más a detalle` — el agente copiaba un fragmento en vez de entender la
respuesta. Estas pruebas fijan las tres garantías del arreglo:

1. La respuesta se interpreta antes de decidir (`AnswerInterpretation`).
2. La repregunta se construye sobre el TEMA interpretado, nunca sobre el
   transcript.
3. Que (2) ocurrió no depende del modelo: el Guardián de Equidad lo bloquea por
   código (`VERBATIM_QUOTE`, `TRANSCRIPT_ARTIFACT`).
"""

from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.ai.adapters.deterministic import DeterministicAdapter, interpret_answer, strip_fillers
from app.ai.contracts.base import RubricLevelDTO, RubricSpec, TurnDTO
from app.ai.contracts.interview import InterviewTurnRequest
from app.ai.contracts.base import CandidateSnapshotForAI
from app.ai.guardrails import equity_guardian
from app.modules.catalog.models import JobFamily
from app.modules.interviews.models import InterviewTurn

#: Transcript real del bug: muletillas, arranque en falso y el dato útil al final.
MESSY_ANSWER = (
    "Sí, te puedo compartir lo que hice. Eh, pues, o sea, yo revisaba los reportes en "
    "Excel, este, y, eh, comparaba las cifras con el sistema cada semana."
)

RUBRIC = RubricSpec(
    competency_code="ADMIN_HA_01",
    competency_name="Excel y hojas de cálculo",
    type="TECHNICAL",
    is_core=True,
    version=1,
    source="SPECIFIC",
    what_to_probe=["uso de fórmulas y filtros", "verificación de resultados"],
    levels=[
        RubricLevelDTO(level=0, label="Sin evidencia", descriptor="No aporta ejemplos."),
        RubricLevelDTO(level=4, label="Avanzado", descriptor="Describe un método y cómo lo verifica."),
    ],
)


def _turn(answer: str, turn_id: str = "t1") -> TurnDTO:
    return TurnDTO(
        turn_id=turn_id,
        sequence=1,
        question_text="Cuéntame una tarea que hayas hecho con hojas de cálculo.",
        target_competency_code="ADMIN_HA_01",
        question_intent="SCENARIO",
        answer_text=answer,
    )


# ---------------------------------------------------------------------------
# 1. Limpieza del transcript
# ---------------------------------------------------------------------------


def test_strip_fillers_removes_disfluencies() -> None:
    clean = strip_fillers(MESSY_ANSWER)
    lowered = clean.lower()
    for filler in ("eh,", "o sea", ", este,", "pues,"):
        assert filler not in lowered, f"quedó la muletilla {filler!r} en {clean!r}"


def test_strip_fillers_keeps_the_content_and_the_words_of_the_person() -> None:
    """No inventa, no resume y no 'sube' el registro (docs/build/06 §8.4)."""

    clean = strip_fillers(MESSY_ANSWER)
    for word in ("revisaba", "reportes", "Excel", "comparaba", "cifras", "sistema", "semana"):
        assert word in clean, f"la limpieza perdió {word!r}"


def test_strip_fillers_does_not_touch_este_or_pues_as_real_words() -> None:
    original = "Pues bien, este proceso lo hago cada semana con el reporte de ventas."
    assert "este proceso" in strip_fillers(original)


def test_an_answer_made_only_of_fillers_is_returned_untouched() -> None:
    """La evidencia cruda nunca se pierde por limpiarla."""

    assert strip_fillers("Eh, o sea, pues...").strip()


# ---------------------------------------------------------------------------
# 2. Interpretación
# ---------------------------------------------------------------------------


def test_interpretation_extracts_the_topic_buried_between_fillers() -> None:
    reading = interpret_answer(_turn(MESSY_ANSWER), RUBRIC)

    assert "Excel" in reading.topics
    assert reading.probe_focus is not None
    assert "Excel" in reading.probe_focus
    assert "eh" not in reading.clean_answer.lower().split()


def test_interpretation_marks_a_complete_answer_as_sufficient() -> None:
    complete = (
        "Cada semana revisaba el reporte de ventas en Excel con una tabla dinámica y al final "
        "logré que las diferencias con el sistema se redujeran a cero."
    )
    reading = interpret_answer(_turn(complete), RUBRIC)

    assert reading.evidence_quality == "SUFFICIENT"
    assert reading.probe_focus is None  # no hay nada que profundizar


def test_interpretation_marks_a_declared_lack_of_experience() -> None:
    reading = interpret_answer(_turn("No he usado ese sistema nunca."), RUBRIC)
    assert reading.evidence_quality == "NO_EXPERIENCE"


# ---------------------------------------------------------------------------
# 3. La repregunta se arma sobre el tema, no sobre el transcript
# ---------------------------------------------------------------------------


def _probe_request(answer: str) -> InterviewTurnRequest:
    return InterviewTurnRequest(
        session_id="sess-b14",
        job_family_code="ADMIN_ASSISTANT",
        candidate_snapshot=CandidateSnapshotForAI(anon_code="CND-TEST"),
        rubrics=[RUBRIC],
        claims=[],
        history=[_turn(answer)],
        coverage_state={"ADMIN_HA_01": "PARTIAL"},
        remaining_questions=5,
    )


def test_probe_never_quotes_the_transcript_verbatim() -> None:
    result = DeterministicAdapter().next_interview_question(_probe_request(MESSY_ANSWER))

    assert result.action == "PROBE"
    assert result.question_text
    violations = equity_guardian.find_violations(result.question_text, MESSY_ANSWER)
    assert violations == [], f"la repregunta viola reglas del Guardián: {violations}"
    assert "Excel" in result.question_text


def test_probe_result_carries_the_interpretation_for_persistence() -> None:
    result = DeterministicAdapter().next_interview_question(_probe_request(MESSY_ANSWER))

    assert result.answer_interpretation is not None
    assert result.answer_interpretation.clean_answer
    assert result.answer_interpretation.evidence_quality in ("PARTIAL", "VAGUE")


def test_a_sufficient_answer_does_not_trigger_a_probe() -> None:
    """Repreguntar sobre evidencia que ya alcanza es desgastar a la persona."""

    complete = (
        "Cada semana revisaba el reporte de ventas en Excel con una tabla dinámica y al final "
        "logré que las diferencias con el sistema se redujeran a cero."
    )
    result = DeterministicAdapter().next_interview_question(_probe_request(complete))

    assert result.action != "PROBE"
    # La interpretación viaja igual, para que el orquestador la persista.
    assert result.answer_interpretation is not None


# ---------------------------------------------------------------------------
# 4. El Guardián como garantía por código
# ---------------------------------------------------------------------------


def test_guardian_blocks_a_question_that_quotes_the_previous_answer() -> None:
    copied = 'Mencionó que "yo revisaba los reportes en Excel"; cuénteme más a detalle.'
    violations = equity_guardian.find_violations(copied, MESSY_ANSWER)
    assert any(v.kind == "VERBATIM_QUOTE" for v in violations)


def test_guardian_blocks_a_question_carrying_transcript_fillers() -> None:
    violations = equity_guardian.find_violations('Mencionó que "Sí, te puedo compartir. Eh,..."; ¿qué hizo?')
    kinds = {v.kind for v in violations}
    assert "TRANSCRIPT_ARTIFACT" in kinds


def test_guardian_accepts_a_paraphrase_of_the_same_answer() -> None:
    good = "Comentaste que usas Excel para comparar cifras. ¿Qué haces cuando no cuadran?"
    assert equity_guardian.find_violations(good, MESSY_ANSWER) == []


def test_guardian_does_not_block_a_bank_question_by_coincidence() -> None:
    """Cuatro palabras compartidas es lenguaje común, no una cita."""

    answer = "Reviso el inventario cada semana y reporto las diferencias."
    question = "Cuéntame de una vez que el inventario no cuadró con el sistema."
    assert equity_guardian.find_violations(question, answer) == []


# ---------------------------------------------------------------------------
# 5. Extremo a extremo por la API (la regresión del bug original)
# ---------------------------------------------------------------------------


def _setup(client: TestClient, db_session: Session, email: str) -> str:
    token = client.post(
        "/api/v1/auth/register", json={"email": email, "password": "demo1234", "role": "CANDIDATE"}
    ).json()["access_token"]
    family_id = str(db_session.query(JobFamily.id).filter(JobFamily.code == "ADMIN_ASSISTANT").scalar())
    client.post(
        "/api/v1/candidates/me/job-family",
        json={"job_family_id": family_id},
        headers={"Authorization": f"Bearer {token}"},
    )
    return token


def test_followup_over_a_messy_transcript_is_readable_and_persists_the_reading(
    client: TestClient, db_session: Session, unique_email: str
) -> None:
    token = _setup(client, db_session, unique_email)
    auth = {"Authorization": f"Bearer {token}"}
    interview_id = client.post("/api/v1/interviews", json={"mode": "VOICE"}, headers=auth).json()["id"]

    client.get(f"/api/v1/interviews/{interview_id}/next-question", headers=auth)
    answer_resp = client.post(
        f"/api/v1/interviews/{interview_id}/answers",
        json={"answer_text": MESSY_ANSWER, "mode": "VOICE"},
        headers=auth,
    ).json()

    followup = answer_resp["turn"]
    assert followup["is_follow_up"] is True
    question = followup["question_text"]

    # Ni una muletilla, ni un tramo copiado: la pregunta es legible por sí sola.
    assert equity_guardian.find_violations(question, MESSY_ANSWER) == []
    assert "Eh," not in question and "o sea" not in question

    # La lectura interpretada quedó guardada, y el transcript crudo intacto.
    db_session.expire_all()
    answered = (
        db_session.query(InterviewTurn)
        .filter(
            InterviewTurn.session_id == uuid.UUID(interview_id),
            InterviewTurn.answer_text.isnot(None),
        )
        .order_by(InterviewTurn.sequence)
        .first()
    )
    assert answered.answer_text == MESSY_ANSWER  # evidencia auditable, sin tocar
    assert answered.answer_interpretation is not None
    assert "Excel" in answered.answer_interpretation["clean_answer"]
