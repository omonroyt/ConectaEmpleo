import { connectAudio, type AudioConnection } from "@/components/interview/AudioOrb";
import { useSessionStore } from "@/store/session";
import type { VoiceGateway } from "./VoiceGateway";

export type VoicePersona = "profiler" | "interviewer";

/**
 * Implementación de `VoiceGateway` (02 §6) contra el backend de B12
 * (`POST /voice/tts` streaming, `POST /voice/stt`, `POST` multipart). Misma
 * forma exacta que `BrowserVoiceGateway`: la pantalla de entrevista no
 * necesita saber cuál de las dos está usando.
 *
 * Diferencias de transporte respecto al navegador, todas internas a esta
 * clase:
 * - `speak`: el backend siempre streamea audio/mpeg o responde un JSON
 *   `{mode:"text", message}` cuando la cuota se agotó o ElevenLabs falló tras
 *   sus reintentos (§5.5). Este gateway distingue por `Content-Type` y, en el
 *   segundo caso, **rechaza** la promesa — igual que hace
 *   `BrowserVoiceGateway` cuando `speechSynthesis` no reprodujo nada — para
 *   que `useInterviewVoice` (que ya sabe caer a texto ante cualquier
 *   `speak()` rechazado) trate ambos gateways de forma idéntica.
 * - `startListening`/`stopListening`: graba con `MediaRecorder` y sube el
 *   blob a `/voice/stt`; nunca lanza en `stopListening` (transcript ""
 *   equivale a "no hubo STT", igual que en `BrowserVoiceGateway`).
 */
export interface ServerVoiceGatewayOptions {
  /** "profiler" (Sofía) o "interviewer" (Daniel), docs/05 §0.1. */
  persona: VoicePersona;
  /**
   * Mismo `AudioContext` compartido que el resto de la sesión (ver
   * `BrowserVoiceGatewayOptions`): evita crear/destruir uno por turno.
   */
  audioContext?: AudioContext;
  /** Por defecto `VITE_API_URL` (mismo base que `src/api/http/client.ts`). */
  baseUrl?: string;
  /**
   * Resultado de un chequeo previo de `GET /voice/quota` (responsabilidad de
   * quien construye el gateway, no de esta clase — ver `docs/build`
   * D-08/sección D de la tarea B12: "con VITE_API_MODE=http y voz disponible
   * usa el del servidor"). Por defecto `true`: si nadie lo revisó antes,
   * `speak()`/`startListening()` igual fallan de forma segura (rechazan) en
   * cuanto el backend responda que no hay voz.
   */
  available?: boolean;
}

const DEFAULT_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000/api/v1";

function authHeaders(): HeadersInit {
  const token = useSessionStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export class ServerVoiceGateway implements VoiceGateway {
  readonly available: boolean;

  private readonly persona: VoicePersona;
  private readonly baseUrl: string;
  private readonly options: { audioContext?: AudioContext };

  private audioEl: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private speakAudioConnection: AudioConnection | null = null;

  private mediaStream: MediaStream | null = null;
  private listenAudioConnection: AudioConnection | null = null;
  private recorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  constructor(options: ServerVoiceGatewayOptions) {
    this.persona = options.persona;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.available = options.available ?? true;
    this.options = { audioContext: options.audioContext };
  }

  /**
   * Consulta `GET /voice/quota` (helper estático para la selección de
   * gateway de docs/build D-08 — no la llama esta clase por sí sola).
   */
  static async checkAvailable(baseUrl: string = DEFAULT_BASE_URL): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/voice/quota`, { headers: { ...authHeaders() } });
      if (!response.ok) return false;
      const body = (await response.json()) as { voice_available?: boolean };
      return body.voice_available === true;
    } catch {
      return false;
    }
  }

  async speak(text: string): Promise<{ analyser: AnalyserNode | null; done: Promise<void>; cancel(): void }> {
    if (!this.available) {
      throw new Error("La voz del servidor no está disponible en esta sesión.");
    }

    const response = await fetch(`${this.baseUrl}/voice/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ text, persona: this.persona }),
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("audio")) {
      const message = await this.extractTextModeMessage(response);
      throw new Error(message);
    }

    const blob = await response.blob();
    this.revokeCurrentObjectUrl();
    const url = URL.createObjectURL(blob);
    this.currentObjectUrl = url;

    const audioEl = this.getAudioElement();
    audioEl.src = url;

    const connection = await connectAudio(
      audioEl,
      this.options.audioContext ? { context: this.options.audioContext } : {},
    );
    this.speakAudioConnection = connection;
    await connection.resume();

    let resolveDone!: () => void;
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolveDone();
    };
    audioEl.onended = finish;
    audioEl.onerror = finish;

    try {
      await audioEl.play();
    } catch (error) {
      finish();
      throw error instanceof Error ? error : new Error("No se pudo reproducir el audio de la pregunta.");
    }

    return {
      analyser: connection.analyser,
      done,
      cancel: () => {
        audioEl.pause();
        finish();
      },
    };
  }

  async startListening(): Promise<{ stream: MediaStream; analyser: AnalyserNode }> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaStream = stream;
    this.listenAudioConnection = await connectAudio(
      stream,
      this.options.audioContext ? { context: this.options.audioContext } : {},
    );

    this.recordedChunks = [];
    const mimeType = pickRecorderMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.recordedChunks.push(event.data);
    };
    this.recorder = recorder;
    recorder.start();

    return { stream, analyser: this.listenAudioConnection.analyser };
  }

  async stopListening(): Promise<{ transcript: string }> {
    const recorder = this.recorder;
    this.recorder = null;

    let blob: Blob | null = null;
    if (recorder && recorder.state !== "inactive") {
      blob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(this.recordedChunks, { type: recorder.mimeType || "audio/webm" }));
        recorder.stop();
      });
    }
    this.recordedChunks = [];

    if (this.listenAudioConnection) {
      await this.listenAudioConnection.dispose();
      this.listenAudioConnection = null;
    }
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) track.stop();
      this.mediaStream = null;
    }

    if (!blob || blob.size === 0) return { transcript: "" };

    try {
      const form = new FormData();
      form.append("file", blob, "answer.webm");
      const response = await fetch(`${this.baseUrl}/voice/stt`, {
        method: "POST",
        headers: { ...authHeaders() },
        body: form,
      });
      if (!response.ok) return { transcript: "" };
      const body = (await response.json()) as { status: string; transcript: string };
      return { transcript: body.status === "OK" ? body.transcript : "" };
    } catch {
      // Sin red o el backend no respondió: igual que "no hubo STT disponible"
      // en BrowserVoiceGateway — la UI cae al campo de texto.
      return { transcript: "" };
    }
  }

  async dispose(): Promise<void> {
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.onended = null;
      this.audioEl.onerror = null;
      this.audioEl.removeAttribute("src");
    }
    this.revokeCurrentObjectUrl();
    if (this.speakAudioConnection) {
      await this.speakAudioConnection.dispose();
      this.speakAudioConnection = null;
    }
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.stop();
    }
    this.recorder = null;
    this.recordedChunks = [];
    if (this.listenAudioConnection) {
      await this.listenAudioConnection.dispose();
      this.listenAudioConnection = null;
    }
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) track.stop();
      this.mediaStream = null;
    }
  }

  private getAudioElement(): HTMLAudioElement {
    if (!this.audioEl) {
      this.audioEl = new Audio();
      this.audioEl.preload = "auto";
    }
    return this.audioEl;
  }

  private revokeCurrentObjectUrl(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }

  private async extractTextModeMessage(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as { message?: string };
      return body.message ?? "No pudimos usar el audio en este momento; puedes continuar escribiendo.";
    } catch {
      return "No pudimos usar el audio en este momento; puedes continuar escribiendo.";
    }
  }
}
