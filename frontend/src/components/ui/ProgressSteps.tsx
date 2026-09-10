import { cn } from "@/lib/cn";

export type ProgressStepsTone = "light" | "dark";

export interface ProgressStepsProps {
  total: number;
  /** 1-indexado. */
  current: number;
  label?: string;
  /** Nombre del paso actual, ej. "Datos de la vacante". */
  stepName?: string;
  tone?: ProgressStepsTone;
  className?: string;
}

const TEXT_CLASS: Record<ProgressStepsTone, string> = {
  light: "text-text-tertiary",
  dark: "text-text-on-dark-tertiary",
};

const TRACK_CLASS: Record<ProgressStepsTone, string> = {
  light: "bg-[rgba(10,12,26,0.10)]",
  dark: "bg-white/12",
};

/**
 * Indicador de paso discreto: una fila de segmentos finos y una línea de
 * texto pequeña. Deliberadamente ligero — el protagonista de la pantalla es
 * el formulario, no su barra de avance.
 */
export function ProgressSteps({
  total,
  current,
  label,
  stepName,
  tone = "dark",
  className,
}: ProgressStepsProps) {
  const text = label ?? `Paso ${current} de ${total}`;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={text}
        className="flex items-center gap-1.5"
      >
        {Array.from({ length: total }, (_, index) => index + 1).map((step) => {
          const done = step < current;
          const active = step === current;
          return (
            <span
              key={step}
              className={cn(
                "h-[3px] rounded-pill transition-all duration-normal ease-out-smooth",
                // El segmento activo es más ancho: se ve dónde estás sin leer.
                active ? "w-10" : "w-5",
                done
                  ? "bg-primary-2"
                  : active
                    ? "bg-gradient-cta shadow-[0_0_12px_-2px_rgba(78,70,255,.9)]"
                    : TRACK_CLASS[tone],
              )}
            />
          );
        })}
      </div>
      <p className={cn("text-xs font-medium tracking-[0.01em]", TEXT_CLASS[tone])}>
        {text}
        {stepName && <span className="opacity-70"> · {stepName}</span>}
      </p>
    </div>
  );
}
