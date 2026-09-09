"""`STTPort` y `TTSPort` — docs/05 §5.2, literal.

Protocols estructurales, no ABCs: cuestan diez líneas, mantienen la frontera
limpia entre "voz" y "los agentes A1/A2 que solo ven texto", y permiten
inyectar un doble en pruebas sin gastar audio real (§5.2). Un solo adaptador
real los implementa (`adapters/elevenlabs.py`); no se construyen adaptadores
alternativos (§0.1 — sin fallback de proveedor).

Nota deliberada sobre `stream`: ambos puertos declaran un método `stream` con
firmas distintas (STT: `audio_stream -> AsyncIterator[PartialTranscript]`;
TTS: `text, voice_id -> AsyncIterator[bytes]`). El propio pseudocódigo de
docs/05 §5.5 no implementa `STTPort.stream` en `ElevenLabsAdapter` — el
transporte elegido es streaming HTTP para TTS y batch para STT (WebSocket /
STT en vivo quedan fuera de alcance de B12 por decisión explícita de la
tarea: "streaming HTTP es suficiente y más simple de depurar"). Este módulo
sigue ese mismo criterio.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Protocol

from pydantic import BaseModel, Field


class Transcription(BaseModel):
    """Resultado de una transcripción batch (`STTPort.transcribe`)."""

    text: str
    language: str = "es"


class PartialTranscript(BaseModel):
    """Fragmento de una transcripción en vivo (`STTPort.stream`, fuera de alcance de B12)."""

    text: str
    is_final: bool = False


class VoiceSynthesisError(RuntimeError):
    """El proveedor de voz no pudo completar la operación (red, 4xx/5xx, timeout).

    Análoga a `AIProviderError` de `app/core/errors.py` para el `AIPort` de
    texto: la política de reintentos vive en `gateway.py`, no aquí. El
    adaptador solo intenta una vez por llamada y deja que quien lo invoque
    decida sobre reintentos/backoff (docs/05 §5.5).
    """


class STTPort(Protocol):
    async def transcribe(self, audio: bytes, language: str = "es") -> Transcription: ...

    async def stream(self, audio_stream: AsyncIterator[bytes]) -> AsyncIterator[PartialTranscript]:
        """Transcripción en vivo. Fuera de alcance de B12 (ver docstring del módulo)."""
        ...


class TTSPort(Protocol):
    async def synthesize(self, text: str, voice_id: str) -> bytes: ...

    async def stream(self, text: str, voice_id: str) -> AsyncIterator[bytes]: ...


class VoicePersona(BaseModel):
    """Un `voice_id` de ElevenLabs atado a un agente (§0.1: "Sofía"/"Daniel")."""

    name: str
    voice_id: str = Field(min_length=1)
