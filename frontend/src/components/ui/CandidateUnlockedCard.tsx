import { Mail, Phone } from "lucide-react";
import { Card } from "@/components/ui/Card";
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
  className,
}: CandidateUnlockedCardProps) {
  return (
    <Card className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-3">
        <Avatar name={name} src={photoUrl} size="lg" />
        <div>
          <p className="text-base font-semibold text-text-primary">{name}</p>
          <p className="text-sm text-text-secondary">
            {geoLabel} · {availabilityLabel}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-sm text-text-secondary">
        <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-primary">
          <Mail className="size-4" aria-hidden="true" />
          {email}
        </a>
        {phone && (
          <a href={`tel:${phone}`} className="flex items-center gap-2 hover:text-primary">
            <Phone className="size-4" aria-hidden="true" />
            {phone}
          </a>
        )}
      </div>

      <p className="text-sm text-text-secondary">{formatYearsExperience(yearsExperience)}</p>

      <ScoreBadge score={score} label={scoreLabel} />

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
