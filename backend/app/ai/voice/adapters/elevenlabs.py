"""`ElevenLabsAdapter` — único adaptador de voz (docs/05 §0.1, §5.5).

Scribe (`scribe_v1`) para STT, Flash v2.5 (`eleven_flash_v2_5`) para TTS,
**misma credencial, un solo cliente HTTP** (`httpx.AsyncClient`). No existen
`OpenAIRealtimeAdapter`, `DeepgramAdapter` ni `BrowserNativeAdapter`: si
ElevenLabs falla, la política de reintento/backoff/conmutación a texto vive
en `app/ai/voice/gateway.py` (separación deliberada: el adaptador intenta una
sola vez por llamada, igual que `DeterministicAdapter`/`invoke()` separan
"ejecutar la operación" de "decidir qué hacer si falla").

Parámetros fijados por docs/05 §5.5 (no configurables por request, solo por
`.env`): `output_format=mp3_22050_32`, `stability` 0.5-0.6, `speed` ~0.95,
`language_code=es` (solo STT). TTS siempre en streaming — `synthesize()`
existe por completar `TTSPort` pero internamente agrega el propio `stream()`,
nunca golpea un endpoint no-streaming.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import httpx

from app.ai.voice.ports import PartialTranscript, Transcription, VoiceSynthesisError

BASE_URL = "https://api.elevenlabs.io/v1"


class ElevenLabsAdapter:
    """Implementa `STTPort` y `TTSPort` contra la misma cuenta de ElevenLabs.

    `STTPort.stream` (transcripción en vivo) queda fuera de alcance de B12 a
    propósito (ver `app/ai/voice/ports.py`); llamarlo lanza
    `NotImplementedError` explícito en vez de fingir soporte.
    """

    def __init__(
        self,
        *,
        api_key: str,
        stt_model: str = "scribe_v1",
        tts_model: str = "eleven_flash_v2_5",
        output_format: str = "mp3_22050_32",
        stability: float = 0.55,
        speed: float = 0.95,
        timeout_seconds: float = 30.0,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        if not api_key:
            raise ValueError("ELEVENLABS_API_KEY vacío: no se puede construir ElevenLabsAdapter.")
        self._stt_model = stt_model
        self._tts_model = tts_model
        self._output_format = output_format
        self._stability = stability
        self._speed = speed
        self._client = client or httpx.AsyncClient(
            base_url=BASE_URL,
            headers={"xi-api-key": api_key},
            timeout=timeout_seconds,
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    # --- STTPort ---

    async def transcribe(self, audio: bytes, language: str = "es") -> Transcription:
        try:
            response = await self._client.post(
                "/speech-to-text",
                data={"model_id": self._stt_model, "language_code": language},
                files={"file": ("answer.webm", audio, "application/octet-stream")},
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise VoiceSynthesisError(f"ElevenLabs Scribe falló: {exc}") from exc

        payload = response.json()
        text = payload.get("text", "")
        return Transcription(text=text, language=language)

    async def stream_transcription(self, audio_stream: AsyncIterator[bytes]) -> AsyncIterator[PartialTranscript]:
        """`STTPort.stream` (transcripción en vivo): fuera de alcance de B12.

        Nombrado distinto de `stream` a propósito: `TTSPort.stream` también se
        llama `stream` y con otra firma, así que un método `stream` en esta
        clase solo puede resolver a uno de los dos protocolos (Python no tiene
        overloading real). El pseudocódigo de docs/05 §5.5 resuelve el mismo
        choque implementando únicamente el `stream` de TTS; aquí se deja
        explícito con un nombre propio en vez de dejarlo como sobrescritura
        silenciosa. `WS /interviews/{id}/voice` (STT en vivo) queda como
        punto de extensión si el tiempo alcanza (tarea B12, sección C).
        """
        raise NotImplementedError(
            "STT en vivo (streaming) no está implementado en B12; usa transcribe() (batch)."
        )
        yield  # pragma: no cover — hace de este método un generador

    # --- TTSPort ---

    async def synthesize(self, text: str, voice_id: str) -> bytes:
        chunks = [chunk async for chunk in self.stream(text, voice_id)]
        return b"".join(chunks)

    async def stream(self, text: str, voice_id: str) -> AsyncIterator[bytes]:
        url = f"/text-to-speech/{voice_id}/stream"
        params = {"output_format": self._output_format}
        payload = {
            "text": text,
            "model_id": self._tts_model,
            "voice_settings": {
                "stability": self._stability,
                "speed": self._speed,
            },
        }
        try:
            async with self._client.stream("POST", url, params=params, json=payload) as response:
                response.raise_for_status()
                async for chunk in response.aiter_bytes():
                    if chunk:
                        yield chunk
        except httpx.HTTPError as exc:
            raise VoiceSynthesisError(f"ElevenLabs Flash v2.5 falló: {exc}") from exc
