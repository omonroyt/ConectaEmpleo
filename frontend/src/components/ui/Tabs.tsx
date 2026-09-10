import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useReducedMotion } from "@/lib/a11y";
import { useSurfaceTone, type SurfaceTone } from "@/components/ui/Surface";
import { cn } from "@/lib/cn";

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Fuerza la paleta; por defecto la hereda del panel (`Surface`/`Card`). */
  tone?: SurfaceTone;
  className?: string;
  "aria-label": string;
}

/** Difumina los extremos de la fila de tabs cuando desborda y hace scroll horizontal. */
const edgeFadeStyle = {
  WebkitMaskImage:
    "linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)",
  maskImage:
    "linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)",
};

/** Tabs con roving tabindex (flechas/Home/End) y panel animado con `AnimatePresence`. */
export function Tabs({ items, value, defaultValue, onChange, tone, className, ...rest }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);
  const active = value ?? internal;
  const baseId = useId();
  const reduced = useReducedMotion();
  const resolved = useSurfaceTone(tone);
  const isDark = resolved === "dark";

  const setActive = (next: string) => {
    setInternal(next);
    onChange?.(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.value === active);
    if (index === -1) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActive(items[(index + 1) % items.length].value);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActive(items[(index - 1 + items.length) % items.length].value);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(items[0].value);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(items[items.length - 1].value);
    }
  };

  const activeItem = items.find((item) => item.value === active);

  return (
    <div className={className}>
      {/* La fila hace su propio scroll horizontal: nunca ensancha la página. */}
      <div
        className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={edgeFadeStyle}
      >
        <div
          role="tablist"
          aria-label={rest["aria-label"]}
          onKeyDown={handleKeyDown}
          className={cn(
            "inline-flex gap-1 rounded-pill p-1",
            isDark ? "bg-white/[0.05]" : "bg-surface-soft",
          )}
        >
          {items.map((item) => {
            const selected = item.value === active;
            return (
              <button
                key={item.value}
                id={`${baseId}-tab-${item.value}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${item.value}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(item.value)}
                className={cn(
                  "min-h-9 shrink-0 whitespace-nowrap rounded-pill px-4 text-sm font-medium transition-colors duration-fast ease-standard",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-2",
                  selected
                    ? "bg-gradient-cta text-white"
                    : isDark
                      ? "text-text-on-dark-secondary hover:text-text-on-dark"
                      : "text-text-secondary hover:text-text-primary",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="relative mt-4">
        <AnimatePresence mode="wait">
          {activeItem && (
            <motion.div
              key={activeItem.value}
              id={`${baseId}-panel-${activeItem.value}`}
              role="tabpanel"
              tabIndex={0}
              aria-labelledby={`${baseId}-tab-${activeItem.value}`}
              initial={{ opacity: 0, y: reduced ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -6 }}
              transition={{ duration: reduced ? 0 : 0.18 }}
            >
              {activeItem.content}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
