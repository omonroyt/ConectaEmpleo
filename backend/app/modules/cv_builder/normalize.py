"""Normalización del CV conversacional: habla espontánea → registro de CV.

Ver `docs/build/08_CV_NARRATIVE_NORMALIZATION.md`. Este módulo es el paso 1 de
esa spec: la capa **determinista** que traduce lo que la persona dijo por voz a
la redacción que se espera en un CV, sin IA.

Es deliberadamente Python puro (sin SQLAlchemy, sin `AIPort`), igual que
`app/modules/matching/engine.py`: se puede probar en aislamiento y — más
importante — **funciona con `AI_MODE=demo`**, que fuerza el adaptador
determinista en todas las operaciones y por lo tanto es el único camino que se
ejecuta en la demo.

Las tres reglas que gobiernan todo lo de abajo:

1. **No inventar.** Un dato que la persona no dio se queda vacío. Nunca un
   placeholder que pueda leerse como dato ("Por confirmar" aparecía como si
   fuera el nombre de la empresa), nunca una fecha estimada (las fechas
   inventadas llegaban al motor de matching como años de experiencia reales).
2. **Interpretar, no transcribir.** "no no estuve en otros trabajos" no es un
   puesto de trabajo. "mi experiencia parte de la universidad" es formación,
   aunque se haya dicho en el turno de "último trabajo".
3. **Nivelar el registro no puede subir el nivel de la afirmación.** Se limpia
   la muletilla y se ordena la frase; no se asciende a la persona.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field

#: Título por familia laboral, usado solo cuando la persona describió un
#: trabajo pero no dijo un puesto reconocible. Mismos valores que
#: `DeterministicAdapter._FAMILY_TITLES`.
FAMILY_TITLES: dict[str, str] = {
    "ADMIN_ASSISTANT": "Auxiliar administrativo",
    "HEAVY_MACHINERY_OPERATOR": "Operador de maquinaria pesada",
    "WAREHOUSE_SUPERVISOR": "Auxiliar de almacén",
}

#: Respuestas por debajo de esta cantidad de palabras se marcan para revisión:
#: es donde el reconocimiento de voz corta palabras a la mitad
#: ("tengo la licenciatura en administra").
_SHORT_ANSWER_WORDS = 8

# --- Limpieza de habla -------------------------------------------------

#: Muletillas que solo se eliminan al principio de una frase, donde no pueden
#: ser otra cosa. "este" es muletilla en "este, pues llegaba temprano" pero
#: demostrativo en "este rubro", así que jamás se toca en medio de la frase.
_LEADING_FILLERS = re.compile(
    r"^\s*(?:"
    r"ah+|eh+|mmm+|em+|este|pues|bueno|okay|ok|a ver|o sea|claro|s[íi]|mira|"
    r"la verdad|digamos|como que|y bueno|pues bueno|bueno pues|"
    r"se me escucha|me escuchas?|me oyes?|"
    r"dir[íi]a que|yo dir[íi]a que|creo que"
    r")\b[\s,.:;]*",
    re.IGNORECASE,
)

#: Muletillas inequívocas que se eliminan estén donde estén.
_INLINE_FILLERS = re.compile(
    r"\b(?:o sea|es decir|digamos|dir[íi]a que|la verdad es que|"
    r"se me escucha|mmm+)\b[\s,]*",
    re.IGNORECASE,
)

_MULTISPACE = re.compile(r"\s{2,}")


def strip_fillers(text: str) -> str:
    """Quita muletillas y ruido de dictado, sin tocar el contenido."""

    cleaned = _INLINE_FILLERS.sub(" ", text or "")
    previous = None
    while previous != cleaned:  # varias muletillas encadenadas al inicio
        previous = cleaned
        cleaned = _LEADING_FILLERS.sub("", cleaned)
    return _MULTISPACE.sub(" ", cleaned).strip(" ,.;:")


def to_sentence(text: str) -> str:
    """Mayúscula inicial y punto final, sin alterar el resto del texto."""

    cleaned = strip_fillers(text)
    if not cleaned:
        return ""
    cleaned = cleaned[0].upper() + cleaned[1:]
    return cleaned if cleaned.endswith((".", "!", "?")) else f"{cleaned}."


def _fold(text: str) -> str:
    """Minúsculas sin acentos, para comparar de forma robusta."""

    decomposed = unicodedata.normalize("NFD", (text or "").lower())
    return "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")


def word_count(text: str) -> int:
    return len((text or "").split())


# --- Negaciones --------------------------------------------------------

#: Formas en que una persona dice "no hay nada que registrar aquí". Se evalúan
#: sobre el texto sin acentos (`_fold`).
_NEGATIVE_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bno\s+(?:he\s+|habia\s+)?(?:trabaj\w*|estuv\w*|tuve|tengo|tenia|hice|curse)\b"),
    re.compile(r"\bnunca\s+(?:he\s+\w+|trabaj\w*|estuv\w*)\b"),
    re.compile(r"\bningun[oa]s?\b"),
    re.compile(r"\bnada\b"),
    re.compile(r"\bno\s+aplica\b"),
    re.compile(r"^\s*no\s*$"),
)

#: Señales de que la persona está declarando que busca su primer empleo.
_FIRST_JOB_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\bprimer\s+(?:empleo|trabajo)\b"),
    re.compile(r"\bmi\s+primera\s+experiencia\s+laboral\b"),
    re.compile(r"\bsin\s+experiencia\s+laboral\b"),
    re.compile(r"\bno\s+he\s+trabajado\b"),
)

FIRST_JOB_STATEMENT = "Me encuentro en búsqueda de mi primer empleo."


def is_negative(text: str) -> bool:
    """`True` si la respuesta es una negación ('no estuve en otros trabajos')."""

    folded = _fold(strip_fillers(text))
    if not folded:
        return True
    return any(pattern.search(folded) for pattern in _NEGATIVE_PATTERNS)


def declares_first_job(text: str) -> bool:
    folded = _fold(text)
    return any(pattern.search(folded) for pattern in _FIRST_JOB_PATTERNS)


# --- Estudios ----------------------------------------------------------

EducationLevel = str  # "SECUNDARIA" | "BACHILLERATO" | "TECNICO" | "LICENCIATURA" | "POSGRADO" | "CURSO"

#: (patrón sobre texto sin acentos, nivel, forma canónica). El orden importa:
#: gana el primero que coincida, de más específico a más genérico.
_DEGREE_RULES: tuple[tuple[re.Pattern[str], EducationLevel, str], ...] = (
    (re.compile(r"\b(?:doctorado|phd)\b"), "POSGRADO", "Doctorado"),
    (re.compile(r"\b(?:maestria|posgrado|master)\b"), "POSGRADO", "Maestría"),
    (re.compile(r"\b(?:licenciatura|licenciad[oa])\b"), "LICENCIATURA", "Licenciatura"),
    (re.compile(r"\b(?:ingenieria|ingenier[oa])\b"), "LICENCIATURA", "Ingeniería"),
    (re.compile(r"\b(?:tsu|tecnico superior)\b"), "TECNICO", "Técnico Superior Universitario"),
    (re.compile(r"\b(?:carrera tecnica|tecnic[oa])\b"), "TECNICO", "Carrera técnica"),
    (re.compile(r"\b(?:bachillerato|preparatoria|prepa)\b"), "BACHILLERATO", "Bachillerato"),
    (re.compile(r"\bsecundaria\b"), "SECUNDARIA", "Secundaria"),
    (re.compile(r"\b(?:diplomado|certificacion escolar)\b"), "CURSO", "Diplomado"),
    (re.compile(r"\b(?:curso|taller|capacitacion)\b"), "CURSO", "Curso"),
    # Genéricos al final: "título universitario", "estudié en la universidad".
    (re.compile(r"\b(?:titulo universitario|universitari[oa]|universidad)\b"), "LICENCIATURA", "Estudios universitarios"),
)

#: Un complemento "en X" solo sirve si nombra un campo de estudio. Estas
#: aperturas indican que X es un deíctico ("en este rubro"), no una carrera.
_DEICTIC_TAIL = re.compile(r"^(?:est[ae]|es[ae]|eso|esto|ello|mi|su|el|la|lo|los|las)\b")

#: Complemento del grado: "licenciatura **en administración**".
_DEGREE_TAIL = re.compile(r"\b(?:en|de)\s+(?P<tail>[^,.;]{2,40})", re.IGNORECASE)


@dataclass(frozen=True)
class NormalizedEducation:
    degree: str
    level: EducationLevel
    institution: str = ""
    needs_review: bool = False


def detect_education(text: str) -> NormalizedEducation | None:
    """Extrae un grado académico de una respuesta hablada, si lo hay.

    Devuelve `None` cuando la respuesta no menciona ningún estudio — nunca
    inventa un nivel por defecto.
    """

    cleaned = strip_fillers(text)
    if not cleaned or is_negative(cleaned):
        return None

    folded = _fold(cleaned)
    for pattern, level, canonical in _DEGREE_RULES:
        match = pattern.search(folded)
        if not match:
            continue
        degree = canonical
        # Busca el complemento ("en administración") después del grado.
        tail_match = _DEGREE_TAIL.search(cleaned, _tail_offset(cleaned, folded, match.end()))
        if tail_match:
            tail = tail_match.group("tail").strip()
            if tail and not _DEICTIC_TAIL.match(_fold(tail)):
                degree = f"{canonical} en {tail[0].upper()}{tail[1:]}"
        return NormalizedEducation(
            degree=degree,
            level=level,
            needs_review=word_count(cleaned) < _SHORT_ANSWER_WORDS,
        )
    return None


def _tail_offset(original: str, folded: str, folded_end: int) -> int:
    """Traduce un índice de `folded` al texto original.

    `_fold` solo baja a minúsculas y quita marcas diacríticas de combinación,
    así que las longitudes coinciden salvo por caracteres ya descompuestos en
    la entrada. Se acota para no salirse del rango en ese caso raro.
    """

    return min(folded_end, len(original)) if len(folded) != len(original) else folded_end


# --- Puestos y habilidades --------------------------------------------

#: Verbos y sustantivos que delatan que la persona está nombrando un puesto.
_ROLE_HINTS = re.compile(
    r"\b(?:auxiliar|asistente|ayudante|operador|operario|chofer|conductor|"
    r"almacenista|montacarguista|supervisor|encargad[oa]|jefe|coordinador|"
    r"cajer[oa]|vendedor|mesero|cociner[oa]|guardia|velador|obrero|"
    r"tecnic[oa]|mecanic[oa]|electricista|albanil|secretari[oa]|recepcionista|"
    r"contador|analista|becari[oa]|practicante)\w*\b"
)

_SEPARATORS = re.compile(r",|\by\b|\be\b|;", re.IGNORECASE)


def detect_position(text: str, *, job_family_code: str | None) -> tuple[str, bool]:
    """Devuelve `(puesto, needs_review)` a partir de una respuesta hablada.

    Si la persona no nombró un puesto reconocible, cae al título de la familia
    laboral que ella misma eligió en el onboarding — no es una invención sobre
    su historia, es la etiqueta del rubro que declaró — y lo marca para
    revisión.
    """

    cleaned = strip_fillers(text)
    folded = _fold(cleaned)
    match = _ROLE_HINTS.search(folded)
    if match:
        # Recorta la frase al entorno del puesto: "trabajé como auxiliar
        # administrativo en una tienda" -> "Auxiliar administrativo".
        raw = cleaned[match.start() : match.start() + 60]
        raw = re.split(r"\b(?:en|para|durante|desde|hace)\b", raw, maxsplit=1)[0]
        raw = raw.strip(" ,.;:")
        if raw:
            return raw[0].upper() + raw[1:], False

    fallback = FAMILY_TITLES.get(job_family_code or "", "")
    return fallback, True


def split_skills(text: str) -> list[str]:
    """Separa una respuesta de herramientas en habilidades individuales."""

    if is_negative(text):
        return []
    cleaned = strip_fillers(text)
    names: list[str] = []
    for raw in _SEPARATORS.split(cleaned):
        name = raw.strip(" ,.;:").strip()
        # Frases largas no son nombres de herramienta: son explicaciones.
        if not name or word_count(name) > 4:
            continue
        name = name[0].upper() + name[1:]
        if name not in names:
            names.append(name)
    return names


def skill_code(name: str) -> str:
    folded = _fold(name).upper()
    return re.sub(r"[^A-Z0-9]+", "_", folded).strip("_")[:30]


# --- Resultado ---------------------------------------------------------


@dataclass(frozen=True)
class NormalizedExperience:
    position: str
    description: str = ""
    company: str = ""
    is_current: bool = False
    needs_review: bool = False


@dataclass(frozen=True)
class NormalizedClaim:
    statement: str
    needs_validation: bool
    source_field: str


@dataclass(frozen=True)
class NormalizedCV:
    experience: tuple[NormalizedExperience, ...] = ()
    education: tuple[NormalizedEducation, ...] = ()
    skills: tuple[tuple[str, str], ...] = ()  # (code, name)
    certifications: tuple[str, ...] = ()
    claims: tuple[NormalizedClaim, ...] = ()
    no_formal_experience: bool = False
    needs_user_review: tuple[str, ...] = field(default_factory=tuple)


def normalize_cv(answers: dict[str, str], *, job_family_code: str | None = None) -> NormalizedCV:
    """Convierte las 8 respuestas del guion en un borrador de CV redactado.

    No persiste nada y no llama a ningún adaptador: es una función pura sobre
    el diccionario de respuestas que `CVBuilderSession.answers` ya guarda.
    """

    experience: list[NormalizedExperience] = []
    education: list[NormalizedEducation] = []
    skills: list[tuple[str, str]] = []
    certifications: list[str] = []
    claims: list[NormalizedClaim] = []
    review: list[str] = []
    no_formal_experience = False

    last_job = (answers.get("last_job") or "").strip()
    activities = (answers.get("activities") or "").strip()
    previous_jobs = (answers.get("previous_jobs") or "").strip()

    # Un turno no determina la sección: lo que la persona contó sobre su
    # formación en el turno de "último trabajo" es formación.
    for source_field, text in (("last_job", last_job), ("education", answers.get("education") or "")):
        detected = detect_education(text)
        if detected:
            education.append(detected)
            if detected.needs_review:
                review.append(source_field)

    # Dos entradas del mismo nivel son la misma formación contada dos veces:
    # se conserva la más específica ("Licenciatura en Administración" gana a
    # "Estudios universitarios").
    education = _dedupe_education(education)

    if last_job and (declares_first_job(last_job) or is_negative(last_job)):
        no_formal_experience = True
    elif last_job:
        position, needs_review = detect_position(last_job, job_family_code=job_family_code)
        if position:
            experience.append(
                NormalizedExperience(
                    position=position,
                    description=to_sentence(activities),
                    is_current=True,
                    needs_review=needs_review,
                )
            )
            if needs_review:
                review.append("last_job")
        else:
            no_formal_experience = True

    if previous_jobs and not is_negative(previous_jobs) and not declares_first_job(previous_jobs):
        position, needs_review = detect_position(previous_jobs, job_family_code=job_family_code)
        if position:
            experience.append(
                NormalizedExperience(position=position, description=to_sentence(previous_jobs))
            )
            if needs_review:
                review.append("previous_jobs")

    if not experience:
        no_formal_experience = True
        # Lo que describió como actividades no se pierde por no tener un puesto
        # donde colgarlo: queda como declaración a explorar en la entrevista.
        if activities and not is_negative(activities):
            claims.append(
                NormalizedClaim(
                    statement=to_sentence(activities),
                    needs_validation=True,
                    source_field="activities",
                )
            )

    if no_formal_experience:
        claims.append(
            NormalizedClaim(
                statement=FIRST_JOB_STATEMENT,
                needs_validation=False,
                source_field="last_job",
            )
        )

    for name in split_skills(answers.get("tools") or ""):
        code = skill_code(name)
        if code and code not in {existing for existing, _ in skills}:
            skills.append((code, name))

    certifications_answer = (answers.get("certifications") or "").strip()
    if certifications_answer and not is_negative(certifications_answer):
        certifications.append(to_sentence(certifications_answer).rstrip("."))

    for source_field in ("logistics", "salary"):
        value = (answers.get(source_field) or "").strip()
        if value and not is_negative(value):
            claims.append(
                NormalizedClaim(
                    statement=to_sentence(value),
                    needs_validation=True,
                    source_field=source_field,
                )
            )

    return NormalizedCV(
        experience=tuple(experience),
        education=tuple(education),
        skills=tuple(skills),
        certifications=tuple(certifications),
        claims=tuple(claims),
        no_formal_experience=no_formal_experience,
        needs_user_review=tuple(dict.fromkeys(review)),
    )


def _dedupe_education(items: list[NormalizedEducation]) -> list[NormalizedEducation]:
    by_level: dict[str, NormalizedEducation] = {}
    for item in items:
        current = by_level.get(item.level)
        if current is None or len(item.degree) > len(current.degree):
            by_level[item.level] = item
    return list(by_level.values())
