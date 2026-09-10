import { cn } from "@/lib/cn";

/**
 * Texto vertical decorativo del borde derecho — 07_LANDING_HERO.md §6.
 * Solo visible ≥1280px (`xl`), puramente ambiental.
 */
export function VerticalText({ className }: { className?: string }) {
  return (
    <p
      aria-hidden="true"
      className={cn(
        "select-none whitespace-nowrap text-[10px] font-medium uppercase tracking-[.3em] text-text-on-dark-secondary/35",
        className,
      )}
      style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
    >
      Talento que impulsa grandes historias
    </p>
  );
}
