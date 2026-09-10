import { useId, type ReactNode } from "react";
import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/a11y";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: ReactNode;
  id?: string;
  disabled?: boolean;
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  id,
  disabled,
  tone,
  className,
}: SwitchProps) {
  const resolved = useSurfaceTone(tone);
  const generatedId = useId();
  const switchId = id ?? generatedId;
  const reduced = useReducedMotion();

  return (
    <label
      htmlFor={switchId}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-3",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-pill border transition-colors duration-fast ease-standard",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2",
          checked
            ? "border-primary-2 bg-gradient-cta"
            : resolved === "dark"
              ? "border-border-glass bg-white/[0.08]"
              : "border-border bg-surface-soft",
        )}
      >
        <motion.span
          animate={{ x: checked ? 20 : 2 }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 32 }}
          className="absolute top-0.5 size-6 rounded-full bg-white shadow-sm"
        />
      </button>
      {label && (
        <span
          className={cn(
            "text-sm",
            resolved === "dark" ? "text-text-on-dark" : "text-text-primary",
          )}
        >
          {label}
        </span>
      )}
    </label>
  );
}
