import { Check, Clock } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
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
  className?: string;
}

const levelClasses: Record<EvidenceLevel, string> = {
  declared: "bg-surface-soft text-text-secondary",
  evaluated: "bg-primary/10 text-primary",
  verified: "bg-primary text-white",
  partial: "bg-warning-soft text-warning",
  pending: "bg-surface-soft text-text-tertiary",
};

/** Insignia de nivel de evidencia, con tooltip explicativo (desktop) siempre presente. */
export function EvidenceBadge({ level, size = "md", className }: EvidenceBadgeProps) {
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
