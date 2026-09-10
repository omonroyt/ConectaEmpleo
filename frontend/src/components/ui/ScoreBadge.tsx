import { ProgressBar } from "@/components/ui/ProgressBar";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { DATA_DURATION_MS, useAnimatedNumber } from "@/lib/motion";
import { cn } from "@/lib/cn";

export interface ScoreBadgeProps {
  score: number;
  /** Etiqueta textual obligatoria — nunca mostrar solo el número (ver §10). */
  label: string;
  size?: "sm" | "md";
  /**
   * `pill` (default): insignia compacta en línea, para filas ajustadas
   * (ej. `JobCard`). `bar`: bloque con `ProgressBar` que carga de 0 al valor
   * — úsalo cuando el score es el dato principal de la tarjeta (candidatos).
   */
  variant?: "pill" | "bar";
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  /** Retraso de arranque en ms, para escalonar varias en una lista. */
  delayMs?: number;
  className?: string;
}

export function ScoreBadge({
  score,
  label,
  size = "md",
  variant = "pill",
  tone,
  delayMs = 0,
  className,
}: ScoreBadgeProps) {
  const resolved = useSurfaceTone(tone);
  const isDark = resolved === "dark";
  const { ref, display } = useAnimatedNumber<HTMLSpanElement>(score, {
    durationMs: DATA_DURATION_MS,
    delayMs,
  });

  if (variant === "bar") {
    return (
      <ProgressBar
        value={score}
        label={label}
        showValue
        tone={resolved}
        delay={delayMs}
        className={className}
      />
    );
  }

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-2 rounded-pill font-medium",
        isDark ? "bg-primary/20 text-primary-on-dark" : "bg-primary/10 text-primary",
        size === "sm" ? "h-7 px-2.5 text-sm" : "h-9 px-3.5 text-base",
        className,
      )}
    >
      <strong className="font-bold tabular-nums">{Math.round(display)}%</strong>
      <span className={cn("font-normal", isDark ? "text-text-on-dark-secondary" : "text-text-secondary")}>
        {label}
      </span>
    </span>
  );
}
