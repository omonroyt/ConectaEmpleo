import { BrowserVoiceGateway } from "./BrowserVoiceGateway";
import { ServerVoiceGateway, type VoicePersona } from "./ServerVoiceGateway";
import type { VoiceGateway } from "./VoiceGateway";

export interface CreateVoiceGatewayOptions {
  persona: VoicePersona;
  audioContext?: AudioContext;
}

/**
 * Selección de gateway de docs/build/00_BUILD_STATE.md D-08 / tarea B12
 * sección D: con `VITE_API_MODE=http` **y** voz disponible en el backend
 * (`GET /voice/quota`), usa `ServerVoiceGateway`; si no, cae a
 * `BrowserVoiceGateway` (Web Speech APIs), igual que hoy.
 *
 * Es async porque comprobar disponibilidad real requiere una llamada de red
 * — `VoiceGateway.available` es una propiedad síncrona, así que la decisión
 * tiene que tomarse *antes* de construir el gateway, no dentro de él.
 *
 * No la llama nada todavía: `useInterviewVoice`
 * (`frontend/src/features/candidate/interview/`) construye
 * `BrowserVoiceGateway` directamente y queda fuera del alcance de B12 (la
 * tarea es explícita: "la pantalla de entrevista no debe cambiar"). Esta
 * función es el punto de enganche listo para cuando se conecte: sustituir
 * `new BrowserVoiceGateway({ audioContext })` por
 * `await createVoiceGateway({ persona, audioContext })` en `getGateway()`.
 */
export async function createVoiceGateway(options: CreateVoiceGatewayOptions): Promise<VoiceGateway> {
  const apiMode = import.meta.env.VITE_API_MODE;
  if (apiMode === "http") {
    const voiceAvailable = await ServerVoiceGateway.checkAvailable();
    if (voiceAvailable) {
      return new ServerVoiceGateway({
        persona: options.persona,
        audioContext: options.audioContext,
        available: true,
      });
    }
  }
  return new BrowserVoiceGateway(options.audioContext ? { audioContext: options.audioContext } : {});
}
