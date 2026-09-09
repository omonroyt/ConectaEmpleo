import type {
  AuthResponse,
  RegisterInput,
  LoginInput,
  User,
  JobFamily,
  Competency,
  Skill,
  CandidateProfile,
  CandidateProfilePatch,
  CandidateStatusView,
  TalentProfile,
  CandidateSkill,
  FeedbackReport,
  LearningPath,
  JobRef,
  CVExtraction,
  CVExtractionPatch,
  DocumentRef,
  CVBuilderReply,
  CVDocument,
  InterviewSession,
  InterviewMode,
  NextQuestion,
  AnswerInput,
  InterviewProgress,
  InterviewTurn,
  Company,
  CompanyPatch,
  VerificationView,
  Vacancy,
  VacancyInput,
  VacancyWeights,
  RequirementInput,
  RequirementResolution,
  Paginated,
  AnonymousCandidateCard,
  UnlockedCandidateProfile,
  CompareView,
  ShortlistEntry,
  ShortlistStage,
  Opportunity,
  Application,
  Job,
  Notification,
  MessageThread,
  Plan,
} from "./types";

/**
 * Contrato de acceso a datos del frontend. Ver docs/build/02_API_CONTRACT.md §4.
 * Dos implementaciones: `mock` (src/api/mock) y `http` (src/api/http).
 */
export interface ApiClient {
  auth: {
    register(input: RegisterInput): Promise<AuthResponse>;
    login(input: LoginInput): Promise<AuthResponse>;
    me(): Promise<User>;
  };
  catalog: {
    jobFamilies(): Promise<JobFamily[]>;
    competencies(jobFamilyId: string): Promise<Competency[]>;
    skills(): Promise<Skill[]>;
  };
  candidate: {
    me(): Promise<CandidateProfile>;
    update(patch: CandidateProfilePatch): Promise<CandidateProfile>;
    setJobFamily(jobFamilyId: string): Promise<CandidateProfile>;
    status(): Promise<CandidateStatusView>;
    talentProfile(): Promise<TalentProfile>;
    skills(): Promise<CandidateSkill[]>;
    feedback(): Promise<FeedbackReport>;
    learningPath(): Promise<LearningPath>;
  };
  documents: {
    uploadCV(file: File): Promise<JobRef>;
    extraction(): Promise<CVExtraction>;
    confirmExtraction(patch: CVExtractionPatch): Promise<CVExtraction>;
    uploadCertification(file: File, skillCode?: string): Promise<DocumentRef>;
  };
  cvBuilder: {
    createSession(): Promise<CVBuilderReply>;
    sendMessage(id: string, text: string): Promise<CVBuilderReply>;
    finalize(id: string): Promise<CVExtraction>;
    document(id: string): Promise<CVDocument>;
  };
  interviews: {
    create(mode: InterviewMode): Promise<InterviewSession>;
    get(id: string): Promise<InterviewSession>;
    nextQuestion(id: string): Promise<NextQuestion>;
    answer(id: string, input: AnswerInput): Promise<NextQuestion>;
    progress(id: string): Promise<InterviewProgress>;
    complete(id: string): Promise<JobRef>;
    turns(id: string): Promise<InterviewTurn[]>;
  };
  company: {
    me(): Promise<Company>;
    update(patch: CompanyPatch): Promise<Company>;
    verification(): Promise<VerificationView>;
  };
  vacancies: {
    create(input: VacancyInput): Promise<Vacancy>;
    list(): Promise<Vacancy[]>;
    get(id: string): Promise<Vacancy>;
    update(id: string, patch: Partial<VacancyInput> & { status?: Vacancy["status"] }): Promise<Vacancy>;
    setRequirements(id: string, requirements: RequirementInput[]): Promise<Vacancy>;
    setWeights(id: string, weights: VacancyWeights): Promise<Vacancy>;
    resolveRequirements(id: string, freeText: string): Promise<RequirementResolution>;
    runMatch(id: string): Promise<JobRef>;
  };
  matching: {
    results(runId: string, params: { limit: number; offset: number }): Promise<Paginated<AnonymousCandidateCard>>;
    result(matchResultId: string): Promise<AnonymousCandidateCard>;
    unlock(matchResultId: string): Promise<UnlockedCandidateProfile>;
    fullProfile(matchResultId: string): Promise<UnlockedCandidateProfile>;
    compare(vacancyId: string, matchResultIds: string[]): Promise<CompareView>;
    shortlist(vacancyId: string): Promise<ShortlistEntry[]>;
    setShortlistStage(matchResultId: string, stage: ShortlistStage | null): Promise<ShortlistEntry>;
  };
  opportunities: {
    list(): Promise<Opportunity[]>;
    get(vacancyId: string): Promise<Opportunity>;
    apply(vacancyId: string): Promise<Application>;
    myApplications(): Promise<Application[]>;
  };
  jobs: {
    get(id: string): Promise<Job>;
  };
  mocks: {
    notifications(): Promise<Notification[]>;
    messages(): Promise<MessageThread[]>;
    plans(): Promise<Plan[]>;
  };
}

/** Error homogéneo de la capa API (mock y http lanzan lo mismo). */
export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
