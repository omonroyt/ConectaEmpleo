import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { Variants } from "motion/react";
import { useReducedMotion } from "@/lib/a11y";

/**
 * Primitivas de motion — Conecta Empleo (docs/build/01_FRONTEND_FOUNDATIONS.md §7).
 * Todas las variantes están pensadas para usarse con `motion/react`
 * (`<motion.div variants={fadeUp} initial="hidden" animate="visible" />`).
 * Los contenedores con stagger propagan el estado "visible" a los hijos
 * que también usan `variants` (comportamiento estándar de motion).
 */

/** Curvas de aceleración, coherentes con `--ease-*` en tokens.css. */
export const easings = {
  outSmooth: [0.16, 1, 0.3, 1],
  standard: [0.2, 0.8, 0.2, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

/** Duraciones en segundos (unidad nativa de motion), coherentes con `--duration-*`. */
export const durations = {
  fast: 0.16,
  normal: 0.32,
  slow: 0.56,
} as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: durations.slow, ease: easings.outSmooth },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: durations.normal, ease: easings.standard },
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 32 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: durations.normal, ease: easings.outSmooth },
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -32 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: durations.normal, ease: easings.outSmooth },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: durations.normal, ease: easings.outSmooth },
  },
};

/** Entrada de cards en listas/grillas (usar junto a `staggerContainer`). */
export const cardEntrance: Variants = {
  hidden: { opacity: 0, scale: 0.985, y: 18 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easings.outSmooth },
  },
};

/** Contenedor de stagger para listas de cards (50–90ms recomendado). */
export function staggerContainer(
  stagger = 0.06,
  delayChildren = 0.1,
): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}

/**
 * Contenedor para la secuencia de entrada de página completa
 * (fondo → header → eyebrow → H1 → sub → panel). Los hijos deben usar
 * `fadeUp` (u otra variante con hidden/visible) para heredar el estado.
 */
export const pageSequence: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

/**
 * Degrada las variantes anteriores a transiciones de solo-opacidad (.15s)
 * cuando el usuario tiene `prefers-reduced-motion: reduce`. Los contenedores
 * de stagger se degradan a stagger 0 para que todo aparezca junto.
 */
export function useMotionSafe(): {
  fadeUp: Variants;
  fadeIn: Variants;
  slideInRight: Variants;
  slideInLeft: Variants;
  scaleIn: Variants;
  cardEntrance: Variants;
  staggerContainer: (stagger?: number, delayChildren?: number) => Variants;
  pageSequence: Variants;
} {
  const reduced = useReducedMotion();

  if (!reduced) {
    return {
      fadeUp,
      fadeIn,
      slideInRight,
      slideInLeft,
      scaleIn,
      cardEntrance,
      staggerContainer,
      pageSequence,
    };
  }

  const instant: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.15, ease: "linear" } },
  };
  const instantContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0, delayChildren: 0 } },
  };

  return {
    fadeUp: instant,
    fadeIn: instant,
    slideInRight: instant,
    slideInLeft: instant,
    scaleIn: instant,
    cardEntrance: instant,
    staggerContainer: () => instantContainer,
    pageSequence: instantContainer,
  };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Duración por defecto de las animaciones de datos (anillos, barras,
 * contadores). Coincide con `--duration-data` en tokens.css: el diseño pide
 * que un dato tarde ~2s en llenarse para que se lea como una carga real. */
export const DATA_DURATION_MS = 1800;

/**
 * Cuenta de 0 (o del valor previo) hasta `value` con rAF y ease-out.
 * Si `enabled` es false o el usuario prefiere menos movimiento, devuelve
 * el valor final de inmediato (sin animar).
 */
export function useCountUp(
  value: number,
  durationMs = DATA_DURATION_MS,
  enabled = true,
  delayMs = 0,
): number {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced || !enabled ? value : 0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduced || !enabled) {
      setDisplay(value);
      return;
    }

    const from = fromRef.current;
    const delta = value - from;
    if (delta === 0) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    let timer = 0;

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / durationMs);
        const eased = easeOutCubic(progress);
        setDisplay(from + delta * eased);
        if (progress < 1) {
          frame = requestAnimationFrame(tick);
        } else {
          fromRef.current = value;
        }
      };
      frame = requestAnimationFrame(tick);
    };

    if (delayMs > 0) {
      timer = window.setTimeout(run, delayMs);
    } else {
      run();
    }

    return () => {
      cancelAnimationFrame(frame);
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs, enabled, delayMs, reduced]);

  return display;
}

export interface AnimatedNumberOptions {
  /** Duración de la cuenta en ms (default `DATA_DURATION_MS`, ~2s). */
  durationMs?: number;
  /** Retraso antes de arrancar, para escalonar varias barras de una lista. */
  delayMs?: number;
}

/**
 * Dato que se llena de 0 a `value` **cuando entra en pantalla**, no al montar.
 *
 * Devuelve el `ref` que hay que colgar del nodo raíz del gráfico y el valor
 * en curso. Es la primitiva que usan `ProgressRing`, `ProgressBar` y
 * cualquier contador de la app: así un gráfico que está más abajo en la
 * página anima cuando el usuario llega a él, en vez de haber terminado su
 * animación antes de ser visible.
 *
 * Con `prefers-reduced-motion` devuelve el valor final de inmediato.
 */
export function useAnimatedNumber<T extends Element = HTMLDivElement>(
  value: number,
  { durationMs = DATA_DURATION_MS, delayMs = 0 }: AnimatedNumberOptions = {},
): { ref: RefObject<T | null>; display: number } {
  const ref = useRef<T | null>(null);
  // `0px` en vez del margen negativo por defecto: un anillo debe animar en
  // cuanto asoma, no 80px después.
  const inView = useInViewOnce(ref, "0px");
  const display = useCountUp(value, durationMs, inView, delayMs);
  return { ref, display };
}

/**
 * Observa un elemento y devuelve `true` una sola vez que entra en viewport
 * (para reveals al hacer scroll que no deben repetirse).
 */
export function useInViewOnce(
  ref: RefObject<Element | null>,
  margin = "-80px",
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: margin },
    );

    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, margin]);

  return inView;
}

/**
 * Variantes del reveal escalonado de listas (`<Reveal>` / `<RevealGroup>` en
 * `components/ui/Reveal.tsx`). El hijo entra desplazado 18px y con un leve
 * blur, dentro de su contenedor — nunca "cayendo" desde el borde de la
 * pantalla.
 */
export const revealItem: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: durations.slow, ease: easings.outSmooth },
  },
};

export function revealGroup(stagger = 0.08, delayChildren = 0.05): Variants {
  return {
    hidden: {},
    visible: { transition: { staggerChildren: stagger, delayChildren } },
  };
}
