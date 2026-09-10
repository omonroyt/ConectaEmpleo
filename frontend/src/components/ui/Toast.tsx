import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useReducedMotion } from "@/lib/a11y";
import { easings } from "@/lib/motion";
import { cn } from "@/lib/cn";

export type ToastTone = "neutral" | "success" | "warning" | "danger";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Duración visible antes de autodescartarse (3000-5000ms recomendado). */
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  showToast: (toast: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneIcon: Record<ToastTone, typeof Info> = {
  neutral: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  danger: AlertCircle,
};

/** Color del ícono/acento por tono. El resto del texto es siempre `text-on-dark`. */
const toneIconClasses: Record<ToastTone, string> = {
  neutral: "text-primary-on-dark",
  success: "text-success-on-dark",
  warning: "text-warning-on-dark",
  danger: "text-danger-on-dark",
};

/** Sombra tintada por tono, encima de la sombra de vidrio base. */
const toneShadowByTone: Record<ToastTone, string> = {
  neutral: "shadow-[0_18px_48px_-24px_rgba(3,6,20,.9),0_0_0_1px_rgba(255,255,255,.07)_inset]",
  success: "shadow-[0_18px_48px_-22px_rgba(40,183,90,.35),0_0_0_1px_rgba(255,255,255,.07)_inset]",
  warning: "shadow-[0_18px_48px_-22px_rgba(240,165,43,.35),0_0_0_1px_rgba(255,255,255,.07)_inset]",
  danger: "shadow-[0_18px_48px_-22px_rgba(226,81,81,.4),0_0_0_1px_rgba(255,255,255,.07)_inset]",
};

/** Provee `useToast()` a todo el árbol y renderiza la cola de toasts (slide + fade). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const reduced = useReducedMotion();
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: ToastOptions) => {
      counter.current += 1;
      const id = `toast-${counter.current}`;
      const duration = toast.durationMs ?? 4000;
      setToasts((current) => [...current, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:items-end"
      >
        <AnimatePresence>
          {toasts.map((toast, index) => {
            const tone = toast.tone ?? "neutral";
            const Icon = toneIcon[tone];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: reduced ? 0 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : 10, transition: { duration: reduced ? 0 : 0.16 } }}
                transition={{
                  duration: reduced ? 0 : 0.32,
                  // Stagger visual: cada toast que ya estaba en cola entra un
                  // poco antes que el siguiente, en vez de todos a la vez.
                  delay: reduced ? 0 : Math.min(index, 4) * 0.07,
                  ease: easings.outSmooth,
                }}
                className={cn(
                  "glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg p-4",
                  toneShadowByTone[tone],
                )}
              >
                <Icon className={cn("mt-0.5 size-5 shrink-0", toneIconClasses[tone])} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-on-dark">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-0.5 text-sm text-text-on-dark-secondary">{toast.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Cerrar notificación"
                  onClick={() => dismiss(toast.id)}
                  className="text-text-on-dark-tertiary transition-colors duration-fast hover:text-text-on-dark"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de <ToastProvider>");
  }
  return ctx;
}
