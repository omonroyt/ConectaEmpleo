import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BrandBackground, type BrandAsset } from "@/components/brand/BrandBackground";
import { Logo } from "@/components/brand/Logo";
import { Eyebrow, Surface } from "@/components/ui";
import { useReducedMotion } from "@/lib/a11y";
import { cn } from "@/lib/cn";

export interface AuthLayoutProps {
  heroTitle: string;
  heroSubtitle?: string;
  /** Antetítulo sobre el título del hero. */
  heroEyebrow?: string;
  /**
   * Imagen de marca del hero. **No cambiarla según el rol elegido**: el hero
   * es constante en login y registro para que alternar entre Candidato y
   * Empresa no dispare un cambio de fondo a pantalla completa. Lo único que
   * cambia con el rol es el texto, que hace crossfade.
   */
  asset?: BrandAsset;
  children: ReactNode;
  className?: string;
}

/**
 * Auth sobre el lienzo oscuro: hero de marca a la izquierda y panel de
 * vidrio con el formulario a la derecha (apilado en mobile).
 *
 * El formulario ya no vive en un bloque blanco a sangre: es una tarjeta de
 * vidrio centrada, así el espacio sobrante alrededor pertenece a la imagen
 * en vez de quedar como un vacío blanco.
 */
export function AuthLayout({
  heroTitle,
  heroSubtitle,
  heroEyebrow,
  asset = "brand-main",
  children,
  className,
}: AuthLayoutProps) {
  const reduced = useReducedMotion();

  return (
    <div className={cn("relative flex min-h-dvh flex-col bg-bg-dark md:flex-row", className)}>
      {/* Hero: en mobile ocupa la franja superior; en desktop, la mitad izquierda. */}
      <div className="relative flex h-[38vh] min-h-[260px] shrink-0 flex-col justify-between overflow-hidden p-6 sm:p-10 md:h-auto md:min-h-dvh md:w-[52%] md:p-12">
        <BrandBackground asset={asset} presence="hero" overlay="left" priority ambient />
        <div className="relative z-10">
          <Logo variant="light" size="md" />
        </div>
        <div className="relative z-10 max-w-lg">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={heroTitle}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduced ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              {heroEyebrow && <Eyebrow className="mb-3">{heroEyebrow}</Eyebrow>}
              <h1 className="text-balance text-3xl font-semibold tracking-[-0.03em] text-text-on-dark sm:text-[2.75rem] sm:leading-[1.05]">
                {heroTitle}
              </h1>
              {heroSubtitle && (
                <p className="mt-3 max-w-md text-pretty text-base text-text-on-dark-secondary sm:text-lg">
                  {heroSubtitle}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Panel del formulario */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-10 sm:px-8 md:px-10 md:py-12">
        <div
          className="pointer-events-none absolute -right-24 top-1/4 hidden size-96 rounded-full bg-primary-2/15 blur-[120px] md:block"
          aria-hidden="true"
        />
        <Surface tone="dark">
          <div className="glass relative w-full max-w-[27rem] rounded-xl p-6 sm:p-8">{children}</div>
        </Surface>
      </div>
    </div>
  );
}
