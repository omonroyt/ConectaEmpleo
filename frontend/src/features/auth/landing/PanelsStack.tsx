import { motion, type Variants } from "motion/react";
import { useReducedMotion } from "@/lib/a11y";
import { durations, easings } from "@/lib/motion";
import { ComparePanel } from "@/features/auth/landing/panels/ComparePanel";
import { ProfilePanel } from "@/features/auth/landing/panels/ProfilePanel";
import { TalentPanel } from "@/features/auth/landing/panels/TalentPanel";
import { VerticalText } from "@/features/auth/landing/VerticalText";

/**
 * Composición de los tres paneles del hero — 07_LANDING_HERO.md §5 y §8.
 * Tres presentaciones según ancho:
 *  - <768: solo el panel de perfil, sin rotación, a escala reducida.
 *  - 768-1023 (md): perfil + ranking apilados verticalmente.
 *  - ≥1024 (lg): composición escalonada completa (los tres paneles),
 *    más angosta en 1024-1279 y a tamaño completo con texto vertical ≥1280 (xl).
 *
 * El panel de comparación se **superpone** al de perfil por su esquina inferior
 * derecha (donde no hay contenido, porque la última fila de habilidades es un
 * chip corto alineado a la izquierda). Apilarlo debajo sumaba su alto completo
 * y empujaba el hero fuera del viewport, obligando a hacer scroll para ver algo
 * que no aporta información nueva.
 */

/**
 * Entrada de los paneles: **la misma cadencia y la misma velocidad que el
 * texto**, para que el hero se lea como una sola cascada continua.
 *
 * Una versión previa los hacía entrar más lento (0.85 s) y con `delayChildren`
 * de 0.42 s encima del turno que ya les tocaba en la secuencia del hero. Medido
 * en el navegador, eso abría un hueco de ~790 ms entre el último bloque de
 * texto y el primer panel: la composición se sentía desenganchada del texto.
 *
 * Ahora la duración es `durations.slow` y el escalonado 0.12 s, exactamente los
 * de `fadeUp` y `pageSequence`, sin retraso extra. Se conserva un `scale` muy
 * leve para dar profundidad, y se sigue evitando el `blur` de `fadeUp`: en
 * cajas grandes con sombra proyectada es caro y produce saltos.
 */
const panelEntrance: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: durations.slow, ease: easings.outSmooth },
  },
};

const panelsContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0 },
  },
};

const reducedEntrance: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
};

const reducedContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0, delayChildren: 0 } },
};

export function PanelsStack() {
  const reduced = useReducedMotion();
  const container = reduced ? reducedContainer : panelsContainer;
  const panelVariant = reduced ? reducedEntrance : panelEntrance;

  return (
    <div className="relative w-full lg:w-[58%]">
      {/* En pantallas de poca altura (portátiles de 768–860 px) la composición
          no cabe y obliga a hacer scroll para ver un panel que no aporta
          información nueva. Se reduce la escala desde el borde superior, sin
          tocar el ancho ni recortar contenido. */}
      <style>{`
        /* \`zoom\` y no \`transform: scale\`: el transform no reduce el espacio
           que el elemento ocupa en el flujo, así que la página seguía igual de
           alta y el scroll no desaparecía. */
        @media (min-width: 1024px) and (max-height: 800px) {
          .hero-panels { zoom: .82; }
        }
        @media (min-width: 1024px) and (min-height: 801px) and (max-height: 880px) {
          .hero-panels { zoom: .92; }
        }
      `}</style>

      {/* Desktop ≥1024: composición escalonada de los tres paneles */}
      <motion.div
        variants={container}
        className="hero-panels relative hidden lg:block lg:pr-8 xl:pr-16"
      >
        <div className="flex items-start gap-5 xl:gap-7">
          {/* Algo más ancho que el diseño inicial: a 240 px los tres filtros no
              cabían en una línea y "Operador de maquinaria" truncaba. */}
          <motion.div
            variants={panelVariant}
            className="mt-6 w-[196px] shrink-0 -rotate-1 xl:mt-10 xl:w-[250px]"
          >
            <TalentPanel />
          </motion.div>
          <motion.div variants={panelVariant} className="w-[286px] shrink-0 xl:w-[356px]">
            <ProfilePanel />
          </motion.div>
        </div>
        {/* Solapa la esquina inferior derecha del panel de perfil, como en la
            referencia, en vez de apilarse debajo. El desplazamiento lateral
            grande es deliberado: entrando por la derecha cubre el aire del
            panel y no su contenido, y además sobresale del bloque, que es lo
            que da la sensación de capas. */}
        <motion.div
          variants={panelVariant}
          className="relative z-10 -mt-24 ml-[210px] w-[270px] rotate-1 xl:-mt-24 xl:ml-[290px] xl:w-[336px]"
        >
          <ComparePanel />
        </motion.div>

        <VerticalText className="absolute right-0 top-1/2 hidden -translate-y-1/2 xl:block" />
      </motion.div>

      {/* Móvil / tablet: solo perfil, y perfil+ranking apilados en tablet.
          Va **después** de la composición de escritorio en el DOM aunque en
          pantalla aparezca en su lugar (son excluyentes por CSS). El motivo es
          de ritmo: el escalonado del hero reparte turnos por orden de montaje y
          no sabe que un bloque está oculto, así que el que va primero se come
          un turno. Con este orden, en escritorio los paneles entran justo en el
          turno siguiente al último bloque de texto. */}
      <motion.div
        variants={container}
        className="mx-auto flex w-full max-w-sm flex-col items-stretch gap-6 md:max-w-md lg:hidden"
      >
        <motion.div variants={panelVariant}>
          <ProfilePanel />
        </motion.div>
        <motion.div variants={panelVariant} className="hidden md:block">
          <TalentPanel />
        </motion.div>
      </motion.div>
    </div>
  );
}
