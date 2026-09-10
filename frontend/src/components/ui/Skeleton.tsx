import type { HTMLAttributes } from "react";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
}

/** Bloque shimmer (1.6s) para placeholders de carga. Elige el degradado claro u oscuro según el tono. */
export function Skeleton({ tone, className, ...rest }: SkeletonProps) {
  const resolved = useSurfaceTone(tone);
  return (
    <div
      aria-hidden="true"
      className={cn(
        "skeleton-shimmer rounded-md",
        resolved === "dark" && "skeleton-shimmer--dark",
        className,
      )}
      {...rest}
    />
  );
}

export interface SkeletonCardProps {
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
}

/** Placeholder de una card genérica (avatar + título + líneas de texto). */
export function SkeletonCard({ tone, className }: SkeletonCardProps) {
  const resolved = useSurfaceTone(tone);
  const isDark = resolved === "dark";

  return (
    <div
      className={cn(
        "rounded-lg border p-6",
        isDark ? "border-border-glass bg-white/[0.04]" : "border-border bg-surface",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton tone={resolved} className="size-11 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton tone={resolved} className="h-4 w-1/2" />
          <Skeleton tone={resolved} className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton tone={resolved} className="h-3 w-full" />
        <Skeleton tone={resolved} className="h-3 w-5/6" />
      </div>
    </div>
  );
}
