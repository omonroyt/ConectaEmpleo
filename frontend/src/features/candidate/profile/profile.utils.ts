import type { Availability, CandidateSkill } from "@/api/types";
import type { EvidenceLevel } from "@/components/ui";

/** Copy fijo de disponibilidad, compartido por hero (C11) y edición (C12). */
export const availabilityLabels: Record<Availability, string> = {
  IMMEDIATE: "Disponibilidad inmediata",
  TWO_WEEKS: "Disponible en 2 semanas",
  ONE_MONTH: "Disponible en 1 mes",
};

export const availabilityOptions: { value: Availability; label: string }[] = [
  { value: "IMMEDIATE", label: "Inmediata" },
  { value: "TWO_WEEKS", label: "2 semanas" },
  { value: "ONE_MONTH", label: "1 mes" },
];

/** Estados de México (no existe una lista compartida todavía; F3 la definirá para onboarding). */
export const MEXICO_STATES = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua",
  "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero",
  "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla",
  "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas",
  "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
];

/**
 * Deriva el nivel de evidencia visual de una habilidad según sus flags.
 * Prioridad: verified > evaluated > declared (nunca "partial"/"pending" aquí:
 * esos niveles son para claims de CV/certificaciones, no para `CandidateSkill`).
 */
export function evidenceLevelForSkill(skill: CandidateSkill): EvidenceLevel {
  if (skill.is_verified) return "verified";
  if (skill.is_evaluated) return "evaluated";
  return "declared";
}

/** Texto de confianza (nunca solo el número, ver 01_FRONTEND_FOUNDATIONS.md §10). */
export function confidenceLabel(confidence: number): string {
  if (confidence >= 0.75) return "confianza alta";
  if (confidence >= 0.5) return "confianza media";
  return "confianza baja";
}
