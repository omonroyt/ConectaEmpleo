import { useCallback, useMemo, useState } from "react";
import { LayoutGroup } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { AlertCircle, ArrowLeft, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ShortlistEntry, ShortlistStage } from "@/api/types";
import { useFullProfile, useSetShortlistStage, useShortlist, useUnlock, useVacancy } from "@/api/hooks";
import { PageContainer } from "@/components/layout";
import {
  Button,
  Card,
  EmptyState,
  Eyebrow,
  FilterPills,
  Skeleton,
  SkeletonCard,
  useToast,
} from "@/components/ui";
import { useAnimatedNumber } from "@/lib/motion";
import { ShortlistBoard, ShortlistColumn } from "./components/ShortlistBoard";
import { UnlockModal } from "./components/UnlockModal";
import {
  anonDisplayCode,
  PRIVACY_NOTICE,
  shortlistStageLabels,
  shortlistStageOrder,
} from "./talentLabels";

/** Cifra que cuenta de 0 a su valor al entrar en pantalla (06 §4). */
function CountUp({ value }: { value: number }) {
  const { ref, display } = useAnimatedNumber<HTMLSpanElement>(value);
  return (
    <span ref={ref} className="tabular-nums">
      {Math.round(display)}
    </span>
  );
}

/**
 * Nombre de una entrada YA desbloqueada. Es el único punto de E8–E11 donde se
 * consulta el perfil completo, y solo se monta cuando `entry.is_unlocked` es
 * verdadero (permitido explícitamente por 04 §E11).
 */
function UnlockedEntryName({ matchResultId, fallback }: { matchResultId: string; fallback: string }) {
  const { data } = useFullProfile(matchResultId);
  return <>{data?.full_name ?? fallback}</>;
}

/** E11 — Selección / finalistas `/employer/vacancies/:id/shortlist` (04 §E11). */
export function Component() {
  const { id: vacancyId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const vacancyQuery = useVacancy(vacancyId);
  const shortlistQuery = useShortlist(vacancyId);
  const setStage = useSetShortlistStage();
  const unlock = useUnlock();
  const [pendingUnlock, setPendingUnlock] = useState<ShortlistEntry | null>(null);
  const [activeTab, setActiveTab] = useState<string>("REVIEW");

  const entriesByStage = useMemo(() => {
    const base: Record<ShortlistStage, ShortlistEntry[]> = { REVIEW: [], INTERVIEW: [], FINALIST: [] };
    for (const entry of shortlistQuery.data ?? []) {
      base[entry.stage].push(entry);
    }
    for (const stage of shortlistStageOrder) {
      base[stage].sort((a, b) => b.total_score - a.total_score);
    }
    return base;
  }, [shortlistQuery.data]);

  const totalEntries = (shortlistQuery.data ?? []).length;

  const mutateStage = useCallback(
    (entry: ShortlistEntry, stage: ShortlistStage | null) => {
      setStage.mutate(
        { matchResultId: entry.match_result_id, stage },
        {
          onSuccess: () => {
            // useSetShortlistStage ya invalida vacancies/match-results/match-result/shortlist.
            showToast({
              title: stage
                ? `${anonDisplayCode(entry.anon_code)} → ${shortlistStageLabels[stage]}`
                : `${anonDisplayCode(entry.anon_code)} salió de la selección`,
              tone: stage ? "success" : "neutral",
            });
          },
          onError: () =>
            showToast({
              title: "No pudimos mover al candidato",
              description: "Vuelve a intentarlo en unos segundos.",
              tone: "danger",
            }),
        },
      );
    },
    [queryClient, setStage, showToast],
  );

  const renderName = useCallback((entry: ShortlistEntry) => {
    const anon = anonDisplayCode(entry.anon_code);
    return entry.is_unlocked ? (
      <UnlockedEntryName matchResultId={entry.match_result_id} fallback={anon} />
    ) : (
      anon
    );
  }, []);

  const columnProps = {
    variantKey: "board",
    renderName,
    onMove: (entry: ShortlistEntry, stage: ShortlistStage) => mutateStage(entry, stage),
    onRemove: (entry: ShortlistEntry) => mutateStage(entry, null),
    onOpen: (entry: ShortlistEntry) => navigate(`/employer/candidates/${entry.match_result_id}`),
    onUnlock: (entry: ShortlistEntry) => setPendingUnlock(entry),
  };

  const backToTalent = () =>
    navigate(vacancyId ? `/employer/vacancies/${vacancyId}/talent` : "/employer/vacancies");

  if (vacancyQuery.isLoading || shortlistQuery.isLoading) {
    return (
      <PageContainer className="flex flex-col gap-6 py-10">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-6 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageContainer>
    );
  }

  if (vacancyQuery.isError || shortlistQuery.isError) {
    return (
      <PageContainer className="py-16">
        <EmptyState
          icon={AlertCircle}
          title="No pudimos cargar tu selección"
          description="Vuelve a intentarlo en unos segundos."
          cta={{ label: "Reintentar", onClick: () => void shortlistQuery.refetch() }}
        />
      </PageContainer>
    );
  }

  const stageCounts: { label: string; value: number }[] = [
    { label: "En el proceso", value: totalEntries },
    { label: shortlistStageLabels.REVIEW, value: entriesByStage.REVIEW.length },
    { label: shortlistStageLabels.INTERVIEW, value: entriesByStage.INTERVIEW.length },
    { label: shortlistStageLabels.FINALIST, value: entriesByStage.FINALIST.length },
  ];

  return (
    <PageContainer className="flex flex-col gap-10 py-8 pb-16 md:py-10">
      <div>
        <Button variant="ghost" size="md" onClick={backToTalent} className="-ml-4">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al ranking
        </Button>

        <header className="mt-4">
          <Eyebrow tone="accent">Proceso de selección</Eyebrow>
          <h1 className="mt-3 max-w-[20ch] text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-text-on-dark sm:text-[2.5rem]">
            {vacancyQuery.data?.title ?? "Selección"}
          </h1>
          <p className="mt-4 max-w-[62ch] text-pretty text-base text-text-on-dark-secondary">
            {PRIVACY_NOTICE}
          </p>
        </header>
      </div>

      <Card variant="glass" padding="lg">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
          {stageCounts.map((item) => (
            <div key={item.label}>
              <dt>
                <Eyebrow>{item.label}</Eyebrow>
              </dt>
              <dd className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-text-on-dark">
                <CountUp value={item.value} />
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {totalEntries === 0 ? (
        <EmptyState
          icon={Users}
          title="Todavía no tienes candidatos en selección"
          description="Agrega perfiles desde el ranking anónimo para moverlos por tu proceso."
          cta={{ label: "Ir al ranking", onClick: backToTalent }}
        />
      ) : (
        <LayoutGroup>
          {/* Desktop: funnel de tres columnas. */}
          <div className="hidden md:block">
            <ShortlistBoard entriesByStage={entriesByStage} {...columnProps} />
          </div>

          {/* Mobile: mismas etapas, una a la vez. */}
          <div className="flex flex-col gap-6 md:hidden">
            <FilterPills
              aria-label="Etapas del proceso de selección"
              value={activeTab}
              onChange={setActiveTab}
              options={shortlistStageOrder.map((stage) => ({
                value: stage,
                label: `${shortlistStageLabels[stage]} (${entriesByStage[stage].length})`,
              }))}
            />
            <ShortlistColumn
              stage={activeTab as ShortlistStage}
              entries={entriesByStage[activeTab as ShortlistStage]}
              {...columnProps}
              variantKey="tabs"
              hideHeader
            />
          </div>
        </LayoutGroup>
      )}

      <UnlockModal
        open={pendingUnlock != null}
        anonCode={pendingUnlock?.anon_code ?? ""}
        loading={unlock.isPending}
        onClose={() => setPendingUnlock(null)}
        onConfirm={() => {
          if (!pendingUnlock) return;
          const id = pendingUnlock.match_result_id;
          unlock.mutate(id, {
            onSuccess: () => {
              setPendingUnlock(null);
              void queryClient.invalidateQueries({ queryKey: ["vacancies"] });
              navigate(`/employer/candidates/${id}/full`);
            },
            onError: () =>
              showToast({
                title: "No pudimos desbloquear la identidad",
                description: "Vuelve a intentarlo en unos segundos.",
                tone: "danger",
              }),
          });
        }}
      />
    </PageContainer>
  );
}
