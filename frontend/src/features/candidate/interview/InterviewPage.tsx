import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AlertCircle } from "lucide-react";
import { useCandidateMe } from "@/api/hooks";
import { ImmersiveLayout } from "@/components/layout";
import { Button, Modal } from "@/components/ui";
import { ContextAside } from "./ContextAside";
import { InterviewControls } from "./InterviewControls";
import { OrbStage } from "./OrbStage";
import { QuestionPanel } from "./QuestionPanel";
import { TranscriptBox } from "./TranscriptBox";
import { useInterviewMachine } from "./useInterviewMachine";

/**
 * C9 — Entrevista en curso `/candidate/interview/:id`.
 *
 * Una sola instancia de `AudioOrb` montada durante toda la sesión: solo cambian
 * `state` y `analyser`. La máquina de estados vive en `useInterviewMachine`.
 */
export function Component() {
  const params = useParams<{ id: string }>();
  const interviewId = params.id ?? "";
  const navigate = useNavigate();
  const [confirmClose, setConfirmClose] = useState(false);
  const candidateQuery = useCandidateMe();
  const machine = useInterviewMachine(interviewId);

  const answering = machine.state === "listening" || machine.state === "paused";
  const showTranscript =
    answering &&
    (machine.mode === "TEXT" ||
      machine.reviewing ||
      machine.transcribing ||
      machine.micMuted ||
      machine.state === "paused");

  return (
    <ImmersiveLayout
      onClose={() => setConfirmClose(true)}
      asideDesktopOnly
      aside={
        <div className="h-full">
          <ContextAside
            interviewId={interviewId}
            jobFamilyId={candidateQuery.data?.job_family_id}
            currentTurn={machine.turn}
            draft={machine.draft}
            statusLabel={machine.statusLabel}
          />
        </div>
      }
    >
      <div className="flex w-full flex-col items-center gap-6 py-2">
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

        <OrbStage
          state={machine.orbState}
          analyser={machine.analyser}
          label={machine.statusLabel}
          className="w-full"
        />

        {machine.error && (
          <div
            role="alert"
            className="flex w-full items-start gap-3 rounded-lg border border-danger/40 bg-danger/10 p-4 text-sm text-text-on-dark"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
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

        {showTranscript && (
          <TranscriptBox
            mode={machine.mode}
            value={machine.draft}
            onChange={machine.setDraft}
            onSubmit={machine.submit}
            reviewing={machine.reviewing}
            transcribing={machine.transcribing}
            disabled={machine.state === "thinking" || machine.state === "finished"}
            autoFocus={machine.mode === "TEXT" || machine.reviewing}
          />
        )}

        {machine.state !== "loading" && machine.state !== "finished" && (
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
        )}

        <p className="max-w-[52ch] text-center text-xs text-text-on-dark-secondary/80">
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
