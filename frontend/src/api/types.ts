// Contrato API — copiado literal de docs/build/02_API_CONTRACT.md §3.
// NO modificar los tipos existentes. Utilidades nuevas van al final del archivo.

// ---------- enums ----------
export type Role = "CANDIDATE" | "COMPANY";
export type JobFamilyCode = "ADMIN_ASSISTANT" | "HEAVY_MACHINERY_OPERATOR" | "WAREHOUSE_SUPERVISOR";
export type CandidateStatus = "DRAFT" | "CV_READY" | "INTERVIEWING" | "PENDING_EVALUATION" | "EVALUATED";
export type VerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED";
export type CompetencyType = "TECHNICAL" | "BEHAVIORAL";
export type DocumentType = "CV" | "CERTIFICATION" | "OTHER" | "AUDIO_ANSWER";
export type DocumentStatus = "UPLOADED" | "PROCESSING" | "PARSED" | "FAILED";
export type ClaimSource = "CV" | "CONVERSATION" | "MANUAL";
export type InterviewStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
export type QuestionIntent = "PROBE" | "SCENARIO" | "CLARIFY" | "SWITCH";
export type CoverageStatus = "UNTOUCHED" | "PARTIAL" | "SUFFICIENT";
export type RubricSource = "SPECIFIC" | "PROVISIONAL" | "BASELINE";
export type EvidenceType = "INTERVIEW_ANSWER" | "DOCUMENT" | "EXTERNAL";
export type EvidenceLevel = "declared" | "evaluated" | "verified" | "partial" | "pending";
export type VacancyStatus = "DRAFT" | "OPEN" | "CLOSED";
export type RequirementKind = "MANDATORY" | "DESIRABLE";
export type WorkMode = "ONSITE" | "HYBRID" | "REMOTE";
export type Availability = "IMMEDIATE" | "TWO_WEEKS" | "ONE_MONTH";
export type JobType = "CV_PARSE" | "INTERVIEW_EVALUATE" | "PROFILE_BUILD" | "MATCH_RUN";
export type JobStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";
export type MatchComponent = "TECHNICAL" | "BEHAVIORAL" | "EXPERIENCE" | "EVIDENCE" | "SALARY" | "LOCATION";
export type GeoBand = "SAME_CITY" | "UNDER_30KM" | "UNDER_80KM" | "FAR";
export type ShortlistStage = "REVIEW" | "INTERVIEW" | "FINALIST";
export type ApplicationStatus = "APPLIED" | "VIEWED" | "SHORTLISTED" | "CLOSED";
export type InterviewMode = "VOICE" | "TEXT";

// ---------- identidad ----------
export interface User { id: string; email: string; role: Role; created_at: string; }
export interface AuthResponse { access_token: string; user: User; }
export interface RegisterInput { email: string; password: string; role: Role; }
export interface LoginInput { email: string; password: string; }

// ---------- catálogo ----------
export interface JobFamily { id: string; code: JobFamilyCode; name: string; role_objective: string; }
export interface Competency { id: string; job_family_id: string; code: string; name: string; type: CompetencyType; description: string; is_core: boolean; }
export interface Skill { id: string; code: string; name: string; category: string; }

// ---------- candidato ----------
export interface Location { city: string; state: string; }
export interface ExperienceItem { id: string; company: string; position: string; start_date: string; end_date: string | null; is_current: boolean; description: string; skills: string[]; }
export interface EducationItem { id: string; institution: string; degree: string; start_year: number | null; end_year: number | null; }
export interface CandidateProfile {
  id: string; user_id: string; full_name: string; phone: string | null; photo_url: string | null;
  birth_date: string | null; gender: string | null;              // nunca se envían a IA ni a empresa antes del unlock
  job_family_id: string | null; location: Location | null;
  availability: Availability | null; salary_expectation_min: number | null; salary_expectation_max: number | null;
  education: EducationItem[]; experience: ExperienceItem[]; bio: string | null;
  status: CandidateStatus; anon_code: string;                     // ej. "CND-4F82"
  completion_percent: number;                                     // 0–100 calculado por backend
}
export type CandidateProfilePatch = Partial<Pick<CandidateProfile, "full_name" | "phone" | "photo_url" | "birth_date" | "gender" | "location" | "availability" | "salary_expectation_min" | "salary_expectation_max" | "education" | "experience" | "bio">>;
export interface CandidateStatusView { status: CandidateStatus; next_step: "ONBOARDING" | "CV" | "REVIEW_CLAIMS" | "INTERVIEW" | "WAITING_EVALUATION" | "DONE"; interview_session_id: string | null; has_talent_profile: boolean; }

// ---------- documentos y extracción ----------
export interface DocumentRef { id: string; type: DocumentType; original_filename: string; mime_type: string; size_bytes: number; status: DocumentStatus; uploaded_at: string; url: string | null; }
export interface Claim { id: string; source: ClaimSource; skill_code: string | null; statement: string; claimed_level: 1 | 2 | 3 | 4 | null; needs_validation: boolean; source_ref: { excerpt?: string; page?: number; turn?: number } | null; }
export interface CVExtraction {
  id: string; document_id: string | null; status: DocumentStatus; confidence: number;   // 0–1
  experience: ExperienceItem[]; education: EducationItem[]; skills: { code: string; name: string; level: 1 | 2 | 3 | 4 | null }[];
  certifications: { name: string; issuer: string | null; year: number | null }[]; claims: Claim[];
  confirmed_by_candidate: boolean; confirmed_at: string | null;
}
export type CVExtractionPatch = Partial<Pick<CVExtraction, "experience" | "education" | "skills" | "certifications" | "claims">>;

// ---------- CV conversacional (A1 BUILD) ----------
export interface CVBuilderSession { id: string; status: "ACTIVE" | "FINALIZED"; turn: number; max_turns: number; draft: CVExtractionPatch; }
export interface CVBuilderMessage { id: string; role: "agent" | "candidate"; text: string; created_at: string; }
export interface CVBuilderReply { session: CVBuilderSession; agent_message: CVBuilderMessage; done: boolean; }
export interface CVDocument { id: string; url: string; generated_at: string; }

// ---------- entrevista ----------
export interface InterviewSession { id: string; status: InterviewStatus; mode: InterviewMode; question_budget: number; questions_asked: number; coverage_state: Record<string, { status: CoverageStatus; turns: number[]; depth: number }>; started_at: string | null; completed_at: string | null; }
export interface InterviewTurn { id: string; sequence: number; question_text: string; target_competency_code: string; question_intent: QuestionIntent; references_turn_id: string | null; answer_text: string | null; answer_received_at: string | null; audio_url: string | null; }
export interface NextQuestion { turn: InterviewTurn | null; finished: boolean; finish_reason: "BUDGET_EXHAUSTED" | "COVERAGE_SUFFICIENT" | "AGENT_FINISH" | null; progress: { asked: number; budget: number }; }
export interface AnswerInput { answer_text: string; mode: InterviewMode; }
export interface InterviewProgress { asked: number; budget: number; percent: number; coverage: Record<string, CoverageStatus>; }

// ---------- evaluación y perfil verificado ----------
export interface CompetencyEvaluation { competency_code: string; competency_name: string; type: CompetencyType; score: number; rubric_level: 0 | 1 | 2 | 3 | 4; confidence: number; justification: string; evidence_turn_ids: string[]; limitations: string | null; rubric_source: RubricSource; }
export interface CandidateSkill { skill_code: string; skill_name: string; is_declared: boolean; is_evaluated: boolean; is_verified: boolean; evaluated_score: number | null; confidence: number | null; evidence_summary: string | null; }
export interface TalentProfile {
  id: string; version: number; generated_at: string; overall_score: number; overall_label: string;   // "Evidencia sólida", nunca "aprobado"
  top_skills: CandidateSkill[]; evaluations: CompetencyEvaluation[]; strengths: string[]; evidence_gaps: string[]; summary_text: string;
}
export interface FeedbackReport { candidate_note: string; company_note: string; generated_at: string; }
export interface LearningRecommendation { type: "COURSE" | "CERTIFICATION"; provider: string; title: string; estimated_effort: string; source: "CATALOG" | "WEB"; url: string | null; }
export interface LearningGap { competency_code: string; competency_name: string; current_level: number; target_level: number; why_it_matters: string; recommendations: LearningRecommendation[]; }
export interface LearningPath { gaps: LearningGap[]; }

// ---------- empresa y vacantes ----------
export interface Company { id: string; user_id: string; legal_name: string; trade_name: string; industry: string; size: "1-10" | "11-50" | "51-200" | "200+"; location: Location | null; work_mode: WorkMode | null; logo_url: string | null; description: string | null; verification_status: VerificationStatus; }
export type CompanyPatch = Partial<Omit<Company, "id" | "user_id" | "verification_status">>;
export interface VerificationView { status: VerificationStatus; checks: { label: string; done: boolean }[]; }
export interface VacancyRequirement { id: string; competency_code: string | null; skill_code: string | null; label: string; kind: RequirementKind; min_level: 1 | 2 | 3 | 4; weight: number; }
export interface VacancyWeights { TECHNICAL: number; BEHAVIORAL: number; EXPERIENCE: number; EVIDENCE: number; SALARY: number; LOCATION: number; }
export interface Vacancy {
  id: string; company_id: string; job_family_id: string; title: string; description: string; location: Location | null; work_mode: WorkMode;
  salary_min: number | null; salary_max: number | null; positions_count: number; status: VacancyStatus; created_at: string;
  requirements: VacancyRequirement[]; weights: VacancyWeights; last_match_run_id: string | null; shortlist_count: number;
}
export interface VacancyInput { job_family_id: string; title: string; description: string; location: Location | null; work_mode: WorkMode; salary_min: number | null; salary_max: number | null; positions_count: number; }
export interface RequirementInput { competency_code: string | null; skill_code: string | null; label: string; kind: RequirementKind; min_level: 1 | 2 | 3 | 4; weight: number; }
export interface RequirementResolution { mapped: RequirementInput[]; unmapped: string[]; warnings: { text: string; reason: string }[]; suggested_weights: VacancyWeights; }

// ---------- matching y marketplace ----------
export interface MatchRun { id: string; vacancy_id: string; executed_at: string; algorithm_version: string; candidates_evaluated: number; }
export interface BreakdownItem { component: MatchComponent; weight: number; raw: number; contribution: number; }
export interface Penalty { reason: "MANDATORY_UNMET" | "SALARY_OUT_OF_RANGE" | "LOCATION_FAR"; requirement: string; points: number; }
export interface AnonymousCandidateCard {
  match_result_id: string; anon_code: string; job_family_code: JobFamilyCode; rank_position: number;
  total_score: number; score_label: string; breakdown: BreakdownItem[]; penalties: Penalty[]; strengths: string[]; gaps: string[];
  skills: CandidateSkill[]; evidence_counts: { declared: number; evaluated: number; verified: number };
  years_experience: number; availability: Availability; geo_band: GeoBand; salary_band: string;   // "14–18 mil"
  explanation_text: string | null;                                                                  // A5 EXPLAIN; null hasta que se genere
  shortlist_stage: ShortlistStage | null; is_unlocked: boolean;
}
export interface UnlockedCandidateProfile extends AnonymousCandidateCard {
  candidate_id: string; full_name: string; email: string; phone: string | null; photo_url: string | null; location: Location;
  experience: ExperienceItem[]; education: EducationItem[]; documents: DocumentRef[]; talent_profile: TalentProfile; company_note: string | null;
}
export interface CompareView { criteria: { key: string; label: string }[]; candidates: AnonymousCandidateCard[]; key_differences: string[]; }
export interface ShortlistEntry { match_result_id: string; anon_code: string; stage: ShortlistStage; is_unlocked: boolean; total_score: number; added_at: string; }

// ---------- marketplace candidato (Should Have, fase backend) ----------
export interface Opportunity { vacancy_id: string; title: string; company_trade_name: string; company_verified: boolean; location: Location | null; work_mode: WorkMode; salary_min: number | null; salary_max: number | null; job_family_code: JobFamilyCode; compatibility: number | null; compatibility_label: string | null; why_fit: string[]; missing_evidence: string[]; requirements: VacancyRequirement[]; description: string; applied: boolean; }
export interface Application { id: string; vacancy_id: string; status: ApplicationStatus; created_at: string; }

// ---------- transversales ----------
export interface JobRef { job_id: string; }
export interface Job { id: string; type: JobType; status: JobStatus; progress: number; result_ref: string | null; error: string | null; }
export interface Paginated<T> { items: T[]; total: number; }
export interface ApiError { code: string; message: string; details?: unknown; }
export interface Notification { id: string; title: string; body: string; created_at: string; read: boolean; }
export interface MessageThread { id: string; counterpart: string; last_message: string; updated_at: string; unread: number; }
export interface Plan { id: string; name: string; price_mxn: number; features: string[]; highlighted: boolean; }

// ============================================================
// Utilidades agregadas por F2 (no forman parte del contrato §3,
// no modifican ningún tipo anterior — solo se agregan al final).
// ============================================================
export type ID = string;
export type Nullable<T> = T | null;
/** Parámetros comunes de paginación offset/limit usados por los hooks. */
export interface PageParams { limit: number; offset: number; }
