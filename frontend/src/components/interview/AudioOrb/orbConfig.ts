export type OrbQuality = "low" | "medium" | "high";
export const orbConfig = {
  low: { dpr: 1, segments: 32, ribbons: 2, ribbonSegments: 80, fps: 30 },
  medium: { dpr: 1.5, segments: 64, ribbons: 3, ribbonSegments: 128, fps: 60 },
  high: { dpr: 2, segments: 96, ribbons: 4, ribbonSegments: 192, fps: 60 },
} as const;
export const clamp = (v: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
