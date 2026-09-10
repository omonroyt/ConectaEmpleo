import { cn } from "@/lib/cn";
import { MiniMonogram } from "@/features/auth/landing/MiniMonogram";
import { MiniProgressRing } from "@/features/auth/landing/MiniProgressRing";
import { PANEL_SHELL } from "@/features/auth/landing/panelStyles";

const CANDIDATES = [
  { initials: "MT", code: "#024", score: 92 },
  { initials: "DR", code: "#087", score: 87 },
  { initials: "VD", code: "#112", score: 81 },
];

const CRITERIA: { label: string; values: [number, number, number] }[] = [
  { label: "Habilidades técnicas", values: [94, 85, 78] },
  { label: "Experiencia", values: [90, 88, 74] },
  { label: "Comunicación", values: [88, 80, 82] },
  { label: "Evidencia verificada", values: [95, 82, 70] },
];

/**
 * Panel "Comparar talento" (07_LANDING_HERO.md §5.3): tres columnas
 * anónimas con anillo de compatibilidad y una tabla de criterios con barras.
 */
export function ComparePanel({ className }: { className?: string }) {
  return (
    <div className={cn(PANEL_SHELL, "flex w-full flex-col gap-4 p-4", className)}>
      <p className="text-xs font-semibold text-text-primary">Comparar talento</p>

      <div className="grid grid-cols-[1fr_repeat(3,auto)] items-center gap-x-2 gap-y-1">
        <span aria-hidden="true" />
        {CANDIDATES.map((candidate) => (
          <div key={candidate.code} className="flex flex-col items-center gap-1">
            <MiniMonogram initials={candidate.initials} seed={candidate.code} size={24} />
            <span className="text-[9px] font-medium text-text-tertiary">{candidate.code}</span>
          </div>
        ))}

        <span aria-hidden="true" />
        {CANDIDATES.map((candidate) => (
          <MiniProgressRing key={`ring-${candidate.code}`} value={candidate.score} size={30} stroke={3} />
        ))}

        {CRITERIA.map((criterion) => (
          <RowCells key={criterion.label} label={criterion.label} values={criterion.values} />
        ))}
      </div>

      <div className="mt-1 flex h-10 items-center justify-center rounded-pill bg-gradient-cta text-xs font-medium text-white">
        Ver comparación detallada
      </div>
    </div>
  );
}

function RowCells({ label, values }: { label: string; values: [number, number, number] }) {
  return (
    <>
      <span className="truncate pr-2 text-[10px] text-text-secondary">{label}</span>
      {values.map((value, index) => (
        // La barra sola no dice cuánto vale: sin la cifra al lado se leía como
        // un adorno. Con el número se entiende que es una comparación real.
        <div key={index} className="flex items-center gap-1.5">
          <div aria-hidden="true" className="h-1.5 w-8 overflow-hidden rounded-pill bg-surface-soft">
            <div className="h-full rounded-pill bg-gradient-brand" style={{ width: `${value}%` }} />
          </div>
          <span className="text-[9px] font-medium tabular-nums text-text-tertiary">
            {(value / 10).toFixed(1)}
          </span>
        </div>
      ))}
    </>
  );
}
