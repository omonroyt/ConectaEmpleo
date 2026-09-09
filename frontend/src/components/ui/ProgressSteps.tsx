import { cn } from "@/lib/cn";

export interface ProgressStepsProps {
  total: number;
  /** 1-indexado. */
  current: number;
  label?: string;
  className?: string;
}

export function ProgressSteps({ total, current, label, className }: ProgressStepsProps) {
  const text = label ?? `Paso ${current} de ${total}`;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={text}
        className="flex gap-1.5"
      >
        {Array.from({ length: total }, (_, index) => index + 1).map((step) => (
          <span
            key={step}
            className={cn(
              "h-1.5 flex-1 rounded-pill transition-colors duration-normal ease-standard",
              step < current
                ? "bg-primary"
                : step === current
                  ? "bg-primary-2"
                  : "bg-surface-soft opacity-70",
            )}
          />
        ))}
      </div>
      <p className="text-sm text-text-secondary">{text}</p>
    </div>
  );
}
