import { useState } from "react";
import { motion } from "motion/react";
import { Navigate, useNavigate, useParams } from "react-router";
import { AlertCircle, ArrowLeft, BadgeCheck, Briefcase, CheckCircle2, MapPin } from "lucide-react";
import {
  AIInsightCard,
  Badge,
  Button,
  Card,
  EmptyState,
  Eyebrow,
  EvidenceBadge,
  Reveal,
  RevealGroup,
  Skeleton,
  SkeletonCard,
  useToast,
} from "@/components/ui";
import { LightSurface, PageContainer } from "@/components/layout";
import { BrandBackground } from "@/components/brand/BrandBackground";
import { useApply, useOpportunity } from "@/api/hooks";
import { ApiClientError } from "@/api/client";
import { locationText, requirementKindLabels, requirementLevelLabels, salaryText, workModeLabels } from "./opportunities.utils";

/** C14 — Detalle de oportunidad `/candidate/opportunities/:id`. */
export function Component() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [justApplied, setJustApplied] = useState(false);

  const opportunityQuery = useOpportunity(id);
  const apply = useApply();

  if (!id) return <Navigate to="/candidate/opportunities" replace />;

  if (opportunityQuery.isLoading) return <DetailSkeleton />;
  if (opportunityQuery.isError || !opportunityQuery.data) {
    return (
      <PageContainer className="flex min-h-[60vh] items-center justify-center py-10">
        <EmptyState
          icon={AlertCircle}
          title="No pudimos cargar esta vacante"
          description="Revisa tu conexión e inténtalo de nuevo."
          cta={{ label: "Reintentar", onClick: () => void opportunityQuery.refetch() }}
        />
      </PageContainer>
    );
  }

  const opportunity = opportunityQuery.data;
  const applied = opportunity.applied || justApplied;

  const handleApply = async () => {
    try {
      await apply.mutateAsync(opportunity.vacancy_id);
      setJustApplied(true);
      showToast({
        title: "Postulación enviada",
        description: "La empresa podrá revisar tu evidencia como parte de su primer filtro.",
        tone: "success",
      });
    } catch (err) {
      showToast({
        title: "No pudimos enviar tu postulación",
        description: err instanceof ApiClientError ? err.message : "Intenta de nuevo en unos segundos.",
        tone: "danger",
      });
    }
  };

  return (
    <div>
      <div className="relative overflow-hidden bg-bg-dark px-6 pb-16 pt-10 md:px-8 md:pt-14">
        <BrandBackground asset="matching" presence="support" overlay="left" />
        <PageContainer className="relative z-10 flex flex-col gap-5">
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate("/candidate/opportunities")}
            className="w-fit"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver a oportunidades
          </Button>

          <div className="flex flex-col gap-3">
            <Eyebrow tone="accent">Oportunidad</Eyebrow>
            <h1 className="text-balance text-3xl font-semibold text-text-on-dark sm:text-4xl">
              {opportunity.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-on-dark-secondary">
              <span className="flex items-center gap-1.5 font-medium text-text-on-dark">
                {opportunity.company_trade_name}
                {opportunity.company_verified && (
                  <BadgeCheck className="size-4 text-primary-on-dark" aria-hidden="true" />
                )}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden="true" />
                {locationText(opportunity)}
              </span>
              <span className="flex items-center gap-1.5">
                <Briefcase className="size-4" aria-hidden="true" />
                {workModeLabels[opportunity.work_mode]}
              </span>
              <span className="font-medium text-text-on-dark">
                {salaryText(opportunity.salary_min, opportunity.salary_max)}
              </span>
            </div>
          </div>
        </PageContainer>
      </div>

      <LightSurface>
        <PageContainer className="flex flex-col gap-8">
          <RevealGroup className="grid gap-4 lg:grid-cols-2">
            <Reveal>
              {opportunity.compatibility != null && opportunity.why_fit.length > 0 ? (
                <AIInsightCard title="Por qué encajas" why={opportunity.why_fit} missing={[]} />
              ) : (
                <Card variant="light" padding="lg" className="flex h-full flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
                    Basado en la evidencia disponible
                  </p>
                  <h3 className="text-lg font-semibold text-text-primary">Por qué encajas</h3>
                  <p className="text-pretty text-sm text-text-secondary">
                    Completa tu entrevista con IA para que podamos explicarte tu compatibilidad con este puesto.
                  </p>
                  <Button
                    variant="ghost"
                    size="md"
                    arrow
                    onClick={() => navigate("/candidate/interview/prepare")}
                    className="-ml-4 w-fit"
                  >
                    Ir a mi entrevista
                  </Button>
                </Card>
              )}
            </Reveal>

            <Reveal>
              <Card variant="soft" padding="lg" className="flex h-full flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
                  Basado en la evidencia disponible
                </p>
                <h3 className="text-lg font-semibold text-text-primary">Requisitos aún sin evidencia</h3>
                {opportunity.missing_evidence.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {opportunity.missing_evidence.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                        <EvidenceBadge level="pending" size="sm" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-text-secondary">No detectamos requisitos sin evidencia por ahora.</p>
                )}
              </Card>
            </Reveal>
          </RevealGroup>

          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-text-primary">Requisitos del puesto</h2>
            {opportunity.requirements.length === 0 ? (
              <p className="text-sm text-text-secondary">Esta vacante no especificó requisitos detallados.</p>
            ) : (
              <RevealGroup className="flex flex-col gap-2" stagger={0.05}>
                {opportunity.requirements.map((req, index) => (
                  <Reveal key={req.id}>
                    <Card
                      variant={index % 2 === 0 ? "light" : "soft"}
                      padding="md"
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <span className="text-sm font-medium text-text-primary">{req.label}</span>
                      <div className="flex items-center gap-2">
                        <Badge tone={req.kind === "MANDATORY" ? "warning" : "neutral"}>
                          {requirementKindLabels[req.kind]}
                        </Badge>
                        <Badge tone="info">{requirementLevelLabels[req.min_level]}</Badge>
                      </div>
                    </Card>
                  </Reveal>
                ))}
              </RevealGroup>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold text-text-primary">Descripción</h2>
            <p className="whitespace-pre-line text-pretty text-base text-text-secondary">
              {opportunity.description}
            </p>
          </div>

          <Card variant="light" padding="lg" className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            {applied ? (
              <div className="flex items-center gap-3">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="text-success"
                >
                  <CheckCircle2 className="size-6" aria-hidden="true" />
                </motion.span>
                <div>
                  <p className="font-medium text-text-primary">Postulación enviada</p>
                  <p className="text-sm text-text-secondary">
                    La empresa podrá revisar tu evidencia como parte de su primer filtro.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="font-medium text-text-primary">¿Listo para postularte?</p>
                <p className="text-sm text-text-secondary">
                  No hay pasos adicionales de contacto: la empresa revisa tu evidencia directamente.
                </p>
              </div>
            )}
            {!applied && (
              <Button size="lg" arrow loading={apply.isPending} onClick={() => void handleApply()} className="shrink-0">
                Postularme
              </Button>
            )}
          </Card>
        </PageContainer>
      </LightSurface>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <PageContainer className="flex flex-col gap-3 py-10">
        <Skeleton className="h-9 w-24 rounded-pill skeleton-shimmer--dark" />
        <Skeleton className="h-9 w-2/3 skeleton-shimmer--dark" />
        <Skeleton className="h-4 w-1/2 skeleton-shimmer--dark" />
      </PageContainer>
      <LightSurface>
        <PageContainer className="flex flex-col gap-8">
          <div className="grid gap-4 lg:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonCard />
        </PageContainer>
      </LightSurface>
    </div>
  );
}
