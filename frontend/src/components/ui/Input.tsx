import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Ícono opcional a la izquierda (ej. `lucide-react`). */
  leadingIcon?: ReactNode;
  className?: string;
}

export const fieldControlClasses =
  "h-14 w-full rounded-md border border-border bg-[#FAFBFD] px-4 text-base text-text-primary " +
  "placeholder:text-text-tertiary transition-[border-color,box-shadow] duration-fast ease-standard " +
  "focus:border-primary-2 focus:outline-none focus:shadow-[0_0_0_4px_rgba(74,69,255,.1)] " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leadingIcon, className, ...rest },
  ref,
) {
  return (
    <div className="relative">
      {leadingIcon && (
        <span
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
          aria-hidden="true"
        >
          {leadingIcon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(fieldControlClasses, leadingIcon && "pl-11", className)}
        {...rest}
      />
    </div>
  );
});
