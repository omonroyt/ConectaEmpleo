import { type CSSProperties } from "react";
import { cn } from "@/lib/cn";

export type BrandAsset =
  | "brand-main"
  | "interview"
  | "matching"
  | "results"
  | "profile"
  | "employer"
  | "onboarding"
  | "cards";

export type BrandPresence = "hero" | "support" | "accent";
export type BrandOverlay = "left" | "bottom" | "full" | "none";

export interface BrandBackgroundProps {
  asset: BrandAsset;
  /** Controla la opacidad y saturación de la imagen. */
  presence: BrandPresence;
  /** Degradado oscuro sobre la imagen, orientado hacia el texto. */
  overlay?: BrandOverlay;
  /** `object-position` CSS, ej. "center", "85% 20%". */
  position?: string;
  /** Animación ambiental sutil (scale 1 -> 1.015, 16s), respeta reduced-motion. */
  ambient?: boolean;
  /** Carga eager (solo login/landing); por defecto lazy. */
  priority?: boolean;
  className?: string;
}

const presenceOpacity: Record<BrandPresence, string> = {
  hero: "opacity-[.85]",
  support: "opacity-[.45]",
  accent: "opacity-[.3] saturate-[.8]",
};

const overlayGradient: Record<Exclude<BrandOverlay, "none">, string> = {
  left: "bg-[linear-gradient(90deg,rgba(5,8,18,.88)_0%,rgba(5,8,18,.68)_45%,rgba(5,8,18,.28)_100%)]",
  bottom:
    "bg-[linear-gradient(0deg,rgba(5,8,18,.88)_0%,rgba(5,8,18,.5)_55%,rgba(5,8,18,.1)_100%)]",
  full: "bg-[rgba(5,8,18,.55)]",
};

/**
 * Fondo de marca: `<picture>` con variantes mobile/desktop en WebP,
 * overlay orientado al texto y animación ambiental opcional.
 * Regla 80/20: usar con moderación, presencia "hero" solo en pantallas
 * destacadas (ver mapa de uso en 01_FRONTEND_FOUNDATIONS.md §8).
 */
export function BrandBackground({
  asset,
  presence,
  overlay = "left",
  position = "center",
  ambient = false,
  priority = false,
  className,
}: BrandBackgroundProps) {
  const base = `/assets/brand/backgrounds/${asset}`;
  const style: CSSProperties = { objectPosition: position };

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden",
        "[aspect-ratio:auto]",
        className,
      )}
      aria-hidden="true"
    >
      <picture>
        <source media="(max-width: 768px)" srcSet={`${base}-mobile.webp`} />
        <img
          src={`${base}.webp`}
          alt=""
          aria-hidden="true"
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className={cn(
            "h-full w-full object-cover",
            presenceOpacity[presence],
            ambient && "brand-background__ambient",
          )}
          style={style}
        />
      </picture>
      {overlay !== "none" && (
        <div
          className={cn("absolute inset-0", overlayGradient[overlay])}
        />
      )}
    </div>
  );
}
