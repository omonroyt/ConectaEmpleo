import { useEffect, useId, useRef, type ReactNode } from "react";
import { Textarea } from "@/components/ui";
import type { InterviewMode } from "@/api/types";

export interface AnswerComposerProps {
  mode: InterviewMode;
  /** Estado de la sesión, anunciado con `aria-live` sobre el campo. */
  statusLabel: string;
  /** El campo solo aparece cuando toca escribir o revisar la transcripción. */
  showField: boolean;
  value: string;
  onChange: (value: string) => void;
  /** Enter (sin Shift) envía si hay texto. */
  onSubmit: () => void;
  fieldDisabled?: boolean;
  /** true en modo voz cuando el micrófono ya se cerró y toca revisar el texto. */
  reviewing: boolean;
  transcribing: boolean;
  /** Enfoca el campo al aparecer (modo texto o revisión). */
  autoFocus?: boolean;
  /** Controles de la entrevista: van dentro de la misma barra. */
  children: ReactNode;
}

/**
 * Compositor de respuesta: una sola barra flotante de vidrio al pie del Orb
 * con el estado de la sesión, el campo de respuesta y los controles. En modo
 * voz el campo aparece con la transcripción del STT, editable antes de
 * enviar (03 §C9); en modo texto es el canal principal.
 *
 * El estado vive aquí y no bajo el Orb para no robarle alto: el Orb ocupa
 * todo el hueco libre de la pantalla.
 */
export function AnswerComposer({
  mode,
  statusLabel,
  showField,
  value,
  onChange,
  onSubmit,
  fieldDisabled = false,
  reviewing,
  transcribing,
  autoFocus = false,
  children,
}: AnswerComposerProps) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showField && autoFocus && !fieldDisabled) ref.current?.focus();
  }, [showField, autoFocus, fieldDisabled]);

  const hint =
    mode === "TEXT"
      ? "Enter envía tu respuesta, Shift + Enter hace salto de línea."
      : transcribing
        ? "Preparando tu transcripción…"
        : reviewing
          ? "Revisa y corrige la transcripción antes de enviarla."
          : "Si prefieres, también puedes escribir tu respuesta aquí.";

  return (
    <div className="glass relative z-10 w-full rounded-xl p-4">
      <div className="flex flex-col gap-2.5">
        {/* Estado y atajo comparten renglón: cada línea que no gasta la barra
            se la queda el Orb. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-sm font-medium text-text-on-dark-secondary" aria-live="polite">
            {statusLabel}
          </p>
          {showField && (
            <p id={`${id}-hint`} className="text-xs text-text-on-dark-tertiary">
              {hint}
            </p>
          )}
        </div>

        {showField && (
          <div>
            <label htmlFor={id} className="sr-only">
              Tu respuesta
            </label>
            <Textarea
              id={id}
              ref={ref}
              value={value}
              autoResize
              rows={2}
              disabled={fieldDisabled}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              placeholder={
                mode === "TEXT"
                  ? "Cuéntanos con un ejemplo concreto…"
                  : "Aquí aparecerá lo que dijiste…"
              }
              aria-describedby={`${id}-hint`}
              className="min-h-[68px] bg-white/[0.06]"
            />
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
