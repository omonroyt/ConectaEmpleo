"""Presupuesto de caracteres de TTS y corte automático al 85 % (obligatorio).

`docs/build/06_INTERVIEW_SYSTEM.md` §9: la cuenta de ElevenLabs tiene 10,000
caracteres `payg`. Es preferible perder la voz antes de la demo, avisando, que
a mitad de la presentación — así que este módulo decide **antes** de golpear
la red si todavía hay presupuesto, y solo entonces `gateway.py` llama al
adaptador. Un intento fallido nunca se cuenta (ElevenLabs no cobra audio que
no se generó).
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.voice.models import TTSUsageEvent
from app.config import Settings, get_settings


@dataclass(frozen=True)
class VoiceQuotaStatus:
    characters_used: int
    character_budget: int
    threshold_pct: float
    budget_used_pct: float
    voice_available: bool
    reason: str | None = None


def characters_used(db: Session) -> int:
    total = db.execute(
        select(func.coalesce(func.sum(TTSUsageEvent.characters), 0)).where(
            TTSUsageEvent.status == "SUCCESS"
        )
    ).scalar_one()
    return int(total)


def get_quota_status(db: Session, settings: Settings | None = None) -> VoiceQuotaStatus:
    settings = settings or get_settings()
    used = characters_used(db)
    budget = settings.tts_character_budget
    threshold = settings.tts_quota_threshold_pct
    used_pct = (used / budget) if budget > 0 else 1.0

    reason: str | None = None
    if not settings.voice_enabled:
        available = False
        reason = "VOICE_ENABLED=false: la voz está apagada por configuración."
    elif not settings.elevenlabs_api_key:
        available = False
        reason = "No hay ELEVENLABS_API_KEY configurada."
    elif used_pct >= threshold:
        available = False
        reason = (
            f"Se alcanzó el {threshold:.0%} del presupuesto de caracteres "
            f"({used}/{budget}): la sesión conmuta a texto para no agotar la "
            "cuota a mitad de la demo."
        )
    else:
        available = True

    return VoiceQuotaStatus(
        characters_used=used,
        character_budget=budget,
        threshold_pct=threshold,
        budget_used_pct=used_pct,
        voice_available=available,
        reason=reason,
    )


def would_exceed_threshold(db: Session, additional_characters: int, settings: Settings | None = None) -> bool:
    """True si sintetizar `additional_characters` más dejaría el uso en o sobre el umbral.

    Se usa solo para decidir si vale la pena *intentar* la llamada; el corte
    real ya ocurre en `get_quota_status` (se revisa antes de cada síntesis).
    """
    settings = settings or get_settings()
    budget = settings.tts_character_budget
    if budget <= 0:
        return True
    projected = characters_used(db) + additional_characters
    return (projected / budget) >= settings.tts_quota_threshold_pct


def record_usage(
    db: Session,
    *,
    characters: int,
    persona: str,
    voice_id: str,
    status: str,
    turn_id: str | None = None,
) -> TTSUsageEvent:
    event = TTSUsageEvent(
        characters=characters,
        persona=persona,
        voice_id=voice_id,
        status=status,
        turn_id=turn_id,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
