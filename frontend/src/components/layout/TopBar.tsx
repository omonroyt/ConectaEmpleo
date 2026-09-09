import { Bell } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";

export interface TopBarProps {
  user?: { name: string; email: string };
  onNotificationsClick?: () => void;
  className?: string;
}

/** Header superior de las shells: logo (mobile), campana de notificaciones y avatar. */
export function TopBar({ user, onNotificationsClick, className }: TopBarProps) {
  return (
    <header
      className={cn(
        "flex h-16 items-center justify-between border-b border-border bg-surface px-4 md:px-8",
        className,
      )}
    >
      <div className="md:hidden">
        <Logo variant="dark" size="sm" />
      </div>
      <div className="hidden md:block" aria-hidden="true" />
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notificaciones"
          onClick={onNotificationsClick}
          className="flex size-10 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast ease-standard hover:bg-surface-soft hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
        >
          <Bell className="size-5" aria-hidden="true" />
        </button>
        {user && <Avatar name={user.name} size="sm" />}
      </div>
    </header>
  );
}
