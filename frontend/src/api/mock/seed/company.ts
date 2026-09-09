import type { Company, Vacancy, VacancyRequirement } from "@/api/types";
import { JOB_FAMILY_IDS, DEFAULT_WEIGHTS } from "./catalog";

export const COMPANY_ID = "comp_bajio";
export const COMPANY_USER_ID = "user_comp_bajio";

export const SEED_COMPANY: Company = {
  id: COMPANY_ID,
  user_id: COMPANY_USER_ID,
  legal_name: "Logística del Bajío S.A. de C.V.",
  trade_name: "Logística del Bajío",
  industry: "Logística y transporte",
  size: "51-200",
  location: { city: "León", state: "Guanajuato" },
  work_mode: "ONSITE",
  logo_url: null,
  description: "Operador logístico regional del Bajío: almacenaje, distribución y manejo de flotillas para clientes industriales.",
  verification_status: "VERIFIED",
};

function req(id: string, competency_code: string | null, skill_code: string | null, label: string, kind: "MANDATORY" | "DESIRABLE", min_level: 1 | 2 | 3 | 4, weight: number): VacancyRequirement {
  return { id, competency_code, skill_code, label, kind, min_level, weight };
}

export const VACANCY_IDS = {
  ADMIN: "vac_admin_open",
  HEAVY: "vac_heavy_open",
  WAREHOUSE: "vac_warehouse_open",
  DRAFT: "vac_draft_admin2",
};

export const SEED_VACANCIES: Vacancy[] = [
  {
    id: VACANCY_IDS.ADMIN,
    company_id: COMPANY_ID,
    job_family_id: JOB_FAMILY_IDS.ADMIN_ASSISTANT,
    title: "Auxiliar administrativo de operaciones",
    description: "Buscamos auxiliar administrativo para dar soporte a la coordinación de operaciones: agenda, documentación y atención a transportistas y clientes.",
    location: { city: "León", state: "Guanajuato" },
    work_mode: "ONSITE",
    salary_min: 9500,
    salary_max: 12500,
    positions_count: 2,
    status: "OPEN",
    created_at: new Date().toISOString(),
    requirements: [
      req("req_admin_1", "OFFICE_TOOLS", null, "Manejo de Excel y Word nivel intermedio", "MANDATORY", 3, 25),
      req("req_admin_2", "DOCUMENT_CONTROL", null, "Control documental y archivo", "MANDATORY", 3, 20),
      req("req_admin_3", "CUSTOMER_SERVICE", null, "Atención a clientes y transportistas", "MANDATORY", 2, 20),
      req("req_admin_4", "ORGANIZATION_PRIORITIZATION", null, "Organización y priorización de tareas", "DESIRABLE", 2, 15),
      req("req_admin_5", null, "EXCEL_INTERMEDIATE", "Excel intermedio", "DESIRABLE", 2, 20),
    ],
    weights: { ...DEFAULT_WEIGHTS },
    last_match_run_id: null,
    shortlist_count: 0,
  },
  {
    id: VACANCY_IDS.HEAVY,
    company_id: COMPANY_ID,
    job_family_id: JOB_FAMILY_IDS.HEAVY_MACHINERY_OPERATOR,
    title: "Operador de maquinaria pesada",
    description: "Vacante para operador de maquinaria pesada en patio de maniobras: carga, descarga y movimiento de contenedores.",
    location: { city: "Silao", state: "Guanajuato" },
    work_mode: "ONSITE",
    salary_min: 12500,
    salary_max: 16500,
    positions_count: 3,
    status: "OPEN",
    created_at: new Date().toISOString(),
    requirements: [
      req("req_heavy_1", "MACHINERY_OPERATION", null, "Operación de maquinaria pesada", "MANDATORY", 3, 25),
      req("req_heavy_2", "SAFETY_PROTOCOLS", null, "Protocolos de seguridad", "MANDATORY", 3, 25),
      req("req_heavy_3", "LOAD_HANDLING", null, "Manejo de cargas", "MANDATORY", 2, 20),
      req("req_heavy_4", "RISK_AWARENESS", null, "Conciencia de riesgo", "DESIRABLE", 2, 15),
      req("req_heavy_5", null, "FORKLIFT_CERTIFICATION", "Certificación vigente de operador", "DESIRABLE", 2, 15),
    ],
    weights: { ...DEFAULT_WEIGHTS },
    last_match_run_id: null,
    shortlist_count: 0,
  },
  {
    id: VACANCY_IDS.WAREHOUSE,
    company_id: COMPANY_ID,
    job_family_id: JOB_FAMILY_IDS.WAREHOUSE_SUPERVISOR,
    title: "Encargado de almacén",
    description: "Responsable de la operación diaria del almacén central: recepción, resguardo, despacho y coordinación del equipo de montacarguistas.",
    location: { city: "León", state: "Guanajuato" },
    work_mode: "ONSITE",
    salary_min: 13000,
    salary_max: 17500,
    positions_count: 1,
    status: "OPEN",
    created_at: new Date().toISOString(),
    requirements: [
      req("req_wh_1", "INVENTORY_CONTROL", null, "Control de inventarios", "MANDATORY", 3, 25),
      req("req_wh_2", "FORKLIFT_SAFETY", null, "Seguridad en montacargas", "MANDATORY", 3, 20),
      req("req_wh_3", "RECEIVING_DISPATCH", null, "Recepción y despacho", "MANDATORY", 3, 20),
      req("req_wh_4", "TEAM_COORDINATION", null, "Coordinación de equipo", "DESIRABLE", 2, 15),
      req("req_wh_5", null, "SAP_WMS", "Experiencia con SAP WMS", "DESIRABLE", 2, 20),
    ],
    weights: { ...DEFAULT_WEIGHTS },
    last_match_run_id: null,
    shortlist_count: 0,
  },
  {
    id: VACANCY_IDS.DRAFT,
    company_id: COMPANY_ID,
    job_family_id: JOB_FAMILY_IDS.ADMIN_ASSISTANT,
    title: "Auxiliar administrativo — turno vespertino (borrador)",
    description: "Segunda vacante de auxiliar administrativo, en definición de requisitos y turno.",
    location: { city: "León", state: "Guanajuato" },
    work_mode: "ONSITE",
    salary_min: null,
    salary_max: null,
    positions_count: 1,
    status: "DRAFT",
    created_at: new Date().toISOString(),
    requirements: [],
    weights: { ...DEFAULT_WEIGHTS },
    last_match_run_id: null,
    shortlist_count: 0,
  },
];
