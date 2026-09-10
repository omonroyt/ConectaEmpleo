import { Bell } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

export interface TopBarProps {
  user?: { name: string; email: string };
  onNotificationsClick?: () => void;
  /** Punto de aviso sobre la campana. */
  hasNotifications?: boolean;
  className?: string;
}

/**
 * Header superior de las shells sobre el lienzo oscuro: se queda pegado al
 * hacer scroll con fondo de vidrio, para que el contenido pase por debajo en
 * vez de empujarlo.
 */
export function TopBar({ user, onNotificationsClick, hasNotifications, className }: TopBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-16 items-center justify-between",
        "border-b border-white/[0.07] bg-[rgba(9,12,22,0.65)] px-4 backdrop-blur-xl md:px-8",
        className,
      )}
    >
      <div className="md:hidden">
        <Logo variant="light" size="sm" />
      </div>
      <div className="hidden md:block" aria-hidden="true" />
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notificaciones"
          onClick={onNotificationsClick}
          className="relative flex size-10 items-center justify-center rounded-full text-text-on-dark-secondary transition-colors duration-fast ease-standard hover:bg-white/10 hover:text-text-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
        >
          <Bell className="size-5" aria-hidden="true" />
          {hasNotifications && (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 size-2 rounded-full bg-primary-2 shadow-[0_0_8px_rgba(74,69,255,.9)]"
            />
          )}
        </button>
        {user && <Avatar name={user.name} size="sm" />}
      </div>
    </header>
  );
}
