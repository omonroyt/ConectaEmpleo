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

/** Sidebar desktop (260px): logo, navegación, CTA destacado y bloque de perfil. */
export function Sidebar({ items, ctaLabel, onCtaClick, user, onLogout, className }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col justify-between border-r border-border bg-surface p-6 md:flex",
        className,
      )}
    >
      <div className="flex flex-col gap-8">
        <Logo variant="dark" size="md" />
        <nav aria-label="Navegación principal" className="flex flex-col gap-1">
          {items.map((item) => {
            const active = isNavItemActive(item, location);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-fast ease-standard",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-surface-soft hover:text-text-primary",
                )}
              >
                <item.icon className="size-4" aria-hidden="true" />
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
        <div className="flex items-center gap-3 border-t border-border pt-4">
          <Avatar name={user.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">{user.name}</p>
            <p className="truncate text-xs text-text-secondary">{user.email}</p>
          </div>
          {onLogout && (
            <button
              type="button"
              aria-label="Cerrar sesión"
              onClick={onLogout}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-tertiary transition-colors duration-fast ease-standard hover:bg-surface-soft hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
