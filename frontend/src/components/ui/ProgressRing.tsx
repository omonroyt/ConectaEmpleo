import { useId } from "react";
import { useCountUp } from "@/lib/motion";
import { cn } from "@/lib/cn";

export type ProgressRingTone = "light" | "dark";

export interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  /** "light" (default) para fondos claros; "dark" para tarjetas/héroes oscuros. */
  tone?: ProgressRingTone;
  className?: string;
}

const TRACK_COLOR: Record<ProgressRingTone, string> = {
  light: "var(--color-surface-soft)",
  dark: "rgba(255, 255, 255, 0.16)",
};

const NUMBER_CLASS: Record<ProgressRingTone, string> = {
  light: "text-text-primary",
  dark: "text-text-on-dark",
};

const LABEL_CLASS: Record<ProgressRingTone, string> = {
  light: "text-text-secondary",
  dark: "text-text-on-dark-secondary",
};

export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  label,
  tone = "light",
  className,
}: ProgressRingProps) {
  const gradientId = useId();
  const clamped = Math.max(0, Math.min(100, value));
  const animated = useCountUp(clamped, 1200);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - animated / 100);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ? `${label}: ${Math.round(animated)}%` : `${Math.round(animated)}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TRACK_COLOR[tone]}
          strokeWidth={stroke}
        />
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
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className={cn("text-2xl font-bold tabular-nums", NUMBER_CLASS[tone])}>
          {Math.round(animated)}%
        </span>
        {label && <span className={cn("px-2 text-center text-xs", LABEL_CLASS[tone])}>{label}</span>}
      </div>
    </div>
  );
}
