import type { AnonymousCandidateCard } from "@/api/types";
import { Card, Divider, Eyebrow, ProgressRing } from "@/components/ui";
import { BreakdownChart } from "./BreakdownChart";
import { PenaltyList } from "./PenaltyList";
import { EVIDENCE_NOTICE } from "../talentLabels";

export interface MatchScoreCardProps {
  /** Solo datos anónimos: este componente nunca recibe identidad. */
  card: AnonymousCandidateCard;
  className?: string;
}

/**
 * Panel protagonista de E9/E12: score total, etiqueta textual, desglose por
 * componente y penalizaciones. Vidrio sobre el lienzo, con el anillo y las
 * barras cargando de 0 a su valor al entrar en pantalla.
 */
export function MatchScoreCard({ card, className }: MatchScoreCardProps) {
  const weightedTotal = card.breakdown.reduce((sum, item) => sum + item.contribution, 0);
  const penaltyTotal = card.penalties.reduce((sum, p) => sum + p.points, 0);

  return (
    <Card
      variant="glass"
      padding="lg"
      background={{ asset: "matching", presence: "accent", overlay: "left" }}
      className={className}
    >
      <div className="flex flex-col gap-7">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <ProgressRing
            value={card.total_score}
            size={148}
            stroke={12}
            className="shrink-0"
          />
          <div className="min-w-0 text-center sm:text-left">
            <Eyebrow tone="accent">Compatibilidad con la vacante</Eyebrow>
            <p className="mt-2 text-balance text-2xl font-semibold tracking-[-0.03em] text-text-on-dark">
              {card.score_label}
            </p>
            <p className="mt-2 max-w-[46ch] text-pretty text-sm text-text-on-dark-secondary">
              Compatibilidad <span className="tabular-nums">{card.total_score} %</span> — resultado de
              sumar <span className="tabular-nums">{weightedTotal.toFixed(1)}</span> puntos ponderados
              {penaltyTotal > 0 ? ` y restar ${penaltyTotal} puntos de penalización` : ""}.
            </p>
            <p className="mt-3 text-xs text-text-on-dark-tertiary">{EVIDENCE_NOTICE}</p>
          </div>
        </div>

        <Divider className="bg-white/10" />

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-text-on-dark-secondary">
            Desglose del cálculo
          </h3>
          <BreakdownChart items={card.breakdown} onDark className="mt-5" />
        </div>

        <PenaltyList penalties={card.penalties} onDark />
      </div>
    </Card>
  );
}
