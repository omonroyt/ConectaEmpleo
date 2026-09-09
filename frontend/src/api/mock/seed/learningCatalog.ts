import type { LearningRecommendation } from "@/api/types";

export interface LearningCatalogRow {
  competency_code: string;
  recommendation: LearningRecommendation;
}

/** ~20 filas de catálogo de aprendizaje mapeadas por competency_code (02 §2). */
export const LEARNING_CATALOG: LearningCatalogRow[] = [
  { competency_code: "OFFICE_TOOLS", recommendation: { type: "COURSE", provider: "Platzi", title: "Curso de Excel para oficina", estimated_effort: "6 h", source: "CATALOG", url: null } },
  { competency_code: "DOCUMENT_CONTROL", recommendation: { type: "CERTIFICATION", provider: "CONOCER", title: "Estándar de competencia en control documental", estimated_effort: "3 semanas", source: "CATALOG", url: null } },
  { competency_code: "SCHEDULING_COORDINATION", recommendation: { type: "COURSE", provider: "Coursera", title: "Gestión del tiempo y agenda ejecutiva", estimated_effort: "4 h", source: "CATALOG", url: null } },
  { competency_code: "CUSTOMER_SERVICE", recommendation: { type: "COURSE", provider: "Google", title: "Fundamentos de atención al cliente", estimated_effort: "8 h", source: "CATALOG", url: null } },
  { competency_code: "WRITTEN_COMMUNICATION", recommendation: { type: "COURSE", provider: "edX", title: "Redacción efectiva en el trabajo", estimated_effort: "5 h", source: "CATALOG", url: null } },
  { competency_code: "ORGANIZATION_PRIORITIZATION", recommendation: { type: "COURSE", provider: "Platzi", title: "Productividad personal y priorización", estimated_effort: "4 h", source: "CATALOG", url: null } },
  { competency_code: "PROBLEM_SOLVING", recommendation: { type: "COURSE", provider: "Coursera", title: "Resolución de problemas en el trabajo", estimated_effort: "6 h", source: "CATALOG", url: null } },
  { competency_code: "MACHINERY_OPERATION", recommendation: { type: "CERTIFICATION", provider: "STPS", title: "Constancia DC-3 de operación de maquinaria", estimated_effort: "1 semana", source: "CATALOG", url: null } },
  { competency_code: "SAFETY_PROTOCOLS", recommendation: { type: "CERTIFICATION", provider: "STPS", title: "NOM-STPS de seguridad en obra", estimated_effort: "2 semanas", source: "CATALOG", url: null } },
  { competency_code: "PREVENTIVE_MAINTENANCE", recommendation: { type: "COURSE", provider: "edX", title: "Mantenimiento preventivo básico de equipo pesado", estimated_effort: "6 h", source: "CATALOG", url: null } },
  { competency_code: "LOAD_HANDLING", recommendation: { type: "CERTIFICATION", provider: "CONOCER", title: "Estándar de manejo seguro de cargas", estimated_effort: "2 semanas", source: "CATALOG", url: null } },
  { competency_code: "SITE_SIGNALING", recommendation: { type: "COURSE", provider: "STPS", title: "Señalización y comunicación en obra", estimated_effort: "3 h", source: "CATALOG", url: null } },
  { competency_code: "RISK_AWARENESS", recommendation: { type: "COURSE", provider: "STPS", title: "Identificación de riesgos laborales", estimated_effort: "4 h", source: "CATALOG", url: null } },
  { competency_code: "INVENTORY_CONTROL", recommendation: { type: "COURSE", provider: "Coursera", title: "Fundamentos de control de inventarios", estimated_effort: "7 h", source: "CATALOG", url: null } },
  { competency_code: "FORKLIFT_SAFETY", recommendation: { type: "CERTIFICATION", provider: "STPS", title: "Certificación de montacarguista", estimated_effort: "1 semana", source: "CATALOG", url: null } },
  { competency_code: "WMS_ERP_SYSTEMS", recommendation: { type: "COURSE", provider: "Platzi", title: "Introducción a sistemas WMS", estimated_effort: "5 h", source: "CATALOG", url: null } },
  { competency_code: "RECEIVING_DISPATCH", recommendation: { type: "COURSE", provider: "Coursera", title: "Operaciones de recepción y despacho", estimated_effort: "6 h", source: "CATALOG", url: null } },
  { competency_code: "STORAGE_ORGANIZATION", recommendation: { type: "COURSE", provider: "edX", title: "Diseño de almacenes eficientes", estimated_effort: "5 h", source: "CATALOG", url: null } },
  { competency_code: "TEAM_COORDINATION", recommendation: { type: "COURSE", provider: "Google", title: "Coordinación de equipos operativos", estimated_effort: "4 h", source: "CATALOG", url: null } },
  { competency_code: "DISCREPANCY_RESOLUTION", recommendation: { type: "COURSE", provider: "Coursera", title: "Conciliación de inventarios y diferencias", estimated_effort: "4 h", source: "CATALOG", url: null } },
];

const FALLBACK: LearningRecommendation = {
  type: "COURSE",
  provider: "Platzi",
  title: "Habilidades blandas para el trabajo en equipo",
  estimated_effort: "3 h",
  source: "CATALOG",
  url: null,
};

export function recommendationsFor(competencyCode: string): LearningRecommendation[] {
  const rows = LEARNING_CATALOG.filter((r) => r.competency_code === competencyCode);
  return rows.length > 0 ? rows.map((r) => r.recommendation) : [FALLBACK];
}
