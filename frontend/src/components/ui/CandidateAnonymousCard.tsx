import { Bookmark, CheckSquare, Eye, MapPin, Square } from "lucide-react";
import { Card, type CardVariant } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { SkillChip } from "@/components/ui/SkillChip";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatYearsExperience } from "@/lib/format";

/** Máximo de chips visibles antes de colapsar el resto en un "+N". */
const MAX_VISIBLE_SKILLS = 5;

export interface CandidateAnonymousSkill {
  name: string;
  level?: string;
}

export interface CandidateAnonymousEvidenceSummary {
  declared: number;
  evaluated: number;
  verified: number;
}

export interface CandidateAnonymousCardProps {
  /** Código anónimo mostrado en vez del nombre, ej. "Candidato #A47". */
  anonCode: string;
  /** Descriptor de familia de perfil, nunca el nombre real. */
  familyName: string;
  geoLabel: string;
  availabilityLabel: string;
  yearsExperience: number;
  score: number;
  scoreLabel: string;
  skills: CandidateAnonymousSkill[];
  evidence: CandidateAnonymousEvidenceSummary;
  selected?: boolean;
  onToggleCompare?: () => void;
  onView?: () => void;
  onShortlist?: () => void;
  shortlisted?: boolean;
  unlocked?: boolean;
  /** Superficie del `Card` interno. Default: `glass` (lienzo oscuro). */
  variant?: CardVariant;
  className?: string;
}

/**
 * Card de candidato anónimo para el ranking de talento compatible.
 * El tipo no admite `name`/`photo` a propósito: el primer filtro nunca
 * expone identidad (ver 01_FRONTEND_FOUNDATIONS.md §10).
 */
export function CandidateAnonymousCard({
  anonCode,
  familyName,
  geoLabel,
  availabilityLabel,
  yearsExperience,
  score,
  scoreLabel,
  skills,
  evidence,
  selected = false,
  onToggleCompare,
  onView,
  onShortlist,
  shortlisted = false,
  unlocked = false,
  variant = "glass",
  className,
}: CandidateAnonymousCardProps) {
  const isDark = variant === "dark" || variant === "glass";

  return (
    <Card variant={variant} selected={selected} className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar anonymous seed={anonCode} size="md" />
          <div>
            <p className={cn("text-sm font-semibold", isDark ? "text-text-on-dark" : "text-text-primary")}>
              {anonCode}
            </p>
            <p className={cn("text-sm", isDark ? "text-text-on-dark-secondary" : "text-text-secondary")}>
              {familyName}
            </p>
          </div>
        </div>
        {onToggleCompare && (
          <button
            type="button"
            aria-pressed={selected}
            aria-label={selected ? "Quitar de comparar" : "Agregar a comparar"}
            onClick={onToggleCompare}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-fast ease-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2",
              isDark
                ? "text-text-on-dark-tertiary hover:bg-white/10 hover:text-primary-on-dark"
                : "text-text-tertiary hover:bg-surface-soft hover:text-primary",
            )}
          >
            {selected ? (
              <CheckSquare
                className={cn("size-4", isDark ? "text-primary-on-dark" : "text-primary")}
                aria-hidden="true"
              />
            ) : (
              <Square className="size-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-1 text-sm",
          isDark ? "text-text-on-dark-secondary" : "text-text-secondary",
        )}
      >
        <span className="flex items-center gap-1.5">
          <MapPin className="size-4" aria-hidden="true" />
          {geoLabel}
        </span>
        <span>{availabilityLabel}</span>
        <span>{formatYearsExperience(yearsExperience)}</span>
      </div>

      <ScoreBadge score={score} label={scoreLabel} variant="bar" />

      <div className="flex flex-wrap gap-2">
        {skills.slice(0, MAX_VISIBLE_SKILLS).map((skill) => (
          <SkillChip key={skill.name} name={skill.name} level={skill.level} className="shrink-0" />
        ))}
        {skills.length > MAX_VISIBLE_SKILLS && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-pill px-3 py-1.5 text-sm font-medium",
              isDark ? "bg-white/[0.08] text-text-on-dark-tertiary" : "bg-surface-soft text-text-tertiary",
            )}
          >
            +{skills.length - MAX_VISIBLE_SKILLS}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone="neutral">{evidence.declared} declaradas</Badge>
        <Badge tone="info">{evidence.evaluated} evaluadas</Badge>
        <Badge tone="success">{evidence.verified} verificadas</Badge>
      </div>

      {unlocked && <Badge tone="success">Contacto desbloqueado</Badge>}

      {/* En una grilla de 3 columnas la tarjeta es estrecha y las dos acciones
          lado a lado partían su etiqueta en dos líneas ("Ver / perfil"). Con
          `flex-wrap` + `grow` (base automática, no `flex-1`) comparten fila
          mientras quepan y saltan de línea enteras cuando no. */}
      <div className="mt-1 flex flex-wrap gap-2">
        {onView && (
          <Button variant="secondary" size="md" onClick={onView} className="grow whitespace-nowrap">
            <Eye className="size-4" aria-hidden="true" />
            Ver perfil
          </Button>
        )}
        {onShortlist && (
          <Button
            variant={shortlisted ? "primary" : "ghost"}
            size="md"
            onClick={onShortlist}
            className="grow whitespace-nowrap"
          >
            <Bookmark className="size-4" fill={shortlisted ? "currentColor" : "none"} aria-hidden="true" />
            {shortlisted ? "En finalistas" : "Añadir a finalistas"}
          </Button>
        )}
      </div>
    </Card>
  );
}
