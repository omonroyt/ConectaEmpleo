import type { HTMLAttributes, ReactNode } from "react";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface LightSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

/**
 * Panel claro que se apoya sobre el lienzo oscuro, superpuesto al hero por
 * margen negativo.
 *
 * Sobre el lienzo oscuro ya no puede ser una banda blanca a sangre: se
 * redondea por completo, deja aire lateral y cae con `shadow-panel` para
 * leerse como una hoja apoyada encima y no como un corte del fondo.
 * Declara `tone="light"` para todo su contenido.
 */
export function LightSurface({ children, className, ...rest }: LightSurfaceProps) {
  return (
    <Surface tone="light">
      <div
        className={cn(
          "relative z-10 -mt-10 rounded-2xl bg-surface pb-12 pt-8 text-text-primary shadow-panel sm:-mt-12",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    </Surface>
  );
}
