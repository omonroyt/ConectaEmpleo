import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserVoiceGateway, type VoiceGateway } from "@/voice";

/**
 * Error de voz recuperable: la UI debe caer a modo texto **sin perder el turno**
 * (permiso de micrófono denegado, `speak` que rechaza o TTS que no reproduce).
 */
export class VoiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoiceUnavailableError";
  }
}

export interface InterviewVoice {
  /** false → la UI ofrece solo texto. */
  available: boolean;
  /** Analyser vivo para el Orb: micrófono en `listening`, TTS en `speaking` si existe. */
  analyser: AnalyserNode | null;
  /** Reproduce la pregunta y resuelve al terminar. Rechaza con `VoiceUnavailableError`. */
  speak(text: string): Promise<void>;
  cancelSpeech(): void;
  /** Abre micrófono + STT. Rechaza con `VoiceUnavailableError` si no hay permiso. */
  startListening(): Promise<void>;
  /** Cierra micrófono + STT y devuelve la transcripción ("" si no hubo STT). */
  stopListening(): Promise<string>;
  isListening(): boolean;
}

/** Umbral por debajo del cual asumimos que el TTS no reprodujo nada. */
const SPEAK_MIN_MS = 400;
/** Margen extra sobre la duración estimada, por si `onend` nunca dispara. */
const SPEAK_WATCHDOG_MS = 8000;

function estimateSpeechMs(text: string): number {
  return Math.max(3500, text.length * 85);
}

function isVoiceSupported(): boolean {
  if (typeof window === "undefined") return false;
  const hasTts = "speechSynthesis" in window;
  const hasMic = typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia != null;
  return hasTts && hasMic;
}

/**
 * Ciclo de vida del audio de la entrevista sobre `VoiceGateway` (02 §6).
 *
 * - Una única instancia de gateway y un único `AudioContext` compartido para
 *   toda la sesión (no se recrea por turno; `BrowserVoiceGateway` lo reutiliza
 *   y no lo cierra).
 * - Al desmontar: cancela TTS, cierra STT, detiene las pistas del micrófono
 *   (`gateway.dispose()`) y cierra el `AudioContext`.
 *
 * La fase backend puede sustituir `BrowserVoiceGateway` por `ServerVoiceGateway`
 * (misma interfaz, WebSocket) sin tocar la máquina de estados ni las pantallas.
 */
export function useInterviewVoice(): InterviewVoice {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [available] = useState<boolean>(() => isVoiceSupported());

  const contextRef = useRef<AudioContext | null>(null);
  const gatewayRef = useRef<VoiceGateway | null>(null);
  const speakHandleRef = useRef<{ cancel(): void } | null>(null);
  const cancelledRef = useRef(false);
  const listeningRef = useRef(false);
  const disposedRef = useRef(false);

  const getGateway = useCallback((): VoiceGateway => {
    if (!gatewayRef.current) {
      if (!contextRef.current) contextRef.current = new AudioContext();
      gatewayRef.current = new BrowserVoiceGateway({ audioContext: contextRef.current });
    }
    return gatewayRef.current;
  }, []);

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!available || disposedRef.current) {
        throw new VoiceUnavailableError("La síntesis de voz no está disponible en este navegador.");
      }
      const gateway = getGateway();
      cancelledRef.current = false;
      const startedAt = performance.now();

      let handle: Awaited<ReturnType<VoiceGateway["speak"]>>;
      try {
        handle = await gateway.speak(text);
      } catch (error) {
        throw new VoiceUnavailableError(
          error instanceof Error ? error.message : "No pudimos reproducir la pregunta.",
        );
      }

      speakHandleRef.current = handle;
      // Con `BrowserVoiceGateway` el analyser es null → el Orb usa su animación procedural.
      setAnalyser(handle.analyser);

      let watchdog = 0;
      const watchdogPromise = new Promise<void>((resolve) => {
        watchdog = window.setTimeout(resolve, estimateSpeechMs(text) + SPEAK_WATCHDOG_MS);
      });
      try {
        await Promise.race([handle.done, watchdogPromise]);
      } finally {
        window.clearTimeout(watchdog);
        if (speakHandleRef.current === handle) speakHandleRef.current = null;
        setAnalyser(null);
      }

      const elapsed = performance.now() - startedAt;
      if (!cancelledRef.current && text.length > 15 && elapsed < SPEAK_MIN_MS) {
        // El motor de voz resolvió de inmediato: no hubo audio real.
        throw new VoiceUnavailableError("El navegador no reprodujo la pregunta en voz alta.");
      }
    },
    [available, getGateway],
  );

  const cancelSpeech = useCallback(() => {
    cancelledRef.current = true;
    speakHandleRef.current?.cancel();
    speakHandleRef.current = null;
    setAnalyser(null);
  }, []);

  const startListening = useCallback(async (): Promise<void> => {
    if (!available || disposedRef.current) {
      throw new VoiceUnavailableError("El micrófono no está disponible en este navegador.");
    }
    const gateway = getGateway();
    let connection: Awaited<ReturnType<VoiceGateway["startListening"]>>;
    try {
      connection = await gateway.startListening();
    } catch (error) {
      throw new VoiceUnavailableError(
        error instanceof Error ? error.message : "No pudimos acceder al micrófono.",
      );
    }
    listeningRef.current = true;
    const context = contextRef.current;
    if (context && context.state === "suspended") {
      try {
        await context.resume();
      } catch {
        // Sin activación del usuario todavía: el Orb cae a animación procedural.
      }
    }
    if (disposedRef.current) return;
    setAnalyser(connection.analyser);
  }, [available, getGateway]);

  const stopListening = useCallback(async (): Promise<string> => {
    const gateway = gatewayRef.current;
    if (!gateway || !listeningRef.current) return "";
    listeningRef.current = false;
    setAnalyser(null);
    try {
      const { transcript } = await gateway.stopListening();
      return transcript;
    } catch {
      return "";
    }
  }, []);

  const isListening = useCallback(() => listeningRef.current, []);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      cancelledRef.current = true;
      speakHandleRef.current?.cancel();
      speakHandleRef.current = null;
      listeningRef.current = false;
      const gateway = gatewayRef.current;
      const context = contextRef.current;
      gatewayRef.current = null;
      contextRef.current = null;
      void (async () => {
        // `dispose` cancela el TTS, detiene el reconocimiento y libera las pistas
        // del micrófono; el AudioContext compartido lo cerramos aquí.
        if (gateway) await gateway.dispose();
        if (context && context.state !== "closed") await context.close();
      })();
    };
  }, []);

  return { available, analyser, speak, cancelSpeech, startListening, stopListening, isListening };
}
