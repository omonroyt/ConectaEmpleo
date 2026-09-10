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

      <div className="mt-6 min-h-[96px] sm:min-h-[112px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={turn?.id ?? "placeholder"}
            variants={safe.fadeUp}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
          >
            {isProbe && (
              <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-pill bg-accent/20 px-2.5 py-1 text-[11px] font-semibold text-accent-soft">
                <CornerDownRight className="size-3" aria-hidden="true" />
                Profundiza en tu respuesta anterior
              </span>
            )}
            {/* La entrevista se escucha; el texto es apoyo, no el protagonista.
                Una pregunta en display size compite con el orbe y obliga a
                elegir entre leer y escuchar. */}
            <h2
              className="max-w-[46ch] text-balance text-lg font-medium leading-snug text-text-on-dark sm:text-xl md:text-[1.45rem]"
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
