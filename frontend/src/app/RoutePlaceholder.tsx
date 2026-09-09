import { Logo } from "@/components/brand/Logo";

export interface RoutePlaceholderProps {
  name: string;
}

/**
 * Pantalla temporal para rutas aún no construidas. Cada feature (F3-F7)
 * reemplazará su placeholder por la pantalla real.
 */
export function RoutePlaceholder({ name }: RoutePlaceholderProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-bg-dark px-6 text-center">
      <Logo variant="light" size="md" />
      <p className="text-sm font-medium uppercase tracking-[.18em] text-text-on-dark-secondary">
        {name}
      </p>
    </div>
  );
}
