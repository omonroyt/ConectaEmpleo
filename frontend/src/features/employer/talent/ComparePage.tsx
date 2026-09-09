import { Fragment, useCallback, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { AlertCircle, ArrowLeft, GitCompareArrows, Lightbulb } from "lucide-react";
import type { AnonymousCandidateCard, MatchComponent } from "@/api/types";
import { useCompare, useSetShortlistStage } from "@/api/hooks";
import { PageContainer } from "@/components/layout";
import {
  Button,
  Card,
  EmptyState,
  EvidenceBadge,
  PageHeader,
  ProgressBar,
  SkeletonCard,
  useToast,
} from "@/components/ui";
import { CompareColumn } from "./components/CompareColumn";
import {
  anonDisplayCode,
  availabilityLabels,
  evidenceLevelFor,
  geoBandLabels,
  RANKING_NOTICE,
} from "./talentLabels";

const MATCH_COMPONENTS: MatchComponent[] = [
  "TECHNICAL",
  "BEHAVIORAL",
  "EXPERIENCE",
  "EVIDENCE",
  "SALARY",
  "LOCATION",
];

function isMatchComponent(key: string): key is MatchComponent {
  return (MATCH_COMPONENTS as string[]).includes(key);
}

/** Valor 0–100 de un criterio para un candidato; `null` si no aplica una barra. */
function criterionValue(card: AnonymousCandidateCard, key: string): number | null {
  if (key === "total_score") return card.total_score;
  if (isMatchComponent(key)) {
    return card.breakdown.find((item) => item.component === key)?.raw ?? null;
  }
  return null;
}

/** E10 — Comparar `/employer/vacancies/:id/compare?ids=a,b,c` (04 §E10). */
export function Component() {
  const { id: vacancyId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const ids = useMemo(() => {
    const raw = searchParams.get("ids") ?? "";
    return raw.split(",").map((id) => id.trim()).filter(Boolean).slice(0, 3);
  }, [searchParams]);

  const compareQuery = useCompare(vacancyId, ids);
  const view = compareQuery.data;
  const setStage = useSetShortlistStage();
  const [shortlistedOverride, setShortlistedOverride] = useState<Record<string, boolean>>({});

  const addToShortlist = useCallback(
    (matchResultId: string, current: boolean) => {
      setShortlistedOverride((prev) => ({ ...prev, [matchResultId]: !current }));
      setStage.mutate(
        { matchResultId, stage: current ? null : "REVIEW" },
        {
          onSuccess: () => {
            // useSetShortlistStage ya invalida match-result/match-results/vacancies/shortlist.
            showToast({
              title: current ? "Quitado de la selección" : "Agregado a la selección",
              tone: current ? "neutral" : "success",
            });
          },
          onError: () => {
            setShortlistedOverride((prev) => ({ ...prev, [matchResultId]: current }));
            showToast({ title: "No pudimos actualizar la selección", tone: "danger" });
          },
        },
      );
    },
    [setStage, showToast],
  );

  const backToTalent = () =>
    navigate(vacancyId ? `/employer/vacancies/${vacancyId}/talent` : "/employer/vacancies");

  if (ids.length === 0) {
    return (
      <PageContainer className="py-16">
        <EmptyState
          icon={GitCompareArrows}
          title="Elige a quiénes comparar"
          description="Selecciona entre 2 y 3 candidatos en el ranking para verlos lado a lado."
          cta={{ label: "Ir al ranking", onClick: backToTalent }}
        />
      </PageContainer>
    );
  }

  if (compareQuery.isLoading) {
    return (
      <PageContainer className="flex flex-col gap-4 py-10">
        <SkeletonCard />
        <SkeletonCard />
      </PageContainer>
    );
  }

  if (compareQuery.isError || !view || view.candidates.length === 0) {
    return (
      <PageContainer className="py-16">
        <EmptyState
          icon={AlertCircle}
          title="No pudimos cargar la comparación"
          description="Puede que alguno de los perfiles ya no esté disponible en esta corrida de matching."
          cta={{ label: "Volver al ranking", onClick: backToTalent }}
        />
      </PageContainer>
    );
  }

  const candidates = view.candidates;
  const gridTemplate = `minmax(140px, 168px) repeat(${candidates.length}, minmax(240px, 1fr))`;

  return (
    <div className="min-h-full bg-bg-light pb-16">
      <PageContainer className="pt-8">
        <Button variant="ghost" size="md" onClick={backToTalent} className="-ml-4">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al ranking
        </Button>

        <PageHeader
          className="mt-4"
          eyebrow="Comparar candidatos"
          title={`${candidates.length} perfiles lado a lado`}
          subtitle={RANKING_NOTICE}
        />

        {/* Tabla comparativa: en desktop caben las 3 columnas; en mobile es un
            carrusel con scroll-snap y la columna de criterios fija a la izquierda.
            El header de columnas solo puede quedar `sticky` de verdad si el propio
            contenedor con `overflow-x-auto` también scrollea en vertical (si no, el
            navegador nunca activa el `position: sticky` porque no hay ancestro de
            scroll vertical): por eso en desktop se le da una altura acotada y
            `overflow-y-auto` — el scroll de la tabla queda contenido, no la página. */}
        <Card padding="sm" className="mt-8 overflow-x-auto p-0 md:max-h-[70vh] md:overflow-y-auto">
          <div
            className="grid min-w-max snap-x snap-mandatory"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div className="sticky left-0 top-0 z-30 border-b border-border bg-surface" />
            {candidates.map((card) => {
              const shortlisted =
                shortlistedOverride[card.match_result_id] ?? card.shortlist_stage != null;
              return (
                <div
                  key={`head-${card.match_result_id}`}
                  className="sticky top-0 z-20 border-b border-border bg-surface"
                >
                  <CompareColumn
                    card={card}
                    shortlisted={shortlisted}
                    onView={() => navigate(`/employer/candidates/${card.match_result_id}`)}
                    onShortlist={() => addToShortlist(card.match_result_id, shortlisted)}
                  />
                </div>
              );
            })}

            {view.criteria.map((criterion) => (
              <Fragment key={criterion.key}>
                <div className="sticky left-0 z-10 flex items-center border-b border-border bg-surface px-4 py-4 text-sm font-medium text-text-primary">
                  {criterion.label}
                </div>
                {candidates.map((card) => {
                  const value = criterionValue(card, criterion.key);
                  return (
                    <div
                      key={`${criterion.key}-${card.match_result_id}`}
                      className="border-b border-l border-border px-4 py-4"
                    >
                      {value == null ? (
                        <span className="text-sm text-text-tertiary">Sin dato</span>
                      ) : (
                        <>
                          <ProgressBar value={value} showValue />
                          <span className="sr-only">
                            {criterion.label} de {anonDisplayCode(card.anon_code)}:{" "}
                            {Math.round(value)} de 100.
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </Fragment>
            ))}

            <div className="sticky left-0 z-10 flex items-center border-b border-border bg-surface px-4 py-4 text-sm font-medium text-text-primary">
              Disponibilidad y zona
            </div>
            {candidates.map((card) => (
              <div
                key={`avail-${card.match_result_id}`}
                className="border-b border-l border-border px-4 py-4 text-sm text-text-secondary"
              >
                <p>{availabilityLabels[card.availability]}</p>
                <p>{geoBandLabels[card.geo_band]}</p>
                <p>Expectativa: {card.salary_band}</p>
              </div>
            ))}

            <div className="sticky left-0 z-10 flex items-start border-border bg-surface px-4 py-4 text-sm font-medium text-text-primary">
              Habilidades y evidencia
            </div>
            {candidates.map((card) => (
              <div key={`skills-${card.match_result_id}`} className="border-l border-border px-4 py-4">
                <ul className="flex flex-col gap-2">
                  {card.skills.slice(0, 6).map((skill) => (
                    <li key={skill.skill_code} className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-text-secondary">{skill.skill_name}</span>
                      <EvidenceBadge level={evidenceLevelFor(skill)} size="sm" />
                    </li>
                  ))}
                  {card.skills.length === 0 && (
                    <li className="text-sm text-text-tertiary">Sin habilidades registradas</li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="mt-8">
          <div className="flex items-start gap-3">
            <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Ver diferencias clave</h2>
              {view.key_differences.length === 0 ? (
                <p className="mt-2 text-sm text-text-secondary">
                  Los perfiles comparados están muy parejos: revisa la evidencia de cada habilidad
                  para decidir.
                </p>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                  {view.key_differences.map((difference) => (
                    <li key={difference}>{difference}</li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-sm text-text-tertiary">{RANKING_NOTICE}</p>
            </div>
          </div>
        </Card>
      </PageContainer>
    </div>
  );
}
