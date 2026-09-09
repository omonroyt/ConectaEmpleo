import { cloneElement, isValidElement, type ReactElement } from "react";
import { AlertCircle } from "lucide-react";
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
  className,
  children,
}: FormFieldProps) {
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
      <label htmlFor={htmlFor} className="text-sm font-medium text-text-primary">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {control}
      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-text-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
