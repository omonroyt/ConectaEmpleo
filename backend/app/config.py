"""Configuración centralizada vía pydantic-settings.

Lee de variables de entorno / `.env` (nunca de código). Cubre las variables de
`docs/04_Arquitectura_Tecnica_Backend.md` §13 más las de
`docs/05_Arquitectura_Sistema_Multiagente.md` §0.3 (IA y voz), aunque estas
últimas todavía no se usen en B0-B2 — se declaran ahora para que `.env.example`
sea completo desde el inicio y las tareas futuras no tengan que tocar este archivo.
"""

from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Base de datos ---
    database_url: str = "postgresql+psycopg://conecta:conecta@localhost:5433/conecta"

    @field_validator("database_url")
    @classmethod
    def _reject_foreign_database_url(cls, value: str) -> str:
        """Falla temprano y con un mensaje claro ante un `DATABASE_URL` heredado.

        `pydantic-settings` da prioridad a las variables del entorno sobre `.env`,
        así que un `DATABASE_URL` exportado por otro proyecto en la misma máquina
        secuestra la configuración de forma silenciosa. En este equipo ya ocurrió:
        había uno en formato JDBC apuntando a un Supabase ajeno. Sin esta
        validación el síntoma aparece mucho después y es difícil de diagnosticar.
        """
        url = value.strip()
        if url.startswith("jdbc:"):
            raise ValueError(
                "DATABASE_URL está en formato JDBC (empieza con 'jdbc:'), que "
                "SQLAlchemy no entiende. Casi siempre viene de una variable de "
                "entorno de otro proyecto que tiene prioridad sobre backend/.env. "
                "Revisa el valor con 'echo $DATABASE_URL' y expórtalo como "
                "'postgresql+psycopg://usuario:clave@host:puerto/base'."
            )
        if not url.startswith("postgresql"):
            raise ValueError(
                "DATABASE_URL debe apuntar a PostgreSQL "
                "('postgresql+psycopg://...'). El modelo de datos usa columnas "
                f"JSONB, así que otros motores no sirven. Valor recibido: {url!r}"
            )
        return url

    # --- Identidad / JWT ---
    jwt_secret: str = "change-me-in-every-environment"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # --- CORS ---
    # :5183 es el puerto fijo que usa `frontend/scripts/e2e-smoke.mjs` (Playwright)
    # para no chocar con un `vite` de desarrollo ya corriendo en :5173 -- B13
    # (`E2E_TARGET=http`) necesita que el backend real también lo acepte.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5183,http://127.0.0.1:5183"

    # --- Entorno ---
    environment: Literal["local", "staging", "production"] = "local"

    # --- Almacenamiento ---
    storage_provider: Literal["local", "supabase", "s3"] = "local"
    storage_bucket: str = "conecta-empleo-documents"
    storage_local_dir: str = "./storage"

    # --- Capa de IA (doc 04 §6 / doc 05 §0.3) ---
    ai_adapter: Literal["deterministic", "agentic"] = "deterministic"
    # docs/build/06_INTERVIEW_SYSTEM.md §9: "AI_MODE=live por defecto, con demo
    # como respaldo conmutable en caliente". `live` por sí solo no activa el
    # AgenticAdapter -- eso lo sigue decidiendo `ai_adapter`/`ai_adapter_*`; lo
    # único que fuerza `deterministic` sin excepción es `ai_mode == "demo"`
    # (ver app/ai/registry.py).
    ai_mode: Literal["live", "demo"] = "live"
    # Overrides por grupo de operación (docs/04 §6.4): None = usa `ai_adapter`.
    # Grupos (ver app/ai/registry.py): cv, interview, assessment, advisory, matching.
    ai_adapter_cv: Literal["deterministic", "agentic"] | None = None
    ai_adapter_interview: Literal["deterministic", "agentic"] | None = None
    ai_adapter_assessment: Literal["deterministic", "agentic"] | None = None
    ai_adapter_advisory: Literal["deterministic", "agentic"] | None = None
    ai_adapter_matching: Literal["deterministic", "agentic"] | None = None
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
    # Temperatura y máximo de tokens SOLO desde configuración (B11, regla no
    # negociable de backend/CLAUDE.md: nunca un literal en el código). Default
    # general moderado para A1/A2/A4/A5; A3 (evaluador) usa una temperatura
    # baja a propósito (docs/05 §7 A3: "Temperatura: baja (0.0-0.2)") y un
    # límite de tokens mayor porque puede evaluar hasta 14 competencias en una
    # sola respuesta estructurada.
    llm_temperature: float = 0.3
    llm_temperature_assessment: float = 0.1
    llm_max_tokens: int = 4096
    llm_max_tokens_assessment: int = 8192

    # --- Entrevista (docs/build/06_INTERVIEW_SYSTEM.md §5) ---
    # 14 = 7 HARD + 7 SOFT (recorrido completo). En modo demo se recorta a 3+3
    # (ver `interview_demo_mode`) y el perfil resultante se marca `coverage="PARTIAL"`.
    interview_question_budget: int = 14
    interview_demo_mode: bool = False
    # 1 recomendado, 2 solo ante inconsistencia o ambigüedad grave (docs/build/06 §5).
    interview_max_followups_per_question: int = 2

    # --- Voz (ElevenLabs) ---
    voice_enabled: bool = False
    elevenlabs_api_key: str = ""
    stt_model: str = "scribe_v1"
    tts_model: str = "eleven_flash_v2_5"
    tts_voice_profiler: str = ""
    tts_voice_interviewer: str = ""
    stt_language: str = "es"
    tts_output_format: str = "mp3_22050_32"
    # Salvaguarda de cuota (B12, obligatoria — docs/build/06_INTERVIEW_SYSTEM.md §9):
    # la cuenta tiene 10,000 caracteres payg. Al llegar a `tts_quota_threshold_pct`
    # del presupuesto, la voz se apaga y la sesión conmuta a texto avisando, en vez
    # de fallar a mitad de una demo.
    tts_character_budget: int = 10000
    tts_quota_threshold_pct: float = 0.85

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
