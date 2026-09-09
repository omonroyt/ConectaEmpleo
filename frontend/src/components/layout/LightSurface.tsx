import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface LightSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

/**
 * Panel claro con radio superior (28-36px) que se superpone a un hero oscuro
 * mediante margen negativo. Usar debajo de un bloque `BrandBackground`/hero.
 */
export function LightSurface({ children, className, ...rest }: LightSurfaceProps) {
  return (
    <div
      className={cn(
        "relative z-10 -mt-8 rounded-t-2xl bg-surface pb-16 pt-8 sm:-mt-9",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
