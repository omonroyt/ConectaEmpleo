import { motion } from "motion/react";
import { Navigate, useNavigate } from "react-router";
import { Compass } from "lucide-react";
import { PageContainer } from "@/components/layout";
import {
  Button,
  Card,
  EmptyState,
  Eyebrow,
  JobCard,
  ProgressRing,
  Reveal,
  RevealGroup,
  Skeleton,
  SkeletonCard,
} from "@/components/ui";
import { useCandidateMe, useCandidateStatus, useOpportunities } from "@/api/hooks";
import { useMotionSafe } from "@/lib/motion";
import { formatMXN } from "@/lib/format";
import type { CandidateStatusView, WorkMode } from "@/api/types";

const modalityLabel: Record<WorkMode, string> = {
  ONSITE: "Presencial",
  HYBRID: "Híbrido",
  REMOTE: "Remoto",
};

function salaryText(min: number | null, max: number | null): string {
  if (min == null && max == null) return "Salario a convenir";
  if (min != null && max != null) return `${formatMXN(min)} – ${formatMXN(max)} mensual`;
  return `Desde ${formatMXN(min ?? max ?? 0)} mensual`;
}

const nextStepCopy: Record<
  Exclude<CandidateStatusView["next_step"], "ONBOARDING">,
  { title: string; description: string; ctaLabel: string | null; to: string | null }
> = {
  CV: {
    title: "Construye tu perfil",
    description: "Sube tu CV o cuéntanos tu experiencia conversando; extraemos lo importante por ti.",
    ctaLabel: "Construir mi perfil",
    to: "/candidate/cv/upload",
  },
  REVIEW_CLAIMS: {
    title: "Revisa tu información",
    description: "Así entendimos tu experiencia. Confírmala antes de pasar a la entrevista.",
    ctaLabel: "Revisar mi información",
    to: "/candidate/cv/review",
  },
  INTERVIEW: {
    title: "Tu entrevista con IA te espera",
    description: "Una conversación breve para conocer cómo resuelves situaciones reales de tu área.",
    ctaLabel: "Comenzar entrevista",
    to: "/candidate/interview/prepare",
  },
  WAITING_EVALUATION: {
    title: "Estamos preparando tu evaluación",
    description: "Tu entrevista ya terminó. En un momento tendremos tu Perfil de Talento Verificado.",
    ctaLabel: null,
    to: null,
  },
  DONE: {
    title: "Tu Perfil de Talento Verificado está listo",
    description: "Tu talento habla por ti: revísalo y compártelo con empresas.",
    ctaLabel: "Ver mi perfil",
    to: "/candidate/profile",
  },
};

/** C4 — Home candidato `/candidate` (index) y `/candidate/home`. */
export function Component() {
  const navigate = useNavigate();
  const { fadeUp, pageSequence } = useMotionSafe();

  const { data: status, isLoading: statusLoading } = useCandidateStatus();
  const { data: me, isLoading: meLoading } = useCandidateMe();
  const { data: opportunities, isLoading: opportunitiesLoading } = useOpportunities(
    status?.status === "EVALUATED",
  );

  if (statusLoading || meLoading) {
    return (
      <PageContainer className="py-10">
        <Skeleton className="h-10 w-64 skeleton-shimmer--dark" />
        <div className="mt-8 grid gap-6 sm:grid-cols-[2fr,1fr]">
          <Skeleton className="h-48 w-full skeleton-shimmer--dark" />
          <Skeleton className="h-48 w-full skeleton-shimmer--dark" />
        </div>
      </PageContainer>
    );
  }

  if (!status || !me) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center py-10">
        <EmptyState
          icon={Compass}
          title="No pudimos cargar tu información"
          description="Revisa tu conexión e inténtalo de nuevo."
          cta={{ label: "Reintentar", onClick: () => window.location.reload() }}
        />
      </PageContainer>
    );
  }

  if (status.next_step === "ONBOARDING") {
    return <Navigate to="/candidate/onboarding" replace />;
  }

  const step = nextStepCopy[status.next_step];
  const firstName = me.full_name.trim().split(/\s+/)[0] || "Candidato";
  const isEvaluated = status.status === "EVALUATED";

  return (
    <PageContainer className="py-10">
      <motion.div initial="hidden" animate="visible" variants={pageSequence} className="flex flex-col gap-10">
        <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <Eyebrow tone="accent">Tu espacio</Eyebrow>
            <h1 className="mt-1 text-balance text-3xl font-semibold text-text-on-dark sm:text-4xl">
              Hola, {firstName}
            </h1>
          </div>
          <ProgressRing value={me.completion_percent} label="Perfil completo" size={132} tone="dark" />
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card variant="dark" padding="lg" background={{ asset: "brand-main", presence: "accent" }}>
            <Eyebrow tone="accent">Tu siguiente paso</Eyebrow>
            <h2 className="mt-2 text-balance text-2xl font-semibold text-text-on-dark">{step.title}</h2>
            <p className="mt-2 max-w-xl text-pretty text-sm text-text-on-dark-secondary">{step.description}</p>
            {step.ctaLabel && step.to && (
              <Button size="lg" arrow className="mt-5" onClick={() => navigate(step.to as string)}>
                {step.ctaLabel}
              </Button>
            )}
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text-on-dark">Oportunidades para ti</h2>
            <button
              type="button"
              onClick={() => navigate("/candidate/opportunities")}
              className="text-sm font-medium text-primary-on-dark underline-offset-2 hover:underline"
            >
              Ver todas
            </button>
          </div>

          {!isEvaluated ? (
            <EmptyState
              icon={Compass}
              title="Completa tu entrevista para ver tu compatibilidad"
              description="En cuanto termines tu entrevista con IA, te mostraremos qué tan bien encajas con cada vacante."
            />
          ) : opportunitiesLoading ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : opportunities && opportunities.length > 0 ? (
            <RevealGroup className="grid gap-4 sm:grid-cols-3">
              {opportunities.slice(0, 3).map((opportunity) => (
                <Reveal key={opportunity.vacancy_id}>
                  <JobCard
                    title={opportunity.title}
                    company={opportunity.company_trade_name}
                    companyVerified={opportunity.company_verified}
                    location={opportunity.location ? `${opportunity.location.city}, ${opportunity.location.state}` : "Remoto"}
                    modality={modalityLabel[opportunity.work_mode]}
                    salaryText={salaryText(opportunity.salary_min, opportunity.salary_max)}
                    compatibility={
                      opportunity.compatibility != null && opportunity.compatibility_label
                        ? { score: opportunity.compatibility, label: opportunity.compatibility_label }
                        : undefined
                    }
                    applied={opportunity.applied}
                    onClick={() => navigate(`/candidate/opportunities/${opportunity.vacancy_id}`)}
                  />
                </Reveal>
              ))}
            </RevealGroup>
          ) : (
            <EmptyState icon={Compass} title="Aún no hay oportunidades para mostrarte" description="Vuelve pronto." />
          )}
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}
