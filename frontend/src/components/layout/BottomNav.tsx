import type { ComponentType } from "react";
import { Link, useLocation } from "react-router";
import { cn } from "@/lib/cn";

export interface NavLocation {
  pathname: string;
  search: string;
}

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Coincidencia exacta de pathname (sin incluir subrutas). */
  end?: boolean;
  /** Override para activos que dependen también del querystring (ej. `?tab=talent`). */
  isActiveOverride?: (location: NavLocation) => boolean;
}

export function isNavItemActive(item: NavItem, location: NavLocation): boolean {
  if (item.isActiveOverride) return item.isActiveOverride(location);
  const toPath = item.to.split("?")[0];
  if (item.end) return location.pathname === toPath;
  return location.pathname === toPath || location.pathname.startsWith(`${toPath}/`);
}

export interface BottomNavProps {
  items: NavItem[];
  className?: string;
}

/** Navegación inferior mobile (4 items) con punto azul bajo el activo. */
export function BottomNav({ items, className }: BottomNavProps) {
  const location = useLocation();

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-surface/95 backdrop-blur-sm md:hidden",
        className,
      )}
    >
      {items.map((item) => {
        const active = isNavItemActive(item, location);
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors duration-fast ease-standard",
              active ? "text-primary" : "text-text-tertiary",
            )}
          >
            <item.icon className="size-5" aria-hidden="true" />
            {item.label}
            <span
              aria-hidden="true"
              className={cn(
                "size-1 rounded-full bg-primary transition-opacity duration-fast",
                active ? "opacity-100" : "opacity-0",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
