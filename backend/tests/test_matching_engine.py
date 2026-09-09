"""B9 — motor de matching determinista (`app/modules/matching/engine.py`).

Pruebas puras (sin DB, sin IA): construyen `MatchingCandidateView` /
`VacancyMatchContext` a mano y verifican la fórmula de `docs/04 §7` y sus
reglas de cálculo (§7.3). Corresponden a los puntos 3, 4 y 5 del criterio de
cierre de B9/B10 (`docs/build/00_BUILD_STATE.md`): normalización de pesos a
100, determinismo del score total, y penalización explícita y visible ante un
requisito obligatorio incumplido.
"""

from __future__ import annotations

from app.modules.matching import engine
from app.modules.vacancies.service import normalize_weights_dict


def _weights(**overrides: float) -> dict[str, float]:
    base = {"TECHNICAL": 40, "BEHAVIORAL": 20, "EXPERIENCE": 15, "EVIDENCE": 10, "SALARY": 8, "LOCATION": 7}
    base.update(overrides)
    return base


def _candidate(**overrides) -> engine.MatchingCandidateView:
    defaults = dict(
        candidate_id="11111111-1111-1111-1111-111111111111",
        anon_code="CND-TEST",
        location_city="León",
        location_state="Guanajuato",
        availability="IMMEDIATE",
        salary_expectation_min=10000,
        salary_expectation_max=14000,
        experience=(
            engine.ExperienceItemInput(start_date="2018-01-01", end_date="2024-01-01", skills=("inventario",)),
        ),
        evaluations=(
            engine.EvaluationInput("ADMIN_HA_01", "Excel", "TECHNICAL", 90, 4, 0.9),
            engine.EvaluationInput("ADMIN_SA_01", "Colaboración", "BEHAVIORAL", 80, 3, 0.8),
        ),
        skills=(
            engine.SkillInput("ADMIN_HA_01", "Excel", is_declared=True, is_evaluated=True, is_verified=True, evaluated_score=90),
        ),
    )
    defaults.update(overrides)
    return engine.MatchingCandidateView(**defaults)


def _vacancy(**overrides) -> engine.VacancyMatchContext:
    defaults = dict(
        weights=_weights(),
        requirements=(),
        location_city="León",
        location_state="Guanajuato",
        salary_min=9000,
        salary_max=15000,
    )
    defaults.update(overrides)
    return engine.VacancyMatchContext(**defaults)


# ---------------------------------------------------------------------------
# Determinismo (criterio de cierre #4)
# ---------------------------------------------------------------------------


def test_same_inputs_produce_identical_total_score() -> None:
    candidate = _candidate()
    vacancy = _vacancy()

    first = engine.compute_match(candidate, vacancy)
    second = engine.compute_match(candidate, vacancy)

    assert first.total_score == second.total_score
    assert first.breakdown == second.breakdown
    assert first.penalties == second.penalties
    assert first == second  # dataclasses frozen -> comparación estructural completa


def test_determinism_holds_across_many_repeated_runs() -> None:
    candidate = _candidate()
    vacancy = _vacancy()
    scores = {engine.compute_match(candidate, vacancy).total_score for _ in range(25)}
    assert len(scores) == 1


# ---------------------------------------------------------------------------
# Normalización de pesos a 100 (criterio de cierre #3, RB-07)
# ---------------------------------------------------------------------------


def test_weights_always_normalize_to_100_even_with_odd_values() -> None:
    odd_weights = {"TECHNICAL": 33, "BEHAVIORAL": 17, "EXPERIENCE": 13, "EVIDENCE": 11, "SALARY": 9, "LOCATION": 6}
    normalized = normalize_weights_dict(odd_weights)
    assert sum(normalized.values()) == 100


def test_weights_normalize_to_100_from_all_zero() -> None:
    normalized = normalize_weights_dict({"TECHNICAL": 0, "BEHAVIORAL": 0, "EXPERIENCE": 0, "EVIDENCE": 0, "SALARY": 0, "LOCATION": 0})
    assert sum(normalized.values()) == 100


# ---------------------------------------------------------------------------
# Requisito obligatorio incumplido -> penalización explícita, nunca eliminación (RB-08)
# ---------------------------------------------------------------------------


def test_mandatory_unmet_requirement_registers_visible_penalty_and_candidate_still_scores() -> None:
    candidate = _candidate()  # no tiene evaluación de "ADMIN_HA_99"
    vacancy = _vacancy(
        requirements=(
            engine.RequirementInput(
                label="Licencia de manejo de montacargas", kind="MANDATORY", min_level=3, competency_code="ADMIN_HA_99", skill_code=None
            ),
        )
    )

    computed = engine.compute_match(candidate, vacancy)

    assert computed.total_score > 0  # RB-08: nunca se elimina en silencio, sigue teniendo un score
    assert len(computed.penalties) == 1
    penalty = computed.penalties[0]
    assert penalty.reason == "MANDATORY_UNMET"
    assert penalty.requirement == "Licencia de manejo de montacargas"
    assert penalty.points > 0
    assert "Licencia de manejo de montacargas" in computed.gaps


def test_mandatory_met_requirement_registers_no_penalty() -> None:
    candidate = _candidate()  # ADMIN_HA_01 evaluado en nivel 4
    vacancy = _vacancy(
        requirements=(
            engine.RequirementInput(label="Dominio de Excel", kind="MANDATORY", min_level=3, competency_code="ADMIN_HA_01", skill_code=None),
        )
    )

    computed = engine.compute_match(candidate, vacancy)

    assert computed.penalties == ()
    assert computed.gaps == ()


def test_penalty_points_are_subtracted_from_total() -> None:
    candidate = _candidate()
    vacancy_without_requirement = _vacancy()
    vacancy_with_unmet = _vacancy(
        requirements=(
            engine.RequirementInput(label="Requisito imposible", kind="MANDATORY", min_level=4, competency_code="NUNCA_EVALUADO", skill_code=None),
        )
    )

    baseline = engine.compute_match(candidate, vacancy_without_requirement)
    penalized = engine.compute_match(candidate, vacancy_with_unmet)

    assert penalized.total_score == baseline.total_score - 8


# ---------------------------------------------------------------------------
# RB-10: confianza baja atenúa la contribución, nunca la anula
# ---------------------------------------------------------------------------


def test_low_confidence_attenuates_but_never_zeroes_contribution() -> None:
    high_confidence = _candidate(evaluations=(engine.EvaluationInput("ADMIN_HA_01", "Excel", "TECHNICAL", 100, 4, 1.0),))
    zero_confidence = _candidate(evaluations=(engine.EvaluationInput("ADMIN_HA_01", "Excel", "TECHNICAL", 100, 4, 0.0),))
    vacancy = _vacancy()

    high = engine.compute_match(high_confidence, vacancy)
    low = engine.compute_match(zero_confidence, vacancy)

    technical_high = next(b for b in high.breakdown if b.component == "TECHNICAL")
    technical_low = next(b for b in low.breakdown if b.component == "TECHNICAL")

    assert technical_low.raw < technical_high.raw  # se atenúa...
    assert technical_low.raw == 70.0  # ...exactamente a score * 0.7 (nunca a 0)
    assert technical_low.raw > 0  # ...pero nunca se anula


# ---------------------------------------------------------------------------
# Declarada vs. evaluada vs. verificada (docs/04 §7.3)
# ---------------------------------------------------------------------------


def test_declared_only_skill_contributes_less_than_verified() -> None:
    declared_only = _candidate(
        skills=(engine.SkillInput("X", "X", is_declared=True, is_evaluated=False, is_verified=False),)
    )
    verified = _candidate(
        skills=(engine.SkillInput("X", "X", is_declared=True, is_evaluated=True, is_verified=True, evaluated_score=90),)
    )
    vacancy = _vacancy()

    declared_computed = engine.compute_match(declared_only, vacancy)
    verified_computed = engine.compute_match(verified, vacancy)

    declared_raw = next(b for b in declared_computed.breakdown if b.component == "EVIDENCE").raw
    verified_raw = next(b for b in verified_computed.breakdown if b.component == "EVIDENCE").raw
    assert declared_raw < verified_raw


# ---------------------------------------------------------------------------
# Geografía por bandas (RB-06): nunca domicilio exacto
# ---------------------------------------------------------------------------


def test_geo_band_same_city_scores_higher_than_far() -> None:
    assert engine.geo_band_for("León", "León") == "SAME_CITY"
    assert engine.geo_band_for("León", "Monterrey") == "FAR"
    assert engine.GEO_BAND_SCORE["SAME_CITY"] > engine.GEO_BAND_SCORE["FAR"]


def test_matching_candidate_view_never_declares_protected_fields() -> None:
    """I-05/RB-05 a nivel de tipo: ni siquiera existen como atributos."""

    import dataclasses

    field_names = {f.name for f in dataclasses.fields(engine.MatchingCandidateView)}
    for forbidden in ("full_name", "photo_url", "birth_date", "gender"):
        assert forbidden not in field_names
