"""Servicio de dominio de B7: evaluación por rúbricas, evidencia y perfil de talento.

Aplica en código las invariantes de `docs/04 §6.3` que ningún agente puede
saltarse:
- **I-02** — `evidence_turn_ids` debe referenciar turnos reales de *esa*
  sesión, o la evaluación completa se rechaza (`validate_evidence_turn_ids`).
- **I-03** — ningún agente marca `is_verified`; solo evidencia documental
  aceptada lo hace, y lo decide este módulo (`accept_skill_evidence`).
- **I-04** — un score fuera de 0-100 es un error de validación de Pydantic
  (`app.ai.contracts.assessment.CompetencyScore`), nunca un clamp silencioso;
  este módulo no reimplementa esa regla, confía en que ya se aplicó antes de
  que un `CompetencyScore` exista en memoria.

El cálculo de scores es el de `docs/build/06_INTERVIEW_SYSTEM.md` §4,
generalizado para tolerar el modo demo (menos de 7 preguntas por bloque): en
vez de dividir siempre entre 28, divide entre `preguntas_evaluadas × 4`, que
coincide exactamente con 28 cuando hay 7 preguntas por bloque.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.contracts.advisory import (
    FeedbackRequest,
    LearningCatalogEntryDTO,
    LearningPathRequest,
)
from app.ai.contracts.assessment import (
    CompetencyScore,
    EvaluationRequest,
    EvaluationResult,
    TalentProfileRequest,
    TalentProfileResult,
)
from app.ai.contracts.base import ClaimDTO, TurnDTO
from app.ai.invoke import invoke
from app.ai.prompts.loader import prompt_version_for
from app.core.errors import DomainError, NotFoundError
from app.modules.candidates.models import CandidateProfile
from app.modules.candidates.service import build_candidate_snapshot_for_ai
from app.modules.catalog.models import Competency, InterviewQuestion, JobFamily, LearningCatalogEntry, Rubric
from app.modules.catalog.service import resolve_rubric_specs_for_family
from app.modules.assessments.models import CandidateSkill, CompetencyEvaluation, SkillEvidence, TalentProfile
from app.modules.assessments import schemas
from app.modules.documents.models import Claim
from app.modules.interviews.models import InterviewSession, InterviewTurn


class EvidenceValidationError(DomainError):
    """I-02: una evaluación cita `evidence_turn_ids` que no pertenecen a la sesión."""

    status_code = 422
    code = "EVIDENCE_VALIDATION_ERROR"
    default_message = "La evaluación cita turnos que no pertenecen a esta entrevista; se rechaza."


# ---------------------------------------------------------------------------
# Niveles descriptivos (Master Prompt §12) — nunca apto/no apto.
# ---------------------------------------------------------------------------

_LEVEL_LABELS: tuple[tuple[int, int, str], ...] = (
    (85, 100, "Evidencia muy sólida"),
    (70, 84, "Evidencia sólida con áreas puntuales de desarrollo"),
    (50, 69, "Evidencia parcial"),
    (0, 49, "Evidencia insuficiente actualmente"),
)


def overall_label_for(score: int) -> str:
    for lo, hi, label in _LEVEL_LABELS:
        if lo <= score <= hi:
            return label
    return _LEVEL_LABELS[-1][2]


# ---------------------------------------------------------------------------
# I-02
# ---------------------------------------------------------------------------


def validate_evidence_turn_ids(db: Session, *, session_id: uuid.UUID, evaluations: list[CompetencyScore]) -> None:
    real_ids = {
        str(t)
        for t in db.execute(select(InterviewTurn.id).where(InterviewTurn.session_id == session_id)).scalars().all()
    }
    for evaluation in evaluations:
        for turn_id in evaluation.evidence_turn_ids:
            if turn_id not in real_ids:
                raise EvidenceValidationError(
                    f"La evaluación de '{evaluation.competency_code}' cita el turno {turn_id!r}, "
                    "que no existe en esta sesión de entrevista."
                )


# ---------------------------------------------------------------------------
# Construcción del request de evaluación (A3 EVALUATE)
# ---------------------------------------------------------------------------


def _turn_dto(turn: InterviewTurn, competency_code: str) -> TurnDTO:
    return TurnDTO(
        turn_id=str(turn.id),
        sequence=turn.sequence,
        question_text=turn.question_text,
        target_competency_code=competency_code,
        question_intent=turn.question_intent,
        references_turn_id=str(turn.references_turn_id) if turn.references_turn_id else None,
        answer_text=turn.answer_text,
    )


def build_evaluation_request(db: Session, session: InterviewSession) -> EvaluationRequest:
    family = db.get(JobFamily, session.job_family_id)
    family_code = family.code if family else ""

    turns = list(
        db.execute(
            select(InterviewTurn).where(InterviewTurn.session_id == session.id).order_by(InterviewTurn.sequence)
        )
        .scalars()
        .all()
    )
    competencies_by_id = {c.id: c for c in db.execute(select(Competency)).scalars().all()}
    transcript = [
        _turn_dto(t, competencies_by_id[t.target_competency_id].code)
        for t in turns
        if t.answer_text is not None and t.target_competency_id in competencies_by_id
    ]

    rubrics = resolve_rubric_specs_for_family(db, session.job_family_id)

    claims = list(db.execute(select(Claim).where(Claim.candidate_id == session.candidate_id)).scalars().all())
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

    return EvaluationRequest(
        session_id=str(session.id),
        job_family_code=family_code,
        transcript=transcript,
        rubrics=rubrics,
        claims=claim_dtos,
    )


def run_evaluation(db: Session, session: InterviewSession) -> EvaluationResult:
    """Invoca A3 (`evaluate_competencies`) y valida I-02 antes de devolver.

    Lanza `EvidenceValidationError` si cualquier `CompetencyScore` cita
    turnos ajenos a la sesión — la evaluación completa se rechaza, nunca se
    filtra parcialmente (docs/build "el presupuesto... se rechaza").
    """

    request = build_evaluation_request(db, session)
    result = invoke(
        db,
        "evaluate_competencies",
        request,
        EvaluationResult,
        prompt_version=prompt_version_for("evaluate_competencies"),
    )
    validate_evidence_turn_ids(db, session_id=session.id, evaluations=result.evaluations)
    return result


def persist_evaluations(
    db: Session, *, candidate_id: uuid.UUID, session: InterviewSession, result: EvaluationResult
) -> list[CompetencyEvaluation]:
    """Persiste un `CompetencyScore` por fila, marcando `is_current=False` en las anteriores
    de la misma competencia (docs/05 §6.4: nunca se sobrescriben, queda historial)."""

    competencies_by_code = {
        c.code: c
        for c in db.execute(select(Competency).where(Competency.job_family_id == session.job_family_id)).scalars().all()
    }
    latest_ai_invocation_id = _latest_ai_invocation_id(db, operation="evaluate_competencies")

    # Mapa turn_id -> question_id para completar el aditivo `question_id` (docs/build/06 §7).
    turns_by_id = {
        str(t.id): t
        for t in db.execute(select(InterviewTurn).where(InterviewTurn.session_id == session.id)).scalars().all()
    }

    rows: list[CompetencyEvaluation] = []
    for score in result.evaluations:
        competency = competencies_by_code.get(score.competency_code)
        if competency is None:
            continue

        db.execute(
            CompetencyEvaluation.__table__.update()
            .where(
                CompetencyEvaluation.candidate_id == candidate_id,
                CompetencyEvaluation.competency_id == competency.id,
                CompetencyEvaluation.is_current.is_(True),
            )
            .values(is_current=False)
        )

        primary_turn = turns_by_id.get(score.evidence_turn_ids[0]) if score.evidence_turn_ids else None
        rubric = db.execute(
            select(Rubric)
            .where(Rubric.competency_id == competency.id, Rubric.version == score.rubric_version)
            .limit(1)
        ).scalars().first()

        row = CompetencyEvaluation(
            candidate_id=candidate_id,
            interview_session_id=session.id,
            competency_id=competency.id,
            rubric_id=rubric.id if rubric else None,
            rubric_version=score.rubric_version,
            rubric_source=score.rubric_source,
            score=score.score,
            rubric_level=score.rubric_level,
            confidence=score.confidence,
            justification=score.justification,
            evidence_refs=list(score.evidence_turn_ids),
            limitations=score.limitations,
            ai_invocation_id=latest_ai_invocation_id,
            question_id=primary_turn.question_id if primary_turn else None,
            is_current=True,
        )
        db.add(row)
        rows.append(row)

    db.commit()
    for row in rows:
        db.refresh(row)
    return rows


def _latest_ai_invocation_id(db: Session, *, operation: str) -> uuid.UUID | None:
    from app.ai.models import AIInvocation

    row = db.execute(
        select(AIInvocation).where(AIInvocation.operation == operation).order_by(AIInvocation.created_at.desc()).limit(1)
    ).scalars().first()
    return row.id if row else None


# ---------------------------------------------------------------------------
# Scoring determinista (docs/build/06 §4) — generalizado a N preguntas/bloque
# ---------------------------------------------------------------------------


@dataclass
class BlockScores:
    hard_skills_score: int
    soft_skills_score: int
    interview_score: int


def compute_block_scores(evaluations: list[CompetencyEvaluation], competencies_by_id: dict[uuid.UUID, Competency]) -> BlockScores:
    hard_levels = [
        e.rubric_level for e in evaluations if competencies_by_id.get(e.competency_id) and competencies_by_id[e.competency_id].type == "TECHNICAL"
    ]
    soft_levels = [
        e.rubric_level for e in evaluations if competencies_by_id.get(e.competency_id) and competencies_by_id[e.competency_id].type == "BEHAVIORAL"
    ]
    hard_score = round(100 * sum(hard_levels) / (4 * len(hard_levels))) if hard_levels else 0
    soft_score = round(100 * sum(soft_levels) / (4 * len(soft_levels))) if soft_levels else 0
    interview_score = round(hard_score * 0.5 + soft_score * 0.5)
    return BlockScores(hard_skills_score=hard_score, soft_skills_score=soft_score, interview_score=interview_score)


# ---------------------------------------------------------------------------
# Banderas de riesgo (Master Prompt §18, §31) — evidencia, nunca decisiones
# ---------------------------------------------------------------------------


@dataclass
class _RiskPattern:
    positive: re.Pattern[str]
    negation: re.Pattern[str] | None = None


#: Heurística determinista por `code` de `risk_flag_triggers` (banco semilla).
#: Cada patrón se contrasta contra la respuesta completa de un turno cuya
#: pregunta declara ese `code` como posible disparador; `negation` evita falsos
#: positivos cuando la persona explícitamente descarta la conducta de riesgo.
_RISK_PATTERNS: dict[str, _RiskPattern] = {
    "SAFETY_CRITICAL": _RiskPattern(
        positive=re.compile(
            r"segu(ir|ir[ií]a|ir[eé]a?)\s+(operando|trabajando)|continuar(ía|ia)?\s+(operando|la\s+operaci[oó]n|trabajando|la\s+maniobra)",
            re.I,
        ),
        negation=re.compile(r"no\s+segu|detendr|deten(er|d[ríi]a)|par(o|ar[ií]a)|no\s+continuar", re.I),
    ),
    "INVENTORY_INTEGRITY": _RiskPattern(
        positive=re.compile(r"ajustar(ía|ia)?\s+(el\s+sistema|la\s+cifra|el\s+inventario)|cuadrar\s+la\s+cifra\s+sin|ocultar(ía|ia)?\s+(la\s+)?(p[eé]rdida|el\s+da[nñ]o)", re.I),
        negation=re.compile(r"no\s+ajustar|no\s+modificar|con\s+autorizaci[oó]n|investigar(ía|ia)?\s+antes|reportar(ía|ia)?", re.I),
    ),
    "UNAUTHORIZED_RELEASE": _RiskPattern(
        positive=re.compile(r"liberar(ía|ia)?\s+(la\s+)?(mercanc[ií]a|salida)\s+sin|entregar(ía|ia)?\s+sin\s+autorizaci[oó]n", re.I),
        negation=re.compile(r"no\s+liberar|con\s+autorizaci[oó]n|verificar(ía|ia)?\s+la\s+autorizaci[oó]n", re.I),
    ),
    "PHYSICAL_SAFETY_RISK": _RiskPattern(
        positive=re.compile(r"confrontar(ía|ia)?|enfrentar(ía|ia)?\s+(a\s+la\s+persona|directamente)|forcejear|quitarle", re.I),
        negation=re.compile(r"no\s+confrontar|evitar(ía|ia)?\s+confrontar|sin\s+confrontar", re.I),
    ),
    "CONFIDENTIALITY_BREACH": _RiskPattern(
        positive=re.compile(r"le\s+(compartir[ií]a|dar[ií]a|dir[ií]a)\s+el\s+dato|se\s+lo\s+(compartir[ií]a|dir[ií]a)|le\s+dar[ií]a\s+la\s+informaci[oó]n", re.I),
        negation=re.compile(r"no\s+(le\s+)?compartir[ií]a|no\s+dar[ií]a\s+el\s+dato|verificar(ía|ia)?\s+(si\s+estoy\s+autorizad|autorizaci[oó]n)|consultar(ía|ia)?", re.I),
    ),
    "DATA_INTEGRITY": _RiskPattern(
        positive=re.compile(r"inventar(ía|ia)?\s+el\s+dato|modificar(ía|ia)?\s+.*(coincida|coincidir)|forzar(ía|ia)?\s+el\s+(dato|registro)|complet(ar(ía|ia)?|arlo)\s+con\s+un\s+valor\s+supuesto", re.I),
        negation=re.compile(r"no\s+inventar|no\s+modificar|escalar(ía|ia)?\s+la\s+duda|consultar(ía|ia)?\s+antes", re.I),
    ),
    "UNSAFE_CONDITION_IGNORED": _RiskPattern(
        positive=re.compile(r"continuar(ía|ia)?\s+(la\s+operaci[oó]n|trabajando|con\s+la\s+tarea)\s+(a\s+pesar|pese\s+a|sin\s+importar|de\s+todos\s+modos)|seguir(ía|ia)?\s+sin\s+reportar", re.I),
        negation=re.compile(r"detendr|aislar(ía|ia)?|reportar(ía|ia)?\s+antes|no\s+continuar", re.I),
    ),
}


def detect_risk_flags(
    db: Session, *, session: InterviewSession
) -> list[schemas.RiskFlag]:
    """Recorre la transcripción completa buscando los disparadores del banco
    semilla (`InterviewQuestion.risk_flag_triggers`) en las respuestas reales.

    Es heurística por diseño (regex sobre texto libre, no comprensión
    semántica) — exactamente el mismo espíritu que el resto de las
    detecciones deterministas del proyecto (`DeterministicAdapter`,
    `resolve_vacancy_requirements`). Las banderas son **evidencia para un
    humano**, nunca una decisión automática (Master Prompt §18).
    """

    turns = list(
        db.execute(
            select(InterviewTurn).where(InterviewTurn.session_id == session.id).order_by(InterviewTurn.sequence)
        )
        .scalars()
        .all()
    )
    bank_by_question_id = {
        q.question_id: q
        for q in db.execute(
            select(InterviewQuestion).where(InterviewQuestion.job_family_id == session.job_family_id)
        ).scalars().all()
    }

    flags: list[schemas.RiskFlag] = []
    for turn in turns:
        if not turn.answer_text or not turn.question_id:
            continue
        bank_question = bank_by_question_id.get(turn.question_id)
        if bank_question is None:
            continue
        for trigger in bank_question.risk_flag_triggers or []:
            code = trigger.get("code")
            pattern = _RISK_PATTERNS.get(code)
            if pattern is None:
                continue
            if pattern.positive.search(turn.answer_text) and not (
                pattern.negation and pattern.negation.search(turn.answer_text)
            ):
                flags.append(
                    schemas.RiskFlag(
                        code=code,
                        severity=trigger.get("severity", "medium"),
                        question_id=turn.question_id,
                        description=(
                            f"Respuesta a {turn.question_id}: "
                            f"\"{turn.answer_text[:180].strip()}\""
                        ),
                    )
                )
    return flags


def detect_inconsistencies(db: Session, *, session: InterviewSession) -> list[schemas.Inconsistency]:
    """Heurística mínima (best-effort, documentada): una afirmación de nivel
    alto (`claimed_level` 3-4) sin respaldo en la entrevista para una
    competencia con nombre relacionado se reporta como inconsistencia leve
    para que un humano la revise — nunca se acusa de mentir (Master Prompt
    §10.3)."""

    claims = list(db.execute(select(Claim).where(Claim.candidate_id == session.candidate_id)).scalars().all())
    if not claims:
        return []

    evaluations = list(
        db.execute(
            select(CompetencyEvaluation).where(
                CompetencyEvaluation.interview_session_id == session.id,
                CompetencyEvaluation.is_current.is_(True),
            )
        )
        .scalars()
        .all()
    )
    competencies_by_id = {c.id: c for c in db.execute(select(Competency)).scalars().all()}

    inconsistencies: list[schemas.Inconsistency] = []
    for claim in claims:
        if claim.claimed_level not in (3, 4):
            continue
        claim_words = {w for w in re.findall(r"[a-záéíóúñ]{4,}", claim.statement.lower())}
        for evaluation in evaluations:
            if evaluation.rubric_level > 1:
                continue
            competency = competencies_by_id.get(evaluation.competency_id)
            if competency is None:
                continue
            name_words = {w for w in re.findall(r"[a-záéíóúñ]{4,}", competency.name.lower())}
            if claim_words & name_words:
                inconsistencies.append(
                    schemas.Inconsistency(
                        claim=claim.statement,
                        observed_evidence=evaluation.justification,
                        severity="low",
                    )
                )
    return inconsistencies


# ---------------------------------------------------------------------------
# candidate_skills — upsert desde las evaluaciones (docs/04 §5.5, RF-12)
# ---------------------------------------------------------------------------


def sync_candidate_skills(
    db: Session, *, candidate_id: uuid.UUID, evaluations: list[CompetencyEvaluation], competencies_by_id: dict[uuid.UUID, Competency]
) -> None:
    declared_codes = {
        c.skill_code
        for c in db.execute(select(Claim).where(Claim.candidate_id == candidate_id)).scalars().all()
        if c.skill_code
    }

    for evaluation in evaluations:
        competency = competencies_by_id.get(evaluation.competency_id)
        if competency is None:
            continue
        existing = db.execute(
            select(CandidateSkill).where(
                CandidateSkill.candidate_id == candidate_id, CandidateSkill.skill_code == competency.code
            )
        ).scalars().first()
        is_declared = competency.code in declared_codes
        if existing is None:
            existing = CandidateSkill(
                candidate_id=candidate_id,
                skill_code=competency.code,
                skill_name=competency.name,
                is_declared=is_declared,
                is_evaluated=True,
                is_verified=False,
                evaluated_score=evaluation.score,
                confidence=evaluation.confidence,
                evidence_summary=evaluation.justification,
            )
        else:
            existing.is_declared = existing.is_declared or is_declared
            existing.is_evaluated = True
            existing.evaluated_score = evaluation.score
            existing.confidence = evaluation.confidence
            existing.evidence_summary = evaluation.justification
        db.add(existing)
    db.commit()


# ---------------------------------------------------------------------------
# I-03 — única puerta de entrada para verificar una skill
# ---------------------------------------------------------------------------


def accept_skill_evidence(
    db: Session,
    *,
    candidate_id: uuid.UUID,
    skill_code: str,
    skill_name: str,
    evidence_type: str,
    accepted_for_verification: bool,
    document_id: uuid.UUID | None = None,
    interview_turn_id: uuid.UUID | None = None,
    notes: str | None = None,
) -> CandidateSkill:
    """Única función del backend que puede dejar `is_verified=True` (I-03).

    Se activa **solo** si `evidence_type` es documental (`DOCUMENT` o
    `EXTERNAL`) y `accepted_for_verification=True`. Un agente nunca llama a
    esta función directamente: ningún contrato de `AIPort` declara un campo
    `is_verified` que un agente pueda rellenar (ver
    `app/ai/contracts/assessment.py::CandidateSkillDTO`), así que la única
    forma de que una skill quede verificada es que el backend, por una
    evidencia documental ya aceptada, la marque aquí.
    """

    skill = db.execute(
        select(CandidateSkill).where(CandidateSkill.candidate_id == candidate_id, CandidateSkill.skill_code == skill_code)
    ).scalars().first()
    if skill is None:
        skill = CandidateSkill(candidate_id=candidate_id, skill_code=skill_code, skill_name=skill_name)

    db.add(skill)
    db.flush()

    evidence = SkillEvidence(
        candidate_skill_id=skill.id,
        type=evidence_type,
        document_id=document_id,
        interview_turn_id=interview_turn_id,
        accepted_for_verification=accepted_for_verification,
        notes=notes,
    )
    db.add(evidence)
    db.flush()

    if evidence_type in ("DOCUMENT", "EXTERNAL") and accepted_for_verification:
        skill.is_verified = True
        db.add(skill)

    db.commit()
    db.refresh(skill)
    return skill


# ---------------------------------------------------------------------------
# Perfil de talento (PROFILE_BUILD) — persistencia + narrativa de A3/A4
# ---------------------------------------------------------------------------


def build_and_persist_talent_profile(db: Session, *, session: InterviewSession) -> TalentProfile:
    profile = db.get(CandidateProfile, session.candidate_id)
    if profile is None:
        raise NotFoundError("No existe el perfil de candidato para esta entrevista.")

    evaluations = list(
        db.execute(
            select(CompetencyEvaluation).where(
                CompetencyEvaluation.candidate_id == session.candidate_id,
                CompetencyEvaluation.interview_session_id == session.id,
                CompetencyEvaluation.is_current.is_(True),
            )
        )
        .scalars()
        .all()
    )
    competencies_by_id = {c.id: c for c in db.execute(select(Competency)).scalars().all()}
    sync_candidate_skills(db, candidate_id=profile.id, evaluations=evaluations, competencies_by_id=competencies_by_id)

    block_scores = compute_block_scores(evaluations, competencies_by_id)
    risk_flags = detect_risk_flags(db, session=session)
    inconsistencies = detect_inconsistencies(db, session=session)
    # `coverage` refleja el presupuesto REAL de la sesión que se entrevistó
    # (docs/build/06 §5), no el `INTERVIEW_DEMO_MODE` actual del proceso —
    # que pudo cambiar entre el inicio de la entrevista y esta evaluación.
    from app.ai.orchestration.interview_flow import FULL_QUESTIONS_PER_BLOCK

    coverage = "FULL" if session.question_budget >= FULL_QUESTIONS_PER_BLOCK * 2 else "PARTIAL"

    claims = list(db.execute(select(Claim).where(Claim.candidate_id == profile.id)).scalars().all())
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
    scores_dto = [
        CompetencyScore(
            competency_code=competencies_by_id[e.competency_id].code,
            competency_name=competencies_by_id[e.competency_id].name,
            type=competencies_by_id[e.competency_id].type,
            rubric_version=e.rubric_version,
            rubric_source=e.rubric_source,
            score=e.score,
            rubric_level=e.rubric_level,
            confidence=e.confidence,
            justification=e.justification,
            evidence_turn_ids=list(e.evidence_refs),
            limitations=e.limitations,
        )
        for e in evaluations
        if e.competency_id in competencies_by_id
    ]

    family = db.get(JobFamily, session.job_family_id)
    snapshot = build_candidate_snapshot_for_ai(profile).model_copy(
        update={"job_family_code": family.code if family else None}
    )
    request = TalentProfileRequest(candidate_snapshot=snapshot, evaluations=scores_dto, claims=claim_dtos)
    narrative = invoke(
        db,
        "build_talent_profile",
        request,
        TalentProfileResult,
        prompt_version=prompt_version_for("build_talent_profile"),
    )

    db.execute(
        TalentProfile.__table__.update()
        .where(TalentProfile.candidate_id == profile.id, TalentProfile.is_current.is_(True))
        .values(is_current=False)
    )
    previous_version = db.execute(
        select(TalentProfile.version)
        .where(TalentProfile.candidate_id == profile.id)
        .order_by(TalentProfile.version.desc())
        .limit(1)
    ).scalar()

    # El score/etiqueta oficiales son SIEMPRE el cálculo determinista de
    # docs/build/06 §4/§12 — nunca lo que el agente narrativo devuelva, para
    # que sea imposible que aparezca una etiqueta de apto/no apto o un número
    # no reproducible (I-07 en espíritu, aunque el invariante formal es de
    # matching: la razón es la misma).
    row = TalentProfile(
        candidate_id=profile.id,
        version=(previous_version or 0) + 1,
        overall_score=block_scores.interview_score,
        overall_label=overall_label_for(block_scores.interview_score),
        top_skills=[s.model_dump(mode="json") for s in narrative.top_skills],
        strengths=list(narrative.strengths),
        evidence_gaps=list(narrative.evidence_gaps),
        summary_text=narrative.summary_text,
        generated_at=datetime.now(timezone.utc),
        is_current=True,
        hard_skills_score=block_scores.hard_skills_score,
        soft_skills_score=block_scores.soft_skills_score,
        interview_score=block_scores.interview_score,
        coverage=coverage,
        risk_flags=[f.model_dump(mode="json") for f in risk_flags],
        inconsistencies=[i.model_dump(mode="json") for i in inconsistencies],
    )
    db.add(row)

    profile.status = "EVALUATED"
    db.add(profile)
    db.commit()
    db.refresh(row)
    return row


# ---------------------------------------------------------------------------
# Lecturas para los endpoints de candidato
# ---------------------------------------------------------------------------


def get_current_talent_profile(db: Session, *, candidate_id: uuid.UUID) -> TalentProfile:
    row = db.execute(
        select(TalentProfile)
        .where(TalentProfile.candidate_id == candidate_id, TalentProfile.is_current.is_(True))
        .order_by(TalentProfile.version.desc())
        .limit(1)
    ).scalars().first()
    if row is None:
        from app.core.errors import NotEvaluatedError

        raise NotEvaluatedError()
    return row


def to_talent_profile_schema(db: Session, row: TalentProfile) -> schemas.TalentProfile:
    evaluations = list(
        db.execute(
            select(CompetencyEvaluation).where(
                CompetencyEvaluation.candidate_id == row.candidate_id, CompetencyEvaluation.is_current.is_(True)
            )
        )
        .scalars()
        .all()
    )
    competencies_by_id = {c.id: c for c in db.execute(select(Competency)).scalars().all()}
    evaluation_schemas = [
        schemas.CompetencyEvaluation(
            competency_code=competencies_by_id[e.competency_id].code,
            competency_name=competencies_by_id[e.competency_id].name,
            type=competencies_by_id[e.competency_id].type,
            score=e.score,
            rubric_level=e.rubric_level,
            confidence=e.confidence,
            justification=e.justification,
            evidence_turn_ids=list(e.evidence_refs),
            limitations=e.limitations,
            rubric_source=e.rubric_source,
            question_id=e.question_id,
        )
        for e in evaluations
        if e.competency_id in competencies_by_id
    ]

    # B13: `row.top_skills` guarda `CandidateSkillDTO` (narrativa de A3 PROFILE)
    # -- ese DTO **no declara** `is_verified` a propósito (I-03: un agente
    # nunca puede rellenar esa bandera, ver `accept_skill_evidence` arriba),
    # así que valida directo contra `schemas.CandidateSkill` (que sí la exige,
    # por ser el tipo HTTP público) fallaba con 500 `ValidationError` en
    # cualquier candidato real. La fuente de verdad de `is_verified` (y de
    # `is_declared`/`is_evaluated`, por consistencia) sigue siendo la fila
    # real de `candidate_skills`, cruzada aquí por `skill_code`.
    candidate_skills_by_code = {
        r.skill_code: r
        for r in db.execute(
            select(CandidateSkill).where(CandidateSkill.candidate_id == row.candidate_id)
        ).scalars().all()
    }
    top_skills = []
    for s in row.top_skills:
        real = candidate_skills_by_code.get(s.get("skill_code"))
        top_skills.append(
            schemas.CandidateSkill(
                skill_code=s.get("skill_code", ""),
                skill_name=s.get("skill_name", ""),
                is_declared=real.is_declared if real else bool(s.get("is_declared", False)),
                is_evaluated=real.is_evaluated if real else bool(s.get("is_evaluated", True)),
                is_verified=real.is_verified if real else False,
                evaluated_score=s.get("evaluated_score"),
                confidence=s.get("confidence"),
                evidence_summary=s.get("evidence_summary"),
            )
        )
    risk_flags = [schemas.RiskFlag.model_validate(f) for f in row.risk_flags]
    inconsistencies = [schemas.Inconsistency.model_validate(i) for i in row.inconsistencies]

    return schemas.TalentProfile(
        id=row.id,
        version=row.version,
        generated_at=row.generated_at,
        overall_score=row.overall_score,
        overall_label=row.overall_label,
        top_skills=top_skills,
        evaluations=evaluation_schemas,
        strengths=list(row.strengths),
        evidence_gaps=list(row.evidence_gaps),
        summary_text=row.summary_text,
        hard_skills_score=row.hard_skills_score,
        soft_skills_score=row.soft_skills_score,
        interview_score=row.interview_score,
        coverage=row.coverage,
        risk_flags=risk_flags,
        inconsistencies=inconsistencies,
    )


def get_candidate_skills(db: Session, *, candidate_id: uuid.UUID) -> list[schemas.CandidateSkill]:
    rows = list(
        db.execute(select(CandidateSkill).where(CandidateSkill.candidate_id == candidate_id)).scalars().all()
    )
    return [
        schemas.CandidateSkill(
            skill_code=r.skill_code,
            skill_name=r.skill_name,
            is_declared=r.is_declared,
            is_evaluated=r.is_evaluated,
            is_verified=r.is_verified,
            evaluated_score=r.evaluated_score,
            confidence=r.confidence,
            evidence_summary=r.evidence_summary,
        )
        for r in rows
    ]


def get_feedback_report(db: Session, *, candidate_id: uuid.UUID) -> schemas.FeedbackReport:
    """A4 `generate_feedback_report`, invocado bajo demanda (no se persiste:
    `feedback_reports` no es una tabla del modelo de datos, docs/04 §5.5)."""

    profile_row = get_current_talent_profile(db, candidate_id=candidate_id)
    profile = db.get(CandidateProfile, candidate_id)
    evaluations = list(
        db.execute(
            select(CompetencyEvaluation).where(
                CompetencyEvaluation.candidate_id == candidate_id, CompetencyEvaluation.is_current.is_(True)
            )
        )
        .scalars()
        .all()
    )
    competencies_by_id = {c.id: c for c in db.execute(select(Competency)).scalars().all()}
    scores_dto = [
        CompetencyScore(
            competency_code=competencies_by_id[e.competency_id].code,
            competency_name=competencies_by_id[e.competency_id].name,
            type=competencies_by_id[e.competency_id].type,
            rubric_version=e.rubric_version,
            rubric_source=e.rubric_source,
            score=e.score,
            rubric_level=e.rubric_level,
            confidence=e.confidence,
            justification=e.justification,
            evidence_turn_ids=list(e.evidence_refs),
            limitations=e.limitations,
        )
        for e in evaluations
        if e.competency_id in competencies_by_id
    ]
    family = db.get(JobFamily, profile.job_family_id) if profile and profile.job_family_id else None
    snapshot = build_candidate_snapshot_for_ai(profile).model_copy(
        update={"job_family_code": family.code if family else None}
    )
    request = FeedbackRequest(candidate_snapshot=snapshot, evaluations=scores_dto, overall_label=profile_row.overall_label)
    from app.ai.contracts.advisory import FeedbackResult

    result = invoke(db, "generate_feedback_report", request, FeedbackResult, prompt_version=prompt_version_for("generate_feedback_report"))
    return schemas.FeedbackReport(
        candidate_note=result.candidate_note, company_note=result.company_note, generated_at=datetime.now(timezone.utc)
    )


def get_learning_path(db: Session, *, candidate_id: uuid.UUID) -> schemas.LearningPath:
    """A4 `recommend_learning_path`, máximo 3 brechas, catálogo sembrado (`learning_catalog`)."""

    get_current_talent_profile(db, candidate_id=candidate_id)  # 404 si no hay perfil todavía
    evaluations = list(
        db.execute(
            select(CompetencyEvaluation).where(
                CompetencyEvaluation.candidate_id == candidate_id, CompetencyEvaluation.is_current.is_(True)
            )
        )
        .scalars()
        .all()
    )
    competencies_by_id = {c.id: c for c in db.execute(select(Competency)).scalars().all()}
    scores_dto = [
        CompetencyScore(
            competency_code=competencies_by_id[e.competency_id].code,
            competency_name=competencies_by_id[e.competency_id].name,
            type=competencies_by_id[e.competency_id].type,
            rubric_version=e.rubric_version,
            rubric_source=e.rubric_source,
            score=e.score,
            rubric_level=e.rubric_level,
            confidence=e.confidence,
            justification=e.justification,
            evidence_turn_ids=list(e.evidence_refs),
            limitations=e.limitations,
        )
        for e in evaluations
        if e.competency_id in competencies_by_id
    ]
    catalog_rows = list(db.execute(select(LearningCatalogEntry)).scalars().all())
    catalog_dtos = [
        LearningCatalogEntryDTO(
            competency_code=c.competency_code,
            type=c.type,
            provider=c.provider,
            title=c.title,
            estimated_effort=c.estimated_effort,
            source=c.source,
            url=c.url,
        )
        for c in catalog_rows
    ]
    request = LearningPathRequest(evaluations=scores_dto, catalog_entries=catalog_dtos)
    from app.ai.contracts.advisory import LearningPathResult

    result = invoke(db, "recommend_learning_path", request, LearningPathResult, prompt_version=prompt_version_for("recommend_learning_path"))
    return schemas.LearningPath(
        gaps=[
            schemas.LearningGap(
                competency_code=g.competency_code,
                competency_name=g.competency_name,
                current_level=g.current_level,
                target_level=g.target_level,
                why_it_matters=g.why_it_matters,
                recommendations=[
                    schemas.LearningRecommendation(
                        type=r.type, provider=r.provider, title=r.title, estimated_effort=r.estimated_effort,
                        source=r.source, url=r.url,
                    )
                    for r in g.recommendations
                ],
            )
            for g in result.gaps
        ]
    )
