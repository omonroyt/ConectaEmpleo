import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
}

/** Pill de selección/tag. Con `onClick` es un botón toggle; con `onRemove` agrega una X. */
export function Chip({ children, selected = false, onClick, onRemove, tone, className }: ChipProps) {
  const resolved = useSurfaceTone(tone);
  const isDark = resolved === "dark";

  const classes = cn(
    "inline-flex h-9 items-center gap-1.5 rounded-pill px-3.5 text-sm font-medium transition-colors duration-fast ease-standard",
    selected
      ? "bg-primary text-white"
      : isDark
        ? "bg-white/[0.08] text-text-on-dark-secondary"
        : "bg-surface-soft text-text-secondary",
    className,
  );

  const removeControl = onRemove && (
    <span
      role="button"
      tabIndex={0}
      aria-label="Quitar"
      onClick={(event) => {
        event.stopPropagation();
        onRemove();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onRemove();
        }
      }}
      className={cn(
        "-mr-1 flex size-4 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2",
        isDark ? "hover:bg-white/15" : "hover:bg-black/10",
      )}
    >
      <X className="size-3" aria-hidden="true" />
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={cn(
          classes,
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2",
          selected
            ? "hover:bg-primary/90"
            : isDark
              ? "hover:bg-primary/20 hover:text-primary-on-dark"
              : "hover:bg-primary/10 hover:text-primary",
        )}
      >
        {children}
        {removeControl}
      </button>
    );
  }

  return (
    <span className={classes}>
      {children}
      {removeControl}
    </span>
  );
}
