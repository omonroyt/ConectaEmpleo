import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/lib/a11y";
import { easings } from "@/lib/motion";
import { Surface, useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Vidrio oscuro (default, sobre el lienzo) o panel claro. */
  tone?: SurfaceTone;
  className?: string;
}

const PANEL_CLASS: Record<SurfaceTone, string> = {
  dark: "glass text-text-on-dark",
  light: "border border-border bg-surface text-text-primary shadow-lg",
};

const HANDLE_CLASS: Record<SurfaceTone, string> = {
  dark: "bg-white/20",
  light: "bg-border",
};

const TITLE_CLASS: Record<SurfaceTone, string> = {
  dark: "text-text-on-dark",
  light: "text-text-primary",
};

/** Hoja inferior mobile: handle, radio superior 28px, Esc y backdrop cierran. */
export function BottomSheet({ open, onClose, title, children, tone, className }: BottomSheetProps) {
  const reduced = useReducedMotion();
  const resolvedTone = useSurfaceTone(tone);

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
            className="absolute inset-0 bg-bg-dark/70 backdrop-blur-md"
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
            transition={{ duration: reduced ? 0 : 0.3, ease: easings.outSmooth }}
            className={cn(
              "relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-xl p-6 pt-3",
              PANEL_CLASS[resolvedTone],
              className,
            )}
          >
            <div
              className={cn("mx-auto mb-3 h-1.5 w-10 rounded-pill", HANDLE_CLASS[resolvedTone])}
              aria-hidden="true"
            />
            <Surface tone={resolvedTone}>
              {title && (
                <h2 className={cn("mb-4 text-lg font-semibold", TITLE_CLASS[resolvedTone])}>{title}</h2>
              )}
              {children}
            </Surface>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
