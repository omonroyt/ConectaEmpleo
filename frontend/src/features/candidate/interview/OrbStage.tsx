import { useEffect, useState } from "react";
import { AudioOrb, type OrbState } from "@/components/interview/AudioOrb";
import { BrandBackground } from "@/components/brand/BrandBackground";
import { cn } from "@/lib/cn";

export interface OrbStageProps {
  state: OrbState;
  /** Micrófono en `listening`, TTS en `speaking` si existe; `undefined` en el resto. */
  analyser: AnalyserNode | null;
  /** Texto del estado, anunciado con `aria-live`. */
  label: string;
  className?: string;
}

/** Tamaño responsivo del Orb: mobile 260–320, tablet 300–380, desktop 360–460 (01 §9). */
function orbSizeFor(width: number): number {
  if (width < 640) return Math.max(260, Math.min(320, Math.round(width * 0.72)));
  if (width < 1024) return 340;
  return 400;
}

function detectQuality(): "low" | "medium" {
  if (typeof window === "undefined") return "medium";
  const cores = navigator.hardwareConcurrency ?? 8;
  return cores <= 4 || window.innerWidth < 768 ? "low" : "medium";
}

/**
 * Escenario del Orb: fondo `interview` con presencia accent (el Orb es el
 * protagonista), una única instancia de `AudioOrb` que nunca se remonta —solo
 * cambia `state`/`analyser`— y el label textual del estado con `aria-live`.
 */
export function OrbStage({ state, analyser, label, className }: OrbStageProps) {
  // La calidad se fija al montar: cambiarla recrea el renderer de three.
  const [quality] = useState<"low" | "medium">(detectQuality);
  const [size, setSize] = useState<number>(() =>
    orbSizeFor(typeof window === "undefined" ? 1280 : window.innerWidth),
  );

  useEffect(() => {
    const onResize = () => setSize(orbSizeFor(window.innerWidth));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-0 h-[420px] -translate-y-1/2 overflow-hidden rounded-[48px] opacity-60 saturate-[.7]"
        aria-hidden="true"
      >
        <BrandBackground asset="interview" presence="accent" overlay="full" position="center" />
      </div>

      <div className="relative z-10 flex items-center justify-center" style={{ height: size }}>
        <AudioOrb
          state={state}
          analyser={analyser ?? undefined}
          quality={quality}
          size={size}
          intensity={0.85}
        />
      </div>

      <p
        className="relative z-10 mt-4 min-h-6 text-center text-sm font-medium text-text-on-dark-secondary sm:text-base"
        aria-live="polite"
      >
        {label}
      </p>
    </div>
  );
}
