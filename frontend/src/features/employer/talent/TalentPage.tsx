import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { AlertCircle, GitCompareArrows, Search, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { AnonymousCandidateCard } from "@/api/types";
import { useJob, useMatchResults, useRunMatch, useSetShortlistStage, useVacancy } from "@/api/hooks";
import { PageContainer } from "@/components/layout";
import {
  Button,
  Card,
  EmptyState,
  Eyebrow,
  ProcessingStatus,
  Reveal,
  RevealGroup,
  Skeleton,
  SkeletonCard,
  useToast,
} from "@/components/ui";
import { useAnimatedNumber, useMotionSafe } from "@/lib/motion";
import { CandidateCompactRow } from "./components/CandidateCompactRow";
import { FeaturedCandidateCard } from "./components/FeaturedCandidateCard";
import {
  applyTalentFilter,
  TalentFilters,
  type TalentFilterValue,
} from "./components/TalentFilters";
import { PRIVACY_NOTICE } from "./talentLabels";

const PAGE_SIZE = 20;
const MAX_COMPARE = 3;

const PROCESSING_MESSAGES = [
  "Comparando habilidades y evidencia…",
  "Ponderando los criterios de tu perfil ideal…",
  "Ordenando el ranking sin datos de identidad…",
];

/** E8 — Talento compatible `/employer/vacancies/:id/talent` (04 §E8). */
export function Component() {
  const { id: vacancyId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const motionSafe = useMotionSafe();

  const vacancyQuery = useVacancy(vacancyId);
  const vacancy = vacancyQuery.data;

  const [jobId, setJobId] = useState<string | null>(searchParams.get("job"));
  const [runFromJob, setRunFromJob] = useState<string | null>(null);

  const onJobDone = useCallback(
    (job: { result_ref: string | null }) => {
      setRunFromJob(job.result_ref);
      void queryClient.invalidateQueries({ queryKey: ["vacancies"] });
    },
    [queryClient],
  );

  const jobQuery = useJob(jobId, { onDone: onJobDone });
  const job = jobQuery.data;

  const runId = runFromJob ?? vacancy?.last_match_run_id ?? null;
  const isProcessing = jobId != null && job?.status !== "DONE" && job?.status !== "FAILED";
  const jobFailed = job?.status === "FAILED";

  const runMatch = useRunMatch();
  const setStage = useSetShortlistStage();

  const [offset, setOffset] = useState(0);
  const [loaded, setLoaded] = useState<AnonymousCandidateCard[]>([]);
  const [filter, setFilter] = useState<TalentFilterValue>("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shortlisted, setShortlisted] = useState<Record<string, boolean>>({});

  const resultsQuery = useMatchResults(runId, { limit: PAGE_SIZE, offset });
  const total = resultsQuery.data?.total ?? 0;

  // Contador de candidatos evaluados: cuenta de 0 al total al entrar en pantalla.
  const evaluatedCount = useAnimatedNumber<HTMLParagraphElement>(total);

  // Al cambiar de corrida, se descarta lo acumulado.
  useEffect(() => {
    setOffset(0);
    setLoaded([]);
    setSelectedIds([]);
  }, [runId]);

  // Acumula las páginas cargadas por `offset` conservando el orden del ranking.
  useEffect(() => {
    const page = resultsQuery.data?.items;
    if (!page) return;
    setLoaded((prev) => {
      const byId = new Map(prev.map((card) => [card.match_result_id, card]));
      for (const card of page) byId.set(card.match_result_id, card);
      return [...byId.values()].sort((a, b) => a.rank_position - b.rank_position);
    });
    setShortlisted((prev) => {
      const next = { ...prev };
      for (const card of page) {
        if (!(card.match_result_id in next)) next[card.match_result_id] = card.shortlist_stage != null;
      }
      return next;
    });
  }, [resultsQuery.data]);

  const visible = useMemo(() => applyTalentFilter(loaded, filter), [loaded, filter]);
  const featured = visible.slice(0, 3);
  const rest = visible.slice(3);
  const hasMore = loaded.length < total;

  const toggleCompare = useCallback(
    (matchResultId: string) => {
      setSelectedIds((prev) => {
        if (prev.includes(matchResultId)) return prev.filter((id) => id !== matchResultId);
        if (prev.length >= MAX_COMPARE) {
          showToast({
            title: "Puedes comparar hasta 3 candidatos",
            description: "Quita a alguno de la selección para agregar otro.",
            tone: "warning",
          });
          return prev;
        }
        return [...prev, matchResultId];
      });
    },
    [showToast],
  );

  const addToShortlist = useCallback(
    (matchResultId: string, anonLabel: string) => {
      const already = shortlisted[matchResultId] === true;
      setShortlisted((prev) => ({ ...prev, [matchResultId]: !already }));
      setStage.mutate(
        { matchResultId, stage: already ? null : "REVIEW" },
        {
          onSuccess: () => {
            // useSetShortlistStage ya invalida match-results/match-result/shortlist.
            showToast({
              title: already ? "Quitado de la selección" : "Agregado a la selección",
              description: already
                ? `${anonLabel} ya no está en tu proceso.`
                : `${anonLabel} está ahora en la etapa Revisar.`,
              tone: already ? "neutral" : "success",
            });
          },
          onError: () => {
            setShortlisted((prev) => ({ ...prev, [matchResultId]: already }));
            showToast({
              title: "No pudimos actualizar la selección",
              description: "Vuelve a intentarlo en unos segundos.",
              tone: "danger",
            });
          },
        },
      );
    },
    [queryClient, setStage, shortlisted, showToast],
  );

  const startMatch = useCallback(() => {
    if (!vacancyId) return;
    runMatch.mutate(vacancyId, {
      onSuccess: (ref) => {
        setRunFromJob(null);
        setJobId(ref.job_id);
      },
      onError: () => {
        showToast({
          title: "No pudimos iniciar la búsqueda",
          description: "Revisa tu conexión e inténtalo de nuevo.",
          tone: "danger",
        });
      },
    });
  }, [runMatch, showToast, vacancyId]);

  // ---- estados de página -------------------------------------------------
  if (vacancyQuery.isLoading) {
    return (
      <PageContainer className="flex flex-col gap-6 py-10">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageContainer>
    );
  }

  if (vacancyQuery.isError || !vacancy) {
    return (
      <PageContainer className="py-16">
        <EmptyState
          icon={AlertCircle}
          title="No pudimos cargar esta vacante"
          description="Puede que la vacante ya no exista o que la conexión haya fallado."
          cta={{ label: "Volver a vacantes", onClick: () => navigate("/employer/vacancies") }}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="flex flex-col gap-10 py-10 md:py-14">
      <motion.div
        variants={motionSafe.pageSequence}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-8"
      >
        <motion.header variants={motionSafe.fadeUp}>
          <Eyebrow tone="accent">Talento compatible</Eyebrow>
          <h1 className="mt-3 max-w-[20ch] text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-text-on-dark sm:text-[2.5rem]">
            {vacancy.title}
          </h1>
          <p className="mt-4 max-w-[62ch] text-pretty text-base text-text-on-dark-secondary">
            El ranking ordena a cada persona por la evidencia que respalda su perfil.{" "}
            {PRIVACY_NOTICE}
          </p>
        </motion.header>

        {/* Contexto de la corrida + acciones de la pantalla. */}
        <motion.div variants={motionSafe.fadeUp}>
          <Card variant="glass" padding="lg">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <dl className="grid min-w-0 flex-1 gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt>
                    <Eyebrow>Candidatos evaluados</Eyebrow>
                  </dt>
                  <dd>
                    <p
                      ref={evaluatedCount.ref}
                      className="mt-2 text-3xl font-semibold tabular-nums tracking-[-0.03em] text-text-on-dark"
                    >
                      {runId ? Math.round(evaluatedCount.display) : "—"}
                    </p>
                  </dd>
                </div>
                <div>
                  <dt>
                    <Eyebrow>Seleccionados para comparar</Eyebrow>
                  </dt>
                  <dd>
                    <p className="mt-2 text-3xl font-semibold tabular-nums tracking-[-0.03em] text-text-on-dark">
                      {selectedIds.length}
                      <span className="text-lg text-text-on-dark-tertiary"> / {MAX_COMPARE}</span>
                    </p>
                  </dd>
                </div>
                <div className="max-w-[36ch]">
                  <dt>
                    <Eyebrow>Estado de la búsqueda</Eyebrow>
                  </dt>
                  <dd className="mt-2 text-pretty text-sm text-text-on-dark-secondary">
                    {runId
                      ? "Ranking listo. Selecciona 2 o 3 perfiles para verlos lado a lado."
                      : "Aún no has ejecutado una búsqueda para esta vacante."}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
                <Button
                  variant="primary"
                  size="md"
                  disabled={selectedIds.length < 2}
                  onClick={() =>
                    navigate(`/employer/vacancies/${vacancy.id}/compare?ids=${selectedIds.join(",")}`)
                  }
                >
                  <GitCompareArrows className="size-4" aria-hidden="true" />
                  Comparar ({selectedIds.length})
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => navigate(`/employer/vacancies/${vacancy.id}/shortlist`)}
                >
                  Ver selección
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {isProcessing ? (
        <Card variant="glass" padding="lg">
          <ProcessingStatus messages={PROCESSING_MESSAGES} progress={job?.progress} />
        </Card>
      ) : jobFailed ? (
        <EmptyState
          icon={AlertCircle}
          title="La búsqueda no se completó"
          description="Algo falló mientras comparábamos los perfiles. Puedes volver a intentarlo."
          cta={{ label: "Reintentar búsqueda", onClick: startMatch }}
        />
      ) : !runId ? (
        <EmptyState
          icon={Search}
          title="Aún no has buscado talento para esta vacante"
          description="Ejecuta la búsqueda para obtener un ranking anónimo basado en la evidencia de cada perfil."
          cta={{ label: "Buscar talento", onClick: startMatch }}
        />
      ) : (
        <div className="flex flex-col gap-8">
          <TalentFilters value={filter} onChange={setFilter} />

          {resultsQuery.isLoading && loaded.length === 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : resultsQuery.isError ? (
            <EmptyState
              icon={AlertCircle}
              title="No pudimos cargar el ranking"
              description="Vuelve a intentarlo en unos segundos."
              cta={{ label: "Reintentar", onClick: () => void resultsQuery.refetch() }}
            />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Users}
              title={
                loaded.length === 0
                  ? "Aún no hay candidatos evaluados para esta familia"
                  : "Ningún candidato cumple este filtro"
              }
              description={
                loaded.length === 0
                  ? "Cuando haya perfiles evaluados en esta familia de puestos aparecerán aquí, siempre de forma anónima."
                  : "Elige otro filtro para ver más perfiles del ranking."
              }
              cta={
                loaded.length === 0
                  ? undefined
                  : { label: "Ver todos", onClick: () => setFilter("ALL") }
              }
            />
          ) : (
            <>
              <RevealGroup className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {featured.map((card) => (
                  <FeaturedCandidateCard
                    key={card.match_result_id}
                    card={card}
                    selected={selectedIds.includes(card.match_result_id)}
                    shortlisted={shortlisted[card.match_result_id] === true}
                    onToggleCompare={() => toggleCompare(card.match_result_id)}
                    onView={() => navigate(`/employer/candidates/${card.match_result_id}`)}
                    onShortlist={() => addToShortlist(card.match_result_id, card.anon_code)}
                  />
                ))}
              </RevealGroup>

              {rest.length > 0 && (
                <RevealGroup as="ul" stagger={0.05} className="flex flex-col gap-3">
                  {rest.map((card, index) => (
                    <Reveal as="li" key={card.match_result_id}>
                      <CandidateCompactRow
                        card={card}
                        index={index}
                        selected={selectedIds.includes(card.match_result_id)}
                        shortlisted={shortlisted[card.match_result_id] === true}
                        onToggleCompare={() => toggleCompare(card.match_result_id)}
                        onView={() => navigate(`/employer/candidates/${card.match_result_id}`)}
                        onShortlist={() => addToShortlist(card.match_result_id, card.anon_code)}
                      />
                    </Reveal>
                  ))}
                </RevealGroup>
              )}

              {hasMore && (
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    size="md"
                    loading={resultsQuery.isFetching}
                    onClick={() => setOffset(loaded.length)}
                  >
                    Ver más ({loaded.length} de {total})
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </PageContainer>
  );
}
