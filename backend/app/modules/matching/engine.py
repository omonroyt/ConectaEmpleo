"""B9 — motor de matching determinista, **sin LLM** (docs/04 §7, I-07).

Este módulo es Python puro: no importa SQLAlchemy, no toca la base de datos y
no llama a `AIPort`. Recibe dos vistas ya armadas por `service.py`
(`MatchingCandidateView`, `VacancyMatchContext`) y devuelve un
`MatchComputation` — la misma fórmula, dato por dato, que
`frontend/src/api/mock/engine/matching.ts` (`computeMatch`), para que el
backend y el mock del frontend produzcan el mismo tipo de desglose ante los
mismos insumos (docs/build "respeta la semántica").

Fórmula (docs/04 §7.1):

    score_bruto = Σ (peso_normalizado_i × score_componente_i)
    total       = clamp(score_bruto − penalizaciones, 0, 100)

**`MatchingCandidateView` carece físicamente de `full_name`, `photo_url`,
`birth_date` y `gender`** (I-05, RB-05): no se están ocultando aquí, la clase
ni siquiera los declara. Es la misma técnica que ya usa
`app/ai/contracts/base.py::CandidateSnapshotForAI` para el mismo invariante
del lado de IA. `app/modules/matching/service.py` es quien arma esta vista
con un `select()` de columnas explícitas (nunca `select(CandidateProfile)`
completo) para que el invariante también sea cierto un nivel más abajo, en la
consulta SQL misma.

**Advertencia heredada de B2b** (`docs/build/00_BUILD_STATE.md`,
`HEAVY_MACHINERY_OPERATOR` tiene 2 competencias conductuales core frente a 1
en las otras familias): los componentes TECHNICAL/BEHAVIORAL se calculan como
un **promedio** de las evaluaciones vigentes de ese tipo, nunca como una suma
ni con un peso fijo por competencia. Un promedio ya es insensible al número
real de competencias de cada bloque -- 1 evaluación o 3, el resultado vive en
la misma escala 0-100 -- así que ninguna familia queda en desventaja
estructural por definir más o menos competencias conductuales que otra.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Literal

MatchComponent = Literal["TECHNICAL", "BEHAVIORAL", "EXPERIENCE", "EVIDENCE", "SALARY", "LOCATION"]
GeoBand = Literal["SAME_CITY", "UNDER_30KM", "UNDER_80KM", "FAR"]
RequirementKind = Literal["MANDATORY", "DESIRABLE"]
PenaltyReason = Literal["MANDATORY_UNMET", "SALARY_OUT_OF_RANGE", "LOCATION_FAR"]

#: Los 6 componentes fijos, en el orden de `docs/build/02_API_CONTRACT.md` §2.
MATCH_COMPONENTS: tuple[MatchComponent, ...] = (
    "TECHNICAL",
    "BEHAVIORAL",
    "EXPERIENCE",
    "EVIDENCE",
    "SALARY",
    "LOCATION",
)

ALGORITHM_VERSION = "be-det-1.0.0"


def clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return min(hi, max(lo, value))


# ---------------------------------------------------------------------------
# Insumos (vistas de solo lectura, sin identidad)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class EvaluationInput:
    """Una fila vigente (`is_current=True`) de `competency_evaluations`."""

    competency_code: str
    competency_name: str
    type: Literal["TECHNICAL", "BEHAVIORAL"]
    score: float  # 0-100
    rubric_level: int  # 0-4
    confidence: float  # 0-1


@dataclass(frozen=True)
class SkillInput:
    """Una fila de `candidate_skills` (tres banderas independientes, docs/04 §5.5)."""

    skill_code: str
    skill_name: str
    is_declared: bool
    is_evaluated: bool
    is_verified: bool
    evaluated_score: int | None = None
    confidence: float | None = None
    evidence_summary: str | None = None


@dataclass(frozen=True)
class ExperienceItemInput:
    start_date: str  # ISO
    end_date: str | None
    skills: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class MatchingCandidateView:
    """Vista del candidato que llega al motor.

    Deliberadamente NO declara `full_name`, `photo_url`, `birth_date` ni
    `gender` -- ver el docstring del módulo. `candidate_id`/`anon_code` no son
    atributos protegidos (son el identificador interno y el código anónimo
    público respectivamente), así que sí viajan.
    """

    candidate_id: str
    anon_code: str
    location_city: str | None
    location_state: str | None
    availability: str | None
    salary_expectation_min: int | None
    salary_expectation_max: int | None
    experience: tuple[ExperienceItemInput, ...]
    evaluations: tuple[EvaluationInput, ...]
    skills: tuple[SkillInput, ...]


@dataclass(frozen=True)
class RequirementInput:
    label: str
    kind: RequirementKind
    min_level: int
    competency_code: str | None
    skill_code: str | None


@dataclass(frozen=True)
class VacancyMatchContext:
    weights: dict[str, float]  # 6 llaves, normalizadas a 100 (RB-07, hecho por B8 al guardar)
    requirements: tuple[RequirementInput, ...]
    location_city: str | None
    location_state: str | None
    salary_min: int | None
    salary_max: int | None


# ---------------------------------------------------------------------------
# Salida
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class BreakdownItem:
    component: MatchComponent
    weight: float
    raw: float
    contribution: float


@dataclass(frozen=True)
class Penalty:
    reason: PenaltyReason
    requirement: str
    points: float  # magnitud positiva restada del score bruto (ver nota abajo)


@dataclass(frozen=True)
class MatchComputation:
    total_score: int
    breakdown: tuple[BreakdownItem, ...]
    penalties: tuple[Penalty, ...]
    strengths: tuple[str, ...]
    gaps: tuple[str, ...]
    evidence_counts: dict[str, int]
    years_experience: int
    geo_band: GeoBand
    salary_band: str


# ---------------------------------------------------------------------------
# Geografía por bandas (RB-06: nunca domicilio exacto, solo bandas)
# ---------------------------------------------------------------------------

#: Mismas 15 ciudades y coordenadas que `frontend/src/api/mock/seed/geo.ts`
#: (centro de ciudad, no domicilio real) para que ambos motores banden igual.
CITY_COORDS: dict[str, tuple[float, float]] = {
    "León": (21.1219, -101.6866),
    "Guadalajara": (20.6597, -103.3496),
    "Ciudad de México": (19.4326, -99.1332),
    "Monterrey": (25.6866, -100.3161),
    "Querétaro": (20.5888, -100.3899),
    "Puebla": (19.0414, -98.2063),
    "Irapuato": (20.6767, -101.3556),
    "Celaya": (20.5232, -100.8156),
    "Silao": (20.9436, -101.427),
    "Aguascalientes": (21.8853, -102.2916),
    "Toluca": (19.2926, -99.6568),
    "San Luis Potosí": (22.1565, -100.9855),
    "Guanajuato": (21.019, -101.2574),
    "Salamanca": (20.5717, -101.1948),
    "Pachuca": (20.1011, -98.7591),
}

GEO_BAND_SCORE: dict[GeoBand, float] = {
    "SAME_CITY": 100,
    "UNDER_30KM": 85,
    "UNDER_80KM": 60,
    "FAR": 25,
}


def _haversine_km(city_a: str, city_b: str) -> float:
    import math

    coords_a = CITY_COORDS.get(city_a)
    coords_b = CITY_COORDS.get(city_b)
    if coords_a is None or coords_b is None:
        return 500.0  # ciudad desconocida: se trata como lejana (nunca se asume cercanía)
    if city_a == city_b:
        return 0.0
    lat1, lng1 = coords_a
    lat2, lng2 = coords_b
    r = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    h = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(
        d_lng / 2
    ) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(h)))


def geo_band_for(candidate_city: str | None, vacancy_city: str | None) -> GeoBand:
    if not candidate_city or not vacancy_city:
        return "FAR"
    if candidate_city == vacancy_city:
        return "SAME_CITY"
    km = _haversine_km(candidate_city, vacancy_city)
    if km == 0:
        return "SAME_CITY"
    if km <= 30:
        return "UNDER_30KM"
    if km <= 80:
        return "UNDER_80KM"
    return "FAR"


# ---------------------------------------------------------------------------
# Experiencia
# ---------------------------------------------------------------------------

#: Curva no lineal (docs/build/00_BUILD_STATE.md, bitácora de F9): discrimina
#: en el rango real de candidatos (2-13 años) en vez de saturar en 100 desde
#: los 5 años. Idéntica a `EXPERIENCE_CURVE_POINTS` del mock.
_EXPERIENCE_CURVE_POINTS: tuple[tuple[float, float], ...] = (
    (0, 0),
    (2, 35),
    (4, 55),
    (6, 70),
    (9, 85),
    (12, 97),
    (16, 100),
)


def _experience_curve(years: float) -> float:
    points = _EXPERIENCE_CURVE_POINTS
    if years <= points[0][0]:
        return points[0][1]
    last = points[-1]
    if years >= last[0]:
        return last[1]
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        if x0 <= years <= x1:
            t = (years - x0) / (x1 - x0)
            return y0 + t * (y1 - y0)
    return last[1]


def _parse_date(value: str) -> datetime | None:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def years_of_experience(experience: tuple[ExperienceItemInput, ...], *, today: date | None = None) -> int:
    now = datetime.combine(today, datetime.min.time()) if today else datetime.now()
    months = 0.0
    for item in experience:
        start = _parse_date(item.start_date)
        end = _parse_date(item.end_date) if item.end_date else now
        if start is None or end is None:
            continue
        # Ambos datetimes deben ser naive o aware por igual para poder restarse.
        if start.tzinfo is not None and end.tzinfo is None:
            end = end.replace(tzinfo=start.tzinfo)
        elif start.tzinfo is None and end.tzinfo is not None:
            start = start.replace(tzinfo=end.tzinfo)
        if end > start:
            months += (end - start).days / 30.0
    return round(months / 12)


def _has_family_relevant_experience(experience: tuple[ExperienceItemInput, ...]) -> bool:
    return any(len(item.skills) > 0 for item in experience)


# ---------------------------------------------------------------------------
# Componentes individuales
# ---------------------------------------------------------------------------


def _average_attenuated(evaluations: list[EvaluationInput]) -> float:
    """RB-10: la confianza atenúa la contribución, nunca la anula.

    `score * (0.7 + 0.3 * confidence)`: aun con confianza 0, queda el 70% del
    score -- nunca cero. Promediar (no sumar) es lo que hace insensible este
    componente al número real de competencias del bloque (ver docstring del
    módulo, advertencia de B2b).
    """

    if not evaluations:
        return 0.0
    total = sum(e.score * (0.7 + 0.3 * e.confidence) for e in evaluations)
    return clamp(total / len(evaluations))


def _evidence_raw(skills: tuple[SkillInput, ...]) -> tuple[float, dict[str, int]]:
    """Mezcla declarada/evaluada/verificada (docs/04 §7.3: "skill solo declarada
    aporta con factor reducido; sin evidencia no hay puntaje pleno")."""

    total_skills = max(1, len(skills))
    declared = sum(1 for s in skills if s.is_declared)
    evaluated = sum(1 for s in skills if s.is_evaluated)
    verified = sum(1 for s in skills if s.is_verified)
    raw = clamp((100 * (0.2 * declared + 0.5 * evaluated + 1.0 * verified)) / total_skills)
    return raw, {"declared": declared, "evaluated": evaluated, "verified": verified}


def _salary_raw(candidate: MatchingCandidateView, vacancy: VacancyMatchContext) -> float:
    cand_min, cand_max = candidate.salary_expectation_min, candidate.salary_expectation_max
    vac_min, vac_max = vacancy.salary_min, vacancy.salary_max
    if cand_min is None or cand_max is None or vac_min is None or vac_max is None:
        return 60.0  # sin datos suficientes: neutral, ni castiga ni premia
    overlap = cand_min <= vac_max and cand_max >= vac_min
    if overlap:
        return 100.0
    gap = (cand_min - vac_max) if cand_min > vac_max else (vac_min - cand_max)
    reference = max(1, (vac_min + vac_max) / 2)
    ratio = gap / reference
    return 60.0 if ratio < 0.2 else 20.0


def _salary_band(candidate: MatchingCandidateView) -> str:
    if candidate.salary_expectation_min is None or candidate.salary_expectation_max is None:
        return "No especificado"
    lo = round(candidate.salary_expectation_min / 1000)
    hi = round(candidate.salary_expectation_max / 1000)
    return f"{lo}–{hi} mil"


# ---------------------------------------------------------------------------
# Requisitos: cumplimiento, penalizaciones y brechas (docs/04 §7.3, RB-08)
# ---------------------------------------------------------------------------


def _requirement_met(candidate: MatchingCandidateView, requirement: RequirementInput) -> bool:
    if requirement.competency_code:
        evaluation = next(
            (e for e in candidate.evaluations if e.competency_code == requirement.competency_code), None
        )
        if evaluation is None:
            return False
        return evaluation.rubric_level >= requirement.min_level
    if requirement.skill_code:
        skill = next((s for s in candidate.skills if s.skill_code == requirement.skill_code), None)
        if skill is None or not skill.is_evaluated:
            return False
        # score 0-100 -> nivel 0-4 aproximado (mismo mapeo que el mock: ceil(score/25)).
        level = 0 if skill.evaluated_score is None else -(-skill.evaluated_score // 25)
        return level >= requirement.min_level
    return True  # requisito sin código mapeado: no se puede verificar, no se penaliza


#: Puntos fijos por tipo de penalización -- deterministas, iguales para todos
#: los candidatos de un mismo run, iguales a `computePenalties` del mock.
_MANDATORY_UNMET_POINTS = 8.0
_SALARY_OUT_OF_RANGE_POINTS = 5.0
_LOCATION_FAR_POINTS = 5.0


def _penalties(
    candidate: MatchingCandidateView, vacancy: VacancyMatchContext, *, salary_raw: float, geo_band: GeoBand
) -> list[Penalty]:
    penalties: list[Penalty] = []
    for requirement in vacancy.requirements:
        if requirement.kind != "MANDATORY":
            continue
        if not _requirement_met(candidate, requirement):
            # RB-08: nunca se elimina en silencio al candidato -- la penalización
            # queda registrada y explícita, con la causa visible.
            penalties.append(
                Penalty(reason="MANDATORY_UNMET", requirement=requirement.label, points=_MANDATORY_UNMET_POINTS)
            )
    if salary_raw <= 20:
        penalties.append(Penalty(reason="SALARY_OUT_OF_RANGE", requirement="Rango salarial", points=_SALARY_OUT_OF_RANGE_POINTS))
    if geo_band == "FAR":
        penalties.append(Penalty(reason="LOCATION_FAR", requirement="Ubicación", points=_LOCATION_FAR_POINTS))
    return penalties


def _gaps(candidate: MatchingCandidateView, vacancy: VacancyMatchContext) -> list[str]:
    return [r.label for r in vacancy.requirements if not _requirement_met(candidate, r)]


def _strengths(evaluations: tuple[EvaluationInput, ...]) -> list[str]:
    strong = sorted((e for e in evaluations if e.score >= 75), key=lambda e: e.score, reverse=True)[:2]
    if not strong:
        return ["Consistencia general en la evidencia disponible"]
    return [f"{e.competency_name}: evidencia sólida ({round(e.score)}/100)" for e in strong]


# ---------------------------------------------------------------------------
# Punto de entrada
# ---------------------------------------------------------------------------


def compute_match(candidate: MatchingCandidateView, vacancy: VacancyMatchContext) -> MatchComputation:
    """`total = clamp(Σ(peso_i × score_i) − penalizaciones, 0, 100)` (docs/04 §7.1).

    Determinista: la misma `MatchingCandidateView`/`VacancyMatchContext`
    producen siempre el mismo `MatchComputation` -- no hay `random()`, ni
    `datetime.now()` salvo para el cálculo de años de experiencia (que
    recibe explícitamente `today` en los tests para hacerlo reproducible).
    """

    technical_raw = _average_attenuated([e for e in candidate.evaluations if e.type == "TECHNICAL"])
    behavioral_raw = _average_attenuated([e for e in candidate.evaluations if e.type == "BEHAVIORAL"])

    years = years_of_experience(candidate.experience)
    experience_raw = clamp(_experience_curve(years))
    if not _has_family_relevant_experience(candidate.experience):
        experience_raw = clamp(experience_raw * 0.85)

    evidence_raw, evidence_counts = _evidence_raw(candidate.skills)
    salary_raw = _salary_raw(candidate, vacancy)
    geo_band = geo_band_for(candidate.location_city, vacancy.location_city)
    location_raw = GEO_BAND_SCORE[geo_band]

    raw_by_component: dict[MatchComponent, float] = {
        "TECHNICAL": technical_raw,
        "BEHAVIORAL": behavioral_raw,
        "EXPERIENCE": experience_raw,
        "EVIDENCE": evidence_raw,
        "SALARY": salary_raw,
        "LOCATION": location_raw,
    }

    breakdown = tuple(
        BreakdownItem(
            component=component,
            weight=vacancy.weights.get(component, 0.0),
            raw=round(raw_by_component[component], 2),
            contribution=round(vacancy.weights.get(component, 0.0) / 100 * raw_by_component[component], 2),
        )
        for component in MATCH_COMPONENTS
    )

    penalties = tuple(_penalties(candidate, vacancy, salary_raw=salary_raw, geo_band=geo_band))
    weighted_sum = sum(item.contribution for item in breakdown)
    penalty_points = sum(p.points for p in penalties)
    total_score = int(round(clamp(weighted_sum - penalty_points)))

    return MatchComputation(
        total_score=total_score,
        breakdown=breakdown,
        penalties=penalties,
        strengths=tuple(_strengths(candidate.evaluations)),
        gaps=tuple(_gaps(candidate, vacancy)),
        evidence_counts=evidence_counts,
        years_experience=years,
        geo_band=geo_band,
        salary_band=_salary_band(candidate),
    )


def score_label_for(score: int) -> str:
    if score >= 85:
        return "Compatibilidad muy alta"
    if score >= 70:
        return "Compatibilidad alta"
    if score >= 50:
        return "Compatibilidad media"
    return "Compatibilidad baja"
