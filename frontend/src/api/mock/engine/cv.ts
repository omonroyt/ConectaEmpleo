import type { Claim, CVExtraction, EducationItem, ExperienceItem } from "@/api/types";
import { genId, nowIso, wordCount } from "../util";
import { CV_BUILDER_SCRIPT, type CvBuilderField } from "../seed/cvBuilderScript";
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

/** Arma la extracción final del CV conversacional a partir de las respuestas capturadas por turno. */
export function buildExtractionFromCvBuilder(answers: Record<string, string>): CVExtraction {
  const now = new Date();
  const experience: ExperienceItem[] = [];
  const education: EducationItem[] = [];
  const claims: Claim[] = [];
  const skills: CVExtraction["skills"] = [];

  const lastJob = answers.last_job;
  if (lastJob) {
    experience.push({
      id: genId("exp"),
      company: "Por confirmar",
      position: lastJob,
      start_date: `${now.getFullYear() - 1}-01-01`,
      end_date: null,
      is_current: true,
      description: answers.activities ?? "",
      skills: [],
    });
  }
  const tools = answers.tools;
  if (tools) {
    for (const raw of tools.split(/,| y /i)) {
      const name = raw.trim();
      if (name.length > 0) skills.push({ code: name.toUpperCase().replace(/\s+/g, "_").slice(0, 30), name, level: 2 });
    }
  }
  const previousJobs = answers.previous_jobs;
  if (previousJobs) {
    experience.push({
      id: genId("exp"),
      company: "Por confirmar",
      position: previousJobs,
      start_date: `${now.getFullYear() - 3}-01-01`,
      end_date: `${now.getFullYear() - 1}-01-01`,
      is_current: false,
      description: previousJobs,
      skills: [],
    });
  }
  const educationAnswer = answers.education;
  if (educationAnswer) {
    education.push({ id: genId("edu"), institution: "Por confirmar", degree: educationAnswer, start_year: now.getFullYear() - 8, end_year: now.getFullYear() - 5 });
  }
  const certifications: CVExtraction["certifications"] = answers.certifications
    ? [{ name: answers.certifications, issuer: null, year: null }]
    : [];

  for (const field of ["logistics", "salary"] as CvBuilderField[]) {
    const value = answers[field];
    if (value) {
      claims.push({
        id: genId("claim"),
        source: "CONVERSATION",
        skill_code: null,
        statement: value,
        claimed_level: null,
        needs_validation: true,
        source_ref: { turn: CV_BUILDER_SCRIPT.findIndex((t) => t.field === field) + 1 },
      });
    }
  }

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

  if (wordCount(answerText) < 6 && !session.followUpAsked) {
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
