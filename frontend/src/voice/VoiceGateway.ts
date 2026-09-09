/**
 * Puerta de enlace de voz (02 §6). `BrowserVoiceGateway` la implementa con las
 * Web Speech APIs del navegador; `ServerVoiceGateway` (fase backend) la
 * implementará sobre el WebSocket `/interviews/{id}/voice` con la misma forma.
 */
export interface VoiceGateway {
  /** false → la UI debe ofrecer solo texto (sin síntesis ni reconocimiento de voz). */
  readonly available: boolean;
  speak(text: string): Promise<{ analyser: AnalyserNode | null; done: Promise<void>; cancel(): void }>;
  startListening(): Promise<{ stream: MediaStream; analyser: AnalyserNode }>;
  /** transcript "" si no hubo STT disponible o no se detectó habla. */
  stopListening(): Promise<{ transcript: string }>;
  dispose(): Promise<void>;
}
