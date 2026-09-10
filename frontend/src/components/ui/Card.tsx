import { forwardRef, type HTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { BrandBackground, type BrandBackgroundProps } from "@/components/brand/BrandBackground";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

/**
 * Familias de superficie de la dirección visual R1:
 *  - `glass`  — vidrio oscuro sobre el lienzo. Default de la app logueada:
 *               métricas, resúmenes, navegación, tarjetas de listado.
 *  - `light`  — panel claro. Contenido denso y formularios largos.
 *  - `soft`   — panel claro tintado. Alterna secciones dentro de un `light`
 *               para que un panel largo deje de leerse como "todo blanco".
 *  - `dark`   — oscuro sólido (sin translucidez), para anidar dentro de glass.
 */
export type CardVariant = "light" | "dark" | "glass" | "soft";
export type CardPadding = "none" | "sm" | "md" | "lg";
export type CardElevation = "none" | "sm" | "md" | "panel";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  variant?: CardVariant;
  padding?: CardPadding;
  /** Hover: eleva 2-4px y refuerza la sombra. Requiere `onClick`/rol interactivo. */
  interactive?: boolean;
  /** Halo de selección (borde + sombra). */
  selected?: boolean;
  /** Borde que se ilumina siguiendo al cursor. Solo `glass`/`dark`. */
  spotlight?: boolean;
  /** Sombra. Por defecto la que corresponde a la variante. */
  elevation?: CardElevation;
  /** Solo `variant="dark"`/`"glass"`: fondo de marca parcial de acento. */
  background?: Omit<BrandBackgroundProps, "className">;
  className?: string;
  children: ReactNode;
}

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const elevationClasses: Record<CardElevation, string> = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  panel: "shadow-panel",
};

const variantClasses: Record<CardVariant, string> = {
  light: "border-border bg-surface text-text-primary",
  soft: "border-border/70 bg-surface-tint text-text-primary",
  dark: "border-border-dark bg-surface-dark text-text-on-dark",
  // `glass` toma su fondo, borde y sombra de la utilidad `.glass`.
  glass: "glass text-text-on-dark",
};

const defaultElevation: Record<CardVariant, CardElevation> = {
  light: "sm",
  soft: "none",
  dark: "none",
  glass: "none",
};

const interactiveClasses: Record<CardVariant, string> = {
  light: "hover:-translate-y-0.5 hover:shadow-md",
  soft: "hover:-translate-y-0.5 hover:bg-surface-soft",
  dark: "hover:-translate-y-0.5 hover:border-white/25",
  glass: "glass-hover hover:-translate-y-0.5",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = "glass",
    padding = "md",
    interactive = false,
    selected = false,
    spotlight = false,
    elevation,
    background,
    className,
    children,
    onMouseMove,
    ...rest
  },
  ref,
) {
  const isDarkFamily = variant === "dark" || variant === "glass";

  // El borde-spotlight lee dos custom properties del propio nodo; se
  // actualizan en `mousemove` para no re-renderizar React por cada píxel.
  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (spotlight && isDarkFamily) {
      const target = event.currentTarget;
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
      target.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
    }
    onMouseMove?.(event);
  };

  return (
    <div
      ref={ref}
      onMouseMove={spotlight || onMouseMove ? handleMouseMove : undefined}
      className={cn(
        // `isolate` crea un contexto de apilamiento propio: dentro de él, el
        // fondo de marca en `-z-10` se pinta por encima del color de fondo de
        // la card pero por debajo del contenido en flujo. Eso permite que los
        // hijos sean hijos DIRECTOS de la raíz — sin un div envoltorio — y que
        // por tanto un `className` de layout (`flex flex-col gap-4`,
        // `grid`, …) aplique de verdad al contenido en vez de quedarse
        // gobernando un único hijo envoltorio.
        "relative isolate overflow-hidden rounded-lg border transition-[transform,box-shadow,border-color,background-color] duration-normal ease-out-smooth",
        variantClasses[variant],
        elevationClasses[elevation ?? defaultElevation[variant]],
        paddingClasses[padding],
        spotlight && isDarkFamily && "spotlight",
        interactive && [
          "cursor-pointer",
          interactiveClasses[variant],
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2",
          "active:translate-y-0",
        ],
        selected &&
          (isDarkFamily
            ? "border-primary-2/80 shadow-[0_0_0_1px_rgba(74,69,255,.5),0_0_38px_-10px_rgba(74,69,255,.8)]"
            : "border-primary-2 shadow-selected"),
        className,
      )}
      {...rest}
    >
      {isDarkFamily && background && (
        <BrandBackground {...background} className="-z-10 opacity-60" />
      )}
      {/* `Surface` no renderiza DOM: solo declara el tono que heredan los
          controles de formulario del interior. */}
      <Surface tone={isDarkFamily ? "dark" : "light"}>{children}</Surface>
    </div>
  );
});
