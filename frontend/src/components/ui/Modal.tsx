import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useReducedMotion } from "@/lib/a11y";
import { easings } from "@/lib/motion";
import { Surface, useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Vidrio oscuro (default, sobre el lienzo) o panel claro. */
  tone?: SurfaceTone;
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const PANEL_CLASS: Record<SurfaceTone, string> = {
  dark: "glass text-text-on-dark",
  light: "border border-border bg-surface text-text-primary shadow-lg",
};

const TITLE_CLASS: Record<SurfaceTone, string> = {
  dark: "text-text-on-dark",
  light: "text-text-primary",
};

const CLOSE_CLASS: Record<SurfaceTone, string> = {
  dark: "text-text-on-dark-tertiary hover:bg-white/10 hover:text-text-on-dark",
  light: "text-text-tertiary hover:bg-surface-soft hover:text-text-primary",
};

/** Modal centrado (480-680px), con focus trap simple, Esc y backdrop con blur. */
export function Modal({ open, onClose, title, children, tone, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const resolvedTone = useSurfaceTone(tone);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = dialogRef.current;
    const initialFocusable = node?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    initialFocusable?.[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const items = node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.2 }}
            // Velo oscuro tintado de azul (no negro plano) + desenfoque real.
            className="absolute inset-0 bg-bg-dark/70 backdrop-blur-md"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: reduced ? 1 : 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduced ? 1 : 0.97 }}
            transition={{ duration: reduced ? 0 : 0.24, ease: easings.outSmooth }}
            className={cn(
              "relative z-10 max-h-[85vh] w-full max-w-[640px] overflow-y-auto rounded-lg p-6 sm:min-w-[480px]",
              PANEL_CLASS[resolvedTone],
              className,
            )}
          >
            <Surface tone={resolvedTone}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className={cn("text-lg font-semibold", TITLE_CLASS[resolvedTone])}>{title}</h2>
                <button
                  type="button"
                  aria-label="Cerrar"
                  onClick={onClose}
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-fast ease-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2",
                    CLOSE_CLASS[resolvedTone],
                  )}
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              {children}
            </Surface>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
