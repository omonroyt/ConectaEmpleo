"""`Settings`: producción no arranca con un `JWT_SECRET` débil.

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
