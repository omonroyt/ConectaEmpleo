import { useCallback, useEffect, useRef, useState } from "react";
import { connectAudio, AudioAnalyzer, type AudioConnection } from "@/components/interview/AudioOrb";

export interface UseMicrophoneResult {
  /** Pide permiso y abre el micrófono. */
  request(): Promise<void>;
  /** Nivel de volumen 0–1, actualizado a ~12 fps mientras el micrófono está activo. */
  level: number;
  /** Cierra el micrófono y libera el AudioContext. */
  stop(): void;
  error: string | null;
}

const SAMPLE_INTERVAL_MS = 1000 / 12;

/** Hook de conveniencia sobre getUserMedia + AudioAnalyzer para medidores de nivel de voz. */
export function useMicrophone(): UseMicrophoneResult {
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<AudioConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const stop = useCallback(() => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (connectionRef.current) {
      void connectionRef.current.dispose();
      connectionRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    analyzerRef.current = null;
    setLevel(0);
  }, []);

  const request = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const connection = await connectAudio(stream);
      connectionRef.current = connection;
      analyzerRef.current = new AudioAnalyzer(connection.analyser);
      lastTickRef.current = performance.now();
      intervalRef.current = window.setInterval(() => {
        const now = performance.now();
        const dt = (now - lastTickRef.current) / 1000;
        lastTickRef.current = now;
        const levels = analyzerRef.current?.sample(dt);
        if (levels) setLevel(levels.volume);
      }, SAMPLE_INTERVAL_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo acceder al micrófono.");
    }
  }, []);

  useEffect(() => stop, [stop]);

  return { request, level, stop, error };
}
