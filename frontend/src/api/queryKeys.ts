/** Claves de TanStack Query centralizadas para invalidaciones consistentes. */
export const queryKeys = {
  jobFamilies: () => ["catalog", "job-families"] as const,
  competencies: (jobFamilyId: string) => ["catalog", "competencies", jobFamilyId] as const,
  skills: () => ["catalog", "skills"] as const,

  candidateMe: () => ["candidate", "me"] as const,
  candidateStatus: () => ["candidate", "status"] as const,
  talentProfile: () => ["candidate", "talent-profile"] as const,
  candidateSkills: () => ["candidate", "skills"] as const,
  feedback: () => ["candidate", "feedback"] as const,
  learningPath: () => ["candidate", "learning-path"] as const,
  extraction: () => ["candidate", "cv-extraction"] as const,

  interview: (id: string) => ["interview", id] as const,
  interviewProgress: (id: string) => ["interview", id, "progress"] as const,

  companyMe: () => ["company", "me"] as const,
  verification: () => ["company", "verification"] as const,
  vacancies: () => ["vacancies"] as const,
  vacancy: (id: string) => ["vacancies", id] as const,

  matchResults: (runId: string, page: { limit: number; offset: number }) =>
    ["match-results", runId, page.limit, page.offset] as const,
  matchResult: (id: string) => ["match-result", id] as const,
  fullProfile: (id: string) => ["match-result", id, "full"] as const,
  compare: (vacancyId: string, ids: string[]) => ["vacancies", vacancyId, "compare", ...ids] as const,
  shortlist: (vacancyId: string) => ["vacancies", vacancyId, "shortlist"] as const,

  opportunities: () => ["opportunities"] as const,
  opportunity: (id: string) => ["opportunities", id] as const,

  notifications: () => ["notifications"] as const,
  messages: () => ["messages"] as const,
  plans: () => ["plans"] as const,

  job: (id: string) => ["jobs", id] as const,
};
