import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "@/api";
import { ApiClientError } from "@/api/client";
import { useAnswer, useCompleteInterview, useInterview } from "@/api/hooks";
import type { InterviewMode, InterviewTurn, NextQuestion } from "@/api/types";
import type { OrbState } from "@/components/interview/AudioOrb";
import { useToast } from "@/components/ui";
import { useInterviewVoice, VoiceUnavailableError } from "./useInterviewVoice";

/**
 * Estados de la UI de entrevista (03 §C9):
 * `loading` → `speaking` → `listening` → `thinking` → `speaking` … → `finished`.
 * `paused` conserva la pregunta; `error` permite reintentar sin perder el turno.
 * En modo TEXT se salta `speaking` (no hay voz) pero la pregunta se muestra igual.
 */
export type InterviewUiState =
  | "loading"
  | "speaking"
  | "listening"
  | "thinking"
  | "paused"
  | "finished"
  | "error";

export interface InterviewMachine {
  state: InterviewUiState;
  /** Estado del Orb derivado de la máquina (la instancia nunca se remonta). */
  orbState: OrbState;
  /** Analyser vivo: micrófono en `listening`, TTS en `speaking` si existe, null si no. */
  analyser: AnalyserNode | null;
  statusLabel: string;
  mode: InterviewMode;
  voiceAvailable: boolean;
  turn: InterviewTurn | null;
  asked: number;
  budget: number;
  /** Respuesta en construcción (texto escrito o transcripción editable). */
  draft: string;
  setDraft: (value: string) => void;
  /** true cuando el micrófono ya se cerró y falta confirmar el envío. */
  reviewing: boolean;
  transcribing: boolean;
  micMuted: boolean;
  elapsedMs: number;
  error: string | null;
  canSubmit: boolean;
  submit: () => void;
  /** "Terminar respuesta": cierra el micrófono y vuelca la transcripción al borrador. */
  finishAnswer: () => void;
  repeatQuestion: () => void;
  pause: () => void;
  resume: () => void;
  toggleMic: () => void;
  setMode: (mode: InterviewMode) => void;
  retry: () => void;
}

function joinAnswer(previous: string, addition: string): string {
  const extra = addition.trim();
  if (!extra) return previous;
  const base = previous.trim();
  if (!base) return extra;
  if (base.endsWith(extra)) return base;
  return `${base} ${extra}`;
}

function messageOf(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function useInterviewMachine(interviewId: string): InterviewMachine {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const voice = useInterviewVoice();
  const answerMutation = useAnswer();
  const completeMutation = useCompleteInterview();
  const sessionQuery = useInterview(interviewId);

  const [state, setState] = useState<InterviewUiState>("loading");
  const [mode, setModeState] = useState<InterviewMode>("TEXT");
  const [turn, setTurn] = useState<InterviewTurn | null>(null);
  const [asked, setAsked] = useState(0);
  const [budget, setBudget] = useState(6);
  const [draft, setDraft] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const modeRef = useRef<InterviewMode>("TEXT");
  const turnRef = useRef<InterviewTurn | null>(null);
  const epochRef = useRef(0);
  const bootedRef = useRef(false);
  const fallbackNotifiedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const setMode = useCallback((next: InterviewMode) => {
    modeRef.current = next;
    setModeState(next);
  }, []);

  // ---- timer de respuesta ------------------------------------------------
  const stopTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    const startedAt = performance.now();
    setElapsedMs(0);
    timerRef.current = window.setInterval(() => {
      setElapsedMs(performance.now() - startedAt);
    }, 500);
  }, [stopTimer]);

  useEffect(() => stopTimer, [stopTimer]);

  // ---- caída a texto sin perder el turno ---------------------------------
  const fallbackToText = useCallback(() => {
    setMode("TEXT");
    setMicMuted(false);
    if (!fallbackNotifiedRef.current) {
      fallbackNotifiedRef.current = true;
      showToast({
        title: "No pudimos usar el audio; puedes continuar escribiendo",
        description: "Tu progreso y la pregunta actual se conservan.",
        tone: "warning",
      });
    }
  }, [setMode, showToast]);

  // ---- presentación de una pregunta --------------------------------------
  const beginListening = useCallback(
    async (epoch: number) => {
      setState("listening");
      setReviewing(false);
      if (modeRef.current === "TEXT") {
        startTimer();
        return;
      }
      try {
        await voice.startListening();
      } catch (err) {
        if (epochRef.current !== epoch) return;
        if (err instanceof VoiceUnavailableError) fallbackToText();
        else setError(messageOf(err, "No pudimos acceder al micrófono."));
      }
      if (epochRef.current !== epoch) return;
      startTimer();
    },
    [fallbackToText, startTimer, voice],
  );

  const presentTurn = useCallback(
    async (nextTurn: InterviewTurn, options: { keepDraft?: boolean } = {}) => {
      const epoch = ++epochRef.current;
      turnRef.current = nextTurn;
      setTurn(nextTurn);
      setError(null);
      setReviewing(false);
      setMicMuted(false);
      if (!options.keepDraft) setDraft("");

      if (modeRef.current === "TEXT") {
        await beginListening(epoch);
        return;
      }

      setState("speaking");
      try {
        await voice.speak(nextTurn.question_text);
      } catch (err) {
        if (epochRef.current !== epoch) return;
        if (err instanceof VoiceUnavailableError) fallbackToText();
        else setError(messageOf(err, "No pudimos reproducir la pregunta."));
        await beginListening(epoch);
        return;
      }
      if (epochRef.current !== epoch) return;
      await beginListening(epoch);
    },
    [beginListening, fallbackToText, voice],
  );

  // ---- cierre de la entrevista -------------------------------------------
  const finishInterview = useCallback(async () => {
    const epoch = ++epochRef.current;
    stopTimer();
    voice.cancelSpeech();
    await voice.stopListening();
    if (epochRef.current !== epoch) return;
    setState("finished");
    try {
      const ref = await completeMutation.mutateAsync(interviewId);
      navigate(`/candidate/interview/${interviewId}/result?job=${encodeURIComponent(ref.job_id)}`, {
        replace: true,
      });
    } catch (err) {
      setError(messageOf(err, "No pudimos cerrar la entrevista. Inténtalo de nuevo."));
      setState("error");
    }
  }, [completeMutation, interviewId, navigate, stopTimer, voice]);

  const advance = useCallback(
    (next: NextQuestion) => {
      setAsked(next.progress.asked);
      setBudget(next.progress.budget);
      if (next.finished || !next.turn) {
        void finishInterview();
        return;
      }
      void presentTurn(next.turn);
    },
    [finishInterview, presentTurn],
  );

  // ---- arranque -----------------------------------------------------------
  const boot = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const next = await api.interviews.nextQuestion(interviewId);
      advance(next);
    } catch (err) {
      setError(messageOf(err, "No pudimos cargar la entrevista."));
      setState("error");
    }
  }, [advance, interviewId]);

  useEffect(() => {
    const session = sessionQuery.data;
    if (!session || bootedRef.current) return;
    bootedRef.current = true;
    const resolved: InterviewMode = session.mode === "VOICE" && voice.available ? "VOICE" : "TEXT";
    if (session.mode === "VOICE" && !voice.available) fallbackToText();
    else setMode(resolved);
    void boot();
  }, [boot, fallbackToText, sessionQuery.data, setMode, voice.available]);

  useEffect(() => {
    if (sessionQuery.isError) {
      setError(messageOf(sessionQuery.error, "No pudimos cargar la entrevista."));
      setState("error");
    }
  }, [sessionQuery.error, sessionQuery.isError]);

  // ---- acciones del usuario ----------------------------------------------
  const submit = useCallback(() => {
    const text = draft.trim();
    const currentTurn = turnRef.current;
    if (!text || !currentTurn) return;
    const epoch = ++epochRef.current;
    stopTimer();
    setReviewing(false);
    setState("thinking");
    void (async () => {
      voice.cancelSpeech();
      await voice.stopListening();
      try {
        const next = await answerMutation.mutateAsync({
          interviewId,
          input: { answer_text: text, mode: modeRef.current },
        });
        if (epochRef.current !== epoch) return;
        advance(next);
      } catch (err) {
        if (epochRef.current !== epoch) return;
        setError(messageOf(err, "No pudimos guardar tu respuesta. Inténtalo de nuevo."));
        setReviewing(true);
        setState("listening");
      }
    })();
  }, [advance, answerMutation, draft, interviewId, stopTimer, voice]);

  const finishAnswer = useCallback(() => {
    if (modeRef.current === "TEXT") {
      submit();
      return;
    }
    stopTimer();
    setTranscribing(true);
    void (async () => {
      const transcript = await voice.stopListening();
      setTranscribing(false);
      setReviewing(true);
      setDraft((previous) => joinAnswer(previous, transcript));
    })();
  }, [stopTimer, submit, voice]);

  const repeatQuestion = useCallback(() => {
    const currentTurn = turnRef.current;
    if (!currentTurn || modeRef.current === "TEXT") return;
    // No consume turno: no se llama a nextQuestion, se vuelve a hablar la misma pregunta.
    ++epochRef.current;
    stopTimer();
    voice.cancelSpeech();
    void (async () => {
      const transcript = await voice.stopListening();
      if (transcript.trim()) setDraft((previous) => joinAnswer(previous, transcript));
      await presentTurn(currentTurn, { keepDraft: true });
    })();
  }, [presentTurn, stopTimer, voice]);

  const pause = useCallback(() => {
    ++epochRef.current;
    stopTimer();
    voice.cancelSpeech();
    void (async () => {
      const transcript = await voice.stopListening();
      if (transcript.trim()) setDraft((previous) => joinAnswer(previous, transcript));
    })();
    setState("paused");
  }, [stopTimer, voice]);

  const resume = useCallback(() => {
    const currentTurn = turnRef.current;
    if (!currentTurn) {
      void boot();
      return;
    }
    void presentTurn(currentTurn, { keepDraft: true });
  }, [boot, presentTurn]);

  const toggleMic = useCallback(() => {
    if (modeRef.current === "TEXT") return;
    if (!micMuted) {
      setMicMuted(true);
      stopTimer();
      void (async () => {
        const transcript = await voice.stopListening();
        if (transcript.trim()) setDraft((previous) => joinAnswer(previous, transcript));
      })();
      return;
    }
    setMicMuted(false);
    void beginListening(++epochRef.current);
  }, [beginListening, micMuted, stopTimer, voice]);

  const changeMode = useCallback(
    (next: InterviewMode) => {
      if (next === modeRef.current) return;
      const currentTurn = turnRef.current;
      ++epochRef.current;
      voice.cancelSpeech();
      setMode(next);
      if (next === "TEXT") {
        stopTimer();
        void (async () => {
          const transcript = await voice.stopListening();
          if (transcript.trim()) setDraft((previous) => joinAnswer(previous, transcript));
          setReviewing(true);
          if (currentTurn) setState("listening");
          startTimer();
        })();
        return;
      }
      setMicMuted(false);
      if (currentTurn) void beginListening(++epochRef.current);
    },
    [beginListening, setMode, startTimer, stopTimer, voice],
  );

  const retry = useCallback(() => {
    const currentTurn = turnRef.current;
    setError(null);
    if (state === "finished" || (state === "error" && !currentTurn)) {
      void boot();
      return;
    }
    if (currentTurn) void presentTurn(currentTurn, { keepDraft: true });
    else void boot();
  }, [boot, presentTurn, state]);

  // ---- derivados ----------------------------------------------------------
  const orbState: OrbState =
    state === "speaking"
      ? "speaking"
      : state === "thinking" || state === "finished"
        ? "thinking"
        : state === "listening" && !micMuted && !transcribing
          ? "listening"
          : "idle";

  const statusLabel = (() => {
    switch (state) {
      case "loading":
        return "Preparando tu entrevista…";
      case "speaking":
        return "Pregunta de la entrevista";
      case "thinking":
        return "Analizando respuesta…";
      case "finished":
        return "Preparando tu resumen…";
      case "paused":
        return "Entrevista en pausa";
      case "error":
        return "Ocurrió un problema";
      case "listening":
      default:
        if (transcribing) return "Preparando tu transcripción…";
        if (micMuted) return "Micrófono en silencio";
        if (mode === "TEXT") return "Escribe tu respuesta";
        if (reviewing) return "Revisa tu respuesta antes de enviarla";
        return "Escuchando…";
    }
  })();

  return {
    state,
    orbState,
    analyser: voice.analyser,
    statusLabel,
    mode,
    voiceAvailable: voice.available,
    turn,
    asked,
    budget,
    draft,
    setDraft,
    reviewing,
    transcribing,
    micMuted,
    elapsedMs,
    error,
    canSubmit: draft.trim().length > 0 && (state === "listening" || state === "paused"),
    submit,
    finishAnswer,
    repeatQuestion,
    pause,
    resume,
    toggleMic,
    setMode: changeMode,
    retry,
  };
}
