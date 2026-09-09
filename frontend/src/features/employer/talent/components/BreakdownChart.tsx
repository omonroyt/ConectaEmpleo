import { motion } from "motion/react";
import type { BreakdownItem } from "@/api/types";
import { useReducedMotion } from "@/lib/a11y";
import { durations, easings } from "@/lib/motion";
import { breakdownAriaText, matchComponentLabels } from "../talentLabels";
import { cn } from "@/lib/cn";

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export interface BreakdownChartProps {
  items: BreakdownItem[];
  /** `true` cuando el desglose vive dentro de una `Card variant="dark"`. */
  onDark?: boolean;
  className?: string;
}

/**
 * Desglose del score: una barra por `MatchComponent` con peso, valor bruto y
 * contribución en puntos. Cada barra lleva su texto accesible completo
 * ("Técnica: 82 de 100, peso 40 %, aporta 32.8 puntos"), nunca solo el número.
 */
export function BreakdownChart({ items, onDark = false, className }: BreakdownChartProps) {
  const reduced = useReducedMotion();

  return (
    <ul className={cn("flex flex-col gap-4", className)}>
      {items.map((item, index) => {
        const aria = breakdownAriaText(item.component, item.weight, item.raw, item.contribution);
        return (
          <li key={item.component} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span
                className={cn(
                  "text-sm font-medium",
                  onDark ? "text-text-on-dark" : "text-text-primary",
                )}
              >
                {matchComponentLabels[item.component]}
              </span>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  onDark ? "text-text-on-dark-secondary" : "text-text-secondary",
                )}
              >
                {Math.round(item.raw)} de 100 · peso {item.weight} % · aporta{" "}
                {item.contribution.toFixed(1)} pts
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuenow={Math.round(item.raw)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={aria}
              className={cn(
                "h-2 w-full overflow-hidden rounded-pill",
                onDark ? "bg-white/12" : "bg-surface-soft",
              )}
            >
              <motion.div
                className="h-full rounded-pill bg-gradient-cta"
                initial={{ width: reduced ? `${clampPct(item.raw)}%` : "0%" }}
                animate={{ width: `${clampPct(item.raw)}%` }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { duration: durations.slow, ease: easings.outSmooth, delay: 0.08 * index }
                }
              />
            </div>
            <span className="sr-only">{aria}</span>
          </li>
        );
      })}
    </ul>
  );
}
