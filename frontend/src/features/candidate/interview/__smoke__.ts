import { api } from "@/api";
import { useSessionStore } from "@/store/session";
import type { Job } from "@/api/types";

async function waitForJob(jobId: string): Promise<Job> {
  for (;;) {
    const job = await api.jobs.get(jobId);
    if (job.status === "DONE") return job;
    if (job.status === "FAILED") throw new Error(`Job ${jobId} (${job.type}) falló.`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

/**
 * Prueba de humo del flujo de entrevista (F4): recorre exactamente las llamadas
 * que hacen C8, C9 y C10 y verifica los invariantes de los que depende la UI
 * (retomar en la misma pregunta, PROBE con `references_turn_id`, perfil final).
 */
export async function runInterviewSmoke(): Promise<string[]> {
  const log: string[] = [];
  const email = `smoke_interview_${Date.now()}@demo.mx`;

  const auth = await api.auth.register({ email, password: "demo1234", role: "CANDIDATE" });
  useSessionStore.getState().login(auth);
  log.push(`auth.register OK (${auth.user.id})`);

  const families = await api.catalog.jobFamilies();
  const family = families.find((f) => f.code === "WAREHOUSE_SUPERVISOR");
  if (!family) throw new Error("Falta la familia WAREHOUSE_SUPERVISOR en el catálogo.");
  await api.candidate.setJobFamily(family.id);
  await api.candidate.update({
    full_name: "Candidata de humo F4",
    location: { city: "León", state: "Guanajuato" },
    availability: "IMMEDIATE",
  });
  log.push("candidate.setJobFamily + update OK");

  // C8 lee las competencias core de la familia para "Qué evaluaremos".
  const competencies = await api.catalog.competencies(family.id);
  const core = competencies.filter((c) => c.is_core);
  if (core.length === 0) throw new Error("La familia no tiene competencias core.");
  log.push(`catalog.competencies OK (${core.length} core de ${competencies.length})`);

  const file = new File(["cv de prueba"], "cv-smoke-f4.pdf", { type: "application/pdf" });
  await waitForJob((await api.documents.uploadCV(file)).job_id);
  await api.documents.extraction();
  await api.documents.confirmExtraction({});
  log.push("documents.uploadCV + extraction + confirmExtraction OK (status → CV_READY)");

  // C8: interviews.create(mode)
  const session = await api.interviews.create("VOICE");
  if (session.mode !== "VOICE") throw new Error("interviews.create no respetó el modo VOICE.");
  log.push(`interviews.create("VOICE") OK (${session.id}, budget=${session.question_budget})`);

  // C8 con sesión IN_PROGRESS: el CTA cambia a "Continuar entrevista".
  const statusView = await api.candidate.status();
  if (statusView.interview_session_id !== session.id) {
    throw new Error("candidate.status no expone la sesión IN_PROGRESS para el CTA de continuar.");
  }
  log.push("candidate.status.interview_session_id OK (CTA 'Continuar entrevista')");

  // C9 boot: nextQuestion. Al cerrar y volver debe devolver EXACTAMENTE la misma
  // pregunta pendiente (sin consumir turno).
  const first = await api.interviews.nextQuestion(session.id);
  const again = await api.interviews.nextQuestion(session.id);
  if (!first.turn || first.turn.id !== again.turn?.id) {
    throw new Error("nextQuestion no retoma la misma pregunta pendiente al reabrir la entrevista.");
  }
  if (again.progress.asked !== first.progress.asked) {
    throw new Error("Reabrir la entrevista consumió un turno.");
  }
  log.push(`nextQuestion idempotente al reabrir OK (turno ${first.turn.sequence}, asked=${first.progress.asked})`);

  // C9 bucle: answer → siguiente pregunta hasta finished.
  let next = first;
  let probeSeen = false;
  let turnsAnswered = 0;
  const answers = [
    "Coordino un equipo de ocho personas en el almacén y reviso inventarios cada semana con el sistema WMS.",
    "Cuando el físico no cuadra con el sistema recuento la ubicación, reviso las entradas del día y levanto un reporte de ajuste.",
    "Uso montacargas con licencia vigente y siempre reviso frenos, horquillas y el área antes de maniobrar.",
    "En recepción verifico la orden de compra contra la factura y el físico antes de firmar la entrada.",
    "Reorganicé el acomodo por rotación y bajamos los tiempos de surtido de veinte a doce minutos.",
    "Cuando hay diferencias hablo primero con el operador involucrado y luego documento el hallazgo con evidencia.",
  ];

  while (!next.finished && next.turn) {
    if (next.turn.references_turn_id != null) {
      probeSeen = true;
      const referenced = (await api.interviews.turns(session.id)).find(
        (t) => t.id === next.turn?.references_turn_id,
      );
      if (!referenced) throw new Error("references_turn_id apunta a un turno inexistente.");
      log.push(
        `PROBE detectada en el turno ${next.turn.sequence} → referencia el turno ${referenced.sequence}`,
      );
    }
    next = await api.interviews.answer(session.id, {
      answer_text: answers[turnsAnswered % answers.length] ?? answers[0]!,
      mode: "VOICE",
    });
    turnsAnswered += 1;
    if (turnsAnswered > 12) throw new Error("La entrevista no terminó dentro del presupuesto.");
  }
  if (!probeSeen) throw new Error("Ninguna pregunta citó una respuesta anterior (PROBE).");
  log.push(`interviews.answer × ${turnsAnswered} → finished (${next.finish_reason})`);

  const progress = await api.interviews.progress(session.id);
  log.push(
    `interviews.progress OK (asked=${progress.asked}/${progress.budget}, ${progress.percent}%, ${Object.keys(progress.coverage).length} competencias con cobertura)`,
  );

  // C9 → C10: complete devuelve el job que la pantalla de resultado poletea.
  const jobRef = await api.interviews.complete(session.id);
  const job = await waitForJob(jobRef.job_id);
  log.push(`interviews.complete → job ${job.type} DONE (progress=${job.progress})`);

  const profile = await api.candidate.talentProfile();
  if (profile.evaluations.length === 0) throw new Error("El TalentProfile llegó sin evaluaciones.");
  for (const evaluation of profile.evaluations) {
    if (!evaluation.justification) throw new Error(`Evaluación ${evaluation.competency_code} sin justificación.`);
    if (evaluation.rubric_level === 0) throw new Error("Se generó un rubric_level 0.");
  }
  log.push(
    `candidate.talentProfile OK (score=${profile.overall_score}, "${profile.overall_label}", ${profile.evaluations.length} competencias, ${profile.strengths.length} fortalezas, ${profile.evidence_gaps.length} brechas)`,
  );

  const feedback = await api.candidate.feedback();
  if (!feedback.candidate_note) throw new Error("FeedbackReport sin candidate_note.");
  log.push("candidate.feedback OK (nota para la AIInsightCard)");

  return log;
}
