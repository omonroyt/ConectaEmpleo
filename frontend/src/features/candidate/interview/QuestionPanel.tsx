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
 * Cabecera de la entrevista, centrada sobre el Orb: el avance como antetítulo
 * discreto, el chip de repregunta (PROBE) y la pregunta en grande con
 * `aria-live` y crossfade al cambiar de turno.
 */
export function QuestionPanel({ turn, asked, budget, placeholder }: QuestionPanelProps) {
  const safe = useMotionSafe();
  const current = Math.max(1, Math.min(budget, asked));
  const isProbe = turn?.references_turn_id != null;

  return (
    <div className="relative z-10 flex w-full flex-col items-center gap-3.5">
      <ProgressSteps
        total={budget}
        current={asked}
        label={`Pregunta ${current} de ${budget}`}
        className="flex-row items-center gap-3 [&>p]:tabular-nums [&>p]:uppercase [&>p]:tracking-[0.16em]"
      />

      <div className="flex min-h-[84px] w-full items-start justify-center sm:min-h-[96px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={turn?.id ?? "placeholder"}
            variants={safe.fadeUp}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3"
          >
            {isProbe && (
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent/20 px-3 py-1 text-[11px] font-semibold text-accent-soft">
                <CornerDownRight className="size-3" aria-hidden="true" />
                Profundiza en tu respuesta anterior
              </span>
            )}
            {/* La entrevista se escucha; el texto acompaña al Orb, no compite
                con él: tamaño display contenido y ancho de lectura corto. */}
            <h2
              className="max-w-[24ch] text-balance text-center text-xl font-medium leading-[1.28] tracking-[-0.02em] text-text-on-dark sm:max-w-[26ch] sm:text-2xl md:text-[1.75rem]"
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
