import { Chip } from "@/components/ui/Chip";
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
  className,
}: ChipGroupProps<T>) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium text-text-primary">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip key={option.value} selected={value === option.value} onClick={() => onChange(option.value)}>
            {option.label}
          </Chip>
        ))}
      </div>
      {error ? (
        <p className="text-sm text-danger">{error}</p>
      ) : hint ? (
        <p className="text-sm text-text-secondary">{hint}</p>
      ) : null}
    </div>
  );
}
