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
  Eyebrow,
  ProgressBar,
  Reveal,
  RevealGroup,
  Skeleton,
  SkeletonCard,
  useToast,
} from "@/components/ui";
import { cn } from "@/lib/cn";
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

/** "CANDIDATO #F82" → "#F82": etiqueta corta para las barras apiladas de móvil. */
function shortAnonCode(anonCode: string): string {
  return anonDisplayCode(anonCode).replace("CANDIDATO ", "");
}

const CELL_BORDER = "border-b border-white/[0.07]";

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
      <PageContainer className="flex flex-col gap-6 py-10">
        <Skeleton className="h-9 w-72" />
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
  const isShortlisted = (card: AnonymousCandidateCard) =>
    shortlistedOverride[card.match_result_id] ?? card.shortlist_stage != null;

  // Escritorio: columna de criterios fija + una columna por candidato. Con el
  // sidebar de 260px, a 1280px quedan ~956px útiles dentro de `PageContainer`;
  // 180 + 3×220 = 840px caben completos. Por debajo de `lg` esta tabla no se
  // monta: ahí la comparación se apila (ver `renderStacked`).
  const gridTemplate = `minmax(150px, 180px) repeat(${candidates.length}, minmax(200px, 1fr))`;

  const availabilityLines = (card: AnonymousCandidateCard) => [
    availabilityLabels[card.availability],
    geoBandLabels[card.geo_band],
    `Expectativa: ${card.salary_band}`,
  ];

  return (
    <PageContainer className="flex flex-col gap-8 py-8 pb-16 md:py-10">
      <div>
        <Button variant="ghost" size="md" onClick={backToTalent} className="-ml-4">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al ranking
        </Button>

        <header className="mt-4">
          <Eyebrow tone="accent">Comparar candidatos</Eyebrow>
          <h1 className="mt-3 text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.03em] text-text-on-dark sm:text-[2.5rem]">
            {candidates.length} perfiles lado a lado
          </h1>
          <p className="mt-4 max-w-[62ch] text-pretty text-base text-text-on-dark-secondary">
            {RANKING_NOTICE}
          </p>
        </header>
      </div>

      {/* --------------------------- escritorio --------------------------- */}
      <Card variant="glass" padding="none" className="hidden overflow-x-auto lg:block">
        <div className="grid min-w-full" style={{ gridTemplateColumns: gridTemplate }}>
          <div className={cn("sticky left-0 z-20 bg-surface-dark", CELL_BORDER)} />
          {candidates.map((card) => (
            <div
              key={`head-${card.match_result_id}`}
              className={cn("border-l border-white/[0.07] bg-white/[0.04] p-4", CELL_BORDER)}
            >
              <CompareColumn
                card={card}
                shortlisted={isShortlisted(card)}
                onView={() => navigate(`/employer/candidates/${card.match_result_id}`)}
                onShortlist={() => addToShortlist(card.match_result_id, isShortlisted(card))}
              />
            </div>
          ))}

          {view.criteria.map((criterion, rowIndex) => {
            const tint = rowIndex % 2 === 1 ? "bg-white/[0.03]" : "";
            return (
              <Fragment key={criterion.key}>
                <div
                  className={cn(
                    "sticky left-0 z-10 flex items-center bg-surface-dark px-5 py-5 text-sm font-medium text-text-on-dark",
                    CELL_BORDER,
                    tint,
                  )}
                >
                  {criterion.label}
                </div>
                {candidates.map((card) => {
                  const value = criterionValue(card, criterion.key);
                  return (
                    <div
                      key={`${criterion.key}-${card.match_result_id}`}
                      className={cn(
                        "flex items-center border-l border-white/[0.07] px-5 py-5",
                        CELL_BORDER,
                        tint,
                      )}
                    >
                      {value == null ? (
                        <span className="text-sm text-text-on-dark-tertiary">Sin dato</span>
                      ) : (
                        <div className="w-full">
                          <ProgressBar
                            value={value}
                            showValue
                            size="sm"
                            delay={rowIndex * 90}
                          />
                          <span className="sr-only">
                            {criterion.label} de {anonDisplayCode(card.anon_code)}:{" "}
                            {Math.round(value)} de 100.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </Fragment>
            );
          })}

          <div
            className={cn(
              "sticky left-0 z-10 flex items-center bg-surface-dark px-5 py-5 text-sm font-medium text-text-on-dark",
              CELL_BORDER,
            )}
          >
            Disponibilidad y zona
          </div>
          {candidates.map((card) => (
            <div
              key={`avail-${card.match_result_id}`}
              className={cn(
                "flex flex-col gap-1 border-l border-white/[0.07] px-5 py-5 text-sm text-text-on-dark-secondary",
                CELL_BORDER,
              )}
            >
              {availabilityLines(card).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ))}

          <div className="sticky left-0 z-10 flex items-start bg-surface-dark px-5 py-5 text-sm font-medium text-text-on-dark">
            Habilidades y evidencia
          </div>
          {candidates.map((card) => (
            <div
              key={`skills-${card.match_result_id}`}
              className="border-l border-white/[0.07] px-5 py-5"
            >
              <ul className="flex flex-col gap-2.5">
                {card.skills.slice(0, 6).map((skill) => (
                  <li key={skill.skill_code} className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-text-on-dark-secondary">
                      {skill.skill_name}
                    </span>
                    <EvidenceBadge level={evidenceLevelFor(skill)} size="sm" />
                  </li>
                ))}
                {card.skills.length === 0 && (
                  <li className="text-sm text-text-on-dark-tertiary">
                    Sin habilidades registradas
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      {/* ------------------------------ móvil ------------------------------ */}
      <div className="flex flex-col gap-6 lg:hidden">
        <RevealGroup className="flex flex-col gap-4">
          {candidates.map((card) => (
            <Reveal key={`m-head-${card.match_result_id}`}>
              <Card variant="glass" padding="md">
                <CompareColumn
                  card={card}
                  shortlisted={isShortlisted(card)}
                  onView={() => navigate(`/employer/candidates/${card.match_result_id}`)}
                  onShortlist={() => addToShortlist(card.match_result_id, isShortlisted(card))}
                />
              </Card>
            </Reveal>
          ))}
        </RevealGroup>

        <RevealGroup className="flex flex-col gap-4">
          {view.criteria.map((criterion) => (
            <Reveal key={`m-${criterion.key}`}>
              <Card variant="glass" padding="md">
                <h2 className="text-sm font-semibold text-text-on-dark">{criterion.label}</h2>
                <ul className="mt-4 flex flex-col gap-4">
                  {candidates.map((card, index) => {
                    const value = criterionValue(card, criterion.key);
                    return (
                      <li key={`m-${criterion.key}-${card.match_result_id}`}>
                        {value == null ? (
                          <p className="flex items-baseline justify-between gap-3 text-sm text-text-on-dark-secondary">
                            <span>{shortAnonCode(card.anon_code)}</span>
                            <span className="text-text-on-dark-tertiary">Sin dato</span>
                          </p>
                        ) : (
                          <>
                            <ProgressBar
                              value={value}
                              label={shortAnonCode(card.anon_code)}
                              showValue
                              size="sm"
                              delay={index * 90}
                            />
                            <span className="sr-only">
                              {criterion.label} de {anonDisplayCode(card.anon_code)}:{" "}
                              {Math.round(value)} de 100.
                            </span>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </Reveal>
          ))}

          <Reveal>
            <Card variant="glass" padding="md">
              <h2 className="text-sm font-semibold text-text-on-dark">Disponibilidad y zona</h2>
              <ul className="mt-4 flex flex-col gap-4">
                {candidates.map((card) => (
                  <li key={`m-avail-${card.match_result_id}`}>
                    <p className="text-xs font-medium text-text-on-dark-tertiary">
                      {shortAnonCode(card.anon_code)}
                    </p>
                    <div className="mt-1 flex flex-col gap-0.5 text-sm text-text-on-dark-secondary">
                      {availabilityLines(card).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>

          <Reveal>
            <Card variant="glass" padding="md">
              <h2 className="text-sm font-semibold text-text-on-dark">Habilidades y evidencia</h2>
              <ul className="mt-4 flex flex-col gap-5">
                {candidates.map((card) => (
                  <li key={`m-skills-${card.match_result_id}`}>
                    <p className="text-xs font-medium text-text-on-dark-tertiary">
                      {shortAnonCode(card.anon_code)}
                    </p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {card.skills.slice(0, 6).map((skill) => (
                        <li
                          key={skill.skill_code}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm text-text-on-dark-secondary">
                            {skill.skill_name}
                          </span>
                          <EvidenceBadge level={evidenceLevelFor(skill)} size="sm" />
                        </li>
                      ))}
                      {card.skills.length === 0 && (
                        <li className="text-sm text-text-on-dark-tertiary">
                          Sin habilidades registradas
                        </li>
                      )}
                    </ul>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>
        </RevealGroup>
      </div>

      <Card variant="glass" padding="lg">
        <div className="flex items-start gap-4">
          <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary-on-dark" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-balance text-lg font-semibold text-text-on-dark">
              Ver diferencias clave
            </h2>
            {view.key_differences.length === 0 ? (
              <p className="mt-2 max-w-[68ch] text-pretty text-sm text-text-on-dark-secondary">
                Los perfiles comparados están muy parejos: revisa la evidencia de cada habilidad
                para decidir.
              </p>
            ) : (
              <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm text-text-on-dark-secondary">
                {view.key_differences.map((difference) => (
                  <li key={difference} className="max-w-[68ch] text-pretty">
                    {difference}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-sm text-text-on-dark-tertiary">{RANKING_NOTICE}</p>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
