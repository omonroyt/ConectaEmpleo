import { Briefcase, Lock, Users } from "lucide-react";
import { Navigate, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { PageContainer } from "@/components/layout";
import { Badge, Button, Card, EmptyState, MetricCard, PageHeader, SkeletonCard } from "@/components/ui";
import { api } from "@/api";
import { useCompanyMe, useJobFamilies, useVacancies, useVerification } from "@/api/hooks";
import { VerificationBadge, VerificationCard } from "@/features/employer/company/VerificationCard";
import { useMotionSafe } from "@/lib/motion";

/** E2 — Home empresa `/employer`. */
export function HomePage() {
  const navigate = useNavigate();
  const companyQuery = useCompanyMe();
  const verificationQuery = useVerification(Boolean(companyQuery.data));
  const vacanciesQuery = useVacancies(Boolean(companyQuery.data));
  const jobFamiliesQuery = useJobFamilies();
  const { fadeUp, staggerContainer, cardEntrance } = useMotionSafe();

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
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
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
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <PageHeader
          title={company?.trade_name || "Tu empresa"}
          subtitle="Resumen de tu actividad de reclutamiento."
          actions={
            <div className="flex items-center gap-3">
              {company && <VerificationBadge status={company.verification_status} />}
              <Button variant="primary" arrow onClick={() => navigate("/employer/vacancies/new")}>
                Nueva vacante
              </Button>
            </div>
          }
        />
      </motion.div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer(0.07)}
            className="grid gap-4 sm:grid-cols-3"
          >
            <motion.div variants={cardEntrance}>
              <MetricCard icon={Briefcase} value={activeVacancies} label="Vacantes activas" />
            </motion.div>
            <motion.div variants={cardEntrance}>
              <MetricCard icon={Users} value={shortlistTotal} label="Candidatos en selección" />
            </motion.div>
            <motion.div variants={cardEntrance}>
              <MetricCard icon={Lock} value={unlocksQuery.data ?? 0} label="Desbloqueos" />
            </motion.div>
          </motion.div>

          <h2 className="mt-8 text-lg font-semibold text-text-primary">Tus vacantes</h2>
          {vacanciesQuery.isLoading ? (
            <div className="mt-4 space-y-3">
              <SkeletonCard />
              <SkeletonCard />
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
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer(0.06)}
              className="mt-4 flex flex-col gap-3"
            >
              {vacancies.map((vacancy) => (
                <motion.div key={vacancy.id} variants={cardEntrance}>
                  <Card padding="md" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text-primary">{vacancy.title}</p>
                      <p className="text-sm text-text-secondary">
                        {familyName(vacancy.job_family_id)} · {vacancy.positions_count} posición(es)
                      </p>
                      <Badge tone={vacancy.last_match_run_id ? "success" : "neutral"} className="mt-2">
                        {vacancy.last_match_run_id ? "Ranking listo" : "Sin matching aún"}
                      </Badge>
                    </div>
                    <Button
                      variant="secondary"
                      arrow
                      onClick={() => navigate(`/employer/vacancies/${vacancy.id}/talent`)}
                    >
                      Ver talento
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        <VerificationCard verification={verificationQuery.data} loading={verificationQuery.isLoading} />
      </div>
    </PageContainer>
  );
}

export { HomePage as Component };
