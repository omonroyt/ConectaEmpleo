import { Bookmark, CheckSquare, MapPin, Square } from "lucide-react";
import { motion } from "motion/react";
import type { AnonymousCandidateCard } from "@/api/types";
import { Avatar, Badge, Button, Card, SkillChip } from "@/components/ui";
import { useReducedMotion } from "@/lib/a11y";
import { useCountUp } from "@/lib/motion";
import {
  anonDisplayCode,
  availabilityLabels,
  candidateSummaryText,
  experienceLabel,
  geoBandLabels,
  jobFamilyLabels,
} from "../talentLabels";

export interface CandidateCompactRowProps {
  /** Solo datos anónimos: nunca nombre, foto, edad ni género. */
  card: AnonymousCandidateCard;
  selected: boolean;
  shortlisted: boolean;
  onToggleCompare: () => void;
  onView: () => void;
  onShortlist: () => void;
}

/** Fila compacta del ranking (posiciones 4+ de E8). */
export function CandidateCompactRow({
  card,
  selected,
  shortlisted,
  onToggleCompare,
  onView,
  onShortlist,
}: CandidateCompactRowProps) {
  const reduced = useReducedMotion();
  const score = Math.round(useCountUp(card.total_score, 900));

  return (
    <Card selected={selected} padding="md" className="flex flex-col gap-4 md:flex-row md:items-center">
      <button
        type="button"
        aria-pressed={selected}
        aria-label={
          selected
            ? `Quitar ${anonDisplayCode(card.anon_code)} de la comparación`
            : `Agregar ${anonDisplayCode(card.anon_code)} a la comparación`
        }
        onClick={onToggleCompare}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-tertiary transition-colors duration-fast ease-standard hover:bg-surface-soft hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
      >
        {selected ? (
          <CheckSquare className="size-5 text-primary" aria-hidden="true" />
        ) : (
          <Square className="size-5" aria-hidden="true" />
        )}
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar anonymous seed={card.anon_code} size="md" />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text-primary">
            <span className="tabular-nums text-text-tertiary">#{card.rank_position}</span>
            {anonDisplayCode(card.anon_code)}
            {card.is_unlocked && <Badge tone="success">Identidad desbloqueada</Badge>}
          </p>
          <p className="truncate text-sm text-text-secondary">
            {jobFamilyLabels[card.job_family_code]}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {geoBandLabels[card.geo_band]}
            </span>
            <span>{availabilityLabels[card.availability]}</span>
            <span>{experienceLabel(card.years_experience)}</span>
          </p>
        </div>
      </div>

      <div className="hidden min-w-0 max-w-[220px] flex-wrap gap-1.5 lg:flex">
        {card.skills.slice(0, 3).map((skill) => (
          <SkillChip key={skill.skill_code} name={skill.skill_name} />
        ))}
        {card.skills.length > 3 && (
          <span className="self-center text-xs text-text-tertiary">+{card.skills.length - 3}</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <div className="text-right">
          <p className="text-xl font-bold tabular-nums text-text-primary">{score} %</p>
          <p className="text-xs text-text-secondary">{card.score_label}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md" onClick={onView}>
            Ver perfil anónimo
          </Button>
          <motion.button
            type="button"
            aria-pressed={shortlisted}
            aria-label={
              shortlisted
                ? `Quitar ${anonDisplayCode(card.anon_code)} de la selección`
                : `Agregar ${anonDisplayCode(card.anon_code)} a la selección`
            }
            onClick={onShortlist}
            animate={reduced ? undefined : { scale: shortlisted ? [1, 1.25, 1] : 1 }}
            transition={{ duration: 0.28 }}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-tertiary transition-colors duration-fast ease-standard hover:bg-surface-soft hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
          >
            <Bookmark
              className={shortlisted ? "size-5 text-primary" : "size-5"}
              fill={shortlisted ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </motion.button>
        </div>
      </div>

      <span className="sr-only">{candidateSummaryText(card)}</span>
    </Card>
  );
}
