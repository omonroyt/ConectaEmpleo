import type { ReactNode } from "react";
import { useSurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "info" | "success" | "warning";

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

const toneClassesLight: Record<BadgeTone, string> = {
  neutral: "bg-surface-soft text-text-secondary",
  info: "bg-primary/10 text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
};

// `tone` ya es la intención de color (éxito/aviso/...), así que el tono de
// superficie se resuelve solo, vía el contexto que declara `Card` — sin una
// segunda prop `tone` que chocaría con esta.
const toneClassesDark: Record<BadgeTone, string> = {
  neutral: "bg-white/[0.08] text-text-on-dark-secondary",
  info: "bg-primary/20 text-primary-on-dark",
  success: "bg-success/15 text-success-on-dark",
  warning: "bg-warning/15 text-warning-on-dark",
};

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  const surfaceTone = useSurfaceTone();
  const toneClasses = surfaceTone === "dark" ? toneClassesDark : toneClassesLight;

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-pill px-2.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
