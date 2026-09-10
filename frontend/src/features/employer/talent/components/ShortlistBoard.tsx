import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, KeyRound, UserSearch, X } from "lucide-react";
import type { ShortlistEntry, ShortlistStage } from "@/api/types";
import { Button, Card, EmptyState, ProgressBar } from "@/components/ui";
import { useReducedMotion } from "@/lib/a11y";
import { anonDisplayCode, shortlistStageLabels, shortlistStageOrder } from "../talentLabels";
import { cn } from "@/lib/cn";

const emptyCopy: Record<ShortlistStage, string> = {
  REVIEW: "Agrega candidatos desde el ranking para revisarlos aquí.",
  INTERVIEW: "Mueve aquí a quienes quieras entrevistar.",
  FINALIST: "Los finalistas son los únicos que puedes desbloquear desde este tablero.",
};

const ROUND_BUTTON_CLASS =
  "flex size-9 items-center justify-center rounded-full border border-border-glass text-text-on-dark-secondary transition-colors duration-fast ease-standard hover:border-primary-2/60 hover:text-primary-on-dark disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2";

export interface ShortlistColumnProps {
  stage: ShortlistStage;
  entries: ShortlistEntry[];
  /** Sufijo para los `layoutId` (evita colisión entre la vista desktop y la de pestañas). */
  variantKey: string;
  renderName: (entry: ShortlistEntry) => ReactNode;
  onMove: (entry: ShortlistEntry, stage: ShortlistStage) => void;
  onRemove: (entry: ShortlistEntry) => void;
  onOpen: (entry: ShortlistEntry) => void;
  onUnlock: (entry: ShortlistEntry) => void;
  /** Oculta el encabezado de la columna (en móvil ya lo dan las píldoras). */
  hideHeader?: boolean;
  className?: string;
}

/** Una columna del funnel de selección (E11). */
export function ShortlistColumn({
  stage,
  entries,
  variantKey,
  renderName,
  onMove,
  onRemove,
  onOpen,
  onUnlock,
  hideHeader = false,
  className,
}: ShortlistColumnProps) {
  const reduced = useReducedMotion();
  const index = shortlistStageOrder.indexOf(stage);
  const previous: ShortlistStage | undefined = shortlistStageOrder[index - 1];
  const next: ShortlistStage | undefined = shortlistStageOrder[index + 1];

  return (
    <section className={cn("flex min-w-0 flex-col gap-4", className)}>
      {!hideHeader && (
        <header className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
          <h2 className="min-w-0 text-balance text-base font-semibold text-text-on-dark">
            {shortlistStageLabels[stage]}
          </h2>
          <span className="shrink-0 rounded-pill bg-white/[0.08] px-3 py-1 text-xs font-medium tabular-nums text-text-on-dark-secondary">
            {entries.length}
          </span>
        </header>
      )}

      {entries.length === 0 ? (
        <EmptyState
          icon={UserSearch}
          title={`Sin candidatos en ${shortlistStageLabels[stage].toLowerCase()}`}
          description={emptyCopy[stage]}
          className="p-6"
        />
      ) : (
        <ul className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {entries.map((entry, position) => (
              <motion.li
                key={entry.match_result_id}
                layoutId={reduced ? undefined : `${variantKey}-${entry.match_result_id}`}
                layout={!reduced}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={
                  reduced ? { duration: 0 } : { duration: 0.32, delay: position * 0.06 }
                }
              >
                <Card variant="glass" spotlight padding="md">
                  <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-balance text-sm font-semibold tracking-[-0.01em] text-text-on-dark">
                        {renderName(entry)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(entry)}
                      aria-label={`Quitar ${anonDisplayCode(entry.anon_code)} de la selección`}
                      className="-mr-1 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-text-on-dark-tertiary transition-colors duration-fast ease-standard hover:bg-white/10 hover:text-danger-on-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>

                  <ProgressBar
                    value={entry.total_score}
                    label="Compatibilidad"
                    showValue
                    size="sm"
                    delay={position * 90}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={previous == null}
                      onClick={() => previous && onMove(entry, previous)}
                      aria-label={
                        previous
                          ? `Mover ${anonDisplayCode(entry.anon_code)} a ${shortlistStageLabels[previous]}`
                          : "No hay etapa anterior"
                      }
                      className={ROUND_BUTTON_CLASS}
                    >
                      <ChevronLeft className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={next == null}
                      onClick={() => next && onMove(entry, next)}
                      aria-label={
                        next
                          ? `Mover ${anonDisplayCode(entry.anon_code)} a ${shortlistStageLabels[next]}`
                          : "No hay etapa siguiente"
                      }
                      className={ROUND_BUTTON_CLASS}
                    >
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </button>
                    <Button variant="ghost" size="md" onClick={() => onOpen(entry)}>
                      Ver detalle
                    </Button>
                  </div>

                  {stage === "FINALIST" && !entry.is_unlocked && (
                    <Button variant="primary" size="md" onClick={() => onUnlock(entry)}>
                      <KeyRound className="size-4" aria-hidden="true" />
                      Desbloquear identidad
                    </Button>
                  )}
                  </div>
                </Card>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

export interface ShortlistBoardProps
  extends Omit<ShortlistColumnProps, "stage" | "entries" | "className" | "hideHeader"> {
  entriesByStage: Record<ShortlistStage, ShortlistEntry[]>;
}

/** Funnel completo Revisar → Entrevistar → Finalistas (3 columnas). */
export function ShortlistBoard({ entriesByStage, ...columnProps }: ShortlistBoardProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3 md:items-start">
      {shortlistStageOrder.map((stage) => (
        <ShortlistColumn
          key={stage}
          stage={stage}
          entries={entriesByStage[stage]}
          {...columnProps}
        />
      ))}
    </div>
  );
}
