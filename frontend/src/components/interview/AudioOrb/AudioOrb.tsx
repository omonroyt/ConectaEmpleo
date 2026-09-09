"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { OrbRenderer, type OrbRendererOptions } from "./OrbRenderer";
import type { OrbState } from "./orbStates";
import "./AudioOrb.css";
export interface AudioOrbProps extends OrbRendererOptions {
  state: OrbState;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
}
export function AudioOrb({
  state = "idle",
  analyser,
  intensity = 0.8,
  quality = "medium",
  size = "100%",
  className = "",
  style,
  onLevels,
  onError,
}: AudioOrbProps) {
  const host = useRef<HTMLDivElement>(null);
  const renderer = useRef<OrbRenderer | null>(null);
  const latest = useRef({ state, analyser, intensity, onLevels, onError });
  latest.current = { state, analyser, intensity, onLevels, onError };
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
    const report = (error: Error) => {
      setFailed(true);
      latest.current.onError?.(error);
    };
    try {
      renderer.current = new OrbRenderer(host.current!, {
        ...latest.current,
        quality,
        onError: report,
        onLevels: (l) => latest.current.onLevels?.(l),
      });
    } catch (error) {
      report(error instanceof Error ? error : new Error(String(error)));
    }
    return () => {
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, [quality]);
  useEffect(() => {
    renderer.current?.update({ state, analyser, intensity });
  }, [state, analyser, intensity]);
  return (
    <div
      className={`audio-orb ${className}`}
      style={{ width: size, ...style }}
      role="img"
      aria-label={`Asistente de voz: ${state}`}
      data-state={state}
      data-fallback={failed || undefined}
    >
      <div
        className="audio-orb__canvas"
        ref={host}
        style={failed ? { visibility: "hidden" } : undefined}
      />
      {failed && (
        <div className="audio-orb__fallback" aria-hidden="true">
          <i />
          <b />
        </div>
      )}
    </div>
  );
}
