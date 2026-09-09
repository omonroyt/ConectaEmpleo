import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

export interface ImmersiveLayoutProps {
  children: ReactNode;
  /** Slot lateral opcional (desktop 60/40, ej. panel de contexto de la entrevista). */
  aside?: ReactNode;
  /** Si es `true`, el contenedor del `aside` no se renderiza en mobile (ni ocupa espacio ahí). */
  asideDesktopOnly?: boolean;
  onClose?: () => void;
  className?: string;
}

/**
 * Layout sin navegación, fondo oscuro completo. Usado en entrevista,
 * onboarding y creación de vacante ("focus mode").
 */
export function ImmersiveLayout({ children, aside, asideDesktopOnly, onClose, className }: ImmersiveLayoutProps) {
  return (
    <div className={cn("relative flex min-h-dvh flex-col bg-bg-dark text-text-on-dark", className)}>
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Logo variant="light" size="md" />
        {onClose && (
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full text-text-on-dark-secondary transition-colors duration-fast ease-standard hover:bg-white/10 hover:text-text-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        )}
      </header>
      <div
        className={cn(
          "flex flex-1 flex-col items-center px-6 pb-12 sm:px-10",
          aside && "md:flex-row md:items-stretch md:justify-center md:gap-12",
        )}
      >
        <div className={cn("flex w-full max-w-[760px] flex-1 flex-col justify-center", aside && "md:w-[60%] md:max-w-none")}>
          {children}
        </div>
        {aside && (
          <div
            className={cn(
              "w-full max-w-[760px] md:mt-0 md:w-[40%] md:max-w-none",
              asideDesktopOnly ? "hidden md:block" : "mt-8",
            )}
          >
            {aside}
          </div>
        )}
      </div>
    </div>
  );
}
