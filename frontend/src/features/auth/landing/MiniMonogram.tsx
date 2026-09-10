import { cn } from "@/lib/cn";

export interface MiniMonogramProps {
  /** Dos letras del monograma anónimo (ej. "MT"). */
  initials: string;
  /** Semilla para variar el tono (ej. el código anónimo del candidato). */
  seed: string;
  size?: number;
  className?: string;
}

/** Tonos de la paleta de marca, coherentes con `components/ui/Avatar`. */
const TONES = [
  "bg-primary/15 text-primary",
  "bg-accent/20 text-accent",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Monograma anónimo de dos letras para los paneles de la landing. El primer
 * filtro del producto nunca muestra nombre ni foto (ver 07_LANDING_HERO §5.1);
 * este componente es una variante compacta de `Avatar` que sí expone las
 * iniciales (en vez de solo "?"), pensada únicamente para las filas densas de
 * los paneles de ranking/comparación.
 */
export function MiniMonogram({ initials, seed, size = 36, className }: MiniMonogramProps) {
  const tone = TONES[hashSeed(seed) % TONES.length];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        tone,
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.34) }}
    >
      {initials}
    </span>
  );
}
