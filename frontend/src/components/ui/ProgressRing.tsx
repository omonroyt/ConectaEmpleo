import { useId } from "react";
import { DATA_DURATION_MS, useAnimatedNumber } from "@/lib/motion";
import { cn } from "@/lib/cn";

export type ProgressRingTone = "light" | "dark";
export type ProgressRingLabelPlacement = "below" | "inside" | "none";

export interface ProgressRingProps {
  value: number;
  /** Diámetro en px. Por debajo de 120 la etiqueta se fuerza a `below`. */
  size?: number;
  stroke?: number;
  label?: string;
  /** Texto pequeño bajo la cifra, dentro del anillo (ej. "de evidencia"). */
  caption?: string;
  /** "light" para paneles claros; "dark" (default) para el lienzo y vidrio. */
  tone?: ProgressRingTone;
  /** Dónde va `label`. Default: `below` — evita que el texto desborde el aro. */
  labelPlacement?: ProgressRingLabelPlacement;
  /** Halo azul difuso detrás del aro. Default: solo en `tone="dark"`. */
  glow?: boolean;
  /** Retraso de arranque en ms, para escalonar varios anillos. */
  delayMs?: number;
  className?: string;
}

const TRACK_COLOR: Record<ProgressRingTone, string> = {
  light: "rgba(10, 12, 26, 0.08)",
  dark: "rgba(255, 255, 255, 0.10)",
};

const NUMBER_CLASS: Record<ProgressRingTone, string> = {
  light: "text-text-primary",
  dark: "text-text-on-dark",
};

const CAPTION_CLASS: Record<ProgressRingTone, string> = {
  light: "text-text-tertiary",
  dark: "text-text-on-dark-tertiary",
};

const LABEL_CLASS: Record<ProgressRingTone, string> = {
  light: "text-text-secondary",
  dark: "text-text-on-dark-secondary",
};

/**
 * Anillo de progreso. Se llena de 0 al valor **cuando entra en pantalla**,
 * en ~1.8s, con la cifra contando a la par (ver `useAnimatedNumber`).
 *
 * Reglas de composición que evitan los defectos que tenía la versión previa:
 *  - El contenedor es transparente: el anillo se apoya directo sobre el panel
 *    que lo contiene, nunca sobre una píldora gris propia.
 *  - La tipografía de la cifra se deriva del diámetro, así el número nunca
 *    desborda el aro por pequeño que sea.
 *  - La etiqueta larga va **debajo** del anillo por defecto; dentro solo cabe
 *    un `caption` corto y solo a partir de 120px.
 */
export function ProgressRing({
  value,
  size = 132,
  stroke,
  label,
  caption,
  tone = "dark",
  labelPlacement = "below",
  glow,
  delayMs = 0,
  className,
}: ProgressRingProps) {
  const gradientId = useId();
  const clamped = Math.max(0, Math.min(100, value));
  const { ref, display } = useAnimatedNumber<HTMLDivElement>(clamped, {
    durationMs: DATA_DURATION_MS,
    delayMs,
  });

  // Grosor proporcional: un aro de 72px con stroke 10 se ve tosco; uno de
  // 200px con stroke 10 se ve anémico.
  const strokeWidth = stroke ?? Math.max(6, Math.round(size * 0.075));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - display / 100);
  const rounded = Math.round(display);
  const showGlow = glow ?? tone === "dark";
  // Dentro del aro solo cabe texto si hay diámetro suficiente.
  const placement: ProgressRingLabelPlacement =
    labelPlacement === "inside" && size < 120 ? "below" : labelPlacement;

  return (
    <div
      ref={ref}
      className={cn("inline-flex flex-col items-center gap-2.5", className)}
      role="img"
      aria-label={label ? `${label}: ${rounded}%` : `${rounded}%`}
    >
      <div
        className="relative inline-flex shrink-0 items-center justify-center"
        style={{ width: size, height: size }}
      >
        {showGlow && (
          <span
            aria-hidden="true"
            className="data-glow absolute inset-[12%] rounded-full blur-2xl"
            style={{
              background:
                "radial-gradient(circle, rgba(74,69,255,.55) 0%, rgba(146,113,255,.22) 55%, transparent 72%)",
            }}
          />
        )}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="relative -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={TRACK_COLOR[tone]}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#173cff" />
              <stop offset="55%" stopColor="#4e46ff" />
              <stop offset="100%" stopColor="#9271ff" />
            </linearGradient>
          </defs>
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center px-[14%] text-center"
          aria-hidden="true"
        >
          <span
            className={cn(
              "font-semibold leading-none tracking-[-0.03em] tabular-nums",
              NUMBER_CLASS[tone],
            )}
            style={{ fontSize: Math.round(size * 0.26) }}
          >
            {rounded}
            <span
              className="align-super font-medium opacity-70"
              style={{ fontSize: Math.round(size * 0.12) }}
            >
              %
            </span>
          </span>
          {(caption || (placement === "inside" && label)) && (
            <span
              className={cn("mt-1 leading-tight", CAPTION_CLASS[tone])}
              style={{ fontSize: Math.max(10, Math.round(size * 0.082)) }}
            >
              {caption ?? label}
            </span>
          )}
        </div>
      </div>
      {label && placement === "below" && (
        <span className={cn("max-w-[16ch] text-center text-sm leading-snug", LABEL_CLASS[tone])}>
          {label}
        </span>
      )}
    </div>
  );
}
