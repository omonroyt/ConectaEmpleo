import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/lib/a11y";
import { cn } from "@/lib/cn";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/** Hoja inferior mobile: handle, radio superior 28px, Esc y backdrop cierran. */
export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center">
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
            initial={{ y: reduced ? 0 : "100%", opacity: reduced ? 0 : 1 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reduced ? 0 : "100%", opacity: reduced ? 0 : 1 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-surface p-6 pt-3 shadow-lg",
              className,
            )}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-pill bg-border" aria-hidden="true" />
            {title && <h2 className="mb-4 text-lg font-semibold text-text-primary">{title}</h2>}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
