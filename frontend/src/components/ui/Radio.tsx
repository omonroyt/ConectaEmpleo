import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label: ReactNode;
  className?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-text-primary",
        rest.disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input ref={ref} id={inputId} type="radio" className="peer sr-only" {...rest} />
      <span
        className={cn(
          "relative flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-surface",
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
