import { useId, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/lib/a11y";
import { cn } from "@/lib/cn";

export interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
}

/** Tooltip accesible (hover + focus) para desktop. En touch, el contenido base sigue siendo legible sin el tooltip. */
export function Tooltip({ content, children, className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const reduced = useReducedMotion();

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            id={id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: reduced ? 0 : 0.12 }}
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-56 -translate-x-1/2 rounded-md bg-bg-dark px-2.5 py-1.5 text-center text-xs font-medium text-text-on-dark shadow-md"
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
