import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label: ReactNode;
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, tone, className, id, ...rest },
  ref,
) {
  const resolved = useSurfaceTone(tone);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm",
        resolved === "dark" ? "text-text-on-dark" : "text-text-primary",
        rest.disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input ref={ref} id={inputId} type="radio" className="peer sr-only" {...rest} />
      <span
        className={cn(
          "relative flex size-5 shrink-0 items-center justify-center rounded-full border",
          resolved === "dark" ? "border-border-glass bg-white/[0.07]" : "border-border bg-surface",
          "transition-colors duration-fast ease-standard peer-checked:border-primary",
          "peer-checked:[&>span]:scale-100",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-2",
        )}
      >
        <span className="size-2.5 scale-0 rounded-full bg-primary transition-transform duration-fast ease-standard" />
      </span>
      {label}
    </label>
  );
});
