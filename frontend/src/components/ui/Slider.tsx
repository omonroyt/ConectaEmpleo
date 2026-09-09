import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

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
  className?: string;
}

/** Slider simple sobre `<input type="range">` nativo: teclado y `aria-valuenow` gratis. */
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
    className,
    id,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const sliderId = id ?? generatedId;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-sm">
          {label && (
            <label htmlFor={sliderId} className="font-medium text-text-primary">
              {label}
            </label>
          )}
          {showValue && (
            <span className="tabular-nums text-text-secondary">
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
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full min-h-11 cursor-pointer appearance-none rounded-pill bg-surface-soft accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
        {...rest}
      />
    </div>
  );
});
