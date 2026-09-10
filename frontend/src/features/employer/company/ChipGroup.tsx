import { Chip } from "@/components/ui/Chip";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface ChipGroupOption<T extends string> {
  value: T;
  label: string;
}

export interface ChipGroupProps<T extends string> {
  label: string;
  options: ChipGroupOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
  hint?: string;
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
}

/**
 * Grupo de `Chip` de selección única con semántica de radiogroup. Usado para
 * tamaño de empresa, modalidad de trabajo, etc. (opciones de 3-4, no encajan
 * en `SegmentedControl` que la spec reserva para 2-3).
 */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  hint,
  tone,
  className,
}: ChipGroupProps<T>) {
  const resolved = useSurfaceTone(tone);
  const labelClass = resolved === "dark" ? "text-text-on-dark" : "text-text-primary";
  const errorClass = resolved === "dark" ? "text-danger-on-dark" : "text-danger";
  const hintClass = resolved === "dark" ? "text-text-on-dark-secondary" : "text-text-secondary";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className={cn("text-sm font-medium", labelClass)}>{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip key={option.value} selected={value === option.value} onClick={() => onChange(option.value)}>
            {option.label}
          </Chip>
        ))}
      </div>
      {error ? (
        <p className={cn("text-sm", errorClass)}>{error}</p>
      ) : hint ? (
        <p className={cn("text-sm", hintClass)}>{hint}</p>
      ) : null}
    </div>
  );
}
