import { cloneElement, isValidElement, type ReactElement } from "react";
import { AlertCircle } from "lucide-react";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

interface ControlProps {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export interface FormFieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
  children: ReactElement<ControlProps>;
}

/**
 * Envuelve un control (`Input`/`Textarea`/`Select`/...) con label, hint y
 * error. Inyecta `id`/`aria-describedby`/`aria-invalid` en el control hijo
 * para que la asociación de accesibilidad sea real, no solo visual.
 */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  tone,
  className,
  children,
}: FormFieldProps) {
  const resolved = useSurfaceTone(tone);
  const hintId = `${htmlFor}-hint`;
  const errorId = `${htmlFor}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: htmlFor,
        "aria-describedby": describedBy,
        "aria-invalid": Boolean(error),
      })
    : children;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className={cn(
          "text-sm font-medium",
          resolved === "dark" ? "text-text-on-dark" : "text-text-primary",
        )}
      >
        {label}
        {required && (
          <span
            className={resolved === "dark" ? "text-danger-on-dark" : "text-danger"}
            aria-hidden="true"
          >
            {" "}
            *
          </span>
        )}
      </label>
      {control}
      {error ? (
        <p
          id={errorId}
          className={cn(
            "flex items-center gap-1.5 text-sm",
            resolved === "dark" ? "text-danger-on-dark" : "text-danger",
          )}
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p
          id={hintId}
          className={cn(
            "text-sm",
            resolved === "dark" ? "text-text-on-dark-tertiary" : "text-text-secondary",
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
