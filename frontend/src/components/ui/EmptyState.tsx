import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  cta?: { label: string; onClick: () => void };
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  cta,
  tone,
  className,
  children,
}: EmptyStateProps) {
  const resolved = useSurfaceTone(tone);
  const isDark = resolved === "dark";

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg p-10 text-center",
        isDark ? "glass" : "border border-dashed border-border bg-surface-soft/60",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-12 items-center justify-center rounded-full",
          isDark
            ? "bg-gradient-to-br from-primary/25 via-primary-2/15 to-accent/20 text-primary-on-dark"
            : "bg-surface text-text-tertiary",
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3
        className={cn(
          "text-balance text-base font-semibold",
          isDark ? "text-text-on-dark" : "text-text-primary",
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={cn(
            "max-w-sm text-pretty text-sm",
            isDark ? "text-text-on-dark-secondary" : "text-text-secondary",
          )}
        >
          {description}
        </p>
      )}
      {cta && (
        <Button variant="secondary" size="md" onClick={cta.onClick} className="mt-2">
          {cta.label}
        </Button>
      )}
      {children}
    </div>
  );
}
