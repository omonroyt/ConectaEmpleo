import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import type { EvidenceLevel } from "@/components/ui/evidence";
import { cn } from "@/lib/cn";

export interface SkillChipProps {
  name: string;
  level?: string;
  evidence?: EvidenceLevel;
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
}

/** Chip de habilidad: nombre + nivel textual + `EvidenceBadge` compacto opcional. */
export function SkillChip({ name, level, evidence, tone, className }: SkillChipProps) {
  const resolved = useSurfaceTone(tone);
  const isDark = resolved === "dark";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border px-3 py-1.5 text-sm",
        isDark
          ? "border-border-glass bg-white/[0.05] text-text-on-dark"
          : "border-border bg-surface text-text-primary",
        className,
      )}
    >
      <span className="font-medium">{name}</span>
      {level && (
        <span className={isDark ? "text-text-on-dark-tertiary" : "text-text-tertiary"}>· {level}</span>
      )}
      {evidence && <EvidenceBadge level={evidence} size="sm" tone={resolved} />}
    </span>
  );
}
