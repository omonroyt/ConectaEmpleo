import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
}

export function PageHeader({ eyebrow, title, subtitle, actions, tone, className }: PageHeaderProps) {
  const resolved = useSurfaceTone(tone);
  const isDark = resolved === "dark";

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        {eyebrow && <Eyebrow tone={isDark ? "dark" : "light"}>{eyebrow}</Eyebrow>}
        <h1
          className={cn(
            "mt-1 text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-4xl",
            isDark ? "text-text-on-dark" : "text-text-primary",
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={cn(
              "mt-2 max-w-2xl text-pretty text-base",
              isDark ? "text-text-on-dark-secondary" : "text-text-secondary",
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}
