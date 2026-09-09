export type CvBuilderField =
  | "last_job"
  | "activities"
  | "tools"
  | "previous_jobs"
  | "education"
  | "certifications"
  | "logistics"
  | "salary";

export interface CvBuilderTurnSpec {
  index: number; // 0-based, turno 1..8 = index+1
  field: CvBuilderField;
  prompt: string;
  /** Repregunta de Sofía si la respuesta tiene menos de 6 palabras. */
  followUp: string;
}

/** Guion de 8 turnos de "Sofía", lenguaje llano, usado por cvBuilder.createSession/sendMessage. */
export const CV_BUILDER_SCRIPT: CvBuilderTurnSpec[] = [
  {
    index: 0,
    field: "last_job",
    prompt:
      "Hola, soy Sofía y te ayudo a armar tu CV hablando, sin formularios. Para empezar, ¿cuál fue tu último trabajo y qué puesto tenías?",
    followUp: "Cuéntame un poco más: ¿en qué empresa fue y cuánto tiempo estuviste ahí?",
  },
  {
    index: 1,
    field: "activities",
    prompt: "¿Qué actividades hacías en el día a día en ese puesto?",
    followUp: "¿Me das un ejemplo concreto de una tarea que hacías seguido?",
  },
  {
    index: 2,
    field: "tools",
    prompt: "¿Qué herramientas, máquinas o programas usabas para hacer tu trabajo?",
    followUp: "¿Alguna otra herramienta o sistema que también usaras?",
  },
  {
    index: 3,
    field: "previous_jobs",
    prompt: "Antes de ese trabajo, ¿en qué otro lugar trabajaste y qué hacías?",
    followUp: "¿Recuerdas cuánto tiempo trabajaste ahí?",
  },
  {
    index: 4,
    field: "education",
    prompt: "¿Cuál es el último grado de estudios que terminaste y dónde?",
    followUp: "¿En qué año lo terminaste, más o menos?",
  },
  {
    index: 5,
    field: "certifications",
    prompt: "¿Tienes alguna certificación o curso que hayas tomado?",
    followUp: "¿Quién te lo dio o dónde lo tomaste?",
  },
  {
    index: 6,
    field: "logistics",
    prompt: "¿En qué ciudad vives y en cuánto tiempo podrías empezar a trabajar?",
    followUp: "¿Podrías decirme la ciudad, el estado y desde cuándo estás disponible?",
  },
  {
    index: 7,
    field: "salary",
    prompt: "Por último, ¿cuánto esperas ganar al mes, aproximadamente?",
    followUp: "Dame un rango aproximado, ¿entre cuánto y cuánto al mes?",
  },
];

export const CV_BUILDER_CLOSING =
  "Listo, con esto armé un primer borrador de tu CV. Vamos a revisarlo juntos en la siguiente pantalla.";
