import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { signUpPath } from "@/lib/registration";

export interface LandingTopBarProps {
  /** "Cómo funciona" no navega: monta la sección en la propia landing. */
  onHowItWorks: () => void;
}

/** `action` en vez de `href`: la sección no existe hasta que se pide. */
const NAV_LINKS = [
  { label: "Inicio", href: "#inicio" as const },
  { label: "Cómo funciona", action: "how" as const },
  { label: "Talento", href: signUpPath("CANDIDATE") },
  { label: "Empresas", href: signUpPath("COMPANY") },
] as const;

const NAV_LINK_CLASSES =
  "group relative py-1 text-sm font-medium text-text-on-dark-secondary transition-colors duration-fast ease-standard hover:text-text-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-2";

/**
 * Barra superior de la landing — 07_LANDING_HERO.md §3. Transparente sobre
 * el hero, `sticky` con `backdrop-blur` al hacer scroll. En móvil colapsa a
 * logo + hamburguesa con un panel con las mismas acciones.
 */
export function LandingTopBar({ onHowItWorks }: LandingTopBarProps) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMenuOpen(false);
    if (href.startsWith("#")) return;
    navigate(href);
  };

  const handleHowItWorks = () => {
    setMenuOpen(false);
    onHowItWorks();
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,backdrop-filter,border-color] duration-normal ease-standard",
        scrolled
          ? "border-b border-white/10 bg-bg-dark/70 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-6 sm:px-8 lg:px-10">
        <a
          href="#inicio"
          className="flex items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-2"
        >
          <Logo variant="light" size="sm" icon />
        </a>

        <nav aria-label="Principal" className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) =>
            "action" in link ? (
              <button key={link.label} type="button" onClick={handleHowItWorks} className={NAV_LINK_CLASSES}>
                {link.label}
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-[2px] w-0 rounded-full bg-gradient-brand transition-[width] duration-normal ease-standard group-hover:w-full"
                />
              </button>
            ) : (
              <a
                key={link.label}
                href={link.href}
                onClick={(event) => {
                  if (!link.href.startsWith("#")) return;
                  // Deja que el navegador maneje el scroll al ancla; nada que prevenir.
                  event.currentTarget.blur();
                }}
                className={NAV_LINK_CLASSES}
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-[2px] w-0 rounded-full bg-gradient-brand transition-[width] duration-normal ease-standard group-hover:w-full"
                />
              </a>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate(signUpPath("CANDIDATE"))}
            className="!border-white/20 !bg-white/[.06] !text-text-on-dark hover:!border-white/40 hover:!bg-white/[.1]"
          >
            Busco empleo
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate("/login")}
            className="!rounded-pill !border-white/30 !bg-transparent !text-text-on-dark hover:!border-white/60 hover:!bg-white/[.06]"
          >
            Iniciar sesión
          </Button>
          <Button size="md" arrow onClick={() => navigate(signUpPath("COMPANY"))}>
            Publicar vacante
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          className="flex size-11 items-center justify-center rounded-md text-text-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2 lg:hidden"
        >
          {menuOpen ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <div
          id="landing-mobile-menu"
          className="border-t border-white/10 bg-bg-dark/95 px-6 pb-6 pt-4 backdrop-blur-md lg:hidden"
        >
          <nav aria-label="Principal móvil" className="flex flex-col gap-1">
            {NAV_LINKS.map((link) =>
              "action" in link ? (
                <button
                  key={link.label}
                  type="button"
                  onClick={handleHowItWorks}
                  className="rounded-md px-2 py-3 text-left text-base font-medium text-text-on-dark-secondary hover:bg-white/5 hover:text-text-on-dark"
                >
                  {link.label}
                </button>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="rounded-md px-2 py-3 text-base font-medium text-text-on-dark-secondary hover:bg-white/5 hover:text-text-on-dark"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>
          <div className="mt-4 flex flex-col gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate(signUpPath("CANDIDATE"))}
              className="!w-full !border-white/20 !bg-white/[.06] !text-text-on-dark"
            >
              Busco empleo
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate("/login")}
              className="!w-full !rounded-pill !border-white/30 !bg-transparent !text-text-on-dark"
            >
              Iniciar sesión
            </Button>
            <Button arrow onClick={() => navigate(signUpPath("COMPANY"))} className="!w-full">
              Publicar vacante
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
