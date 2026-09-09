import { z } from "zod";

/** Validación del onboarding de empresa (E1), un esquema por paso. */

export const identitySchema = z.object({
  trade_name: z.string().min(1, "Escribe el nombre comercial."),
  legal_name: z.string().min(1, "Escribe la razón social."),
  industry: z.string().min(1, "Elige una industria."),
  size: z.enum(["1-10", "11-50", "51-200", "200+"], { message: "Elige el tamaño de tu empresa." }),
});

export const locationSchema = z.object({
  city: z.string().min(1, "Escribe la ciudad."),
  state: z.string().min(1, "Escribe el estado."),
  work_mode: z.enum(["ONSITE", "HYBRID", "REMOTE"], { message: "Elige una modalidad." }),
});

export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}
