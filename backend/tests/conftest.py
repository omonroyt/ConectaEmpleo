"""Fixtures de pytest.

Usa la misma base de Postgres de `docker-compose.yml` (no hay motor in-memory
razonable para JSONB de Postgres). Cada test corre dentro de una transacción
que se revierte al final, así que no ensucia datos entre tests ni requiere
una base separada. Los tests de catálogo asumen que `python -m app.seeds.run`
ya corrió (igual que exige el criterio de cierre de B0-B2).
"""

from __future__ import annotations

import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.database import engine, get_db
from app.main import app


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    connection = engine.connect()
    transaction = connection.begin()
    # `join_transaction_mode="create_savepoint"` hace que un `session.commit()`
    # dentro del servicio (ej. `register_user`) solo libere un SAVEPOINT interno,
    # sin terminar la transacción externa — así el rollback de abajo sí revierte
    # todo lo que el test escribió, incluida la data "commiteada" por el servicio.
    TestingSessionLocal = sessionmaker(
        bind=connection,
        autoflush=False,
        autocommit=False,
        future=True,
        join_transaction_mode="create_savepoint",
    )
    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def _override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture()
def unique_email() -> str:
    return f"test.{uuid.uuid4().hex[:10]}@demo.mx"
