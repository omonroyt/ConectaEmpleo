import { useCountUp } from "@/lib/motion";
import { cn } from "@/lib/cn";

export interface ProgressBarProps {
  /** 0-100 */
  value: number;
  label?: string;
  showValue?: boolean;
  /** Delay antes de iniciar la animación (ms) — útil para listas escalonadas. */
  delay?: number;
  className?: string;
}

export function ProgressBar({
  value,
  label,
  showValue = false,
  delay = 0,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const animated = useCountUp(clamped, 900 + delay);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-text-secondary">{label}</span>}
          {showValue && (
            <span className="font-medium tabular-nums text-text-primary">
              {Math.round(animated)}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(animated)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-pill bg-surface-soft"
      >
        <div
          className="h-full rounded-pill bg-gradient-cta transition-[width] duration-normal ease-standard"
          style={{ width: `${animated}%` }}
        />
      </div>
    </div>
  );
}
