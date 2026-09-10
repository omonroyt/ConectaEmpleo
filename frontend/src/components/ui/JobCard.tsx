import { useState, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { BadgeCheck, Bookmark, Briefcase, MapPin } from "lucide-react";
import { Card, type CardVariant } from "@/components/ui/Card";
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
  /** Superficie del `Card` interno. Default: `glass` (lienzo oscuro). */
  variant?: CardVariant;
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
  variant = "glass",
  className,
}: JobCardProps) {
  const [localBookmarked, setLocalBookmarked] = useState(bookmarked);
  const reduced = useReducedMotion();
  const isDark = variant === "dark" || variant === "glass";

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
      variant={variant}
      spotlight={Boolean(onClick)}
      interactive={Boolean(onClick)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className={cn(
              "truncate text-base font-semibold",
              isDark ? "text-text-on-dark" : "text-text-primary",
            )}
          >
            {title}
          </h3>
          <p
            className={cn(
              "mt-0.5 flex items-center gap-1 text-sm",
              isDark ? "text-text-on-dark-secondary" : "text-text-secondary",
            )}
          >
            {company}
            {companyVerified && (
              <BadgeCheck
                className={cn("size-4", isDark ? "text-primary-on-dark" : "text-primary")}
                aria-hidden="true"
              />
            )}
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
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-fast ease-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2",
            isDark
              ? "text-text-on-dark-tertiary hover:bg-white/10 hover:text-primary-on-dark"
              : "text-text-tertiary hover:bg-surface-soft hover:text-primary",
          )}
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
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-1 text-sm",
          isDark ? "text-text-on-dark-secondary" : "text-text-secondary",
        )}
      >
        <span className="flex items-center gap-1.5">
          <MapPin className="size-4" aria-hidden="true" />
          {location}
        </span>
        <span className="flex items-center gap-1.5">
          <Briefcase className="size-4" aria-hidden="true" />
          {modality}
        </span>
      </div>
      <p className={cn("text-sm font-medium", isDark ? "text-text-on-dark" : "text-text-primary")}>
        {salaryText}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {compatibility && (
          <ScoreBadge score={compatibility.score} label={compatibility.label} size="sm" />
        )}
        {applied && <Badge tone="success">Ya postulaste</Badge>}
      </div>
    </Card>
  );
}
