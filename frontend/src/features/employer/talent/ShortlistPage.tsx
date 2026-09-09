import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { LayoutGroup } from "motion/react";
import { AlertCircle, ArrowLeft, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ShortlistEntry, ShortlistStage } from "@/api/types";
import { useFullProfile, useSetShortlistStage, useShortlist, useUnlock, useVacancy } from "@/api/hooks";
import { BrandBackground } from "@/components/brand/BrandBackground";
import { LightSurface, PageContainer } from "@/components/layout";
import { Button, EmptyState, SkeletonCard, Tabs, useToast } from "@/components/ui";
import { ShortlistBoard, ShortlistColumn } from "./components/ShortlistBoard";
import { UnlockModal } from "./components/UnlockModal";
import {
  anonDisplayCode,
  PRIVACY_NOTICE,
  shortlistStageLabels,
  shortlistStageOrder,
} from "./talentLabels";

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
      <PageContainer className="flex flex-col gap-4 py-10">
        <SkeletonCard />
        <SkeletonCard />
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

  return (
    <div className="min-h-full bg-bg-light">
      <header className="relative overflow-hidden bg-bg-dark pb-16 pt-10">
        <BrandBackground asset="matching" presence="accent" overlay="left" />
        <PageContainer className="relative z-10">
          <Button variant="ghost" size="md" onClick={backToTalent} className="-ml-4 text-text-on-dark">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver al ranking
          </Button>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[.18em] text-accent-soft">
            Proceso de selección
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-text-on-dark sm:text-4xl">
            {vacancyQuery.data?.title ?? "Selección"}
          </h1>
          <p className="mt-3 text-sm text-text-on-dark-secondary">
            {totalEntries} {totalEntries === 1 ? "candidato" : "candidatos"} en tu proceso ·{" "}
            {entriesByStage.REVIEW.length} por revisar · {entriesByStage.INTERVIEW.length} por
            entrevistar · {entriesByStage.FINALIST.length}{" "}
            {entriesByStage.FINALIST.length === 1 ? "finalista" : "finalistas"}
          </p>
          <p className="mt-1 text-sm text-text-on-dark-secondary">{PRIVACY_NOTICE}</p>
        </PageContainer>
      </header>

      <LightSurface>
        <PageContainer>
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

              {/* Mobile: mismas etapas como pestañas. */}
              <div className="md:hidden">
                <Tabs
                  aria-label="Etapas del proceso de selección"
                  value={activeTab}
                  onChange={setActiveTab}
                  items={shortlistStageOrder.map((stage) => ({
                    value: stage,
                    label: `${shortlistStageLabels[stage]} (${entriesByStage[stage].length})`,
                    content: (
                      <ShortlistColumn
                        stage={stage}
                        entries={entriesByStage[stage]}
                        {...columnProps}
                        variantKey="tabs"
                      />
                    ),
                  }))}
                />
              </div>
            </LayoutGroup>
          )}
        </PageContainer>
      </LightSurface>

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
    </div>
  );
}
