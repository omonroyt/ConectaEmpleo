"""Orquestación de sesión del CV conversacional (A1 modo BUILD, docs/05 §7 A1).

`DeterministicAdapter.build_cv_conversationally` es sin estado a propósito
(recibe `turn_index`/`last_answer`/`answers_so_far`, devuelve el siguiente
turno) — este módulo es quien persiste la sesión, decide cuándo repreguntar
(regla "acepta respuestas breves y 'no sé' sin insistir más de una vez",
docs/05 §7) y ensambla el `CVExtraction` final al cerrar (`finalize`).

Guion de 8 turnos, mismos campos y mismo orden que
`frontend/src/api/mock/seed/cvBuilderScript.ts` y que
`DeterministicAdapter._CV_BUILDER_SCRIPT`: `last_job, activities, tools,
previous_jobs, education, certifications, logistics, salary`.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from html import escape

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.contracts.profiling import CVConversationRequest, CVConversationResult
from app.ai.invoke import invoke
from app.core.errors import NotFoundError, ValidationDomainError
from app.modules.candidates.models import CandidateProfile
from app.modules.catalog.models import JobFamily
from app.modules.cv_builder.models import CVBuilderMessage as CVBuilderMessageModel
from app.modules.cv_builder.models import CVBuilderSession as CVBuilderSessionModel
from app.modules.cv_builder.schemas import (
    CVBuilderMessage,
    CVBuilderReply,
)
from app.modules.cv_builder.schemas import (
    CVBuilderSession as CVBuilderSessionSchema,
)
from app.modules.cv_builder.schemas import (
    CVDocument,
)
from app.modules.documents import cv_extraction_service
from app.modules.documents.cv_extraction_service import ClaimInput
from app.modules.documents.schemas import (
    Claim,
    CVExtraction,
    CVExtractionPatch,
    ExtractionCertification,
    ExtractionSkill,
    SourceRef,
)
from app.modules.candidates.schemas import EducationItem, ExperienceItem
from app.modules.documents.storage import get_storage

#: Mismo orden que `DeterministicAdapter._CV_BUILDER_SCRIPT` (docs/05 §7 A1).
_FIELD_ORDER = [
    "last_job",
    "activities",
    "tools",
    "previous_jobs",
    "education",
    "certifications",
    "logistics",
    "salary",
]
MAX_TURNS = len(_FIELD_ORDER)

#: Menos de esto se considera "respuesta muy breve" -> repregunta una sola vez (docs/05 §7).
MIN_WORDS_BEFORE_FOLLOWUP = 4


def _word_count(text: str | None) -> int:
    return len((text or "").strip().split())


def _resolve_job_family_code(db: Session, profile: CandidateProfile) -> str | None:
    if not profile.job_family_id:
        return None
    family = db.get(JobFamily, profile.job_family_id)
    return family.code if family else None


def _next_sequence(db: Session, session_id: uuid.UUID) -> int:
    current_max = db.execute(
        select(func.max(CVBuilderMessageModel.sequence)).where(CVBuilderMessageModel.session_id == session_id)
    ).scalar()
    return (current_max or 0) + 1


def _build_parts(
    answers: dict[str, str],
) -> tuple[list[dict], list[dict], list[dict], list[dict], list[ClaimInput]]:
    """Ensambla experiencia/educación/skills/certificaciones/claims desde las respuestas.

    Refleja `frontend/src/api/mock/engine/cv.ts::buildExtractionFromCvBuilder`
    (mismo golden path, mismas reglas: nunca inventa datos que el candidato no
    dio, "Por confirmar" para lo que no se preguntó explícitamente como
    empresa/institución).
    """

    now_year = datetime.now(timezone.utc).year
    experience: list[dict] = []
    education: list[dict] = []
    skills: list[dict] = []
    certifications: list[dict] = []
    claims: list[ClaimInput] = []

    last_job = answers.get("last_job")
    if last_job:
        experience.append(
            {
                "id": str(uuid.uuid4()),
                "company": "Por confirmar",
                "position": last_job,
                "start_date": f"{now_year - 1}-01-01",
                "end_date": None,
                "is_current": True,
                "description": answers.get("activities", ""),
                "skills": [],
            }
        )

    tools = answers.get("tools")
    if tools:
        for raw in re.split(r",| y ", tools, flags=re.I):
            name = raw.strip()
            if name:
                code = re.sub(r"\s+", "_", name.upper())[:30]
                skills.append({"code": code, "name": name, "level": 2})

    previous_jobs = answers.get("previous_jobs")
    if previous_jobs:
        experience.append(
            {
                "id": str(uuid.uuid4()),
                "company": "Por confirmar",
                "position": previous_jobs,
                "start_date": f"{now_year - 3}-01-01",
                "end_date": f"{now_year - 1}-01-01",
                "is_current": False,
                "description": previous_jobs,
                "skills": [],
            }
        )

    education_answer = answers.get("education")
    if education_answer:
        education.append(
            {
                "id": str(uuid.uuid4()),
                "institution": "Por confirmar",
                "degree": education_answer,
                "start_year": now_year - 8,
                "end_year": now_year - 5,
            }
        )

    certifications_answer = answers.get("certifications")
    if certifications_answer:
        certifications.append({"name": certifications_answer, "issuer": None, "year": None})

    for field in ("logistics", "salary"):
        value = answers.get(field)
        if value:
            claims.append(
                ClaimInput(
                    source="CONVERSATION",
                    skill_code=None,
                    statement=value,
                    claimed_level=None,
                    needs_validation=True,
                    source_ref={"turn": _FIELD_ORDER.index(field) + 1},
                )
            )

    return experience, education, skills, certifications, claims


def _claim_input_to_schema(claim: ClaimInput) -> Claim:
    return Claim(
        id=uuid.uuid4(),
        source=claim.source,
        skill_code=claim.skill_code,
        statement=claim.statement,
        claimed_level=claim.claimed_level,
        needs_validation=claim.needs_validation,
        source_ref=SourceRef.model_validate(claim.source_ref) if claim.source_ref else None,
    )


def _draft_from_answers(answers: dict[str, str]) -> CVExtractionPatch:
    experience, education, skills, certifications, claims = _build_parts(answers)
    return CVExtractionPatch(
        experience=[ExperienceItem.model_validate(e) for e in experience],
        education=[EducationItem.model_validate(e) for e in education],
        skills=[ExtractionSkill.model_validate(s) for s in skills],
        certifications=[ExtractionCertification.model_validate(c) for c in certifications],
        claims=[_claim_input_to_schema(c) for c in claims],
    )


def to_session_schema(session: CVBuilderSessionModel) -> CVBuilderSessionSchema:
    turn = session.max_turns if session.status == "FINALIZED" else min(session.turn_index + 1, session.max_turns)
    return CVBuilderSessionSchema(
        id=session.id,
        status=session.status,
        turn=turn,
        max_turns=session.max_turns,
        draft=_draft_from_answers(session.answers or {}),
    )


def to_message_schema(message: CVBuilderMessageModel) -> CVBuilderMessage:
    return CVBuilderMessage(id=message.id, role=message.role, text=message.text, created_at=message.created_at)


def get_session(db: Session, *, session_id: uuid.UUID, candidate_id: uuid.UUID) -> CVBuilderSessionModel:
    session = db.get(CVBuilderSessionModel, session_id)
    if session is None or session.candidate_id != candidate_id:
        raise NotFoundError("La sesión de CV conversacional no existe.")
    return session


def create_session(db: Session, *, profile: CandidateProfile) -> CVBuilderReply:
    """Crea la sesión y dispara el primer turno (apertura de "Sofía", docs/05 §3)."""

    job_family_code = _resolve_job_family_code(db, profile)
    request = CVConversationRequest(
        job_family_code=job_family_code, turn_index=0, max_turns=MAX_TURNS, last_answer=None, answers_so_far={}
    )
    result = invoke(db, "build_cv_conversationally", request, CVConversationResult, prompt_version="v1")

    session = CVBuilderSessionModel(
        candidate_id=profile.id,
        status="ACTIVE",
        turn_index=0,
        max_turns=MAX_TURNS,
        follow_up_asked=False,
        current_question_text=result.agent_message,
        answers={},
    )
    db.add(session)
    db.flush()

    message = CVBuilderMessageModel(session_id=session.id, role="agent", text=result.agent_message, sequence=1)
    db.add(message)
    db.commit()
    db.refresh(session)
    db.refresh(message)

    return CVBuilderReply(session=to_session_schema(session), agent_message=to_message_schema(message), done=False)


def send_message(
    db: Session, *, session: CVBuilderSessionModel, profile: CandidateProfile, text: str
) -> CVBuilderReply:
    if session.status != "ACTIVE":
        raise ValidationDomainError("Esta conversación ya terminó; usa finalize para cerrarla.")
    if session.turn_index >= session.max_turns:
        raise ValidationDomainError("Ya se respondieron todas las preguntas; llama a finalize.")

    next_seq = _next_sequence(db, session.id)
    db.add(CVBuilderMessageModel(session_id=session.id, role="candidate", text=text, sequence=next_seq))

    # Regla docs/05 §7: respuesta muy breve -> repregunta con un ejemplo, pero
    # solo una vez por turno; "no sé"/"no me acuerdo" se acepta sin insistir más.
    if _word_count(text) < MIN_WORDS_BEFORE_FOLLOWUP and not session.follow_up_asked:
        session.follow_up_asked = True
        followup_text = (
            f"Está bien, aunque sea una idea general me ayuda. {session.current_question_text or ''}"
        ).strip()
        db.add(session)
        agent_message = CVBuilderMessageModel(
            session_id=session.id, role="agent", text=followup_text, sequence=next_seq + 1
        )
        db.add(agent_message)
        db.commit()
        db.refresh(session)
        db.refresh(agent_message)
        return CVBuilderReply(
            session=to_session_schema(session), agent_message=to_message_schema(agent_message), done=False
        )

    job_family_code = _resolve_job_family_code(db, profile)
    request = CVConversationRequest(
        job_family_code=job_family_code,
        turn_index=session.turn_index + 1,
        max_turns=session.max_turns,
        last_answer=text,
        answers_so_far=dict(session.answers or {}),
    )
    result = invoke(db, "build_cv_conversationally", request, CVConversationResult, prompt_version="v1")

    answers = dict(session.answers or {})
    if result.field_captured:
        answers[result.field_captured] = result.captured_value
    session.answers = answers
    session.turn_index += 1
    session.follow_up_asked = False
    session.current_question_text = result.agent_message
    db.add(session)

    agent_message = CVBuilderMessageModel(
        session_id=session.id, role="agent", text=result.agent_message, sequence=next_seq + 1
    )
    db.add(agent_message)
    db.commit()
    db.refresh(session)
    db.refresh(agent_message)

    return CVBuilderReply(
        session=to_session_schema(session), agent_message=to_message_schema(agent_message), done=result.done
    )


def _render_cv_document_html(profile: CandidateProfile, answers: dict[str, str]) -> str:
    """CV descargable en HTML plano (docs/build/05_BACKEND_TASKS.md, fila B5).

    Decisión documentada: HTML/texto estructurado servido por `StoragePort`,
    en vez de generar un PDF real. Ninguna librería de PDF (ej. `reportlab`,
    `weasyprint`) trae valor proporcional a su costo de instalación para un
    entregable de hackatón que ya se sirve como archivo descargable/imprimible
    desde el navegador (`Ctrl+P -> Guardar como PDF` funciona igual de bien).
    """

    experience, education, skills, certifications, _claims = _build_parts(answers)
    name = escape(profile.full_name or profile.anon_code)

    def _rows(items: list[str]) -> str:
        return "".join(f"<li>{escape(item)}</li>" for item in items) or "<li>Sin información</li>"

    experience_rows = _rows(
        [f"{e['position']} — {e['company']} ({e['start_date'][:4]}–{e['end_date'][:4] if e['end_date'] else 'actual'})" for e in experience]
    )
    education_rows = _rows([f"{e['degree']} — {e['institution']}" for e in education])
    skills_rows = _rows([s["name"] for s in skills])
    certification_rows = _rows([c["name"] for c in certifications])

    return f"""<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>CV — {name}</title></head>
<body>
<h1>{name}</h1>
<p>CV generado por conversación con Sofía (Conecta Empleo).</p>
<h2>Experiencia</h2>
<ul>{experience_rows}</ul>
<h2>Educación</h2>
<ul>{education_rows}</ul>
<h2>Habilidades</h2>
<ul>{skills_rows}</ul>
<h2>Certificaciones</h2>
<ul>{certification_rows}</ul>
</body>
</html>"""


def finalize_session(db: Session, *, session: CVBuilderSessionModel, profile: CandidateProfile) -> CVExtraction:
    """Cierra la conversación: crea el `CVExtraction` pendiente de confirmación y el CV descargable."""

    if session.status == "FINALIZED":
        raise ValidationDomainError("Esta conversación ya fue finalizada.")
    if session.turn_index < session.max_turns:
        raise ValidationDomainError(
            "Todavía faltan preguntas por responder antes de poder cerrar la conversación."
        )

    experience, education, skills, certifications, claims = _build_parts(session.answers or {})
    extraction = cv_extraction_service.create_extraction(
        db,
        candidate_id=profile.id,
        document_id=None,
        confidence=0.7,
        experience=experience,
        education=education,
        skills=skills,
        certifications=certifications,
        claims=claims,
        raw_payload={"answers": session.answers or {}},
        ai_invocation_id=None,
    )

    html = _render_cv_document_html(profile, session.answers or {})
    storage = get_storage()
    storage_key = storage.save_text(
        owner_user_id=profile.user_id, doc_type="cv_builder", filename=f"cv-{session.id}.html", text=html
    )

    session.status = "FINALIZED"
    session.cv_extraction_id = extraction.id
    session.document_storage_key = storage_key
    session.document_generated_at = datetime.now(timezone.utc)
    db.add(session)
    db.commit()
    db.refresh(session)

    return cv_extraction_service.to_schema(db, extraction)


def get_document(session: CVBuilderSessionModel) -> CVDocument:
    if session.status != "FINALIZED" or not session.document_storage_key or session.document_generated_at is None:
        raise NotFoundError("Todavía no hay un CV generado para esta conversación; primero llama a finalize.")
    storage = get_storage()
    url = storage.url_for(session.document_storage_key) or ""
    return CVDocument(id=session.id, url=url, generated_at=session.document_generated_at)
