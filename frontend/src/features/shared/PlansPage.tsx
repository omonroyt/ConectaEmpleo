import { Check } from "lucide-react";
import { usePlans } from "@/api/hooks";
import { PageContainer } from "@/components/layout";
import { Badge, Button, Card, PageHeader, Reveal, RevealGroup, Skeleton } from "@/components/ui";
import { formatMXN } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Planes y facturación. Los pagos todavía no están habilitados, así que el
 * CTA de los tres planes queda deshabilitado con "Próximamente".
 */
export function PlansPage() {
  const plansQuery = usePlans();
  const plans = plansQuery.data ?? [];

  return (
    <PageContainer className="py-10 md:py-14">
      <PageHeader
        eyebrow="Planes y facturación"
        title="Elige cómo quieres contratar"
        subtitle="Cada plan cambia cuántas vacantes puedes tener activas y cuánto talento puedes desbloquear."
      />

      {plansQuery.isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      ) : plansQuery.isError ? (
        <p className="mt-8 text-sm text-danger-on-dark">
          No pudimos cargar los planes. Intenta recargar la página.
        </p>
      ) : (
        <RevealGroup className="mt-8 grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Reveal key={plan.id} className="h-full">
              <Card
                variant="glass"
                padding="lg"
                background={plan.highlighted ? { asset: "cards", presence: "accent" } : undefined}
                className={cn(
                  "flex h-full flex-col gap-5",
                  // El plan recomendado se destaca con filo y halo de marca, no
                  // con altura extra: así las tres columnas mantienen la misma
                  // línea base y el CTA queda alineado.
                  plan.highlighted &&
                    "border-primary-2/70 shadow-[0_0_0_1px_rgba(74,69,255,.35),0_28px_70px_-30px_rgba(74,69,255,.9)]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-text-on-dark">{plan.name}</h2>
                  {plan.highlighted && <Badge tone="info">Recomendado</Badge>}
                </div>

                <p className="text-4xl font-semibold tracking-[-0.03em] tabular-nums text-text-on-dark">
                  {formatMXN(plan.price_mxn)}
                  <span className="ml-1.5 text-sm font-normal tracking-normal text-text-on-dark-secondary">
                    / mes
                  </span>
                </p>

                {/* `flex-1` en la lista ancla el botón al fondo de cada tarjeta,
                    así los tres CTA forman una línea limpia. */}
                <ul className="flex flex-1 flex-col gap-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm leading-relaxed text-text-on-dark-secondary"
                    >
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-success-on-dark"
                        aria-hidden="true"
                      />
                      <span className="text-pretty">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.highlighted ? "primary" : "secondary"}
                  size="md"
                  disabled
                  className="w-full justify-center"
                  title="Los pagos todavía no están habilitados."
                >
                  Próximamente
                </Button>
              </Card>
            </Reveal>
          ))}
        </RevealGroup>
      )}
    </PageContainer>
  );
}

export { PlansPage as Component };
