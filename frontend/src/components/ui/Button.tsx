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
  "transition-[transform,box-shadow,background-color,border-color,opacity] duration-fast ease-standard " +
  "hover:-translate-y-px active:translate-y-0 active:scale-[.985] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2 " +
  "disabled:pointer-events-none disabled:opacity-50";

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

    const classes = cn(base, sizeClasses[size], variantClasses[variant], className);
    const content = (
      <>
        {loading && (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        )}
        <span className={cn(loading && "opacity-90")}>{children}</span>
        {arrow && !loading && (
          <ArrowRight
            className="size-4 transition-transform duration-fast ease-standard group-hover:translate-x-1.5 group-focus-visible:translate-x-1"
            aria-hidden="true"
          />
        )}
      </>
    );

    if (rest.href !== undefined) {
      const { href, ...anchorRest } = rest as ButtonAsAnchor;
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={classes}
          aria-disabled={loading || undefined}
          {...anchorRest}
        >
          {content}
        </a>
      );
    }

    const { type = "button", disabled, ...buttonRest } = rest as ButtonAsButton;
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        disabled={disabled || loading}
        className={classes}
        aria-busy={loading || undefined}
        {...buttonRest}
      >
        {content}
      </button>
    );
  },
);
