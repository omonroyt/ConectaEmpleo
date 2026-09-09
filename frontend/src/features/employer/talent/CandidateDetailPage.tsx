import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import { AlertCircle, ArrowLeft, KeyRound, MapPin } from "lucide-react";
import type { ShortlistStage } from "@/api/types";
import { useMatchResult, useSetShortlistStage, useUnlock } from "@/api/hooks";
import { PageContainer } from "@/components/layout";
import {
  AIInsightCard,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Select,
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
      <PageContainer className="flex flex-col gap-4 py-10">
        <SkeletonCard />
        <SkeletonCard />
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

  return (
    <div className="min-h-full bg-bg-light pb-16">
      <PageContainer className="pt-8">
        <Button variant="ghost" size="md" onClick={() => navigate(-1)} className="-ml-4">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al ranking
        </Button>
      </PageContainer>

      <motion.div
        variants={motionSafe.pageSequence}
        initial="hidden"
        animate="visible"
        className="flex flex-col"
      >
        {/* Cabecera clara y anónima (sin nombre, foto, edad ni género). */}
        <motion.header variants={motionSafe.fadeUp}>
          <PageContainer className="pt-4">
            <Card padding="lg" className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <Avatar anonymous seed={card.anon_code} size="lg" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[.18em] text-text-tertiary">
                    Posición #{card.rank_position} del ranking
                  </p>
                  <h1 className="text-2xl font-semibold text-text-primary">
                    {anonDisplayCode(card.anon_code)}
                  </h1>
                  <p className="text-sm text-text-secondary">
                    {jobFamilyLabels[card.job_family_code]}
                  </p>
                  {card.is_unlocked && (
                    <Badge tone="success" className="mt-2">
                      Identidad desbloqueada
                    </Badge>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <dt className="text-text-tertiary">Experiencia</dt>
                  <dd className="font-medium text-text-primary">
                    {experienceLabel(card.years_experience)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Disponibilidad</dt>
                  <dd className="font-medium text-text-primary">
                    {availabilityLabels[card.availability]}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Zona</dt>
                  <dd className="flex items-center gap-1.5 font-medium text-text-primary">
                    <MapPin className="size-4 text-text-tertiary" aria-hidden="true" />
                    {geoBandLabels[card.geo_band]}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-tertiary">Expectativa salarial</dt>
                  <dd className="font-medium text-text-primary">{card.salary_band}</dd>
                </div>
              </dl>
            </Card>
            <p className="mt-3 text-sm text-text-secondary">{PRIVACY_NOTICE}</p>
          </PageContainer>
        </motion.header>

        <motion.div variants={motionSafe.fadeUp}>
          <PageContainer className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
            <MatchScoreCard card={card} />

            <div className="flex flex-col gap-4">
              <AIInsightCard
                title="Por qué es compatible"
                body={card.explanation_text ?? undefined}
                why={card.strengths}
                missing={card.gaps}
                loading={card.explanation_text == null}
              />

              <Card padding="lg" className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="shortlist-stage"
                    className="text-sm font-medium text-text-primary"
                  >
                    Etapa de selección
                  </label>
                  <p className="mt-1 text-xs text-text-secondary">
                    Mueve a esta persona por tu proceso sin revelar su identidad.
                  </p>
                  <Select
                    id="shortlist-stage"
                    className="mt-3"
                    options={STAGE_OPTIONS}
                    value={card.shortlist_stage ?? ""}
                    disabled={setStage.isPending}
                    onChange={(event) => onStageChange(event.target.value)}
                  />
                </div>

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
              </Card>
            </div>
          </PageContainer>
        </motion.div>

        <motion.div variants={motionSafe.fadeUp}>
          <PageContainer className="mt-12">
            <CandidateEvidenceSections card={card} />
          </PageContainer>
        </motion.div>
      </motion.div>

      <UnlockModal
        open={unlockOpen}
        anonCode={card.anon_code}
        loading={unlock.isPending}
        onClose={() => setUnlockOpen(false)}
        onConfirm={confirmUnlock}
      />
    </div>
  );
}
