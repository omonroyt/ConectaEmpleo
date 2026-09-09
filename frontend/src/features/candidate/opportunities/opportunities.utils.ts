import type { JobFamilyCode, Opportunity, RequirementKind, WorkMode } from "@/api/types";
import { formatMXN, formatRange } from "@/lib/format";

export const workModeLabels: Record<WorkMode, string> = {
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
  REMOTE: "Remoto",
};

export const familyCodeLabels: Record<JobFamilyCode, string> = {
  ADMIN_ASSISTANT: "Auxiliar administrativo",
  HEAVY_MACHINERY_OPERATOR: "Operador de maquinaria pesada",
  WAREHOUSE_SUPERVISOR: "Encargado de almacén",
};

export const requirementKindLabels: Record<RequirementKind, string> = {
  MANDATORY: "Esencial",
  DESIRABLE: "Deseable",
};

export const requirementLevelLabels: Record<1 | 2 | 3 | 4, string> = {
  1: "Básico",
  2: "Intermedio",
  3: "Avanzado",
  4: "Experto",
};

/** Texto de salario legible, compartido entre la lista y el detalle de oportunidad. */
export function salaryText(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${formatRange(min, max)} MXN/mes`;
  if (min != null) return `Desde ${formatMXN(min)}/mes`;
  if (max != null) return `Hasta ${formatMXN(max)}/mes`;
  return "Salario a convenir";
}

export function locationText(opportunity: Pick<Opportunity, "location">): string {
  return opportunity.location ? `${opportunity.location.city}, ${opportunity.location.state}` : "Remoto";
}

const BOOKMARKS_KEY = "ce-bookmarks";

/** Bookmarks locales del marketplace (no forman parte del contrato API, ver 02 §"Should Have"). */
export function readBookmarks(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function setBookmark(vacancyId: string, bookmarked: boolean): void {
  if (typeof localStorage === "undefined") return;
  const current = new Set(readBookmarks());
  if (bookmarked) current.add(vacancyId);
  else current.delete(vacancyId);
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.from(current)));
  } catch {
    // almacenamiento lleno o no disponible: el bookmark queda solo en memoria de esta sesión
  }
}
