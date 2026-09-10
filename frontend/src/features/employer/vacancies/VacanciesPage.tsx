import { useState } from "react";
import { useNavigate } from "react-router";
import { Briefcase } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Badge, Button, Card, EmptyState, Eyebrow, FilterPills, Reveal, RevealGroup, Skeleton } from "@/components/ui";
import { useJobFamilies, useVacancies } from "@/api/hooks";
import type { VacancyStatus } from "@/api/types";
import { VACANCY_STATUS_LABELS, jobFamilyName } from "@/features/employer/vacancies/vacancies.shared";

type FilterValue = "all" | VacancyStatus;

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "OPEN", label: "Abiertas" },
  { value: "DRAFT", label: "Borrador" },
  { value: "CLOSED", label: "Cerradas" },
];

const STATUS_TONE: Record<VacancyStatus, "success" | "neutral" | "warning"> = {
  OPEN: "success",
  DRAFT: "neutral",
  CLOSED: "warning",
};

const GHOST_ON_DARK =
  "!border-white/20 !bg-white/[0.06] !text-text-on-dark hover:!border-white/35 hover:!bg-white/[0.1]";

/** E6 — Vacantes `/employer/vacancies`. */
export function VacanciesPage() {
  const navigate = useNavigate();
  const vacanciesQuery = useVacancies();
  const jobFamiliesQuery = useJobFamilies();
  const [filter, setFilter] = useState<FilterValue>("all");

  const vacancies = vacanciesQuery.data ?? [];
  const filtered = filter === "all" ? vacancies : vacancies.filter((v) => v.status === filter);

  return (
    <PageContainer className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>Reclutamiento</Eyebrow>
          <h1 className="mt-1 text-balance text-3xl font-semibold tracking-[-0.03em] text-text-on-dark sm:text-4xl">
            Vacantes
          </h1>
          <p className="mt-2 max-w-[52ch] text-pretty text-text-on-dark-secondary">
            Administra tus vacantes y su estado de matching.
          </p>
        </div>
        <Button variant="primary" arrow onClick={() => navigate("/employer/vacancies/new")}>
          Nueva vacante
        </Button>
      </div>

      <div className="mt-6">
        <FilterPills options={FILTER_OPTIONS} value={filter} onChange={(v) => setFilter(v as FilterValue)} aria-label="Filtrar por estado" />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {vacanciesQuery.isLoading ? (
          <>
            <Skeleton className="skeleton-shimmer--dark h-24 w-full" />
            <Skeleton className="skeleton-shimmer--dark h-24 w-full" />
            <Skeleton className="skeleton-shimmer--dark h-24 w-full" />
          </>
        ) : vacanciesQuery.isError ? (
          <p className="text-sm text-danger-on-dark">No pudimos cargar tus vacantes. Intenta recargar la página.</p>
        ) : vacancies.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Aún no tienes vacantes activas."
            description="Crea tu primera vacante para comenzar a comparar talento verificado."
            cta={{ label: "Crear vacante", onClick: () => navigate("/employer/vacancies/new") }}
          />
        ) : filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-sm text-text-on-dark-secondary">
            No hay vacantes en este estado.
          </p>
        ) : (
          <RevealGroup className="flex flex-col gap-3" as="div">
            {filtered.map((vacancy) => (
              <Reveal key={vacancy.id}>
                <Card variant="glass" spotlight padding="md" className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-text-on-dark">{vacancy.title}</p>
                      <Badge tone={STATUS_TONE[vacancy.status]}>{VACANCY_STATUS_LABELS[vacancy.status]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-text-on-dark-secondary">
                      {jobFamilyName(jobFamiliesQuery.data, vacancy.job_family_id)} · {vacancy.positions_count} posición(es) ·{" "}
                      {vacancy.shortlist_count} en selección
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="secondary" className={GHOST_ON_DARK} onClick={() => navigate(`/employer/vacancies/${vacancy.id}`)}>
                      Editar
                    </Button>
                    <Button variant="primary" arrow onClick={() => navigate(`/employer/vacancies/${vacancy.id}/talent`)}>
                      Ver talento
                    </Button>
                  </div>
                </Card>
              </Reveal>
            ))}
          </RevealGroup>
        )}
      </div>
    </PageContainer>
  );
}

export { VacanciesPage as Component };
