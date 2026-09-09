import { motion } from "motion/react";
import type { AnonymousCandidateCard } from "@/api/types";
import { Badge, CandidateAnonymousCard, ProgressRing } from "@/components/ui";
import { useCountUp, useMotionSafe } from "@/lib/motion";
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
 * del design system y le antepone la posición y el anillo de compatibilidad.
 * La secuencia de motion es: entrada de la card → count-up del score → anillo.
 */
export function FeaturedCandidateCard({
  card,
  selected,
  shortlisted,
  onToggleCompare,
  onView,
  onShortlist,
}: FeaturedCandidateCardProps) {
  const motionSafe = useMotionSafe();
  const score = Math.round(useCountUp(card.total_score, 900));

  return (
    <motion.div variants={motionSafe.cardEntrance} className="flex flex-col gap-3">
      <div className="flex items-center gap-3 px-1">
        <ProgressRing value={card.total_score} size={76} stroke={8} />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-text-tertiary">
            Posición #{card.rank_position} del ranking
          </p>
          <p className="text-sm font-medium text-text-primary">{card.score_label}</p>
          {card.is_unlocked && (
            <Badge tone="success" className="mt-1">
              Identidad desbloqueada
            </Badge>
          )}
        </div>
      </div>

      <CandidateAnonymousCard
        anonCode={anonDisplayCode(card.anon_code)}
        familyName={jobFamilyLabels[card.job_family_code]}
        geoLabel={geoBandLabels[card.geo_band]}
        availabilityLabel={availabilityLabels[card.availability]}
        yearsExperience={card.years_experience}
        score={score}
        scoreLabel={card.score_label}
        skills={card.skills.slice(0, 5).map((skill) => ({ name: skill.skill_name }))}
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
    </motion.div>
  );
}
