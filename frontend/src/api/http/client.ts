import type { ApiClient } from "@/api/client";
import { ApiClientError } from "@/api/client";
import type {
  AnonymousCandidateCard,
  AnswerInput,
  ApiError,
  Application,
  AuthResponse,
  CandidateProfilePatch,
  Company,
  CompanyPatch,
  CompareView,
  CVExtractionPatch,
  DocumentRef,
  InterviewMode,
  JobRef,
  LoginInput,
  Opportunity,
  Paginated,
  RegisterInput,
  RequirementInput,
  ShortlistStage,
  Skill,
  UnlockedCandidateProfile,
  User,
  VacancyInput,
  VacancyWeights,
} from "@/api/types";
import { useSessionStore } from "@/store/session";

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000/api/v1";

function authHeaders(): HeadersInit {
  const token = useSessionStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseError(response: Response): Promise<never> {
  let body: ApiError | null = null;
  try {
    body = (await response.json()) as ApiError;
  } catch {
    // respuesta sin cuerpo JSON
  }
  throw new ApiClientError(
    body?.code ?? "UNKNOWN_ERROR",
    response.status,
    body?.message ?? "Ocurrió un error inesperado.",
    body?.details,
  );
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...init.headers,
    },
  });
  if (!response.ok) await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function json(body: unknown): RequestInit {
  return { body: JSON.stringify(body) };
}

async function multipart<T>(path: string, file: File, extra?: Record<string, string>): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  if (extra) for (const [key, value] of Object.entries(extra)) form.append(key, value);
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
  });
  if (!response.ok) await parseError(response);
  return (await response.json()) as T;
}

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Implementación delgada de ApiClient sobre fetch + VITE_API_URL (fase backend). */
export const httpApiClient: ApiClient = {
  auth: {
    register: (input: RegisterInput) => request<AuthResponse>("/auth/register", { method: "POST", ...json(input) }),
    login: (input: LoginInput) => request<AuthResponse>("/auth/login", { method: "POST", ...json(input) }),
    me: () => request<User>("/auth/me"),
  },
  catalog: {
    jobFamilies: () => request("/job-families"),
    competencies: (jobFamilyId) => request(`/job-families/${jobFamilyId}/competencies`),
    skills: () => request<Skill[]>("/skills"),
  },
  candidate: {
    me: () => request("/candidates/me"),
    update: (patch: CandidateProfilePatch) => request("/candidates/me", { method: "PATCH", ...json(patch) }),
    setJobFamily: (jobFamilyId) => request("/candidates/me/job-family", { method: "POST", ...json({ job_family_id: jobFamilyId }) }),
    status: () => request("/candidates/me/status"),
    talentProfile: () => request("/candidates/me/talent-profile"),
    skills: () => request("/candidates/me/skills"),
    feedback: () => request("/candidates/me/feedback"),
    learningPath: () => request("/candidates/me/learning-path"),
  },
  documents: {
    uploadCV: (file: File) => multipart<JobRef>("/candidates/me/cv", file),
    extraction: () => request("/candidates/me/cv/extraction"),
    confirmExtraction: (patch: CVExtractionPatch) => request("/candidates/me/cv/extraction", { method: "PATCH", ...json(patch) }),
    uploadCertification: (file: File, skillCode?: string) =>
      multipart<DocumentRef>("/candidates/me/certifications", file, skillCode ? { skill_code: skillCode } : undefined),
  },
  cvBuilder: {
    createSession: () => request("/cv-builder/sessions", { method: "POST" }),
    sendMessage: (id, text) => request(`/cv-builder/sessions/${id}/messages`, { method: "POST", ...json({ text }) }),
    finalize: (id) => request(`/cv-builder/sessions/${id}/finalize`, { method: "POST" }),
    document: (id) => request(`/cv-builder/sessions/${id}/document`),
  },
  interviews: {
    create: (mode: InterviewMode) => request("/interviews", { method: "POST", ...json({ mode }) }),
    get: (id) => request(`/interviews/${id}`),
    nextQuestion: (id) => request(`/interviews/${id}/next-question`),
    answer: (id, input: AnswerInput) => request(`/interviews/${id}/answers`, { method: "POST", ...json(input) }),
    progress: (id) => request(`/interviews/${id}/progress`),
    complete: (id) => request<JobRef>(`/interviews/${id}/complete`, { method: "POST" }),
    turns: (id) => request(`/interviews/${id}/turns`),
  },
  company: {
    me: () => request<Company>("/companies/me"),
    update: (patch: CompanyPatch) => request<Company>("/companies/me", { method: "PATCH", ...json(patch) }),
    verification: () => request("/companies/me/verification"),
  },
  vacancies: {
    create: (input: VacancyInput) => request("/vacancies", { method: "POST", ...json(input) }),
    list: () => request("/vacancies"),
    get: (id) => request(`/vacancies/${id}`),
    update: (id, patch) => request(`/vacancies/${id}`, { method: "PATCH", ...json(patch) }),
    setRequirements: (id, requirements: RequirementInput[]) => request(`/vacancies/${id}/requirements`, { method: "PUT", ...json(requirements) }),
    setWeights: (id, weights: VacancyWeights) => request(`/vacancies/${id}/weights`, { method: "PUT", ...json(weights) }),
    resolveRequirements: (id, freeText: string) =>
      request(`/vacancies/${id}/resolve-requirements`, { method: "POST", ...json({ free_text: freeText }) }),
    runMatch: (id) => request<JobRef>(`/vacancies/${id}/match-runs`, { method: "POST" }),
  },
  matching: {
    results: (runId, params) => request<Paginated<AnonymousCandidateCard>>(withQuery(`/match-runs/${runId}/results`, params)),
    result: (matchResultId) => request(`/match-results/${matchResultId}`),
    unlock: (matchResultId) => request<UnlockedCandidateProfile>(`/match-results/${matchResultId}/unlock`, { method: "POST" }),
    fullProfile: (matchResultId) => request(`/match-results/${matchResultId}/full`),
    compare: (vacancyId, matchResultIds: string[]) =>
      request<CompareView>(withQuery(`/vacancies/${vacancyId}/compare`, { ids: matchResultIds.join(",") })),
    shortlist: (vacancyId) => request(`/vacancies/${vacancyId}/shortlist`),
    setShortlistStage: (matchResultId, stage: ShortlistStage | null) =>
      request(`/match-results/${matchResultId}/shortlist`, { method: "PUT", ...json({ stage }) }),
  },
  opportunities: {
    list: () => request<Opportunity[]>("/vacancies/open"),
    get: (vacancyId) => request(`/vacancies/open/${vacancyId}`),
    apply: (vacancyId) => request<Application>(`/vacancies/${vacancyId}/apply`, { method: "POST" }),
    myApplications: () => request("/candidates/me/applications"),
  },
  jobs: {
    get: (id) => request(`/jobs/${id}`),
  },
  mocks: {
    notifications: () => request("/notifications"),
    messages: () => request("/messages"),
    plans: () => request("/billing/plans"),
  },
};
