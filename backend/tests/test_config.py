"""`Settings` listo para producción: `JWT_SECRET` fuerte y `DATABASE_URL` de Railway tal cual.

No toca la base de datos: construye `Settings` directamente, sin leer
`backend/.env` (`_env_file=None`) y con un `DATABASE_URL` válido explícito, para
no depender del entorno de quien corre la suite.
"""

import pytest
from pydantic import ValidationError

from app.config import DEV_JWT_SECRET, Settings

_DATABASE_URL = "postgresql+psycopg://conecta:conecta@localhost:5433/conecta"


def _settings(**overrides: object) -> Settings:
    return Settings(_env_file=None, database_url=_DATABASE_URL, **overrides)


def test_production_rejects_the_example_jwt_secret() -> None:
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        _settings(environment="production", jwt_secret=DEV_JWT_SECRET)


def test_production_rejects_a_short_jwt_secret() -> None:
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        _settings(environment="production", jwt_secret="corto-pero-no-de-ejemplo")


def test_production_accepts_a_long_jwt_secret() -> None:
    secret = "s" * 48
    assert _settings(environment="production", jwt_secret=secret).jwt_secret == secret


def test_local_keeps_the_example_secret() -> None:
    assert _settings(environment="local", jwt_secret=DEV_JWT_SECRET).jwt_secret == DEV_JWT_SECRET


@pytest.mark.parametrize("bare_scheme", ["postgresql://", "postgres://"])
def test_database_url_without_driver_gets_psycopg(bare_scheme: str) -> None:
    settings = Settings(_env_file=None, database_url=f"{bare_scheme}u:p@postgres.railway.internal:5432/railway")
    assert settings.database_url == "postgresql+psycopg://u:p@postgres.railway.internal:5432/railway"
