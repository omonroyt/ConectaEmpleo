import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

/** Select nativo (accesibilidad y teclado del navegador) con chevron custom. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, className, defaultValue, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        defaultValue={defaultValue ?? (placeholder ? "" : undefined)}
        className={cn(
          "h-14 w-full appearance-none rounded-md border border-border bg-[#FAFBFD] px-4 pr-10 text-base text-text-primary",
          "transition-[border-color,box-shadow] duration-fast ease-standard",
          "focus:border-primary-2 focus:outline-none focus:shadow-[0_0_0_4px_rgba(74,69,255,.1)]",
          "disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger",
          className,
        )}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
        aria-hidden="true"
      />
    </div>
  );
});
