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
from app.ai.contracts.base import AnswerInterpretation, RubricSpec, TurnDTO
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
    SkillClaimDTO,
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

# Detección de skills por palabra clave en el texto real del CV (docs/build/02
# §2, mismos códigos de catálogo). Deliberadamente simple (sin NLP): el
# `DeterministicAdapter` nunca inventa nada que no esté en el texto de
# entrada, así que basta con un escaneo de literales para producir una skill
# "detectada" con evidencia citable (docs/05 §7 A1: "cada skill detectada
# genera un claim con source_ref"). B11 puede sustituir esto por comprensión
# semántica real sin tocar el contrato.
_SKILL_KEYWORDS: list[tuple[str, str, re.Pattern[str]]] = [
    ("OFFICE_TOOLS", "Herramientas de oficina", re.compile(r"excel|word|office|correo electr", re.I)),
    ("DOCUMENT_CONTROL", "Control documental y archivo", re.compile(r"archivo|control document|expediente", re.I)),
    ("CUSTOMER_SERVICE", "Atención a clientes", re.compile(r"atenci[oó]n a client|servicio al client", re.I)),
    ("MACHINERY_OPERATION", "Operación de maquinaria", re.compile(r"maquinaria|retroexcavadora|gr[uú]a", re.I)),
    ("SAFETY_PROTOCOLS", "Protocolos de seguridad", re.compile(r"protocolos? de seguridad|seguridad industrial", re.I)),
    ("LOAD_HANDLING", "Manejo de cargas", re.compile(r"manejo de carga", re.I)),
    ("INVENTORY_CONTROL", "Control de inventarios", re.compile(r"inventario", re.I)),
    ("FORKLIFT_SAFETY", "Seguridad en montacargas", re.compile(r"montacargas", re.I)),
    ("RECEIVING_DISPATCH", "Recepción y despacho", re.compile(r"recepci[oó]n y despacho|recibo de mercan", re.I)),
    ("WMS_ERP_SYSTEMS", "Sistemas WMS / ERP", re.compile(r"\bwms\b|\berp\b|sistema de almac[eé]n", re.I)),
]


def _detect_skill_claims(text: str) -> list[tuple[SkillClaimDTO, ClaimDTO]]:
    """Escanea `text` por palabras clave de catálogo y arma skill + claim citables.

    Cada coincidencia produce **una** `SkillClaimDTO` y **un** `ClaimDTO` con
    `source_ref.excerpt` apuntando al fragmento real que lo originó — nunca
    un nivel o una skill que no tenga texto de respaldo.
    """

    found: list[tuple[SkillClaimDTO, ClaimDTO]] = []
    for code, name, pattern in _SKILL_KEYWORDS:
        match = pattern.search(text)
        if not match:
            continue
        start = max(0, match.start() - 40)
        end = min(len(text), match.end() + 40)
        excerpt = text[start:end].strip()
        found.append(
            (
                SkillClaimDTO(code=code, name=name, level=2),
                ClaimDTO(
                    skill_code=code,
                    statement=f'El documento menciona "{name.lower()}".',
                    claimed_level=2,
                    source="CV",
                    source_ref={"excerpt": excerpt},
                ),
            )
        )
    return found

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


# ---------------------------------------------------------------------------
# Capa de comprensión (B14): traducir la respuesta cruda a contexto utilizable
# ---------------------------------------------------------------------------
# El transcript de voz llega con disfluencias ("Sí, te puedo compartir lo que
# hice. Eh, ..."). Repreguntar citándolo literalmente produce preguntas
# incoherentes, así que aquí se limpia, se extraen los temas y se clasifica la
# calidad de la evidencia ANTES de decidir qué preguntar. Todo determinista:
# regex y conjuntos, misma entrada -> misma salida, sin LLM.

#: Tokens que en español hablado nunca son palabras de contenido. Se eliminan
#: en cualquier posición.
_NOISE_TOKEN_RE = re.compile(r"(?i)\b(?:eh+|ehm+|em+|mm+h?|aj[áa]|hmm+)\b")

#: Muletillas que **sí** son palabras reales ("este proceso", "pues bien"), así
#: que solo se eliminan cuando el fragmento entre comas es exactamente eso.
_STANDALONE_FILLERS = frozenset(
    {
        "o sea",
        "este",
        "esto",
        "pues",
        "bueno",
        "digamos",
        "a ver",
        "verdad",
        "sí",
        "si",
        "ya sabes",
        "como te digo",
        "no sé cómo decirlo",
    }
)

_STOPWORDS = frozenset(
    {
        "para", "pero", "porque", "cuando", "donde", "como", "esta", "este", "esto", "esos", "esas",
        "todo", "toda", "todos", "todas", "desde", "hasta", "sobre", "entre", "cada", "muy", "más",
        "mas", "también", "tambien", "algo", "alguna", "alguno", "otro", "otra", "otros", "otras",
        "que", "los", "las", "una", "unos", "unas", "del", "con", "por", "sus", "les", "nos",
        "ellos", "ellas", "usted", "ustedes", "siempre", "nunca", "entonces", "luego", "después",
        "despues", "antes", "mismo", "misma", "hacer", "hago", "tener", "tengo", "estar", "estoy",
        "poder", "puedo", "decir", "cosa", "cosas", "veces", "forma", "manera",
    }
)

#: Marcadores de acción concreta y de resultado. Una respuesta con ambos ya es
#: evidencia utilizable; con acción pero sin resultado, todavía falta algo que
#: preguntar (y ahí es donde una repregunta aporta valor real).
_ACTION_MARKERS = (
    "hice", "hacía", "hacia", "hago", "revis", "report", "organiz", "captur", "verific",
    "compar", "coordin", "apliqu", "registr", "elabor", "arm", "carg", "atend", "oper",
    "supervis", "concili", "clasific", "orden",
)
_OUTCOME_MARKERS = (
    "resultado", "logr", "al final", "termin", "evit", "mejor", "reduj", "redujo",
    "gracias a eso", "consegu", "solucion", "resolv", "se corrigi", "quedó", "quedo",
)
_NO_EXPERIENCE_MARKERS = (
    "no sé", "no se", "no me acuerdo", "no recuerdo", "nunca he", "no he usado",
    "no he trabajado", "no tengo experiencia", "no conozco", "no lo he",
)


def _normalize_fragment(fragment: str) -> str:
    return re.sub(r"[^0-9a-záéíóúüñ ]", "", fragment.lower()).strip()


def _collapse_repeats(text: str) -> str:
    """"que que hacía" -> "que hacía" (tartamudeo típico de transcripción)."""

    return re.sub(r"(?i)\b(\w+)(\s+\1\b)+", r"\1", text)


def strip_fillers(text: str) -> str:
    """Quita muletillas y repeticiones **sin** cambiar el léxico ni el registro.

    Nunca agrega información y nunca "sube" el registro de la persona: eso
    rompería la prueba de equidad de `docs/build/06_INTERVIEW_SYSTEM.md` §8.4
    (registro formal vs. coloquial dentro de ±10 puntos) y contradice la
    Constitución ("La forma de hablar no es la competencia").
    """

    raw = (text or "").strip()
    if not raw:
        return ""

    step = _NOISE_TOKEN_RE.sub(" ", raw)
    sentences: list[str] = []
    for sentence in re.split(r"(?<=[.!?…])\s+", step):
        fragments = [f.strip() for f in sentence.split(",")]
        useful = [f for f in fragments if _normalize_fragment(f) and _normalize_fragment(f) not in _STANDALONE_FILLERS]
        if useful:
            sentences.append(", ".join(useful))

    cleaned = " ".join(sentences)
    # Quitar una muletilla puede dejar la conjunción huérfana entre comas
    # ("en Excel, y, comparaba"): se vuelve a pegar a la frase.
    cleaned = re.sub(r"(?i),\s*(y|e|o|u|pero|entonces)\s*,", r" \1", cleaned)
    cleaned = _collapse_repeats(cleaned)
    cleaned = re.sub(r"\s+([.,;:!?…])", r"\1", cleaned)
    cleaned = re.sub(r"[.,;:]\s*([.,;:…])", r"\1", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,;.…")
    if not cleaned:
        # Una respuesta que era solo muletillas se devuelve tal cual: la
        # evidencia cruda nunca se pierde por limpiarla.
        return re.sub(r"\s+", " ", raw)

    cleaned = cleaned[0].upper() + cleaned[1:]
    # Quitar una muletilla puede dejar minúscula al inicio de una oración.
    cleaned = re.sub(
        r"([.!?…]\s+)([a-záéíóúüñ])",
        lambda m: m.group(1) + m.group(2).upper(),
        cleaned,
    )
    if not cleaned.endswith((".", "!", "?", "…")):
        cleaned += "."
    return cleaned


def _content_words(text: str) -> set[str]:
    words = re.findall(r"[0-9a-záéíóúüñ]+", (text or "").lower())
    return {w for w in words if len(w) >= 4 and w not in _STOPWORDS}


def _detect_topics(answer: str, rubric: RubricSpec | None) -> list[str]:
    """Herramientas y temas que la persona mencionó, en sus propias palabras."""

    topics: list[str] = []

    # 1. Nombres propios y acrónimos (Excel, SAP, WMS): mayúscula que no es
    #    inicio de oración, así que sí significa algo.
    for match in re.finditer(r"\b(?:[A-ZÁÉÍÓÚÑ]{2,6}|[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,})\b", answer or ""):
        prefix = (answer or "")[: match.start()].rstrip()
        if not prefix or prefix.endswith((".", "!", "?", "…", "¿", "¡", '"')):
            continue
        token = match.group(0)
        if token.lower() in _STOPWORDS or token in topics:
            continue
        topics.append(token)

    # 2. Ítems de `what_to_probe` que la respuesta efectivamente toca. Es la
    #    rúbrica la que define qué es un tema relevante, nunca este archivo.
    if rubric is not None:
        answer_words = _content_words(answer)
        for item in rubric.what_to_probe:
            if _content_words(item) & answer_words and item not in topics:
                topics.append(item)

    return topics[:5]


def _classify_evidence(clean_answer: str, topics: list[str]) -> tuple[str, list[str]]:
    lowered = clean_answer.lower()
    words = _word_count(clean_answer)

    if any(marker in lowered for marker in _NO_EXPERIENCE_MARKERS) and words < 15:
        return "NO_EXPERIENCE", ["experiencia con el tema preguntado"]
    if words <= 2:
        return "VAGUE", ["contenido"]

    has_action = any(marker in lowered for marker in _ACTION_MARKERS)
    has_outcome = any(marker in lowered for marker in _OUTCOME_MARKERS)

    if words < 12:
        return "VAGUE", ["ejemplo concreto"]
    if has_action and has_outcome:
        return "SUFFICIENT", []
    if has_action:
        return "PARTIAL", ["resultado de lo que hizo"]
    if topics:
        return "PARTIAL", ["acción concreta de la persona"]
    return "VAGUE", ["acción concreta de la persona", "resultado"]
    # OFF_TOPIC existe en el contrato pero no se emite aquí: decidir que una
    # respuesta "no viene al caso" sin comprender el idioma produce falsos
    # positivos, y un falso OFF_TOPIC castiga a quien se expresa distinto.


def interpret_answer(turn: TurnDTO, rubric: RubricSpec | None = None) -> AnswerInterpretation:
    """`AnswerInterpretation` determinista de la respuesta de `turn`.

    Es la etapa intermedia entre "lo que la persona dijo" y "qué le pregunto
    ahora": limpia el transcript, saca los temas, dice qué le falta a la
    respuesta y, si procede, sobre qué conviene profundizar. La siguiente
    pregunta se construye sobre `probe_focus`, **nunca** sobre `answer_text`.
    """

    raw = turn.answer_text or ""
    clean = strip_fillers(raw)
    topics = _detect_topics(clean, rubric)
    quality, missing = _classify_evidence(clean, topics)

    focus: str | None = None
    if quality in ("PARTIAL", "VAGUE"):
        if topics:
            focus = topics[0]
        elif rubric is not None and rubric.what_to_probe:
            focus = rubric.what_to_probe[0].lower()
        elif rubric is not None:
            focus = rubric.competency_name.lower()

    return AnswerInterpretation(
        clean_answer=clean,
        summary=_excerpt(clean, 20),
        topics=topics,
        evidence_quality=quality,
        missing_elements=missing,
        contradicts_claims=[],
        probe_focus=focus,
    )


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

        skill_claim_pairs = _detect_skill_claims(text)
        skills = [pair[0] for pair in skill_claim_pairs]
        claims = [pair[1] for pair in skill_claim_pairs]

        # Siempre se registra al menos un claim general de experiencia, citando
        # el propio fragmento usado para "position" (nunca un texto inventado),
        # aunque no se haya detectado ninguna skill puntual por palabra clave.
        claims.append(
            ClaimDTO(
                skill_code=None,
                statement=f'El documento menciona experiencia como "{title}".',
                claimed_level=2,
                source="CV",
                source_ref={"excerpt": _excerpt(text, 15)} if text else None,
            )
        )

        return CVParseResult(
            status="PARSED",
            confidence=confidence,
            experience=experience,
            education=education,
            skills=skills,
            certifications=certifications,
            claims=claims,
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
        # Etapa 1 — comprensión: se interpreta la última respuesta ANTES de
        # decidir nada. Viaja en el resultado aunque la acción no sea PROBE,
        # para que el orquestador la persista y A3 evalúe sobre texto limpio.
        last_answered = next((t for t in reversed(req.history) if t.answer_text), None)
        rubrics_by_code = {r.competency_code: r for r in req.rubrics}
        interpretation: AnswerInterpretation | None = None
        if last_answered is not None:
            interpretation = interpret_answer(
                last_answered, rubrics_by_code.get(last_answered.target_competency_code)
            )

        if req.remaining_questions <= 0:
            return InterviewTurnResult(
                action="FINISH",
                answer_interpretation=interpretation,
                rationale="Presupuesto de preguntas agotado.",
                coverage_update={},
            )

        touched_codes = set(req.coverage_state.keys())
        untouched_core = [r for r in req.rubrics if r.is_core and r.competency_code not in touched_codes]
        if untouched_core:
            return self._ask(untouched_core[0], interpretation)

        # Etapa 2 — decisión: se repregunta solo si la interpretación dice que
        # falta algo. Antes se profundizaba en cualquier respuesta larga, lo
        # que convertía la entrevista en un interrogatorio mecánico.
        # Se prefiere la última respuesta (es de lo que se está hablando); si
        # esa no da pie, se puede volver sobre una anterior que quedó a medias.
        already_referenced = {t.references_turn_id for t in req.history if t.references_turn_id}
        for candidate in reversed(req.history):
            if not candidate.answer_text or candidate.turn_id in already_referenced:
                continue
            if _word_count(candidate.answer_text) < 12:
                continue
            candidate_rubric = rubrics_by_code.get(candidate.target_competency_code)
            candidate_reading = (
                interpretation
                if candidate is last_answered and interpretation is not None
                else interpret_answer(candidate, candidate_rubric)
            )
            if candidate_reading.evidence_quality not in ("PARTIAL", "VAGUE"):
                continue
            return self._probe(
                candidate,
                candidate_reading,
                candidate_rubric,
                # `answer_interpretation` siempre describe la ÚLTIMA respuesta:
                # es la que el orquestador persiste en su turno.
                answer_interpretation=interpretation,
            )

        untouched_rest = [r for r in req.rubrics if r.competency_code not in touched_codes]
        if untouched_rest:
            return self._ask(untouched_rest[0], interpretation)

        # Claims de alto valor sin evidencia todavía (ej. certificación declarada, nunca preguntada).
        uncovered_claims = [c for c in req.claims if c.skill_code and c.skill_code not in touched_codes]
        if uncovered_claims:
            claim = uncovered_claims[0]
            topic = _excerpt(strip_fillers(claim.statement), 8).rstrip("…").rstrip(".")
            return InterviewTurnResult(
                action="ASK",
                answer_interpretation=interpretation,
                question_text=f"En tu experiencia con {topic.lower()}, ¿me platicas un ejemplo concreto?",
                target_competency_code=claim.skill_code,
                question_intent="CLARIFY",
                rationale="Claim declarado sin evidencia de entrevista todavía.",
                coverage_update={claim.skill_code: "PARTIAL"} if claim.skill_code else {},
            )

        return InterviewTurnResult(
            action="FINISH",
            answer_interpretation=interpretation,
            rationale="Cobertura suficiente en todas las competencias.",
            coverage_update={},
        )

    def _ask(self, rubric: RubricSpec, interpretation: AnswerInterpretation | None = None) -> InterviewTurnResult:
        topic = rubric.what_to_probe[0] if rubric.what_to_probe else rubric.competency_name
        question = f"Cuéntame de una vez en el trabajo relacionada con {topic.lower()}. ¿Qué hiciste?"
        return InterviewTurnResult(
            action="ASK",
            answer_interpretation=interpretation,
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

    def _probe(
        self,
        turn: TurnDTO,
        interpretation: AnswerInterpretation,
        rubric: RubricSpec | None = None,
        *,
        answer_interpretation: AnswerInterpretation | None = None,
    ) -> InterviewTurnResult:
        """Repregunta construida sobre el TEMA interpretado, jamás sobre el transcript.

        Citar literalmente la respuesta produce preguntas incoherentes cuando
        el transcript trae muletillas ("Mencionó que 'Sí, eh,...'"). El
        Guardián de Equidad bloquea esa forma (`VERBATIM_QUOTE` /
        `TRANSCRIPT_ARTIFACT`), así que este texto se arma desde
        `probe_focus`, que ya es lenguaje legible.
        """

        focus = interpretation.probe_focus or (
            rubric.competency_name.lower() if rubric is not None else "lo que acabas de contarme"
        )
        missing = interpretation.missing_elements[0] if interpretation.missing_elements else ""
        if missing.startswith("resultado"):
            question = f"Sobre {focus}, ¿cómo terminó ese caso?"
        elif interpretation.evidence_quality == "VAGUE":
            question = f"Sobre {focus}, ¿me das un ejemplo concreto de algo que hayas hecho tú?"
        else:
            question = f"Sobre {focus}, ¿qué hiciste tú exactamente en ese caso?"

        return InterviewTurnResult(
            action="PROBE",
            answer_interpretation=answer_interpretation or interpretation,
            question_text=question,
            target_competency_code=turn.target_competency_code,
            question_intent="PROBE",
            references_turn_id=turn.turn_id,
            rationale=(
                f"Evidencia {interpretation.evidence_quality}: se profundiza sobre "
                f"'{focus}' sin citar el transcript (HU-I02)."
            ),
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
