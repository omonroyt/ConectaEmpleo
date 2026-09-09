export type OrbState = "idle" | "listening" | "thinking" | "speaking";
export const orbStates: Record<
  OrbState,
  {
    speed: number;
    amplitude: number;
    glow: number;
    cyan: number;
    audio: number;
  }
> = {
  idle: { speed: 0.24, amplitude: 0.22, glow: 0.64, cyan: 0.25, audio: 0 },
  listening: { speed: 0.42, amplitude: 0.3, glow: 0.8, cyan: 0.85, audio: 1 },
  thinking: { speed: 0.62, amplitude: 0.27, glow: 0.6, cyan: 0.15, audio: 0 },
  speaking: { speed: 0.48, amplitude: 0.42, glow: 0.95, cyan: 0.38, audio: 1 },
};
