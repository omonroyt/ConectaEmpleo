import { useQuery } from "@tanstack/react-query";
import { CircleDashed, CircleDot, CircleCheck, CornerDownRight } from "lucide-react";
import { api } from "@/api";
import { useCompetencies, useInterviewProgress } from "@/api/hooks";
import type { CoverageStatus, InterviewTurn } from "@/api/types";

export interface ContextAsideProps {
  interviewId: string;
  jobFamilyId: string | null | undefined;
  currentTurn: InterviewTurn | null;
  /** Respuesta en construcción, para la transcripción en vivo. */
  draft: string;
  statusLabel: string;
}

const coverageCopy: Record<CoverageStatus, string> = {
  UNTOUCHED: "Sin explorar",
  PARTIAL: "En exploración",
  SUFFICIENT: "Con evidencia",
};

const coverageIcon = {
  UNTOUCHED: CircleDashed,
  PARTIAL: CircleDot,
  SUFFICIENT: CircleCheck,
} as const;

/** Historial de turnos de la sesión (Should Have del contrato: `interviews.turns`). */
function useInterviewTurns(interviewId: string) {
  return useQuery({
    queryKey: ["interview", interviewId, "turns"],
    queryFn: () => api.interviews.turns(interviewId),
    enabled: interviewId.length > 0,
  });
}

/**
 * Panel de contexto (desktop): competencia explorada, cobertura, historial de
 * turnos con el turno referenciado por una repregunta resaltado, y la
 * transcripción en vivo.
 */
export function ContextAside({
  interviewId,
  jobFamilyId,
  currentTurn,
  draft,
  statusLabel,
}: ContextAsideProps) {
  const competenciesQuery = useCompetencies(jobFamilyId);
  const progressQuery = useInterviewProgress(interviewId);
  const turnsQuery = useInterviewTurns(interviewId);

  const competencies = competenciesQuery.data ?? [];
  const coverage = progressQuery.data?.coverage ?? {};
  const turns = turnsQuery.data ?? [];
  const answered = turns.filter((t) => t.answer_text != null);
  const referencedTurn = currentTurn?.references_turn_id
    ? (turns.find((t) => t.id === currentTurn.references_turn_id) ?? null)
    : null;

  const currentCompetency = competencies.find(
    (c) => c.code === currentTurn?.target_competency_code,
  );

  return (
    <aside className="flex h-full flex-col gap-6 rounded-xl border border-border-dark bg-white/[0.03] p-6">
      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-[.18em] text-text-on-dark-secondary">
          Estamos explorando
        </h3>
        <p className="mt-2 text-lg font-semibold text-text-on-dark">
          {currentCompetency?.name ?? currentTurn?.target_competency_code ?? "Tu experiencia"}
        </p>
        {currentCompetency?.description && (
          <p className="mt-1 text-sm text-text-on-dark-secondary">{currentCompetency.description}</p>
        )}
      </section>

      {referencedTurn && (
        <section className="rounded-lg border border-accent/40 bg-accent/10 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-soft">
            <CornerDownRight className="size-3.5" aria-hidden="true" />
            Profundiza en tu respuesta anterior
          </p>
          <p className="mt-2 text-sm text-text-on-dark-secondary">
            <span className="font-medium text-text-on-dark">
              Pregunta {referencedTurn.sequence}:
            </span>{" "}
            {referencedTurn.question_text}
          </p>
          {referencedTurn.answer_text && (
            <p className="mt-2 text-sm italic text-text-on-dark-secondary">
              “{referencedTurn.answer_text}”
            </p>
          )}
        </section>
      )}

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-[.18em] text-text-on-dark-secondary">
          Cobertura de competencias
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {competencies.map((competency) => {
            const status: CoverageStatus = coverage[competency.code] ?? "UNTOUCHED";
            const Icon = coverageIcon[status];
            return (
              <li key={competency.id} className="flex items-start gap-2.5 text-sm">
                <Icon
                  className={
                    status === "SUFFICIENT"
                      ? "mt-0.5 size-4 shrink-0 text-success"
                      : status === "PARTIAL"
                        ? "mt-0.5 size-4 shrink-0 text-primary-2"
                        : "mt-0.5 size-4 shrink-0 text-text-on-dark-secondary/60"
                  }
                  aria-hidden="true"
                />
                <span className="text-text-on-dark">{competency.name}</span>
                <span className="ml-auto shrink-0 text-xs text-text-on-dark-secondary">
                  {coverageCopy[status]}
                </span>
              </li>
            );
          })}
          {competencies.length === 0 && (
            <li className="text-sm text-text-on-dark-secondary">
              Cargando las competencias de tu área…
            </li>
          )}
        </ul>
      </section>

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-[.18em] text-text-on-dark-secondary">
          Transcripción en vivo
        </h3>
        <p className="mt-2 text-sm text-text-on-dark-secondary" aria-live="polite">
          {draft.trim() ? draft : statusLabel}
        </p>
      </section>

      <details className="mt-auto rounded-lg border border-border-dark p-4 open:bg-white/[0.02]">
        <summary className="cursor-pointer text-sm font-medium text-text-on-dark">
          Historial de la conversación ({answered.length})
        </summary>
        <ol className="mt-3 flex flex-col gap-4">
          {answered.map((entry) => (
            <li
              key={entry.id}
              className={
                referencedTurn?.id === entry.id
                  ? "rounded-md border border-accent/40 bg-accent/10 p-3"
                  : "border-l border-border-dark pl-3"
              }
            >
              <p className="text-xs font-semibold text-text-on-dark-secondary">
                Pregunta {entry.sequence}
              </p>
              <p className="mt-1 text-sm text-text-on-dark">{entry.question_text}</p>
              <p className="mt-1 text-sm text-text-on-dark-secondary">{entry.answer_text}</p>
            </li>
          ))}
          {answered.length === 0 && (
            <li className="text-sm text-text-on-dark-secondary">
              Aquí verás tus respuestas conforme avances.
            </li>
          )}
        </ol>
      </details>
    </aside>
  );
}
