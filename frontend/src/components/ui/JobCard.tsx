import { useState, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { BadgeCheck, Bookmark, Briefcase, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { Badge } from "@/components/ui/Badge";
import { useReducedMotion } from "@/lib/a11y";
import { cn } from "@/lib/cn";

export interface JobCardProps {
  title: string;
  company: string;
  companyVerified?: boolean;
  location: string;
  modality: string;
  salaryText: string;
  compatibility?: { score: number; label: string };
  applied?: boolean;
  bookmarked?: boolean;
  onBookmarkChange?: (bookmarked: boolean) => void;
  onClick?: () => void;
  className?: string;
}

/** Card de vacante para el marketplace del candidato. Props propias — no depende de `src/api`. */
export function JobCard({
  title,
  company,
  companyVerified = false,
  location,
  modality,
  salaryText,
  compatibility,
  applied = false,
  bookmarked = false,
  onBookmarkChange,
  onClick,
  className,
}: JobCardProps) {
  const [localBookmarked, setLocalBookmarked] = useState(bookmarked);
  const reduced = useReducedMotion();

  const toggleBookmark = () => {
    const next = !localBookmarked;
    setLocalBookmarked(next);
    onBookmarkChange?.(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      interactive={Boolean(onClick)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-text-primary">{title}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-text-secondary">
            {company}
            {companyVerified && <BadgeCheck className="size-4 text-primary" aria-hidden="true" />}
          </p>
        </div>
        <button
          type="button"
          aria-pressed={localBookmarked}
          aria-label={localBookmarked ? "Quitar de guardados" : "Guardar vacante"}
          onClick={(event) => {
            event.stopPropagation();
            toggleBookmark();
          }}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-tertiary transition-colors duration-fast ease-standard hover:bg-surface-soft hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
        >
          <motion.span
            animate={reduced || !localBookmarked ? undefined : { scale: [1, 1.25, 1] }}
            transition={{ duration: 0.28 }}
          >
            <Bookmark
              className="size-4"
              fill={localBookmarked ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </motion.span>
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
        <span className="flex items-center gap-1.5">
          <MapPin className="size-4" aria-hidden="true" />
          {location}
        </span>
        <span className="flex items-center gap-1.5">
          <Briefcase className="size-4" aria-hidden="true" />
          {modality}
        </span>
      </div>
      <p className="text-sm font-medium text-text-primary">{salaryText}</p>
      <div className="flex flex-wrap items-center gap-2">
        {compatibility && (
          <ScoreBadge score={compatibility.score} label={compatibility.label} size="sm" />
        )}
        {applied && <Badge tone="success">Ya postulaste</Badge>}
      </div>
    </Card>
  );
}
