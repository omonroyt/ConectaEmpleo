"""`VoiceGateway` — ciclo de turno de voz (docs/05 §5.3, §5.5) del lado del backend.

No confundir con `frontend/src/voice/VoiceGateway.ts` (interfaz que consume la
pantalla de entrevista): esta clase es la contraparte de servidor, sin UI.

Cubre la porción de voz del ciclo de §5.3 — STT de la respuesta y TTS de la
siguiente pregunta — con la política de errores de §5.5 aplicada
explícitamente aquí (no en el adaptador, que solo intenta una vez por
llamada, igual que `DeterministicAdapter`/`invoke()` separan "ejecutar" de
"decidir qué hacer si falla"):

```
Error de ElevenLabs (STT o TTS)
  → reintento 1 inmediato
  → reintento 2 con backoff de 1s
  → si falla: registrar, avisar, conmutar a modo texto sin perder el turno
```

Los pasos de orquestación de texto puro (persistir `answer_text`, decidir la
siguiente pregunta, Guardián de Equidad, persistir el turno) son de B6
(`interview_sessions`/`interview_turns` no existen todavía) y no viven aquí a
propósito: la voz es transporte, no inteligencia (§5.1). El invocador (B6 o,
mientras tanto, `router.py`) decide qué hacer con el texto que entra y sale.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

from sqlalchemy.orm import Session

from app.ai.voice import quota
from app.ai.voice.adapters.elevenlabs import ElevenLabsAdapter
from app.ai.voice.ports import STTPort, TTSPort, VoiceSynthesisError
from app.config import Settings, get_settings

Persona = Literal["profiler", "interviewer"]

# docs/05 §5.5: "reintento 1 inmediato, reintento 2 con backoff de 1s" ->
# 3 intentos totales (el original + 2 reintentos), backoff solo antes del último.
_MAX_ATTEMPTS = 3
_BACKOFF_SECONDS = 1.0


@dataclass(frozen=True)
class TTSOutcome:
    mode: Literal["audio", "text"]
    characters_used: int
    character_budget: int
    voice_id: str | None = None
    audio_chunks: AsyncIterator[bytes] | None = None
    message: str | None = None


@dataclass(frozen=True)
class STTOutcome:
    status: Literal["OK", "TRANSCRIPTION_FAILED"]
    transcript: str
    message: str | None = None


async def _split_first_chunk(
    generator: AsyncIterator[bytes],
) -> tuple[bytes, AsyncIterator[bytes]]:
    """Fuerza la conexión a abrirse (primer chunk) para poder decidir reintento.

    Una vez que el primer byte llegó, asumimos la llamada exitosa a efectos de
    presupuesto: ElevenLabs ya procesó el texto. Un corte de red a mitad del
    audio ya en tránsito al navegador no es retransmisible de forma
    transparente (el navegador ya empezó a reproducir); ese es un límite
    conocido y documentado, no cubierto por los reintentos de este módulo.
    """

    first_chunk = await generator.__anext__()

    async def _rest() -> AsyncIterator[bytes]:
        yield first_chunk
        async for chunk in generator:
            yield chunk

    return first_chunk, _rest()


class VoiceGateway:
    def __init__(self, adapter: STTPort | TTSPort, settings: Settings | None = None) -> None:
        self._adapter = adapter
        self._settings = settings or get_settings()

    def voice_id_for(self, persona: Persona) -> str:
        voice_id = (
            self._settings.tts_voice_profiler
            if persona == "profiler"
            else self._settings.tts_voice_interviewer
        )
        if not voice_id:
            raise ValueError(
                f"TTS_VOICE_{'PROFILER' if persona == 'profiler' else 'INTERVIEWER'} "
                "no está configurado en .env."
            )
        return voice_id

    async def speak_question(
        self,
        db: Session,
        *,
        text: str,
        persona: Persona,
        turn_id: str | None = None,
    ) -> TTSOutcome:
        """Sintetiza `text` en streaming, o conmuta a texto sin perder el turno.

        La pregunta **siempre** se muestra también en texto (§5.3): esta
        función nunca decide eso, solo si además hay audio. Se llama incluso
        cuando el resultado va a ser texto, para que el llamador reciba
        siempre la misma forma de respuesta.
        """

        status = quota.get_quota_status(db, self._settings)
        if not status.voice_available:
            return TTSOutcome(
                mode="text",
                characters_used=status.characters_used,
                character_budget=status.character_budget,
                message=status.reason,
            )

        voice_id = self.voice_id_for(persona)
        last_error: Exception | None = None

        for attempt in range(_MAX_ATTEMPTS):
            if attempt == _MAX_ATTEMPTS - 1:
                await asyncio.sleep(_BACKOFF_SECONDS)
            try:
                generator = self._adapter.stream(text, voice_id)  # type: ignore[union-attr]
                first_chunk, rest = await _split_first_chunk(generator)
            except (VoiceSynthesisError, StopAsyncIteration) as exc:
                last_error = exc
                continue

            del first_chunk  # ya incluido en `rest`, solo forzaba la conexión
            quota.record_usage(
                db,
                characters=len(text),
                persona=persona,
                voice_id=voice_id,
                status="SUCCESS",
                turn_id=turn_id,
            )
            new_status = quota.get_quota_status(db, self._settings)
            return TTSOutcome(
                mode="audio",
                characters_used=new_status.characters_used,
                character_budget=new_status.character_budget,
                voice_id=voice_id,
                audio_chunks=rest,
            )

        # Los 3 intentos fallaron: registrar, avisar, conmutar a texto. El
        # turno en curso no se pierde — quien llama ya tiene el texto de la
        # pregunta y solo deja de tener audio para ella (§5.5).
        quota.record_usage(
            db,
            characters=len(text),
            persona=persona,
            voice_id=voice_id,
            status="PROVIDER_FAILED",
            turn_id=turn_id,
        )
        status_after = quota.get_quota_status(db, self._settings)
        return TTSOutcome(
            mode="text",
            characters_used=status_after.characters_used,
            character_budget=status_after.character_budget,
            message=(
                "No pudimos usar el audio en este momento; puedes continuar escribiendo. "
                f"({last_error})"
            ),
        )

    async def transcribe_answer(
        self,
        db: Session,
        *,
        audio: bytes,
        language: str | None = None,
        turn_id: str | None = None,
    ) -> STTOutcome:
        """Transcribe `audio`, con el mismo esquema de reintento de `speak_question`.

        Si falla tras los 3 intentos, el audio ya capturado se conserva (el
        router lo guarda para auditoría independientemente del resultado de
        STT, §5.6) y el turno se marca `TRANSCRIPTION_FAILED`: se le pide al
        candidato repetir por escrito, **sin** consumir presupuesto de
        preguntas (docs/05 §5.5, último párrafo).
        """

        language = language or self._settings.stt_language

        if not self._settings.voice_enabled or not self._settings.elevenlabs_api_key or self._adapter is None:
            return STTOutcome(
                status="TRANSCRIPTION_FAILED",
                transcript="",
                message="La voz no está disponible; escribe tu respuesta.",
            )

        last_error: Exception | None = None

        for attempt in range(_MAX_ATTEMPTS):
            if attempt == _MAX_ATTEMPTS - 1:
                await asyncio.sleep(_BACKOFF_SECONDS)
            try:
                transcription = await self._adapter.transcribe(audio, language=language)  # type: ignore[union-attr]
            except VoiceSynthesisError as exc:
                last_error = exc
                continue
            return STTOutcome(status="OK", transcript=transcription.text)

        # `turn_id` no se usa aquí: el router es quien liga el audio guardado
        # al turno (§5.6); esta función solo decide si la transcripción sirve.
        return STTOutcome(
            status="TRANSCRIPTION_FAILED",
            transcript="",
            message=(
                "No pudimos usar el audio en este momento; puedes continuar escribiendo. "
                f"({last_error})"
            ),
        )


@lru_cache
def _real_adapter() -> ElevenLabsAdapter:
    settings = get_settings()
    return ElevenLabsAdapter(
        api_key=settings.elevenlabs_api_key,
        stt_model=settings.stt_model,
        tts_model=settings.tts_model,
        output_format=settings.tts_output_format,
        timeout_seconds=float(settings.llm_timeout_seconds),
    )


def get_voice_gateway() -> VoiceGateway:
    """Dependencia de FastAPI: gateway real contra ElevenLabs.

    `tests/test_voice.py` la reemplaza con `app.dependency_overrides` (mismo
    patrón que `get_db`), inyectando un `FakeVoiceAdapter` que nunca toca la
    red ni gasta caracteres reales.
    """

    settings = get_settings()
    if not settings.elevenlabs_api_key:
        # Sin credencial no se puede construir el adaptador real; el gateway
        # igual es utilizable porque `speak_question` revisa `voice_available`
        # (que ya es `False` sin API key, ver `quota.get_quota_status`) antes
        # de tocar `self._adapter`.
        return VoiceGateway(adapter=None, settings=settings)  # type: ignore[arg-type]
    return VoiceGateway(adapter=_real_adapter(), settings=settings)
