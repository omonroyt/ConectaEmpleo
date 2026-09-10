"""Normalización del CV conversacional (`docs/build/08_CV_NARRATIVE_NORMALIZATION.md` §4).

El caso de `REAL_ANSWERS` es una transcripción real de una sesión por voz: es
exactamente lo que producía el defecto que motivó esta capa (la pantalla C7
mostraba "no no estuve en otros trabajos" como un puesto de trabajo).
"""

from __future__ import annotations

from app.modules.cv_builder.normalize import (
    FIRST_JOB_STATEMENT,
    is_negative,
    normalize_cv,
    strip_fillers,
    to_sentence,
)
from app.modules.cv_builder.service import _build_parts

#: Transcripción real (voz -> STT) que originó el defecto.
REAL_ANSWERS: dict[str, str] = {
    "last_job": (
        "se me escucha bueno diría que mi experiencia parte de la universidad "
        "tengo título universitario en este rubro y Bueno estoy buscando mi primer empleo"
    ),
    "activities": (
        "Ah claro bueno llevaba la contabilidad los registros en una base de datos en Excel"
    ),
    "previous_jobs": "no no estuve en otros trabajos",
    "education": "tengo la licenciatura en administra",
}


def test_negative_answer_never_becomes_a_job_position() -> None:
    """Criterio 1: "no no estuve en otros trabajos" no es un puesto."""

    result = normalize_cv(REAL_ANSWERS, job_family_code="ADMIN_ASSISTANT")

    assert result.experience == ()
    assert result.no_formal_experience is True
    assert any(claim.statement == FIRST_JOB_STATEMENT for claim in result.claims)


def test_no_field_echoes_the_raw_transcription() -> None:
    """Criterio 2: ningún campo del CV es igual a la respuesta cruda.

    Los `claims` quedan fuera a propósito: un claim **debe** citar lo que la
    persona declaró, es una afirmación a validar en la entrevista, no prosa
    de CV.
    """

    result = normalize_cv(REAL_ANSWERS, job_family_code="ADMIN_ASSISTANT")
    raw_values = set(REAL_ANSWERS.values())

    for item in result.experience:
        assert item.position not in raw_values
        assert item.description not in raw_values
    for item in result.education:
        assert item.degree not in raw_values


def test_education_is_reclassified_from_the_last_job_turn() -> None:
    """Criterio: un turno no determina la sección (docs/build/08 §3.2 regla 4)."""

    result = normalize_cv(REAL_ANSWERS, job_family_code="ADMIN_ASSISTANT")

    assert len(result.education) == 1, result.education
    education = result.education[0]
    assert education.level == "LICENCIATURA"
    # Gana la mención más específica ("licenciatura en …") sobre la genérica
    # ("título universitario") en vez de duplicar la misma formación.
    assert education.degree.startswith("Licenciatura")


def test_truncated_speech_is_flagged_not_completed() -> None:
    """Criterio: "administra" se conserva y se marca; nunca se autocompleta."""

    result = normalize_cv(REAL_ANSWERS, job_family_code="ADMIN_ASSISTANT")

    assert "education" in result.needs_user_review
    assert "Administración" not in result.education[0].degree


def test_build_parts_invents_no_dates_and_no_company() -> None:
    """Criterio 3: sin fechas fabricadas (llegaban al motor como experiencia real)."""

    experience, education, _skills, _certs, _claims = _build_parts(
        REAL_ANSWERS, job_family_code="ADMIN_ASSISTANT"
    )

    assert experience == []
    for item in education:
        assert item["start_year"] is None
        assert item["end_year"] is None
        assert item["institution"] == ""


def test_years_of_experience_is_zero_for_a_first_job_seeker() -> None:
    """El motor de matching ya no recibe años de experiencia inventados."""

    from app.modules.matching.engine import ExperienceItemInput, years_of_experience

    experience, _education, _skills, _certs, _claims = _build_parts(
        REAL_ANSWERS, job_family_code="ADMIN_ASSISTANT"
    )
    items = tuple(
        ExperienceItemInput(start_date=e["start_date"], end_date=e["end_date"]) for e in experience
    )

    assert years_of_experience(items) == 0


def test_real_job_answer_still_produces_an_experience_entry() -> None:
    """La capa no puede volverse un filtro que borre experiencia real."""

    result = normalize_cv(
        {
            "last_job": "pues mire estuve de auxiliar administrativo en una tienda como dos años",
            "activities": "este, llevaba el control de la papelería y atendía a los proveedores",
            "tools": "Excel, Word y el sistema de facturación",
        },
        job_family_code="ADMIN_ASSISTANT",
    )

    assert result.no_formal_experience is False
    assert len(result.experience) == 1
    assert result.experience[0].position.lower().startswith("auxiliar administrativo")
    assert result.experience[0].is_current is True
    assert result.experience[0].description.startswith("Llevaba el control")
    assert {name for _code, name in result.skills} == {"Excel", "Word", "El sistema de facturación"}


def test_strip_fillers_only_removes_discourse_markers() -> None:
    assert strip_fillers("Ah claro bueno llevaba la contabilidad") == "llevaba la contabilidad"
    # "este" es demostrativo aquí, no muletilla: no se toca.
    assert "este rubro" in strip_fillers("bueno tengo experiencia en este rubro")


def test_to_sentence_capitalizes_and_closes() -> None:
    assert to_sentence("pues llegaba temprano") == "Llegaba temprano."
    assert to_sentence("") == ""


def test_is_negative_covers_the_common_ways_of_saying_no() -> None:
    for answer in ("no", "no no estuve en otros trabajos", "ninguna", "no he trabajado", "nada"):
        assert is_negative(answer), answer
    assert not is_negative("estuve en una bodega dos años")
