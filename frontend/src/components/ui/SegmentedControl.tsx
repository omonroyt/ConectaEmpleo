import { useId } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/a11y";
import { cn } from "@/lib/cn";

export type SegmentedControlTone = "light" | "dark";

export interface SegmentedControlOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  tone?: SegmentedControlTone;
  /** Ocupa todo el ancho disponible, repartiendo las opciones por igual. */
  fullWidth?: boolean;
  className?: string;
  /** Etiqueta accesible del grupo (ej. "Tipo de cuenta"). */
  "aria-label": string;
}

const CONTAINER_CLASS: Record<SegmentedControlTone, string> = {
  light: "bg-surface-soft",
  dark: "border border-border-glass bg-white/[0.06]",
};

const INACTIVE_CLASS: Record<SegmentedControlTone, string> = {
  light: "text-text-secondary hover:text-text-primary",
  dark: "text-text-on-dark-secondary hover:text-text-on-dark",
};

/** Selector de 2-3 opciones excluyentes (ej. Candidato | Empresa). */
export function SegmentedControl({
  options,
  value,
  onChange,
  tone = "light",
  fullWidth = false,
  className,
  ...rest
}: SegmentedControlProps) {
  const layoutId = useId();
  const reduced = useReducedMotion();

  return (
    <div
      role="radiogroup"
      aria-label={rest["aria-label"]}
      className={cn(
        "inline-flex rounded-pill p-1",
        CONTAINER_CLASS[tone],
        fullWidth && "flex w-full",
        className,
      )}
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
              fullWidth && "flex-1",
              active ? "text-white" : INACTIVE_CLASS[tone],
            )}
          >
            {/* La píldora activa va en un `z-0` posicionado y la etiqueta en un
                `z-10` dentro del mismo botón. La versión previa la mandaba a
                `-z-10`, que la enviaba detrás del fondo del contenedor: el
                resultado era texto blanco sobre fondo claro, ilegible. */}
            {active && (
              <motion.span
                layoutId={`segmented-${layoutId}`}
                aria-hidden="true"
                transition={
                  reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 34 }
                }
                className="absolute inset-0 z-0 rounded-pill bg-gradient-cta shadow-[0_2px_14px_-2px_rgba(74,69,255,.75)]"
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
