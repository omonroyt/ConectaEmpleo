import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type EyebrowTone = "light" | "dark" | "accent";

export interface EyebrowProps {
  children: ReactNode;
  /** `dark` = sobre el lienzo oscuro · `light` = sobre panel claro. */
  tone?: EyebrowTone;
  className?: string;
}

const toneClasses: Record<EyebrowTone, string> = {
  dark: "text-text-on-dark-tertiary",
  light: "text-text-tertiary",
  accent: "text-primary-on-dark",
};

/**
 * Etiqueta de sección en versalitas espaciadas ("PERFIL VERIFICADO"), el
 * antetítulo que precede a un display en la dirección visual R1. Es
 * decorativa respecto a la jerarquía: el encabezado real sigue siendo el
 * `<h1>`/`<h2>` que va debajo.
 */
export function Eyebrow({ children, tone = "dark", className }: EyebrowProps) {
  return (
    <p
      className={cn(
        "text-[0.6875rem] font-semibold uppercase leading-none tracking-[0.18em]",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </p>
  );
}
