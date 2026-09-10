import { useId } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/a11y";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface FilterPillOption {
  value: string;
  label: string;
}

export interface FilterPillsProps {
  options: FilterPillOption[];
  value: string;
  onChange: (value: string) => void;
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
  "aria-label"?: string;
}

/** Lista de filtros con indicador animado (`layoutId`) que se desliza entre opciones. */
export function FilterPills({ options, value, onChange, tone, className, ...rest }: FilterPillsProps) {
  const layoutId = useId();
  const reduced = useReducedMotion();
  const resolved = useSurfaceTone(tone);
  const isDark = resolved === "dark";

  return (
    <div
      role="tablist"
      aria-label={rest["aria-label"]}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative inline-flex h-9 items-center rounded-pill px-3.5 text-sm font-medium transition-colors duration-fast ease-standard",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2",
              active
                ? "text-white"
                : isDark
                  ? "text-text-on-dark-secondary hover:text-text-on-dark"
                  : "text-text-secondary hover:text-text-primary",
            )}
          >
            {active ? (
              <motion.span
                layoutId={`filterpill-${layoutId}`}
                transition={
                  reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 34 }
                }
                className="absolute inset-0 -z-10 rounded-pill bg-gradient-cta"
              />
            ) : (
              <span
                className={cn(
                  "absolute inset-0 -z-10 rounded-pill",
                  isDark ? "bg-white/[0.06]" : "bg-surface-soft",
                )}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
