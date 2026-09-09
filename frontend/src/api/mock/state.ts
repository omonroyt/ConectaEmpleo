import type {
  AnonymousCandidateCard,
  Application,
  CandidateProfile,
  CandidateSkill,
  Company,
  CompetencyEvaluation,
  CVExtraction,
  DocumentRef,
  FeedbackReport,
  InterviewSession,
  InterviewTurn,
  Job,
  LearningPath,
  TalentProfile,
  Vacancy,
} from "@/api/types";
import { SEED_USERS, buildFreshCandidateProfile, type StoredUser } from "./seed/users";
import { buildSeedCandidates } from "./seed/candidates";
import { SEED_COMPANY, SEED_VACANCIES } from "./seed/company";

export interface CandidateRecord {
  profile: CandidateProfile;
  skills: CandidateSkill[];
  evaluations: CompetencyEvaluation[];
  talentProfile: TalentProfile | null;
  feedback: FeedbackReport | null;
  learningPath: LearningPath | null;
  documents: DocumentRef[];
  extraction: CVExtraction | null;
}

export interface StoredMatchResult extends AnonymousCandidateCard {
  candidate_id: string;
  vacancy_id: string;
}

export interface StoredMatchRun {
  id: string;
  vacancy_id: string;
  executed_at: string;
  algorithm_version: string;
  result_ids: string[];
}

export interface StoredCvBuilderSession {
  id: string;
  candidateId: string;
  status: "ACTIVE" | "FINALIZED";
  turnIndex: number; // índice del guion (0-based), 0..8 (8 = terminado)
  followUpAsked: boolean;
  answers: Record<string, string>; // field -> última respuesta útil
  createdAt: string;
}

export interface StoredInterview extends InterviewSession {
  candidateId: string;
  turns: InterviewTurn[];
  askedQuestionIds: string[];
  probeUsed: boolean;
}

export interface MockDB {
  users: StoredUser[];
  candidates: Record<string, CandidateRecord>;
  companies: Record<string, Company>;
  vacancies: Record<string, Vacancy>;
  matchRuns: Record<string, StoredMatchRun>;
  matchResults: Record<string, StoredMatchResult>;
  applications: Application[];
  session: { token: string; userId: string } | null;
  interviews: Record<string, StoredInterview>;
  cvBuilderSessions: Record<string, StoredCvBuilderSession>;
  jobs: Record<string, Job>;
  seq: number;
}

const STORAGE_KEY = "ce-mock-v1";

function buildFreshDB(): MockDB {
  const candidates: Record<string, CandidateRecord> = {};
  for (const seedCandidate of buildSeedCandidates()) {
    candidates[seedCandidate.profile.id] = {
      profile: seedCandidate.profile,
      skills: seedCandidate.skills,
      evaluations: seedCandidate.evaluations,
      talentProfile: seedCandidate.talentProfile,
      feedback: seedCandidate.feedback,
      learningPath: seedCandidate.learningPath,
      documents: seedCandidate.documents,
      extraction: null,
    };
  }
  const freshProfile = buildFreshCandidateProfile();
  candidates[freshProfile.id] = {
    profile: freshProfile,
    skills: [],
    evaluations: [],
    talentProfile: null,
    feedback: null,
    learningPath: null,
    documents: [],
    extraction: null,
  };

  const vacancies: Record<string, Vacancy> = {};
  for (const vacancy of SEED_VACANCIES) vacancies[vacancy.id] = vacancy;

  return {
    users: SEED_USERS.map((u) => ({ ...u })),
    candidates,
    companies: { [SEED_COMPANY.id]: SEED_COMPANY },
    vacancies,
    matchRuns: {},
    matchResults: {},
    applications: [],
    session: null,
    interviews: {},
    cvBuilderSessions: {},
    jobs: {},
    seq: 1,
  };
}

let db: MockDB = load();

function load(): MockDB {
  if (typeof localStorage === "undefined") return buildFreshDB();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildFreshDB();
    const parsed = JSON.parse(raw) as MockDB;
    if (!parsed || !parsed.candidates || !parsed.vacancies) return buildFreshDB();
    return parsed;
  } catch {
    return buildFreshDB();
  }
}

function persist(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // almacenamiento lleno o no disponible: la demo sigue funcionando en memoria
  }
}

export function getDB(): MockDB {
  return db;
}

/** Toda mutación del mock debe pasar por aquí para persistir en localStorage. */
export function mutate<T>(fn: (draft: MockDB) => T): T {
  const result = fn(db);
  persist();
  return result;
}

export function nextSeq(): number {
  const n = db.seq;
  db.seq += 1;
  persist();
  return n;
}

/** Restaura la semilla original. Expuesta en dev como window.__ce.resetMock(). */
export function resetMock(): void {
  db = buildFreshDB();
  persist();
}
