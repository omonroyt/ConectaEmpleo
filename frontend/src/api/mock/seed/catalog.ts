import type { Competency, JobFamily, Skill, VacancyWeights } from "@/api/types";

// Ids estables (usados por deep links de otras tareas: F3-F7 pueden asumir estos valores).
export const JOB_FAMILY_IDS = {
  ADMIN_ASSISTANT: "jf_admin_assistant",
  HEAVY_MACHINERY_OPERATOR: "jf_heavy_machinery",
  WAREHOUSE_SUPERVISOR: "jf_warehouse_supervisor",
} as const;

export const JOB_FAMILIES: JobFamily[] = [
  {
    id: JOB_FAMILY_IDS.ADMIN_ASSISTANT,
    code: "ADMIN_ASSISTANT",
    name: "Auxiliar administrativo",
    role_objective:
      "Dar soporte operativo a una oficina o coordinación: agenda, documentos, atención a clientes y proveedores.",
  },
  {
    id: JOB_FAMILY_IDS.HEAVY_MACHINERY_OPERATOR,
    code: "HEAVY_MACHINERY_OPERATOR",
    name: "Obrero operador de maquinaria pesada",
    role_objective:
      "Operar maquinaria pesada en obra o planta cumpliendo protocolos de seguridad y ritmos de producción.",
  },
  {
    id: JOB_FAMILY_IDS.WAREHOUSE_SUPERVISOR,
    code: "WAREHOUSE_SUPERVISOR",
    name: "Encargado de almacén",
    role_objective:
      "Coordinar la recepción, resguardo y despacho de inventario, y al equipo de montacarguistas y auxiliares.",
  },
];

/** competencias por familia — código · nombre · tipo · core, tal como 02 §2. Descripciones de una línea agregadas por F2. */
const ADMIN: Array<[string, string, "TECHNICAL" | "BEHAVIORAL", boolean, string]> = [
  ["OFFICE_TOOLS", "Herramientas de oficina (Excel, Word, correo)", "TECHNICAL", true, "Usa hojas de cálculo, procesador de texto y correo para tareas diarias de oficina."],
  ["DOCUMENT_CONTROL", "Control documental y archivo", "TECHNICAL", true, "Organiza, clasifica y resguarda documentos físicos y digitales de forma trazable."],
  ["SCHEDULING_COORDINATION", "Agenda y coordinación", "TECHNICAL", false, "Coordina citas, salas y viajes evitando choques de horario."],
  ["CUSTOMER_SERVICE", "Atención a clientes y proveedores", "TECHNICAL", true, "Atiende solicitudes de clientes o proveedores con cortesía y seguimiento oportuno."],
  ["WRITTEN_COMMUNICATION", "Comunicación escrita", "TECHNICAL", false, "Redacta correos, minutas y reportes claros y sin ambigüedad."],
  ["ORGANIZATION_PRIORITIZATION", "Organización y priorización", "BEHAVIORAL", true, "Ordena tareas por urgencia e importancia y cumple fechas límite."],
  ["TEAM_COLLABORATION", "Colaboración en equipo", "BEHAVIORAL", false, "Coopera con otras áreas para sacar adelante tareas compartidas."],
  ["PROBLEM_SOLVING", "Resolución de problemas", "BEHAVIORAL", false, "Identifica la causa de un contratiempo administrativo y propone una solución práctica."],
];

const HEAVY: Array<[string, string, "TECHNICAL" | "BEHAVIORAL", boolean, string]> = [
  ["MACHINERY_OPERATION", "Operación de maquinaria", "TECHNICAL", true, "Opera maquinaria pesada (retroexcavadora, cargador, grúa) con precisión y control."],
  ["SAFETY_PROTOCOLS", "Protocolos de seguridad", "TECHNICAL", true, "Aplica protocolos de seguridad, bloqueo/etiquetado y uso de EPP en todo momento."],
  ["PREVENTIVE_MAINTENANCE", "Mantenimiento preventivo", "TECHNICAL", false, "Revisa niveles, filtros y desgaste antes de operar para prevenir fallas."],
  ["LOAD_HANDLING", "Manejo de cargas", "TECHNICAL", true, "Calcula y maniobra cargas pesadas respetando límites de peso y equilibrio."],
  ["SITE_SIGNALING", "Señalización y comunicación en obra", "TECHNICAL", false, "Usa señales manuales y radio para coordinarse con el equipo en obra."],
  ["RISK_AWARENESS", "Conciencia de riesgo", "BEHAVIORAL", true, "Detecta condiciones inseguras y actúa antes de que ocurra un incidente."],
  ["INSTRUCTION_FOLLOWING", "Seguimiento de instrucciones", "BEHAVIORAL", false, "Ejecuta instrucciones del supervisor de obra con precisión y sin omitir pasos."],
  ["TEAM_COORDINATION", "Coordinación con el equipo", "BEHAVIORAL", false, "Se coordina con maniobristas y otros operadores para trabajar sin choques ni tiempos muertos."],
];

const WAREHOUSE: Array<[string, string, "TECHNICAL" | "BEHAVIORAL", boolean, string]> = [
  ["INVENTORY_CONTROL", "Control de inventarios", "TECHNICAL", true, "Mantiene el inventario físico conciliado contra el sistema y detecta variaciones."],
  ["FORKLIFT_SAFETY", "Seguridad en montacargas", "TECHNICAL", true, "Opera montacargas siguiendo reglas de velocidad, carga y señalización del almacén."],
  ["WMS_ERP_SYSTEMS", "Sistemas WMS / ERP", "TECHNICAL", false, "Registra movimientos de almacén en un sistema WMS o ERP con datos correctos."],
  ["RECEIVING_DISPATCH", "Recepción y despacho", "TECHNICAL", true, "Verifica y documenta la mercancía que entra y sale del almacén contra el pedido."],
  ["STORAGE_ORGANIZATION", "Organización de almacén", "TECHNICAL", false, "Define y mantiene la ubicación lógica de la mercancía para agilizar el surtido."],
  ["TEAM_COORDINATION", "Coordinación de equipo", "BEHAVIORAL", true, "Distribuye tareas entre montacarguistas y auxiliares durante el turno."],
  ["PROBLEM_SOLVING", "Resolución de problemas", "BEHAVIORAL", false, "Reacciona con criterio ante faltantes, retrasos o mercancía dañada."],
  ["DISCREPANCY_RESOLUTION", "Resolución de diferencias", "BEHAVIORAL", false, "Investiga y concilia diferencias entre el físico y el sistema hasta cerrarlas."],
];

function buildCompetencies(
  jobFamilyId: string,
  rows: Array<[string, string, "TECHNICAL" | "BEHAVIORAL", boolean, string]>,
): Competency[] {
  return rows.map(([code, name, type, is_core, description]) => ({
    id: `cmp_${jobFamilyId.replace("jf_", "")}_${code.toLowerCase()}`,
    job_family_id: jobFamilyId,
    code,
    name,
    type,
    description,
    is_core,
  }));
}

export const COMPETENCIES_BY_FAMILY: Record<string, Competency[]> = {
  [JOB_FAMILY_IDS.ADMIN_ASSISTANT]: buildCompetencies(JOB_FAMILY_IDS.ADMIN_ASSISTANT, ADMIN),
  [JOB_FAMILY_IDS.HEAVY_MACHINERY_OPERATOR]: buildCompetencies(JOB_FAMILY_IDS.HEAVY_MACHINERY_OPERATOR, HEAVY),
  [JOB_FAMILY_IDS.WAREHOUSE_SUPERVISOR]: buildCompetencies(JOB_FAMILY_IDS.WAREHOUSE_SUPERVISOR, WAREHOUSE),
};

export const ALL_COMPETENCIES: Competency[] = Object.values(COMPETENCIES_BY_FAMILY).flat();

/** Pesos por defecto del matching (02 §2), siempre normalizados a 100. */
export const DEFAULT_WEIGHTS: VacancyWeights = {
  TECHNICAL: 40,
  BEHAVIORAL: 20,
  EXPERIENCE: 15,
  EVIDENCE: 10,
  SALARY: 8,
  LOCATION: 7,
};

// ---------- catálogo de ~40 skills ----------
function skill(code: string, name: string, category: string): Skill {
  return { id: `skl_${code.toLowerCase()}`, code, name, category };
}

export const SKILLS: Skill[] = [
  // Ofimática / administrativo
  skill("EXCEL_INTERMEDIATE", "Excel nivel intermedio", "Ofimática"),
  skill("EXCEL_ADVANCED", "Excel avanzado (tablas dinámicas)", "Ofimática"),
  skill("WORD_ADVANCED", "Word avanzado", "Ofimática"),
  skill("OUTLOOK_MANAGEMENT", "Gestión de correo (Outlook)", "Ofimática"),
  skill("DATA_ENTRY", "Captura de datos", "Ofimática"),
  skill("FILING_SYSTEMS", "Sistemas de archivo", "Administración"),
  skill("INVOICE_PROCESSING", "Procesamiento de facturas", "Administración"),
  skill("TRAVEL_COORDINATION", "Coordinación de viajes", "Administración"),
  skill("CALENDAR_MANAGEMENT", "Gestión de agenda", "Administración"),
  skill("BUSINESS_WRITING", "Redacción de negocios", "Comunicación"),
  skill("MINUTE_TAKING", "Elaboración de minutas", "Comunicación"),
  skill("BILINGUAL_ENGLISH_BASIC", "Inglés básico", "Idiomas"),
  // Atención a clientes
  skill("CUSTOMER_SERVICE_PHONE", "Atención telefónica", "Atención a clientes"),
  skill("CUSTOMER_SERVICE_CHAT", "Atención por chat", "Atención a clientes"),
  skill("POS_SYSTEMS", "Sistemas punto de venta", "Atención a clientes"),
  skill("CONFLICT_RESOLUTION", "Resolución de conflictos", "Habilidades blandas"),
  skill("TIME_MANAGEMENT", "Administración del tiempo", "Habilidades blandas"),
  skill("TEAM_LEADERSHIP_BASIC", "Liderazgo de equipo (básico)", "Habilidades blandas"),
  // Maquinaria pesada
  skill("FORKLIFT_OPERATION", "Operación de montacargas", "Maquinaria"),
  skill("FORKLIFT_CERTIFICATION", "Certificación de montacarguista", "Maquinaria"),
  skill("CRANE_OPERATION", "Operación de grúa", "Maquinaria"),
  skill("EXCAVATOR_OPERATION", "Operación de retroexcavadora", "Maquinaria"),
  skill("BULLDOZER_OPERATION", "Operación de bulldozer", "Maquinaria"),
  skill("LOADER_OPERATION", "Operación de cargador frontal", "Maquinaria"),
  skill("WELDING_BASIC", "Soldadura básica", "Maquinaria"),
  skill("HYDRAULIC_SYSTEMS", "Sistemas hidráulicos", "Maquinaria"),
  skill("PREVENTIVE_MAINTENANCE_BASIC", "Mantenimiento preventivo básico", "Mantenimiento"),
  // Seguridad
  skill("LOCKOUT_TAGOUT", "Bloqueo y etiquetado (LOTO)", "Seguridad"),
  skill("PPE_USAGE", "Uso de equipo de protección personal", "Seguridad"),
  skill("TRAFFIC_SIGNALING", "Señalización vial en obra", "Seguridad"),
  skill("SAFETY_AUDITS", "Auditorías de seguridad", "Seguridad"),
  skill("FIRST_AID_BASIC", "Primeros auxilios básicos", "Seguridad"),
  skill("DEFENSIVE_DRIVING", "Manejo defensivo", "Seguridad"),
  // Almacén / logística
  skill("SAP_WMS", "SAP WMS", "Sistemas"),
  skill("ORACLE_WMS", "Oracle WMS", "Sistemas"),
  skill("INVENTORY_CYCLE_COUNT", "Conteos cíclicos de inventario", "Logística"),
  skill("PALLET_JACK", "Operación de patín hidráulico", "Logística"),
  skill("BARCODE_SCANNING", "Escaneo de códigos de barras", "Logística"),
  skill("RECEIVING_INSPECTION", "Inspección de recepción", "Logística"),
  skill("DISPATCH_PLANNING", "Planeación de despachos", "Logística"),
  skill("WAREHOUSE_LAYOUT", "Diseño de layout de almacén", "Logística"),
];
