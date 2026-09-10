import { Minus, Plus } from "lucide-react";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
}

/** Contador +/- para rangos cortos (ej. 1-4 años de experiencia). */
export function Stepper({ value, onChange, min = 1, max = 4, label, tone, className }: StepperProps) {
  const resolved = useSurfaceTone(tone);
  const textClass = resolved === "dark" ? "text-text-on-dark" : "text-text-primary";
  const hoverClass = resolved === "dark" ? "hover:bg-white/10" : "hover:bg-surface-soft";
  const borderClass = resolved === "dark" ? "border-border-glass" : "border-border";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {label && <span className={cn("text-sm font-medium", textClass)}>{label}</span>}
      <div className={cn("inline-flex items-center rounded-pill border", borderClass)}>
        <button
          type="button"
          aria-label="Disminuir"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className={cn("flex size-11 items-center justify-center rounded-l-pill transition-colors duration-fast ease-standard disabled:pointer-events-none disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2", textClass, hoverClass)}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <span
          className={cn("w-8 text-center text-sm font-medium tabular-nums", textClass)}
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          aria-label="Aumentar"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className={cn("flex size-11 items-center justify-center rounded-r-pill transition-colors duration-fast ease-standard disabled:pointer-events-none disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2", textClass, hoverClass)}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
