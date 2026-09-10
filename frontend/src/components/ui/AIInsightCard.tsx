import { Card, type CardVariant } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useSurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface AIInsightCardProps {
  title: string;
  why: string[];
  missing: string[];
  body?: string;
  cta?: { label: string; onClick: () => void };
  loading?: boolean;
  /**
   * Superficie del `Card` interno. Por defecto la deduce del panel que la
   * contiene: `light` dentro de un panel claro, `glass` sobre el lienzo. Así
   * no hay que acordarse de pasarla en cada llamador.
   */
  variant?: CardVariant;
  className?: string;
}

/** Card de explicación asistida por IA: eyebrow fijo, "por qué" / "falta evidencia". */
export function AIInsightCard({
  title,
  why,
  missing,
  body,
  cta,
  loading = false,
  variant,
  className,
}: AIInsightCardProps) {
  const inheritedTone = useSurfaceTone();
  const resolvedVariant: CardVariant = variant ?? (inheritedTone === "light" ? "light" : "glass");
  const isDark = resolvedVariant === "dark" || resolvedVariant === "glass";

  return (
    <Card variant={resolvedVariant} padding="lg" className={cn("relative", className)}>
      <Eyebrow tone={isDark ? "dark" : "light"}>Basado en la evidencia disponible</Eyebrow>
      <h3
        className={cn(
          "mt-2 text-balance text-lg font-semibold",
          isDark ? "text-text-on-dark" : "text-text-primary",
        )}
      >
        {title}
      </h3>

      {loading ? (
        <div className="mt-4 space-y-2" aria-live="polite" aria-busy="true">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <p className={cn("mt-2 text-sm", isDark ? "text-text-on-dark-tertiary" : "text-text-tertiary")}>
            Redactando explicación…
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-sm">
          {body && (
            <p className={cn("text-pretty", isDark ? "text-text-on-dark-secondary" : "text-text-secondary")}>
              {body}
            </p>
          )}
          {why.length > 0 && (
            <div>
              <p className={cn("font-medium", isDark ? "text-text-on-dark" : "text-text-primary")}>Por qué</p>
              <ul
                className={cn(
                  "mt-1 list-disc space-y-1 pl-5",
                  isDark ? "text-text-on-dark-secondary" : "text-text-secondary",
                )}
              >
                {why.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {missing.length > 0 && (
            <div>
              <p className={cn("font-medium", isDark ? "text-text-on-dark" : "text-text-primary")}>
                Falta evidencia
              </p>
              <ul
                className={cn(
                  "mt-1 list-disc space-y-1 pl-5",
                  isDark ? "text-text-on-dark-secondary" : "text-text-secondary",
                )}
              >
                {missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {cta && (
            <Button variant="ghost" size="md" onClick={cta.onClick} arrow className="-ml-4 mt-1">
              {cta.label}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
