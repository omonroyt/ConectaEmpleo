import type { QuestionIntent } from "@/api/types";
import { JOB_FAMILY_IDS } from "./catalog";

export interface BankQuestion {
  id: string;
  job_family_id: string;
  competency_code: string;
  intent: QuestionIntent;
  /** Puede contener el placeholder {{prev_excerpt}} para preguntas PROBE. */
  text: string;
  is_probe: boolean;
  order: number;
}

function q(
  jobFamilyId: string,
  competencyCode: string,
  intent: QuestionIntent,
  text: string,
  order: number,
  isProbe = false,
): BankQuestion {
  return {
    id: `q_${jobFamilyId.replace("jf_", "")}_${order}`,
    job_family_id: jobFamilyId,
    competency_code: competencyCode,
    intent,
    text,
    is_probe: isProbe,
    order,
  };
}

const ADMIN = JOB_FAMILY_IDS.ADMIN_ASSISTANT;
const HEAVY = JOB_FAMILY_IDS.HEAVY_MACHINERY_OPERATOR;
const WAREHOUSE = JOB_FAMILY_IDS.WAREHOUSE_SUPERVISOR;

export const INTERVIEW_BANK: Record<string, BankQuestion[]> = {
  [ADMIN]: [
    q(ADMIN, "OFFICE_TOOLS", "SCENARIO", "Cuéntame de una tarea reciente donde usaste Excel o Word para resolver algo del trabajo.", 1),
    q(ADMIN, "DOCUMENT_CONTROL", "SCENARIO", "¿Cómo organizas los documentos o expedientes para encontrarlos rápido cuando alguien los pide?", 2),
    q(ADMIN, "CUSTOMER_SERVICE", "SCENARIO", "Describe una vez que atendiste a un cliente o proveedor molesto. ¿Qué hiciste?", 3),
    q(ADMIN, "ORGANIZATION_PRIORITIZATION", "SCENARIO", "Cuando tienes varias tareas urgentes al mismo tiempo, ¿cómo decides por cuál empezar?", 4),
    q(ADMIN, "ORGANIZATION_PRIORITIZATION", "PROBE", "Mencionaste que {{prev_excerpt}}; cuéntame un caso donde esa forma de priorizar no funcionó, ¿qué ajustaste?", 5, true),
    q(ADMIN, "SCHEDULING_COORDINATION", "SCENARIO", "¿Cómo coordinas una reunión cuando varias personas tienen agendas distintas?", 6),
    q(ADMIN, "WRITTEN_COMMUNICATION", "CLARIFY", "Cuando escribes un correo importante, ¿qué revisas antes de enviarlo?", 7),
  ],
  [HEAVY]: [
    q(HEAVY, "MACHINERY_OPERATION", "SCENARIO", "Cuéntame qué maquinaria has operado y en qué tipo de terreno o proyecto.", 1),
    q(HEAVY, "SAFETY_PROTOCOLS", "SCENARIO", "Antes de subir a la máquina, ¿qué revisas para asegurarte de que es seguro operar?", 2),
    q(HEAVY, "LOAD_HANDLING", "SCENARIO", "Describe una vez que moviste una carga pesada o difícil. ¿Cómo calculaste el riesgo?", 3),
    q(HEAVY, "RISK_AWARENESS", "SCENARIO", "¿Has notado alguna condición insegura en la obra? ¿Qué hiciste al verla?", 4),
    q(HEAVY, "RISK_AWARENESS", "PROBE", "Dijiste que {{prev_excerpt}}; cuéntame qué pasó después de reportarlo, ¿cambió algo?", 5, true),
    q(HEAVY, "PREVENTIVE_MAINTENANCE", "SCENARIO", "¿Qué revisiones de mantenimiento haces tú mismo antes de empezar el turno?", 6),
    q(HEAVY, "TEAM_COORDINATION", "CLARIFY", "¿Cómo te coordinas con el maniobrista o con otros operadores en la misma zona?", 7),
  ],
  [WAREHOUSE]: [
    q(WAREHOUSE, "INVENTORY_CONTROL", "SCENARIO", "Cuéntame cómo llevas el control de inventario en tu almacén actual o el último donde trabajaste.", 1),
    q(WAREHOUSE, "FORKLIFT_SAFETY", "SCENARIO", "¿Qué reglas de seguridad sigues siempre que operas un montacargas?", 2),
    q(WAREHOUSE, "RECEIVING_DISPATCH", "SCENARIO", "Describe cómo verificas que la mercancía que recibes coincide con el pedido.", 3),
    q(WAREHOUSE, "TEAM_COORDINATION", "SCENARIO", "¿Cómo repartes las tareas del turno entre montacarguistas y auxiliares?", 4),
    q(WAREHOUSE, "DISCREPANCY_RESOLUTION", "PROBE", "Mencionaste que {{prev_excerpt}}; cuéntame de una vez que el físico no cuadró con el sistema, ¿qué hiciste?", 5, true),
    q(WAREHOUSE, "WMS_ERP_SYSTEMS", "SCENARIO", "¿Qué sistema usas para registrar entradas y salidas de mercancía?", 6),
    q(WAREHOUSE, "PROBLEM_SOLVING", "CLARIFY", "Cuando falta o sobra mercancía, ¿cuál es tu primer paso para investigarlo?", 7),
  ],
};
