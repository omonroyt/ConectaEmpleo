import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useReducedMotion } from "@/lib/a11y";
import { cn } from "@/lib/cn";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: "left" | "right";
  className?: string;
}

/** Panel lateral desktop (equivalente de escritorio del `BottomSheet`). */
export function Drawer({ open, onClose, title, children, side = "right", className }: DrawerProps) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const offscreenX = side === "right" ? "100%" : "-100%";

  return (
    <AnimatePresence>
      {open && (
        <div
          className={cn("fixed inset-0 z-[90] flex", side === "right" ? "justify-end" : "justify-start")}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            className="absolute inset-0 bg-bg-dark/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: reduced ? 0 : offscreenX, opacity: reduced ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduced ? 0 : offscreenX, opacity: reduced ? 0 : 1 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative z-10 h-full w-full max-w-md overflow-y-auto bg-surface p-6 shadow-lg",
              className,
            )}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={onClose}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-tertiary transition-colors duration-fast ease-standard hover:bg-surface-soft hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
