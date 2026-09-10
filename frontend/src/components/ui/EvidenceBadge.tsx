import { Check, Clock } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import {
  evidenceDescriptions,
  evidenceLabels,
  type EvidenceLevel,
} from "@/components/ui/evidence";
import { cn } from "@/lib/cn";

export type { EvidenceLevel } from "@/components/ui/evidence";

export interface EvidenceBadgeProps {
  level: EvidenceLevel;
  size?: "sm" | "md";
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
}

const levelClassesLight: Record<EvidenceLevel, string> = {
  declared: "bg-surface-soft text-text-secondary",
  evaluated: "bg-primary/10 text-primary",
  verified: "bg-primary text-white",
  partial: "bg-warning-soft text-warning",
  pending: "bg-surface-soft text-text-tertiary",
};

const levelClassesDark: Record<EvidenceLevel, string> = {
  declared: "bg-white/[0.08] text-text-on-dark-secondary",
  evaluated: "bg-primary/20 text-primary-on-dark",
  verified: "bg-primary text-white",
  partial: "bg-warning/15 text-warning-on-dark",
  pending: "bg-white/[0.06] text-text-on-dark-tertiary",
};

/** Insignia de nivel de evidencia, con tooltip explicativo (desktop) siempre presente. */
export function EvidenceBadge({ level, size = "md", tone, className }: EvidenceBadgeProps) {
  const resolved = useSurfaceTone(tone);
  const levelClasses = resolved === "dark" ? levelClassesDark : levelClassesLight;
  const iconSize = size === "sm" ? "size-3" : "size-3.5";
  return (
    <Tooltip content={evidenceDescriptions[level]}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-pill font-medium",
          size === "sm" ? "h-6 px-2 text-xs" : "h-7 px-2.5 text-sm",
          levelClasses[level],
          className,
        )}
      >
        {level === "verified" && <Check className={iconSize} aria-hidden="true" />}
        {level === "pending" && <Clock className={iconSize} aria-hidden="true" />}
        {evidenceLabels[level]}
      </span>
    </Tooltip>
  );
}
