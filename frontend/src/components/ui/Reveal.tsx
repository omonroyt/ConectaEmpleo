import { type ElementType, type ReactNode } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/a11y";
import { revealGroup, revealItem } from "@/lib/motion";
import { cn } from "@/lib/cn";

export interface RevealGroupProps {
  children: ReactNode;
  /** Segundos entre la entrada de un hijo y el siguiente. */
  stagger?: number;
  /** Retraso antes del primer hijo. */
  delay?: number;
  /** Etiqueta a renderizar (`ul` para listas, `div` para grillas). */
  as?: ElementType;
  className?: string;
}

/**
 * Contenedor de entrada escalonada: sus hijos `<Reveal>` aparecen uno tras
 * otro cuando el grupo entra en pantalla, dentro de su propio contenedor.
 *
 * Se dispara con `whileInView` + `once`, así una grilla que está más abajo
 * anima al llegar a ella y no antes de ser visible.
 */
export function RevealGroup({
  children,
  stagger = 0.08,
  delay = 0.05,
  as = "div",
  className,
}: RevealGroupProps) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as as "div"];

  return (
    <MotionTag
      variants={reduced ? undefined : revealGroup(stagger, delay)}
      initial={reduced ? undefined : "hidden"}
      whileInView={reduced ? undefined : "visible"}
      viewport={{ once: true, amount: 0.15 }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

export interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
}

/**
 * Hijo de `<RevealGroup>`. Fuera de un grupo también funciona: anima solo
 * cuando entra en pantalla.
 */
export function Reveal({ children, as = "div", className }: RevealProps) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as as "div"];

  if (reduced) {
    const Tag = as as ElementType;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag variants={revealItem} className={cn(className)}>
      {children}
    </MotionTag>
  );
}
