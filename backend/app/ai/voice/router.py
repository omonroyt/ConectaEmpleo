"""Transporte HTTP de la capa de voz (docs/build/02_API_CONTRACT.md §6, tarea B12 sección C).

`WS /interviews/{id}/voice` de docs/05 §5.3 se simplifica a dos endpoints
HTTP streaming — decisión explícita de la tarea ("WebSocket solo si sobra
tiempo; el streaming HTTP es suficiente y más simple de depurar"):

- `POST /voice/tts`: streaming de audio (`audio/mpeg`) o, si la cuota se
  agotó / ElevenLabs falló tras reintentos, un JSON `{"mode": "text", ...}`
  con el mismo estado que expone `GET /voice/quota`. El front distingue por
  `Content-Type`, no por código HTTP: ninguno de los dos casos es un error,
  son dos modos válidos de responder la misma pregunta (§5.1, "la pregunta
  siempre se muestra también en texto").
- `POST /voice/stt`: transcribe un audio subido. Nunca revienta si falla:
  responde `TRANSCRIPTION_FAILED` con `transcript=""` para que el candidato
  repita por escrito sin perder el turno ni gastar presupuesto de preguntas.
  El audio recibido se guarda para auditoría (§5.6) reutilizando el
  `StoragePort` de `app/modules/documents` ya existente — **sin** crear una
  fila `Document`/ligarlo a un `interview_turn`, porque esa tabla es de B6
  (todavía `PENDING`); se guarda bajo un nombre que codifica `turn_id` para
  que B6 pueda migrarlo a una FK real sin perder el archivo. Nunca se envía
  al evaluador (invariante de docs/05 §10.2, A3 solo ve transcripción).
- `GET /voice/quota`: para que la interfaz avise antes de que la voz
  desaparezca a media sesión (docs/build/06_INTERVIEW_SYSTEM.md §9).
"""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.ai.voice import quota
from app.ai.voice.gateway import VoiceGateway, get_voice_gateway
from app.ai.voice.schemas import STTResponse, TTSRequest, VoiceQuota
from app.core.security import require_candidate
from app.database import get_db
from app.modules.identity.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/voice", tags=["voice"])


@router.get("/quota", response_model=VoiceQuota)
def get_quota(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_candidate),
) -> VoiceQuota:
    del current_user  # requiere sesión válida; no se usa el perfil en sí
    status = quota.get_quota_status(db)
    return VoiceQuota(
        characters_used=status.characters_used,
        character_budget=status.character_budget,
        threshold_pct=status.threshold_pct,
        budget_used_pct=status.budget_used_pct,
        voice_available=status.voice_available,
        reason=status.reason,
    )


@router.post("/tts", response_model=None)
async def synthesize_tts(
    payload: TTSRequest,
    db: Session = Depends(get_db),
    gateway: VoiceGateway = Depends(get_voice_gateway),
    current_user: User = Depends(require_candidate),
) -> StreamingResponse | JSONResponse:
    del current_user
    outcome = await gateway.speak_question(
        db, text=payload.text, persona=payload.persona, turn_id=payload.turn_id
    )
    if outcome.mode == "text" or outcome.audio_chunks is None:
        return JSONResponse(
            {
                "mode": "text",
                "message": outcome.message,
                "characters_used": outcome.characters_used,
                "character_budget": outcome.character_budget,
            }
        )
    return StreamingResponse(
        outcome.audio_chunks,
        media_type="audio/mpeg",
        headers={"X-Voice-Mode": "audio", "X-Voice-Id": outcome.voice_id or ""},
    )


@router.post("/stt", response_model=STTResponse)
async def transcribe_stt(
    file: UploadFile = File(...),
    turn_id: str | None = Form(default=None),
    language: str | None = Form(default=None),
    db: Session = Depends(get_db),
    gateway: VoiceGateway = Depends(get_voice_gateway),
    current_user: User = Depends(require_candidate),
) -> STTResponse:
    audio = await file.read()

    _save_audio_for_audit(owner_user_id=current_user.id, turn_id=turn_id, audio=audio)

    outcome = await gateway.transcribe_answer(db, audio=audio, language=language, turn_id=turn_id)
    return STTResponse(status=outcome.status, transcript=outcome.transcript, message=outcome.message)


def _save_audio_for_audit(*, owner_user_id: uuid.UUID, turn_id: str | None, audio: bytes) -> None:
    """Guarda el audio del candidato solo para auditoría (§5.6), best-effort.

    Reutiliza `StoragePort`/`LocalStorageAdapter` de `app/modules/documents`
    (ya existe, `DOCUMENT_TYPES` ya incluye `AUDIO_ANSWER`) sin crear una fila
    `Document`: la FK a `interview_turns` no existe hasta B6, y crear una fila
    "huérfana" hoy solo para rellenarla después es más deuda que guardar el
    archivo con un nombre trazable y dejar que B6 la indexe. Nunca debe
    interrumpir la respuesta al candidato: cualquier fallo de storage se
    registra y se descarta.
    """

    if not audio:
        return
    try:
        from app.modules.documents.storage import get_storage

        storage = get_storage()
        filename = f"turn-{turn_id or 'unknown'}.webm"
        storage.save(owner_user_id=owner_user_id, doc_type="AUDIO_ANSWER", filename=filename, content=audio)
    except Exception:  # noqa: BLE001 — auditoría best-effort, nunca debe romper /voice/stt
        logger.exception("No se pudo guardar el audio de la respuesta para auditoría (turn_id=%s)", turn_id)
