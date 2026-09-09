import type {
  AnswerInput,
  CompetencyEvaluation,
  FeedbackReport,
  InterviewMode,
  InterviewProgress,
  InterviewTurn,
  LearningGap,
  LearningPath,
  NextQuestion,
  TalentProfile,
} from "@/api/types";
import { getDB, mutate, type StoredInterview } from "../state";
import { COMPETENCIES_BY_FAMILY } from "../seed/catalog";
import { INTERVIEW_BANK, type BankQuestion } from "../seed/interviewBank";
import { recommendationsFor } from "../seed/learningCatalog";
import { ApiClientError } from "@/api/client";
import { genId, nowIso, wordCount, excerpt, clamp } from "../util";

const QUESTION_BUDGET = 6;

function bankFor(candidateId: string): BankQuestion[] {
  const profile = getDB().candidates[candidateId]?.profile;
  const familyId = profile?.job_family_id;
  return familyId ? (INTERVIEW_BANK[familyId] ?? []) : [];
}

export function createInterview(candidateId: string, mode: InterviewMode): StoredInterview {
  return mutate((db) => {
    const existing = Object.values(db.interviews).find(
      (i) => i.candidateId === candidateId && i.status === "IN_PROGRESS",
    );
    if (existing) return existing;
    const id = genId("intv");
    const session: StoredInterview = {
      id,
      candidateId,
      status: "IN_PROGRESS",
      mode,
      question_budget: QUESTION_BUDGET,
      questions_asked: 0,
      coverage_state: {},
      started_at: nowIso(),
      completed_at: null,
      turns: [],
      askedQuestionIds: [],
      probeUsed: false,
    };
    db.interviews[id] = session;
    return session;
  });
}

export function getInterview(id: string): StoredInterview {
  const session = getDB().interviews[id];
  if (!session) throw new ApiClientError("NOT_FOUND", 404, "La sesión de entrevista no existe.");
  return session;
}

function pickNextBankQuestion(session: StoredInterview): BankQuestion | null {
  const bank = bankFor(session.candidateId);
  const asked = new Set(session.askedQuestionIds);
  const answeredTurns = session.turns.filter((t) => t.answer_text != null);

  const coreUntouched = bank.find(
    (q) => !asked.has(q.id) && !q.is_probe && isCore(session.candidateId, q.competency_code),
  );
  if (coreUntouched) return coreUntouched;

  const probeCandidate = bank.find((q) => q.is_probe && !asked.has(q.id));
  const longAnswer = answeredTurns.find((t) => wordCount(t.answer_text ?? "") > 12);
  const forceProbe = session.questions_asked === session.question_budget - 1;
  if (probeCandidate && !session.probeUsed && answeredTurns.length > 0 && (longAnswer != null || forceProbe)) {
    return probeCandidate;
  }

  const rest = bank.find((q) => !asked.has(q.id) && !q.is_probe);
  if (rest) return rest;

  // Sin más preguntas core/genéricas: si queda la PROBE sin usar, se ofrece como última opción.
  if (probeCandidate && !session.probeUsed && answeredTurns.length > 0) return probeCandidate;

  return null;
}

function isCore(candidateId: string, competencyCode: string): boolean {
  const familyId = getDB().candidates[candidateId]?.profile.job_family_id;
  const competencies = familyId ? (COMPETENCIES_BY_FAMILY[familyId] ?? []) : [];
  return competencies.find((c) => c.code === competencyCode)?.is_core ?? false;
}

function longestAnsweredTurn(session: StoredInterview): InterviewTurn | null {
  const answered = session.turns.filter((t) => t.answer_text != null);
  if (answered.length === 0) return null;
  return answered.reduce((best, t) =>
    wordCount(t.answer_text ?? "") > wordCount(best.answer_text ?? "") ? t : best,
  );
}

function toNextQuestion(session: StoredInterview): NextQuestion {
  const progress = { asked: session.questions_asked, budget: session.question_budget };
  const pending = session.turns.find((t) => t.answer_text == null);
  if (pending) return { turn: pending, finished: false, finish_reason: null, progress };

  if (session.questions_asked >= session.question_budget) {
    return { turn: null, finished: true, finish_reason: "BUDGET_EXHAUSTED", progress };
  }

  const nextBankQuestion = pickNextBankQuestion(session);
  if (!nextBankQuestion) {
    return { turn: null, finished: true, finish_reason: "COVERAGE_SUFFICIENT", progress };
  }

  let questionText = nextBankQuestion.text;
  let referencesTurnId: string | null = null;
  if (nextBankQuestion.is_probe) {
    const referenceTurn = longestAnsweredTurn(session);
    if (referenceTurn) {
      questionText = questionText.replace("{{prev_excerpt}}", excerpt(referenceTurn.answer_text ?? "", 8));
      referencesTurnId = referenceTurn.id;
    }
  }

  const turn: InterviewTurn = {
    id: genId("turn"),
    sequence: session.turns.length + 1,
    question_text: questionText,
    target_competency_code: nextBankQuestion.competency_code,
    question_intent: nextBankQuestion.intent,
    references_turn_id: referencesTurnId,
    answer_text: null,
    answer_received_at: null,
    audio_url: null,
  };

  session.turns.push(turn);
  session.askedQuestionIds.push(nextBankQuestion.id);
  session.questions_asked += 1;
  if (nextBankQuestion.is_probe) session.probeUsed = true;
  if (!session.coverage_state[turn.target_competency_code]) {
    session.coverage_state[turn.target_competency_code] = { status: "UNTOUCHED", turns: [], depth: 0 };
  }
  session.coverage_state[turn.target_competency_code]!.status = "PARTIAL";

  return { turn, finished: false, finish_reason: null, progress: { asked: session.questions_asked, budget: session.question_budget } };
}

export function nextQuestion(id: string): NextQuestion {
  return mutate((db) => {
    const session = db.interviews[id];
    if (!session) throw new ApiClientError("NOT_FOUND", 404, "La sesión de entrevista no existe.");
    return toNextQuestion(session);
  });
}

export function answer(id: string, input: AnswerInput): NextQuestion {
  return mutate((db) => {
    const session = db.interviews[id];
    if (!session) throw new ApiClientError("NOT_FOUND", 404, "La sesión de entrevista no existe.");
    const pending = session.turns.find((t) => t.answer_text == null);
    if (!pending) throw new ApiClientError("NO_PENDING_QUESTION", 409, "No hay una pregunta pendiente de responder.");
    pending.answer_text = input.answer_text;
    pending.answer_received_at = nowIso();
    const coverage = session.coverage_state[pending.target_competency_code];
    if (coverage) {
      coverage.status = wordCount(input.answer_text) >= 6 ? "SUFFICIENT" : "PARTIAL";
      coverage.turns.push(pending.sequence);
      coverage.depth += 1;
    }
    return toNextQuestion(session);
  });
}

export function progress(id: string): InterviewProgress {
  const session = getInterview(id);
  const coverage: Record<string, "UNTOUCHED" | "PARTIAL" | "SUFFICIENT"> = {};
  for (const [code, state] of Object.entries(session.coverage_state)) coverage[code] = state.status;
  return {
    asked: session.questions_asked,
    budget: session.question_budget,
    percent: clamp(Math.round((session.questions_asked / session.question_budget) * 100)),
    coverage,
  };
}

export function turns(id: string): InterviewTurn[] {
  return [...getInterview(id).turns];
}

/** Deriva nivel/score/confianza de una respuesta con una heurística simple de longitud + palabras clave. */
function evaluateAnswer(turn: InterviewTurn, competencyName: string, type: "TECHNICAL" | "BEHAVIORAL"): CompetencyEvaluation {
  const words = wordCount(turn.answer_text ?? "");
  let rubric_level: 0 | 1 | 2 | 3 | 4;
  let confidence: number;
  if (words >= 25) { rubric_level = 4; confidence = 0.88; }
  else if (words >= 15) { rubric_level = 3; confidence = 0.78; }
  else if (words >= 6) { rubric_level = 2; confidence = 0.62; }
  else { rubric_level = 1; confidence = 0.4; } // nunca 0: respuesta dubitativa igual cuenta como evidencia mínima

  const score = clamp(rubric_level * 20 + Math.min(15, words));
  const isThin = rubric_level <= 2;
  return {
    competency_code: turn.target_competency_code,
    competency_name: competencyName,
    type,
    score,
    rubric_level,
    confidence,
    justification: `En la entrevista respondió: "${excerpt(turn.answer_text ?? "", 12)}"`,
    evidence_turn_ids: [turn.id],
    limitations: isThin ? "La respuesta fue breve; se recomienda profundizar en una siguiente conversación." : null,
    rubric_source: "SPECIFIC",
  };
}

export interface InterviewEvaluationResult {
  evaluations: CompetencyEvaluation[];
  talentProfile: TalentProfile;
  feedback: FeedbackReport;
  learningPath: LearningPath;
}

export function evaluateInterview(session: StoredInterview): InterviewEvaluationResult {
  const familyId = getDB().candidates[session.candidateId]?.profile.job_family_id ?? "";
  const competencies = COMPETENCIES_BY_FAMILY[familyId] ?? [];
  const answered = session.turns.filter((t) => t.answer_text != null);

  const byCompetency = new Map<string, InterviewTurn>();
  for (const turn of answered) {
    const existing = byCompetency.get(turn.target_competency_code);
    if (!existing || wordCount(turn.answer_text ?? "") > wordCount(existing.answer_text ?? "")) {
      byCompetency.set(turn.target_competency_code, turn);
    }
  }

  const evaluations: CompetencyEvaluation[] = [...byCompetency.entries()].map(([code, turn]) => {
    const cmp = competencies.find((c) => c.code === code);
    return evaluateAnswer(turn, cmp?.name ?? code, cmp?.type ?? "TECHNICAL");
  });

  const overall_score = evaluations.length > 0
    ? clamp(Math.round(evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length))
    : 40;
  const overall_label = overall_score >= 75 ? "Evidencia sólida" : "Evidencia en desarrollo";

  const strengths = [...evaluations]
    .filter((e) => e.score >= 75)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((e) => `${e.competency_name.toLowerCase()} (evaluada, ${e.score})`);
  const evidence_gaps = evaluations
    .filter((e) => e.rubric_level < 3)
    .map((e) => `${e.competency_name}: ${e.limitations ?? "requiere más evidencia"}`);

  const talentProfile: TalentProfile = {
    id: genId("tp"),
    version: 1,
    generated_at: nowIso(),
    overall_score,
    overall_label,
    top_skills: [],
    evaluations,
    strengths: strengths.length > 0 ? strengths : ["Consistencia general en las respuestas"],
    evidence_gaps,
    summary_text: `Perfil generado a partir de ${answered.length} respuestas de la entrevista conversacional, con ${overall_label.toLowerCase()}.`,
  };

  const feedback: FeedbackReport = {
    candidate_note: `Tu evidencia muestra ${overall_label.toLowerCase()}. ${strengths.length > 0 ? `Destacan ${strengths.join(", ")}.` : ""} Sigue reforzando las áreas con evidencia limitada.`,
    company_note: `Candidato con ${overall_label.toLowerCase()} tras la entrevista conversacional (${answered.length} respuestas evaluadas).`,
    generated_at: nowIso(),
  };

  const gaps: LearningGap[] = evaluations
    .filter((e) => e.rubric_level < 3)
    .map((e) => ({
      competency_code: e.competency_code,
      competency_name: e.competency_name,
      current_level: e.rubric_level,
      target_level: 3,
      why_it_matters: `Reforzar ${e.competency_name.toLowerCase()} mejora tu evidencia frente a vacantes similares.`,
      recommendations: recommendationsFor(e.competency_code),
    }));

  return { evaluations, talentProfile, feedback, learningPath: { gaps } };
}
