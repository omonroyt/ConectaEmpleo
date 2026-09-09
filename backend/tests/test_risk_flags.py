"""Master Prompt §31 "Safety / reglas" — banderas de riesgo son evidencia,
nunca decisiones (§18). Ejercita `assessments.service.detect_risk_flags`
directamente contra sesiones/turnos construidos a mano con las preguntas
reales del banco semilla (`HM-05`, `SE-07`, `SA-07`)."""

from __future__ import annotations

import uuid

from sqlalchemy.orm import Session

from app.modules.assessments import service
from app.modules.candidates.models import CandidateProfile
from app.modules.catalog.models import InterviewQuestion, JobFamily
from app.modules.identity.schemas import RegisterInput
from app.modules.identity.service import register_user
from app.modules.interviews.models import InterviewSession, InterviewTurn


def _make_candidate(db_session: Session, email: str, family_code: str) -> CandidateProfile:
    user = register_user(db_session, RegisterInput(email=email, password="demo1234", role="CANDIDATE"))
    profile = db_session.query(CandidateProfile).filter(CandidateProfile.user_id == user.id).one()
    family_id = db_session.query(JobFamily.id).filter(JobFamily.code == family_code).scalar()
    profile.job_family_id = family_id
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)
    return profile


def _make_session_with_answer(
    db_session: Session, *, profile: CandidateProfile, question_id: str, answer_text: str
) -> InterviewSession:
    question = db_session.query(InterviewQuestion).filter(
        InterviewQuestion.job_family_id == profile.job_family_id, InterviewQuestion.question_id == question_id
    ).one()

    session = InterviewSession(
        candidate_id=profile.id,
        job_family_id=profile.job_family_id,
        status="COMPLETED",
        mode="TEXT",
        question_budget=14,
        questions_asked=1,
        coverage_state={},
    )
    db_session.add(session)
    db_session.flush()

    turn = InterviewTurn(
        session_id=session.id,
        sequence=1,
        question_text=question.text,
        target_competency_id=question.competency_id,
        question_intent="SCENARIO",
        answer_text=answer_text,
        question_id=question.question_id,
        is_follow_up=False,
        block=question.block,
    )
    db_session.add(turn)
    db_session.commit()
    db_session.refresh(session)
    return session


def test_operator_choosing_to_keep_operating_after_hydraulic_leak_flags_safety_critical_high(
    db_session: Session, unique_email: str
) -> None:
    profile = _make_candidate(db_session, unique_email, "HEAVY_MACHINERY_OPERATOR")
    session = _make_session_with_answer(
        db_session,
        profile=profile,
        question_id="HM-05",
        answer_text=(
            "Le echo un ojo rápido a la fuga pero de todos modos seguiría operando la máquina "
            "porque no quiero atrasar el trabajo del día."
        ),
    )

    flags = service.detect_risk_flags(db_session, session=session)
    assert any(f.code == "SAFETY_CRITICAL" and f.severity == "high" for f in flags)


def test_operator_who_stops_the_machine_does_not_get_flagged(db_session: Session, unique_email: str) -> None:
    profile = _make_candidate(db_session, unique_email, "HEAVY_MACHINERY_OPERATOR")
    session = _make_session_with_answer(
        db_session,
        profile=profile,
        question_id="HM-05",
        answer_text=(
            "Detendría la máquina de inmediato, aseguraría el área para evitar contacto con el fluido "
            "y reportaría la fuga antes de decidir si puede seguir operando."
        ),
    )

    flags = service.detect_risk_flags(db_session, session=session)
    assert not any(f.code == "SAFETY_CRITICAL" for f in flags)


def test_warehouse_answer_that_confronts_for_merchandise_is_flagged_never_rewarded(
    db_session: Session, unique_email: str
) -> None:
    profile = _make_candidate(db_session, unique_email, "WAREHOUSE_SUPERVISOR")
    session = _make_session_with_answer(
        db_session,
        profile=profile,
        question_id="SE-07",
        answer_text="Iría a confrontar directamente a la persona para recuperar la mercancía antes de que se la lleve.",
    )

    flags = service.detect_risk_flags(db_session, session=session)
    assert any(f.code == "PHYSICAL_SAFETY_RISK" and f.severity == "high" for f in flags)


def test_warehouse_answer_that_avoids_confrontation_is_not_flagged(db_session: Session, unique_email: str) -> None:
    profile = _make_candidate(db_session, unique_email, "WAREHOUSE_SUPERVISOR")
    session = _make_session_with_answer(
        db_session,
        profile=profile,
        question_id="SE-07",
        answer_text=(
            "Evitaría confrontar directamente a la persona, preservaría la evidencia y avisaría de "
            "inmediato al responsable siguiendo el protocolo."
        ),
    )

    flags = service.detect_risk_flags(db_session, session=session)
    assert not any(f.code == "PHYSICAL_SAFETY_RISK" for f in flags)


def test_admin_answer_that_discloses_confidential_information_is_flagged(
    db_session: Session, unique_email: str
) -> None:
    profile = _make_candidate(db_session, unique_email, "ADMIN_ASSISTANT")
    session = _make_session_with_answer(
        db_session,
        profile=profile,
        question_id="SA-07",
        answer_text="Como es un conocido, le compartiría el dato sin problema para ayudarlo.",
    )

    flags = service.detect_risk_flags(db_session, session=session)
    assert any(f.code == "CONFIDENTIALITY_BREACH" for f in flags)


def test_admin_answer_that_verifies_authorization_first_is_not_flagged(
    db_session: Session, unique_email: str
) -> None:
    profile = _make_candidate(db_session, unique_email, "ADMIN_ASSISTANT")
    session = _make_session_with_answer(
        db_session,
        profile=profile,
        question_id="SA-07",
        answer_text="No le compartiría el dato; primero consultaría con mi jefe si estoy autorizado a darlo.",
    )

    flags = service.detect_risk_flags(db_session, session=session)
    assert not any(f.code == "CONFIDENTIALITY_BREACH" for f in flags)
