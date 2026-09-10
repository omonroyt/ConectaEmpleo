import { BadgeCheck } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { MiniProgressRing } from "@/features/auth/landing/MiniProgressRing";
import { PANEL_SHELL } from "@/features/auth/landing/panelStyles";

const TABS = ["Resumen", "Habilidades", "Experiencia", "Evidencias", "Evaluaciones"] as const;
const PROFILE_CHIPS = ["Inventarios", "Montacargas", "WMS/ERP", "+2"];
const HIGHLIGHT_SKILLS = [
  "Control de inventarios",
  "Recepción y despacho",
  "Seguridad en montacargas",
  "WMS",
  "Coordinación de equipo",
];

/**
 * Panel protagonista "Perfil desbloqueado" (07_LANDING_HERO.md §5.2). Único
 * panel con identidad real, porque representa el estado posterior al
 * desbloqueo de un candidato en el producto real.
 */
export function ProfilePanel({ className }: { className?: string }) {
  return (
    <div className={cn(PANEL_SHELL, "flex w-full flex-col gap-4 p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="relative aspect-square w-11 shrink-0 overflow-hidden rounded-[12px] bg-surface-soft">
            <img
              src="/assets/demo/usuario-demo.webp"
              srcSet="/assets/demo/usuario-demo-sm.webp 160w, /assets/demo/usuario-demo.webp 440w"
              sizes="44px"
              alt="Foto de perfil de demostración de María José Hernández López, Encargada de almacén"
              className="size-full object-cover"
              width={160}
              height={160}
              loading="eager"
              decoding="async"
            />
            <span
              aria-hidden="true"
              className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-success text-white ring-2 ring-surface"
            >
              <BadgeCheck className="size-2.5" aria-hidden="true" />
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">María José Hernández López</p>
            <p className="truncate text-xs text-text-secondary">Encargada de almacén · León, Guanajuato</p>
            <p className="truncate text-[11px] text-success">Disponible en 2 semanas</p>
          </div>
        </div>
        <MiniProgressRing value={92} size={44} stroke={4} className="shrink-0" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PROFILE_CHIPS.map((chip) => (
          <Chip key={chip} className="!h-7 !px-2.5 !text-xs">
            {chip}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border text-[11px] font-medium text-text-tertiary">
        {TABS.map((tab, index) => (
          <span
            key={tab}
            className={cn(
              "relative pb-2",
              index === 0 && "text-text-primary after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:rounded-full after:bg-gradient-brand",
            )}
          >
            {tab}
          </span>
        ))}
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-text-tertiary">Acerca de</p>
        <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
          Encargada de almacén con más de 6 años coordinando recepción, despacho y control de
          inventarios en centros de distribución. Opera montacargas certificada y lidera equipos de
          hasta 8 personas.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-[14px] bg-surface-soft p-3 text-center">
        <Metric value="6 años" label="de experiencia" />
        <Metric value="14" label="competencias evaluadas" />
        <Metric value="3" label="verificadas con documento" />
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-text-tertiary">
          Habilidades destacadas
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {HIGHLIGHT_SKILLS.map((skill) => (
            <Chip key={skill} className="!h-7 !px-2.5 !text-[11px]">
              {skill}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-text-primary">{value}</p>
      <p className="text-[10px] leading-tight text-text-tertiary">{label}</p>
    </div>
  );
}
