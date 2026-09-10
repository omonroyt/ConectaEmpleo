import type { AnonymousCandidateCard } from "@/api/types";
import { Badge, CandidateAnonymousCard, Eyebrow, Reveal } from "@/components/ui";
import {
  anonDisplayCode,
  availabilityLabels,
  candidateSummaryText,
  geoBandLabels,
  jobFamilyLabels,
} from "../talentLabels";

export interface FeaturedCandidateCardProps {
  /** Solo datos anónimos: nunca nombre, foto, edad ni género. */
  card: AnonymousCandidateCard;
  selected: boolean;
  shortlisted: boolean;
  onToggleCompare: () => void;
  onView: () => void;
  onShortlist: () => void;
}

/**
 * Destacado del ranking (posiciones 1-3 de E8). Envuelve `CandidateAnonymousCard`
 * del design system y le antepone una placa con la posición y la etiqueta
 * textual del score. El porcentaje lo anima la propia card (su `ScoreBadge`
 * carga de 0 al valor al entrar en pantalla), así que aquí no se repite.
 */
export function FeaturedCandidateCard({
  card,
  selected,
  shortlisted,
  onToggleCompare,
  onView,
  onShortlist,
}: FeaturedCandidateCardProps) {
  return (
    <Reveal className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3 px-1">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-md border border-border-glass bg-white/[0.06] text-base font-semibold tabular-nums text-text-on-dark"
        >
          {card.rank_position}
        </span>
        <div className="min-w-0">
          <Eyebrow>Posición en el ranking</Eyebrow>
          <p className="mt-1 truncate text-sm font-medium text-text-on-dark">{card.score_label}</p>
        </div>
        {card.is_unlocked && <Badge tone="success">Identidad desbloqueada</Badge>}
      </div>

      <CandidateAnonymousCard
        anonCode={anonDisplayCode(card.anon_code)}
        familyName={jobFamilyLabels[card.job_family_code]}
        geoLabel={geoBandLabels[card.geo_band]}
        availabilityLabel={availabilityLabels[card.availability]}
        yearsExperience={card.years_experience}
        score={card.total_score}
        scoreLabel={card.score_label}
        skills={card.skills.map((skill) => ({ name: skill.skill_name }))}
        evidence={card.evidence_counts}
        selected={selected}
        shortlisted={shortlisted}
        unlocked={card.is_unlocked}
        onToggleCompare={onToggleCompare}
        onView={onView}
        onShortlist={onShortlist}
        className="h-full"
      />

      <span className="sr-only">{candidateSummaryText(card)}</span>
    </Reveal>
  );
}
