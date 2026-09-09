import type { StoredMatchResult } from "../state";

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

  const positionSentence =
    nextScore != null && card.total_score > nextScore
      ? `${card.anon_code} queda por encima del siguiente candidato por ${card.total_score - nextScore} puntos.`
      : nextScore != null
        ? `${card.anon_code} está muy cerca del siguiente candidato en el ranking.`
        : `${card.anon_code} es el mejor evaluado de este grupo.`;

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
