"""`DeterministicAdapter` — implementación de las 9 operaciones de `AIPort` sin LLM.

docs/04 §6.4, docs/05 §11.2. Sirve para tres cosas a la vez: (1) desarrollar y
probar el resto del backend sin gastar tokens ni depender de red, (2)
`AI_MODE=demo`, el plan B en vivo si un proveedor falla durante la
presentación, y (3) coherencia funcional con `frontend/src/api/mock/engine/*`
(mismo golden path, mismas reglas de negocio, datos de otra fuente).

Reglas de diseño de este adaptador:
- **No toca la base de datos.** Todo lo que necesita (rúbricas, catálogo de
  aprendizaje, historial de turnos) llega ya resuelto en el DTO de request —
  eso es responsabilidad del servicio de dominio que arma el request, no del
  adaptador. Esto es lo que hace cierto el requisito de B4 "evaluación por
  rúbricas leídas de la base (no del prompt)": la rúbrica sale de `rubrics`
  vía el servicio, se sirve al adaptador como `RubricSpec`, nunca como texto
  incrustado en una plantilla.
- **Determinista de verdad**: misma entrada -> misma salida. Cualquier
  variación usa un hash del contenido de entrada como semilla, nunca
  `random()` ni la hora del sistema.
- **Nunca inventa datos que no vinieron en el request** (cursos, URLs,
  porcentajes): API idéntica en espíritu a como se comportaría un adaptador
  real bien construido, solo que sin modelo de lenguaje detrás.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

from app.ai.contracts.advisory import (
    FeedbackRequest,
    FeedbackResult,
    LearningGapDTO,
    LearningPathRequest,
    LearningPathResult,
    LearningRecommendationDTO,
)
from app.ai.contracts.assessment import (
    CandidateSkillDTO,
    CompetencyScore,
    EvaluationRequest,
    EvaluationResult,
    TalentProfileRequest,
    TalentProfileResult,
)
from app.ai.contracts.base import RubricSpec, TurnDTO
from app.ai.contracts.interview import InterviewTurnRequest, InterviewTurnResult
from app.ai.contracts.matching import (
    MatchExplanationRequest,
    MatchExplanationResult,
    RequirementInputDTO,
    RequirementResolutionRequest,
    RequirementResolutionResult,
    RequirementWarningDTO,
)
from app.ai.contracts.profiling import (
    CertificationDTO,
    CVConversationRequest,
    CVConversationResult,
    CVParseRequest,
    CVParseResult,
    EducationItemDTO,
    ExperienceItemDTO,
)
from app.ai.contracts.base import ClaimDTO

# Pesos por defecto del matching (docs/build/02_API_CONTRACT.md §2). Vive aquí
# duplicado a propósito: es la "sugerencia" que A5 RESOLVE devuelve, no la
# fuente de verdad del motor de matching (esa vive en B9/`vacancies`).
DEFAULT_WEIGHTS: dict[str, int] = {
    "TECHNICAL": 40,
    "BEHAVIORAL": 20,
    "EXPERIENCE": 15,
    "EVIDENCE": 10,
    "SALARY": 8,
    "LOCATION": 7,
}

_FAMILY_TITLES: dict[str, str] = {
    "ADMIN_ASSISTANT": "auxiliar administrativo",
    "HEAVY_MACHINERY_OPERATOR": "operador de maquinaria pesada",
    "WAREHOUSE_SUPERVISOR": "encargado de almacén",
}

# Guion base de A1 modo BUILD (docs/05 §7 A1): 8 turnos, adaptativo en la
# orquestación real (B5), aquí es la secuencia estable que el adaptador
# devuelve turno a turno.
_CV_BUILDER_SCRIPT: list[dict[str, str]] = [
    {"field": "last_job", "prompt": "Para empezar, cuénteme: ¿en qué trabajó últimamente y cuánto tiempo estuvo ahí?"},
    {"field": "activities", "prompt": "¿Qué hacía en un día normal en ese trabajo?"},
    {"field": "tools", "prompt": "¿Qué herramientas, máquinas o sistemas usaba?"},
    {"field": "previous_jobs", "prompt": "Antes de eso, ¿en qué otros trabajos estuvo?"},
    {"field": "education", "prompt": "¿Qué estudios o cursos ha hecho, formales o no?"},
    {"field": "certifications", "prompt": "¿Tiene alguna certificación, licencia o constancia?"},
    {"field": "logistics", "prompt": "Para cerrar: ¿en qué zona le queda cómodo trabajar y con qué disponibilidad cuenta?"},
    {"field": "salary", "prompt": "Por último, ¿cuál sería su expectativa de sueldo mensual?"},
]

_DISCRIMINATORY_RULES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"m[aá]ximo\s+\d{2}\s*años?", re.I), "Límite máximo de edad: criterio discriminatorio por edad."),
    (
        re.compile(r"m[ií]nimo\s+\d{2}\s*años?\s+de\s+edad", re.I),
        "Límite mínimo de edad fuera de lo laboralmente exigible: criterio discriminatorio por edad.",
    ),
    (re.compile(r"solo\s+(hombres|mujeres)", re.I), "Restricción por sexo o género: criterio discriminatorio."),
    (re.compile(r"sexo\s+(masculino|femenino)", re.I), "Restricción por sexo: criterio discriminatorio."),
    (re.compile(r"buena presentaci[oó]n", re.I), 'Exigencia de "buena presentación": criterio discriminatorio por apariencia.'),
    (re.compile(r"estado civil|solter[oa]", re.I), "Referencia a estado civil: criterio discriminatorio."),
    (re.compile(r"sin hijos", re.I), "Exclusión por tener hijos: criterio discriminatorio."),
    (re.compile(r"nacionalidad mexicana", re.I), "Restricción por nacionalidad: criterio discriminatorio."),
]

_COMPONENT_LABELS_ES: dict[str, str] = {
    "TECHNICAL": "habilidades técnicas",
    "BEHAVIORAL": "competencias conductuales",
    "EXPERIENCE": "experiencia",
    "EVIDENCE": "calidad de evidencia",
    "SALARY": "compatibilidad salarial",
    "LOCATION": "ubicación",
}


def _word_count(text: str | None) -> int:
    return len((text or "").strip().split()) if text and text.strip() else 0


def _seed_from(*parts: str) -> int:
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def _jitter(seed: int, low: float, high: float) -> float:
    """Variación pseudoaleatoria determinista en [low, high], semillada por `seed`."""

    fraction = (seed % 1000) / 1000
    return low + fraction * (high - low)


def _excerpt(text: str, max_words: int = 10) -> str:
    words = (text or "").strip().split()
    if len(words) <= max_words:
        return " ".join(words)
    return " ".join(words[:max_words]) + "…"


def _word_limit(text: str, max_words: int = 120) -> str:
    words = text.strip().split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + "…"


@dataclass
class _LevelBand:
    level: int
    score_range: tuple[int, int]
    confidence_range: tuple[float, float]


_LEVEL_BANDS: list[_LevelBand] = [
    _LevelBand(4, (76, 92), (0.72, 0.93)),
    _LevelBand(3, (62, 78), (0.60, 0.82)),
    _LevelBand(2, (48, 64), (0.45, 0.68)),
    _LevelBand(1, (28, 42), (0.30, 0.50)),
]


def _band_for_words(words: int) -> _LevelBand:
    if words >= 25:
        return _LEVEL_BANDS[0]
    if words >= 15:
        return _LEVEL_BANDS[1]
    if words >= 6:
        return _LEVEL_BANDS[2]
    return _LEVEL_BANDS[3]  # nunca 0: una respuesta breve sigue siendo evidencia mínima (docs/05 §7 A3)


class DeterministicAdapter:
    """Implementación de `app.ai.port.AIPort` sin LLM. Ver docstring del módulo."""

    # ------------------------------------------------------------------
    # 1. parse_cv (A1 EXTRACT)
    # ------------------------------------------------------------------
    def parse_cv(self, req: CVParseRequest) -> CVParseResult:
        family = req.job_family_code
        title = _FAMILY_TITLES.get(family or "", "auxiliar operativo")
        text = req.document_text.strip()
        confidence = 0.85 if len(text) >= 200 else 0.65 if len(text) >= 40 else 0.45

        experience = [
            ExperienceItemDTO(
                company="Empresa mencionada en el documento",
                position=title.capitalize(),
                start_date="2021-01-01",
                end_date=None,
                is_current=True,
                description=_excerpt(text, 30) or f"Actividades relacionadas con {title}.",
                skills=[],
            )
        ]
        education = [
            EducationItemDTO(
                institution="Institución detectada en el documento",
                degree="Bachillerato / técnico",
                start_year=2015,
                end_year=2018,
            )
        ]
        certifications: list[CertificationDTO] = []
        if re.search(r"certificaci[oó]n|licencia|constancia", text, re.I):
            certifications.append(CertificationDTO(name="Certificación mencionada en el CV", issuer=None, year=None))

        claim = ClaimDTO(
            skill_code=None,
            statement=f'El documento menciona experiencia como "{title}".',
            claimed_level=2,
            source="CV",
        )

        return CVParseResult(
            status="PARSED",
            confidence=confidence,
            experience=experience,
            education=education,
            skills=[],
            certifications=certifications,
            claims=[claim],
        )

    # ------------------------------------------------------------------
    # 2. build_cv_conversationally (A1 BUILD)
    # ------------------------------------------------------------------
    def build_cv_conversationally(self, req: CVConversationRequest) -> CVConversationResult:
        previous_field = (
            _CV_BUILDER_SCRIPT[req.turn_index - 1]["field"] if 0 < req.turn_index <= len(_CV_BUILDER_SCRIPT) else None
        )
        if req.turn_index >= len(_CV_BUILDER_SCRIPT):
            return CVConversationResult(
                agent_message="Perfecto, con esto ya tengo lo necesario para armar su CV. Vamos a revisarlo juntos.",
                field_captured=previous_field,
                captured_value=req.last_answer,
                done=True,
            )
        spec = _CV_BUILDER_SCRIPT[req.turn_index]
        return CVConversationResult(
            agent_message=spec["prompt"],
            field_captured=previous_field,
            captured_value=req.last_answer,
            done=False,
        )

    # ------------------------------------------------------------------
    # 3. next_interview_question (A2)
    # ------------------------------------------------------------------
    def next_interview_question(self, req: InterviewTurnRequest) -> InterviewTurnResult:
        if req.remaining_questions <= 0:
            return InterviewTurnResult(
                action="FINISH", rationale="Presupuesto de preguntas agotado.", coverage_update={}
            )

        touched_codes = set(req.coverage_state.keys())
        untouched_core = [r for r in req.rubrics if r.is_core and r.competency_code not in touched_codes]
        if untouched_core:
            rubric = untouched_core[0]
            return self._ask(rubric)

        # PROBE: la respuesta más larga sin haber sido ya profundizada con una cita.
        already_referenced = {t.references_turn_id for t in req.history if t.references_turn_id}
        answered = [t for t in req.history if t.answer_text]
        probe_candidates = [t for t in answered if t.turn_id not in already_referenced and _word_count(t.answer_text) >= 12]
        if probe_candidates:
            target = max(probe_candidates, key=lambda t: _word_count(t.answer_text))
            return self._probe(target)

        untouched_rest = [r for r in req.rubrics if r.competency_code not in touched_codes]
        if untouched_rest:
            return self._ask(untouched_rest[0])

        # Claims de alto valor sin evidencia todavía (ej. certificación declarada, nunca preguntada).
        uncovered_claims = [c for c in req.claims if c.skill_code and c.skill_code not in touched_codes]
        if uncovered_claims:
            claim = uncovered_claims[0]
            return InterviewTurnResult(
                action="ASK",
                question_text=f'Mencionó "{claim.statement}". ¿Me puede platicar un ejemplo concreto de eso?',
                target_competency_code=claim.skill_code,
                question_intent="CLARIFY",
                rationale="Claim declarado sin evidencia de entrevista todavía.",
                coverage_update={claim.skill_code: "PARTIAL"} if claim.skill_code else {},
            )

        return InterviewTurnResult(
            action="FINISH", rationale="Cobertura suficiente en todas las competencias.", coverage_update={}
        )

    def _ask(self, rubric: RubricSpec) -> InterviewTurnResult:
        topic = rubric.what_to_probe[0] if rubric.what_to_probe else rubric.competency_name
        question = f"Cuénteme de una vez en el trabajo relacionada con {topic.lower()}. ¿Qué hizo?"
        return InterviewTurnResult(
            action="ASK",
            question_text=question,
            target_competency_code=rubric.competency_code,
            question_intent="SCENARIO",
            rationale=(
                "Competencia core sin explorar todavía."
                if rubric.is_core
                else "Competencia sin explorar todavía."
            ),
            coverage_update={rubric.competency_code: "PARTIAL"},
        )

    def _probe(self, turn: TurnDTO) -> InterviewTurnResult:
        excerpt = _excerpt(turn.answer_text or "", 8)
        question = f'Mencionó que "{excerpt}"; cuénteme más a detalle, ¿qué hizo exactamente en ese momento?'
        return InterviewTurnResult(
            action="PROBE",
            question_text=question,
            target_competency_code=turn.target_competency_code,
            question_intent="PROBE",
            references_turn_id=turn.turn_id,
            rationale="Respuesta anterior con evidencia extensa: se profundiza citándola (HU-I02).",
            coverage_update={turn.target_competency_code: "SUFFICIENT"},
        )

    # ------------------------------------------------------------------
    # 4. evaluate_competencies (A3)
    # ------------------------------------------------------------------
    def evaluate_competencies(self, req: EvaluationRequest) -> EvaluationResult:
        rubrics_by_code = {r.competency_code: r for r in req.rubrics}
        best_turn_by_competency: dict[str, TurnDTO] = {}
        for turn in req.transcript:
            if not turn.answer_text:
                continue
            current = best_turn_by_competency.get(turn.target_competency_code)
            if current is None or _word_count(turn.answer_text) > _word_count(current.answer_text):
                best_turn_by_competency[turn.target_competency_code] = turn

        evaluations: list[CompetencyScore] = []
        for code, turn in best_turn_by_competency.items():
            rubric = rubrics_by_code.get(code)
            if rubric is None:
                continue
            evaluations.append(self._score_turn(rubric, turn))

        if not evaluations:
            # No hubo transcripción evaluable: se sintetiza una entrada BASELINE de nivel 0
            # citando el único turno disponible, para no violar "evidence_turn_ids no vacío"
            # con una lista vacía de evaluaciones (EvaluationResult exige min_length=1).
            fallback_turn = req.transcript[-1] if req.transcript else None
            fallback_rubric = req.rubrics[0] if req.rubrics else None
            if fallback_turn and fallback_rubric:
                evaluations.append(
                    CompetencyScore(
                        competency_code=fallback_rubric.competency_code,
                        competency_name=fallback_rubric.competency_name,
                        type=fallback_rubric.type,
                        rubric_version=fallback_rubric.version,
                        rubric_source=fallback_rubric.source,
                        score=0,
                        rubric_level=0,
                        confidence=0.2,
                        justification=(
                            "No se encontró evidencia verbal suficiente en la transcripción para "
                            "esta competencia; se registra como no explorada, no como incompetencia."
                        ),
                        evidence_turn_ids=[fallback_turn.turn_id],
                        limitations="La entrevista no cubrió esta competencia con suficiente profundidad.",
                    )
                )
        return EvaluationResult(evaluations=evaluations)

    def _score_turn(self, rubric: RubricSpec, turn: TurnDTO) -> CompetencyScore:
        words = _word_count(turn.answer_text)
        band = _band_for_words(words)
        seed = _seed_from(turn.turn_id, turn.answer_text or "")
        score = round(_jitter(seed, *band.score_range))
        confidence = round(_jitter(seed >> 8, *band.confidence_range), 2)
        mapped_score = rubric.score_mapping.get(str(band.level))
        final_score = mapped_score if mapped_score is not None else score
        is_thin = band.level <= 2
        return CompetencyScore(
            competency_code=rubric.competency_code,
            competency_name=rubric.competency_name,
            type=rubric.type,
            rubric_version=rubric.version,
            rubric_source=rubric.source,
            score=max(0, min(100, final_score)),
            rubric_level=band.level,
            confidence=confidence,
            justification=f'En la entrevista respondió: "{_excerpt(turn.answer_text or "", 12)}"',
            evidence_turn_ids=[turn.turn_id],
            limitations="La respuesta fue breve; se recomienda profundizar en una siguiente conversación." if is_thin else None,
        )

    # ------------------------------------------------------------------
    # 5. build_talent_profile (A3 -> perfil)
    # ------------------------------------------------------------------
    def build_talent_profile(self, req: TalentProfileRequest) -> TalentProfileResult:
        evaluations = req.evaluations
        overall_score = round(sum(e.score for e in evaluations) / len(evaluations)) if evaluations else 40
        overall_label = "Evidencia sólida" if overall_score >= 75 else "Evidencia en desarrollo"

        strengths = [
            f"{e.competency_name} (evaluada, {e.score})"
            for e in sorted(evaluations, key=lambda e: e.score, reverse=True)
            if e.score >= 75
        ][:2] or ["Consistencia general en las respuestas"]

        evidence_gaps = [
            f"{e.competency_name}: {e.limitations or 'requiere más evidencia'}"
            for e in evaluations
            if e.rubric_level < 3
        ]

        top_skills = [
            CandidateSkillDTO(
                skill_code=c.skill_code,
                skill_name=c.skill_code,
                is_declared=True,
                is_evaluated=False,
            )
            for c in req.claims
            if c.skill_code
        ][:5]

        return TalentProfileResult(
            overall_score=overall_score,
            overall_label=overall_label,
            top_skills=top_skills,
            strengths=strengths,
            evidence_gaps=evidence_gaps,
            summary_text=(
                f"Perfil generado a partir de {len(evaluations)} competencias evaluadas, "
                f"con {overall_label.lower()}."
            ),
        )

    # ------------------------------------------------------------------
    # 6. explain_match (A5 EXPLAIN)
    # ------------------------------------------------------------------
    def explain_match(self, req: MatchExplanationRequest) -> MatchExplanationResult:
        strengths_text = " y ".join(req.strengths[:2])
        gaps_text = " y ".join(req.gaps[:2]) if req.gaps else None
        penalty_points = sum(p.points for p in req.penalties)

        if req.next_best_score is not None and req.total_score > req.next_best_score:
            position = f"Queda {req.total_score - req.next_best_score} puntos por encima del siguiente candidato."
        elif req.next_best_score is not None:
            position = "Está muy cerca del siguiente candidato en el ranking."
        else:
            position = "Es el mejor evaluado de este grupo."

        strength_sentence = (
            f"Sus principales fortalezas evaluadas son {strengths_text}."
            if strengths_text
            else "Muestra evidencia consistente aunque sin una fortaleza destacada todavía."
        )
        gap_sentence = f"Como brecha, falta evidencia en {gaps_text}." if gaps_text else "No se detectan brechas relevantes frente a los requisitos de la vacante."
        penalty_sentence = (
            f"Se aplicaron {abs(round(penalty_points))} puntos de penalización por requisitos obligatorios, salario o ubicación fuera de rango."
            if penalty_points
            else ""
        )

        text = _word_limit(
            f"Con {req.total_score}% de compatibilidad, {position} {strength_sentence} {gap_sentence} {penalty_sentence}".strip()
        )
        self._assert_no_foreign_percentage(text, req.total_score)
        return MatchExplanationResult(explanation_text=text)

    @staticmethod
    def _assert_no_foreign_percentage(text: str, total_score: int) -> None:
        """Defensa I-07 a nivel de adaptador: nunca un % distinto al calculado (docs/04 §7.4)."""

        for match in re.finditer(r"(\d+(?:\.\d+)?)\s*%", text):
            if float(match.group(1)) != float(total_score):
                raise ValueError(
                    f"explain_match generó un porcentaje ({match.group(1)}%) distinto de total_score ({total_score}%)."
                )

    # ------------------------------------------------------------------
    # 7. generate_feedback_report (A4)
    # ------------------------------------------------------------------
    def generate_feedback_report(self, req: FeedbackRequest) -> FeedbackResult:
        label = req.overall_label.lower()
        strengths = [e.competency_name for e in sorted(req.evaluations, key=lambda e: e.score, reverse=True) if e.score >= 75][:2]
        gaps = [e.competency_name for e in req.evaluations if e.rubric_level < 3][:2]

        candidate_note = f"Tu desempeño muestra {label}."
        if strengths:
            candidate_note += f" Destacan {', '.join(strengths)}."
        if gaps:
            candidate_note += f" Conviene reforzar evidencia en {', '.join(gaps)}: son accionables, no un juicio sobre ti."

        company_note = f"Candidato con {label} tras la entrevista conversacional ({len(req.evaluations)} competencias evaluadas)."
        if gaps:
            company_note += f" Conviene verificar en una entrevista presencial: {', '.join(gaps)}."

        return FeedbackResult(candidate_note=candidate_note, company_note=company_note)

    # ------------------------------------------------------------------
    # 8. recommend_learning_path (A4)
    # ------------------------------------------------------------------
    def recommend_learning_path(self, req: LearningPathRequest) -> LearningPathResult:
        weak = sorted(
            [e for e in req.evaluations if e.rubric_level < 3],
            key=lambda e: e.rubric_level,
        )[:3]

        gaps: list[LearningGapDTO] = []
        for evaluation in weak:
            entries = [c for c in req.catalog_entries if c.competency_code == evaluation.competency_code][:2]
            recommendations = [
                LearningRecommendationDTO(
                    type=entry.type,
                    provider=entry.provider,
                    title=entry.title,
                    estimated_effort=entry.estimated_effort,
                    source=entry.source,
                    url=entry.url,
                )
                for entry in entries
            ]
            gaps.append(
                LearningGapDTO(
                    competency_code=evaluation.competency_code,
                    competency_name=evaluation.competency_name,
                    current_level=evaluation.rubric_level,
                    target_level=3,
                    why_it_matters=f"Reforzar {evaluation.competency_name.lower()} mejora tu evidencia frente a vacantes similares.",
                    recommendations=recommendations,
                )
            )
        return LearningPathResult(gaps=gaps)

    # ------------------------------------------------------------------
    # 9. resolve_vacancy_requirements (A5 RESOLVE)
    # ------------------------------------------------------------------
    def resolve_vacancy_requirements(self, req: RequirementResolutionRequest) -> RequirementResolutionResult:
        phrases = [p.strip() for p in re.split(r"[\n.;]+", req.free_text) if p.strip()]
        mapped: list[RequirementInputDTO] = []
        unmapped: list[str] = []
        warnings: list[RequirementWarningDTO] = []
        used_codes: set[str] = set()

        for phrase in phrases:
            matched = False
            for pattern, reason in _DISCRIMINATORY_RULES:
                if pattern.search(phrase):
                    warnings.append(RequirementWarningDTO(text=phrase, reason=reason))
                    matched = True

            lowered = phrase.lower()
            for competency in req.catalog_competencies:
                if competency.code not in used_codes and self._phrase_matches(lowered, competency.name):
                    used_codes.add(competency.code)
                    mapped.append(
                        RequirementInputDTO(
                            competency_code=competency.code,
                            skill_code=None,
                            label=competency.name,
                            kind="MANDATORY",
                            min_level=2,
                            weight=0,
                        )
                    )
                    matched = True
            for skill in req.catalog_skills:
                if skill.code not in used_codes and self._phrase_matches(lowered, skill.name):
                    used_codes.add(skill.code)
                    mapped.append(
                        RequirementInputDTO(
                            competency_code=None,
                            skill_code=skill.code,
                            label=skill.name,
                            kind="DESIRABLE",
                            min_level=2,
                            weight=0,
                        )
                    )
                    matched = True

            if not matched:
                unmapped.append(phrase)

        if mapped:
            equal_weight = round(100 / len(mapped))
            for idx, item in enumerate(mapped):
                item.weight = 100 - equal_weight * (len(mapped) - 1) if idx == len(mapped) - 1 else equal_weight

        return RequirementResolutionResult(
            mapped=mapped, unmapped=unmapped, warnings=warnings, suggested_weights=dict(DEFAULT_WEIGHTS)
        )

    @staticmethod
    def _phrase_matches(lowered_phrase: str, catalog_name: str) -> bool:
        """Heurística de mapeo: alguna palabra significativa del catálogo aparece en la frase."""

        for word in re.split(r"\s+", catalog_name.lower()):
            clean = re.sub(r"[^\wáéíóúñ]", "", word)
            if len(clean) >= 4 and clean in lowered_phrase:
                return True
        return False
