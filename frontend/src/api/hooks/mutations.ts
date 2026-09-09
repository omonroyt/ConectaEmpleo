import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api";
import { queryKeys } from "@/api/queryKeys";
import { useSessionStore } from "@/store/session";
import type {
  AnswerInput,
  CandidateProfilePatch,
  CompanyPatch,
  CVExtractionPatch,
  InterviewMode,
  LoginInput,
  RegisterInput,
  RequirementInput,
  ShortlistStage,
  VacancyInput,
  VacancyWeights,
} from "@/api/types";

export function useLogin() {
  const login = useSessionStore((s) => s.login);
  return useMutation({
    mutationFn: (input: LoginInput) => api.auth.login(input),
    onSuccess: (auth) => login(auth),
  });
}

export function useRegister() {
  const login = useSessionStore((s) => s.login);
  return useMutation({
    mutationFn: (input: RegisterInput) => api.auth.register(input),
    onSuccess: (auth) => login(auth),
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: CandidateProfilePatch) => api.candidate.update(patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.candidateMe() });
      void qc.invalidateQueries({ queryKey: queryKeys.candidateStatus() });
    },
  });
}

export function useSetJobFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobFamilyId: string) => api.candidate.setJobFamily(jobFamilyId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.candidateMe() });
      void qc.invalidateQueries({ queryKey: queryKeys.candidateStatus() });
    },
  });
}

export function useUploadCV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.documents.uploadCV(file),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.candidateStatus() });
    },
  });
}

/** F5: sube una certificación opcionalmente ligada a una skill del candidato (queda `pending` de revisión). */
export function useUploadCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { file: File; skillCode?: string }) => api.documents.uploadCertification(vars.file, vars.skillCode),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.candidateSkills() });
    },
  });
}

export function useConfirmExtraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: CVExtractionPatch) => api.documents.confirmExtraction(patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.extraction() });
      void qc.invalidateQueries({ queryKey: queryKeys.candidateMe() });
      void qc.invalidateQueries({ queryKey: queryKeys.candidateStatus() });
    },
  });
}

/** Envoltura de las tres operaciones del CV conversacional (A1 BUILD). */
export function useCvBuilder() {
  const qc = useQueryClient();
  const createSession = useMutation({ mutationFn: () => api.cvBuilder.createSession() });
  const sendMessage = useMutation({
    mutationFn: (vars: { sessionId: string; text: string }) => api.cvBuilder.sendMessage(vars.sessionId, vars.text),
  });
  const finalize = useMutation({
    mutationFn: (sessionId: string) => api.cvBuilder.finalize(sessionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.extraction() });
      void qc.invalidateQueries({ queryKey: queryKeys.candidateStatus() });
    },
  });
  return { createSession, sendMessage, finalize };
}

export function useCreateInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mode: InterviewMode) => api.interviews.create(mode),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.candidateStatus() });
    },
  });
}

export function useAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { interviewId: string; input: AnswerInput }) => api.interviews.answer(vars.interviewId, vars.input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.interview(vars.interviewId) });
      void qc.invalidateQueries({ queryKey: queryKeys.interviewProgress(vars.interviewId) });
    },
  });
}

export function useCompleteInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (interviewId: string) => api.interviews.complete(interviewId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.candidateStatus() });
    },
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: CompanyPatch) => api.company.update(patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.companyMe() }),
  });
}

export function useCreateVacancy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VacancyInput) => api.vacancies.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.vacancies() }),
  });
}

export function useUpdateVacancy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: Partial<VacancyInput> & { status?: "DRAFT" | "OPEN" | "CLOSED" } }) =>
      api.vacancies.update(vars.id, vars.patch),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.vacancy(vars.id) });
      void qc.invalidateQueries({ queryKey: queryKeys.vacancies() });
    },
  });
}

export function useResolveRequirements() {
  return useMutation({
    mutationFn: (vars: { vacancyId: string; freeText: string }) => api.vacancies.resolveRequirements(vars.vacancyId, vars.freeText),
  });
}

export function useSetRequirements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { vacancyId: string; requirements: RequirementInput[] }) => api.vacancies.setRequirements(vars.vacancyId, vars.requirements),
    onSuccess: (_data, vars) => void qc.invalidateQueries({ queryKey: queryKeys.vacancy(vars.vacancyId) }),
  });
}

export function useSetWeights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { vacancyId: string; weights: VacancyWeights }) => api.vacancies.setWeights(vars.vacancyId, vars.weights),
    onSuccess: (_data, vars) => void qc.invalidateQueries({ queryKey: queryKeys.vacancy(vars.vacancyId) }),
  });
}

export function useRunMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vacancyId: string) => api.vacancies.runMatch(vacancyId),
    onSuccess: (_data, vacancyId) => void qc.invalidateQueries({ queryKey: queryKeys.vacancy(vacancyId) }),
  });
}

/** Invalida cualquier query de shortlist sin importar el prefijo exacto (hoy vive bajo `["vacancies", id, "shortlist"]`). */
function invalidateShortlistQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ predicate: (query) => query.queryKey.includes("shortlist") });
}

export function useUnlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matchResultId: string) => api.matching.unlock(matchResultId),
    onSuccess: (_data, matchResultId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.matchResult(matchResultId) });
      void qc.invalidateQueries({ queryKey: queryKeys.fullProfile(matchResultId) });
      void qc.invalidateQueries({ queryKey: ["match-results"] });
      invalidateShortlistQueries(qc);
    },
  });
}

export function useSetShortlistStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { matchResultId: string; stage: ShortlistStage | null }) => api.matching.setShortlistStage(vars.matchResultId, vars.stage),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ["vacancies"] });
      void qc.invalidateQueries({ queryKey: ["match-results"] });
      void qc.invalidateQueries({ queryKey: queryKeys.matchResult(vars.matchResultId) });
      invalidateShortlistQueries(qc);
    },
  });
}

export function useApply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vacancyId: string) => api.opportunities.apply(vacancyId),
    onSuccess: (_data, vacancyId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.opportunity(vacancyId) });
      void qc.invalidateQueries({ queryKey: queryKeys.opportunities() });
    },
  });
}
