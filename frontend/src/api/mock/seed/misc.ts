import type { MessageThread, Notification, Plan } from "@/api/types";

export const SEED_NOTIFICATIONS: Notification[] = [
  { id: "not_1", title: "Tu perfil de talento está listo", body: "Ya generamos tu Perfil de Talento Verificado con base en tu entrevista.", created_at: new Date(Date.now() - 3 * 3_600_000).toISOString(), read: false },
  { id: "not_2", title: "Nueva vacante compatible", body: "Encontramos una vacante de Logística del Bajío que coincide con tu perfil.", created_at: new Date(Date.now() - 26 * 3_600_000).toISOString(), read: true },
  { id: "not_3", title: "Recordatorio", body: "Te falta confirmar los datos extraídos de tu CV.", created_at: new Date(Date.now() - 50 * 3_600_000).toISOString(), read: true },
];

export const SEED_MESSAGES: MessageThread[] = [
  { id: "thr_1", counterpart: "Logística del Bajío", last_message: "Gracias por tu interés, seguimos revisando candidatos.", updated_at: new Date(Date.now() - 5 * 3_600_000).toISOString(), unread: 1 },
  { id: "thr_2", counterpart: "Soporte Conecta Empleo", last_message: "Cualquier duda sobre tu perfil, escríbenos por aquí.", updated_at: new Date(Date.now() - 72 * 3_600_000).toISOString(), unread: 0 },
];

export const SEED_PLANS: Plan[] = [
  { id: "plan_starter", name: "Starter", price_mxn: 0, features: ["1 vacante activa", "Ranking anónimo de candidatos", "Hasta 3 desbloqueos al mes"], highlighted: false },
  { id: "plan_crecimiento", name: "Crecimiento", price_mxn: 1490, features: ["5 vacantes activas", "Desbloqueos ilimitados", "Comparador de finalistas", "Soporte prioritario"], highlighted: true },
  { id: "plan_empresarial", name: "Empresarial", price_mxn: 3990, features: ["Vacantes ilimitadas", "Múltiples usuarios de empresa", "Reportes exportables", "Gerente de cuenta dedicado"], highlighted: false },
];
