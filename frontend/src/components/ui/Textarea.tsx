import {
  forwardRef,
  useRef,
  type InputEvent,
  type TextareaHTMLAttributes,
} from "react";
import { fieldControlClassesFor } from "@/components/ui/Input";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Crece automáticamente entre 1 y 4 líneas según el contenido. */
  autoResize?: boolean;
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
}

const LINE_HEIGHT_PX = 24;
const VERTICAL_PADDING_PX = 28;
const MAX_LINES = 4;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { autoResize = false, tone, className, onInput, rows = 2, ...rest },
    ref,
  ) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    const resolved = useSurfaceTone(tone);

    const setRefs = (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: HTMLTextAreaElement | null }).current = node;
    };

    const handleInput = (event: InputEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        const el = event.currentTarget;
        el.style.height = "auto";
        const max = LINE_HEIGHT_PX * MAX_LINES + VERTICAL_PADDING_PX;
        el.style.height = `${Math.min(el.scrollHeight, max)}px`;
      }
      onInput?.(event);
    };

    return (
      <textarea
        ref={setRefs}
        rows={rows}
        onInput={handleInput}
        className={cn(
          fieldControlClassesFor(resolved),
          "py-3.5",
          autoResize ? "resize-none overflow-hidden" : "resize-y",
          className,
        )}
        {...rest}
      />
    );
  },
);
