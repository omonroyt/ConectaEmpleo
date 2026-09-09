import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  cta?: { label: string; onClick: () => void };
  className?: string;
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, cta, className, children }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface-soft/60 p-10 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-surface text-text-tertiary">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {description && <p className="max-w-sm text-sm text-text-secondary">{description}</p>}
      {cta && (
        <Button variant="secondary" size="md" onClick={cta.onClick} className="mt-2">
          {cta.label}
        </Button>
      )}
      {children}
    </div>
  );
}
