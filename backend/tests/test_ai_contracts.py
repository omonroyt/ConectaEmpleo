"""B4: contratos de `AIPort` v1.1 + las 9 operaciones de `DeterministicAdapter`.

Cubre el criterio de cierre: invariante I-04 (score fuera de rango -> error,
nunca clamp) y que las 9 operaciones del adaptador determinista devuelven
respuestas que validan contra sus contratos, incluido el golden path de
entrevista con `references_turn_id` no nulo (HU-I02).
"""

from __future__ import annotations

import re

import pytest
from pydantic import ValidationError

from app.ai.adapters.deterministic import DeterministicAdapter
from app.ai.contracts.advisory import (
    FeedbackRequest,
    FeedbackResult,
    LearningCatalogEntryDTO,
    LearningPathRequest,
    LearningPathResult,
)
from app.ai.contracts.assessment import (
    CompetencyScore,
    EvaluationRequest,
    EvaluationResult,
    TalentProfileRequest,
    TalentProfileResult,
)
from app.ai.contracts.base import CandidateSnapshotForAI, ClaimDTO, RubricLevelDTO, RubricSpec, TurnDTO
from app.ai.contracts.interview import InterviewTurnRequest, InterviewTurnResult
from app.ai.contracts.matching import (
    BreakdownItemDTO,
    CatalogCompetencyRefDTO,
    MatchExplanationRequest,
    MatchExplanationResult,
    RequirementResolutionRequest,
    RequirementResolutionResult,
)
from app.ai.contracts.profiling import (
    CVConversationRequest,
    CVConversationResult,
    CVParseRequest,
    CVParseResult,
)
from app.ai.port import AI_OPERATIONS


def _rubric(code: str, name: str, *, is_core: bool = True, source: str = "SPECIFIC") -> RubricSpec:
    return RubricSpec(
        competency_code=code,
        competency_name=name,
        type="TECHNICAL",
        is_core=is_core,
        version=1,
        source=source,
        what_to_probe=["Métodos utilizados y su periodicidad"],
        levels=[
            RubricLevelDTO(level=0, label="Sin evidencia", descriptor="No aporta ejemplos."),
            RubricLevelDTO(level=1, label="Básico", descriptor="Menciona algo sin método."),
            RubricLevelDTO(level=2, label="En desarrollo", descriptor="Describe un método propio."),
            RubricLevelDTO(level=3, label="Competente", descriptor="Describe método y ejemplo concreto."),
            RubricLevelDTO(level=4, label="Avanzado", descriptor="Propone mejoras medibles."),
        ],
        positive_signals=["cita cifras"],
        negative_signals=["responde en abstracto"],
        score_mapping={"0": 0, "1": 25, "2": 50, "3": 75, "4": 100},
    )


# ---------------------------------------------------------------------------
# I-04: score / rubric_level / confidence fuera de rango -> ValidationError, nunca clamp.
# ---------------------------------------------------------------------------


def _valid_score_kwargs() -> dict:
    return dict(
        competency_code="INVENTORY_CONTROL",
        competency_name="Control de inventarios",
        type="TECHNICAL",
        rubric_version=1,
        rubric_source="SPECIFIC",
        score=80,
        rubric_level=3,
        confidence=0.7,
        justification="Describió un método de conteo cíclico semanal con ejemplo concreto.",
        evidence_turn_ids=["turn-1"],
    )


def test_score_out_of_range_is_rejected_not_clamped() -> None:
    kwargs = _valid_score_kwargs()
    kwargs["score"] = 150
    with pytest.raises(ValidationError):
        CompetencyScore(**kwargs)

    kwargs = _valid_score_kwargs()
    kwargs["score"] = -5
    with pytest.raises(ValidationError):
        CompetencyScore(**kwargs)


def test_rubric_level_out_of_range_is_rejected() -> None:
    kwargs = _valid_score_kwargs()
    kwargs["rubric_level"] = 5
    with pytest.raises(ValidationError):
        CompetencyScore(**kwargs)


def test_confidence_out_of_range_is_rejected() -> None:
    kwargs = _valid_score_kwargs()
    kwargs["confidence"] = 1.5
    with pytest.raises(ValidationError):
        CompetencyScore(**kwargs)


def test_justification_below_min_length_is_rejected() -> None:
    kwargs = _valid_score_kwargs()
    kwargs["justification"] = "muy corto"
    with pytest.raises(ValidationError):
        CompetencyScore(**kwargs)


def test_empty_evidence_turn_ids_is_rejected() -> None:
    kwargs = _valid_score_kwargs()
    kwargs["evidence_turn_ids"] = []
    with pytest.raises(ValidationError):
        CompetencyScore(**kwargs)


# ---------------------------------------------------------------------------
# Las 9 operaciones de AIPort, todas cubiertas.
# ---------------------------------------------------------------------------


def test_ai_operations_are_exactly_nine() -> None:
    assert len(AI_OPERATIONS) == 9
    assert len(set(AI_OPERATIONS)) == 9


def test_parse_cv_returns_plausible_result_by_family() -> None:
    adapter = DeterministicAdapter()
    req = CVParseRequest(
        document_id="doc-1",
        job_family_code="WAREHOUSE_SUPERVISOR",
        document_text="Trabajé 3 años como auxiliar de almacén controlando inventarios y recepción.",
    )
    result = adapter.parse_cv(req)
    validated = CVParseResult.model_validate(result.model_dump())
    assert validated.status == "PARSED"
    assert 0 <= validated.confidence <= 1
    assert len(validated.experience) >= 1


def test_build_cv_conversationally_progresses_and_finishes() -> None:
    adapter = DeterministicAdapter()
    seen_done = False
    last_answer = None
    for turn_index in range(0, 9):
        req = CVConversationRequest(job_family_code="ADMIN_ASSISTANT", turn_index=turn_index, max_turns=8, last_answer=last_answer)
        result = adapter.build_cv_conversationally(req)
        CVConversationResult.model_validate(result.model_dump())
        last_answer = "una respuesta cualquiera del candidato"
        if result.done:
            seen_done = True
            break
    assert seen_done


def test_interview_golden_path_produces_probe_with_references_turn_id() -> None:
    """Corre el bucle completo de entrevista con el adaptador y exige al menos
    un turno PROBE con `references_turn_id` no nulo (HU-I02), respetando el presupuesto.
    """

    adapter = DeterministicAdapter()
    rubrics = [
        _rubric("INVENTORY_CONTROL", "Control de inventarios", is_core=True),
        _rubric("FORKLIFT_SAFETY", "Seguridad en montacargas", is_core=True),
        _rubric("TEAM_COORDINATION", "Coordinación de equipo", is_core=False, source="PROVISIONAL"),
    ]
    snapshot = CandidateSnapshotForAI(anon_code="CND-TEST", job_family_code="WAREHOUSE_SUPERVISOR")

    history: list[TurnDTO] = []
    coverage_state: dict[str, str] = {}
    budget = 6
    found_probe_with_reference = False

    long_answer = (
        "Cada semana hacía un conteo cíclico de las zonas más movidas y comparaba contra el "
        "sistema; cuando no cuadraba revisaba las salidas del día y reportaba la diferencia."
    )

    for i in range(budget):
        remaining = budget - i
        req = InterviewTurnRequest(
            session_id="sess-1",
            job_family_code="WAREHOUSE_SUPERVISOR",
            candidate_snapshot=snapshot,
            rubrics=rubrics,
            claims=[],
            history=history,
            coverage_state=coverage_state,
            remaining_questions=remaining,
        )
        result = adapter.next_interview_question(req)
        InterviewTurnResult.model_validate(result.model_dump())

        if result.action == "FINISH":
            break

        if result.action == "PROBE" and result.references_turn_id is not None:
            found_probe_with_reference = True

        turn_id = f"turn-{i}"
        answer_text = long_answer if i == 0 else "sí, lo hacía siempre"
        history.append(
            TurnDTO(
                turn_id=turn_id,
                sequence=i,
                question_text=result.question_text or "",
                target_competency_code=result.target_competency_code or "UNKNOWN",
                question_intent=result.question_intent or "SCENARIO",
                references_turn_id=result.references_turn_id,
                answer_text=answer_text,
            )
        )
        for code, new_status in result.coverage_update.items():
            coverage_state[code] = new_status

    assert found_probe_with_reference, "Ningún turno PROBE citó una respuesta anterior (references_turn_id)."
    assert len(history) <= budget  # I-06: nunca excede el presupuesto


def test_evaluate_competencies_reads_rubrics_from_request_not_from_prompt() -> None:
    adapter = DeterministicAdapter()
    rubric = _rubric("INVENTORY_CONTROL", "Control de inventarios")
    transcript = [
        TurnDTO(
            turn_id="t1",
            sequence=1,
            question_text="¿Cómo controlaba el inventario?",
            target_competency_code="INVENTORY_CONTROL",
            question_intent="SCENARIO",
            answer_text=(
                "Hacía conteos cíclicos cada semana en las zonas de mayor movimiento y "
                "cuando había diferencia la conciliaba contra el sistema el mismo día."
            ),
        )
    ]
    req = EvaluationRequest(
        session_id="sess-1", job_family_code="WAREHOUSE_SUPERVISOR", transcript=transcript, rubrics=[rubric]
    )
    result = adapter.evaluate_competencies(req)
    validated = EvaluationResult.model_validate(result.model_dump())
    assert len(validated.evaluations) == 1
    evaluation = validated.evaluations[0]
    assert evaluation.evidence_turn_ids == ["t1"]
    assert evaluation.rubric_source == "SPECIFIC"
    assert 0 <= evaluation.score <= 100


def test_build_talent_profile_from_evaluations() -> None:
    adapter = DeterministicAdapter()
    score = CompetencyScore(**_valid_score_kwargs())
    req = TalentProfileRequest(
        candidate_snapshot=CandidateSnapshotForAI(anon_code="CND-TEST"),
        evaluations=[score],
        claims=[ClaimDTO(skill_code="FORKLIFT_OPERATION", statement="Manejo montacargas", claimed_level=3)],
    )
    result = adapter.build_talent_profile(req)
    validated = TalentProfileResult.model_validate(result.model_dump())
    assert 0 <= validated.overall_score <= 100
    assert validated.summary_text


def test_explain_match_never_mentions_a_foreign_percentage() -> None:
    adapter = DeterministicAdapter()
    req = MatchExplanationRequest(
        total_score=78,
        next_best_score=65,
        breakdown=[BreakdownItemDTO(component="TECHNICAL", weight=40, raw=82, contribution=32.8)],
        penalties=[],
        strengths=["control de inventarios"],
        gaps=["manejo de montacargas"],
    )
    result = adapter.explain_match(req)
    validated = MatchExplanationResult.model_validate(result.model_dump())
    percentages = {float(m.group(1)) for m in re.finditer(r"(\d+(?:\.\d+)?)\s*%", validated.explanation_text)}
    assert percentages.issubset({78.0})


def test_generate_feedback_report_has_candidate_and_company_notes() -> None:
    adapter = DeterministicAdapter()
    score = CompetencyScore(**_valid_score_kwargs())
    req = FeedbackRequest(
        candidate_snapshot=CandidateSnapshotForAI(anon_code="CND-TEST"),
        evaluations=[score],
        overall_label="Evidencia sólida",
    )
    result = adapter.generate_feedback_report(req)
    validated = FeedbackResult.model_validate(result.model_dump())
    assert validated.candidate_note
    assert validated.company_note


def test_recommend_learning_path_uses_only_catalog_entries_never_invents() -> None:
    adapter = DeterministicAdapter()
    weak_score_kwargs = _valid_score_kwargs()
    weak_score_kwargs["rubric_level"] = 1
    weak_score_kwargs["score"] = 30
    weak = CompetencyScore(**weak_score_kwargs)
    catalog_entry = LearningCatalogEntryDTO(
        competency_code="INVENTORY_CONTROL",
        type="COURSE",
        provider="Platzi",
        title="Curso de control de inventarios",
        estimated_effort="6 horas",
        source="CATALOG",
        url="https://platzi.com/curso-inventarios",
    )
    req = LearningPathRequest(evaluations=[weak], catalog_entries=[catalog_entry])
    result = adapter.recommend_learning_path(req)
    validated = LearningPathResult.model_validate(result.model_dump())
    assert len(validated.gaps) <= 3
    assert len(validated.gaps) == 1
    recommendation = validated.gaps[0].recommendations[0]
    assert recommendation.title == catalog_entry.title
    assert recommendation.url == catalog_entry.url


def test_resolve_vacancy_requirements_detects_discriminatory_phrases() -> None:
    adapter = DeterministicAdapter()
    req = RequirementResolutionRequest(
        job_family_code="ADMIN_ASSISTANT",
        free_text="Control documental y archivo.\nSolo hombres.\nMáximo 30 años.",
        catalog_competencies=[
            CatalogCompetencyRefDTO(code="DOCUMENT_CONTROL", name="Control documental y archivo", type="TECHNICAL")
        ],
        catalog_skills=[],
    )
    result = adapter.resolve_vacancy_requirements(req)
    validated = RequirementResolutionResult.model_validate(result.model_dump())
    assert any(r.competency_code == "DOCUMENT_CONTROL" for r in validated.mapped)
    assert len(validated.warnings) == 2
    if validated.mapped:
        assert abs(sum(r.weight for r in validated.mapped) - 100) < 1e-6
