import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { fieldControlClassesFor } from "@/components/ui/Input";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  options: SelectOption[];
  placeholder?: string;
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
}

/** Select nativo (accesibilidad y teclado del navegador) con chevron custom. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, tone, className, defaultValue, value, ...rest },
  ref,
) {
  // Un <select> de React no puede recibir `value` y `defaultValue` a la vez
  // (warning "must be either controlled or uncontrolled"): si el caller pasa
  // `value` (uso controlado, el caso común en este proyecto), no se aplica
  // el `defaultValue` por defecto de abajo.
  const isControlled = value !== undefined;
  const resolved = useSurfaceTone(tone);
  return (
    <div className="relative">
      <select
        ref={ref}
        value={value}
        defaultValue={isControlled ? undefined : (defaultValue ?? (placeholder ? "" : undefined))}
        className={cn(
          "h-14 appearance-none pr-10",
          fieldControlClassesFor(resolved),
          // El menú desplegable lo pinta el sistema operativo: sobre tono
          // oscuro hay que fijar el color de las <option> o quedan blancas
          // sobre blanco en Windows/Chrome.
          resolved === "dark" && "[&>option]:bg-surface-dark [&>option]:text-text-on-dark",
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
        className={cn(
          "pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2",
          resolved === "dark" ? "text-text-on-dark-tertiary" : "text-text-tertiary",
        )}
        aria-hidden="true"
      />
    </div>
  );
});
