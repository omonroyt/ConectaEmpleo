import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export interface AIInsightCardProps {
  title: string;
  why: string[];
  missing: string[];
  body?: string;
  cta?: { label: string; onClick: () => void };
  loading?: boolean;
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
  className,
}: AIInsightCardProps) {
  return (
    <Card padding="lg" className={cn("relative", className)}>
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
        Basado en la evidencia disponible
      </p>
      <h3 className="mt-2 text-lg font-semibold text-text-primary">{title}</h3>

      {loading ? (
        <div className="mt-4 space-y-2" aria-live="polite" aria-busy="true">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <p className="mt-2 text-sm text-text-tertiary">Redactando explicación…</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-sm">
          {body && <p className="text-text-secondary">{body}</p>}
          {why.length > 0 && (
            <div>
              <p className="font-medium text-text-primary">Por qué</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-text-secondary">
                {why.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {missing.length > 0 && (
            <div>
              <p className="font-medium text-text-primary">Falta evidencia</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-text-secondary">
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
