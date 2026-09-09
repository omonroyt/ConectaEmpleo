import { z } from "zod";

/** Validación de "Nueva vacante" (E4). Los campos numéricos llegan como string desde los inputs. */
export const vacancyFormSchema = z
  .object({
    title: z.string().min(3, "Escribe un título para la vacante."),
    job_family_id: z.string().min(1, "Elige una familia de puesto."),
    work_mode: z.enum(["ONSITE", "HYBRID", "REMOTE"], { message: "Elige una modalidad." }),
    city: z.string().min(1, "Escribe la ciudad."),
    state: z.string().min(1, "Escribe el estado."),
    salary_min: z
      .string()
      .refine((v) => v.trim() === "" || (!Number.isNaN(Number(v)) && Number(v) > 0), "Escribe un salario válido."),
    salary_max: z
      .string()
      .refine((v) => v.trim() === "" || (!Number.isNaN(Number(v)) && Number(v) > 0), "Escribe un salario válido."),
    description: z.string().min(10, "Describe el reto en al menos unas palabras."),
    positions_count: z.number().int().min(1, "Debe haber al menos 1 posición."),
  })
  .refine(
    (data) => {
      if (data.salary_min.trim() === "" || data.salary_max.trim() === "") return true;
      return Number(data.salary_min) <= Number(data.salary_max);
    },
    { message: "El salario mínimo no puede ser mayor al máximo.", path: ["salary_max"] },
  );

export type VacancyFormValues = z.infer<typeof vacancyFormSchema>;

export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}
