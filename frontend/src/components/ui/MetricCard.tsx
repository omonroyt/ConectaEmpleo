import type { ComponentType } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useCountUp } from "@/lib/motion";
import { cn } from "@/lib/cn";

export interface MetricCardProps {
  icon: ComponentType<{ className?: string }>;
  value: number;
  label: string;
  suffix?: string;
  delta?: { value: number; direction: "up" | "down" };
  className?: string;
}

export function MetricCard({ icon: Icon, value, label, suffix, delta, className }: MetricCardProps) {
  const animated = useCountUp(value, 900);

  return (
    <Card padding="md" className={className}>
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums text-text-primary">
            {Math.round(animated)}
            {suffix}
          </p>
          <p className="truncate text-sm text-text-secondary">{label}</p>
        </div>
      </div>
      {delta && (
        <p
          className={cn(
            "mt-2 flex items-center gap-1 text-xs font-medium",
            delta.direction === "up" ? "text-success" : "text-danger",
          )}
        >
          {delta.direction === "up" ? (
            <ArrowUp className="size-3.5" aria-hidden="true" />
          ) : (
            <ArrowDown className="size-3.5" aria-hidden="true" />
          )}
          {Math.abs(delta.value)}%
        </p>
      )}
    </Card>
  );
}
