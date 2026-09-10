import { motion } from "motion/react";
import { useMotionSafe } from "@/lib/motion";
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
 * Los tres entran juntos (fade + translateY + scale) como una sola
 * composición al cargar la página, nunca uno por uno.
 */
export function PanelsStack() {
  const { fadeUp, staggerContainer } = useMotionSafe();
  const panelVariant = fadeUp;

  return (
    <div className="relative w-full lg:w-[58%]">
      {/* Móvil / tablet: solo perfil, y perfil+ranking apilados en tablet */}
      <motion.div
        variants={staggerContainer(0.06, 0)}
        className="mx-auto flex w-full max-w-sm flex-col items-stretch gap-6 md:max-w-md lg:hidden"
      >
        <motion.div variants={panelVariant}>
          <ProfilePanel />
        </motion.div>
        <motion.div variants={panelVariant} className="hidden md:block">
          <TalentPanel />
        </motion.div>
      </motion.div>

      {/* Desktop ≥1024: composición escalonada de los tres paneles */}
      <motion.div
        variants={staggerContainer(0.06, 0)}
        className="relative hidden lg:block lg:pr-8 xl:pr-16"
      >
        <div className="flex items-start gap-5 xl:gap-7">
          {/* Algo más ancho que el diseño inicial: a 240 px los tres filtros no
              cabían en una línea y "Operador de maquinaria" truncaba. */}
          <motion.div variants={panelVariant} className="mt-10 w-[205px] shrink-0 -rotate-1 xl:w-[268px]">
            <TalentPanel />
          </motion.div>
          <motion.div variants={panelVariant} className="w-[300px] shrink-0 xl:w-[380px]">
            <ProfilePanel />
          </motion.div>
        </div>
        <motion.div
          variants={panelVariant}
          className="relative z-10 ml-[130px] mt-4 w-[300px] rotate-1 xl:ml-[170px] xl:mt-5 xl:w-[380px]"
        >
          <ComparePanel />
        </motion.div>

        <VerticalText className="absolute right-0 top-1/2 hidden -translate-y-1/2 xl:block" />
      </motion.div>
    </div>
  );
}
