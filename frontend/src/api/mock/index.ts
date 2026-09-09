import type { ApiClient } from "@/api/client";
import { ApiClientError } from "@/api/client";
import type {
  AnonymousCandidateCard,
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
  RegisterInput,
  RequirementInput,
  ShortlistEntry,
  ShortlistStage,
  Skill,
  UnlockedCandidateProfile,
  User,
  Vacancy,
  VacancyInput,
  VacancyWeights,
} from "@/api/types";
import { useSessionStore } from "@/store/session";
import { getDB, mutate, resetMock } from "./state";
import { delay, genId, nowIso, clamp } from "./util";
import { enqueueJob, getJob } from "./jobs";
import { JOB_FAMILIES, COMPETENCIES_BY_FAMILY, SKILLS } from "./seed/catalog";
import { SEED_NOTIFICATIONS, SEED_MESSAGES, SEED_PLANS } from "./seed/misc";
import { buildFreshCandidateProfile, type StoredUser } from "./seed/users";
import { generateExtractionFromFile, buildExtractionFromCvBuilder, advanceCvBuilder } from "./engine/cv";
import { CV_BUILDER_SCRIPT, CV_BUILDER_CLOSING } from "./seed/cvBuilderScript";
import * as interviewEngine from "./engine/interview";
import { buildAnonymousCard, scoreLabelFor, ALGORITHM_VERSION } from "./engine/matching";
import { buildExplanation, buildKeyDifferences } from "./engine/explain";
import { resolveRequirements as resolveRequirementsEngine } from "./engine/resolve";
import type { StoredMatchResult, StoredCvBuilderSession, StoredInterview } from "./state";

// ---------- helpers de sesión ----------

function encodeToken(userId: string): string {
  return `mock.${btoa(userId)}.${Math.random().toString(36).slice(2)}`;
}

function decodeToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2 || parts[0] !== "mock") return null;
  try {
    return atob(parts[1]);
  } catch {
    return null;
  }
}

function currentUser(): StoredUser {
  const token = useSessionStore.getState().token;
  if (!token) throw new ApiClientError("UNAUTHENTICATED", 401, "Debes iniciar sesión.");
  const userId = decodeToken(token);
  const user = userId ? getDB().users.find((u) => u.id === userId) : undefined;
  if (!user) throw new ApiClientError("UNAUTHENTICATED", 401, "Tu sesión ya no es válida.");
  return user;
}

function requireCandidate() {
  const user = currentUser();
  if (user.role !== "CANDIDATE" || !user.candidateId) {
    throw new ApiClientError("FORBIDDEN", 403, "Esta acción es solo para candidatos.");
  }
  const record = getDB().candidates[user.candidateId];
  if (!record) throw new ApiClientError("NOT_FOUND", 404, "No se encontró el perfil del candidato.");
  return { user, candidateId: user.candidateId, record };
}

function requireCompany() {
  const user = currentUser();
  if (user.role !== "COMPANY" || !user.companyId) {
    throw new ApiClientError("FORBIDDEN", 403, "Esta acción es solo para empresas.");
  }
  const company = getDB().companies[user.companyId];
  if (!company) throw new ApiClientError("NOT_FOUND", 404, "No se encontró la empresa.");
  return { user, companyId: user.companyId, company };
}

function toPublicUser(user: StoredUser): User {
  return { id: user.id, email: user.email, role: user.role, created_at: user.created_at };
}

function completionPercent(profile: { full_name: string; job_family_id: string | null; location: unknown; availability: unknown; experience: unknown[]; education: unknown[] }): number {
  const checks = [
    profile.full_name.trim().length > 0 && profile.full_name !== "Candidato Demo",
    profile.job_family_id != null,
    profile.location != null,
    profile.availability != null,
    profile.experience.length > 0,
    profile.education.length > 0,
  ];
  const done = checks.filter(Boolean).length;
  return clamp(Math.round((done / checks.length) * 100));
}

// ---------- interview: mapeo a tipos públicos ----------

function toPublicInterview(stored: StoredInterview) {
  return {
    id: stored.id,
    status: stored.status,
    mode: stored.mode,
    question_budget: stored.question_budget,
    questions_asked: stored.questions_asked,
    coverage_state: stored.coverage_state,
    started_at: stored.started_at,
    completed_at: stored.completed_at,
  };
}

// ---------- cvBuilder: mapeo a tipos públicos ----------

function toPublicCvSession(session: StoredCvBuilderSession) {
  const draft: CVExtractionPatch = buildExtractionFromCvBuilder(session.answers);
  return {
    id: session.id,
    status: session.status,
    turn: Math.min(session.turnIndex + 1, CV_BUILDER_SCRIPT.length),
    max_turns: CV_BUILDER_SCRIPT.length,
    draft,
  };
}

// ---------- matching: helpers ----------

function ensureExplanation(card: StoredMatchResult): string {
  if (card.explanation_text) return card.explanation_text;
  const db = getDB();
  const run = Object.values(db.matchRuns).find((r) => r.result_ids.includes(card.match_result_id));
  let nextScore: number | null = null;
  if (run) {
    const idx = run.result_ids.indexOf(card.match_result_id);
    const nextId = run.result_ids[idx + 1];
    nextScore = nextId ? (db.matchResults[nextId]?.total_score ?? null) : null;
  }
  const text = buildExplanation(card, nextScore);
  card.explanation_text = text;
  return text;
}

function toAnonymousCard(card: StoredMatchResult): AnonymousCandidateCard {
  ensureExplanation(card);
  const { candidate_id: _candidateId, vacancy_id: _vacancyId, ...rest } = card;
  void _candidateId;
  void _vacancyId;
  return rest;
}

function buildUnlockedProfile(card: StoredMatchResult): UnlockedCandidateProfile {
  const db = getDB();
  const record = db.candidates[card.candidate_id];
  if (!record) throw new ApiClientError("NOT_FOUND", 404, "No se encontró el candidato.");
  const owner = db.users.find((u) => u.candidateId === record.profile.id);
  if (!record.talentProfile) throw new ApiClientError("NOT_EVALUATED", 404, "El candidato aún no tiene evaluación.");
  const anonymous = toAnonymousCard(card);
  return {
    ...anonymous,
    candidate_id: record.profile.id,
    full_name: record.profile.full_name,
    email: owner?.email ?? "no-disponible@conectaempleo.mx",
    phone: record.profile.phone,
    photo_url: record.profile.photo_url,
    location: record.profile.location ?? { city: "No especificado", state: "" },
    experience: record.profile.experience,
    education: record.profile.education,
    documents: record.documents,
    talent_profile: record.talentProfile,
    company_note: record.feedback?.company_note ?? null,
  };
}

function normalizeWeights(weights: VacancyWeights): VacancyWeights {
  const keys = Object.keys(weights) as (keyof VacancyWeights)[];
  const sum = keys.reduce((acc, k) => acc + weights[k], 0);
  if (sum <= 0) {
    const equal = Math.round(100 / keys.length);
    const normalized = {} as VacancyWeights;
    keys.forEach((k, idx) => {
      normalized[k] = idx === keys.length - 1 ? 100 - equal * (keys.length - 1) : equal;
    });
    return normalized;
  }
  const scaled = {} as VacancyWeights;
  let running = 0;
  keys.forEach((k, idx) => {
    if (idx === keys.length - 1) {
      scaled[k] = 100 - running;
    } else {
      const value = Math.round((weights[k] / sum) * 100);
      scaled[k] = value;
      running += value;
    }
  });
  return scaled;
}

function normalizeRequirementWeights(requirements: RequirementInput[]): RequirementInput[] {
  if (requirements.length === 0) return [];
  const sum = requirements.reduce((acc, r) => acc + r.weight, 0);
  if (sum <= 0) {
    const equal = Math.round(100 / requirements.length);
    return requirements.map((r, idx) => ({ ...r, weight: idx === requirements.length - 1 ? 100 - equal * (requirements.length - 1) : equal }));
  }
  let running = 0;
  return requirements.map((r, idx) => {
    if (idx === requirements.length - 1) return { ...r, weight: 100 - running };
    const value = Math.round((r.weight / sum) * 100);
    running += value;
    return { ...r, weight: value };
  });
}

// ---------- ApiClient mock ----------

export const mockApiClient: ApiClient = {
  auth: {
    async register(input: RegisterInput): Promise<AuthResponse> {
      await delay();
      return mutate((db) => {
        if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
          throw new ApiClientError("EMAIL_TAKEN", 409, "Ese correo ya está registrado.");
        }
        const userId = genId("user");
        const user: StoredUser = { id: userId, email: input.email, password: input.password, role: input.role, created_at: nowIso() };
        if (input.role === "CANDIDATE") {
          const profile = buildFreshCandidateProfile();
          const suffix = Math.random().toString(16).slice(2, 6).toUpperCase();
          profile.id = genId("cand");
          profile.user_id = userId;
          profile.anon_code = `CND-${suffix}`;
          user.candidateId = profile.id;
          db.candidates[profile.id] = { profile, skills: [], evaluations: [], talentProfile: null, feedback: null, learningPath: null, documents: [], extraction: null };
        } else {
          const companyId = genId("comp");
          user.companyId = companyId;
          const company: Company = {
            id: companyId,
            user_id: userId,
            legal_name: "",
            trade_name: "",
            industry: "",
            size: "1-10",
            location: null,
            work_mode: null,
            logo_url: null,
            description: null,
            verification_status: "UNVERIFIED",
          };
          db.companies[companyId] = company;
        }
        db.users.push(user);
        return { access_token: encodeToken(userId), user: toPublicUser(user) };
      });
    },
    async login(input: LoginInput): Promise<AuthResponse> {
      await delay();
      const user = getDB().users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
      if (!user || user.password !== input.password) {
        throw new ApiClientError("INVALID_CREDENTIALS", 401, "Correo o contraseña incorrectos.");
      }
      return { access_token: encodeToken(user.id), user: toPublicUser(user) };
    },
    async me(): Promise<User> {
      await delay();
      return toPublicUser(currentUser());
    },
  },

  catalog: {
    async jobFamilies() {
      await delay();
      return JOB_FAMILIES;
    },
    async competencies(jobFamilyId: string) {
      await delay();
      return COMPETENCIES_BY_FAMILY[jobFamilyId] ?? [];
    },
    async skills(): Promise<Skill[]> {
      await delay();
      return SKILLS;
    },
  },

  candidate: {
    async me() {
      await delay();
      return requireCandidate().record.profile;
    },
    async update(patch: CandidateProfilePatch) {
      await delay();
      return mutate((db) => {
        const { candidateId } = requireCandidate();
        const record = db.candidates[candidateId]!;
        Object.assign(record.profile, patch);
        record.profile.completion_percent = completionPercent(record.profile);
        return record.profile;
      });
    },
    async setJobFamily(jobFamilyId: string) {
      await delay();
      return mutate((db) => {
        const { candidateId } = requireCandidate();
        const record = db.candidates[candidateId]!;
        record.profile.job_family_id = jobFamilyId;
        record.profile.completion_percent = completionPercent(record.profile);
        return record.profile;
      });
    },
    async status() {
      await delay();
      const { candidateId, record } = requireCandidate();
      const db = getDB();
      const session = Object.values(db.interviews).find((i) => i.candidateId === candidateId);
      let next_step: "ONBOARDING" | "CV" | "REVIEW_CLAIMS" | "INTERVIEW" | "WAITING_EVALUATION" | "DONE";
      switch (record.profile.status) {
        case "DRAFT":
          if (!record.profile.job_family_id) next_step = "ONBOARDING";
          else if (record.extraction && !record.extraction.confirmed_by_candidate) next_step = "REVIEW_CLAIMS";
          else next_step = "CV";
          break;
        case "CV_READY":
        case "INTERVIEWING":
          next_step = "INTERVIEW";
          break;
        case "PENDING_EVALUATION":
          next_step = "WAITING_EVALUATION";
          break;
        case "EVALUATED":
          next_step = "DONE";
          break;
        default:
          next_step = "ONBOARDING";
      }
      return {
        status: record.profile.status,
        next_step,
        interview_session_id: session?.id ?? null,
        has_talent_profile: record.talentProfile != null,
      };
    },
    async talentProfile() {
      await delay();
      const { record } = requireCandidate();
      if (!record.talentProfile) throw new ApiClientError("NOT_EVALUATED", 404, "Aún no hay un perfil de talento generado.");
      return record.talentProfile;
    },
    async skills() {
      await delay();
      return requireCandidate().record.skills;
    },
    async feedback() {
      await delay();
      const { record } = requireCandidate();
      if (!record.feedback) throw new ApiClientError("NOT_EVALUATED", 404, "Aún no hay retroalimentación disponible.");
      return record.feedback;
    },
    async learningPath() {
      await delay();
      const { record } = requireCandidate();
      if (!record.learningPath) throw new ApiClientError("NOT_EVALUATED", 404, "Aún no hay una ruta de aprendizaje disponible.");
      return record.learningPath;
    },
  },

  documents: {
    async uploadCV(file: File): Promise<JobRef> {
      await delay();
      const { candidateId } = requireCandidate();
      const filename = file.name;
      const jobId = enqueueJob("CV_PARSE", () => {
        return mutate((db) => {
          const record = db.candidates[candidateId]!;
          const extraction = generateExtractionFromFile(record.profile.job_family_id, filename);
          record.extraction = extraction;
          const doc: DocumentRef = {
            id: genId("doc"),
            type: "CV",
            original_filename: filename,
            mime_type: file.type || "application/pdf",
            size_bytes: file.size,
            status: "PARSED",
            uploaded_at: nowIso(),
            url: "/demo/cv-ejemplo.pdf",
          };
          record.documents.push(doc);
          return extraction.id;
        });
      });
      return { job_id: jobId };
    },
    async extraction() {
      await delay();
      const { record } = requireCandidate();
      if (!record.extraction) throw new ApiClientError("NOT_FOUND", 404, "Aún no hay una extracción de CV.");
      return record.extraction;
    },
    async confirmExtraction(patch: CVExtractionPatch) {
      await delay();
      return mutate((db) => {
        const { candidateId } = requireCandidate();
        const record = db.candidates[candidateId]!;
        if (!record.extraction) throw new ApiClientError("NOT_FOUND", 404, "Aún no hay una extracción de CV.");
        Object.assign(record.extraction, patch);
        record.extraction.confirmed_by_candidate = true;
        record.extraction.confirmed_at = nowIso();
        if (patch.experience) record.profile.experience = patch.experience;
        else record.profile.experience = record.extraction.experience;
        if (patch.education) record.profile.education = patch.education;
        else record.profile.education = record.extraction.education;
        record.profile.status = "CV_READY";
        record.profile.completion_percent = completionPercent(record.profile);
        return record.extraction;
      });
    },
    async uploadCertification(file: File, skillCode?: string): Promise<DocumentRef> {
      await delay();
      return mutate((db) => {
        const { candidateId } = requireCandidate();
        // Regla del producto: ningún flujo del frontend marca una skill como "verificada".
        // El documento queda registrado como evidencia pendiente de revisión; la skill
        // conserva su estado (`is_declared`/`is_evaluated`) tal como estaba antes de subirlo.
        const doc: DocumentRef = {
          id: genId("doc"),
          type: "CERTIFICATION",
          original_filename: file.name,
          mime_type: file.type || "application/pdf",
          size_bytes: file.size,
          status: "PROCESSING",
          uploaded_at: nowIso(),
          url: "/demo/cv-ejemplo.pdf",
        };
        db.candidates[candidateId]!.documents.push(doc);
        void skillCode;
        return doc;
      });
    },
  },

  cvBuilder: {
    async createSession() {
      await delay();
      return mutate((db) => {
        const { candidateId } = requireCandidate();
        const session: StoredCvBuilderSession = {
          id: genId("cvb"),
          candidateId,
          status: "ACTIVE",
          turnIndex: 0,
          followUpAsked: false,
          answers: {},
          createdAt: nowIso(),
        };
        db.cvBuilderSessions[session.id] = session;
        return {
          session: toPublicCvSession(session),
          agent_message: { id: genId("msg"), role: "agent" as const, text: CV_BUILDER_SCRIPT[0]!.prompt, created_at: nowIso() },
          done: false,
        };
      });
    },
    async sendMessage(id: string, text: string) {
      await delay();
      return mutate((db) => {
        const session = db.cvBuilderSessions[id];
        if (!session) throw new ApiClientError("NOT_FOUND", 404, "La sesión de CV conversacional no existe.");
        const step = advanceCvBuilder(session, text);
        const messageText = step.done && !step.agentMessage ? CV_BUILDER_CLOSING : step.agentMessage;
        return {
          session: toPublicCvSession(session),
          agent_message: { id: genId("msg"), role: "agent" as const, text: messageText, created_at: nowIso() },
          done: step.done,
        };
      });
    },
    async finalize(id: string) {
      await delay();
      return mutate((db) => {
        const session = db.cvBuilderSessions[id];
        if (!session) throw new ApiClientError("NOT_FOUND", 404, "La sesión de CV conversacional no existe.");
        const extraction = buildExtractionFromCvBuilder(session.answers);
        db.candidates[session.candidateId]!.extraction = extraction;
        session.status = "FINALIZED";
        return extraction;
      });
    },
    async document(id: string) {
      await delay();
      if (!getDB().cvBuilderSessions[id]) throw new ApiClientError("NOT_FOUND", 404, "La sesión de CV conversacional no existe.");
      return { id: genId("cvdoc"), url: "/demo/cv-ejemplo.pdf", generated_at: nowIso() };
    },
  },

  interviews: {
    async create(mode: InterviewMode) {
      await delay();
      const { candidateId } = requireCandidate();
      const stored = interviewEngine.createInterview(candidateId, mode);
      mutate((db) => {
        const record = db.candidates[candidateId]!;
        if (record.profile.status === "CV_READY") record.profile.status = "INTERVIEWING";
      });
      return toPublicInterview(stored);
    },
    async get(id: string) {
      await delay();
      return toPublicInterview(interviewEngine.getInterview(id));
    },
    async nextQuestion(id: string) {
      await delay();
      return interviewEngine.nextQuestion(id);
    },
    async answer(id: string, input) {
      await delay();
      return interviewEngine.answer(id, input);
    },
    async progress(id: string) {
      await delay();
      return interviewEngine.progress(id);
    },
    async complete(id: string): Promise<JobRef> {
      await delay();
      const session = interviewEngine.getInterview(id);
      mutate((db) => {
        const stored = db.interviews[id]!;
        stored.status = "COMPLETED";
        stored.completed_at = nowIso();
        const record = db.candidates[session.candidateId]!;
        record.profile.status = "PENDING_EVALUATION";
      });
      const jobId = enqueueJob("INTERVIEW_EVALUATE", () => {
        return mutate((db) => {
          const stored = db.interviews[id]!;
          const result = interviewEngine.evaluateInterview(stored);
          const record = db.candidates[stored.candidateId]!;
          record.evaluations = result.evaluations;
          record.talentProfile = result.talentProfile;
          record.feedback = result.feedback;
          record.learningPath = result.learningPath;
          record.profile.status = "EVALUATED";
          return result.talentProfile.id;
        });
      });
      return { job_id: jobId };
    },
    async turns(id: string) {
      await delay();
      return interviewEngine.turns(id);
    },
  },

  company: {
    async me() {
      await delay();
      return requireCompany().company;
    },
    async update(patch: CompanyPatch) {
      await delay();
      return mutate(() => {
        const { company } = requireCompany();
        Object.assign(company, patch);
        return company;
      });
    },
    async verification() {
      await delay();
      const { company } = requireCompany();
      return {
        status: company.verification_status,
        checks: [
          { label: "Razón social registrada", done: company.legal_name.trim().length > 0 },
          { label: "Industria definida", done: company.industry.trim().length > 0 },
          { label: "Ubicación registrada", done: company.location != null },
          { label: "Verificación de dominio (demo)", done: company.verification_status === "VERIFIED" },
        ],
      };
    },
  },

  vacancies: {
    async create(input: VacancyInput) {
      await delay();
      return mutate((db) => {
        const { companyId } = requireCompany();
        const vacancy: Vacancy = {
          id: genId("vac"),
          company_id: companyId,
          job_family_id: input.job_family_id,
          title: input.title,
          description: input.description,
          location: input.location,
          work_mode: input.work_mode,
          salary_min: input.salary_min,
          salary_max: input.salary_max,
          positions_count: input.positions_count,
          status: "DRAFT",
          created_at: nowIso(),
          requirements: [],
          weights: { TECHNICAL: 40, BEHAVIORAL: 20, EXPERIENCE: 15, EVIDENCE: 10, SALARY: 8, LOCATION: 7 },
          last_match_run_id: null,
          shortlist_count: 0,
        };
        db.vacancies[vacancy.id] = vacancy;
        return vacancy;
      });
    },
    async list() {
      await delay();
      const { companyId } = requireCompany();
      return Object.values(getDB().vacancies).filter((v) => v.company_id === companyId);
    },
    async get(id: string) {
      await delay();
      const vacancy = getDB().vacancies[id];
      if (!vacancy) throw new ApiClientError("NOT_FOUND", 404, "La vacante no existe.");
      return vacancy;
    },
    async update(id: string, patch) {
      await delay();
      return mutate((db) => {
        const vacancy = db.vacancies[id];
        if (!vacancy) throw new ApiClientError("NOT_FOUND", 404, "La vacante no existe.");
        Object.assign(vacancy, patch);
        return vacancy;
      });
    },
    async setRequirements(id: string, requirements: RequirementInput[]) {
      await delay();
      return mutate((db) => {
        const vacancy = db.vacancies[id];
        if (!vacancy) throw new ApiClientError("NOT_FOUND", 404, "La vacante no existe.");
        const normalized = normalizeRequirementWeights(requirements);
        vacancy.requirements = normalized.map((r) => ({ ...r, id: genId("req") }));
        return vacancy;
      });
    },
    async setWeights(id: string, weights: VacancyWeights) {
      await delay();
      return mutate((db) => {
        const vacancy = db.vacancies[id];
        if (!vacancy) throw new ApiClientError("NOT_FOUND", 404, "La vacante no existe.");
        vacancy.weights = normalizeWeights(weights);
        return vacancy;
      });
    },
    async resolveRequirements(_id: string, freeText: string) {
      await delay();
      return resolveRequirementsEngine(freeText);
    },
    async runMatch(id: string): Promise<JobRef> {
      await delay();
      const vacancy = getDB().vacancies[id];
      if (!vacancy) throw new ApiClientError("NOT_FOUND", 404, "La vacante no existe.");
      const jobId = enqueueJob("MATCH_RUN", () => {
        return mutate((db) => {
          const v = db.vacancies[id]!;
          const candidates = Object.values(db.candidates).filter(
            (c) => c.profile.job_family_id === v.job_family_id && c.profile.status === "EVALUATED",
          );
          const sorted = candidates
            .map((c) => buildAnonymousCard(c, v, 0))
            .sort((a, b) => b.total_score - a.total_score)
            .map((card, idx) => ({ ...card, rank_position: idx + 1 }));
          const runId = genId("run");
          for (const card of sorted) db.matchResults[card.match_result_id] = card;
          db.matchRuns[runId] = {
            id: runId,
            vacancy_id: id,
            executed_at: nowIso(),
            algorithm_version: ALGORITHM_VERSION,
            result_ids: sorted.map((c) => c.match_result_id),
          };
          v.last_match_run_id = runId;
          // Genera la explicación al crear el match_result (no de forma perezosa en el
          // primer `matching.result(id)`): así E9 nunca muestra el skeleton "Redactando
          // explicación…" salvo el primer render mientras llega la respuesta del job.
          // `matchRuns` ya está poblado, así que la frase de posición relativa usa el
          // score del siguiente candidato correctamente.
          for (const card of sorted) ensureExplanation(card);
          return runId;
        });
      });
      return { job_id: jobId };
    },
  },

  matching: {
    async results(runId: string, params) {
      await delay();
      const run = getDB().matchRuns[runId];
      if (!run) throw new ApiClientError("NOT_FOUND", 404, "La corrida de matching no existe.");
      const db = getDB();
      const ids = run.result_ids.slice(params.offset, params.offset + params.limit);
      const items = ids.map((resultId) => toAnonymousCard(db.matchResults[resultId]!));
      return { items, total: run.result_ids.length };
    },
    async result(matchResultId: string) {
      await delay();
      const card = getDB().matchResults[matchResultId];
      if (!card) throw new ApiClientError("NOT_FOUND", 404, "El resultado de matching no existe.");
      return toAnonymousCard(card);
    },
    async unlock(matchResultId: string) {
      await delay();
      return mutate((db) => {
        const card = db.matchResults[matchResultId];
        if (!card) throw new ApiClientError("NOT_FOUND", 404, "El resultado de matching no existe.");
        card.is_unlocked = true;
        return buildUnlockedProfile(card);
      });
    },
    async fullProfile(matchResultId: string) {
      await delay();
      const card = getDB().matchResults[matchResultId];
      if (!card) throw new ApiClientError("NOT_FOUND", 404, "El resultado de matching no existe.");
      if (!card.is_unlocked) throw new ApiClientError("UNLOCK_REQUIRED", 403, "Debes desbloquear este perfil primero.");
      return buildUnlockedProfile(card);
    },
    async compare(vacancyId: string, matchResultIds: string[]): Promise<CompareView> {
      await delay();
      const db = getDB();
      const cards = matchResultIds
        .slice(0, 3)
        .map((id) => db.matchResults[id])
        .filter((c): c is StoredMatchResult => c != null && c.vacancy_id === vacancyId)
        .map((c) => toAnonymousCard(c));
      const criteria = [
        { key: "total_score", label: "Compatibilidad total" },
        { key: "TECHNICAL", label: "Técnico" },
        { key: "BEHAVIORAL", label: "Conductual" },
        { key: "EXPERIENCE", label: "Experiencia" },
        { key: "EVIDENCE", label: "Evidencia" },
        { key: "SALARY", label: "Salario" },
        { key: "LOCATION", label: "Ubicación" },
      ];
      const key_differences = buildKeyDifferences(cards);
      return { criteria, candidates: cards, key_differences };
    },
    async shortlist(vacancyId: string): Promise<ShortlistEntry[]> {
      await delay();
      return Object.values(getDB().matchResults)
        .filter((c) => c.vacancy_id === vacancyId && c.shortlist_stage != null)
        .map((c) => ({
          match_result_id: c.match_result_id,
          anon_code: c.anon_code,
          stage: c.shortlist_stage as ShortlistStage,
          is_unlocked: c.is_unlocked,
          total_score: c.total_score,
          added_at: nowIso(),
        }));
    },
    async setShortlistStage(matchResultId: string, stage: ShortlistStage | null) {
      await delay();
      return mutate((db) => {
        const card = db.matchResults[matchResultId];
        if (!card) throw new ApiClientError("NOT_FOUND", 404, "El resultado de matching no existe.");
        card.shortlist_stage = stage;
        const vacancy = db.vacancies[card.vacancy_id];
        if (vacancy) {
          vacancy.shortlist_count = Object.values(db.matchResults).filter(
            (c) => c.vacancy_id === vacancy.id && c.shortlist_stage != null,
          ).length;
        }
        return {
          match_result_id: card.match_result_id,
          anon_code: card.anon_code,
          stage: (stage ?? "REVIEW") as ShortlistStage,
          is_unlocked: card.is_unlocked,
          total_score: card.total_score,
          added_at: nowIso(),
        };
      });
    },
  },

  opportunities: {
    async list(): Promise<Opportunity[]> {
      await delay();
      const { candidateId, record } = requireCandidate();
      const db = getDB();
      return Object.values(db.vacancies)
        .filter((v) => v.status === "OPEN")
        .map((v) => buildOpportunity(v, candidateId, record));
    },
    async get(vacancyId: string): Promise<Opportunity> {
      await delay();
      const { candidateId, record } = requireCandidate();
      const vacancy = getDB().vacancies[vacancyId];
      if (!vacancy) throw new ApiClientError("NOT_FOUND", 404, "La vacante no existe.");
      return buildOpportunity(vacancy, candidateId, record);
    },
    async apply(vacancyId: string): Promise<Application> {
      await delay();
      return mutate((db) => {
        const { candidateId } = requireCandidate();
        const vacancy = db.vacancies[vacancyId];
        if (!vacancy) throw new ApiClientError("NOT_FOUND", 404, "La vacante no existe.");
        const application: Application & { candidateId: string } = {
          id: genId("app"),
          vacancy_id: vacancyId,
          status: "APPLIED",
          created_at: nowIso(),
          candidateId,
        };
        db.applications.push(application);
        return application;
      });
    },
    async myApplications(): Promise<Application[]> {
      await delay();
      const { candidateId } = requireCandidate();
      return getDB().applications.filter((a) => (a as Application & { candidateId: string }).candidateId === candidateId);
    },
  },

  jobs: {
    async get(id: string) {
      await delay(100, 300);
      const job = getJob(id);
      if (!job) throw new ApiClientError("NOT_FOUND", 404, "El proceso solicitado no existe.");
      return job;
    },
  },

  mocks: {
    async notifications() {
      await delay();
      return SEED_NOTIFICATIONS;
    },
    async messages() {
      await delay();
      return SEED_MESSAGES;
    },
    async plans() {
      await delay();
      return SEED_PLANS;
    },
  },
};

function buildOpportunity(vacancy: Vacancy, candidateId: string, record: ReturnType<typeof requireCandidate>["record"]): Opportunity {
  const db = getDB();
  const company = db.companies[vacancy.company_id];
  const isEvaluated = record.profile.status === "EVALUATED" && record.evaluations.length > 0;
  let compatibility: number | null = null;
  let why_fit: string[] = [];
  let missing_evidence: string[] = [];
  if (isEvaluated && record.profile.job_family_id === vacancy.job_family_id) {
    const card = buildAnonymousCard(record, vacancy, 0);
    compatibility = card.total_score;
    why_fit = card.strengths;
    missing_evidence = card.gaps;
  }
  const applied = db.applications.some(
    (a) => (a as Application & { candidateId: string }).candidateId === candidateId && a.vacancy_id === vacancy.id,
  );
  return {
    vacancy_id: vacancy.id,
    title: vacancy.title,
    company_trade_name: company?.trade_name ?? "Empresa",
    company_verified: company?.verification_status === "VERIFIED",
    location: vacancy.location,
    work_mode: vacancy.work_mode,
    salary_min: vacancy.salary_min,
    salary_max: vacancy.salary_max,
    job_family_code: JOB_FAMILIES.find((f) => f.id === vacancy.job_family_id)?.code ?? "ADMIN_ASSISTANT",
    compatibility,
    compatibility_label: compatibility != null ? scoreLabelFor(compatibility) : null,
    why_fit,
    missing_evidence,
    requirements: vacancy.requirements,
    description: vacancy.description,
    applied,
  };
}

export { resetMock };

if (import.meta.env.DEV && typeof window !== "undefined") {
  window.__ce = { resetMock };
}
