"""Tests simulados de la capa de voz (B12) — cliente HTTP a ElevenLabs *nunca* real.

Cubre el criterio de cierre 1 de la tarea:
- un fallo de TTS reintenta 2 veces (con backoff) y conmuta a texto sin perder el turno;
- un éxito tras un fallo previo también cuenta como reintento útil;
- el contador de caracteres persistido suma correctamente;
- al 85 % del presupuesto la voz se desactiva y `GET /voice/quota` lo refleja;
- `EvaluationRequest` (A3, texto puro) no admite audio.

Ningún test de este archivo llama a `httpx` de verdad: `ScriptedTTSAdapter` /
`ScriptedSTTAdapter` son dobles en memoria inyectados vía
`VoiceGateway(adapter=...)` o `app.dependency_overrides[get_voice_gateway]`
(mismo patrón que `get_db` en `conftest.py`). La única llamada real a
ElevenLabs vive en `tests/test_voice_live_elevenlabs.py`, aparte y con guard
explícito para no gastar cuota en cada corrida de `pytest -q`.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.ai.contracts.assessment import EvaluationRequest
from app.ai.contracts.base import TurnDTO
from app.ai.voice import quota
from app.ai.voice.gateway import VoiceGateway, get_voice_gateway
from app.ai.voice.models import TTSUsageEvent
from app.ai.voice.ports import Transcription, VoiceSynthesisError
from app.config import Settings, get_settings
from app.main import app


def _voice_settings(**overrides: object) -> Settings:
    base = get_settings()
    return base.model_copy(
        update={
            "voice_enabled": True,
            "elevenlabs_api_key": "test-key-not-real",
            "tts_voice_profiler": "voice-sofia",
            "tts_voice_interviewer": "voice-daniel",
            "tts_character_budget": 1000,
            "tts_quota_threshold_pct": 0.85,
            **overrides,
        }
    )


class ScriptedTTSAdapter:
    """Doble de `TTSPort`: cada llamada a `stream()` consume un elemento del guion.

    Un elemento `Exception` hace que el generador falle en el primer
    `__anext__()` (antes de ceder ningún byte); un `bytes` se cede como único
    chunk. Nunca abre una conexión real.
    """

    def __init__(self, script: list[Exception | bytes]) -> None:
        self._script = list(script)
        self.calls = 0

    async def stream(self, text: str, voice_id: str) -> AsyncIterator[bytes]:
        self.calls += 1
        if not self._script:
            raise AssertionError("ScriptedTTSAdapter: más llamadas de las guionadas")
        outcome = self._script.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        yield outcome

    async def synthesize(self, text: str, voice_id: str) -> bytes:  # pragma: no cover — no usado por el gateway
        raise NotImplementedError


class ScriptedSTTAdapter:
    def __init__(self, script: list[Exception | Transcription]) -> None:
        self._script = list(script)
        self.calls = 0

    async def transcribe(self, audio: bytes, language: str = "es") -> Transcription:
        self.calls += 1
        if not self._script:
            raise AssertionError("ScriptedSTTAdapter: más llamadas de las guionadas")
        outcome = self._script.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


async def _drain(chunks: AsyncIterator[bytes]) -> bytes:
    out = b""
    async for chunk in chunks:
        out += chunk
    return out


# --- Reintentos + conmutación a texto sin perder el turno ---


async def test_tts_retries_once_and_succeeds_on_second_attempt(db_session: Session) -> None:
    settings = _voice_settings()
    adapter = ScriptedTTSAdapter([VoiceSynthesisError("500 boom"), b"audio-bytes"])
    gateway = VoiceGateway(adapter=adapter, settings=settings)

    outcome = await gateway.speak_question(db_session, text="Hola, comencemos.", persona="interviewer")

    assert outcome.mode == "audio"
    assert adapter.calls == 2  # 1 intento fallido + 1 reintento inmediato exitoso
    assert await _drain(outcome.audio_chunks) == b"audio-bytes"
    assert quota.characters_used(db_session) == len("Hola, comencemos.")


async def test_tts_fails_all_three_attempts_and_switches_to_text_without_losing_turn(
    db_session: Session,
) -> None:
    settings = _voice_settings()
    adapter = ScriptedTTSAdapter(
        [
            VoiceSynthesisError("timeout 1"),
            VoiceSynthesisError("timeout 2"),
            VoiceSynthesisError("timeout 3"),
        ]
    )
    gateway = VoiceGateway(adapter=adapter, settings=settings)

    outcome = await gateway.speak_question(
        db_session, text="Pregunta que no se pierde.", persona="profiler", turn_id="HA-01"
    )

    # 2 reintentos (docs/05 §5.5): 1 original + 2 reintentos = 3 intentos totales.
    assert adapter.calls == 3
    assert outcome.mode == "text"
    assert outcome.audio_chunks is None
    assert outcome.message is not None

    # El "turno" es el texto de la pregunta: el gateway nunca lo pierde, solo
    # deja de tener audio para él — el texto siempre estuvo disponible antes
    # incluso de llamar a speak_question (§5.3: "la pregunta siempre se
    # muestra también en texto"). Aquí verificamos la mitad que sí es
    # responsabilidad de este módulo: el fallo queda registrado para
    # auditoría y NO cuenta contra el presupuesto de caracteres (no se generó
    # audio, ElevenLabs no lo factura).
    events = db_session.query(TTSUsageEvent).filter(TTSUsageEvent.turn_id == "HA-01").all()
    assert len(events) == 1
    assert events[0].status == "PROVIDER_FAILED"
    assert quota.characters_used(db_session) == 0


async def test_stt_switches_to_transcription_failed_after_three_attempts(db_session: Session) -> None:
    settings = _voice_settings()
    adapter = ScriptedSTTAdapter(
        [
            VoiceSynthesisError("net 1"),
            VoiceSynthesisError("net 2"),
            VoiceSynthesisError("net 3"),
        ]
    )
    gateway = VoiceGateway(adapter=adapter, settings=settings)

    outcome = await gateway.transcribe_answer(db_session, audio=b"fake-webm-bytes")

    assert adapter.calls == 3
    assert outcome.status == "TRANSCRIPTION_FAILED"
    assert outcome.transcript == ""


async def test_stt_succeeds_without_retry_when_first_attempt_works(db_session: Session) -> None:
    settings = _voice_settings()
    adapter = ScriptedSTTAdapter([Transcription(text="quiero postularme", language="es")])
    gateway = VoiceGateway(adapter=adapter, settings=settings)

    outcome = await gateway.transcribe_answer(db_session, audio=b"fake-webm-bytes")

    assert adapter.calls == 1
    assert outcome.status == "OK"
    assert outcome.transcript == "quiero postularme"


# --- Contador de caracteres persistido ---


def test_character_counter_sums_only_successful_synthesis(db_session: Session) -> None:
    quota.record_usage(db_session, characters=40, persona="profiler", voice_id="v1", status="SUCCESS")
    quota.record_usage(db_session, characters=60, persona="interviewer", voice_id="v2", status="SUCCESS")
    quota.record_usage(db_session, characters=999, persona="interviewer", voice_id="v2", status="PROVIDER_FAILED")

    assert quota.characters_used(db_session) == 100


def test_character_counter_accumulates_across_multiple_calls(db_session: Session) -> None:
    for _ in range(5):
        quota.record_usage(db_session, characters=20, persona="profiler", voice_id="v1", status="SUCCESS")
    assert quota.characters_used(db_session) == 100


# --- Corte automático al 85 % del presupuesto ---


def test_quota_status_flags_unavailable_at_85_percent_threshold(db_session: Session) -> None:
    settings = _voice_settings(tts_character_budget=1000, tts_quota_threshold_pct=0.85)

    quota.record_usage(db_session, characters=849, persona="profiler", voice_id="v1", status="SUCCESS")
    status_before = quota.get_quota_status(db_session, settings)
    assert status_before.voice_available is True

    quota.record_usage(db_session, characters=1, persona="profiler", voice_id="v1", status="SUCCESS")  # -> 850 = 85%
    status_after = quota.get_quota_status(db_session, settings)
    assert status_after.characters_used == 850
    assert status_after.voice_available is False
    assert status_after.reason is not None


async def test_speak_question_switches_to_text_when_quota_already_exhausted_without_calling_adapter(
    db_session: Session,
) -> None:
    settings = _voice_settings(tts_character_budget=100, tts_quota_threshold_pct=0.85)
    quota.record_usage(db_session, characters=90, persona="interviewer", voice_id="v1", status="SUCCESS")

    adapter = ScriptedTTSAdapter([])  # cualquier llamada revienta el test (AssertionError)
    gateway = VoiceGateway(adapter=adapter, settings=settings)

    outcome = await gateway.speak_question(db_session, text="Pregunta corta.", persona="interviewer")

    assert outcome.mode == "text"
    assert adapter.calls == 0  # el corte ocurre ANTES de tocar la red, ahorra cuota real
    assert quota.characters_used(db_session) == 90  # sin cambios: no se intentó sintetizar


def test_get_voice_quota_endpoint_reflects_the_cutoff(client: TestClient, db_session: Session, unique_email: str) -> None:
    resp = client.post(
        "/api/v1/auth/register", json={"email": unique_email, "password": "demo1234", "role": "CANDIDATE"}
    )
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    settings = get_settings()
    budget = settings.tts_character_budget
    threshold = settings.tts_quota_threshold_pct
    cutoff_characters = int(budget * threshold) + 1
    quota.record_usage(
        db_session, characters=cutoff_characters, persona="interviewer", voice_id="v1", status="SUCCESS"
    )

    resp = client.get("/api/v1/voice/quota", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["characters_used"] == cutoff_characters
    assert body["character_budget"] == budget
    assert body["voice_available"] is False
    assert body["reason"]


def test_voice_tts_endpoint_returns_json_text_mode_when_voice_unavailable(
    client: TestClient, db_session: Session, unique_email: str
) -> None:
    resp = client.post(
        "/api/v1/auth/register", json={"email": unique_email, "password": "demo1234", "role": "CANDIDATE"}
    )
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    settings = get_settings()
    cutoff = int(settings.tts_character_budget * settings.tts_quota_threshold_pct) + 1
    quota.record_usage(db_session, characters=cutoff, persona="interviewer", voice_id="v1", status="SUCCESS")

    def _fake_gateway() -> VoiceGateway:
        return VoiceGateway(adapter=ScriptedTTSAdapter([]), settings=settings)

    app.dependency_overrides[get_voice_gateway] = _fake_gateway
    try:
        resp = client.post(
            "/api/v1/voice/tts",
            json={"text": "Hola, comencemos la entrevista.", "persona": "interviewer"},
            headers=headers,
        )
    finally:
        app.dependency_overrides.pop(get_voice_gateway, None)

    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("application/json")
    body = resp.json()
    assert body["mode"] == "text"


def test_voice_tts_endpoint_streams_audio_when_available(
    client: TestClient, db_session: Session, unique_email: str
) -> None:
    resp = client.post(
        "/api/v1/auth/register", json={"email": unique_email, "password": "demo1234", "role": "CANDIDATE"}
    )
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    settings = _voice_settings()

    def _fake_gateway() -> VoiceGateway:
        return VoiceGateway(adapter=ScriptedTTSAdapter([b"chunk-1"]), settings=settings)

    app.dependency_overrides[get_voice_gateway] = _fake_gateway
    try:
        resp = client.post(
            "/api/v1/voice/tts",
            json={"text": "Hola, comencemos la entrevista.", "persona": "interviewer"},
            headers=headers,
        )
    finally:
        app.dependency_overrides.pop(get_voice_gateway, None)

    assert resp.status_code == 200
    assert resp.headers["content-type"] == "audio/mpeg"
    assert resp.content == b"chunk-1"
    assert quota.characters_used(db_session) == len("Hola, comencemos la entrevista.")


# --- Invariante de docs/05 §10.2: A3 evalúa transcripción, jamás audio ---


def test_evaluation_request_has_no_audio_field_at_all() -> None:
    field_names = set(EvaluationRequest.model_fields) | set(TurnDTO.model_fields)
    audio_like = {name for name in field_names if "audio" in name.lower()}
    assert audio_like == set(), f"EvaluationRequest/TurnDTO no deben declarar campos de audio: {audio_like}"


def test_evaluation_request_rejects_audio_as_extra_field() -> None:
    valid_turn = {
        "turn_id": "HA-01",
        "sequence": 1,
        "question_text": "Cuéntame de una tarea en Excel.",
        "target_competency_code": "ADMIN_HA_01",
        "question_intent": "SCENARIO",
        "answer_text": "Concilié un inventario con fórmulas.",
    }

    with pytest.raises(ValidationError):
        TurnDTO(**valid_turn, audio_url="https://example.com/answer.webm")

    with pytest.raises(ValidationError):
        EvaluationRequest(
            session_id="sess-1",
            job_family_code="ADMIN_ASSISTANT",
            transcript=[TurnDTO(**valid_turn)],
            rubrics=[],
            audio_bytes=b"not-allowed",
        )
