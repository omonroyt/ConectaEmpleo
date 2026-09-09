import { BrandBackground } from "@/components/brand/BrandBackground";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

/** Página 404 con el estilo de marca (fondo oscuro con acento + wordmark). */
export function NotFoundPage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden bg-bg-dark px-6 text-center">
      <BrandBackground asset="brand-main" presence="support" overlay="full" ambient />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <Logo variant="light" size="md" />
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-accent-soft">Error 404</p>
        <h1 className="text-2xl font-semibold text-text-on-dark sm:text-3xl">
          Página no encontrada
        </h1>
        <p className="max-w-sm text-sm text-text-on-dark-secondary">
          La página que buscas no existe o fue movida. Verifica el enlace o vuelve al inicio.
        </p>
        <Button href="/" variant="primary" size="lg" arrow>
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
