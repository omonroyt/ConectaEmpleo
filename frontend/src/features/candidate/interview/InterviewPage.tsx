import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AlertCircle } from "lucide-react";
import { ImmersiveLayout } from "@/components/layout";
import { Button, Modal } from "@/components/ui";
import { AnswerComposer } from "./AnswerComposer";
import { InterviewControls } from "./InterviewControls";
import { OrbStage } from "./OrbStage";
import { QuestionPanel } from "./QuestionPanel";
import { useInterviewMachine } from "./useInterviewMachine";

/**
 * C9 — Entrevista en curso `/candidate/interview/:id`.
 *
 * Una sola columna centrada con el Orb como protagonista: la pregunta arriba,
 * el Orb sin caja en el centro y el compositor de respuesta al pie. El
 * seguimiento fino de la sesión (competencia explorada, cobertura, historial
 * de turnos) se sigue registrando en la máquina y la API, pero no se le
 * muestra al candidato: durante la entrevista solo tiene que conversar.
 *
 * Una única instancia de `AudioOrb` montada durante toda la sesión: solo
 * cambian `state` y `analyser`. La máquina de estados vive en
 * `useInterviewMachine`.
 */
export function Component() {
  const params = useParams<{ id: string }>();
  const interviewId = params.id ?? "";
  const navigate = useNavigate();
  const [confirmClose, setConfirmClose] = useState(false);
  const machine = useInterviewMachine(interviewId);

  const answering = machine.state === "listening" || machine.state === "paused";
  const showField =
    answering &&
    (machine.mode === "TEXT" ||
      machine.reviewing ||
      machine.transcribing ||
      machine.micMuted ||
      machine.state === "paused");
  const showComposer = machine.state !== "loading" && machine.state !== "finished";

  return (
    <ImmersiveLayout onClose={() => setConfirmClose(true)}>
      {/* `flex-1` + `-mb-*`: el bloque se estira a todo el alto disponible y
          recupera parte del padding inferior del layout. Todo lo que sobra
          entre la pregunta y el compositor se lo queda el Orb. */}
      <div className="flex w-full flex-1 flex-col items-center gap-2 -mb-8 sm:-mb-10">
        <QuestionPanel
          turn={machine.turn}
          asked={machine.asked}
          budget={machine.budget}
          placeholder={
            machine.state === "finished"
              ? "Gracias por la conversación. Estamos preparando tu resumen…"
              : "Preparando tu entrevista…"
          }
        />

        {/* El Orb ocupa todo el hueco libre entre la pregunta y el
            compositor; su anillo exterior es transparente, así que se solapa
            con los huecos vecinos sin tocar el texto. */}
        <OrbStage
          state={machine.orbState}
          analyser={machine.analyser}
          className="min-h-[200px] flex-1"
        />

        {!showComposer && (
          <p
            className="relative z-10 min-h-6 text-center text-sm font-medium text-text-on-dark-secondary"
            aria-live="polite"
          >
            {machine.statusLabel}
          </p>
        )}

        {machine.error && (
          <div
            role="alert"
            className="relative z-10 flex w-full items-start gap-3 rounded-lg border border-danger-on-dark/40 bg-danger/10 p-4 text-sm text-text-on-dark"
          >
            <AlertCircle
              className="mt-0.5 size-4 shrink-0 text-danger-on-dark"
              aria-hidden="true"
            />
            <div className="flex-1">
              <p>{machine.error}</p>
              <button
                type="button"
                onClick={machine.retry}
                className="mt-2 text-sm font-medium text-accent-soft underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        )}

        {showComposer && (
          <AnswerComposer
            mode={machine.mode}
            statusLabel={machine.statusLabel}
            showField={showField}
            value={machine.draft}
            onChange={machine.setDraft}
            onSubmit={machine.submit}
            reviewing={machine.reviewing}
            transcribing={machine.transcribing}
            fieldDisabled={machine.state === "thinking"}
            autoFocus={machine.mode === "TEXT" || machine.reviewing}
          >
            <InterviewControls
              state={machine.state}
              mode={machine.mode}
              voiceAvailable={machine.voiceAvailable}
              micMuted={machine.micMuted}
              reviewing={machine.reviewing}
              transcribing={machine.transcribing}
              canSubmit={machine.canSubmit}
              elapsedMs={machine.elapsedMs}
              onFinishAnswer={machine.finishAnswer}
              onSubmit={machine.submit}
              onRepeat={machine.repeatQuestion}
              onToggleMic={machine.toggleMic}
              onPause={machine.pause}
              onResume={machine.resume}
              onModeChange={machine.setMode}
            />
          </AnswerComposer>
        )}

        <p className="relative z-10 max-w-[52ch] text-pretty text-center text-xs text-text-on-dark-tertiary">
          Tu evaluación se basa en tus respuestas y la evidencia disponible.
        </p>
      </div>

      <Modal open={confirmClose} onClose={() => setConfirmClose(false)} title="¿Salir de la entrevista?">
        <p className="text-sm text-text-secondary">
          Puedes retomar después; tu progreso se guarda. Al volver continuarás en esta misma
          pregunta.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <Button onClick={() => navigate("/candidate")}>Salir y guardar</Button>
          <Button variant="secondary" onClick={() => setConfirmClose(false)}>
            Seguir aquí
          </Button>
        </div>
      </Modal>
    </ImmersiveLayout>
  );
}
