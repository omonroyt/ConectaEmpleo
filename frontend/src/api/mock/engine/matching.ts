import type {
  AnonymousCandidateCard,
  BreakdownItem,
  CandidateProfile,
  CandidateSkill,
  CompetencyEvaluation,
  GeoBand,
  MatchComponent,
  Penalty,
  Vacancy,
  VacancyRequirement,
} from "@/api/types";
import type { CandidateRecord, StoredMatchResult } from "../state";
import { geoBandFor, GEO_BAND_SCORE } from "../seed/geo";
import { clamp, genId, nowIso } from "../util";

const ALGORITHM_VERSION = "mock-1.0.0";

/**
 * Fórmula real de matching (02 §5 / prompt F2):
 * total = clamp( Σ(peso_i/100 × raw_i) − Σ penalties, 0, 100 )
 */
export function computeMatch(
  candidate: CandidateRecord,
  vacancy: Vacancy,
): {
  breakdown: BreakdownItem[];
  penalties: Penalty[];
  total_score: number;
  strengths: string[];
  gaps: string[];
  evidence_counts: { declared: number; evaluated: number; verified: number };
  years_experience: number;
  geo_band: GeoBand;
  salary_band: string;
} {
  const profile = candidate.profile;
  const evaluations = candidate.evaluations;
  const skills = candidate.skills;

  const technicalRaw = averageAttenuated(evaluations.filter((e) => e.type === "TECHNICAL"));
  const behavioralRaw = averageAttenuated(evaluations.filter((e) => e.type === "BEHAVIORAL"));

  const yearsExperience = yearsOfExperience(profile);
  let experienceRaw = clamp(Math.min(100, yearsExperience * 20));
  if (!hasFamilyRelevantExperience(profile)) experienceRaw = clamp(experienceRaw * 0.85);

  const totalSkills = Math.max(1, skills.length);
  const declared = skills.filter((s) => s.is_declared).length;
  const evaluated = skills.filter((s) => s.is_evaluated).length;
  const verified = skills.filter((s) => s.is_verified).length;
  const evidenceRaw = clamp((100 * (0.2 * declared + 0.5 * evaluated + 1.0 * verified)) / totalSkills);

  const salaryRaw = salaryScore(profile, vacancy);
  const geoBand = geoBandFor(profile.location?.city ?? "", vacancy.location?.city ?? "");
  const locationRaw = GEO_BAND_SCORE[geoBand];

  const rawByComponent: Record<MatchComponent, number> = {
    TECHNICAL: technicalRaw,
    BEHAVIORAL: behavioralRaw,
    EXPERIENCE: experienceRaw,
    EVIDENCE: evidenceRaw,
    SALARY: salaryRaw,
    LOCATION: locationRaw,
  };

  const breakdown: BreakdownItem[] = (Object.keys(rawByComponent) as MatchComponent[]).map((component) => {
    const weight = vacancy.weights[component];
    const raw = rawByComponent[component];
    return { component, weight, raw, contribution: (weight / 100) * raw };
  });

  const penalties = computePenalties(candidate, vacancy, salaryRaw, geoBand);
  const weightedSum = breakdown.reduce((sum, item) => sum + item.contribution, 0);
  const penaltyPoints = penalties.reduce((sum, p) => sum + p.points, 0);
  const total_score = clamp(Math.round(weightedSum - penaltyPoints));

  const strengths = [...evaluations]
    .filter((e) => e.score >= 75)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((e) => `${e.competency_name.toLowerCase()} (evaluada, ${e.score})`);

  const gaps = gapsFor(candidate, vacancy);

  return {
    breakdown,
    penalties,
    total_score,
    strengths: strengths.length > 0 ? strengths : ["Consistencia general en la evidencia disponible"],
    gaps,
    evidence_counts: { declared, evaluated, verified },
    years_experience: yearsExperience,
    geo_band: geoBand,
    salary_band: salaryBand(profile),
  };
}

function averageAttenuated(evaluations: CompetencyEvaluation[]): number {
  if (evaluations.length === 0) return 0;
  const sum = evaluations.reduce((acc, e) => acc + e.score * (0.7 + 0.3 * e.confidence), 0);
  return clamp(sum / evaluations.length);
}

function yearsOfExperience(profile: CandidateProfile): number {
  const now = Date.now();
  let months = 0;
  for (const item of profile.experience) {
    const start = Date.parse(item.start_date);
    const end = item.end_date ? Date.parse(item.end_date) : now;
    if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
      months += (end - start) / (1000 * 60 * 60 * 24 * 30);
    }
  }
  return Math.round((months / 12) * 10) / 10;
}

function hasFamilyRelevantExperience(profile: CandidateProfile): boolean {
  return profile.experience.some((e) => e.skills.length > 0);
}

function salaryScore(profile: CandidateProfile, vacancy: Vacancy): number {
  const candMin = profile.salary_expectation_min;
  const candMax = profile.salary_expectation_max;
  const vacMin = vacancy.salary_min;
  const vacMax = vacancy.salary_max;
  if (candMin == null || candMax == null || vacMin == null || vacMax == null) return 60;
  const overlap = candMin <= vacMax && candMax >= vacMin;
  if (overlap) return 100;
  const gap = candMin > vacMax ? candMin - vacMax : vacMin - candMax;
  const reference = Math.max(1, (vacMin + vacMax) / 2);
  const ratio = gap / reference;
  return ratio < 0.2 ? 60 : 20;
}

function salaryBand(profile: CandidateProfile): string {
  if (profile.salary_expectation_min == null || profile.salary_expectation_max == null) return "No especificado";
  const min = Math.round(profile.salary_expectation_min / 1000);
  const max = Math.round(profile.salary_expectation_max / 1000);
  return `${min}–${max} mil`;
}

function computePenalties(
  candidate: CandidateRecord,
  vacancy: Vacancy,
  salaryRaw: number,
  geoBand: GeoBand,
): Penalty[] {
  const penalties: Penalty[] = [];
  for (const requirement of vacancy.requirements) {
    if (requirement.kind !== "MANDATORY") continue;
    if (!isRequirementMet(candidate, requirement)) {
      penalties.push({ reason: "MANDATORY_UNMET", requirement: requirement.label, points: 8 });
    }
  }
  if (salaryRaw <= 20) {
    penalties.push({ reason: "SALARY_OUT_OF_RANGE", requirement: "Rango salarial", points: 5 });
  }
  if (geoBand === "FAR") {
    penalties.push({ reason: "LOCATION_FAR", requirement: "Ubicación", points: 5 });
  }
  return penalties;
}

function isRequirementMet(candidate: CandidateRecord, requirement: VacancyRequirement): boolean {
  if (requirement.competency_code) {
    const evaluation = candidate.evaluations.find((e) => e.competency_code === requirement.competency_code);
    if (!evaluation) return false;
    return evaluation.rubric_level >= requirement.min_level;
  }
  if (requirement.skill_code) {
    const skill = candidate.skills.find((s) => s.skill_code === requirement.skill_code);
    if (!skill || !skill.is_evaluated) return false;
    const level = skill.evaluated_score != null ? Math.ceil(skill.evaluated_score / 25) : 0;
    return level >= requirement.min_level;
  }
  return true;
}

function gapsFor(candidate: CandidateRecord, vacancy: Vacancy): string[] {
  return vacancy.requirements
    .filter((r) => !isRequirementMet(candidate, r))
    .map((r) => r.label);
}

export function scoreLabelFor(score: number): string {
  if (score >= 85) return "Compatibilidad muy alta";
  if (score >= 70) return "Compatibilidad alta";
  if (score >= 50) return "Compatibilidad media";
  return "Compatibilidad baja";
}

export function buildAnonymousCard(
  candidate: CandidateRecord,
  vacancy: Vacancy,
  rankPosition: number,
): StoredMatchResult {
  const computed = computeMatch(candidate, vacancy);
  const match_result_id = genId("mr");
  const card: StoredMatchResult = {
    match_result_id,
    candidate_id: candidate.profile.id,
    vacancy_id: vacancy.id,
    anon_code: candidate.profile.anon_code,
    job_family_code: familyCodeFor(vacancy.job_family_id),
    rank_position: rankPosition,
    total_score: computed.total_score,
    score_label: scoreLabelFor(computed.total_score),
    breakdown: computed.breakdown,
    penalties: computed.penalties,
    strengths: computed.strengths,
    gaps: computed.gaps,
    skills: candidate.skills as CandidateSkill[],
    evidence_counts: computed.evidence_counts,
    years_experience: computed.years_experience,
    availability: candidate.profile.availability ?? "ONE_MONTH",
    geo_band: computed.geo_band,
    salary_band: computed.salary_band,
    explanation_text: null,
    shortlist_stage: null,
    is_unlocked: false,
  };
  return card;
}

function familyCodeFor(jobFamilyId: string): AnonymousCandidateCard["job_family_code"] {
  if (jobFamilyId.includes("heavy")) return "HEAVY_MACHINERY_OPERATOR";
  if (jobFamilyId.includes("warehouse")) return "WAREHOUSE_SUPERVISOR";
  return "ADMIN_ASSISTANT";
}

export { ALGORITHM_VERSION, nowIso };
