import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { useFeedback, useJob, useTalentProfile } from "@/api/hooks";
import { queryKeys } from "@/api/queryKeys";
import type { CompetencyEvaluation } from "@/api/types";
import { BrandBackground } from "@/components/brand/BrandBackground";
import { ImmersiveLayout, LightSurface } from "@/components/layout";
import {
  AIInsightCard,
  Badge,
  Button,
  Card,
  EvidenceBadge,
  Eyebrow,
  ProcessingStatus,
  ProgressBar,
  ProgressRing,
  Reveal,
  RevealGroup,
  Skeleton,
  Tooltip,
  type EvidenceLevel,
} from "@/components/ui";
import { useMotionSafe } from "@/lib/motion";
import { cn } from "@/lib/cn";

const PROCESSING_MESSAGES = [
  "Preparando tu resumen…",
  "Revisando la evidencia de tus respuestas",
  "Organizando tu Perfil de Talento",
];

const FIXED_NOTE =
  "Resultados basados en tu entrevista por competencias con IA. Son una guía sobre la evidencia observada durante esta sesión.";

/**
 * Cuando no hay `evidence_gaps` reales, en vez de una línea vacía y genérica
 * se señala la competencia con menor confianza (si existe) como sugerencia
 * concreta de qué reforzar en una próxima conversación.
 */
function developmentOpportunityBody(profile: {
  evidence_gaps: string[];
  evaluations: CompetencyEvaluation[];
} | undefined): string {
  if (!profile) return "";
  if (profile.evidence_gaps.length > 0) {
    return "Sumar un ejemplo concreto en estos temas hará más sólida tu evidencia.";
  }
  if (profile.evaluations.length === 0) {
    return "Aún no hay suficientes respuestas para señalar una oportunidad concreta.";
  }
  const lowestConfidence = [...profile.evaluations].sort((a, b) => a.confidence - b.confidence)[0]!;
  return `Toda tu evidencia fue evaluada positivamente. Si quieres reforzar aún más tu perfil, profundiza en "${lowestConfidence.competency_name}", donde la confianza de la lectura fue la más baja (${Math.round(lowestConfidence.confidence * 100)} %).`;
}

function confidenceText(confidence: number): string {
  if (confidence >= 0.75) return "confianza alta";
  if (confidence >= 0.5) return "confianza media";
  return "confianza baja";
}

function evidenceLevelFor(evaluation: CompetencyEvaluation): EvidenceLevel {
  if (evaluation.confidence >= 0.7 && evaluation.limitations == null) return "evaluated";
  return "partial";
}

function EvaluationCard({
  evaluation,
  index,
}: {
  evaluation: CompetencyEvaluation;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `evaluation-${evaluation.competency_code}`;

  return (
    <Reveal className="h-full">
      <Card variant="soft" padding="md" className="flex h-full flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Eyebrow tone="light">
            {evaluation.type === "TECHNICAL" ? "Competencia técnica" : "Competencia de comportamiento"}
          </Eyebrow>
          <h3 className="text-balance text-base font-semibold leading-snug tracking-[-0.01em] text-text-primary">
            {evaluation.competency_name}
          </h3>
        </div>

        <ProgressBar
          value={evaluation.score}
          showValue
          tone="light"
          delay={index * 90}
          label="Desempeño observado"
        />

        <div className="flex flex-wrap items-center gap-2">
          <EvidenceBadge level={evidenceLevelFor(evaluation)} size="sm" />
          <span className="text-xs text-text-secondary">{confidenceText(evaluation.confidence)}</span>
          {evaluation.rubric_source !== "SPECIFIC" && (
            <Tooltip content="Evaluada con una rúbrica general porque aún no hay una rúbrica específica para esta competencia.">
              <Badge tone="warning">Rúbrica provisional</Badge>
            </Tooltip>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={panelId}
            className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
          >
            {open ? "Ocultar detalle" : "Ver detalle"}
            <ChevronDown
              className={cn("size-4 transition-transform duration-fast ease-standard", open && "rotate-180")}
              aria-hidden="true"
            />
          </button>

          <div
            id={panelId}
            hidden={!open}
            className="rounded-md border border-border/70 bg-surface p-4 text-sm"
          >
            <p className="text-pretty text-text-secondary">{evaluation.justification}</p>
            {evaluation.limitations && (
              <p className="mt-2 text-pretty text-text-tertiary">{evaluation.limitations}</p>
            )}
            <p className="mt-2 text-xs tabular-nums text-text-tertiary">
              {confidenceText(evaluation.confidence)} · {evaluation.evidence_turn_ids.length}{" "}
              respuesta(s) como evidencia
            </p>
          </div>
        </div>
      </Card>
    </Reveal>
  );
}

/** C10 — Resultado de entrevista `/candidate/interview/:id/result`. */
export function Component() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const safe = useMotionSafe();

  const jobId = searchParams.get("job");
  const [jobDone, setJobDone] = useState(jobId == null);

  const onDone = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.talentProfile() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.feedback() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.candidateMe() });
    setJobDone(true);
  }, [queryClient]);

  const jobQuery = useJob(jobId, { onDone });
  const failed = jobQuery.data?.status === "FAILED";

  const profileQuery = useTalentProfile(jobDone);
  const feedbackQuery = useFeedback(jobDone);
  const profile = profileQuery.data;
  const feedback = feedbackQuery.data;

  if (!jobDone && !failed) {
    return (
      <ImmersiveLayout onClose={() => navigate("/candidate")}>
        <div className="flex w-full flex-col items-center gap-6 text-center">
          <h1 className="text-2xl font-semibold text-text-on-dark sm:text-3xl">
            Gracias por la conversación
          </h1>
          <ProcessingStatus
            messages={PROCESSING_MESSAGES}
            progress={jobQuery.data?.progress ?? 0}
            className="w-full max-w-md"
          />
          <p className="max-w-[52ch] text-sm text-text-on-dark-secondary">{FIXED_NOTE}</p>
        </div>
      </ImmersiveLayout>
    );
  }

  if (failed) {
    return (
      <ImmersiveLayout onClose={() => navigate("/candidate")}>
        <div className="flex w-full flex-col items-center gap-5 text-center">
          <AlertCircle className="size-8 text-warning-on-dark" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-text-on-dark">
            No pudimos preparar tu resumen
          </h1>
          <p className="max-w-[48ch] text-sm text-text-on-dark-secondary">
            Tus respuestas están guardadas. Vuelve a intentarlo en un momento o revisa tu perfil
            para continuar.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => void jobQuery.refetch()}>Intentar de nuevo</Button>
            <Button variant="secondary" onClick={() => navigate("/candidate")}>
              Volver al inicio
            </Button>
          </div>
        </div>
      </ImmersiveLayout>
    );
  }

  return (
    <ImmersiveLayout onClose={() => navigate("/candidate")}>
      <motion.div
        variants={safe.pageSequence}
        initial="hidden"
        animate="visible"
        className="relative w-full"
      >
        {/* Hero oscuro con el resultado global */}
        <section className="relative overflow-hidden rounded-2xl px-6 pb-16 pt-10 sm:px-8">
          <BrandBackground asset="results" presence="hero" overlay="bottom" position="center" />
          <div className="relative z-10 flex flex-col items-center gap-5 text-center">
            <motion.div variants={safe.fadeUp}>
              <Eyebrow tone="accent">Resultado de tu entrevista</Eyebrow>
            </motion.div>
            <motion.h1
              variants={safe.fadeUp}
              className="text-balance text-3xl font-semibold leading-tight tracking-[-0.03em] text-text-on-dark sm:text-4xl"
            >
              Esto observamos en tu conversación
            </motion.h1>

            {/* El anillo es la pieza principal del hero: se llena de 0 al
                valor al entrar en pantalla, con la cifra contando a la par. */}
            <motion.div variants={safe.scaleIn} className="py-2">
              {profileQuery.isLoading || !profile ? (
                <Skeleton className="size-[200px] rounded-full" />
              ) : (
                <ProgressRing
                  value={profile.overall_score}
                  size={200}
                  stroke={18}
                  label="Evidencia general"
                  caption="de evidencia"
                  labelPlacement="none"
                  tone="dark"
                />
              )}
            </motion.div>

            {profile && (
              <motion.div variants={safe.fadeUp} className="flex flex-col items-center gap-2">
                <p className="text-xl font-semibold text-text-on-dark">{profile.overall_label}</p>
                <p className="max-w-[52ch] text-pretty text-sm text-text-on-dark-secondary">
                  {profile.summary_text}
                </p>
              </motion.div>
            )}
          </div>
        </section>

        {/* Superficie clara con el detalle por competencia */}
        <LightSurface className="rounded-2xl px-6 sm:px-8">
          <motion.div variants={safe.fadeUp}>
            <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
              Desempeño por competencia
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Cada competencia se acompaña de la evidencia observada y del nivel de confianza de esa
              lectura.
            </p>

            {profileQuery.isLoading ? (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Skeleton className="h-44 w-full rounded-lg" />
                <Skeleton className="h-44 w-full rounded-lg" />
                <Skeleton className="h-44 w-full rounded-lg" />
                <Skeleton className="h-44 w-full rounded-lg" />
              </div>
            ) : profile && profile.evaluations.length > 0 ? (
              <RevealGroup className="mt-6 grid gap-4 md:grid-cols-2">
                {profile.evaluations.map((evaluation, index) => (
                  <EvaluationCard
                    key={evaluation.competency_code}
                    evaluation={evaluation}
                    index={index}
                  />
                ))}
              </RevealGroup>
            ) : (
              <p className="mt-4 text-sm text-text-secondary">
                Aún no hay evidencia suficiente para mostrar un desglose por competencia.
              </p>
            )}
          </motion.div>

          {/* `variant="light"`: estas dos tarjetas viven dentro de un panel
              claro, no sobre el lienzo, así que no pueden ser `glass`. */}
          <RevealGroup className="mt-8 grid gap-4 md:grid-cols-2">
            <Reveal className="h-full">
              <AIInsightCard
                variant="light"
                className="h-full"
                title="Fortaleza principal"
                loading={profileQuery.isLoading}
                why={profile?.strengths.slice(0, 2) ?? []}
                missing={[]}
                body={feedback?.candidate_note}
              />
            </Reveal>
            <Reveal className="h-full">
              <AIInsightCard
                variant="light"
                className="h-full"
                title="Oportunidad de desarrollo"
                loading={profileQuery.isLoading}
                why={[]}
                missing={profile?.evidence_gaps.slice(0, 2) ?? []}
                body={developmentOpportunityBody(profile)}
              />
            </Reveal>
          </RevealGroup>

          <motion.div variants={safe.fadeUp} className="mt-8 flex flex-col gap-4">
            <p className="text-sm text-text-secondary">{FIXED_NOTE}</p>
            <Button
              size="lg"
              arrow
              onClick={() => navigate("/candidate/profile")}
              className="self-start"
            >
              Ver mi Perfil de Talento Verificado
            </Button>
          </motion.div>
        </LightSurface>
      </motion.div>
    </ImmersiveLayout>
  );
}
