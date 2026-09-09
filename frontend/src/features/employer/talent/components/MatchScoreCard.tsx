import type { AnonymousCandidateCard } from "@/api/types";
import { Card, Divider, ProgressRing } from "@/components/ui";
import { BreakdownChart } from "./BreakdownChart";
import { PenaltyList } from "./PenaltyList";
import { EVIDENCE_NOTICE } from "../talentLabels";
import { cn } from "@/lib/cn";

export interface MatchScoreCardProps {
  /** Solo datos anónimos: este componente nunca recibe identidad. */
  card: AnonymousCandidateCard;
  className?: string;
}

/**
 * Card oscura protagonista de E9/E12: score total, etiqueta textual, desglose
 * por componente y penalizaciones. El anillo vive sobre una placa clara para
 * conservar contraste AA sobre el fondo oscuro.
 */
export function MatchScoreCard({ card, className }: MatchScoreCardProps) {
  const weightedTotal = card.breakdown.reduce((sum, item) => sum + item.contribution, 0);
  const penaltyTotal = card.penalties.reduce((sum, p) => sum + p.points, 0);

  return (
    <Card
      variant="dark"
      padding="lg"
      background={{ asset: "matching", presence: "accent", overlay: "left" }}
      className={cn("flex flex-col gap-6", className)}
    >
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="shrink-0 rounded-full bg-surface p-3 shadow-md">
          <ProgressRing value={card.total_score} size={148} stroke={12} />
        </div>
        <div className="text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-accent-soft">
            Compatibilidad con la vacante
          </p>
          <p className="mt-1 text-2xl font-semibold text-text-on-dark">{card.score_label}</p>
          <p className="mt-2 max-w-md text-sm text-text-on-dark-secondary">
            Compatibilidad {card.total_score} % — resultado de sumar {weightedTotal.toFixed(1)} puntos
            ponderados
            {penaltyTotal > 0 ? ` y restar ${penaltyTotal} puntos de penalización` : ""}.
          </p>
          <p className="mt-2 text-xs uppercase tracking-[.18em] text-text-on-dark-secondary">
            {EVIDENCE_NOTICE}
          </p>
        </div>
      </div>

      <Divider className="bg-white/12" />

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[.14em] text-text-on-dark-secondary">
          Desglose del cálculo
        </h3>
        <BreakdownChart items={card.breakdown} onDark className="mt-4" />
      </div>

      <PenaltyList penalties={card.penalties} onDark />
    </Card>
  );
}
