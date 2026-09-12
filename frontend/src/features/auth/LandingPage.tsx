import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { useReducedMotion } from "@/lib/a11y";
import { useMotionSafe } from "@/lib/motion";
import { HeroBackground } from "@/features/auth/landing/HeroBackground";
import { HeroLeft } from "@/features/auth/landing/HeroLeft";
import { HowItWorks } from "@/features/auth/landing/HowItWorks";
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
  const reduced = useReducedMotion();
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const howItWorksRef = useRef<HTMLElement>(null);

  // La sección no existe hasta que se pide: así la portada sigue cabiendo en
  // una pantalla sin barra de desplazamiento. Al montarla, se baja hasta ella.
  useEffect(() => {
    if (!showHowItWorks) return;
    howItWorksRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, [reduced, showHowItWorks]);

  const hideHowItWorks = () => {
    setShowHowItWorks(false);
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div id="inicio" className="relative overflow-x-clip bg-bg-dark">
      <HeroBackground />
      {/* La barra vive fuera de la columna del hero: `sticky` solo se sujeta
          dentro de su bloque contenedor, así que ahí dentro desaparecía al
          desplazarse a "Cómo funciona". El hero descuenta su alto (4rem) para
          que la portada siga midiendo exactamente una ventana. */}
      <LandingTopBar onHowItWorks={() => setShowHowItWorks(true)} />
      <div className="relative z-10 flex min-h-[calc(100dvh-4rem-1px)] flex-col">

        <motion.div
          initial="hidden"
          animate="visible"
          variants={pageSequence}
          className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-14 px-6 py-10 sm:px-8 sm:py-14 lg:flex-row lg:items-center lg:gap-8 lg:px-10 lg:py-5 xl:py-7"
        >
          <HeroLeft />
          <PanelsStack />
        </motion.div>

        {/* Pie mínimo: el hero manda, así que solo lo imprescindible y en el tono más bajo. */}
        <footer className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 pb-5 text-xs text-text-on-dark-secondary/75 sm:px-8 lg:px-10">
          <p>© {new Date().getFullYear()} Conecta Empleo</p>
          <Link
            to="/privacidad"
            className="rounded-sm underline-offset-4 transition-colors duration-fast ease-standard hover:text-text-on-dark hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-2"
          >
            Aviso de privacidad
          </Link>
        </footer>
      </div>

      {showHowItWorks && <HowItWorks ref={howItWorksRef} onHide={hideHowItWorks} />}
    </div>
  );
}
