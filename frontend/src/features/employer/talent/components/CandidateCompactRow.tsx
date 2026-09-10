import { Bookmark, CheckSquare, MapPin, Square } from "lucide-react";
import { motion } from "motion/react";
import type { AnonymousCandidateCard } from "@/api/types";
import { Badge, Button, Card, ProgressBar, SkillChip } from "@/components/ui";
import { useReducedMotion } from "@/lib/a11y";
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
  /** Posición dentro de la lista visible: escalona la carga de la barra. */
  index?: number;
  onToggleCompare: () => void;
  onView: () => void;
  onShortlist: () => void;
}

const ICON_BUTTON_CLASS =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-text-on-dark-tertiary transition-colors duration-fast ease-standard hover:bg-white/10 hover:text-primary-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2";

/** Fila del ranking (posiciones 4+ de E8), en vidrio sobre el lienzo. */
export function CandidateCompactRow({
  card,
  selected,
  shortlisted,
  index = 0,
  onToggleCompare,
  onView,
  onShortlist,
}: CandidateCompactRowProps) {
  const reduced = useReducedMotion();

  return (
    <Card variant="glass" spotlight selected={selected} padding="md">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3 lg:min-w-[16rem]">
          <button
            type="button"
            aria-pressed={selected}
            aria-label={
              selected
                ? `Quitar ${anonDisplayCode(card.anon_code)} de la comparación`
                : `Agregar ${anonDisplayCode(card.anon_code)} a la comparación`
            }
            onClick={onToggleCompare}
            className={ICON_BUTTON_CLASS}
          >
            {selected ? (
              <CheckSquare className="size-5 text-primary-on-dark" aria-hidden="true" />
            ) : (
              <Square className="size-5" aria-hidden="true" />
            )}
          </button>

          <span
            aria-hidden="true"
            className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-md border border-border-glass bg-white/[0.06] text-sm font-semibold tabular-nums text-text-on-dark"
          >
            {card.rank_position}
          </span>

          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold tracking-[-0.01em] text-text-on-dark">
                {anonDisplayCode(card.anon_code)}
              </span>
              {card.is_unlocked && <Badge tone="success">Identidad desbloqueada</Badge>}
            </p>
            <p className="truncate text-sm text-text-on-dark-secondary">
              {jobFamilyLabels[card.job_family_code]}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-on-dark-tertiary">
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                {geoBandLabels[card.geo_band]}
              </span>
              <span>{availabilityLabels[card.availability]}</span>
              <span>{experienceLabel(card.years_experience)}</span>
            </p>
          </div>
        </div>

        <div className="hidden min-w-0 max-w-[200px] flex-wrap gap-1.5 2xl:flex">
          {card.skills.slice(0, 3).map((skill) => (
            <SkillChip key={skill.skill_code} name={skill.skill_name} />
          ))}
          {card.skills.length > 3 && (
            <span className="self-center text-xs text-text-on-dark-tertiary">
              +{card.skills.length - 3}
            </span>
          )}
        </div>

        <div className="w-full shrink-0 lg:w-44">
          <ProgressBar
            value={card.total_score}
            label="Compatibilidad"
            showValue
            size="sm"
            delay={index * 90}
          />
          <p className="mt-1.5 text-xs text-text-on-dark-tertiary">{card.score_label}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
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
            className={ICON_BUTTON_CLASS}
          >
            <Bookmark
              className={shortlisted ? "size-5 text-primary-on-dark" : "size-5"}
              fill={shortlisted ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </motion.button>
        </div>

        <span className="sr-only">{candidateSummaryText(card)}</span>
      </div>
    </Card>
  );
}
