import { AnimatePresence, motion } from "motion/react";
import { CornerDownRight } from "lucide-react";
import { ProgressSteps } from "@/components/ui";
import { useMotionSafe } from "@/lib/motion";
import type { InterviewTurn } from "@/api/types";

export interface QuestionPanelProps {
  turn: InterviewTurn | null;
  asked: number;
  budget: number;
  /** Texto alternativo mientras no hay pregunta (carga, cierre). */
  placeholder?: string;
}

/**
 * Cabecera de la entrevista: progreso, chip de repregunta (PROBE) y la pregunta
 * en grande con `aria-live` y crossfade al cambiar de turno.
 */
export function QuestionPanel({ turn, asked, budget, placeholder }: QuestionPanelProps) {
  const safe = useMotionSafe();
  const current = Math.max(1, Math.min(budget, asked));
  const isProbe = turn?.references_turn_id != null;

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3">
        <ProgressSteps
          total={budget}
          current={asked}
          label={`Pregunta ${current} de ${budget}`}
          className="[&>p]:text-text-on-dark-secondary"
        />
      </div>

      <div className="mt-6 min-h-[132px] sm:min-h-[148px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={turn?.id ?? "placeholder"}
            variants={safe.fadeUp}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
          >
            {isProbe && (
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-pill bg-accent/20 px-3 py-1.5 text-xs font-semibold text-accent-soft">
                <CornerDownRight className="size-3.5" aria-hidden="true" />
                Profundiza en tu respuesta anterior
              </span>
            )}
            <h2
              className="text-balance text-2xl font-semibold leading-tight text-text-on-dark sm:text-3xl md:text-[2.1rem]"
              aria-live="polite"
            >
              {turn?.question_text ?? placeholder ?? "Preparando tu entrevista…"}
            </h2>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
