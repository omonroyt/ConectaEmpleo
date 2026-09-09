import { z } from "zod";

/** Esquemas de validación de los formularios de autenticación (C1/C2). */

export const loginSchema = z.object({
  email: z.string().min(1, "Escribe tu correo.").email("Escribe un correo válido."),
  password: z.string().min(1, "Escribe tu contraseña."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    role: z.enum(["CANDIDATE", "COMPANY"], { message: "Elige un tipo de cuenta." }),
    email: z.string().min(1, "Escribe tu correo.").email("Escribe un correo válido."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirma tu contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

/** Convierte los errores de `zod` a un mapa `{campo: mensaje}` para mostrar bajo cada input. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}
