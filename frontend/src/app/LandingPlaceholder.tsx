import { BrandBackground } from "@/components/brand/BrandBackground";
import { Logo } from "@/components/brand/Logo";
import { AudioOrb } from "@/components/interview/AudioOrb";

/**
 * Landing placeholder — verifica visualmente que BrandBackground y AudioOrb
 * funcionan juntos. F3 reemplazará esta pantalla por la landing real.
 */
export function LandingPlaceholder() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-8 overflow-hidden bg-bg-dark px-6 text-center">
      <BrandBackground asset="brand-main" presence="hero" priority ambient />
      <div className="relative z-10 flex flex-col items-center gap-8">
        <Logo variant="light" size="lg" />
        <AudioOrb state="idle" size={320} />
        <p className="text-sm font-medium uppercase tracking-[.18em] text-text-on-dark-secondary">
          Landing — Conecta Empleo
        </p>
      </div>
    </div>
  );
}
