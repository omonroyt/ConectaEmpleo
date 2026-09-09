import { useEffect, useId, useRef } from "react";
import { Textarea } from "@/components/ui";
import type { InterviewMode } from "@/api/types";

export interface TranscriptBoxProps {
  mode: InterviewMode;
  value: string;
  onChange: (value: string) => void;
  /** Enter (sin Shift) envía si hay texto. */
  onSubmit: () => void;
  disabled?: boolean;
  /** true en modo voz cuando el micrófono ya se cerró y toca revisar el texto. */
  reviewing: boolean;
  transcribing: boolean;
  /** Enfoca el textarea al aparecer (modo texto o revisión). */
  autoFocus?: boolean;
}

/**
 * Campo de respuesta. En modo texto es el canal principal; en modo voz aparece
 * con la transcripción del STT, editable antes de enviar (03 §C9).
 */
export function TranscriptBox({
  mode,
  value,
  onChange,
  onSubmit,
  disabled = false,
  reviewing,
  transcribing,
  autoFocus = false,
}: TranscriptBoxProps) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && !disabled) ref.current?.focus();
  }, [autoFocus, disabled]);

  const hint =
    mode === "TEXT"
      ? "Escribe tu respuesta con tus palabras. Enter envía, Shift + Enter hace salto de línea."
      : transcribing
        ? "Preparando tu transcripción…"
        : reviewing
          ? "Revisa y corrige la transcripción antes de enviarla."
          : "Si prefieres, también puedes escribir tu respuesta aquí.";

  return (
    <div className="w-full">
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-text-on-dark-secondary">
        Tu respuesta
      </label>
      <Textarea
        id={id}
        ref={ref}
        value={value}
        autoResize
        rows={3}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder={
          mode === "TEXT" ? "Cuéntanos con un ejemplo concreto…" : "Aquí aparecerá lo que dijiste…"
        }
        aria-describedby={`${id}-hint`}
        className="min-h-[112px] border-white/15 bg-white/5 text-text-on-dark placeholder:text-white/35"
      />
      <p id={`${id}-hint`} className="mt-2 text-xs text-text-on-dark-secondary/80">
        {hint}
      </p>
    </div>
  );
}
