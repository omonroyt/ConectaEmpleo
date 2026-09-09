import type { CandidateProfile, Role } from "@/api/types";
import { JOB_FAMILY_IDS } from "./catalog";
import { COMPANY_ID, COMPANY_USER_ID } from "./company";
import { MARIA_ANON_SUFFIX } from "./candidates";

/** Usuario almacenado internamente por el mock (la contraseña nunca sale de este módulo). */
export interface StoredUser {
  id: string;
  email: string;
  password: string;
  role: Role;
  created_at: string;
  /** Solo para CANDIDATE: id de CandidateProfile asociado. */
  candidateId?: string;
  /** Solo para COMPANY: id de Company asociado. */
  companyId?: string;
}

export const DEMO_USER_IDS = {
  CANDIDATE_NEW: "user_demo_candidate",
  CANDIDATE_MARIA: `user_${MARIA_ANON_SUFFIX}`,
  COMPANY: COMPANY_USER_ID,
};

export const SEED_USERS: StoredUser[] = [
  {
    id: DEMO_USER_IDS.CANDIDATE_NEW,
    email: "candidato@demo.mx",
    password: "demo1234",
    role: "CANDIDATE",
    created_at: new Date().toISOString(),
    candidateId: "cand_demo_new",
  },
  {
    id: DEMO_USER_IDS.CANDIDATE_MARIA,
    email: "maria@demo.mx",
    password: "demo1234",
    role: "CANDIDATE",
    created_at: new Date().toISOString(),
    candidateId: `cand_${MARIA_ANON_SUFFIX}`,
  },
  {
    id: DEMO_USER_IDS.COMPANY,
    email: "empresa@demo.mx",
    password: "demo1234",
    role: "COMPANY",
    created_at: new Date().toISOString(),
    companyId: COMPANY_ID,
  },
];

/** Perfil DRAFT vacío para candidato@demo.mx — recorre el golden path desde cero. */
export function buildFreshCandidateProfile(): CandidateProfile {
  return {
    id: "cand_demo_new",
    user_id: DEMO_USER_IDS.CANDIDATE_NEW,
    full_name: "Candidato Demo",
    phone: null,
    photo_url: null,
    birth_date: null,
    gender: null,
    job_family_id: null,
    location: null,
    availability: null,
    salary_expectation_min: null,
    salary_expectation_max: null,
    education: [],
    experience: [],
    bio: null,
    status: "DRAFT",
    anon_code: "CND-DEMO",
    completion_percent: 10,
  };
}

export const REGISTER_DEFAULT_JOB_FAMILY = JOB_FAMILY_IDS.WAREHOUSE_SUPERVISOR;
