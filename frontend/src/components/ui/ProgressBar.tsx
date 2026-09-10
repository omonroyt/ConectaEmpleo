import { DATA_DURATION_MS, useAnimatedNumber } from "@/lib/motion";
import { cn } from "@/lib/cn";

export type ProgressBarTone = "light" | "dark";
export type ProgressBarSize = "sm" | "md" | "lg";

export interface ProgressBarProps {
  /** 0-100 */
  value: number;
  label?: string;
  showValue?: boolean;
  /** Texto a la derecha en vez del porcentaje (ej. "evidencia sólida"). */
  valueText?: string;
  /** "light" para paneles claros; "dark" (default) para lienzo y vidrio. */
  tone?: ProgressBarTone;
  size?: ProgressBarSize;
  /** Delay antes de iniciar la animación (ms) — para listas escalonadas. */
  delay?: number;
  className?: string;
}

const TRACK_CLASS: Record<ProgressBarTone, string> = {
  light: "bg-[rgba(10,12,26,0.08)]",
  dark: "bg-white/10",
};

const LABEL_CLASS: Record<ProgressBarTone, string> = {
  light: "text-text-secondary",
  dark: "text-text-on-dark-secondary",
};

const VALUE_CLASS: Record<ProgressBarTone, string> = {
  light: "text-text-primary",
  dark: "text-text-on-dark",
};

const HEIGHT_CLASS: Record<ProgressBarSize, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-3.5",
};

/**
 * Barra de progreso. Se llena de 0 al valor **cuando entra en pantalla**, en
 * ~1.8s, con la cifra contando a la par (ver `useAnimatedNumber`).
 *
 * El ancho se anima con la cifra en cada frame (no con una transición CSS):
 * así el número y el relleno van exactamente sincronizados.
 */
export function ProgressBar({
  value,
  label,
  showValue = false,
  valueText,
  tone = "dark",
  size = "md",
  delay = 0,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const { ref, display } = useAnimatedNumber<HTMLDivElement>(clamped, {
    durationMs: DATA_DURATION_MS,
    delayMs: delay,
  });

  return (
    <div ref={ref} className={cn("flex flex-col gap-2", className)}>
      {(label || showValue || valueText) && (
        <div className="flex items-baseline justify-between gap-3 text-sm">
          {label && <span className={cn("min-w-0", LABEL_CLASS[tone])}>{label}</span>}
          {(showValue || valueText) && (
            <span className={cn("shrink-0 font-semibold tabular-nums", VALUE_CLASS[tone])}>
              {valueText ?? `${Math.round(display)}%`}
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(display)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn(
          "w-full overflow-hidden rounded-pill",
          HEIGHT_CLASS[size],
          TRACK_CLASS[tone],
        )}
      >
        <div
          className="h-full rounded-pill bg-gradient-cta"
          style={{
            width: `${display}%`,
            // Halo tenue en la punta de la barra mientras se llena.
            boxShadow: display > 0 ? "0 0 16px -2px rgba(78,70,255,.7)" : undefined,
          }}
        />
      </div>
    </div>
  );
}
