import { AnimatePresence, motion } from "motion/react";
import { CornerDownRight } from "lucide-react";
import { ProgressSteps } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useMotionSafe } from "@/lib/motion";
import type { InterviewTurn } from "@/api/types";

const QUESTION_BASE =
  "text-balance text-center font-medium leading-[1.28] tracking-[-0.02em] text-text-on-dark";

/**
 * Escala de la pregunta según su longitud.
 *
 * El hueco de la pregunta es fijo (`h-[132px] sm:h-[156px]`) para que el Orb
 * reciba siempre el mismo espacio: antes el bloque crecía sin techo y una
 * repregunta larga del modelo le robaba hasta 191px, hundiéndolo contra el
 * compositor. Como el alto ya no puede ceder, es la tipografía la que cede:
 * las preguntas cortas —la mayoría— conservan el tamaño display de siempre, y
 * las largas bajan de escala y ensanchan la medida para no pasar de ~5 líneas.
 *
 * Los cortes salen de medir el banco real: mediana 90 caracteres, máximo 171,
 * y repreguntas redactadas por el modelo que llegan a ~280.
 */
function questionScale(text: string): string {
  if (text.length <= 110) return "max-w-[24ch] text-xl sm:max-w-[26ch] sm:text-2xl md:text-[1.75rem]";
  if (text.length <= 180) return "max-w-[28ch] text-lg sm:max-w-[30ch] sm:text-xl md:text-2xl";
  return "max-w-[32ch] text-base sm:max-w-[34ch] sm:text-lg md:text-xl";
}

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
  const text = turn?.question_text ?? placeholder ?? "Preparando tu entrevista…";

  return (
    <div className="relative z-10 flex w-full flex-col items-center gap-3.5">
      <ProgressSteps
        total={budget}
        current={asked}
        label={`Pregunta ${current} de ${budget}`}
        className="flex-row items-center gap-3 [&>p]:tabular-nums [&>p]:uppercase [&>p]:tracking-[0.16em]"
      />

      <div className="flex h-[168px] w-full items-center justify-center overflow-y-auto sm:h-[176px]">
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
            <h2 className={cn(QUESTION_BASE, questionScale(text))} aria-live="polite">
              {text}
            </h2>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
