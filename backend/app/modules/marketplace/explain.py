"""`build_key_differences` para `CompareView.key_differences` (B10).

Puerto Python de `frontend/src/api/mock/engine/explain.ts::buildKeyDifferences`
(**solo lectura** en el frontend, este módulo es la implementación real del
backend): 3-4 observaciones concretas armadas **solo** a partir de
`breakdown`/`evidence_counts` ya calculados por el motor -- nunca inventa un
dato nuevo, nunca llama a IA (esto es texto derivado de números, no prosa
generada; A5 EXPLAIN sigue siendo la única pieza que redacta con un LLM,
docs/05 §7 A5).
"""

from __future__ import annotations

from app.modules.marketplace.schemas import AnonymousCandidateCard

_COMPONENT_LABELS_ES: dict[str, str] = {
    "TECHNICAL": "habilidades técnicas",
    "BEHAVIORAL": "competencias conductuales",
    "EXPERIENCE": "experiencia",
    "EVIDENCE": "calidad de evidencia",
    "SALARY": "compatibilidad salarial",
    "LOCATION": "ubicación",
}

_COMPONENTS = ("TECHNICAL", "BEHAVIORAL", "EXPERIENCE", "EVIDENCE", "SALARY", "LOCATION")


def _anon_display_code(anon_code: str) -> str:
    compact = "".join(ch for ch in anon_code if ch.isalnum())
    tail = compact[-3:].upper() if compact else ""
    return f"CANDIDATO #{tail or compact.upper()}"


def _raw_for(card: AnonymousCandidateCard, component: str) -> float:
    return next((item.raw for item in card.breakdown if item.component == component), 0.0)


def build_key_differences(cards: list[AnonymousCandidateCard]) -> list[str]:
    if len(cards) < 2:
        return []

    sorted_cards = sorted(cards, key=lambda c: c.total_score, reverse=True)
    top = sorted_cards[0]
    bottom = sorted_cards[-1]
    lines: list[str] = []

    lines.append(
        f"{_anon_display_code(top.anon_code)} lidera con {top.total_score}% de compatibilidad, "
        f"{top.total_score - bottom.total_score} puntos por encima de {_anon_display_code(bottom.anon_code)}."
    )

    tech_leader = max(cards, key=lambda c: _raw_for(c, "TECHNICAL"))
    beh_leader = max(cards, key=lambda c: _raw_for(c, "BEHAVIORAL"))
    if tech_leader.match_result_id == beh_leader.match_result_id:
        lines.append(
            f"{_anon_display_code(tech_leader.anon_code)} lidera tanto en habilidades técnicas "
            f"({round(_raw_for(tech_leader, 'TECHNICAL'))} de 100) como en competencias conductuales "
            f"({round(_raw_for(beh_leader, 'BEHAVIORAL'))} de 100)."
        )
    else:
        lines.append(
            f"{_anon_display_code(tech_leader.anon_code)} lidera en habilidades técnicas "
            f"({round(_raw_for(tech_leader, 'TECHNICAL'))} de 100), mientras que "
            f"{_anon_display_code(beh_leader.anon_code)} lidera en competencias conductuales "
            f"({round(_raw_for(beh_leader, 'BEHAVIORAL'))} de 100)."
        )

    most_verified = max(cards, key=lambda c: c.evidence_counts.get("verified", 0))
    if most_verified.evidence_counts.get("verified", 0) > 0:
        count = most_verified.evidence_counts["verified"]
        plural = "" if count == 1 else "es"
        plural2 = "" if count == 1 else "s"
        lines.append(
            f"{_anon_display_code(most_verified.anon_code)} tiene la evidencia más verificada "
            f"({count} habilidad{plural} respaldada{plural2} con documento)."
        )
    else:
        least_evaluated = min(cards, key=lambda c: c.evidence_counts.get("evaluated", 0))
        lines.append(
            f"Ningún candidato tiene habilidades verificadas todavía; {_anon_display_code(least_evaluated.anon_code)} "
            f"es quien tiene menos evidencia evaluada ({least_evaluated.evidence_counts.get('evaluated', 0)})."
        )

    best_flip: tuple[str, AnonymousCandidateCard, float] | None = None
    for challenger in sorted_cards[1:]:
        for component in _COMPONENTS:
            gap = _raw_for(challenger, component) - _raw_for(top, component)
            if gap > 0 and (best_flip is None or gap > best_flip[2]):
                best_flip = (component, challenger, gap)

    if best_flip is not None:
        component, challenger, _gap = best_flip
        lines.append(
            f"En {_COMPONENT_LABELS_ES[component]}, {_anon_display_code(challenger.anon_code)} supera a "
            f"{_anon_display_code(top.anon_code)} ({round(_raw_for(challenger, component))} vs "
            f"{round(_raw_for(top, component))} de 100); ese criterio podría cambiar la decisión final."
        )
    else:
        lines.append(
            f"{_anon_display_code(top.anon_code)} lidera en todos los criterios individuales frente al resto, "
            "no solo en el total."
        )

    return lines[:4]
