import type { AnonymousCandidateCard } from "@/api/types";
import { Badge, Button, Eyebrow, ScoreBadge } from "@/components/ui";
import { anonDisplayCode, jobFamilyLabels } from "../talentLabels";
import { cn } from "@/lib/cn";

export interface CompareColumnProps {
  /** Solo datos anónimos: nunca nombre, foto, edad ni género. */
  card: AnonymousCandidateCard;
  shortlisted: boolean;
  onView: () => void;
  onShortlist: () => void;
  className?: string;
}

/**
 * Cabecera de una columna del comparador (E10): identidad anónima, score con
 * etiqueta textual y acciones. Se usa tal cual en la tabla de escritorio y
 * dentro de una tarjeta de vidrio en la composición apilada de móvil.
 */
export function CompareColumn({
  card,
  shortlisted,
  onView,
  onShortlist,
  className,
}: CompareColumnProps) {
  return (
    <div className={cn("flex h-full flex-col gap-3", className)}>
      <div className="min-w-0">
        <Eyebrow>Perfil anónimo</Eyebrow>
        <p className="mt-1.5 truncate text-sm font-semibold tracking-[-0.01em] text-text-on-dark">
          {anonDisplayCode(card.anon_code)}
        </p>
        <p className="truncate text-xs text-text-on-dark-secondary">
          {jobFamilyLabels[card.job_family_code]}
        </p>
      </div>

      <ScoreBadge score={card.total_score} label={card.score_label} size="sm" className="self-start" />

      {card.is_unlocked && <Badge tone="success">Identidad desbloqueada</Badge>}

      <div className="mt-auto flex flex-col gap-2 pt-1">
        <Button variant="secondary" size="md" onClick={onView}>
          Ver perfil anónimo
        </Button>
        <Button variant={shortlisted ? "primary" : "ghost"} size="md" onClick={onShortlist}>
          {shortlisted ? "En selección" : "Agregar a selección"}
        </Button>
      </div>
    </div>
  );
}
