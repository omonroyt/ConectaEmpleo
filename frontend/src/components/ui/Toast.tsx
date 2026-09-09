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

const toneClasses: Record<ToastTone, string> = {
  neutral: "border-border text-text-primary",
  success: "border-success/30 text-success",
  warning: "border-warning/30 text-warning",
  danger: "border-danger/30 text-danger",
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
          {toasts.map((toast) => {
            const Icon = toneIcon[toast.tone ?? "neutral"];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: reduced ? 0 : 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduced ? 0 : 8 }}
                transition={{ duration: reduced ? 0 : 0.22 }}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-surface p-4 shadow-md",
                  toneClasses[toast.tone ?? "neutral"],
                )}
              >
                <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-0.5 text-sm text-text-secondary">{toast.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Cerrar notificación"
                  onClick={() => dismiss(toast.id)}
                  className="text-text-tertiary transition-colors duration-fast hover:text-text-primary"
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
