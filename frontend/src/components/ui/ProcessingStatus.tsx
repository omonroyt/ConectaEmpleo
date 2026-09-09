import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { useReducedMotion } from "@/lib/a11y";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";

export interface ProcessingStatusProps {
  messages: string[];
  /** 0-100, opcional. Cuando se define, muestra una `ProgressBar`. */
  progress?: number;
  /** Intervalo de rotación de mensajes en ms (default ~1.2s). */
  intervalMs?: number;
  className?: string;
}

/** Estado de procesamiento con ícono animado sutil y mensajes rotativos accesibles. */
export function ProcessingStatus({
  messages,
  progress,
  intervalMs = 1200,
  className,
}: ProcessingStatusProps) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [messages.length, intervalMs]);

  const message = messages[index] ?? messages[0] ?? "Procesando…";

  return (
    <div className={cn("flex flex-col items-center gap-4 text-center", className)}>
      <motion.span
        animate={reduced ? undefined : { rotate: 360 }}
        transition={reduced ? undefined : { duration: 1.4, repeat: Infinity, ease: "linear" }}
        className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Loader2 className="size-6" aria-hidden="true" />
      </motion.span>
      <p aria-live="polite" className="text-sm font-medium text-text-primary">
        {message}
      </p>
      {typeof progress === "number" && <ProgressBar value={progress} className="w-full max-w-xs" />}
    </div>
  );
}
