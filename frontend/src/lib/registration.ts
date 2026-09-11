/**
 * Registro abierto o por invitación.
 *
 * Mientras el jurado del hackatón evalúa la demo en producción, el frontend se
 * construye con `VITE_REGISTRATION_ENABLED=false`: los botones de alta llevan a
 * iniciar sesión con el rol elegido y `/register` redirige al login. El backend
 * lo refuerza por su lado (`REGISTRATION_ENABLED=false` responde 403), así que
 * esto es solo la cara amable del cierre.
 */
export const registrationEnabled = import.meta.env.VITE_REGISTRATION_ENABLED !== "false";

export type SignUpRole = "CANDIDATE" | "COMPANY";

/** Destino de los botones de alta: el registro si está abierto; si no, el login con el mismo rol. */
export function signUpPath(role: SignUpRole): string {
  return registrationEnabled ? `/register?role=${role}` : `/login?role=${role}`;
}
