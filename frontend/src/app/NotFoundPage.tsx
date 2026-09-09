import { Logo } from "@/components/brand/Logo";

/** Página 404 simple. */
export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-bg-dark px-6 text-center">
      <Logo variant="light" size="md" />
      <h1 className="text-2xl font-semibold text-text-on-dark">
        Página no encontrada
      </h1>
      <p className="max-w-sm text-sm text-text-on-dark-secondary">
        La página que buscas no existe o fue movida.
      </p>
      <a
        href="/"
        className="rounded-pill bg-gradient-cta px-6 py-3 text-sm font-medium text-white"
      >
        Volver al inicio
      </a>
    </div>
  );
}
