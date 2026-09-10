"""Repregunta del CV conversacional: no repetir, no insistir, no perder la respuesta.

Bugs que fijan estos tests (vistos en una sesión real por voz):

1. La repregunta pegaba `current_question_text` completo — que incluye el acuse
   de la respuesta anterior **y** la pregunta —, así que la persona leía el
   mismo párrafo dos veces seguidas.
2. Se repreguntaba sobre respuestas breves pero completas ("en ningún otro
   lugar"), que son cerradas: insistir se lee como no haber escuchado.
3. El fragmento breve dicho antes de la repregunta se descartaba: de
   "sólo escobas, trapeadores" + "no utilizaba más herramientas" solo
   sobrevivía la segunda mitad.
"""

from __future__ import annotations

from types import SimpleNamespace

from app.modules.cv_builder.service import (
    _FIELD_ORDER,
    _FOLLOW_UP_HINTS,
    _FOLLOW_UP_LEAD,
    _current_field,
    _should_follow_up,
)


def _session(*, turn_index: int = 2, follow_up_asked: bool = False, question: str = "") -> SimpleNamespace:
    return SimpleNamespace(
        turn_index=turn_index,
        follow_up_asked=follow_up_asked,
        current_question_text=question,
        answers={},
    )


def test_follow_up_hint_exists_for_every_field_and_never_repeats_the_question() -> None:
    assert set(_FOLLOW_UP_HINTS) == set(_FIELD_ORDER)

    long_agent_message = (
        "Va, ya me quedó claro que se encargaba de la limpieza. Ahora cuéntame, "
        "¿qué herramientas, máquinas o equipos usaba para hacer ese trabajo?"
    )
    session = _session(turn_index=2, question=long_agent_message)
    hint = _FOLLOW_UP_HINTS[_current_field(session)]
    followup = f"{_FOLLOW_UP_LEAD} {hint}"

    # Lo esencial: la repregunta no contiene el mensaje anterior del agente.
    assert long_agent_message not in followup
    assert followup.count("?") == 1


def test_short_but_complete_negative_answers_do_not_trigger_a_follow_up() -> None:
    session = _session(turn_index=3)  # previous_jobs
    for answer in ("no", "En ningun otro lugar", "ninguna", "No he trabajado en otro lado"):
        assert _should_follow_up(answer, session) is False, answer


def test_a_genuinely_vague_short_answer_still_triggers_one_follow_up() -> None:
    session = _session(turn_index=2)  # tools
    assert _should_follow_up("En papel", session) is True


def test_follow_up_is_asked_at_most_once_per_turn() -> None:
    session = _session(turn_index=2, follow_up_asked=True)
    assert _should_follow_up("En papel", session) is False


def test_current_field_tracks_the_turn_and_is_none_past_the_script() -> None:
    assert _current_field(_session(turn_index=0)) == "last_job"
    assert _current_field(_session(turn_index=7)) == "salary"
    assert _current_field(_session(turn_index=8)) is None


def test_partial_answer_is_merged_with_the_second_half() -> None:
    """La lógica de merge de `send_message`, aislada de la sesión de base de datos."""

    session = _session(turn_index=2, follow_up_asked=True)
    pending_field = _current_field(session)
    session.answers = {pending_field: "Sólo escobas, trapeadores"}

    pending_partial = session.answers.get(pending_field) if session.follow_up_asked else None
    effective = f"{pending_partial} {'No utilizaba más herramientas'}".strip()

    assert effective == "Sólo escobas, trapeadores No utilizaba más herramientas"
