import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  className?: string;
}

/** Contador +/- para rangos cortos (ej. 1-4 años de experiencia). */
export function Stepper({ value, onChange, min = 1, max = 4, label, className }: StepperProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {label && <span className="text-sm font-medium text-text-primary">{label}</span>}
      <div className="inline-flex items-center rounded-pill border border-border">
        <button
          type="button"
          aria-label="Disminuir"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex size-11 items-center justify-center rounded-l-pill text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <span
          className="w-8 text-center text-sm font-medium tabular-nums text-text-primary"
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          aria-label="Aumentar"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex size-11 items-center justify-center rounded-r-pill text-text-primary transition-colors duration-fast ease-standard hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
