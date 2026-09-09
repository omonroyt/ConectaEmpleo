"""Capa de voz (B12) — `docs/05_Arquitectura_Sistema_Multiagente.md` §5, §0.1, §0.3.

La voz es transporte, no inteligencia (§5.1): A1/A2 producen y consumen texto
puro; este paquete traduce texto <-> audio contra ElevenLabs y nada más. Ningún
prompt vive aquí, ningún agente conoce este paquete.

Piezas:
- `ports.py`: `STTPort`/`TTSPort` (Protocols, §5.2).
- `adapters/elevenlabs.py`: único adaptador real, Scribe + Flash v2.5.
- `models.py`: `TTSUsageEvent`, el contador persistido de caracteres (§9 de
  `docs/build/06_INTERVIEW_SYSTEM.md`).
- `quota.py`: presupuesto de caracteres y corte al 85 % (obligatorio, no opcional).
- `gateway.py`: ciclo de turno de §5.3 — reintentos, backoff y conmutación a
  texto sin perder el turno en curso (§5.5, "manejo de errores sin fallback").
- `router.py`: transporte HTTP que consume el frontend (`POST /voice/tts`,
  `POST /voice/stt`, `GET /voice/quota`).
"""
