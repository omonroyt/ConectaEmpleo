import { connectAudio, type AudioConnection } from "@/components/interview/AudioOrb";
import type { VoiceGateway } from "./VoiceGateway";

// Las Web Speech APIs de reconocimiento son no estándar (prefijo webkit en Chrome)
// y no están en el lib.dom.d.ts de TypeScript: se declaran los tipos mínimos aquí.
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor; SpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function pickSpanishVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase() === "es-mx") ??
    voices.find((v) => v.lang.toLowerCase().startsWith("es")) ??
    null
  );
}

/**
 * Implementación de VoiceGateway con las APIs del navegador (fase frontend, modo mock).
 * TTS: speechSynthesis en es-MX. STT: webkitSpeechRecognition si existe (si no, transcript "").
 * Micrófono: getUserMedia + connectAudio() del Orb para alimentar el analyser visual.
 */
export interface BrowserVoiceGatewayOptions {
  /**
   * `AudioContext` compartido para el análisis del micrófono. Si se pasa, el
   * gateway lo reutiliza en cada `startListening` y **no** lo cierra (lo cierra
   * quien lo creó): evita crear y destruir un contexto por turno de entrevista.
   * Si se omite, `connectAudio` crea uno propio por sesión de escucha.
   */
  audioContext?: AudioContext;
}

export class BrowserVoiceGateway implements VoiceGateway {
  readonly available: boolean = typeof speechSynthesis !== "undefined";

  private readonly options: BrowserVoiceGatewayOptions;

  constructor(options: BrowserVoiceGatewayOptions = {}) {
    this.options = options;
  }

  private recognition: SpeechRecognitionLike | null = null;
  private transcript = "";
  private mediaStream: MediaStream | null = null;
  private audioConnection: AudioConnection | null = null;

  async speak(text: string): Promise<{ analyser: AnalyserNode | null; done: Promise<void>; cancel(): void }> {
    if (!this.available) {
      return { analyser: null, done: Promise.resolve(), cancel: () => {} };
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-MX";
    utterance.rate = 0.95;
    const voice = pickSpanishVoice();
    if (voice) utterance.voice = voice;

    let resolveDone!: () => void;
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });
    utterance.onend = () => resolveDone();
    utterance.onerror = () => resolveDone();
    speechSynthesis.speak(utterance);

    return {
      analyser: null, // sin captura de audio de salida: el Orb usa animación procedural en "speaking"
      done,
      cancel: () => speechSynthesis.cancel(),
    };
  }

  async startListening(): Promise<{ stream: MediaStream; analyser: AnalyserNode }> {
    this.transcript = "";
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaStream = stream;
    this.audioConnection = await connectAudio(
      stream,
      this.options.audioContext ? { context: this.options.audioContext } : {},
    );

    const RecognitionCtor = getRecognitionCtor();
    if (RecognitionCtor) {
      const recognition = new RecognitionCtor();
      recognition.lang = "es-MX";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (event) => {
        let combined = "";
        for (let i = 0; i < event.results.length; i++) {
          combined += event.results[i]?.[0]?.transcript ?? "";
        }
        this.transcript = combined.trim();
      };
      recognition.onerror = () => {
        // Sin STT disponible o permiso denegado: la UI cae a la respuesta por texto.
      };
      this.recognition = recognition;
      recognition.start();
    }

    return { stream, analyser: this.audioConnection.analyser };
  }

  async stopListening(): Promise<{ transcript: string }> {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    if (this.audioConnection) {
      await this.audioConnection.dispose();
      this.audioConnection = null;
    }
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) track.stop();
      this.mediaStream = null;
    }
    const transcript = this.transcript;
    this.transcript = "";
    return { transcript };
  }

  async dispose(): Promise<void> {
    speechSynthesis.cancel();
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    if (this.audioConnection) {
      await this.audioConnection.dispose();
      this.audioConnection = null;
    }
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) track.stop();
      this.mediaStream = null;
    }
  }
}
