import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { queryKeys } from "@/api/queryKeys";

export function useJobFamilies() {
  return useQuery({ queryKey: queryKeys.jobFamilies(), queryFn: () => api.catalog.jobFamilies() });
}

export function useCompetencies(jobFamilyId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.competencies(jobFamilyId ?? "none"),
    queryFn: () => api.catalog.competencies(jobFamilyId as string),
    enabled: jobFamilyId != null,
  });
}

export function useSkillsCatalog() {
  return useQuery({ queryKey: queryKeys.skills(), queryFn: () => api.catalog.skills() });
}

export function useCandidateMe(enabled = true) {
  return useQuery({ queryKey: queryKeys.candidateMe(), queryFn: () => api.candidate.me(), enabled });
}

export function useCandidateStatus(enabled = true) {
  return useQuery({ queryKey: queryKeys.candidateStatus(), queryFn: () => api.candidate.status(), enabled });
}

export function useTalentProfile(enabled = true) {
  return useQuery({
    queryKey: queryKeys.talentProfile(),
    queryFn: () => api.candidate.talentProfile(),
    enabled,
    retry: false,
  });
}

export function useCandidateSkills(enabled = true) {
  return useQuery({ queryKey: queryKeys.candidateSkills(), queryFn: () => api.candidate.skills(), enabled });
}

export function useFeedback(enabled = true) {
  return useQuery({ queryKey: queryKeys.feedback(), queryFn: () => api.candidate.feedback(), enabled, retry: false });
}

export function useLearningPath(enabled = true) {
  return useQuery({ queryKey: queryKeys.learningPath(), queryFn: () => api.candidate.learningPath(), enabled, retry: false });
}

export function useExtraction(enabled = true) {
  return useQuery({ queryKey: queryKeys.extraction(), queryFn: () => api.documents.extraction(), enabled, retry: false });
}

export function useInterview(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.interview(id ?? "none"),
    queryFn: () => api.interviews.get(id as string),
    enabled: id != null,
  });
}

export function useInterviewProgress(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.interviewProgress(id ?? "none"),
    queryFn: () => api.interviews.progress(id as string),
    enabled: id != null,
  });
}

export function useCompanyMe(enabled = true) {
  return useQuery({ queryKey: queryKeys.companyMe(), queryFn: () => api.company.me(), enabled });
}

export function useVerification(enabled = true) {
  return useQuery({ queryKey: queryKeys.verification(), queryFn: () => api.company.verification(), enabled });
}

export function useVacancies(enabled = true) {
  return useQuery({ queryKey: queryKeys.vacancies(), queryFn: () => api.vacancies.list(), enabled });
}

export function useVacancy(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.vacancy(id ?? "none"),
    queryFn: () => api.vacancies.get(id as string),
    enabled: id != null,
  });
}

export function useMatchResults(runId: string | null | undefined, page: { limit: number; offset: number }) {
  return useQuery({
    queryKey: queryKeys.matchResults(runId ?? "none", page),
    queryFn: () => api.matching.results(runId as string, page),
    enabled: runId != null,
  });
}

export function useMatchResult(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.matchResult(id ?? "none"),
    queryFn: () => api.matching.result(id as string),
    enabled: id != null,
  });
}

export function useFullProfile(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.fullProfile(id ?? "none"),
    queryFn: () => api.matching.fullProfile(id as string),
    enabled: id != null,
    retry: false,
  });
}

export function useCompare(vacancyId: string | null | undefined, ids: string[]) {
  return useQuery({
    queryKey: queryKeys.compare(vacancyId ?? "none", ids),
    queryFn: () => api.matching.compare(vacancyId as string, ids),
    enabled: vacancyId != null && ids.length > 0,
  });
}

export function useShortlist(vacancyId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.shortlist(vacancyId ?? "none"),
    queryFn: () => api.matching.shortlist(vacancyId as string),
    enabled: vacancyId != null,
  });
}

export function useOpportunities(enabled = true) {
  return useQuery({ queryKey: queryKeys.opportunities(), queryFn: () => api.opportunities.list(), enabled });
}

export function useOpportunity(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.opportunity(id ?? "none"),
    queryFn: () => api.opportunities.get(id as string),
    enabled: id != null,
  });
}

export function useNotifications() {
  return useQuery({ queryKey: queryKeys.notifications(), queryFn: () => api.mocks.notifications() });
}

export function useMessages() {
  return useQuery({ queryKey: queryKeys.messages(), queryFn: () => api.mocks.messages() });
}

export function usePlans() {
  return useQuery({ queryKey: queryKeys.plans(), queryFn: () => api.mocks.plans() });
}
