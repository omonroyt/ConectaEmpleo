import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Briefcase } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Badge, Button, Card, ProgressBar, SkeletonCard, useToast } from "@/components/ui";
import { useJobFamilies, useRunMatch, useShortlist, useVacancy } from "@/api/hooks";
import type { ShortlistStage } from "@/api/types";
import {
  REQUIREMENT_KIND_LABELS,
  VACANCY_STATUS_LABELS,
  WEIGHT_COMPONENT_ORDER,
  WEIGHT_LABELS,
  WORK_MODE_LABELS,
  formatSalaryRange,
  jobFamilyName,
} from "@/features/employer/vacancies/vacancies.shared";
import { formatMXN } from "@/lib/format";

const STAGE_LABELS: Record<ShortlistStage, string> = {
  REVIEW: "En revisión",
  INTERVIEW: "Entrevista",
  FINALIST: "Finalistas",
};

/** E7 — Detalle de vacante `/employer/vacancies/:id`. */
export function VacancyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const vacancyQuery = useVacancy(id);
  const jobFamiliesQuery = useJobFamilies();
  const shortlistQuery = useShortlist(id);
  const runMatch = useRunMatch();
  const [isMatching, setIsMatching] = useState(false);

  async function handleRunMatch() {
    if (!id) return;
    setIsMatching(true);
    try {
      const jobRef = await runMatch.mutateAsync(id);
      navigate(`/employer/vacancies/${id}/talent?job=${jobRef.job_id}`);
    } catch {
      showToast({ title: "No pudimos iniciar el matching", description: "Intenta de nuevo.", tone: "danger" });
      setIsMatching(false);
    }
  }

  if (vacancyQuery.isLoading) {
    return (
      <PageContainer className="py-10">
        <SkeletonCard />
      </PageContainer>
    );
  }

  if (vacancyQuery.isError || !vacancyQuery.data) {
    return (
      <PageContainer className="py-10">
        <p className="text-sm text-danger">No pudimos cargar esta vacante. Intenta recargar la página.</p>
      </PageContainer>
    );
  }

  const vacancy = vacancyQuery.data;
  const shortlist = shortlistQuery.data ?? [];
  const stageCounts: Record<ShortlistStage, number> = {
    REVIEW: shortlist.filter((s) => s.stage === "REVIEW").length,
    INTERVIEW: shortlist.filter((s) => s.stage === "INTERVIEW").length,
    FINALIST: shortlist.filter((s) => s.stage === "FINALIST").length,
  };

  return (
    <PageContainer className="py-10">
      <div className="flex flex-col gap-8">
        <Card
          variant="dark"
          padding="lg"
          background={{ asset: "cards", presence: "accent", overlay: "full" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-text-on-dark-secondary">
                {jobFamilyName(jobFamiliesQuery.data, vacancy.job_family_id)}
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-text-on-dark sm:text-3xl">{vacancy.title}</h1>
            </div>
            <Badge tone={vacancy.status === "OPEN" ? "success" : vacancy.status === "CLOSED" ? "warning" : "neutral"}>
              {VACANCY_STATUS_LABELS[vacancy.status]}
            </Badge>
          </div>
          <div className="mt-5 grid gap-3 text-sm text-text-on-dark-secondary sm:grid-cols-2 lg:grid-cols-4">
            <p>{vacancy.location ? `${vacancy.location.city}, ${vacancy.location.state}` : "Sin ubicación"}</p>
            <p>{WORK_MODE_LABELS[vacancy.work_mode] ?? vacancy.work_mode}</p>
            <p>{formatSalaryRange(vacancy.salary_min, vacancy.salary_max, formatMXN)}</p>
            <p>
              {vacancy.positions_count} posición{vacancy.positions_count === 1 ? "" : "es"}
            </p>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-text-on-dark-secondary">{vacancy.description}</p>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <section className="rounded-lg border border-border bg-surface p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-text-primary">Requisitos</h2>
                <Link to={`/employer/vacancies/${vacancy.id}/ideal-profile`} className="text-sm font-medium text-primary hover:underline">
                  Editar perfil ideal
                </Link>
              </div>
              {vacancy.requirements.length === 0 ? (
                <p className="mt-3 text-sm text-text-secondary">Aún no has definido requisitos para esta vacante.</p>
              ) : (
                <ul className="mt-4 flex flex-col gap-2.5">
                  {vacancy.requirements.map((req) => (
                    <li key={req.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-text-primary">{req.label}</span>
                      <span className="flex shrink-0 items-center gap-2 text-text-secondary">
                        <Badge tone={req.kind === "MANDATORY" ? "info" : "neutral"}>
                          {REQUIREMENT_KIND_LABELS[req.kind]}
                        </Badge>
                        Nivel {req.min_level}/4
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-border bg-surface p-6">
              <h2 className="text-base font-semibold text-text-primary">Prioridades del matching</h2>
              <div className="mt-4 flex flex-col gap-4">
                {WEIGHT_COMPONENT_ORDER.map((component) => (
                  <ProgressBar
                    key={component}
                    label={WEIGHT_LABELS[component]}
                    value={vacancy.weights[component]}
                    showValue
                  />
                ))}
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-6">
            <section className="rounded-lg border border-border bg-surface p-6">
              <h2 className="text-base font-semibold text-text-primary">Matching</h2>
              {vacancy.last_match_run_id ? (
                <>
                  <p className="mt-2 text-sm text-text-secondary">Ya generamos un ranking de talento para esta vacante.</p>
                  <Button
                    variant="primary"
                    arrow
                    className="mt-4 w-full"
                    onClick={() => navigate(`/employer/vacancies/${vacancy.id}/talent`)}
                  >
                    Ver ranking
                  </Button>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm text-text-secondary">Aún no has ejecutado el matching para esta vacante.</p>
                  <Button variant="primary" arrow className="mt-4 w-full" loading={isMatching} onClick={handleRunMatch}>
                    Buscar talento
                  </Button>
                </>
              )}
            </section>

            <section className="rounded-lg border border-border bg-surface p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-text-primary">Finalistas</h2>
                <Link
                  to={`/employer/vacancies/${vacancy.id}/shortlist`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ver selección
                </Link>
              </div>
              {shortlist.length === 0 ? (
                <p className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
                  <Briefcase className="size-4 shrink-0" aria-hidden="true" />
                  Aún no hay candidatos en tu proceso de selección.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  {(Object.keys(STAGE_LABELS) as ShortlistStage[]).map((stage) => (
                    <div key={stage} className="rounded-md bg-surface-soft p-3">
                      <p className="text-xl font-semibold text-text-primary">{stageCounts[stage]}</p>
                      <p className="text-xs text-text-secondary">{STAGE_LABELS[stage]}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export { VacancyDetailPage as Component };
