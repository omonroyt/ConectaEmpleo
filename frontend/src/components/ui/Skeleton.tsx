import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/** Bloque shimmer (1.6s) para placeholders de carga. */
export function Skeleton({ className, ...rest }: SkeletonProps) {
  return <div aria-hidden="true" className={cn("skeleton-shimmer rounded-md", className)} {...rest} />;
}

export interface SkeletonCardProps {
  className?: string;
}

/** Placeholder de una card genérica (avatar + título + líneas de texto). */
export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-6", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  );
}
