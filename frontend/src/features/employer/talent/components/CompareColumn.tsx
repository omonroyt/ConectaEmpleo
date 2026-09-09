import type { AnonymousCandidateCard } from "@/api/types";
import { Avatar, Badge, Button, ScoreBadge } from "@/components/ui";
import { anonDisplayCode, jobFamilyLabels } from "../talentLabels";

export interface CompareColumnProps {
  /** Solo datos anónimos: nunca nombre, foto, edad ni género. */
  card: AnonymousCandidateCard;
  shortlisted: boolean;
  onView: () => void;
  onShortlist: () => void;
}

/**
 * Cabecera sticky de una columna del comparador (E10): identidad anónima,
 * score con etiqueta textual y acciones de la columna.
 */
export function CompareColumn({ card, shortlisted, onView, onShortlist }: CompareColumnProps) {
  return (
    <div className="flex h-full snap-start flex-col gap-3 border-l border-border bg-surface px-4 py-4">
      <div className="flex items-center gap-3">
        <Avatar anonymous seed={card.anon_code} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">
            {anonDisplayCode(card.anon_code)}
          </p>
          <p className="truncate text-xs text-text-secondary">
            {jobFamilyLabels[card.job_family_code]}
          </p>
        </div>
      </div>

      <ScoreBadge score={card.total_score} label={card.score_label} size="sm" />

      {card.is_unlocked && <Badge tone="success">Identidad desbloqueada</Badge>}

      <div className="mt-auto flex flex-col gap-2">
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
