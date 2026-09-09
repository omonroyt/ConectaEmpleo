import { Check } from "lucide-react";
import { usePlans } from "@/api/hooks";
import { PageContainer } from "@/components/layout";
import { Badge, Button, Card, PageHeader, Skeleton } from "@/components/ui";
import { formatMXN } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Stub P2 (04 §E13): planes/facturación. Sin pagos reales: el CTA queda
 * deshabilitado con "Próximamente" en los tres planes.
 */
export function PlansPage() {
  const plansQuery = usePlans();
  const plans = plansQuery.data ?? [];

  return (
    <PageContainer className="py-10">
      <PageHeader
        title="Planes"
        subtitle="Elige el plan que mejor se ajuste al volumen de vacantes de tu empresa."
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plansQuery.isLoading ? (
          <>
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </>
        ) : plansQuery.isError ? (
          <p className="text-sm text-danger sm:col-span-2 lg:col-span-3">
            No pudimos cargar los planes. Intenta recargar la página.
          </p>
        ) : (
          plans.map((plan) => (
            <Card
              key={plan.id}
              variant={plan.highlighted ? "dark" : "light"}
              padding="lg"
              background={plan.highlighted ? { asset: "cards", presence: "accent" } : undefined}
              className={cn("flex flex-col gap-4", plan.highlighted && "border-primary-2")}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className={cn("text-lg font-semibold", plan.highlighted ? "text-text-on-dark" : "text-text-primary")}>
                  {plan.name}
                </h2>
                {plan.highlighted && <Badge tone="info">Recomendado</Badge>}
              </div>
              <p className={cn("text-3xl font-semibold", plan.highlighted ? "text-text-on-dark" : "text-text-primary")}>
                {formatMXN(plan.price_mxn)}
                <span
                  className={cn(
                    "ml-1 text-sm font-normal",
                    plan.highlighted ? "text-text-on-dark-secondary" : "text-text-secondary",
                  )}
                >
                  / mes
                </span>
              </p>
              <ul className="flex flex-1 flex-col gap-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={cn(
                      "flex items-start gap-2 text-sm",
                      plan.highlighted ? "text-text-on-dark-secondary" : "text-text-secondary",
                    )}
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.highlighted ? "primary" : "secondary"}
                size="md"
                disabled
                className="w-full justify-center"
                title="Los pagos aún no están disponibles en esta demo."
              >
                Próximamente
              </Button>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
}

export { PlansPage as Component };
