import { cn } from "@/lib/cn";

export interface ScoreBadgeProps {
  score: number;
  /** Etiqueta textual obligatoria — nunca mostrar solo el número (ver §10). */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

export function ScoreBadge({ score, label, size = "md", className }: ScoreBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill bg-primary/10 font-medium text-primary",
        size === "sm" ? "h-7 px-2.5 text-sm" : "h-9 px-3.5 text-base",
        className,
      )}
    >
      <strong className="font-bold tabular-nums">{Math.round(score)}%</strong>
      <span className="font-normal text-text-secondary">{label}</span>
    </span>
  );
}
