import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { BrandBackground, type BrandBackgroundProps } from "@/components/brand/BrandBackground";
import { cn } from "@/lib/cn";

export type CardVariant = "light" | "dark";
export type CardPadding = "sm" | "md" | "lg";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  variant?: CardVariant;
  padding?: CardPadding;
  /** Hover: eleva 2-4px y refuerza la sombra. Requiere un `onClick`/rol interactivo. */
  interactive?: boolean;
  /** Halo de selección (borde + sombra). */
  selected?: boolean;
  /** Solo `variant="dark"`: fondo de marca parcial de acento. */
  background?: Omit<BrandBackgroundProps, "className">;
  className?: string;
  children: ReactNode;
}

const paddingClasses: Record<CardPadding, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = "light",
    padding = "md",
    interactive = false,
    selected = false,
    background,
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-lg border transition-[transform,box-shadow,border-color] duration-fast ease-standard",
        variant === "light"
          ? "border-border bg-surface text-text-primary shadow-sm"
          : "border-border-dark bg-bg-dark-soft text-text-on-dark",
        paddingClasses[padding],
        interactive &&
          "cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2",
        selected && "border-primary-2 shadow-selected",
        className,
      )}
      {...rest}
    >
      {variant === "dark" && background && (
        <BrandBackground {...background} className="opacity-60" />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
});
