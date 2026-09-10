import { useId } from "react";
import { useCountUp } from "@/lib/motion";
import { cn } from "@/lib/cn";

export type MiniProgressRingTone = "light" | "dark";

export interface MiniProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  tone?: MiniProgressRingTone;
  className?: string;
}

const TRACK_COLOR: Record<MiniProgressRingTone, string> = {
  light: "#eceffb",
  dark: "rgba(255, 255, 255, 0.16)",
};

const NUMBER_CLASS: Record<MiniProgressRingTone, string> = {
  light: "text-text-primary",
  dark: "text-text-on-dark",
};

/**
 * Variante compacta de `components/ui/ProgressRing`, local a la landing:
 * el original fija el número en `text-2xl` (24px), demasiado grande para los
 * indicadores de 32-64px de las filas de candidatos y las tarjetas de
 * comparación de los paneles del hero. El tamaño de fuente aquí escala con
 * `size` en vez de ser fijo.
 */
export function MiniProgressRing({
  value,
  size = 40,
  stroke = 4,
  tone = "light",
  className,
}: MiniProgressRingProps) {
  const gradientId = useId();
  const clamped = Math.max(0, Math.min(100, value));
  const animated = useCountUp(clamped, 1200);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - animated / 100);
  const fontSize = Math.max(9, Math.round(size * 0.28));

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(animated)}% de compatibilidad`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={TRACK_COLOR[tone]} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#173cff" />
            <stop offset="100%" stopColor="#9271ff" />
          </linearGradient>
        </defs>
      </svg>
      <span
        className={cn("absolute font-bold tabular-nums leading-none", NUMBER_CLASS[tone])}
        style={{ fontSize }}
        aria-hidden="true"
      >
        {Math.round(animated)}%
      </span>
    </div>
  );
}
