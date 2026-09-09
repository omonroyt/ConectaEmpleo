"""Configuración centralizada vía pydantic-settings.

Lee de variables de entorno / `.env` (nunca de código). Cubre las variables de
`docs/04_Arquitectura_Tecnica_Backend.md` §13 más las de
`docs/05_Arquitectura_Sistema_Multiagente.md` §0.3 (IA y voz), aunque estas
últimas todavía no se usen en B0-B2 — se declaran ahora para que `.env.example`
sea completo desde el inicio y las tareas futuras no tengan que tocar este archivo.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Base de datos ---
    database_url: str = "postgresql+psycopg://conecta:conecta@localhost:5433/conecta"

    # --- Identidad / JWT ---
    jwt_secret: str = "change-me-in-every-environment"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # --- CORS ---
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # --- Entorno ---
    environment: Literal["local", "staging", "production"] = "local"

    # --- Almacenamiento ---
    storage_provider: Literal["local", "supabase", "s3"] = "local"
    storage_bucket: str = "conecta-empleo-documents"
    storage_local_dir: str = "./storage"

    # --- Capa de IA (doc 04 §6 / doc 05 §0.3) ---
    ai_adapter: Literal["deterministic", "agentic"] = "deterministic"
    ai_mode: Literal["live", "demo"] = "demo"
    llm_provider: str = "anthropic"
    llm_api_key: str = ""
    llm_model: str = "claude-sonnet-5"

    anthropic_api_key: str = ""
    openai_api_key: str = ""
    llm_primary_provider: str = "anthropic"
    llm_primary_model: str = "claude-sonnet-5"
    llm_failover_provider: str = "openai"
    llm_failover_model: str = "gpt-5.6-terra"
    llm_max_retries_primary: int = 2
    llm_timeout_seconds: int = 45
    llm_model_assessment: str = ""

    # --- Entrevista ---
    interview_question_budget: int = 12

    # --- Voz (ElevenLabs) ---
    voice_enabled: bool = False
    elevenlabs_api_key: str = ""
    stt_model: str = "scribe_v1"
    tts_model: str = "eleven_flash_v2_5"
    tts_voice_profiler: str = ""
    tts_voice_interviewer: str = ""
    stt_language: str = "es"
    tts_output_format: str = "mp3_22050_32"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
