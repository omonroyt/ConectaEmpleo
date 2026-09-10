import { Search } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { MiniMonogram } from "@/features/auth/landing/MiniMonogram";
import { MiniProgressRing } from "@/features/auth/landing/MiniProgressRing";
import { PANEL_SHELL } from "@/features/auth/landing/panelStyles";

interface TalentRow {
  initials: string;
  code: string;
  role: string;
  score: number;
  skills?: string;
}

const ROWS: TalentRow[] = [
  { initials: "MT", code: "CANDIDATO #024", role: "Encargado de almacén", score: 92, skills: "Inventarios · Seguridad · WMS" },
  { initials: "DR", code: "CANDIDATO #087", role: "Encargado de almacén", score: 87 },
  { initials: "VD", code: "CANDIDATO #112", role: "Auxiliar administrativo", score: 81 },
  { initials: "SM", code: "CANDIDATO #140", role: "Operador de maquinaria pesada", score: 78 },
];

/**
 * Panel "Talento compatible" (07_LANDING_HERO.md §5.1) — maqueta estática en
 * código: buscador simulado, pills de filtro y cuatro candidatos en estado
 * anónimo (monograma + código, nunca nombre ni foto).
 */
export function TalentPanel({ className }: { className?: string }) {
  return (
    <div className={cn(PANEL_SHELL, "flex w-full flex-col gap-3 p-4", className)}>
      <p className="text-xs font-semibold text-text-primary">Talento compatible</p>

      <div className="flex items-center gap-2 rounded-pill bg-surface-soft px-3 py-2 text-text-tertiary">
        <Search className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate text-xs">Buscar candidatos…</span>
      </div>

      <div className="flex flex-wrap gap-1.5" aria-hidden="true">
        <Chip selected className="!h-7 !px-2.5 !text-xs">
          Todos
        </Chip>
        <Chip className="!h-7 !px-2.5 !text-xs">Verificados</Chip>
        <Chip className="!h-7 !px-2.5 !text-xs">Disponibles</Chip>
      </div>

      <ul className="flex flex-col divide-y divide-border/70">
        {ROWS.map((row) => (
          <li key={row.code} className="flex items-center gap-2.5 py-2.5 first:pt-1 last:pb-1">
            <MiniMonogram initials={row.initials} seed={row.code} size={30} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-text-primary">{row.code}</p>
              <p className="truncate text-[11px] text-text-secondary">{row.role}</p>
              {row.skills && <p className="truncate text-[10px] text-text-tertiary">{row.skills}</p>}
            </div>
            <MiniProgressRing value={row.score} size={30} stroke={3} />
          </li>
        ))}
      </ul>
    </div>
  );
}
