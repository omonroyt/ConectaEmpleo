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

/**
 * Navegación inferior mobile (4 items) sobre el lienzo oscuro.
 *
 * Va en `sticky bottom-0` como último hijo de la columna del shell, no en
 * `fixed`: se comporta igual al hacer scroll (queda pegada al borde inferior
 * de la ventana) pero ocupa una fila real del layout, así el contenido nunca
 * queda tapado y la barra no "flota" a media página cuando el documento es
 * más alto que la ventana.
 */
export function BottomNav({ items, className }: BottomNavProps) {
  const location = useLocation();

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        "sticky bottom-0 z-40 flex items-stretch justify-around",
        "border-t border-white/[0.08] bg-[rgba(9,12,22,0.82)] backdrop-blur-xl md:hidden",
        // Respeta la barra de gestos de iOS.
        "pb-[env(safe-area-inset-bottom)]",
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
              "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[0.6875rem] font-medium",
              "transition-colors duration-fast ease-standard",
              active ? "text-text-on-dark" : "text-text-on-dark-tertiary",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-5 top-0 h-[2px] rounded-pill bg-gradient-cta transition-opacity duration-fast",
                active ? "opacity-100" : "opacity-0",
              )}
            />
            <item.icon
              className={cn("size-5 transition-colors", active && "text-primary-on-dark")}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
