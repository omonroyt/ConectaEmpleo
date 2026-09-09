import type {
  Availability,
  CandidateProfile,
  CandidateSkill,
  CompetencyEvaluation,
  DocumentRef,
  EducationItem,
  ExperienceItem,
  FeedbackReport,
  LearningGap,
  LearningPath,
  TalentProfile,
} from "@/api/types";
import { JOB_FAMILY_IDS, COMPETENCIES_BY_FAMILY, SKILLS } from "./catalog";
import { recommendationsFor } from "./learningCatalog";
import { mulberry32, randInt, pickMany, clamp, formatStrengthLine } from "../util";

export interface SeedCandidate {
  profile: CandidateProfile;
  skills: CandidateSkill[];
  evaluations: CompetencyEvaluation[];
  talentProfile: TalentProfile;
  feedback: FeedbackReport;
  learningPath: LearningPath;
  documents: DocumentRef[];
}

interface CandidateSeedSpec {
  familyId: string;
  anonSuffix: string;
  fullName: string;
  city: string;
  gender: "Femenino" | "Masculino";
  birthYear: number;
  phone: string;
  availability: Availability;
  salaryMin: number;
  salaryMax: number;
  yearsExperience: number;
  company: string;
  position: string;
  degree: string;
  institution: string;
  /**
   * 1 = candidato con la evidencia más fuerte de su familia, 5 = la más débil.
   * Solo alimenta la variedad de `buildSkills`/`buildEvaluations` (cantidad de
   * habilidades, cuántas evaluadas/verificadas, nivel de rúbrica); el ranking
   * real ante una vacante lo calcula el motor de matching en runtime y puede
   * no coincidir exactamente con este orden.
   */
  rankHint: 1 | 2 | 3 | 4 | 5;
}

const ADMIN = JOB_FAMILY_IDS.ADMIN_ASSISTANT;
const HEAVY = JOB_FAMILY_IDS.HEAVY_MACHINERY_OPERATOR;
const WAREHOUSE = JOB_FAMILY_IDS.WAREHOUSE_SUPERVISOR;

const SPECS: CandidateSeedSpec[] = [
  // ---- ADMIN_ASSISTANT ----
  { familyId: ADMIN, anonSuffix: "8A21", fullName: "Ana Karen Flores Jiménez", city: "León", gender: "Femenino", birthYear: 1996, phone: "4771230011", availability: "IMMEDIATE", salaryMin: 9000, salaryMax: 12000, yearsExperience: 4, company: "Grupo Comercial Bajío", position: "Auxiliar administrativa", degree: "Licenciatura en Administración (trunca)", institution: "Universidad Tecnológica de León", rankHint: 2 },
  { familyId: ADMIN, anonSuffix: "3F09", fullName: "Diego Alejandro Ramírez Torres", city: "Guadalajara", gender: "Masculino", birthYear: 1993, phone: "3312340022", availability: "TWO_WEEKS", salaryMin: 10000, salaryMax: 13500, yearsExperience: 6, company: "Distribuidora Occidente", position: "Asistente de dirección", degree: "Técnico en Administración", institution: "CONALEP Guadalajara", rankHint: 1 },
  { familyId: ADMIN, anonSuffix: "C412", fullName: "Lucía Fernanda Morales Castillo", city: "Ciudad de México", gender: "Femenino", birthYear: 1998, phone: "5512350033", availability: "ONE_MONTH", salaryMin: 11000, salaryMax: 14000, yearsExperience: 3, company: "Corporativo Reforma", position: "Recepcionista y auxiliar de oficina", degree: "Bachillerato general", institution: "Preparatoria 6 CDMX", rankHint: 4 },
  { familyId: ADMIN, anonSuffix: "9B77", fullName: "José Manuel Herrera Vázquez", city: "Querétaro", gender: "Masculino", birthYear: 1990, phone: "4421360044", availability: "IMMEDIATE", salaryMin: 10500, salaryMax: 13000, yearsExperience: 8, company: "Parque Industrial Querétaro", position: "Coordinador administrativo", degree: "Licenciatura en Contaduría", institution: "Universidad Autónoma de Querétaro", rankHint: 3 },
  { familyId: ADMIN, anonSuffix: "5E63", fullName: "Paola Guadalupe Sánchez Reyes", city: "Irapuato", gender: "Femenino", birthYear: 2000, phone: "4621370055", availability: "TWO_WEEKS", salaryMin: 8500, salaryMax: 11000, yearsExperience: 2, company: "Agroindustrias del Bajío", position: "Auxiliar de archivo", degree: "Bachillerato técnico en Ofimática", institution: "CBTIS 108 Irapuato", rankHint: 5 },
  // ---- HEAVY_MACHINERY_OPERATOR ----
  { familyId: HEAVY, anonSuffix: "1D48", fullName: "Juan Carlos Mendoza Ríos", city: "Monterrey", gender: "Masculino", birthYear: 1988, phone: "8112340066", availability: "IMMEDIATE", salaryMin: 13000, salaryMax: 17000, yearsExperience: 10, company: "Construcciones del Norte", position: "Operador de retroexcavadora", degree: "Bachillerato técnico industrial", institution: "CBTIS 3 Monterrey", rankHint: 1 },
  { familyId: HEAVY, anonSuffix: "7A90", fullName: "Roberto Carlos Aguilar Domínguez", city: "Celaya", gender: "Masculino", birthYear: 1991, phone: "4611350077", availability: "TWO_WEEKS", salaryMin: 12500, salaryMax: 16000, yearsExperience: 7, company: "Constructora Bajío Fuerte", position: "Operador de cargador frontal", degree: "Secundaria técnica", institution: "Escuela Secundaria Técnica 12", rankHint: 2 },
  { familyId: HEAVY, anonSuffix: "2C55", fullName: "Miguel Ángel Torres Salinas", city: "Silao", gender: "Masculino", birthYear: 1985, phone: "4721360088", availability: "IMMEDIATE", salaryMin: 14000, salaryMax: 18000, yearsExperience: 13, company: "Grupo Industrial Silao", position: "Operador de grúa", degree: "Bachillerato técnico industrial", institution: "CONALEP Silao", rankHint: 3 },
  { familyId: HEAVY, anonSuffix: "6F31", fullName: "Francisco Javier Cruz Ortega", city: "Aguascalientes", gender: "Masculino", birthYear: 1994, phone: "4491370099", availability: "ONE_MONTH", salaryMin: 12000, salaryMax: 15500, yearsExperience: 5, company: "Obras Viales Aguascalientes", position: "Operador de bulldozer", degree: "Bachillerato general", institution: "Preparatoria Uno Aguascalientes", rankHint: 4 },
  { familyId: HEAVY, anonSuffix: "4B26", fullName: "Alejandro Gómez Villanueva", city: "Puebla", gender: "Masculino", birthYear: 1997, phone: "2221380010", availability: "IMMEDIATE", salaryMin: 11500, salaryMax: 15000, yearsExperience: 3, company: "Edificaciones del Sur", position: "Operador de maquinaria pesada", degree: "Bachillerato técnico industrial", institution: "CBTIS 25 Puebla", rankHint: 5 },
  // ---- WAREHOUSE_SUPERVISOR ----
  { familyId: WAREHOUSE, anonSuffix: "4F82", fullName: "María José Hernández López", city: "León", gender: "Femenino", birthYear: 1992, phone: "4771390021", availability: "IMMEDIATE", salaryMin: 14000, salaryMax: 18000, yearsExperience: 6, company: "Logística del Bajío S.A. de C.V.", position: "Encargada de almacén", degree: "Licenciatura en Logística (trunca)", institution: "Universidad Tecnológica de León", rankHint: 1 },
  { familyId: WAREHOUSE, anonSuffix: "8E17", fullName: "Sergio Iván Martínez Cabrera", city: "Guanajuato", gender: "Masculino", birthYear: 1989, phone: "4731400032", availability: "TWO_WEEKS", salaryMin: 13500, salaryMax: 17500, yearsExperience: 9, company: "Almacenes Guanajuato", position: "Supervisor de almacén", degree: "Bachillerato técnico en Logística", institution: "CBTIS 45 Guanajuato", rankHint: 2 },
  { familyId: WAREHOUSE, anonSuffix: "0C64", fullName: "Karla Patricia Delgado Nuñez", city: "Salamanca", gender: "Femenino", birthYear: 1995, phone: "4641410043", availability: "IMMEDIATE", salaryMin: 12500, salaryMax: 16000, yearsExperience: 4, company: "Refaccionaria Industrial Salamanca", position: "Coordinadora de inventarios", degree: "Técnico en Administración de Almacenes", institution: "CONALEP Salamanca", rankHint: 4 },
  { familyId: WAREHOUSE, anonSuffix: "3D95", fullName: "Eduardo Daniel Rojas Peña", city: "Toluca", gender: "Masculino", birthYear: 1987, phone: "7221420054", availability: "ONE_MONTH", salaryMin: 13000, salaryMax: 17000, yearsExperience: 11, company: "Centro de Distribución Toluca", position: "Jefe de turno de almacén", degree: "Bachillerato técnico industrial", institution: "CBTIS 19 Toluca", rankHint: 3 },
  { familyId: WAREHOUSE, anonSuffix: "9A38", fullName: "Verónica Isabel Campos Rivera", city: "San Luis Potosí", gender: "Femenino", birthYear: 1999, phone: "4441430065", availability: "TWO_WEEKS", salaryMin: 11500, salaryMax: 15000, yearsExperience: 2, company: "Distribuidora Potosina", position: "Auxiliar de almacén", degree: "Bachillerato general", institution: "Preparatoria Estatal SLP", rankHint: 5 },
];

/** Frases de justificación por competencia y familia (versión sólida y versión en desarrollo). */
const PHRASES: Record<string, { good: string; weak: string; limitation: string }> = {
  OFFICE_TOOLS: { good: 'En la entrevista describió con detalle cómo arma reportes con tablas dinámicas: "uso Excel para cruzar la información de ventas cada semana".', weak: 'Mencionó usar Excel "solo para capturar listas simples", sin ejemplos de fórmulas o tablas.', limitation: "No hay evidencia de manejo de fórmulas avanzadas." },
  DOCUMENT_CONTROL: { good: 'Explicó su método de carpetas y bitácora: "cada expediente lleva folio y se archiva por fecha y proveedor".', weak: "Describió el archivo de forma general, sin mencionar un criterio de clasificación claro.", limitation: "No detalló cómo controla versiones o expedientes extraviados." },
  CUSTOMER_SERVICE: { good: 'Relató un caso concreto de un cliente molesto y cómo lo resolvió sin escalar el conflicto.', weak: "Su respuesta fue breve y no dio un ejemplo real de atención a un cliente difícil.", limitation: "Falta evidencia de manejo de quejas escaladas." },
  SCHEDULING_COORDINATION: { good: "Describió cómo concilia agendas de varias personas usando un calendario compartido.", weak: "Dijo que coordina agendas pero no explicó cómo evita choques de horario.", limitation: "No mencionó herramientas de agenda compartida." },
  WRITTEN_COMMUNICATION: { good: "Sus respuestas escritas fueron claras, breves y sin errores relevantes de redacción.", weak: "Sus respuestas fueron confusas o con ideas incompletas.", limitation: "Se recomienda validar redacción formal con una muestra adicional." },
  ORGANIZATION_PRIORITIZATION: { good: 'Explicó un criterio claro de priorización: "primero lo que tiene fecha límite y afecta a otras áreas".', weak: "No tuvo un criterio claro para decidir qué tarea atender primero.", limitation: "No dio un ejemplo de una prioridad mal calculada." },
  TEAM_COLLABORATION: { good: "Dio un ejemplo concreto de coordinarse con otra área para cerrar una tarea a tiempo.", weak: "Habló de trabajo en equipo en términos generales, sin un caso específico.", limitation: "Falta un ejemplo concreto de colaboración bajo presión." },
  PROBLEM_SOLVING: { good: "Describió paso a paso cómo detectó la causa de un problema administrativo y lo resolvió.", weak: "Reconoció el problema pero no explicó cómo llegó a la causa raíz.", limitation: "No profundizó en el método para resolver el problema." },
  MACHINERY_OPERATION: { good: 'Detalló la maquinaria operada y el tipo de terreno: "he operado retroexcavadora en terracería y en obra urbana".', weak: "Mencionó maquinaria de forma vaga, sin detalles del contexto de operación.", limitation: "No especificó horas de operación certificadas." },
  SAFETY_PROTOCOLS: { good: 'Describió una rutina de revisión previa clara: "reviso niveles, frenos y el área antes de encender la máquina".', weak: "Mencionó seguridad en general sin una rutina de revisión concreta.", limitation: "No mencionó el uso de listas de verificación (checklists)." },
  PREVENTIVE_MAINTENANCE: { good: "Explicó qué revisa (niveles, filtros, desgaste) antes de operar y con qué frecuencia.", weak: "No tiene una rutina definida de mantenimiento preventivo.", limitation: "Requiere validar conocimiento técnico de mantenimiento." },
  LOAD_HANDLING: { good: "Dio un ejemplo de cálculo de peso y equilibrio antes de mover una carga difícil.", weak: "No explicó cómo calcula el peso o el riesgo antes de mover una carga.", limitation: "No mencionó límites de carga certificados." },
  SITE_SIGNALING: { good: "Describió el uso de señales manuales y radio para coordinarse en obra.", weak: "No mencionó un sistema claro de señalización con el equipo.", limitation: "Falta evidencia de uso de radio o señales estandarizadas." },
  RISK_AWARENESS: { good: "Contó un caso concreto donde detectó una condición insegura y la reportó a tiempo.", weak: "No dio un ejemplo de haber detectado o reportado un riesgo.", limitation: "No hay evidencia de haber actuado ante un riesgo real." },
  INSTRUCTION_FOLLOWING: { good: "Explicó cómo sigue instrucciones del supervisor al pie de la letra, incluso bajo presión.", weak: "No quedó claro cómo maneja instrucciones ambiguas del supervisor.", limitation: "Falta un ejemplo de instrucción mal ejecutada y corregida." },
  TEAM_COORDINATION: { good: "Describió cómo se coordina con otros operadores o auxiliares para evitar tiempos muertos.", weak: "Habló de coordinación en términos generales, sin ejemplo concreto.", limitation: "No mencionó cómo resuelve una descoordinación real." },
  INVENTORY_CONTROL: { good: 'Explicó su método de conteo cíclico: "cada semana concilio el físico contra el sistema por zona".', weak: "Describió el control de inventario de forma general, sin método claro.", limitation: "No detalló cómo cierra diferencias de inventario." },
  FORKLIFT_SAFETY: { good: "Enumeró reglas concretas de velocidad, carga máxima y señalización que sigue siempre.", weak: "Mencionó reglas de seguridad genéricas sin ejemplos de aplicación.", limitation: "No mencionó certificación vigente de montacarguista." },
  WMS_ERP_SYSTEMS: { good: "Describió con detalle cómo registra movimientos en un sistema WMS o ERP.", weak: "Ha usado un sistema de almacén, pero de forma básica y supervisada.", limitation: "No hay evidencia de configurar o auditar el sistema." },
  RECEIVING_DISPATCH: { good: "Explicó su proceso de verificación de mercancía contra el pedido antes de firmar de recibido.", weak: "Describió la recepción de forma general, sin mencionar verificación contra pedido.", limitation: "No detalló cómo documenta discrepancias en recepción." },
  STORAGE_ORGANIZATION: { good: "Describió un criterio de ubicación de mercancía por rotación para agilizar el surtido.", weak: "No mencionó un criterio claro para organizar el almacén.", limitation: "Falta evidencia de rediseño de layout." },
  DISCREPANCY_RESOLUTION: { good: 'Relató un caso real de conciliación: "el físico no cuadraba con el sistema y rastreé el movimiento hasta encontrar el error de captura".', weak: "No dio un ejemplo de haber investigado una diferencia de inventario.", limitation: "No detalló el método para rastrear el origen de una diferencia." },
};

/** Skills relevantes por familia, usadas para armar CandidateSkill[] plausibles. */
const SKILLS_BY_FAMILY: Record<string, string[]> = {
  [ADMIN]: ["EXCEL_INTERMEDIATE", "EXCEL_ADVANCED", "WORD_ADVANCED", "OUTLOOK_MANAGEMENT", "DATA_ENTRY", "FILING_SYSTEMS", "INVOICE_PROCESSING", "CALENDAR_MANAGEMENT", "BUSINESS_WRITING", "CUSTOMER_SERVICE_PHONE", "TIME_MANAGEMENT", "BILINGUAL_ENGLISH_BASIC"],
  [HEAVY]: ["FORKLIFT_OPERATION", "CRANE_OPERATION", "EXCAVATOR_OPERATION", "BULLDOZER_OPERATION", "LOADER_OPERATION", "WELDING_BASIC", "HYDRAULIC_SYSTEMS", "PREVENTIVE_MAINTENANCE_BASIC", "LOCKOUT_TAGOUT", "PPE_USAGE", "TRAFFIC_SIGNALING", "FIRST_AID_BASIC", "DEFENSIVE_DRIVING"],
  [WAREHOUSE]: ["SAP_WMS", "ORACLE_WMS", "INVENTORY_CYCLE_COUNT", "PALLET_JACK", "BARCODE_SCANNING", "RECEIVING_INSPECTION", "DISPATCH_PLANNING", "WAREHOUSE_LAYOUT", "FORKLIFT_OPERATION", "FORKLIFT_CERTIFICATION", "TEAM_LEADERSHIP_BASIC"],
};

/**
 * Frase concreta de evidencia por `skill_code` (habilidad evaluada en la
 * entrevista). Antes toda skill evaluada usaba la misma cadena literal; ahora
 * cada una tiene su propia frase específica en español de México.
 */
const EVIDENCE_SUMMARIES: Record<string, string> = {
  EXCEL_INTERMEDIATE: "Mostró cómo arma tablas con fórmulas básicas para controlar gastos e inventarios simples.",
  EXCEL_ADVANCED: "Explicó el uso de tablas dinámicas y fórmulas anidadas para cruzar reportes de varias áreas.",
  WORD_ADVANCED: "Describió cómo da formato a contratos y minutas con plantillas y control de cambios.",
  OUTLOOK_MANAGEMENT: "Detalló su método para organizar el correo por carpetas y dar seguimiento a pendientes.",
  DATA_ENTRY: "Contó cómo captura información evitando errores de digitación con doble revisión.",
  FILING_SYSTEMS: "Explicó su sistema de archivo físico y digital por folio, fecha y proveedor.",
  INVOICE_PROCESSING: "Describió el proceso de revisar, capturar y dar seguimiento a facturas antes de pagarlas.",
  CALENDAR_MANAGEMENT: "Explicó cómo concilia agendas de varias personas sin generar choques de horario.",
  BUSINESS_WRITING: "Sus respuestas escritas fueron claras y bien estructuradas, sin errores relevantes.",
  CUSTOMER_SERVICE_PHONE: "Relató un caso de atención telefónica a un cliente molesto que resolvió sin escalar.",
  TIME_MANAGEMENT: "Explicó cómo prioriza tareas cuando tiene varios pendientes con la misma fecha límite.",
  BILINGUAL_ENGLISH_BASIC: "Respondió con frases simples en inglés sobre su experiencia laboral.",
  FORKLIFT_OPERATION: "Describió su rutina de revisión de frenos, horquillas y carga antes de maniobrar.",
  CRANE_OPERATION: "Detalló el tipo de grúa operada y cómo calcula el radio de carga antes de izar.",
  EXCAVATOR_OPERATION: "Contó su experiencia operando retroexcavadora en terracería y obra urbana.",
  BULLDOZER_OPERATION: "Explicó cómo nivela terreno con bulldozer siguiendo referencias topográficas.",
  LOADER_OPERATION: "Describió cómo carga camiones con cargador frontal cuidando el equilibrio de la cuchara.",
  WELDING_BASIC: "Mencionó el tipo de soldadura que maneja y en qué reparaciones la ha usado.",
  HYDRAULIC_SYSTEMS: "Explicó cómo detecta fugas o fallas comunes en el sistema hidráulico de la máquina.",
  PREVENTIVE_MAINTENANCE_BASIC: "Detalló qué revisa (niveles, filtros, desgaste) antes de operar y con qué frecuencia.",
  LOCKOUT_TAGOUT: "Describió el procedimiento de bloqueo y etiquetado antes de dar mantenimiento a un equipo.",
  PPE_USAGE: "Enumeró el equipo de protección personal que usa según la tarea que va a realizar.",
  TRAFFIC_SIGNALING: "Explicó cómo se coordina con señales manuales y radio dentro de la obra.",
  FIRST_AID_BASIC: "Contó qué haría ante un accidente menor mientras llega ayuda especializada.",
  DEFENSIVE_DRIVING: "Describió hábitos de manejo defensivo al trasladar maquinaria entre frentes de trabajo.",
  SAP_WMS: "Describió con detalle cómo registra entradas y salidas de mercancía en el sistema SAP.",
  ORACLE_WMS: "Explicó cómo consulta existencias y genera movimientos en el sistema Oracle WMS.",
  INVENTORY_CYCLE_COUNT: "Explicó cómo concilia el conteo semanal contra el sistema y qué hace con las diferencias.",
  PALLET_JACK: "Describió cómo mueve tarimas pesadas con patín hidráulico sin dañar el producto.",
  BARCODE_SCANNING: "Detalló cómo escanea códigos de barras para validar que la mercancía coincide con el pedido.",
  RECEIVING_INSPECTION: "Explicó su proceso de verificar mercancía contra la orden de compra antes de firmar de recibido.",
  DISPATCH_PLANNING: "Contó cómo organiza las rutas de despacho para cumplir los horarios de entrega.",
  WAREHOUSE_LAYOUT: "Describió un criterio de acomodo por rotación para agilizar el surtido del almacén.",
  FORKLIFT_CERTIFICATION: "Mencionó su certificación vigente de montacarguista y cuándo la renovó.",
  TEAM_LEADERSHIP_BASIC: "Dio un ejemplo de cómo organiza turnos y resuelve conflictos dentro de su equipo.",
};

/** Variantes genéricas de respaldo para un `skill_code` sin frase propia en el mapa de arriba. */
const GENERIC_EVIDENCE_FALLBACKS = [
  "Explicó con un ejemplo concreto cómo aplica esta habilidad en su trabajo diario.",
  "Describió una situación real donde usó esta habilidad para resolver un problema.",
  "Dio detalles verificables sobre cómo y cuándo aplica esta habilidad en su puesto actual.",
  "Mencionó un caso reciente donde esta habilidad hizo una diferencia en su trabajo.",
];

/**
 * Cuenta de habilidades, cuántas quedan "solo declaradas" (sin evaluar) y
 * cuántas evaluadas quedan verificadas, por `rankHint` (1 = más fuerte). Con
 * esto cada candidato de una familia muestra un conjunto y un volumen de
 * evidencia distintos en vez de las mismas 5 skills y el mismo conteo fijo.
 */
const SKILL_COUNT_RANGE: Record<CandidateSeedSpec["rankHint"], [number, number]> = {
  1: [7, 9],
  2: [6, 8],
  3: [6, 7],
  4: [5, 7],
  5: [5, 6],
};
const DECLARED_ONLY_RANGE: Record<CandidateSeedSpec["rankHint"], [number, number]> = {
  1: [0, 1],
  2: [0, 2],
  3: [1, 2],
  4: [1, 3],
  5: [2, 3],
};
/** Verificadas por documento/certificación, siempre ≤ evaluadas. rankHint 5 nunca tiene verificadas. */
const VERIFIED_RANGE: Record<CandidateSeedSpec["rankHint"], [number, number]> = {
  1: [2, 3],
  2: [1, 2],
  3: [0, 2],
  4: [0, 1],
  5: [0, 0],
};

function buildExperience(spec: CandidateSeedSpec, rng: () => number): ExperienceItem[] {
  const now = new Date();
  const startYear = now.getFullYear() - spec.yearsExperience;
  const items: ExperienceItem[] = [
    {
      id: `exp_${spec.anonSuffix}_1`,
      company: spec.company,
      position: spec.position,
      start_date: `${startYear}-03-01`,
      end_date: null,
      is_current: true,
      description: `Responsable de tareas diarias de ${spec.position.toLowerCase()} en ${spec.company}.`,
      skills: SKILLS_BY_FAMILY[spec.familyId]?.slice(0, 3) ?? [],
    },
  ];
  const extra = randInt(0, 2, rng);
  for (let i = 0; i < extra; i++) {
    const endYear = startYear - i * 2 - 1;
    items.push({
      id: `exp_${spec.anonSuffix}_${i + 2}`,
      company: `Empresa previa ${i + 1}`,
      position: i === 0 ? "Auxiliar general" : "Practicante operativo",
      start_date: `${endYear - 2}-01-01`,
      end_date: `${endYear}-01-01`,
      is_current: false,
      description: "Apoyo operativo general en tareas relacionadas con el puesto.",
      skills: [],
    });
  }
  return items;
}

function buildEducation(spec: CandidateSeedSpec): EducationItem[] {
  return [
    {
      id: `edu_${spec.anonSuffix}_1`,
      institution: spec.institution,
      degree: spec.degree,
      start_year: spec.birthYear + 15,
      end_year: spec.birthYear + 18,
    },
  ];
}

function buildSkills(spec: CandidateSeedSpec, rng: () => number): CandidateSkill[] {
  const pool = SKILLS_BY_FAMILY[spec.familyId] ?? [];
  if (pool.length === 0) return [];

  const [countMin, countMax] = SKILL_COUNT_RANGE[spec.rankHint];
  const count = clamp(randInt(countMin, countMax, rng), 1, pool.length);
  // Subconjunto propio en orden propio: cada candidato de la familia declara
  // una selección distinta de habilidades, no las mismas N en el mismo orden.
  const codes = pickMany(pool, count, rng);

  const [declMin, declMax] = DECLARED_ONLY_RANGE[spec.rankHint];
  const declaredOnly = clamp(randInt(declMin, declMax, rng), 0, count - 1); // al menos 1 evaluada
  const evaluatedCount = count - declaredOnly;

  const [verMin, verMax] = VERIFIED_RANGE[spec.rankHint];
  const verifiedCount = clamp(randInt(verMin, verMax, rng), 0, evaluatedCount);

  let fallbackIndex = 0;
  return codes.map((code, idx) => {
    const skillDef = SKILLS.find((s) => s.code === code);
    const evaluated = idx < evaluatedCount;
    const verified = idx < verifiedCount;
    const score = evaluated ? clamp(randInt(55, 95, rng)) : null;
    let evidenceSummary = "Declarado por el candidato, sin evidencia adicional todavía.";
    if (evaluated) {
      const specific = EVIDENCE_SUMMARIES[code];
      if (specific) {
        evidenceSummary = specific;
      } else {
        // Ciclo (no rng) entre variantes para garantizar que dos skills sin
        // frase propia y contiguas en la lista nunca muestren el mismo texto.
        evidenceSummary = GENERIC_EVIDENCE_FALLBACKS[fallbackIndex % GENERIC_EVIDENCE_FALLBACKS.length]!;
        fallbackIndex += 1;
      }
    }
    return {
      skill_code: code,
      skill_name: skillDef?.name ?? code,
      is_declared: true,
      is_evaluated: evaluated,
      is_verified: verified,
      evaluated_score: score,
      confidence: evaluated ? Math.round((0.6 + rng() * 0.35) * 100) / 100 : null,
      evidence_summary: evidenceSummary,
    };
  });
}

/** Rango de rubric_level por `rankHint`: separa de verdad al mejor y al peor candidato de la familia. */
const RUBRIC_LEVEL_RANGE: Record<CandidateSeedSpec["rankHint"], [number, number]> = {
  1: [3, 4],
  2: [2, 4],
  3: [2, 3],
  4: [1, 3],
  5: [1, 2],
};

function buildEvaluations(spec: CandidateSeedSpec, rng: () => number): CompetencyEvaluation[] {
  const competencies = COMPETENCIES_BY_FAMILY[spec.familyId] ?? [];
  const [levelMin, levelMax] = RUBRIC_LEVEL_RANGE[spec.rankHint];
  return competencies.map((cmp, idx) => {
    const rubric_level = clamp(randInt(levelMin, levelMax, rng), 0, 4) as 0 | 1 | 2 | 3 | 4;
    const isGood = rubric_level >= 3;
    const phrase = PHRASES[cmp.code] ?? { good: "Evidencia consistente en la entrevista.", weak: "Evidencia limitada en la entrevista.", limitation: "Se recomienda profundizar en una siguiente conversación." };
    const score = clamp(rubric_level * 20 + randInt(0, 15, rng));
    return {
      competency_code: cmp.code,
      competency_name: cmp.name,
      type: cmp.type,
      score,
      rubric_level,
      confidence: Math.round((0.55 + rng() * 0.35) * 100) / 100,
      justification: isGood ? phrase.good : phrase.weak,
      evidence_turn_ids: [`t${idx + 1}`],
      limitations: isGood ? null : phrase.limitation,
      rubric_source: cmp.is_core ? "SPECIFIC" : "PROVISIONAL",
    };
  });
}

function overallLabelFor(score: number): string {
  return score >= 75 ? "Evidencia sólida" : "Evidencia en desarrollo";
}

function buildTalentProfile(spec: CandidateSeedSpec, evaluations: CompetencyEvaluation[], skills: CandidateSkill[]): TalentProfile {
  const overall_score = clamp(Math.round(evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length));
  const strengths = [...evaluations]
    .filter((e) => e.score >= 75)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((e) => formatStrengthLine(e.competency_name, e.score));
  const evidence_gaps = evaluations
    .filter((e) => e.rubric_level < 3)
    .map((e) => `${e.competency_name}: ${e.limitations ?? "requiere más evidencia"}`);
  return {
    id: `tp_${spec.anonSuffix}`,
    version: 1,
    generated_at: new Date().toISOString(),
    overall_score,
    overall_label: overallLabelFor(overall_score),
    top_skills: skills.filter((s) => s.is_evaluated).slice(0, 5),
    evaluations,
    strengths: strengths.length > 0 ? strengths : ["Consistencia en las respuestas de la entrevista"],
    evidence_gaps,
    summary_text: `${spec.fullName.split(" ")[0]} muestra ${overall_score >= 75 ? "evidencia sólida" : "evidencia en desarrollo"} para el rol, con ${spec.yearsExperience} años de experiencia relacionada y respuestas consistentes en la entrevista conversacional.`,
  };
}

function buildFeedback(spec: CandidateSeedSpec, talentProfile: TalentProfile): FeedbackReport {
  return {
    candidate_note: `Tu desempeño muestra ${talentProfile.overall_label.toLowerCase()}. Fortalezas: ${talentProfile.strengths.join(", ")}. Sigue reforzando las áreas con evidencia limitada para mejorar tu perfil.`,
    company_note: `${spec.fullName.split(" ")[0]} presenta ${talentProfile.overall_label.toLowerCase()} para ${spec.position.toLowerCase()}, con ${spec.yearsExperience} años de experiencia afín.`,
    generated_at: new Date().toISOString(),
  };
}

function buildLearningPath(evaluations: CompetencyEvaluation[]): LearningPath {
  const gaps: LearningGap[] = evaluations
    .filter((e) => e.rubric_level < 3)
    .map((e) => ({
      competency_code: e.competency_code,
      competency_name: e.competency_name,
      current_level: e.rubric_level,
      target_level: 3,
      why_it_matters: `Reforzar ${e.competency_name.toLowerCase()} mejora tu evidencia frente a otras vacantes similares.`,
      recommendations: recommendationsFor(e.competency_code),
    }));
  return { gaps };
}

function buildDocuments(spec: CandidateSeedSpec): DocumentRef[] {
  return [
    {
      id: `doc_${spec.anonSuffix}_cv`,
      type: "CV",
      original_filename: `cv-${spec.fullName.toLowerCase().replace(/\s+/g, "-")}.pdf`,
      mime_type: "application/pdf",
      size_bytes: 182_000,
      status: "PARSED",
      uploaded_at: new Date().toISOString(),
      url: "/demo/cv-ejemplo.pdf",
    },
  ];
}

let seedIndex = 0;

export function buildSeedCandidates(): SeedCandidate[] {
  seedIndex = 0;
  return SPECS.map((spec) => {
    seedIndex += 1;
    const rng = mulberry32(1000 + seedIndex * 37);
    const skills = buildSkills(spec, rng);
    const evaluations = buildEvaluations(spec, rng);
    const talentProfile = buildTalentProfile(spec, evaluations, skills);
    const profile: CandidateProfile = {
      id: `cand_${spec.anonSuffix}`,
      user_id: `user_${spec.anonSuffix}`,
      full_name: spec.fullName,
      phone: spec.phone,
      photo_url: null,
      birth_date: `${spec.birthYear}-05-14`,
      gender: spec.gender,
      job_family_id: spec.familyId,
      location: { city: spec.city, state: cityState(spec.city) },
      availability: spec.availability,
      salary_expectation_min: spec.salaryMin,
      salary_expectation_max: spec.salaryMax,
      education: buildEducation(spec),
      experience: buildExperience(spec, rng),
      bio: null,
      status: "EVALUATED",
      anon_code: `CND-${spec.anonSuffix}`,
      completion_percent: 100,
    };
    return {
      profile,
      skills,
      evaluations,
      talentProfile,
      feedback: buildFeedback(spec, talentProfile),
      learningPath: buildLearningPath(evaluations),
      documents: buildDocuments(spec),
    };
  });
}

function cityState(city: string): string {
  const map: Record<string, string> = {
    "León": "Guanajuato",
    "Guadalajara": "Jalisco",
    "Ciudad de México": "Ciudad de México",
    "Monterrey": "Nuevo León",
    "Querétaro": "Querétaro",
    "Puebla": "Puebla",
    "Irapuato": "Guanajuato",
    "Celaya": "Guanajuato",
    "Silao": "Guanajuato",
    "Aguascalientes": "Aguascalientes",
    "Toluca": "Estado de México",
    "San Luis Potosí": "San Luis Potosí",
    "Guanajuato": "Guanajuato",
    "Salamanca": "Guanajuato",
    "Pachuca": "Hidalgo",
  };
  return map[city] ?? "Guanajuato";
}

/** anon_code de María (WAREHOUSE_SUPERVISOR) usada por seed/users.ts para vincular maria@demo.mx. */
export const MARIA_ANON_SUFFIX = "4F82";
