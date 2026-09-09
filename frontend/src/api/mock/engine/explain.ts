import type { AnonymousCandidateCard, MatchComponent } from "@/api/types";
import type { StoredMatchResult } from "../state";
import { anonDisplayCode } from "../util";

/**
 * Verifica que un texto de explicación nunca mencione un porcentaje distinto
 * al total_score del candidato. Se usa en dev inmediatamente después de generar
 * el texto (ver buildExplanation) y puede reutilizarse en pruebas manuales.
 */
export function assertExplanation(text: string, totalScore: number): void {
  const matches = text.matchAll(/(\d+(?:\.\d+)?)\s*%/g);
  for (const match of matches) {
    const value = Number(match[1]);
    if (value !== totalScore) {
      throw new Error(
        `assertExplanation: el texto menciona ${value}% pero total_score es ${totalScore}%. Texto: "${text}"`,
      );
    }
  }
}

function wordLimit(text: string, max = 120): string {
  const words = text.trim().split(/\s+/);
  return words.length <= max ? text : words.slice(0, max).join(" ") + "…";
}

/**
 * Plantilla en español (≤120 palabras) a partir del breakdown ya calculado.
 * `nextScore` es el total_score del siguiente candidato en el ranking (o null
 * si es el último), usado solo para la frase de posición relativa.
 */
export function buildExplanation(card: StoredMatchResult, nextScore: number | null): string {
  const strengths = card.strengths.slice(0, 2).join(" y ");
  const gaps = card.gaps.length > 0 ? card.gaps.slice(0, 2).join(" y ") : null;
  const penaltyPoints = card.penalties.reduce((sum, p) => sum + p.points, 0);

  const displayCode = anonDisplayCode(card.anon_code);
  const positionSentence =
    nextScore != null && card.total_score > nextScore
      ? `${displayCode} queda por encima del siguiente candidato por ${card.total_score - nextScore} puntos.`
      : nextScore != null
        ? `${displayCode} está muy cerca del siguiente candidato en el ranking.`
        : `${displayCode} es el mejor evaluado de este grupo.`;

  const strengthSentence = strengths
    ? `Sus principales fortalezas evaluadas son ${strengths}.`
    : "Muestra evidencia consistente aunque sin una fortaleza destacada todavía.";

  const gapSentence = gaps
    ? `Como brecha, falta evidencia en ${gaps}.`
    : "No se detectan brechas relevantes frente a los requisitos de la vacante.";

  const penaltySentence =
    penaltyPoints > 0
      ? `Se aplicaron ${penaltyPoints} puntos de penalización por requisitos obligatorios, salario o ubicación fuera de rango.`
      : "";

  const text = wordLimit(
    `Con ${card.total_score}% de compatibilidad (${card.score_label.toLowerCase()}), ${positionSentence} ${strengthSentence} ${gapSentence} ${penaltySentence}`.trim(),
  );

  assertExplanation(text, card.total_score);
  return text;
}

/** Duplica `matchComponentLabels` de `talentLabels.ts` (el mock no puede importar de `src/features`). */
const COMPONENT_LABELS_ES: Record<MatchComponent, string> = {
  TECHNICAL: "habilidades técnicas",
  BEHAVIORAL: "competencias conductuales",
  EXPERIENCE: "experiencia",
  EVIDENCE: "calidad de evidencia",
  SALARY: "compatibilidad salarial",
  LOCATION: "ubicación",
};

function rawFor(card: AnonymousCandidateCard, component: MatchComponent): number {
  return card.breakdown.find((item) => item.component === component)?.raw ?? 0;
}

/**
 * 3-4 observaciones concretas a partir del `breakdown`/`evidence_counts` ya
 * calculados (sin inventar datos nuevos): quién lidera en general, quién en
 * técnico/conductual, quién tiene más evidencia verificada o la más limitada,
 * y en qué criterio individual el segundo lugar realmente supera al primero
 * (el dato que más podría inclinar la decisión final).
 */
export function buildKeyDifferences(cards: AnonymousCandidateCard[]): string[] {
  if (cards.length < 2) return [];
  const sorted = [...cards].sort((a, b) => b.total_score - a.total_score);
  const top = sorted[0]!;
  const bottom = sorted[sorted.length - 1]!;
  const lines: string[] = [];

  lines.push(
    `${anonDisplayCode(top.anon_code)} lidera con ${top.total_score}% de compatibilidad, ` +
      `${top.total_score - bottom.total_score} puntos por encima de ${anonDisplayCode(bottom.anon_code)}.`,
  );

  const techLeader = [...cards].sort((a, b) => rawFor(b, "TECHNICAL") - rawFor(a, "TECHNICAL"))[0]!;
  const behLeader = [...cards].sort((a, b) => rawFor(b, "BEHAVIORAL") - rawFor(a, "BEHAVIORAL"))[0]!;
  if (techLeader.match_result_id === behLeader.match_result_id) {
    lines.push(
      `${anonDisplayCode(techLeader.anon_code)} lidera tanto en habilidades técnicas ` +
        `(${Math.round(rawFor(techLeader, "TECHNICAL"))} de 100) como en competencias conductuales ` +
        `(${Math.round(rawFor(behLeader, "BEHAVIORAL"))} de 100).`,
    );
  } else {
    lines.push(
      `${anonDisplayCode(techLeader.anon_code)} lidera en habilidades técnicas ` +
        `(${Math.round(rawFor(techLeader, "TECHNICAL"))} de 100), mientras que ` +
        `${anonDisplayCode(behLeader.anon_code)} lidera en competencias conductuales ` +
        `(${Math.round(rawFor(behLeader, "BEHAVIORAL"))} de 100).`,
    );
  }

  const mostVerified = [...cards].sort((a, b) => b.evidence_counts.verified - a.evidence_counts.verified)[0]!;
  if (mostVerified.evidence_counts.verified > 0) {
    lines.push(
      `${anonDisplayCode(mostVerified.anon_code)} tiene la evidencia más verificada ` +
        `(${mostVerified.evidence_counts.verified} habilidad${mostVerified.evidence_counts.verified === 1 ? "" : "es"} respaldada${mostVerified.evidence_counts.verified === 1 ? "" : "s"} con documento).`,
    );
  } else {
    const leastEvaluated = [...cards].sort(
      (a, b) => a.evidence_counts.evaluated - b.evidence_counts.evaluated,
    )[0]!;
    lines.push(
      `Ningún candidato tiene habilidades verificadas todavía; ${anonDisplayCode(leastEvaluated.anon_code)} ` +
        `es quien tiene menos evidencia evaluada (${leastEvaluated.evidence_counts.evaluated}).`,
    );
  }

  const components: MatchComponent[] = ["TECHNICAL", "BEHAVIORAL", "EXPERIENCE", "EVIDENCE", "SALARY", "LOCATION"];
  let bestFlip: { component: MatchComponent; challenger: AnonymousCandidateCard; gap: number } | null = null;
  for (const challenger of sorted.slice(1)) {
    for (const component of components) {
      const gap = rawFor(challenger, component) - rawFor(top, component);
      if (gap > 0 && (bestFlip == null || gap > bestFlip.gap)) {
        bestFlip = { component, challenger, gap };
      }
    }
  }
  if (bestFlip) {
    lines.push(
      `En ${COMPONENT_LABELS_ES[bestFlip.component]}, ${anonDisplayCode(bestFlip.challenger.anon_code)} supera a ` +
        `${anonDisplayCode(top.anon_code)} (${Math.round(rawFor(bestFlip.challenger, bestFlip.component))} vs ` +
        `${Math.round(rawFor(top, bestFlip.component))} de 100); ese criterio podría cambiar la decisión final.`,
    );
  } else {
    lines.push(
      `${anonDisplayCode(top.anon_code)} lidera en todos los criterios individuales frente al resto, no solo en el total.`,
    );
  }

  return lines.slice(0, 4);
}
