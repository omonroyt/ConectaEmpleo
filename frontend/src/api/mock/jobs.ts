import type { Job, JobType } from "@/api/types";
import { getDB, mutate } from "./state";
import { genId } from "./util";

/**
 * Cola de jobs simulada: crea un Job en estado QUEUED/RUNNING que avanza su
 * `progress` en 3-4 pasos (~4 s totales) y termina DONE (o FAILED si `run` lanza).
 * `onDone` recibe el job ya completado para que el motor llamador guarde `result_ref`.
 */
export function enqueueJob(type: JobType, run: () => string | Promise<string>): string {
  const id = genId("job");
  mutate((db) => {
    db.jobs[id] = { id, type, status: "QUEUED", progress: 0, result_ref: null, error: null };
  });

  const steps = 4;
  let step = 0;

  const tick = () => {
    step += 1;
    mutate((db) => {
      const job = db.jobs[id];
      if (!job) return;
      // Reemplaza el objeto (no lo muta in-place): `useJob` hace polling con
      // TanStack Query, que decide si debe re-renderizar comparando la
      // referencia/estructura de `data`. Mutar el mismo objeto en su lugar
      // deja `data` referencialmente igual entre refetches y la UI nunca
      // se actualiza (se queda "atascada" mostrando el primer estado, con o
      // sin la pestaña en foco) aunque el job internamente sí avance.
      db.jobs[id] = { ...job, status: "RUNNING", progress: Math.min(100, Math.round((step / steps) * 100)) };
    });

    if (step >= steps) {
      Promise.resolve()
        .then(run)
        .then((resultRef) => {
          mutate((db) => {
            const job = db.jobs[id];
            if (!job) return;
            db.jobs[id] = { ...job, status: "DONE", progress: 100, result_ref: resultRef };
          });
        })
        .catch((error: unknown) => {
          mutate((db) => {
            const job = db.jobs[id];
            if (!job) return;
            db.jobs[id] = {
              ...job,
              status: "FAILED",
              error: error instanceof Error ? error.message : "Error inesperado",
            };
          });
        });
      return;
    }
    setTimeout(tick, 900 + Math.random() * 300);
  };

  setTimeout(tick, 900 + Math.random() * 300);
  return id;
}

export function getJob(id: string): Job | null {
  const job = getDB().jobs[id];
  // Copia defensiva: aunque `tick()` ya no mute in-place, devolver una copia
  // aquí evita que este mismo bug reaparezca si algo más llega a mutar el
  // objeto guardado directamente.
  return job ? { ...job } : null;
}
