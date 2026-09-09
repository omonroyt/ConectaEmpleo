import type {
  AnonymousCandidateCard,
  Availability,
  CandidateSkill,
  GeoBand,
  JobFamilyCode,
  MatchComponent,
  Penalty,
  ShortlistStage,
} from "@/api/types";
import type { EvidenceLevel } from "@/components/ui";

/**
 * Etiquetas y derivaciones compartidas por E8–E12 (docs/build/04_SCREENS_EMPLOYER.md).
 * Este archivo solo conoce datos anónimos: nunca nombre, foto, edad ni género.
 */

export const geoBandLabels: Record<GeoBand, string> = {
  SAME_CITY: "Misma ciudad",
  UNDER_30KM: "A menos de 30 km",
  UNDER_80KM: "A menos de 80 km",
  FAR: "Fuera de la zona",
};

export const availabilityLabels: Record<Availability, string> = {
  IMMEDIATE: "Disponibilidad inmediata",
  TWO_WEEKS: "Disponible en 2 semanas",
  ONE_MONTH: "Disponible en 1 mes",
};

export const jobFamilyLabels: Record<JobFamilyCode, string> = {
  ADMIN_ASSISTANT: "Auxiliar administrativo",
  HEAVY_MACHINERY_OPERATOR: "Operador de maquinaria pesada",
  WAREHOUSE_SUPERVISOR: "Encargado de almacén",
};

export const matchComponentLabels: Record<MatchComponent, string> = {
  TECHNICAL: "Habilidades técnicas",
  BEHAVIORAL: "Competencias conductuales",
  EXPERIENCE: "Experiencia",
  EVIDENCE: "Calidad de evidencia",
  SALARY: "Compatibilidad salarial",
  LOCATION: "Ubicación",
};

export const penaltyReasonLabels: Record<Penalty["reason"], string> = {
  MANDATORY_UNMET: "Requisito esencial sin evidencia suficiente",
  SALARY_OUT_OF_RANGE: "Expectativa salarial fuera del rango de la vacante",
  LOCATION_FAR: "Ubicación fuera de la zona de la vacante",
};

export const shortlistStageLabels: Record<ShortlistStage, string> = {
  REVIEW: "Revisar",
  INTERVIEW: "Entrevistar",
  FINALIST: "Finalista",
};

export const shortlistStageOrder: ShortlistStage[] = ["REVIEW", "INTERVIEW", "FINALIST"];

/** Copys fijos de la fase de empresa (01 §10, 04 introducción). */
export const PRIVACY_NOTICE = "La identidad del candidato se mantiene oculta en el primer filtro.";
export const EVIDENCE_NOTICE = "Basado en la evidencia disponible.";
export const AI_SUPPORT_NOTICE = "La IA apoya tu decisión; no la reemplaza.";
export const RANKING_NOTICE = "Ningún ranking es una verdad absoluta; la decisión es tuya.";

/** "CND-4F82" → "CANDIDATO #F82" (últimos 3 caracteres del código anónimo). */
export function anonDisplayCode(anonCode: string): string {
  const compact = anonCode.replace(/[^A-Za-z0-9]/g, "");
  const tail = compact.slice(-3).toUpperCase();
  return `CANDIDATO #${tail || compact.toUpperCase()}`;
}

/** Nivel de evidencia visible de una habilidad (verificada > evaluada > declarada). */
export function evidenceLevelFor(skill: CandidateSkill): EvidenceLevel {
  if (skill.is_verified) return "verified";
  if (skill.is_evaluated) return "evaluated";
  if (skill.is_declared) return "declared";
  return "pending";
}

/** Texto accesible de una barra del desglose (04 §E9). */
export function breakdownAriaText(
  component: MatchComponent,
  weight: number,
  raw: number,
  contribution: number,
): string {
  return `${matchComponentLabels[component]}: ${Math.round(raw)} de 100, peso ${weight} %, aporta ${contribution.toFixed(1)} puntos.`;
}

/** Años de experiencia en texto ("3.5 años de experiencia"). */
export function experienceLabel(years: number): string {
  const value = Number.isInteger(years) ? String(years) : years.toFixed(1);
  return `${value} ${years === 1 ? "año" : "años"} de experiencia`;
}

/** Habilidades declaradas que aún no fueron evaluadas ni verificadas. */
export function unvalidatedClaims(skills: CandidateSkill[]): CandidateSkill[] {
  return skills.filter((s) => s.is_declared && !s.is_evaluated && !s.is_verified);
}

/** Habilidades con evidencia de entrevista (resumen textual disponible). */
export function interviewEvidence(skills: CandidateSkill[]): CandidateSkill[] {
  return skills.filter((s) => s.evidence_summary != null && s.evidence_summary.trim() !== "");
}

/** Resumen textual de un candidato para lectores de pantalla en listas. */
export function candidateSummaryText(card: AnonymousCandidateCard): string {
  return `${anonDisplayCode(card.anon_code)}, compatibilidad ${card.total_score} %, ${card.score_label.toLowerCase()}. ${geoBandLabels[card.geo_band]}. ${availabilityLabels[card.availability]}.`;
}
