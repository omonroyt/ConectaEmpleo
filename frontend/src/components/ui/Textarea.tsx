import {
  forwardRef,
  useRef,
  type InputEvent,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Crece automáticamente entre 1 y 4 líneas según el contenido. */
  autoResize?: boolean;
  className?: string;
}

const LINE_HEIGHT_PX = 24;
const VERTICAL_PADDING_PX = 28;
const MAX_LINES = 4;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { autoResize = false, className, onInput, rows = 2, ...rest },
    ref,
  ) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

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
          "w-full rounded-md border border-border bg-[#FAFBFD] px-4 py-3.5 text-base text-text-primary",
          "placeholder:text-text-tertiary transition-[border-color,box-shadow] duration-fast ease-standard",
          "focus:border-primary-2 focus:outline-none focus:shadow-[0_0_0_4px_rgba(74,69,255,.1)]",
          "disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger",
          autoResize ? "resize-none overflow-hidden" : "resize-y",
          className,
        )}
        {...rest}
      />
    );
  },
);
