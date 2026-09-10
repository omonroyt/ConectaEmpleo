import { useId, type ComponentType } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { useReducedMotion } from "@/lib/a11y";
import { cn } from "@/lib/cn";

export type RadioCardsTone = "light" | "dark";

export interface RadioCardOption {
  value: string;
  label: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface RadioCardsProps {
  name: string;
  options: RadioCardOption[];
  value: string | null;
  onChange: (value: string) => void;
  columns?: 1 | 2;
  tone?: RadioCardsTone;
  className?: string;
}

/**
 * Cards seleccionables (radiogroup) con ícono y check animado — la elección
 * principal del onboarding, así que se trata como una decisión y no como una
 * lista: la opción activa gana un filo azul, un halo y un ícono en gradiente.
 */
export function RadioCards({
  name,
  options,
  value,
  onChange,
  columns = 1,
  tone = "dark",
  className,
}: RadioCardsProps) {
  const groupId = useId();
  const reduced = useReducedMotion();
  const isDark = tone === "dark";

  return (
    <div
      role="radiogroup"
      className={cn("grid gap-3", columns === 2 ? "sm:grid-cols-2" : "grid-cols-1", className)}
    >
      {options.map((option) => {
        const inputId = `${groupId}-${option.value}`;
        const checked = value === option.value;
        const Icon = option.icon;
        return (
          <label
            key={option.value}
            htmlFor={inputId}
            className={cn(
              "group relative flex cursor-pointer items-start gap-4 overflow-hidden rounded-lg border p-4 sm:p-5",
              "transition-[transform,background-color,border-color,box-shadow] duration-normal ease-out-smooth",
              "hover:-translate-y-0.5",
              isDark
                ? checked
                  ? "border-primary-2/70 bg-white/[0.07] shadow-[0_0_0_1px_rgba(74,69,255,.35),0_18px_44px_-22px_rgba(74,69,255,.9)]"
                  : "border-border-glass bg-white/[0.035] hover:border-white/25 hover:bg-white/[0.06]"
                : checked
                  ? "border-primary-2 bg-primary/[.05] shadow-selected"
                  : "border-border bg-surface hover:border-primary-2/40",
            )}
          >
            {/* Resplandor de la opción elegida, contenido dentro de la card. */}
            {checked && isDark && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-10 -top-14 size-40 rounded-full bg-primary-2/25 blur-3xl"
              />
            )}
            <input
              type="radio"
              id={inputId}
              name={name}
              className="sr-only"
              checked={checked}
              onChange={() => onChange(option.value)}
            />
            {Icon && (
              <span
                className={cn(
                  "relative flex size-11 shrink-0 items-center justify-center rounded-md transition-colors duration-normal",
                  checked
                    ? "bg-gradient-cta text-white shadow-[0_6px_20px_-6px_rgba(74,69,255,.9)]"
                    : isDark
                      ? "bg-white/[0.07] text-text-on-dark-secondary group-hover:text-text-on-dark"
                      : "bg-surface-soft text-text-secondary",
                )}
              >
                <Icon className="size-5" />
              </span>
            )}
            <span className="relative min-w-0 flex-1">
              <span
                className={cn(
                  "block text-[0.9375rem] font-semibold leading-snug",
                  isDark ? "text-text-on-dark" : "text-text-primary",
                )}
              >
                {option.label}
              </span>
              {option.description && (
                <span
                  className={cn(
                    "mt-1 block text-sm leading-relaxed text-pretty",
                    isDark ? "text-text-on-dark-secondary" : "text-text-secondary",
                  )}
                >
                  {option.description}
                </span>
              )}
            </span>
            <AnimatePresence>
              {checked && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.18 }}
                  className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-cta text-white shadow-[0_2px_10px_-2px_rgba(74,69,255,.9)]"
                >
                  <Check className="size-3.5" aria-hidden="true" />
                </motion.span>
              )}
            </AnimatePresence>
          </label>
        );
      })}
    </div>
  );
}
