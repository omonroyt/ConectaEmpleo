import type { ComponentType } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, type CardVariant } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DATA_DURATION_MS, useAnimatedNumber } from "@/lib/motion";
import { cn } from "@/lib/cn";

export interface MetricCardProps {
  icon: ComponentType<{ className?: string }>;
  value: number;
  label: string;
  suffix?: string;
  delta?: { value: number; direction: "up" | "down" };
  /** Superficie del `Card` interno. Default: `glass` (lienzo oscuro). */
  variant?: CardVariant;
  className?: string;
}

export function MetricCard({
  icon: Icon,
  value,
  label,
  suffix,
  delta,
  variant = "glass",
  className,
}: MetricCardProps) {
  const isDark = variant === "dark" || variant === "glass";
  // Cuando el sufijo es "%" el valor es un porcentaje: además de contar,
  // se refuerza con una `ProgressBar` que carga de 0 al valor (ver §4).
  const isPercent = suffix === "%";
  // Cuenta al entrar en pantalla (no al montar), como cualquier dato de la app.
  const { ref, display } = useAnimatedNumber<HTMLDivElement>(value, {
    durationMs: DATA_DURATION_MS,
  });

  return (
    <Card variant={variant} padding="md" className={className}>
      <div ref={ref} className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-md",
            isDark ? "bg-primary/20 text-primary-on-dark" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              "text-2xl font-bold tabular-nums",
              isDark ? "text-text-on-dark" : "text-text-primary",
            )}
          >
            {Math.round(display)}
            {suffix}
          </p>
          <p className={cn("truncate text-sm", isDark ? "text-text-on-dark-secondary" : "text-text-secondary")}>
            {label}
          </p>
        </div>
      </div>
      {isPercent && (
        <ProgressBar value={value} tone={isDark ? "dark" : "light"} size="sm" className="mt-3" />
      )}
      {delta && (
        <p
          className={cn(
            "mt-2 flex items-center gap-1 text-xs font-medium",
            delta.direction === "up"
              ? isDark
                ? "text-success-on-dark"
                : "text-success"
              : isDark
                ? "text-danger-on-dark"
                : "text-danger",
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
