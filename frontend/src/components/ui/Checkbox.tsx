import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label: ReactNode;
  className?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, className, id, ...rest }, ref) {
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
        <input ref={ref} id={inputId} type="checkbox" className="peer sr-only" {...rest} />
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-[6px] border border-border bg-surface",
            "transition-colors duration-fast ease-standard",
            "peer-checked:border-primary peer-checked:bg-primary",
            "peer-checked:[&>svg]:opacity-100",
            "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-2",
          )}
        >
          <Check className="size-3.5 text-white opacity-0 transition-opacity duration-fast" aria-hidden="true" />
        </span>
        {label}
      </label>
    );
  },
);
