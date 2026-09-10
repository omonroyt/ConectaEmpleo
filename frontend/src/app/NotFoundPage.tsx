import { BrandBackground } from "@/components/brand/BrandBackground";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

/** Página 404 con el estilo de marca (fondo oscuro con acento + wordmark) y una salida real. */
export function NotFoundPage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-8 overflow-hidden bg-bg-dark px-6 py-20 text-center">
      <BrandBackground asset="brand-main" presence="support" overlay="full" ambient />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <Logo variant="light" size="md" />
        <div className="flex flex-col items-center gap-3">
          <Eyebrow tone="accent">Error 404</Eyebrow>
          <h1 className="max-w-2xl text-balance text-5xl font-semibold tracking-[-0.03em] text-text-on-dark sm:text-7xl">
            Página no encontrada
          </h1>
        </div>
        <p className="max-w-[45ch] text-pretty text-base text-text-on-dark-secondary sm:text-lg">
          El enlace que seguiste no existe o esta pantalla se movió. Vuelve al inicio y retoma desde ahí.
        </p>
        <Button href="/" variant="primary" size="lg" arrow>
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
