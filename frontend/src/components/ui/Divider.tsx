import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
}

export function Divider({ orientation = "horizontal", tone, className }: DividerProps) {
  const resolved = useSurfaceTone(tone);
  const colorClass = resolved === "dark" ? "bg-border-dark" : "bg-border";

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        colorClass,
        className,
      )}
    />
  );
}
