/**
 * Nivel de evidencia de una habilidad/afirmación del candidato.
 * Definido aquí (no en `src/api`) para que `components/ui` no dependa
 * de la capa de datos (F2 trabaja en paralelo sobre `src/api`).
 */
export type EvidenceLevel =
  | "declared"
  | "evaluated"
  | "verified"
  | "partial"
  | "pending";

export const evidenceLabels: Record<EvidenceLevel, string> = {
  declared: "Declarada",
  evaluated: "Evaluada",
  verified: "Verificada",
  partial: "Parcial",
  pending: "Pendiente",
};

export const evidenceDescriptions: Record<EvidenceLevel, string> = {
  declared: "El candidato la afirma.",
  evaluated: "Explorada en entrevista con rúbrica.",
  verified: "Respaldada por documento aceptado.",
  partial: "Evidencia incompleta.",
  pending: "Por validar.",
};
