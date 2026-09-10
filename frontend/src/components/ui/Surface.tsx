import { createContext, useContext, type ReactNode } from "react";

/**
 * Tono de la superficie sobre la que se está pintando.
 *  - `dark`  — lienzo de la app, `Card variant="glass"|"dark"`.
 *  - `light` — `Card variant="light"|"soft"`, paneles claros.
 */
export type SurfaceTone = "light" | "dark";

const SurfaceToneContext = createContext<SurfaceTone>("dark");

export interface SurfaceProps {
  tone: SurfaceTone;
  children: ReactNode;
}

/**
 * Declara el tono de un subárbol. Todo control de formulario (`Input`,
 * `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Stepper`,
 * `FormField`) y varios componentes de datos lo leen para elegir su paleta,
 * en vez de recibir `tone` uno por uno en cada pantalla.
 *
 * `Card` ya lo declara según su `variant`, así que casi nunca hay que usar
 * `<Surface>` a mano: solo cuando se pinta un bloque claro/oscuro sin `Card`.
 */
export function Surface({ tone, children }: SurfaceProps) {
  return <SurfaceToneContext.Provider value={tone}>{children}</SurfaceToneContext.Provider>;
}

/** Tono heredado del panel contenedor; `override` gana si viene definido. */
export function useSurfaceTone(override?: SurfaceTone): SurfaceTone {
  const inherited = useContext(SurfaceToneContext);
  return override ?? inherited;
}
