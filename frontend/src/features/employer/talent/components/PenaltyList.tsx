import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { Penalty } from "@/api/types";
import { penaltyReasonLabels } from "../talentLabels";
import { cn } from "@/lib/cn";

export interface PenaltyListProps {
  penalties: Penalty[];
  /** `true` cuando la lista vive dentro de una `Card variant="dark"`. */
  onDark?: boolean;
  className?: string;
}

/**
 * Penalizaciones aplicadas al score, siempre con su causa explícita.
 * Nunca se usa rojo de error: son ajustes del cálculo, no fallos del candidato.
 */
export function PenaltyList({ penalties, onDark = false, className }: PenaltyListProps) {
  if (penalties.length === 0) {
    return (
      <p
        className={cn(
          "flex items-center gap-2 text-sm",
          onDark ? "text-text-on-dark-secondary" : "text-text-secondary",
          className,
        )}
      >
        <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden="true" />
        Sin penalizaciones: cumple los requisitos esenciales, el rango salarial y la zona.
      </p>
    );
  }

  const total = penalties.reduce((sum, p) => sum + p.points, 0);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p
        className={cn(
          "flex items-center gap-2 text-sm font-medium",
          onDark ? "text-text-on-dark" : "text-text-primary",
        )}
      >
        <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />
        Penalizaciones aplicadas: −{total} puntos
      </p>
      <ul className="flex flex-col gap-2">
        {penalties.map((penalty) => (
          <li
            key={`${penalty.reason}-${penalty.requirement}`}
            className={cn(
              "flex items-start justify-between gap-3 rounded-md border px-3 py-2.5 text-sm",
              onDark
                ? "border-border-dark bg-white/5 text-text-on-dark-secondary"
                : "border-warning/30 bg-warning-soft text-text-secondary",
            )}
          >
            <span>
              <span className={cn("font-medium", onDark ? "text-text-on-dark" : "text-text-primary")}>
                {penaltyReasonLabels[penalty.reason]}
              </span>
              <span className="block">{penalty.requirement}</span>
            </span>
            <span className="shrink-0 tabular-nums font-medium">−{penalty.points} pts</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
