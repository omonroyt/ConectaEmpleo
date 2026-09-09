import { useId, type ComponentType } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { useReducedMotion } from "@/lib/a11y";
import { cn } from "@/lib/cn";

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
  className?: string;
}

/** Cards seleccionables (radiogroup) con ícono y check animado — usado en onboarding. */
export function RadioCards({
  name,
  options,
  value,
  onChange,
  columns = 1,
  className,
}: RadioCardsProps) {
  const groupId = useId();
  const reduced = useReducedMotion();

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
              "relative flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors duration-fast ease-standard",
              checked
                ? "border-primary-2 bg-primary/[.04] shadow-selected"
                : "border-border bg-surface hover:border-primary-2/40",
            )}
          >
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
                  "flex size-10 shrink-0 items-center justify-center rounded-md",
                  checked ? "bg-primary text-white" : "bg-surface-soft text-text-secondary",
                )}
              >
                <Icon className="size-5" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-text-primary">{option.label}</span>
              {option.description && (
                <span className="mt-0.5 block text-sm text-text-secondary">
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
                  transition={{ duration: reduced ? 0 : 0.16 }}
                  className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-white"
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
