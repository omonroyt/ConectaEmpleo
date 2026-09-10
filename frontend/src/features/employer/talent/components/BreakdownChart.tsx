import type { BreakdownItem } from "@/api/types";
import { ProgressBar } from "@/components/ui";
import { breakdownAriaText, matchComponentLabels } from "../talentLabels";
import { cn } from "@/lib/cn";

export interface BreakdownChartProps {
  items: BreakdownItem[];
  /** `true` cuando el desglose vive sobre vidrio o lienzo oscuro. */
  onDark?: boolean;
  className?: string;
}

/**
 * Desglose del score: una `ProgressBar` por `MatchComponent`, con peso y
 * contribución en puntos debajo. Cada barra carga de 0 a su valor al entrar
 * en pantalla, escalonada 90 ms respecto de la anterior, y lleva su texto
 * accesible completo ("Técnica: 82 de 100, peso 40 %, aporta 32.8 puntos"),
 * nunca solo el número.
 */
export function BreakdownChart({ items, onDark = false, className }: BreakdownChartProps) {
  const tone = onDark ? "dark" : "light";

  return (
    <ul className={cn("flex flex-col gap-5", className)}>
      {items.map((item, index) => (
        <li key={item.component}>
          <ProgressBar
            value={item.raw}
            label={matchComponentLabels[item.component]}
            showValue
            tone={tone}
            delay={index * 90}
          />
          <p
            className={cn(
              "mt-1.5 text-xs tabular-nums",
              onDark ? "text-text-on-dark-tertiary" : "text-text-tertiary",
            )}
          >
            {Math.round(item.raw)} de 100 · peso {item.weight} % · aporta{" "}
            {item.contribution.toFixed(1)} pts
          </p>
          <span className="sr-only">
            {breakdownAriaText(item.component, item.weight, item.raw, item.contribution)}
          </span>
        </li>
      ))}
    </ul>
  );
}
