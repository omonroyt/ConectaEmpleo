"""**Única** prueba real contra ElevenLabs (criterio de cierre 2 de la tarea B12).

Sintetiza una frase corta ("Hola, comencemos la entrevista.", 31 caracteres)
con la cuenta real y verifica: (a) llega audio válido (MP3 no vacío), (b) el
contador persistido de caracteres subió exactamente esa cantidad.

**Se salta por defecto** (`pytest -q` de `tests/test_voice.py` no debe gastar
cuota real en cada corrida ni depender de red/clave). Se ejecuta explícitamente
una sola vez con:

    RUN_LIVE_VOICE_TEST=1 .venv/Scripts/python.exe -m pytest tests/test_voice_live_elevenlabs.py -q -s

No repetir esta corrida sin necesidad: cada ejecución consume caracteres
reales del presupuesto de 10,000 de la cuenta `payg` (docs/build/06 §9).
"""

from __future__ import annotations

import os

import pytest
from sqlalchemy.orm import Session

from app.ai.voice import quota
from app.ai.voice.adapters.elevenlabs import ElevenLabsAdapter
from app.ai.voice.gateway import VoiceGateway
from app.config import get_settings

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_LIVE_VOICE_TEST") != "1",
    reason="Prueba real contra ElevenLabs: gasta cuota. Activar con RUN_LIVE_VOICE_TEST=1.",
)

PHRASE = "Hola, comencemos la entrevista."  # 31 caracteres, < 60 (criterio de cierre)


async def test_synthesize_short_phrase_against_real_elevenlabs_account(db_session: Session) -> None:
    settings = get_settings()
    assert settings.elevenlabs_api_key, "ELEVENLABS_API_KEY vacío en backend/.env: no se puede correr esta prueba."
    assert settings.tts_voice_interviewer, "TTS_VOICE_INTERVIEWER vacío en backend/.env."

    adapter = ElevenLabsAdapter(
        api_key=settings.elevenlabs_api_key,
        stt_model=settings.stt_model,
        tts_model=settings.tts_model,
        output_format=settings.tts_output_format,
    )
    gateway = VoiceGateway(adapter=adapter, settings=settings)

    used_before = quota.characters_used(db_session)

    outcome = await gateway.speak_question(db_session, text=PHRASE, persona="interviewer")

    assert outcome.mode == "audio", f"Se esperaba audio real; el gateway conmutó a texto: {outcome.message}"
    assert outcome.audio_chunks is not None

    audio_bytes = b""
    async for chunk in outcome.audio_chunks:
        audio_bytes += chunk

    # Cerrar el cliente HTTP solo después de drenar el stream: el generador de
    # `ElevenLabsAdapter.stream` mantiene abierto el `async with` de httpx
    # mientras se sigue iterando (§5.5, streaming real) — cerrarlo antes corta
    # la conexión a medio audio.
    await adapter.aclose()

    # MP3 real: no vacío y con una cabecera plausible (frame sync 0xFFEx o ID3).
    assert len(audio_bytes) > 1000, f"Audio sospechosamente corto ({len(audio_bytes)} bytes)."
    assert audio_bytes[:3] == b"ID3" or (audio_bytes[0] == 0xFF and (audio_bytes[1] & 0xE0) == 0xE0), (
        f"Los primeros bytes no parecen MP3 válido: {audio_bytes[:8]!r}"
    )

    used_after = quota.characters_used(db_session)
    consumed = used_after - used_before
    assert consumed == len(PHRASE)

    print(
        f"\n[voz B12] Prueba real de ElevenLabs OK: {consumed} caracteres consumidos "
        f"({used_before} -> {used_after} de {settings.tts_character_budget})."
    )
