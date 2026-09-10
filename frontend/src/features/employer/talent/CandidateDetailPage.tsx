import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import { AlertCircle, ArrowLeft, KeyRound, MapPin } from "lucide-react";
import type { ShortlistStage } from "@/api/types";
import { useMatchResult, useSetShortlistStage, useUnlock } from "@/api/hooks";
import { PageContainer } from "@/components/layout";
import {
  AIInsightCard,
  Badge,
  Button,
  Card,
  EmptyState,
  Eyebrow,
  ScoreBadge,
  Select,
  Skeleton,
  SkeletonCard,
  useToast,
} from "@/components/ui";
import { useMotionSafe } from "@/lib/motion";
import { CandidateEvidenceSections } from "./components/CandidateEvidenceSections";
import { MatchScoreCard } from "./components/MatchScoreCard";
import { UnlockModal } from "./components/UnlockModal";
import {
  anonDisplayCode,
  availabilityLabels,
  experienceLabel,
  geoBandLabels,
  jobFamilyLabels,
  PRIVACY_NOTICE,
  shortlistStageLabels,
} from "./talentLabels";

const STAGE_OPTIONS = [
  { value: "", label: "Sin seleccionar" },
  { value: "REVIEW", label: shortlistStageLabels.REVIEW },
  { value: "INTERVIEW", label: shortlistStageLabels.INTERVIEW },
  { value: "FINALIST", label: shortlistStageLabels.FINALIST },
];

/** E9 — Detalle anónimo `/employer/candidates/:matchResultId` (04 §E9). */
export function Component() {
  const { matchResultId } = useParams<{ matchResultId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const motionSafe = useMotionSafe();

  const resultQuery = useMatchResult(matchResultId);
  const card = resultQuery.data;

  const setStage = useSetShortlistStage();
  const unlock = useUnlock();
  const [unlockOpen, setUnlockOpen] = useState(false);

  // La explicación (A5 EXPLAIN) puede llegar `null`: se reintenta una vez a los 2 s.
  const explanationMissing = card != null && card.explanation_text == null;
  const refetchResult = resultQuery.refetch;
  useEffect(() => {
    if (!explanationMissing) return;
    const timer = window.setTimeout(() => void refetchResult(), 2000);
    return () => window.clearTimeout(timer);
  }, [explanationMissing, refetchResult]);

  const onStageChange = useCallback(
    (value: string) => {
      if (!matchResultId) return;
      const stage = value === "" ? null : (value as ShortlistStage);
      setStage.mutate(
        { matchResultId, stage },
        {
          onSuccess: () => {
            // useSetShortlistStage ya invalida match-result/match-results/vacancies/shortlist.
            showToast({
              title: stage ? `Movido a ${shortlistStageLabels[stage].toLowerCase()}` : "Quitado de la selección",
              tone: stage ? "success" : "neutral",
            });
          },
          onError: () =>
            showToast({
              title: "No pudimos actualizar la etapa",
              description: "Vuelve a intentarlo en unos segundos.",
              tone: "danger",
            }),
        },
      );
    },
    [matchResultId, setStage, showToast],
  );

  const confirmUnlock = useCallback(() => {
    if (!matchResultId) return;
    unlock.mutate(matchResultId, {
      onSuccess: () => {
        setUnlockOpen(false);
        navigate(`/employer/candidates/${matchResultId}/full`);
      },
      onError: () =>
        showToast({
          title: "No pudimos desbloquear la identidad",
          description: "Vuelve a intentarlo en unos segundos.",
          tone: "danger",
        }),
    });
  }, [matchResultId, navigate, showToast, unlock]);

  if (resultQuery.isLoading) {
    return (
      <PageContainer className="flex flex-col gap-6 py-10">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageContainer>
    );
  }

  if (resultQuery.isError || !card) {
    return (
      <PageContainer className="py-16">
        <EmptyState
          icon={AlertCircle}
          title="No pudimos cargar este perfil"
          description="Puede que el resultado de matching ya no exista o que la conexión haya fallado."
          cta={{ label: "Volver", onClick: () => navigate(-1) }}
        />
      </PageContainer>
    );
  }

  const facts: { label: string; value: string; withPin?: boolean }[] = [
    { label: "Experiencia", value: experienceLabel(card.years_experience) },
    { label: "Disponibilidad", value: availabilityLabels[card.availability] },
    { label: "Zona", value: geoBandLabels[card.geo_band], withPin: true },
    { label: "Expectativa salarial", value: card.salary_band },
  ];

  return (
    <PageContainer className="flex flex-col gap-10 py-8 pb-16 md:gap-12 md:py-10">
      <motion.div
        variants={motionSafe.pageSequence}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-8"
      >
        <motion.div variants={motionSafe.fadeUp}>
          <Button variant="ghost" size="md" onClick={() => navigate(-1)} className="-ml-4">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver al ranking
          </Button>
        </motion.div>

        {/* Cabecera anónima: identidad en código, compatibilidad y acciones.
            Nunca nombre, foto, edad ni género. */}
        <motion.header variants={motionSafe.fadeUp} className="flex flex-col gap-6">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <Eyebrow tone="accent">Posición #{card.rank_position} del ranking</Eyebrow>
              <h1 className="mt-3 text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-text-on-dark sm:text-[2.5rem]">
                {anonDisplayCode(card.anon_code)}
              </h1>
              <p className="mt-2 text-base text-text-on-dark-secondary">
                {jobFamilyLabels[card.job_family_code]}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge tone="info">{card.score_label}</Badge>
                {card.is_unlocked && <Badge tone="success">Identidad desbloqueada</Badge>}
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col items-stretch gap-5 sm:max-w-sm lg:w-auto lg:items-end">
              <ScoreBadge
                score={card.total_score}
                label="Compatibilidad con la vacante"
                variant="bar"
                className="w-full sm:min-w-[18rem]"
              />
              {card.is_unlocked ? (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate(`/employer/candidates/${card.match_result_id}/full`)}
                >
                  Ver perfil completo
                </Button>
              ) : (
                <Button variant="primary" size="lg" onClick={() => setUnlockOpen(true)}>
                  <KeyRound className="size-4" aria-hidden="true" />
                  Desbloquear identidad
                </Button>
              )}
            </div>
          </div>

          <Card variant="glass" padding="lg">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt>
                    <Eyebrow>{fact.label}</Eyebrow>
                  </dt>
                  <dd className="mt-2 flex items-center gap-1.5 text-sm font-medium text-text-on-dark">
                    {fact.withPin && (
                      <MapPin className="size-4 text-text-on-dark-tertiary" aria-hidden="true" />
                    )}
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>

          <p className="text-sm text-text-on-dark-tertiary">{PRIVACY_NOTICE}</p>
        </motion.header>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <MatchScoreCard card={card} />

        <div className="flex flex-col gap-6">
          <AIInsightCard
            title="Por qué es compatible"
            body={card.explanation_text ?? undefined}
            why={card.strengths}
            missing={card.gaps}
            loading={card.explanation_text == null}
          />

          <Card variant="glass" padding="lg">
            <div className="flex flex-col gap-3">
              <label htmlFor="shortlist-stage" className="text-sm font-medium text-text-on-dark">
                Etapa de selección
              </label>
              <p className="text-pretty text-sm text-text-on-dark-secondary">
                Mueve a esta persona por tu proceso sin revelar su identidad.
              </p>
              <Select
                id="shortlist-stage"
                className="mt-1"
                options={STAGE_OPTIONS}
                value={card.shortlist_stage ?? ""}
                disabled={setStage.isPending}
                onChange={(event) => onStageChange(event.target.value)}
              />
            </div>
          </Card>
        </div>
      </div>

      <CandidateEvidenceSections card={card} />

      <UnlockModal
        open={unlockOpen}
        anonCode={card.anon_code}
        loading={unlock.isPending}
        onClose={() => setUnlockOpen(false)}
        onConfirm={confirmUnlock}
      />
    </PageContainer>
  );
}
