import { api } from "@/api";
import { useSessionStore } from "@/store/session";
import type { Job, RequirementInput } from "@/api/types";

async function waitForJob(jobId: string): Promise<Job> {
  for (;;) {
    const job = await api.jobs.get(jobId);
    if (job.status === "DONE") return job;
    if (job.status === "FAILED") throw new Error(`Job ${jobId} (${job.type}) falló: ${job.error ?? "sin detalle"}`);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

/**
 * Recorre el golden path completo del mock (candidato + empresa) y lanza si
 * algo no cumple el contrato. Ver docs/build/00_BUILD_STATE.md (bitácora F2)
 * para el resumen esperado de cada paso.
 */
export async function runSmoke(): Promise<string[]> {
  const log: string[] = [];
  const email = `smoke_${Date.now()}@demo.mx`;

  // ---------- Candidato ----------
  const registerRes = await api.auth.register({ email, password: "demo1234", role: "CANDIDATE" });
  useSessionStore.getState().login(registerRes);
  log.push(`auth.register candidato OK (${registerRes.user.id})`);

  const families = await api.catalog.jobFamilies();
  const warehouse = families.find((f) => f.code === "WAREHOUSE_SUPERVISOR");
  if (!warehouse) throw new Error("No se encontró la familia WAREHOUSE_SUPERVISOR en el catálogo.");
  await api.candidate.setJobFamily(warehouse.id);
  log.push("candidate.setJobFamily OK");

  await api.candidate.update({
    full_name: "Candidato Smoke",
    location: { city: "León", state: "Guanajuato" },
    availability: "IMMEDIATE",
    salary_expectation_min: 12000,
    salary_expectation_max: 16000,
  });
  log.push("candidate.update OK");

  const fakeFile = new File(["contenido de prueba"], "cv-smoke.pdf", { type: "application/pdf" });
  const uploadRef = await api.documents.uploadCV(fakeFile);
  const uploadJob = await waitForJob(uploadRef.job_id);
  log.push(`documents.uploadCV → job DONE (extraction=${uploadJob.result_ref})`);

  const extraction = await api.documents.extraction();
  log.push(`documents.extraction OK (${extraction.experience.length} experiencia(s))`);

  const confirmed = await api.documents.confirmExtraction({});
  if (!confirmed.confirmed_by_candidate) throw new Error("confirmExtraction no marcó confirmed_by_candidate=true.");
  log.push("documents.confirmExtraction OK (status → CV_READY)");

  const interview = await api.interviews.create("TEXT");
  log.push(`interviews.create OK (${interview.id})`);

  let referencesSeen = false;
  for (let i = 0; i < interview.question_budget; i++) {
    const next = await api.interviews.nextQuestion(interview.id);
    if (next.finished || !next.turn) break;
    if (next.turn.references_turn_id) referencesSeen = true;
    const answerText =
      `Respuesta de prueba número ${i + 1} con suficientes palabras para simular una respuesta real de ` +
      `entrevista sobre el puesto y mis actividades diarias en el almacén de la empresa.`;
    const afterAnswer = await api.interviews.answer(interview.id, { answer_text: answerText, mode: "TEXT" });
    if (afterAnswer.turn?.references_turn_id) referencesSeen = true;
  }
  if (!referencesSeen) throw new Error("Ninguna pregunta tuvo references_turn_id (se esperaba al menos una PROBE).");
  log.push(`interviews: ${interview.question_budget} preguntas respondidas, al menos una PROBE con references_turn_id`);

  const completeRef = await api.interviews.complete(interview.id);
  const completeJob = await waitForJob(completeRef.job_id);
  log.push(`interviews.complete → job DONE (talentProfile=${completeJob.result_ref})`);

  const talentProfile = await api.candidate.talentProfile();
  log.push(`candidate.talentProfile OK (overall_score=${talentProfile.overall_score}, label="${talentProfile.overall_label}")`);

  // ---------- Empresa ----------
  const companyAuth = await api.auth.login({ email: "empresa@demo.mx", password: "demo1234" });
  useSessionStore.getState().login(companyAuth);
  log.push("auth.login empresa OK");

  const vacancy = await api.vacancies.create({
    job_family_id: warehouse.id,
    title: "Encargado de almacén (smoke)",
    description: "Vacante de prueba generada por el smoke test de F2.",
    location: { city: "León", state: "Guanajuato" },
    work_mode: "ONSITE",
    salary_min: 12000,
    salary_max: 16000,
    positions_count: 1,
  });
  log.push(`vacancies.create OK (${vacancy.id})`);

  const resolution = await api.vacancies.resolveRequirements(
    vacancy.id,
    "Se requiere control de inventarios, manejo de montacargas, máximo 30 años, buena presentación.",
  );
  if (resolution.warnings.length === 0) {
    throw new Error("resolveRequirements no detectó advertencias discriminatorias (se esperaba >0).");
  }
  log.push(`vacancies.resolveRequirements OK (${resolution.warnings.length} advertencia(s) discriminatoria(s))`);

  const requirementsInput: RequirementInput[] =
    resolution.mapped.length > 0
      ? resolution.mapped
      : [{ competency_code: "INVENTORY_CONTROL", skill_code: null, label: "Control de inventarios", kind: "MANDATORY", min_level: 3, weight: 100 }];
  const vacancyWithReqs = await api.vacancies.setRequirements(vacancy.id, requirementsInput);
  log.push(`vacancies.setRequirements OK (${vacancyWithReqs.requirements.length} requisito(s))`);

  const weightsResult = await api.vacancies.setWeights(vacancy.id, {
    TECHNICAL: 40,
    BEHAVIORAL: 20,
    EXPERIENCE: 15,
    EVIDENCE: 10,
    SALARY: 8,
    LOCATION: 7,
  });
  const weightSum = Object.values(weightsResult.weights).reduce((a, b) => a + b, 0);
  if (weightSum !== 100) throw new Error(`Los pesos de la vacante no suman 100 (suman ${weightSum}).`);
  log.push(`vacancies.setWeights OK (suma=${weightSum})`);

  const matchRef = await api.vacancies.runMatch(vacancy.id);
  const matchJob = await waitForJob(matchRef.job_id);
  const runId = matchJob.result_ref;
  if (!runId) throw new Error("runMatch no devolvió un result_ref (match_run_id).");
  log.push(`vacancies.runMatch → job DONE (run=${runId})`);

  const resultsPage = await api.matching.results(runId, { limit: 10, offset: 0 });
  if (resultsPage.items.length < 5) {
    throw new Error(`Se esperaban >=5 resultados de matching, hubo ${resultsPage.items.length}.`);
  }
  const sortedDesc = resultsPage.items.every(
    (item, idx, arr) => idx === 0 || arr[idx - 1]!.total_score >= item.total_score,
  );
  if (!sortedDesc) throw new Error("matching.results no viene ordenado por total_score descendente.");
  log.push(`matching.results OK (${resultsPage.items.length} candidatos, orden desc verificado)`);

  const firstResult = resultsPage.items[0]!;
  const singleResult = await api.matching.result(firstResult.match_result_id);
  log.push(`matching.result OK (score=${singleResult.total_score})`);

  const unlocked = await api.matching.unlock(firstResult.match_result_id);
  log.push(`matching.unlock OK (${unlocked.full_name})`);

  const fullProfile = await api.matching.fullProfile(firstResult.match_result_id);
  log.push(`matching.fullProfile OK (${fullProfile.email})`);

  const secondResult = resultsPage.items[1];
  const compareIds = secondResult ? [firstResult.match_result_id, secondResult.match_result_id] : [firstResult.match_result_id];
  const compare = await api.matching.compare(vacancy.id, compareIds);
  log.push(`matching.compare OK (${compare.candidates.length} candidato(s) comparado(s))`);

  await api.matching.setShortlistStage(firstResult.match_result_id, "FINALIST");
  const shortlist = await api.matching.shortlist(vacancy.id);
  if (shortlist.length === 0) throw new Error("La shortlist quedó vacía tras setShortlistStage.");
  log.push(`matching.shortlist OK (${shortlist.length} en shortlist)`);

  return log;
}
