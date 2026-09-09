import type { AnonymousCandidateCard } from "@/api/types";
import { FilterPills, type FilterPillOption } from "@/components/ui";

/** Filtros de E8 (04 §E8). Se aplican localmente sobre la página ya cargada. */
export type TalentFilterValue =
  | "ALL"
  | "HIGH_EVIDENCE"
  | "AVAILABLE"
  | "TOP_MATCH"
  | "NEARBY"
  | "SALARY_FIT";

export const talentFilterOptions: FilterPillOption[] = [
  { value: "ALL", label: "Todos" },
  { value: "HIGH_EVIDENCE", label: "Evidencia alta" },
  { value: "AVAILABLE", label: "Disponibles" },
  { value: "TOP_MATCH", label: "Mayor compatibilidad" },
  { value: "NEARBY", label: "Cerca" },
  { value: "SALARY_FIT", label: "Salario compatible" },
];

const predicates: Record<TalentFilterValue, (card: AnonymousCandidateCard) => boolean> = {
  ALL: () => true,
  HIGH_EVIDENCE: (card) => card.evidence_counts.verified >= 2,
  AVAILABLE: (card) => card.availability === "IMMEDIATE",
  TOP_MATCH: (card) => card.total_score >= 70,
  NEARBY: (card) => card.geo_band === "SAME_CITY" || card.geo_band === "UNDER_30KM",
  SALARY_FIT: (card) => !card.penalties.some((p) => p.reason === "SALARY_OUT_OF_RANGE"),
};

/** Aplica el filtro y conserva el orden por `rank_position`. */
export function applyTalentFilter(
  cards: AnonymousCandidateCard[],
  filter: TalentFilterValue,
): AnonymousCandidateCard[] {
  return cards.filter(predicates[filter]).sort((a, b) => a.rank_position - b.rank_position);
}

export interface TalentFiltersProps {
  value: TalentFilterValue;
  onChange: (value: TalentFilterValue) => void;
  className?: string;
}

export function TalentFilters({ value, onChange, className }: TalentFiltersProps) {
  return (
    <FilterPills
      aria-label="Filtrar candidatos"
      options={talentFilterOptions}
      value={value}
      onChange={(next) => onChange(next as TalentFilterValue)}
      className={className}
    />
  );
}
