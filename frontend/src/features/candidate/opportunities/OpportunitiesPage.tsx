import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { AlertCircle, BadgeCheck, Briefcase, MapPin } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FilterPills,
  JobCard,
  ScoreBadge,
  SkeletonCard,
  type FilterPillOption,
} from "@/components/ui";
import { LightSurface, PageContainer } from "@/components/layout";
import { BrandBackground } from "@/components/brand/BrandBackground";
import { useOpportunities } from "@/api/hooks";
import type { Opportunity } from "@/api/types";
import { useMotionSafe } from "@/lib/motion";
import {
  familyCodeLabels,
  locationText,
  readBookmarks,
  salaryText,
  setBookmark,
  workModeLabels,
} from "./opportunities.utils";

type FilterMode = "for-you" | "family" | "modality" | "location";

const PRIMARY_FILTERS: { value: FilterMode; label: string }[] = [
  { value: "for-you", label: "Para ti" },
  { value: "family", label: "Familia" },
  { value: "modality", label: "Modalidad" },
  { value: "location", label: "Ubicación" },
];

function buildSecondaryOptions(mode: FilterMode, items: Opportunity[]): FilterPillOption[] {
  if (mode === "family") {
    const codes = Array.from(new Set(items.map((item) => item.job_family_code)));
    return [{ value: "all", label: "Todas" }, ...codes.map((code) => ({ value: code, label: familyCodeLabels[code] }))];
  }
  if (mode === "modality") {
    const modes = Array.from(new Set(items.map((item) => item.work_mode)));
    return [{ value: "all", label: "Todas" }, ...modes.map((mode2) => ({ value: mode2, label: workModeLabels[mode2] }))];
  }
  if (mode === "location") {
    const cities = Array.from(new Set(items.map((item) => item.location?.city).filter((c): c is string => Boolean(c))));
    return [{ value: "all", label: "Todas" }, ...cities.map((city) => ({ value: city, label: city }))];
  }
  return [];
}

function filterOpportunities(items: Opportunity[], mode: FilterMode, secondaryValue: string): Opportunity[] {
  if (mode === "for-you" || secondaryValue === "all") return items;
  if (mode === "family") return items.filter((item) => item.job_family_code === secondaryValue);
  if (mode === "modality") return items.filter((item) => item.work_mode === secondaryValue);
  if (mode === "location") return items.filter((item) => item.location?.city === secondaryValue);
  return items;
}

/** C13 — Oportunidades `/candidate/opportunities`. */
export function Component() {
  const opportunities = useOpportunities();
  const navigate = useNavigate();
  const { staggerContainer, cardEntrance } = useMotionSafe();

  const [mode, setMode] = useState<FilterMode>("for-you");
  const [secondaryValue, setSecondaryValue] = useState("all");
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => new Set(readBookmarks()));

  useEffect(() => {
    setSecondaryValue("all");
  }, [mode]);

  const items = useMemo(() => opportunities.data ?? [], [opportunities.data]);
  const secondaryOptions = useMemo(() => buildSecondaryOptions(mode, items), [mode, items]);
  const filtered = useMemo(() => filterOpportunities(items, mode, secondaryValue), [items, mode, secondaryValue]);
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (b.compatibility ?? -1) - (a.compatibility ?? -1)),
    [filtered],
  );
  const featured = sorted[0];
  const rest = sorted.slice(1);

  const toggleBookmark = (vacancyId: string, bookmarked: boolean) => {
    setBookmark(vacancyId, bookmarked);
    setBookmarks((current) => {
      const next = new Set(current);
      if (bookmarked) next.add(vacancyId);
      else next.delete(vacancyId);
      return next;
    });
  };

  return (
    <div>
      <div className="relative overflow-hidden bg-bg-dark px-6 pb-14 pt-10 md:px-8 md:pt-14">
        <BrandBackground asset="brand-main" presence="accent" overlay="left" />
        <PageContainer className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-accent-soft">
            Marketplace de talento
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-text-on-dark sm:text-4xl">Oportunidades para ti</h1>
          <p className="mt-2 max-w-2xl text-base text-text-on-dark-secondary">
            Vacantes abiertas de empresas verificadas, priorizadas según tu evidencia.
          </p>
        </PageContainer>
      </div>

      <LightSurface>
        <PageContainer className="flex flex-col gap-8">
          {opportunities.isLoading ? (
            <OpportunitiesSkeleton />
          ) : opportunities.isError ? (
            <EmptyState
              icon={AlertCircle}
              title="No pudimos cargar las oportunidades"
              description="Revisa tu conexión e inténtalo de nuevo."
              cta={{ label: "Reintentar", onClick: () => void opportunities.refetch() }}
            />
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <FilterPills
                  aria-label="Filtrar oportunidades"
                  options={PRIMARY_FILTERS}
                  value={mode}
                  onChange={(value) => setMode(value as FilterMode)}
                />
                {mode !== "for-you" && secondaryOptions.length > 1 && (
                  <FilterPills
                    aria-label="Refinar filtro"
                    options={secondaryOptions}
                    value={secondaryValue}
                    onChange={setSecondaryValue}
                  />
                )}
              </div>

              {items.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="Aún no hay oportunidades abiertas"
                  description="Vuelve pronto, seguimos sumando vacantes verificadas."
                />
              ) : sorted.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="No encontramos oportunidades con este filtro"
                  description="Prueba con otro filtro o vuelve a ver todas las oportunidades."
                  cta={{ label: "Ver todas", onClick: () => setMode("for-you") }}
                />
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={staggerContainer(0.06, 0.05)}
                  className="flex flex-col gap-6"
                >
                  {featured && (
                    <motion.div variants={cardEntrance}>
                      <FeaturedOpportunity
                        opportunity={featured}
                        onOpen={() => navigate(`/candidate/opportunities/${featured.vacancy_id}`)}
                      />
                    </motion.div>
                  )}

                  {rest.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {rest.map((opportunity) => (
                        <motion.div
                          key={opportunity.vacancy_id}
                          variants={cardEntrance}
                          className="flex flex-col gap-1.5"
                        >
                          <JobCard
                            title={opportunity.title}
                            company={opportunity.company_trade_name}
                            companyVerified={opportunity.company_verified}
                            location={locationText(opportunity)}
                            modality={workModeLabels[opportunity.work_mode]}
                            salaryText={salaryText(opportunity.salary_min, opportunity.salary_max)}
                            compatibility={
                              opportunity.compatibility != null
                                ? { score: opportunity.compatibility, label: opportunity.compatibility_label ?? "" }
                                : undefined
                            }
                            applied={opportunity.applied}
                            bookmarked={bookmarks.has(opportunity.vacancy_id)}
                            onBookmarkChange={(bookmarked) => toggleBookmark(opportunity.vacancy_id, bookmarked)}
                            onClick={() => navigate(`/candidate/opportunities/${opportunity.vacancy_id}`)}
                          />
                          {opportunity.compatibility == null && (
                            <p className="px-1 text-xs text-text-tertiary">
                              Completa tu entrevista para ver tu compatibilidad.
                            </p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </PageContainer>
      </LightSurface>
    </div>
  );
}

function FeaturedOpportunity({ opportunity, onOpen }: { opportunity: Opportunity; onOpen: () => void }) {
  return (
    <Card
      variant="dark"
      padding="lg"
      interactive
      onClick={onOpen}
      background={{ asset: "cards", presence: "accent", overlay: "left" }}
      className="flex flex-col gap-4"
    >
      <Badge tone="info">Mejor opción para ti</Badge>
      <div>
        <h2 className="text-2xl font-semibold text-text-on-dark">{opportunity.title}</h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-text-on-dark-secondary">
          {opportunity.company_trade_name}
          {opportunity.company_verified && <BadgeCheck className="size-4 text-accent-soft" aria-hidden="true" />}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-on-dark-secondary">
        <span className="flex items-center gap-1.5">
          <MapPin className="size-4" aria-hidden="true" />
          {locationText(opportunity)}
        </span>
        <span className="flex items-center gap-1.5">
          <Briefcase className="size-4" aria-hidden="true" />
          {workModeLabels[opportunity.work_mode]}
        </span>
      </div>
      <p className="text-base font-medium text-text-on-dark">
        {salaryText(opportunity.salary_min, opportunity.salary_max)}
      </p>
      {opportunity.compatibility != null ? (
        <ScoreBadge score={opportunity.compatibility} label={opportunity.compatibility_label ?? ""} />
      ) : (
        <p className="text-sm text-text-on-dark-secondary">Completa tu entrevista para ver tu compatibilidad.</p>
      )}
      <Button variant="secondary" size="md" arrow onClick={onOpen} className="w-fit">
        Ver detalle
      </Button>
    </Card>
  );
}

function OpportunitiesSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
