/**
 * Puerto TypeScript de `backend/app/modules/cv_builder/normalize.py`.
 *
 * Traduce habla espontánea a registro de CV. Existe para que el mock y el
 * backend real produzcan lo mismo: si divergen, la demo en modo `mock` muestra
 * una cosa y la demo contra `http` otra.
 *
 * Ver `docs/build/08_CV_NARRATIVE_NORMALIZATION.md`. Las reglas son las mismas
 * que en Python: no inventar datos, interpretar en vez de transcribir, y
 * limpiar la muletilla sin subir el nivel de la afirmación.
 */

/** Título por familia, solo para cuando se describió un trabajo sin nombrar el puesto. */
const FAMILY_TITLES: Record<string, string> = {
  jf_admin_assistant: "Auxiliar administrativo",
  jf_heavy_machinery: "Operador de maquinaria pesada",
  jf_warehouse_supervisor: "Auxiliar de almacén",
  ADMIN_ASSISTANT: "Auxiliar administrativo",
  HEAVY_MACHINERY_OPERATOR: "Operador de maquinaria pesada",
  WAREHOUSE_SUPERVISOR: "Auxiliar de almacén",
};

const SHORT_ANSWER_WORDS = 8;

export const FIRST_JOB_STATEMENT = "Me encuentro en búsqueda de mi primer empleo.";

const LEADING_FILLERS =
  /^\s*(?:ah+|eh+|mmm+|em+|este|pues|bueno|okay|ok|a ver|o sea|claro|sí|si|mira|la verdad|digamos|como que|y bueno|pues bueno|bueno pues|se me escucha|me escuchas?|me oyes?|diría que|diria que|yo diría que|creo que)\b[\s,.:;]*/i;

const INLINE_FILLERS =
  /\b(?:o sea|es decir|digamos|diría que|diria que|la verdad es que|se me escucha|mmm+)\b[\s,]*/gi;

function fold(text: string): string {
  return (text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, ""); // marcas de combinación: acentos ya descompuestos por NFD
}

export function stripFillers(text: string): string {
  let cleaned = (text ?? "").replace(INLINE_FILLERS, " ");
  let previous: string | null = null;
  while (previous !== cleaned) {
    previous = cleaned;
    cleaned = cleaned.replace(LEADING_FILLERS, "");
  }
  return cleaned.replace(/\s{2,}/g, " ").replace(/^[\s,.;:]+|[\s,.;:]+$/g, "");
}

export function toSentence(text: string): string {
  const cleaned = stripFillers(text);
  if (cleaned.length === 0) return "";
  const capitalized = cleaned[0].toUpperCase() + cleaned.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function words(text: string): number {
  return (text ?? "").split(/\s+/).filter(Boolean).length;
}

const NEGATIVE_PATTERNS: RegExp[] = [
  /\bno\s+(?:he\s+|habia\s+)?(?:trabaj\w*|estuv\w*|tuve|tengo|tenia|hice|curse)\b/,
  /\bnunca\s+(?:he\s+\w+|trabaj\w*|estuv\w*)\b/,
  /\bningun[oa]s?\b/,
  /\bnada\b/,
  /\bno\s+aplica\b/,
  /^\s*no\s*$/,
];

const FIRST_JOB_PATTERNS: RegExp[] = [
  /\bprimer\s+(?:empleo|trabajo)\b/,
  /\bmi\s+primera\s+experiencia\s+laboral\b/,
  /\bsin\s+experiencia\s+laboral\b/,
  /\bno\s+he\s+trabajado\b/,
];

export function isNegative(text: string): boolean {
  const folded = fold(stripFillers(text));
  if (folded.length === 0) return true;
  return NEGATIVE_PATTERNS.some((pattern) => pattern.test(folded));
}

export function declaresFirstJob(text: string): boolean {
  const folded = fold(text);
  return FIRST_JOB_PATTERNS.some((pattern) => pattern.test(folded));
}

export type EducationLevel =
  | "SECUNDARIA"
  | "BACHILLERATO"
  | "TECNICO"
  | "LICENCIATURA"
  | "POSGRADO"
  | "CURSO";

const DEGREE_RULES: Array<[RegExp, EducationLevel, string]> = [
  [/\b(?:doctorado|phd)\b/, "POSGRADO", "Doctorado"],
  [/\b(?:maestria|posgrado|master)\b/, "POSGRADO", "Maestría"],
  [/\b(?:licenciatura|licenciad[oa])\b/, "LICENCIATURA", "Licenciatura"],
  [/\b(?:ingenieria|ingenier[oa])\b/, "LICENCIATURA", "Ingeniería"],
  [/\b(?:tsu|tecnico superior)\b/, "TECNICO", "Técnico Superior Universitario"],
  [/\b(?:carrera tecnica|tecnic[oa])\b/, "TECNICO", "Carrera técnica"],
  [/\b(?:bachillerato|preparatoria|prepa)\b/, "BACHILLERATO", "Bachillerato"],
  [/\bsecundaria\b/, "SECUNDARIA", "Secundaria"],
  [/\b(?:diplomado|certificacion escolar)\b/, "CURSO", "Diplomado"],
  [/\b(?:curso|taller|capacitacion)\b/, "CURSO", "Curso"],
  [/\b(?:titulo universitario|universitari[oa]|universidad)\b/, "LICENCIATURA", "Estudios universitarios"],
];

const DEICTIC_TAIL = /^(?:est[ae]|es[ae]|eso|esto|ello|mi|su|el|la|lo|los|las)\b/;
const DEGREE_TAIL = /\b(?:en|de)\s+([^,.;]{2,40})/i;

export interface NormalizedEducation {
  degree: string;
  level: EducationLevel;
  institution: string;
  needsReview: boolean;
}

export function detectEducation(text: string): NormalizedEducation | null {
  const cleaned = stripFillers(text);
  if (cleaned.length === 0 || isNegative(cleaned)) return null;

  const folded = fold(cleaned);
  for (const [pattern, level, canonical] of DEGREE_RULES) {
    const match = folded.match(pattern);
    if (!match || match.index == null) continue;

    let degree = canonical;
    const tailSource = cleaned.slice(Math.min(match.index + match[0].length, cleaned.length));
    const tailMatch = tailSource.match(DEGREE_TAIL);
    if (tailMatch) {
      const tail = tailMatch[1].trim();
      if (tail.length > 0 && !DEICTIC_TAIL.test(fold(tail))) {
        degree = `${canonical} en ${tail[0].toUpperCase()}${tail.slice(1)}`;
      }
    }
    return { degree, level, institution: "", needsReview: words(cleaned) < SHORT_ANSWER_WORDS };
  }
  return null;
}

const ROLE_HINTS =
  /\b(?:auxiliar|asistente|ayudante|operador|operario|chofer|conductor|almacenista|montacarguista|supervisor|encargad[oa]|jefe|coordinador|cajer[oa]|vendedor|mesero|cociner[oa]|guardia|velador|obrero|tecnic[oa]|mecanic[oa]|electricista|albanil|secretari[oa]|recepcionista|contador|analista|becari[oa]|practicante)\w*\b/;

export function detectPosition(
  text: string,
  jobFamilyId: string | null,
): { position: string; needsReview: boolean } {
  const cleaned = stripFillers(text);
  const folded = fold(cleaned);
  const match = folded.match(ROLE_HINTS);
  if (match && match.index != null) {
    let raw = cleaned.slice(match.index, match.index + 60);
    raw = raw.split(/\b(?:en|para|durante|desde|hace)\b/)[0].replace(/^[\s,.;:]+|[\s,.;:]+$/g, "");
    if (raw.length > 0) {
      return { position: raw[0].toUpperCase() + raw.slice(1), needsReview: false };
    }
  }
  return { position: (jobFamilyId && FAMILY_TITLES[jobFamilyId]) || "", needsReview: true };
}

export function splitSkills(text: string): string[] {
  if (isNegative(text)) return [];
  const names: string[] = [];
  for (const raw of stripFillers(text).split(/,|\by\b|\be\b|;/i)) {
    const name = raw.replace(/^[\s,.;:]+|[\s,.;:]+$/g, "");
    if (name.length === 0 || words(name) > 4) continue;
    const cased = name[0].toUpperCase() + name.slice(1);
    if (!names.includes(cased)) names.push(cased);
  }
  return names;
}

export function skillCode(name: string): string {
  return fold(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
}

export interface NormalizedExperience {
  position: string;
  description: string;
  company: string;
  isCurrent: boolean;
  needsReview: boolean;
}

export interface NormalizedClaim {
  statement: string;
  needsValidation: boolean;
  sourceField: string;
}

export interface NormalizedCV {
  experience: NormalizedExperience[];
  education: NormalizedEducation[];
  skills: Array<{ code: string; name: string }>;
  certifications: string[];
  claims: NormalizedClaim[];
  noFormalExperience: boolean;
  needsUserReview: string[];
}

function dedupeEducation(items: NormalizedEducation[]): NormalizedEducation[] {
  const byLevel = new Map<EducationLevel, NormalizedEducation>();
  for (const item of items) {
    const current = byLevel.get(item.level);
    if (current == null || item.degree.length > current.degree.length) byLevel.set(item.level, item);
  }
  return [...byLevel.values()];
}

/** Convierte las respuestas del guion en un borrador de CV redactado. */
export function normalizeCv(
  answers: Record<string, string>,
  jobFamilyId: string | null = null,
): NormalizedCV {
  const experience: NormalizedExperience[] = [];
  let education: NormalizedEducation[] = [];
  const skills: Array<{ code: string; name: string }> = [];
  const certifications: string[] = [];
  const claims: NormalizedClaim[] = [];
  const review: string[] = [];
  let noFormalExperience = false;

  const lastJob = (answers.last_job ?? "").trim();
  const activities = (answers.activities ?? "").trim();
  const previousJobs = (answers.previous_jobs ?? "").trim();

  // Un turno no determina la sección: lo dicho sobre formación en el turno de
  // "último trabajo" es formación.
  for (const [sourceField, text] of [
    ["last_job", lastJob],
    ["education", answers.education ?? ""],
  ] as const) {
    const detected = detectEducation(text);
    if (detected) {
      education.push(detected);
      if (detected.needsReview) review.push(sourceField);
    }
  }
  education = dedupeEducation(education);

  if (lastJob.length > 0 && (declaresFirstJob(lastJob) || isNegative(lastJob))) {
    noFormalExperience = true;
  } else if (lastJob.length > 0) {
    const { position, needsReview } = detectPosition(lastJob, jobFamilyId);
    if (position.length > 0) {
      experience.push({
        position,
        description: toSentence(activities),
        company: "",
        isCurrent: true,
        needsReview,
      });
      if (needsReview) review.push("last_job");
    } else {
      noFormalExperience = true;
    }
  }

  if (previousJobs.length > 0 && !isNegative(previousJobs) && !declaresFirstJob(previousJobs)) {
    const { position, needsReview } = detectPosition(previousJobs, jobFamilyId);
    if (position.length > 0) {
      experience.push({
        position,
        description: toSentence(previousJobs),
        company: "",
        isCurrent: false,
        needsReview,
      });
      if (needsReview) review.push("previous_jobs");
    }
  }

  if (experience.length === 0) {
    noFormalExperience = true;
    if (activities.length > 0 && !isNegative(activities)) {
      claims.push({
        statement: toSentence(activities),
        needsValidation: true,
        sourceField: "activities",
      });
    }
  }

  if (noFormalExperience) {
    claims.push({ statement: FIRST_JOB_STATEMENT, needsValidation: false, sourceField: "last_job" });
  }

  for (const name of splitSkills(answers.tools ?? "")) {
    const code = skillCode(name);
    if (code.length > 0 && !skills.some((skill) => skill.code === code)) skills.push({ code, name });
  }

  const certificationsAnswer = (answers.certifications ?? "").trim();
  if (certificationsAnswer.length > 0 && !isNegative(certificationsAnswer)) {
    certifications.push(toSentence(certificationsAnswer).replace(/\.$/, ""));
  }

  for (const sourceField of ["logistics", "salary"]) {
    const value = (answers[sourceField] ?? "").trim();
    if (value.length > 0 && !isNegative(value)) {
      claims.push({ statement: toSentence(value), needsValidation: true, sourceField });
    }
  }

  return {
    experience,
    education,
    skills,
    certifications,
    claims,
    noFormalExperience,
    needsUserReview: [...new Set(review)],
  };
}
