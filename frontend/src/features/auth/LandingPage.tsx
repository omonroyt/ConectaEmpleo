import { motion } from "motion/react";
import { useMotionSafe } from "@/lib/motion";
import { HeroBackground } from "@/features/auth/landing/HeroBackground";
import { HeroLeft } from "@/features/auth/landing/HeroLeft";
import { LandingTopBar } from "@/features/auth/landing/LandingTopBar";
import { PanelsStack } from "@/features/auth/landing/PanelsStack";

/**
 * C0 — Landing `/`. Hero rediseñado a partir de la referencia visual del
 * cliente (docs/build/07_LANDING_HERO.md): composición dividida sobre fondo
 * oscuro con haces de luz, tres paneles de interfaz construidos en código a
 * la derecha, y barra superior con navegación y tres acciones.
 */
export function Component() {
  const { pageSequence } = useMotionSafe();

  return (
    <div id="inicio" className="relative min-h-dvh overflow-x-clip bg-bg-dark">
      <HeroBackground />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <LandingTopBar />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={pageSequence}
          className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-14 px-6 py-10 sm:px-8 sm:py-14 lg:flex-row lg:items-center lg:gap-8 lg:px-10 lg:py-12"
        >
          <HeroLeft />
          <PanelsStack />
        </motion.div>
      </div>
    </div>
  );
}
