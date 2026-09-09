import type { Company, WorkMode } from "@/api/types";

/** Opciones fijas para los formularios de identidad/ubicación de empresa (onboarding + perfil). */

export const COMPANY_SIZE_OPTIONS: { value: Company["size"]; label: string }[] = [
  { value: "1-10", label: "1–10 personas" },
  { value: "11-50", label: "11–50 personas" },
  { value: "51-200", label: "51–200 personas" },
  { value: "200+", label: "200+ personas" },
];

export const WORK_MODE_OPTIONS: { value: WorkMode; label: string }[] = [
  { value: "ONSITE", label: "Presencial" },
  { value: "HYBRID", label: "Híbrido" },
  { value: "REMOTE", label: "Remoto" },
];

/** La spec no da un catálogo de industrias: lista simple y suficiente para el MVP. */
export const INDUSTRY_OPTIONS = [
  "Logística y transporte",
  "Manufactura e industria",
  "Construcción",
  "Comercio y retail",
  "Tecnología",
  "Servicios profesionales",
  "Salud",
  "Educación",
  "Otro",
].map((label) => ({ value: label, label }));
