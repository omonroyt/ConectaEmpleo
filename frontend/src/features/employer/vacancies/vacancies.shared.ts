import type { JobFamily, MatchComponent, RequirementKind, VacancyStatus, VacancyWeights } from "@/api/types";

/** Constantes y helpers compartidos entre las pantallas de vacantes (E4-E7). */

export const WEIGHT_LABELS: Record<MatchComponent, string> = {
  TECHNICAL: "Habilidades técnicas",
  BEHAVIORAL: "Competencias conductuales",
  EXPERIENCE: "Experiencia",
  EVIDENCE: "Calidad de evidencia",
  SALARY: "Compatibilidad salarial",
  LOCATION: "Ubicación",
};

export const WEIGHT_COMPONENT_ORDER: MatchComponent[] = [
  "TECHNICAL",
  "BEHAVIORAL",
  "EXPERIENCE",
  "EVIDENCE",
  "SALARY",
  "LOCATION",
];

export const VACANCY_STATUS_LABELS: Record<VacancyStatus, string> = {
  DRAFT: "Borrador",
  OPEN: "Abierta",
  CLOSED: "Cerrada",
};

export const REQUIREMENT_KIND_OPTIONS: { value: RequirementKind; label: string }[] = [
  { value: "MANDATORY", label: "Esencial" },
  { value: "DESIRABLE", label: "Deseable" },
];

export const REQUIREMENT_KIND_LABELS: Record<RequirementKind, string> = {
  MANDATORY: "Esencial",
  DESIRABLE: "Deseable",
};

export const WORK_MODE_LABELS: Record<string, string> = {
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
  REMOTE: "Remoto",
};

export function jobFamilyName(families: JobFamily[] | undefined, jobFamilyId: string): string {
  return families?.find((f) => f.id === jobFamilyId)?.name ?? "—";
}

/** Umbral simple: no hay fórmula dada por la spec, solo "chips Alta/Media/Baja derivados del peso". */
export function priorityForWeight(weight: number): "Alta" | "Media" | "Baja" {
  if (weight >= 25) return "Alta";
  if (weight >= 12) return "Media";
  return "Baja";
}

export function sumWeights(weights: VacancyWeights): number {
  return Object.values(weights).reduce((acc, value) => acc + value, 0);
}

/** Misma lógica de normalización proporcional que usa el mock al guardar. */
export function normalizeWeightsProportional(weights: VacancyWeights): VacancyWeights {
  const keys = WEIGHT_COMPONENT_ORDER;
  const sum = sumWeights(weights);
  if (sum <= 0) {
    const equal = Math.round(100 / keys.length);
    const normalized = {} as VacancyWeights;
    keys.forEach((key, idx) => {
      normalized[key] = idx === keys.length - 1 ? 100 - equal * (keys.length - 1) : equal;
    });
    return normalized;
  }
  const normalized = {} as VacancyWeights;
  let running = 0;
  keys.forEach((key, idx) => {
    if (idx === keys.length - 1) {
      normalized[key] = 100 - running;
      return;
    }
    const value = Math.round((weights[key] / sum) * 100);
    running += value;
    normalized[key] = value;
  });
  return normalized;
}

export function formatSalaryRange(min: number | null, max: number | null, formatMXN: (n: number) => string): string {
  if (min == null && max == null) return "A convenir";
  if (min != null && max != null) return `${formatMXN(min)} – ${formatMXN(max)}`;
  return formatMXN((min ?? max) as number);
}
