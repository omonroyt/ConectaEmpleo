import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type SliderTone = "light" | "dark";

export interface SliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size" | "onChange" | "value"> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  tone?: SliderTone;
  className?: string;
}

const LABEL_CLASS: Record<SliderTone, string> = {
  light: "text-text-primary",
  dark: "text-text-on-dark",
};

const VALUE_CLASS: Record<SliderTone, string> = {
  light: "text-text-primary",
  dark: "text-text-on-dark",
};

const TRACK_COLOR: Record<SliderTone, string> = {
  light: "rgba(10, 12, 26, 0.10)",
  dark: "rgba(255, 255, 255, 0.12)",
};

/**
 * Slider sobre `<input type="range">` nativo — teclado y `aria-valuenow`
 * gratis — con **relleno visible**: la porción recorrida se pinta con el
 * gradiente de marca, así se lee el porcentaje elegido de un vistazo y no
 * solo la posición de la bolita sobre una barra vacía.
 *
 * El relleno se pinta como primer `background-layer` del propio input
 * (dimensionado a `%` del recorrido) sobre el color de la pista.
 */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    label,
    showValue = true,
    valueFormatter,
    tone = "dark",
    className,
    id,
    disabled,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const sliderId = id ?? generatedId;
  const span = max - min || 1;
  const pct = Math.max(0, Math.min(100, ((value - min) / span) * 100));

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {(label || showValue) && (
        <div className="flex items-baseline justify-between gap-3 text-sm">
          {label && (
            <label htmlFor={sliderId} className={cn("font-medium", LABEL_CLASS[tone])}>
              {label}
            </label>
          )}
          {showValue && (
            <span className={cn("shrink-0 font-semibold tabular-nums", VALUE_CLASS[tone])}>
              {valueFormatter ? valueFormatter(value) : value}
            </span>
          )}
        </div>
      )}
      <input
        ref={ref}
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{
          background: `var(--gradient-cta) 0 0 / ${pct}% 100% no-repeat, ${TRACK_COLOR[tone]}`,
        }}
        className={cn(
          // Pista: la altura real la da el propio input para que el relleno
          // y la bolita compartan eje sin cálculos de posición.
          "h-2.5 w-full cursor-pointer appearance-none rounded-pill",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-2",
          disabled && "cursor-not-allowed opacity-50",
          // Bolita (WebKit): círculo blanco con anillo azul y halo.
          "[&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2",
          "[&::-webkit-slider-thumb]:border-primary-2 [&::-webkit-slider-thumb]:bg-white",
          "[&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(74,69,255,.18),0_2px_10px_rgba(4,8,26,.6)]",
          "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-fast",
          "hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-95",
          // Bolita (Firefox).
          "[&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary-2",
          "[&::-moz-range-thumb]:bg-white",
          "[&::-moz-range-thumb]:shadow-[0_0_0_4px_rgba(74,69,255,.18)]",
          // Firefox pinta su propia pista encima del background del input.
          "[&::-moz-range-track]:h-2.5 [&::-moz-range-track]:rounded-pill",
          "[&::-moz-range-track]:bg-transparent",
        )}
        {...rest}
      />
    </div>
  );
});
