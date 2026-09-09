import { useId } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/a11y";
import { cn } from "@/lib/cn";

export interface SegmentedControlOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Etiqueta accesible del grupo (ej. "Tipo de cuenta"). */
  "aria-label": string;
}

/** Selector de 2-3 opciones excluyentes (ej. Candidato | Empresa). */
export function SegmentedControl({
  options,
  value,
  onChange,
  className,
  ...rest
}: SegmentedControlProps) {
  const layoutId = useId();
  const reduced = useReducedMotion();

  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      className={cn("inline-flex rounded-pill bg-surface-soft p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative min-h-9 rounded-pill px-4 text-sm font-medium transition-colors duration-fast ease-standard",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2",
              active ? "text-white" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${layoutId}`}
                transition={
                  reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 34 }
                }
                className="absolute inset-0 -z-10 rounded-pill bg-primary"
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
