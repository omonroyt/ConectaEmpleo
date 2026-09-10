import type { ComponentType } from "react";
import { Briefcase, Lock, Users } from "lucide-react";
import { Navigate, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout";
import { Badge, Button, Card, EmptyState, Eyebrow, Reveal, RevealGroup, Skeleton } from "@/components/ui";
import { api } from "@/api";
import { useCompanyMe, useJobFamilies, useVacancies, useVerification } from "@/api/hooks";
import { VerificationBadge, VerificationCard } from "@/features/employer/company/VerificationCard";
import { useAnimatedNumber } from "@/lib/motion";
import { cn } from "@/lib/cn";

interface MetricTileProps {
  icon: ComponentType<{ className?: string }>;
  value: number;
  label: string;
}

/** Tarjeta de métrica sobre el lienzo: número que cuenta de 0 al valor al entrar en pantalla. */
function MetricTile({ icon: Icon, value, label }: MetricTileProps) {
  const { ref, display } = useAnimatedNumber<HTMLDivElement>(value, { durationMs: 1200 });

  return (
    <Card variant="glass" padding="md">
      <div ref={ref} className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-white/[0.08] text-primary-on-dark">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums text-text-on-dark">{Math.round(display)}</p>
          <p className="text-pretty text-sm leading-snug text-text-on-dark-secondary">{label}</p>
        </div>
      </div>
    </Card>
  );
}

/** E2 — Home empresa `/employer`. */
export function HomePage() {
  const navigate = useNavigate();
  const companyQuery = useCompanyMe();
  const verificationQuery = useVerification(Boolean(companyQuery.data));
  const vacanciesQuery = useVacancies(Boolean(companyQuery.data));
  const jobFamiliesQuery = useJobFamilies();

  const vacancyIds = (vacanciesQuery.data ?? []).map((v) => v.id);
  const unlocksQuery = useQuery({
    queryKey: ["employer", "unlocks", vacancyIds.join(",")],
    queryFn: async () => {
      const lists = await Promise.all(vacancyIds.map((id) => api.matching.shortlist(id)));
      return lists.flat().filter((entry) => entry.is_unlocked).length;
    },
    enabled: vacancyIds.length > 0,
  });

  if (companyQuery.isLoading) {
    return (
      <PageContainer className="py-10">
        <div className="flex flex-col gap-4">
          <Skeleton className="skeleton-shimmer--dark h-10 w-64" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="skeleton-shimmer--dark h-24 w-full" />
            <Skeleton className="skeleton-shimmer--dark h-24 w-full" />
            <Skeleton className="skeleton-shimmer--dark h-24 w-full" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (companyQuery.isError) {
    return (
      <PageContainer className="py-10">
        <EmptyState icon={Lock} title="No pudimos cargar tu empresa" description="Intenta recargar la página." />
      </PageContainer>
    );
  }

  const company = companyQuery.data;
  if (company && !company.trade_name.trim()) {
    return <Navigate to="/employer/onboarding" replace />;
  }

  const vacancies = vacanciesQuery.data ?? [];
  const activeVacancies = vacancies.filter((v) => v.status === "OPEN").length;
  const shortlistTotal = vacancies.reduce((acc, v) => acc + v.shortlist_count, 0);

  function familyName(jobFamilyId: string): string {
    return jobFamiliesQuery.data?.find((f) => f.id === jobFamilyId)?.name ?? "—";
  }

  return (
    <PageContainer className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>Tu empresa</Eyebrow>
          <h1 className="mt-1 text-balance text-3xl font-semibold tracking-[-0.03em] text-text-on-dark sm:text-4xl">
            {company?.trade_name || "Tu empresa"}
          </h1>
          <p className="mt-2 max-w-[52ch] text-pretty text-text-on-dark-secondary">
            Resumen de tu actividad de reclutamiento.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {company && <VerificationBadge status={company.verification_status} />}
          <Button variant="primary" arrow onClick={() => navigate("/employer/vacancies/new")}>
            Nueva vacante
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevealGroup className="grid gap-4 sm:grid-cols-3">
            <Reveal>
              <MetricTile icon={Briefcase} value={activeVacancies} label="Vacantes activas" />
            </Reveal>
            <Reveal>
              <MetricTile icon={Users} value={shortlistTotal} label="Candidatos en selección" />
            </Reveal>
            <Reveal>
              <MetricTile icon={Lock} value={unlocksQuery.data ?? 0} label="Desbloqueos" />
            </Reveal>
          </RevealGroup>

          <h2 className="mt-8 text-lg font-semibold text-text-on-dark">Tus vacantes</h2>
          {vacanciesQuery.isLoading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="skeleton-shimmer--dark h-20 w-full" />
              <Skeleton className="skeleton-shimmer--dark h-20 w-full" />
            </div>
          ) : vacancies.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={Briefcase}
              title="Aún no tienes vacantes activas."
              description="Crea tu primera vacante para comenzar a comparar talento verificado."
              cta={{ label: "Crear vacante", onClick: () => navigate("/employer/vacancies/new") }}
            />
          ) : (
            <RevealGroup className="mt-4 flex flex-col gap-3" as="div">
              {vacancies.map((vacancy) => (
                <Reveal key={vacancy.id}>
                  <Card
                    variant="glass"
                    spotlight
                    padding="md"
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text-on-dark">{vacancy.title}</p>
                      <p className="text-sm text-text-on-dark-secondary">
                        {familyName(vacancy.job_family_id)} · {vacancy.positions_count} posición(es)
                      </p>
                      <Badge tone={vacancy.last_match_run_id ? "success" : "neutral"} className="mt-2">
                        {vacancy.last_match_run_id ? "Ranking listo" : "Sin matching aún"}
                      </Badge>
                    </div>
                    <Button
                      variant="secondary"
                      arrow
                      className={cn(
                        "!border-white/20 !bg-white/[0.06] !text-text-on-dark hover:!border-white/35 hover:!bg-white/[0.1]",
                      )}
                      onClick={() => navigate(`/employer/vacancies/${vacancy.id}/talent`)}
                    >
                      Ver talento
                    </Button>
                  </Card>
                </Reveal>
              ))}
            </RevealGroup>
          )}
        </div>

        <RevealGroup>
          <Reveal>
            <VerificationCard verification={verificationQuery.data} loading={verificationQuery.isLoading} />
          </Reveal>
        </RevealGroup>
      </div>
    </PageContainer>
  );
}

export { HomePage as Component };
