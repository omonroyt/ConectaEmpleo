import type { Claim, CVExtraction, EducationItem, ExperienceItem } from "@/api/types";
import { genId, nowIso, wordCount } from "../util";
import { CV_BUILDER_SCRIPT, type CvBuilderField } from "../seed/cvBuilderScript";
import { isNegative, normalizeCv } from "./cvNormalize";
import type { StoredCvBuilderSession } from "../state";

const FAMILY_SKILL_HINTS: Record<string, string[]> = {
  jf_admin_assistant: ["OFFICE_TOOLS", "DOCUMENT_CONTROL", "CUSTOMER_SERVICE"],
  jf_heavy_machinery: ["MACHINERY_OPERATION", "SAFETY_PROTOCOLS", "LOAD_HANDLING"],
  jf_warehouse_supervisor: ["INVENTORY_CONTROL", "FORKLIFT_SAFETY", "RECEIVING_DISPATCH"],
};

const FAMILY_TITLES: Record<string, string> = {
  jf_admin_assistant: "Auxiliar administrativo",
  jf_heavy_machinery: "Operador de maquinaria pesada",
  jf_warehouse_supervisor: "Auxiliar de almacén",
};

/**
 * Genera una extracción plausible a partir del nombre del archivo y la familia
 * elegida por el candidato (no se lee el contenido real del archivo: es un mock).
 */
export function generateExtractionFromFile(familyId: string | null, filename: string): CVExtraction {
  const title = (familyId && FAMILY_TITLES[familyId]) || "Auxiliar operativo";
  const skillCodes = (familyId && FAMILY_SKILL_HINTS[familyId]) || ["OFFICE_TOOLS"];
  const now = new Date();
  const startYear = now.getFullYear() - 3;

  const experience: ExperienceItem[] = [
    {
      id: genId("exp"),
      company: "Empresa mencionada en el CV",
      position: title,
      start_date: `${startYear}-01-01`,
      end_date: null,
      is_current: true,
      description: `Extraído de ${filename}: actividades relacionadas con ${title.toLowerCase()}.`,
      skills: skillCodes,
    },
  ];

  const education: EducationItem[] = [
    { id: genId("edu"), institution: "Institución detectada en el CV", degree: "Bachillerato / técnico", start_year: startYear - 6, end_year: startYear - 3 },
  ];

  return {
    id: genId("ext"),
    document_id: null,
    status: "PARSED",
    confidence: 0.78,
    experience,
    education,
    skills: skillCodes.map((code) => ({ code, name: code, level: 2 as const })),
    certifications: [],
    claims: [
      {
        id: genId("claim"),
        source: "CV",
        skill_code: skillCodes[0] ?? null,
        statement: `El CV "${filename}" menciona experiencia como ${title.toLowerCase()}.`,
        claimed_level: 2,
        needs_validation: true,
        source_ref: { excerpt: filename },
      },
    ],
    confirmed_by_candidate: false,
    confirmed_at: null,
  };
}

/**
 * Arma la extracción final del CV conversacional a partir de las respuestas
 * capturadas por turno.
 *
 * Toda la interpretación vive en `./cvNormalize`, puerto TS de
 * `backend/app/modules/cv_builder/normalize.py` — aquí solo se traduce a la
 * forma del contrato. Antes esta función copiaba la transcripción literal
 * (`position: lastJob`) y fabricaba empresa ("Por confirmar") y fechas
 * (`now - 1 año`) que nadie había dicho; ver
 * `docs/build/08_CV_NARRATIVE_NORMALIZATION.md`.
 */
export function buildExtractionFromCvBuilder(
  answers: Record<string, string>,
  jobFamilyId: string | null = null,
): CVExtraction {
  const normalized = normalizeCv(answers, jobFamilyId);

  const experience: ExperienceItem[] = normalized.experience.map((item) => ({
    id: genId("exp"),
    company: item.company,
    position: item.position,
    start_date: "",
    end_date: null,
    is_current: item.isCurrent,
    description: item.description,
    skills: [],
  }));

  const education: EducationItem[] = normalized.education.map((item) => ({
    id: genId("edu"),
    institution: item.institution,
    degree: item.degree,
    start_year: null,
    end_year: null,
  }));

  const skills: CVExtraction["skills"] = normalized.skills.map((skill) => ({
    code: skill.code,
    name: skill.name,
    level: 2,
  }));

  const certifications: CVExtraction["certifications"] = normalized.certifications.map((name) => ({
    name,
    issuer: null,
    year: null,
  }));

  const claims: Claim[] = normalized.claims.map((claim) => {
    const turn = CV_BUILDER_SCRIPT.findIndex((t) => t.field === (claim.sourceField as CvBuilderField));
    return {
      id: genId("claim"),
      source: "CONVERSATION",
      skill_code: null,
      statement: claim.statement,
      claimed_level: null,
      needs_validation: claim.needsValidation,
      source_ref: turn >= 0 ? { turn: turn + 1 } : null,
    };
  });

  return {
    id: genId("ext"),
    document_id: null,
    status: "PARSED",
    confidence: 0.7,
    experience,
    education,
    skills,
    certifications,
    claims,
    confirmed_by_candidate: false,
    confirmed_at: null,
  };
}

export interface CvBuilderStepResult {
  agentMessage: string;
  done: boolean;
}

/** Avanza el guion de Sofía; usa repregunta si la respuesta tiene menos de 6 palabras. */
export function advanceCvBuilder(session: StoredCvBuilderSession, answerText: string): CvBuilderStepResult {
  const spec = CV_BUILDER_SCRIPT[session.turnIndex];
  if (!spec) return { agentMessage: "Ya terminamos esta conversación.", done: true };

  // `!isNegative`: una respuesta breve pero cerrada ("no", "en ningún otro
  // lugar") ya respondió del todo. Repreguntar ahí se lee como no haber
  // escuchado. Misma regla que `cv_builder/service.py::_should_follow_up`.
  if (wordCount(answerText) < 6 && !isNegative(answerText) && !session.followUpAsked) {
    session.followUpAsked = true;
    session.answers[spec.field] = answerText; // fragmento breve, se completa con la repregunta
    return { agentMessage: spec.followUp, done: false };
  }

  const previous = session.followUpAsked ? (session.answers[spec.field] ?? "") : "";
  session.answers[spec.field] = previous ? `${previous} ${answerText}`.trim() : answerText;
  session.followUpAsked = false;
  session.turnIndex += 1;

  const nextSpec = CV_BUILDER_SCRIPT[session.turnIndex];
  if (!nextSpec) {
    session.status = "FINALIZED";
    return { agentMessage: "", done: true };
  }
  return { agentMessage: nextSpec.prompt, done: false };
}

export { nowIso };
