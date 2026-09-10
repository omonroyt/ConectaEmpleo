import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Ícono opcional a la izquierda (ej. `lucide-react`). */
  leadingIcon?: ReactNode;
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
}

/** Clases compartidas por Input / Textarea / Select según el tono del panel. */
export function fieldControlClassesFor(tone: SurfaceTone): string {
  const base =
    "w-full rounded-md border px-4 text-base transition-[border-color,box-shadow,background-color] duration-fast ease-standard " +
    "focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

  return tone === "dark"
    ? cn(
        base,
        "border-border-glass bg-white/[0.05] text-text-on-dark placeholder:text-text-on-dark-tertiary",
        "hover:border-white/25",
        "focus:border-primary-2 focus:bg-white/[0.08] focus:shadow-[0_0_0_4px_rgba(74,69,255,.18)]",
        "aria-[invalid=true]:border-danger-on-dark",
      )
    : cn(
        base,
        "border-border bg-[#FAFBFD] text-text-primary placeholder:text-text-tertiary",
        "focus:border-primary-2 focus:shadow-[0_0_0_4px_rgba(74,69,255,.1)]",
        "aria-[invalid=true]:border-danger",
      );
}

/** @deprecated Usar `fieldControlClassesFor(tone)`; se mantiene para el tono claro. */
export const fieldControlClasses = cn("h-14", fieldControlClassesFor("light"));

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leadingIcon, tone, className, ...rest },
  ref,
) {
  const resolved = useSurfaceTone(tone);

  return (
    <div className="relative">
      {leadingIcon && (
        <span
          className={cn(
            "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2",
            resolved === "dark" ? "text-text-on-dark-tertiary" : "text-text-tertiary",
          )}
          aria-hidden="true"
        >
          {leadingIcon}
        </span>
      )}
      <input
        ref={ref}
        className={cn("h-14", fieldControlClassesFor(resolved), leadingIcon && "pl-11", className)}
        {...rest}
      />
    </div>
  );
});
