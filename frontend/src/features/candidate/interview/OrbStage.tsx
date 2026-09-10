import { useEffect, useRef, useState } from "react";
import { AudioOrb, type OrbState } from "@/components/interview/AudioOrb";
import { cn } from "@/lib/cn";

export interface OrbStageProps {
  state: OrbState;
  /** Micrófono en `listening`, TTS en `speaking` si existe; `undefined` en el resto. */
  analyser: AnalyserNode | null;
  className?: string;
}

/**
 * Proporción del lado de la caja del `AudioOrb` que ocupa la esfera visible.
 * El renderer deja un anillo transparente de ~18.75% por lado (ver
 * `AudioOrb.css`), así que una caja de 300px se ve como una bola de ~190px.
 * Todo el cálculo de tamaño trabaja sobre la **esfera**, no sobre la caja.
 */
const SPHERE_RATIO = 0.625;

/**
 * Cuánto puede desbordar la esfera el área libre: solo los huecos vacíos que
 * la rodean —el aire bajo la pregunta y el padding superior de la barra de
 * vidrio, que va en `z-10` y por tanto pasa por delante—. Nunca invade texto.
 */
const OVERFLOW_TOP = 8;
const OVERFLOW_BOTTOM = 18;

function detectQuality(): "low" | "medium" {
  if (typeof window === "undefined") return "medium";
  const cores = navigator.hardwareConcurrency ?? 8;
  return cores <= 4 || window.innerWidth < 768 ? "low" : "medium";
}

/**
 * Escenario del Orb. Sin caja, sin borde y sin recorte: el Orb es el
 * protagonista de la pantalla y se apoya directo sobre el lienzo, con un halo
 * elíptico que se derrama hacia los lados para que el espacio lateral no se
 * lea como vacío muerto.
 *
 * El tamaño sale del área libre **medida**, no de constantes de chrome: este
 * nodo ocupa el espacio que sobra entre la pregunta y el compositor
 * (`flex-1`), y el Orb va posicionado en absoluto dentro de él. Al no aportar
 * altura al flujo, crecer no puede realimentar la medición.
 *
 * Una única instancia de `AudioOrb` que nunca se remonta: solo cambian
 * `state`/`analyser`.
 */
export function OrbStage({ state, analyser, className }: OrbStageProps) {
  // La calidad se fija al montar: cambiarla recrea el renderer de three.
  const [quality] = useState<"low" | "medium">(detectQuality);
  const areaRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(360);
  const [top, setTop] = useState(0);
  const [halo, setHalo] = useState(520);

  useEffect(() => {
    const node = areaRef.current;
    if (!node) return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width === 0) return;
      // La caja nunca excede el ancho de la columna, así que el Orb no puede
      // provocar scroll horizontal por muy alto que sea el hueco.
      const sphere = Math.max(
        150,
        Math.min(rect.height + OVERFLOW_TOP + OVERFLOW_BOTTOM, rect.width * SPHERE_RATIO),
      );
      const box = Math.round(sphere / SPHERE_RATIO);
      // La esfera arranca `OVERFLOW_TOP` por encima del área; la caja añade su
      // anillo transparente por fuera.
      setSize(box);
      setTop(Math.round(-OVERFLOW_TOP - (box - sphere) / 2));
      // El halo sí puede pasarse del ancho de la columna (vive en el margen de
      // la página), pero nunca del viewport.
      setHalo(Math.max(box, Math.min(Math.round(box * 1.55), window.innerWidth - 56)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div ref={areaRef} className={cn("relative w-full", className)}>
      {/* Halo elíptico: llena el espacio lateral y funde el Orb con el lienzo.
          El desenfoque se derrama fuera de la caja sin ensancharla (ink
          overflow), así que no aparece scroll horizontal a 390px. */}
      <span
        aria-hidden="true"
        className="data-glow pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full blur-[90px]"
        style={{
          width: halo,
          height: Math.round(halo * 0.62),
          top: Math.round(top + size / 2 - (halo * 0.62) / 2),
          background:
            "radial-gradient(ellipse, rgba(74,69,255,.40) 0%, rgba(146,113,255,.18) 45%, transparent 72%)",
        }}
      />

      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2"
        style={{ width: size, height: size, top }}
      >
        <AudioOrb
          state={state}
          analyser={analyser ?? undefined}
          quality={quality}
          size={size}
          intensity={0.85}
        />
      </div>
    </div>
  );
}
