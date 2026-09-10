import { Link, useLocation } from "react-router";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { isNavItemActive, type NavItem } from "@/components/layout/BottomNav";
import { cn } from "@/lib/cn";

export interface SidebarProps {
  items: NavItem[];
  ctaLabel?: string;
  onCtaClick?: () => void;
  user?: { name: string; email: string };
  onLogout?: () => void;
  className?: string;
}

/**
 * Sidebar desktop (260px) sobre el lienzo oscuro: filo hairline en vez de
 * borde sólido, item activo con píldora de vidrio y una barra de acento a la
 * izquierda que hace de indicador de posición.
 */
export function Sidebar({ items, ctaLabel, onCtaClick, user, onLogout, className }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col justify-between",
        "border-r border-white/[0.07] bg-[rgba(9,12,22,0.72)] p-6 backdrop-blur-xl md:flex",
        className,
      )}
    >
      <div className="flex flex-col gap-9">
        <Logo variant="light" size="md" />
        <nav aria-label="Navegación principal" className="flex flex-col gap-1">
          {items.map((item) => {
            const active = isNavItemActive(item, location);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium",
                  "transition-colors duration-fast ease-standard",
                  active
                    ? "bg-white/[0.08] text-text-on-dark"
                    : "text-text-on-dark-secondary hover:bg-white/[0.05] hover:text-text-on-dark",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-pill bg-gradient-cta transition-opacity duration-fast",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <item.icon
                  className={cn(
                    "size-4 transition-colors",
                    active ? "text-primary-on-dark" : "text-text-on-dark-tertiary group-hover:text-text-on-dark-secondary",
                  )}
                  aria-hidden="true"
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {ctaLabel && onCtaClick && (
          <Button variant="primary" size="md" onClick={onCtaClick} className="w-full">
            {ctaLabel}
          </Button>
        )}
      </div>
      {user && (
        <div className="flex items-center gap-3 border-t border-white/[0.07] pt-4">
          <Avatar name={user.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-on-dark">{user.name}</p>
            <p className="truncate text-xs text-text-on-dark-tertiary">{user.email}</p>
          </div>
          {onLogout && (
            <button
              type="button"
              aria-label="Cerrar sesión"
              onClick={onLogout}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-on-dark-tertiary transition-colors duration-fast ease-standard hover:bg-white/10 hover:text-danger-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
