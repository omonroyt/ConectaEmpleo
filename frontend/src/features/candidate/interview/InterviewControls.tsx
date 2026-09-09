import { Keyboard, Mic, MicOff, Pause, Play, RotateCcw, Send, Square } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { InterviewMode } from "@/api/types";
import type { InterviewUiState } from "./useInterviewMachine";

export interface InterviewControlsProps {
  state: InterviewUiState;
  mode: InterviewMode;
  voiceAvailable: boolean;
  micMuted: boolean;
  reviewing: boolean;
  transcribing: boolean;
  canSubmit: boolean;
  elapsedMs: number;
  onFinishAnswer: () => void;
  onSubmit: () => void;
  onRepeat: () => void;
  onToggleMic: () => void;
  onPause: () => void;
  onResume: () => void;
  onModeChange: (mode: InterviewMode) => void;
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const iconButton =
  "inline-flex h-11 items-center gap-2 rounded-pill border border-white/15 px-4 text-sm font-medium text-text-on-dark-secondary transition-colors duration-fast ease-standard hover:border-white/30 hover:text-text-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2 disabled:cursor-not-allowed disabled:opacity-40";

/** Controles de la entrevista: terminar/enviar, repetir, micrófono, pausa y modo. */
export function InterviewControls({
  state,
  mode,
  voiceAvailable,
  micMuted,
  reviewing,
  transcribing,
  canSubmit,
  elapsedMs,
  onFinishAnswer,
  onSubmit,
  onRepeat,
  onToggleMic,
  onPause,
  onResume,
  onModeChange,
}: InterviewControlsProps) {
  const answering = state === "listening";
  const paused = state === "paused";
  const busy = state === "thinking" || state === "finished" || state === "loading";
  const showFinishAnswer = mode === "VOICE" && answering && !reviewing && !micMuted;

  return (
    <div className="flex w-full flex-col gap-4">
      {mode === "VOICE" && answering && !reviewing && (
        <p className="text-center text-sm tabular-nums text-text-on-dark-secondary" aria-live="off">
          {micMuted ? "Micrófono en silencio" : `Grabando ${formatElapsed(elapsedMs)}`}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {showFinishAnswer ? (
          <Button size="lg" onClick={onFinishAnswer} loading={transcribing}>
            <Square className="size-4" aria-hidden="true" />
            Terminar respuesta
          </Button>
        ) : (
          <Button size="lg" onClick={onSubmit} disabled={!canSubmit || busy} arrow={false}>
            <Send className="size-4" aria-hidden="true" />
            Enviar respuesta
          </Button>
        )}

        {mode === "VOICE" && (
          <button
            type="button"
            className={iconButton}
            onClick={onToggleMic}
            disabled={!answering || transcribing}
            aria-pressed={micMuted}
          >
            {micMuted ? (
              <MicOff className="size-4" aria-hidden="true" />
            ) : (
              <Mic className="size-4" aria-hidden="true" />
            )}
            {micMuted ? "Reactivar micrófono" : "Silenciar micrófono"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {mode === "VOICE" && (
          <button
            type="button"
            className={iconButton}
            onClick={onRepeat}
            disabled={busy || paused}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Repetir pregunta
          </button>
        )}

        <button
          type="button"
          className={iconButton}
          onClick={paused ? onResume : onPause}
          disabled={busy}
        >
          {paused ? (
            <Play className="size-4" aria-hidden="true" />
          ) : (
            <Pause className="size-4" aria-hidden="true" />
          )}
          {paused ? "Reanudar" : "Pausar"}
        </button>

        {/* Toggle siempre visible: la entrevista completa se puede hacer por texto. */}
        <button
          type="button"
          className={cn(iconButton, "border-dashed")}
          onClick={() => onModeChange(mode === "VOICE" ? "TEXT" : "VOICE")}
          disabled={busy || (mode === "TEXT" && !voiceAvailable)}
          title={
            mode === "TEXT" && !voiceAvailable
              ? "Este navegador no permite responder por voz."
              : undefined
          }
        >
          {mode === "VOICE" ? (
            <Keyboard className="size-4" aria-hidden="true" />
          ) : (
            <Mic className="size-4" aria-hidden="true" />
          )}
          {mode === "VOICE" ? "Responder por texto" : "Responder por voz"}
        </button>
      </div>
    </div>
  );
}
