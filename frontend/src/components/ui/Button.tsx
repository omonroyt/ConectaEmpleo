import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger-ghost";
export type ButtonSize = "md" | "lg";

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Muestra un spinner y deshabilita el botón. */
  loading?: boolean;
  /** Agrega un ícono de flecha que se desplaza al hover/focus. */
  arrow?: boolean;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps | "href"> & {
    href?: undefined;
  };

type ButtonAsAnchor = ButtonOwnProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonOwnProps | "href"> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-12 px-5 text-sm gap-2",
  lg: "h-14 px-7 text-base gap-2.5",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-cta text-white shadow-sm hover:shadow-md disabled:shadow-none",
  secondary:
    "bg-surface text-text-primary border border-border hover:border-primary-2/50",
  ghost: "bg-transparent text-primary hover:bg-primary/[.06]",
  "danger-ghost": "bg-transparent text-danger hover:bg-danger/[.08]",
};

const base =
  "group relative inline-flex select-none items-center justify-center rounded-pill font-medium " +
  "transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-fast ease-standard " +
  "hover:-translate-y-px active:translate-y-0 active:scale-[.985] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2 " +
  "disabled:pointer-events-none disabled:cursor-not-allowed";

/**
 * Estado deshabilitado "real" (no `loading`): sin gradiente ni sombra/glow,
 * fondo neutro y texto de contraste reducido, para que nunca se lea como
 * accionable. Se aplica aparte de `disabled:*` porque un botón `loading`
 * también queda `disabled` en el DOM pero debe conservar su apariencia normal.
 */
const disabledVisualClasses =
  "!translate-y-0 !scale-100 !bg-none !bg-surface-soft !text-text-tertiary !border !border-border !shadow-none";

/**
 * Botón del design system. `as="a"`/`href` renderiza un `<a>` con la misma
 * apariencia (para CTAs que navegan sin router, ej. mailto/externos).
 */
export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(props, ref) {
    const {
      variant = "primary",
      size = "md",
      loading = false,
      arrow = false,
      className,
      children,
      ...rest
    } = props;

    const baseClasses = cn(base, sizeClasses[size], variantClasses[variant]);
    // Todo el contenido (spinner, ícono(s) que venga en `children`, texto y flecha)
    // vive en un único renglón flex con separación consistente: si `children` trae
    // un ícono junto al texto (ej. <Send/> + "Enviar respuesta"), ambos quedan uno
    // al lado del otro en vez de depender del flujo inline de un <span> normal
    // (que podía dejar el ícono superpuesto al texto según el line-height).
    const content = (
      <span className={cn("inline-flex items-center justify-center gap-2", loading && "opacity-90")}>
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {children}
        {arrow && !loading && (
          <ArrowRight
            className="size-4 transition-transform duration-fast ease-standard group-hover:translate-x-1.5 group-focus-visible:translate-x-1"
            aria-hidden="true"
          />
        )}
      </span>
    );

    if (rest.href !== undefined) {
      const { href, ...anchorRest } = rest as ButtonAsAnchor;
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={cn(baseClasses, className)}
          aria-disabled={loading || undefined}
          {...anchorRest}
        >
          {content}
        </a>
      );
    }

    const { type = "button", disabled, ...buttonRest } = rest as ButtonAsButton;
    const disabledVisual = Boolean(disabled) && !loading;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        disabled={disabled || loading}
        className={cn(baseClasses, disabledVisual && disabledVisualClasses, className)}
        aria-busy={loading || undefined}
        {...buttonRest}
      >
        {content}
      </button>
    );
  },
);
