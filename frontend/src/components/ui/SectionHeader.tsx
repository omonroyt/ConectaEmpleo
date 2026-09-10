import type { ReactNode } from "react";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
}

export function SectionHeader({ title, description, actions, tone, className }: SectionHeaderProps) {
  const resolved = useSurfaceTone(tone);
  const isDark = resolved === "dark";

  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div>
        <h2
          className={cn(
            "text-balance text-xl font-semibold",
            isDark ? "text-text-on-dark" : "text-text-primary",
          )}
        >
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              "mt-1 text-pretty text-sm",
              isDark ? "text-text-on-dark-secondary" : "text-text-secondary",
            )}
          >
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
