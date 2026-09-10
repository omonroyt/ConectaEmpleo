"""`InterviewOrchestrator` — máquina de estados en Python (docs/05 §4.1).

"El agente propone, el orquestador dispone": las reglas duras (presupuesto,
orden de bloques HARD→SOFT, tope de follow-ups, cobertura mínima) se aplican
**antes** de invocar al agente y nunca dependen de que el agente se comporte
bien (docs/05 §2 principio 1). El agente (`AIPort.next_interview_question`)
decide únicamente el *contenido* de un follow-up cuando el orquestador ya
decidió que uno es posible.

Las 14 preguntas base (7 HARD + 7 SOFT, o 3+3 en `INTERVIEW_DEMO_MODE`) salen
literales del banco semilla (`app/seeds/interview_bank/*.json`, tabla
`interview_questions`) para garantizar la comparabilidad entre candidatos que
exige el master prompt §3.2 — el agente nunca reescribe una pregunta base.
Sí decide si conviene un follow-up y, de ser así, su redacción exacta.

**Capa de comprensión (B14)**: entre "lo que la persona dijo" y "qué le
pregunto ahora" hay una etapa intermedia obligatoria. El transcript de voz
llega con muletillas y frases cortadas, y repreguntar citándolo produce
preguntas incoherentes ("Mencionó que 'Sí, te puedo compartir lo que hice.
Eh,...'"). Así que antes de decidir la acción se interpreta la respuesta
(`AnswerInterpretation`: qué dijo, sobre qué temas, qué le falta, sobre qué
profundizar), esa lectura se persiste en `interview_turns.answer_interpretation`
y la repregunta se construye sobre el tema interpretado. Que la etapa ocurrió
no depende de la buena voluntad del modelo: el Guardián de Equidad bloquea por
código cualquier pregunta que devuelva el transcript crudo a la persona
(`VERBATIM_QUOTE`, `TRANSCRIPT_ARTIFACT`).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from pydantic import ValidationError

from app.ai.contracts.base import AnswerInterpretation, ClaimDTO, TurnDTO
from app.ai.contracts.interview import InterviewTurnRequest, InterviewTurnResult
from app.ai.guardrails import equity_guardian
from app.ai.invoke import invoke
from app.ai.prompts.loader import prompt_version_for
from app.config import Settings, get_settings
from app.modules.candidates.models import CandidateProfile
from app.modules.candidates.service import build_candidate_snapshot_for_ai
from app.modules.catalog.models import Competency, InterviewQuestion, JobFamily
from app.modules.catalog.service import rubric_spec_for_competency
from app.modules.documents.models import Claim
from app.modules.interviews.models import DEFAULT_COVERAGE_STATE, InterviewSession, InterviewTurn

#: Master prompt §27 y §28, literal (ejemplo base). Se antepone al texto de la
#: primera pregunta HARD / de la primera pregunta SOFT respectivamente —
#: `InterviewTurn.question_text` no tiene un campo separado para "mensaje del
#: sistema" en el contrato HTTP, así que viajan concatenados al turno.
OPENING_MESSAGE = (
    "Hola. Voy a hacerte una entrevista breve sobre situaciones y tareas relacionadas con el "
    "puesto. No buscamos respuestas memorizadas: nos interesa entender qué has hecho, cómo "
    "resolverías distintos escenarios y qué experiencia puedes demostrar. Si alguna herramienta "
    "o situación no la conoces, puedes decirlo con confianza."
)
TRANSITION_MESSAGE = (
    "Gracias. Ahora voy a hacerte algunas preguntas sobre cómo organizas el trabajo y cómo "
    "actúas en situaciones del día a día."
)

#: docs/05 §4.2: "3 respuestas consecutivas por debajo del umbral mínimo de contenido".
STAGNATION_LIMIT = 3
STAGNATION_WORD_THRESHOLD = 2

#: Preguntas base por bloque en recorrido completo / demo (docs/build/06 §5).
FULL_QUESTIONS_PER_BLOCK = 7
DEMO_QUESTIONS_PER_BLOCK = 3

#: B14 — turnos ya respondidos que viajan en `InterviewTurnRequest.history`.
#: Antes viajaba **uno solo**, y con una sola foto el agente no podía razonar
#: sobre la conversación: repreguntaba pegando un fragmento del transcript. Se
#: acota a los últimos N para no crecer el prompt sin límite en un recorrido
#: de 14 preguntas más follow-ups.
HISTORY_TURNS_FOR_AGENT = 6

NextQuestionOutcome = tuple[InterviewTurn | None, bool, str | None, dict[str, int]]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _word_count(text: str | None) -> int:
    return len((text or "").strip().split())


def select_question_bank(
    all_questions: list[InterviewQuestion], *, demo_mode: bool
) -> list[InterviewQuestion]:
    """Las N preguntas base seleccionadas, en orden HARD (1..N) luego SOFT (1..N).

    `all_questions` es el banco completo de 14 filas de la familia (cualquier
    orden); esta función nunca reordena dentro de cada bloque más allá de
    `sequence`, para que `question_id` siga siendo estable entre corridas.
    """

    hard = sorted([q for q in all_questions if q.block == "HARD"], key=lambda q: q.sequence)
    soft = sorted([q for q in all_questions if q.block == "SOFT"], key=lambda q: q.sequence)
    n = DEMO_QUESTIONS_PER_BLOCK if demo_mode else FULL_QUESTIONS_PER_BLOCK
    return hard[:n] + soft[:n]


def parse_interpretation(raw: dict | None) -> AnswerInterpretation | None:
    """`interview_turns.answer_interpretation` -> DTO, tolerando filas viejas.

    Una fila escrita antes de B14 (o por una versión anterior del contrato) no
    debe romper una entrevista en curso: si no valida, se ignora y el agente
    trabaja sin interpretación previa, como antes.
    """

    if not raw:
        return None
    try:
        return AnswerInterpretation.model_validate(raw)
    except ValidationError:
        return None


def _turn_to_dto(turn: InterviewTurn, competency_code: str) -> TurnDTO:
    return TurnDTO(
        turn_id=str(turn.id),
        sequence=turn.sequence,
        question_text=turn.question_text,
        target_competency_code=competency_code,
        question_intent=turn.question_intent,
        references_turn_id=str(turn.references_turn_id) if turn.references_turn_id else None,
        answer_text=turn.answer_text,
        interpretation=parse_interpretation(turn.answer_interpretation),
    )


class InterviewOrchestrator:
    """Gobierna el ciclo de una `InterviewSession`. Ver docstring del módulo."""

    def __init__(self, db: Session, *, settings: Settings | None = None) -> None:
        self.db = db
        self.settings = settings or get_settings()

    # ------------------------------------------------------------------
    # Selección de preguntas / lecturas auxiliares
    # ------------------------------------------------------------------
    def _all_bank_questions(self, job_family_id: uuid.UUID) -> list[InterviewQuestion]:
        stmt = select(InterviewQuestion).where(InterviewQuestion.job_family_id == job_family_id)
        return list(self.db.execute(stmt).scalars().all())

    def selected_questions(self, job_family_id: uuid.UUID) -> list[InterviewQuestion]:
        return select_question_bank(self._all_bank_questions(job_family_id), demo_mode=self.settings.interview_demo_mode)

    def _bank_question(self, job_family_id: uuid.UUID, question_id: str) -> InterviewQuestion | None:
        for q in self._all_bank_questions(job_family_id):
            if q.question_id == question_id:
                return q
        return None

    def _turns(self, session: InterviewSession) -> list[InterviewTurn]:
        stmt = (
            select(InterviewTurn)
            .where(InterviewTurn.session_id == session.id)
            .order_by(InterviewTurn.sequence)
        )
        return list(self.db.execute(stmt).scalars().all())

    def _pending_turn(self, session: InterviewSession) -> InterviewTurn | None:
        stmt = (
            select(InterviewTurn)
            .where(InterviewTurn.session_id == session.id, InterviewTurn.answer_text.is_(None))
            .order_by(InterviewTurn.sequence.desc())
            .limit(1)
        )
        return self.db.execute(stmt).scalars().first()

    def _last_turn(self, session: InterviewSession) -> InterviewTurn | None:
        stmt = (
            select(InterviewTurn)
            .where(InterviewTurn.session_id == session.id)
            .order_by(InterviewTurn.sequence.desc())
            .limit(1)
        )
        return self.db.execute(stmt).scalars().first()

    def _base_turn_for(self, session: InterviewSession, question_id: str | None) -> InterviewTurn | None:
        if question_id is None:
            return None
        stmt = (
            select(InterviewTurn)
            .where(
                InterviewTurn.session_id == session.id,
                InterviewTurn.question_id == question_id,
                InterviewTurn.is_follow_up.is_(False),
            )
            .limit(1)
        )
        return self.db.execute(stmt).scalars().first()

    def _competency_code(self, competency_id: uuid.UUID | None, cache: dict[uuid.UUID, str]) -> str:
        if competency_id is None:
            return ""
        if competency_id not in cache:
            competency = self.db.get(Competency, competency_id)
            cache[competency_id] = competency.code if competency else ""
        return cache[competency_id]

    def _history_for_agent(self, session: InterviewSession) -> list[TurnDTO]:
        """Últimos turnos ya respondidos, con su interpretación (B14).

        El agente necesita la conversación, no un turno suelto: sin contexto no
        puede saber si ya profundizó sobre un tema, si la persona ya dijo que
        no tiene experiencia, o de qué está hablando la respuesta que acaba de
        recibir.
        """

        answered = [t for t in self._turns(session) if t.answer_text]
        cache: dict[uuid.UUID, str] = {}
        return [
            _turn_to_dto(turn, self._competency_code(turn.target_competency_id, cache))
            for turn in answered[-HISTORY_TURNS_FOR_AGENT:]
        ]

    def _coverage_for_agent(self, session: InterviewSession, current_code: str) -> dict[str, str]:
        """Cobertura por competencia, **solo de lo ya tocado**.

        Deliberadamente no se listan las competencias `UNTOUCHED`: el contrato
        de `AIPort` trata las claves de `coverage_state` como "lo que ya se
        exploró" (ver `DeterministicAdapter.next_interview_question`), así que
        agregar las intactas invertiría el significado.
        """

        questions = self.selected_questions(session.job_family_id)
        answered_ids = set((session.coverage_state or {}).get("answered_question_ids", []))
        cache: dict[uuid.UUID, str] = {}
        coverage: dict[str, str] = {}
        for question in questions:
            if question.question_id not in answered_ids:
                continue
            code = self._competency_code(question.competency_id, cache)
            if code:
                coverage[code] = "SUFFICIENT"
        coverage[current_code] = "PARTIAL"
        return coverage

    def _next_sequence(self, session: InterviewSession) -> int:
        current = self.db.execute(
            select(InterviewTurn.sequence)
            .where(InterviewTurn.session_id == session.id)
            .order_by(InterviewTurn.sequence.desc())
            .limit(1)
        ).scalar()
        return (current or 0) + 1

    # ------------------------------------------------------------------
    # Creación de sesión
    # ------------------------------------------------------------------
    def create_or_reuse_session(
        self, *, candidate_id: uuid.UUID, job_family_id: uuid.UUID, mode: str = "TEXT"
    ) -> InterviewSession:
        existing = self.db.execute(
            select(InterviewSession)
            .where(
                InterviewSession.candidate_id == candidate_id,
                InterviewSession.status.in_(("PENDING", "IN_PROGRESS")),
            )
            .order_by(InterviewSession.created_at.desc())
            .limit(1)
        ).scalars().first()
        if existing is not None:
            return existing

        budget = len(self.selected_questions(job_family_id))
        session = InterviewSession(
            candidate_id=candidate_id,
            job_family_id=job_family_id,
            status="IN_PROGRESS",
            mode=mode,
            question_budget=budget,
            questions_asked=0,
            coverage_state=dict(DEFAULT_COVERAGE_STATE),
            started_at=_now(),
            last_activity_at=_now(),
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    # ------------------------------------------------------------------
    # Progreso / estado público
    # ------------------------------------------------------------------
    def progress_summary(self, session: InterviewSession) -> dict[str, int]:
        return {"asked": session.questions_asked, "budget": session.question_budget}

    def coverage_map(self, session: InterviewSession) -> dict[str, str]:
        """`{competency_code: CoverageStatus}` derivado para `GET .../progress`.

        Simplificado deliberadamente a UNTOUCHED/SUFFICIENT (sin PARTIAL): la
        cobertura fina que sí gobierna el flujo vive en
        `session.coverage_state` (forma de docs/build/06 §6); este mapa es
        solo la vista de progreso para pantallas de candidato/empresa.
        """

        questions = self.selected_questions(session.job_family_id)
        coverage = session.coverage_state or {}
        answered = set(coverage.get("answered_question_ids", []))
        result: dict[str, str] = {}
        for q in questions:
            competency = self.db.get(Competency, q.competency_id)
            code = competency.code if competency else q.question_id
            result[code] = "SUFFICIENT" if q.question_id in answered else "UNTOUCHED"
        return result

    # ------------------------------------------------------------------
    # Ciclo principal
    # ------------------------------------------------------------------
    def next_question(self, session: InterviewSession) -> NextQuestionOutcome:
        """`GET .../next-question`: **idempotente**. Reabrir devuelve el turno
        pendiente sin consumir presupuesto (el frontend depende de esto)."""

        if session.status in ("COMPLETED", "ABANDONED"):
            return None, True, session.finish_reason, self.progress_summary(session)

        pending = self._pending_turn(session)
        if pending is not None:
            return pending, False, None, self.progress_summary(session)

        return self._advance(session)

    def submit_answer(self, session: InterviewSession, turn: InterviewTurn, answer_text: str) -> NextQuestionOutcome:
        """`POST .../answers`: registra la respuesta del `turn` pendiente y avanza."""

        turn.answer_text = answer_text
        turn.answer_received_at = _now()
        self.db.add(turn)

        coverage = dict(session.coverage_state or DEFAULT_COVERAGE_STATE)
        if not turn.is_follow_up and turn.question_id:
            answered_ids = list(coverage.get("answered_question_ids", []))
            if turn.question_id not in answered_ids:
                answered_ids.append(turn.question_id)
            coverage["answered_question_ids"] = answered_ids
            coverage["base_questions_answered"] = len(answered_ids)

        is_weak = _word_count(answer_text) <= STAGNATION_WORD_THRESHOLD
        coverage["consecutive_weak_answers"] = (coverage.get("consecutive_weak_answers", 0) + 1) if is_weak else 0

        session.coverage_state = coverage
        session.last_activity_at = _now()
        self.db.add(session)
        self.db.commit()

        return self._advance(session)

    # ------------------------------------------------------------------
    # Reglas duras de terminación (docs/05 §4.2) — el orquestador decide, no el agente
    # ------------------------------------------------------------------
    def _finish(self, session: InterviewSession, reason: str) -> NextQuestionOutcome:
        session.status = "COMPLETED"
        session.finish_reason = reason
        session.completed_at = _now()
        coverage = dict(session.coverage_state or {})
        coverage["phase"] = "COMPLETED"
        session.coverage_state = coverage
        self.db.add(session)
        self.db.commit()
        return None, True, reason, self.progress_summary(session)

    def _advance(self, session: InterviewSession) -> NextQuestionOutcome:
        questions = self.selected_questions(session.job_family_id)
        total_target = len(questions)
        coverage = dict(session.coverage_state or DEFAULT_COVERAGE_STATE)
        answered_ids = list(coverage.get("answered_question_ids", []))

        # Criterio "estancamiento": 3 respuestas consecutivas casi vacías.
        if coverage.get("consecutive_weak_answers", 0) >= STAGNATION_LIMIT:
            return self._finish(session, "BUDGET_EXHAUSTED")

        # ¿El último turno respondido admite un follow-up? (contenido: decide el agente;
        # flujo -- si se pide, cuántos como máximo -- lo decide el orquestador.)
        last_turn = self._last_turn(session)
        if last_turn is not None and last_turn.answer_text is not None:
            base_turn = last_turn if not last_turn.is_follow_up else self._base_turn_for(session, last_turn.question_id)
            if base_turn is not None:
                followup = self._maybe_create_followup(
                    session, last_answered_turn=last_turn, base_turn=base_turn, coverage=coverage
                )
                if followup is not None:
                    return followup, False, None, self.progress_summary(session)
                # `_maybe_create_followup` no mutó `coverage` si devolvió None; recarga por si acaso.
                coverage = dict(session.coverage_state or coverage)
                answered_ids = list(coverage.get("answered_question_ids", []))

        # Presupuesto agotado / cobertura suficiente: ambos coinciden aquí porque
        # `question_budget == len(questions)` (I-06: el presupuesto lo impone el
        # backend pase lo que pida el agente).
        if len(answered_ids) >= total_target:
            return self._finish(session, "COVERAGE_SUFFICIENT")
        if session.questions_asked >= session.question_budget:
            return self._finish(session, "BUDGET_EXHAUSTED")

        next_question = questions[len(answered_ids)]
        turn = self._create_base_turn(session, next_question, coverage)
        return turn, False, None, self.progress_summary(session)

    # ------------------------------------------------------------------
    # Emisión de turnos
    # ------------------------------------------------------------------
    def _create_base_turn(
        self, session: InterviewSession, question: InterviewQuestion, coverage: dict
    ) -> InterviewTurn:
        is_first_overall = len(self._turns(session)) == 0
        is_first_soft = question.block == "SOFT" and coverage.get("phase") != "SOFT"

        text = question.text
        if is_first_overall:
            text = f"{OPENING_MESSAGE} {text}"
        elif is_first_soft:
            text = f"{TRANSITION_MESSAGE} {text}"

        # El Guardián corre también sobre preguntas base por defensa en profundidad
        # (docs/05 §7 S2), aunque el banco ya está cubierto por
        # `tests/test_interview_bank.py::test_no_question_text_mentions_a_prohibited_topic`
        # y por lo tanto no debería bloquear nunca en la práctica.
        proposal = InterviewTurnResult(
            action="ASK",
            question_text=text,
            target_competency_code=None,
            question_intent="SCENARIO",
            rationale="Pregunta base del banco semilla (comparabilidad entre candidatos).",
            coverage_update={},
        )
        final, _blocked = equity_guardian.review_question(
            self.db,
            session_id=str(session.id),
            proposal=proposal,
            fallback_text=question.text,
            fallback_intent="SCENARIO",
            retry=None,
        )

        turn = InterviewTurn(
            session_id=session.id,
            sequence=self._next_sequence(session),
            question_text=final.question_text or question.text,
            target_competency_id=question.competency_id,
            question_intent="SCENARIO",
            references_turn_id=None,
            question_id=question.question_id,
            is_follow_up=False,
            block=question.block,
        )
        self.db.add(turn)

        coverage["phase"] = question.block
        coverage["current_question_id"] = question.question_id
        coverage["follow_ups_for_current_question"] = 0
        session.coverage_state = coverage
        session.questions_asked = (session.questions_asked or 0) + 1
        session.status = "IN_PROGRESS"
        if session.started_at is None:
            session.started_at = _now()
        session.last_activity_at = _now()
        self.db.add(session)
        self.db.commit()
        self.db.refresh(turn)
        return turn

    def _store_interpretation(
        self, turn: InterviewTurn, interpretation: AnswerInterpretation | None
    ) -> None:
        """Guarda la lectura interpretada de la respuesta de `turn` (B14).

        `turn.answer_text` no se toca nunca: el transcript crudo es la
        evidencia auditable y esto es una lectura derivada.
        """

        if interpretation is None:
            return
        turn.answer_interpretation = interpretation.model_dump(mode="json")
        self.db.add(turn)
        self.db.commit()

    def _maybe_create_followup(
        self,
        session: InterviewSession,
        *,
        last_answered_turn: InterviewTurn,
        base_turn: InterviewTurn,
        coverage: dict,
    ) -> InterviewTurn | None:
        max_followups = self.settings.interview_max_followups_per_question
        followups_so_far = coverage.get("follow_ups_for_current_question", 0)
        if followups_so_far >= max_followups:
            return None

        competency = self.db.get(Competency, base_turn.target_competency_id)
        if competency is None:
            return None
        rubric_spec = rubric_spec_for_competency(self.db, competency)
        if rubric_spec is None:
            return None

        family = self.db.get(JobFamily, session.job_family_id)
        family_code = family.code if family else ""
        profile = self.db.get(CandidateProfile, session.candidate_id)
        if profile is None:
            return None
        snapshot = build_candidate_snapshot_for_ai(profile).model_copy(update={"job_family_code": family_code})

        claims = list(
            self.db.execute(select(Claim).where(Claim.candidate_id == session.candidate_id)).scalars().all()
        )
        claim_dtos = [
            ClaimDTO(
                skill_code=c.skill_code,
                statement=c.statement,
                claimed_level=c.claimed_level if c.claimed_level in (1, 2, 3, 4) else None,
                source=c.source,
                source_ref=c.source_ref,
            )
            for c in claims
        ]

        remaining_questions = max(
            len(self.selected_questions(session.job_family_id))
            - len(coverage.get("answered_question_ids", [])),
            0,
        )

        request = InterviewTurnRequest(
            session_id=str(session.id),
            job_family_code=family_code,
            candidate_snapshot=snapshot,
            rubrics=[rubric_spec],
            claims=claim_dtos,
            history=self._history_for_agent(session),
            coverage_state=self._coverage_for_agent(session, competency.code),
            remaining_questions=remaining_questions,
        )
        result = invoke(
            self.db,
            "next_interview_question",
            request,
            InterviewTurnResult,
            prompt_version=prompt_version_for("next_interview_question"),
        )

        # La interpretación de la respuesta se persiste SIEMPRE, se repregunte
        # o no: es la lectura limpia que A3 usa para evaluar y la que evita que
        # la siguiente pregunta se arme sobre el transcript crudo (B14).
        self._store_interpretation(last_answered_turn, result.answer_interpretation)

        if result.action != "PROBE" or not result.question_text:
            # El agente decide contenido, no flujo: si no propone un follow-up
            # (o pide FINISH/ASK otra cosa), el orquestador simplemente avanza
            # a la siguiente pregunta base — nunca lo interpreta como orden de
            # terminar la entrevista completa (I-06).
            return None

        def _retry(reason: str) -> InterviewTurnResult | None:
            retry_request = request.model_copy(update={"guardian_feedback": reason})
            return invoke(
                self.db,
                "next_interview_question",
                retry_request,
                InterviewTurnResult,
                prompt_version=prompt_version_for("next_interview_question"),
            )

        bank_question = self._bank_question(session.job_family_id, base_turn.question_id or "")
        fallback_text = (
            bank_question.suggested_follow_ups[0]["text"]
            if bank_question and bank_question.suggested_follow_ups
            else "¿Puedes darme un ejemplo concreto de eso?"
        )
        final, _blocked = equity_guardian.review_question(
            self.db,
            session_id=str(session.id),
            proposal=result,
            fallback_text=fallback_text,
            fallback_intent="PROBE",
            retry=_retry,
            # Con esto, una repregunta que copie palabras del transcript se
            # bloquea como `VERBATIM_QUOTE` y nunca llega a la persona (B14).
            previous_answer=last_answered_turn.answer_text,
        )

        turn = InterviewTurn(
            session_id=session.id,
            sequence=self._next_sequence(session),
            question_text=final.question_text or fallback_text,
            target_competency_id=base_turn.target_competency_id,
            question_intent="PROBE",
            references_turn_id=last_answered_turn.id,
            question_id=base_turn.question_id,
            is_follow_up=True,
            block=base_turn.block,
        )
        self.db.add(turn)

        coverage["follow_ups_for_current_question"] = followups_so_far + 1
        coverage["current_question_id"] = base_turn.question_id
        session.coverage_state = coverage
        session.last_activity_at = _now()
        self.db.add(session)
        self.db.commit()
        self.db.refresh(turn)
        return turn

    # ------------------------------------------------------------------
    # Abandono (docs/05 §4.2): reanudable, no se prueba en CI (depende del reloj real)
    # ------------------------------------------------------------------
    def mark_abandoned_if_stale(self, session: InterviewSession, *, timeout: timedelta = timedelta(minutes=10)) -> bool:
        if session.status != "IN_PROGRESS":
            return False
        last_activity = session.last_activity_at
        if last_activity.tzinfo is None:
            last_activity = last_activity.replace(tzinfo=timezone.utc)
        if _now() - last_activity < timeout:
            return False
        session.status = "ABANDONED"
        self.db.add(session)
        self.db.commit()
        return True
