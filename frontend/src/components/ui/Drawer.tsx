import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useReducedMotion } from "@/lib/a11y";
import { easings } from "@/lib/motion";
import { Surface, useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: "left" | "right";
  /** Vidrio oscuro (default, sobre el lienzo) o panel claro. */
  tone?: SurfaceTone;
  className?: string;
}

const PANEL_CLASS: Record<SurfaceTone, string> = {
  dark: "glass text-text-on-dark",
  light: "border-l border-border bg-surface text-text-primary shadow-lg",
};

const TITLE_CLASS: Record<SurfaceTone, string> = {
  dark: "text-text-on-dark",
  light: "text-text-primary",
};

const CLOSE_CLASS: Record<SurfaceTone, string> = {
  dark: "text-text-on-dark-tertiary hover:bg-white/10 hover:text-text-on-dark",
  light: "text-text-tertiary hover:bg-surface-soft hover:text-text-primary",
};

/** Panel lateral desktop (equivalente de escritorio del `BottomSheet`). */
export function Drawer({ open, onClose, title, children, side = "right", tone, className }: DrawerProps) {
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
            className="absolute inset-0 bg-bg-dark/70 backdrop-blur-md"
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
            transition={{ duration: reduced ? 0 : 0.32, ease: easings.outSmooth }}
            className={cn(
              "relative z-10 h-full w-full max-w-md overflow-y-auto p-6",
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
