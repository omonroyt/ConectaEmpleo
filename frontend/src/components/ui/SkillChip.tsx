import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import type { EvidenceLevel } from "@/components/ui/evidence";
import { cn } from "@/lib/cn";

export interface SkillChipProps {
  name: string;
  level?: string;
  evidence?: EvidenceLevel;
  className?: string;
}

/** Chip de habilidad: nombre + nivel textual + `EvidenceBadge` compacto opcional. */
export function SkillChip({ name, level, evidence, className }: SkillChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1.5 text-sm text-text-primary",
        className,
      )}
    >
      <span className="font-medium">{name}</span>
      {level && <span className="text-text-tertiary">· {level}</span>}
      {evidence && <EvidenceBadge level={evidence} size="sm" />}
    </span>
  );
}
