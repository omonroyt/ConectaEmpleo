import { Mail, Phone } from "lucide-react";
import { Card, type CardVariant } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { SkillChip } from "@/components/ui/SkillChip";
import { Badge } from "@/components/ui/Badge";
import type {
  CandidateAnonymousEvidenceSummary,
  CandidateAnonymousSkill,
} from "@/components/ui/CandidateAnonymousCard";
import { cn } from "@/lib/cn";
import { formatYearsExperience } from "@/lib/format";

export interface CandidateUnlockedCardProps {
  name: string;
  photoUrl?: string;
  email: string;
  phone?: string;
  geoLabel: string;
  availabilityLabel: string;
  yearsExperience: number;
  score: number;
  scoreLabel: string;
  skills: CandidateAnonymousSkill[];
  evidence: CandidateAnonymousEvidenceSummary;
  /** Superficie del `Card` interno. Default: `glass` (lienzo oscuro). */
  variant?: CardVariant;
  className?: string;
}

/** Misma información que `CandidateAnonymousCard`, ya con identidad desbloqueada. */
export function CandidateUnlockedCard({
  name,
  photoUrl,
  email,
  phone,
  geoLabel,
  availabilityLabel,
  yearsExperience,
  score,
  scoreLabel,
  skills,
  evidence,
  variant = "glass",
  className,
}: CandidateUnlockedCardProps) {
  const isDark = variant === "dark" || variant === "glass";

  return (
    <Card variant={variant} className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-3">
        <Avatar name={name} src={photoUrl} size="lg" />
        <div>
          <p className={cn("text-base font-semibold", isDark ? "text-text-on-dark" : "text-text-primary")}>
            {name}
          </p>
          <p className={cn("text-sm", isDark ? "text-text-on-dark-secondary" : "text-text-secondary")}>
            {geoLabel} · {availabilityLabel}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-1 text-sm",
          isDark ? "text-text-on-dark-secondary" : "text-text-secondary",
        )}
      >
        <a
          href={`mailto:${email}`}
          className={cn("flex items-center gap-2", isDark ? "hover:text-primary-on-dark" : "hover:text-primary")}
        >
          <Mail className="size-4" aria-hidden="true" />
          {email}
        </a>
        {phone && (
          <a
            href={`tel:${phone}`}
            className={cn("flex items-center gap-2", isDark ? "hover:text-primary-on-dark" : "hover:text-primary")}
          >
            <Phone className="size-4" aria-hidden="true" />
            {phone}
          </a>
        )}
      </div>

      <p className={cn("text-sm", isDark ? "text-text-on-dark-secondary" : "text-text-secondary")}>
        {formatYearsExperience(yearsExperience)}
      </p>

      <ScoreBadge score={score} label={scoreLabel} variant="bar" />

      <div className="flex flex-wrap gap-2">
        {skills.slice(0, 6).map((skill) => (
          <SkillChip key={skill.name} name={skill.name} level={skill.level} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone="neutral">{evidence.declared} declaradas</Badge>
        <Badge tone="info">{evidence.evaluated} evaluadas</Badge>
        <Badge tone="success">{evidence.verified} verificadas</Badge>
      </div>
    </Card>
  );
}
