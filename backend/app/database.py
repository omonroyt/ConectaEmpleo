"""Engine y sesión de SQLAlchemy.

Decisión (documentada también en `backend/README.md`): engine **síncrono**,
no async. FastAPI ejecuta las dependencias síncronas en un threadpool, así que
no se pierde concurrencia real para el volumen de un hackatón, y a cambio se
gana: menos superficie de conceptos (nada de `async with`, `AsyncSession`,
greenlets de psycopg), stack traces más simples de depurar bajo presión de
tiempo, y compatibilidad directa con herramientas que asumen sync (Alembic
autogenerate, scripts de seed ejecutados con `python -m`). Si el volumen real
de producción lo justifica más adelante, migrar a `create_async_engine` +
`AsyncSession` es un cambio contenido a este archivo y a las dependencias que
usan `get_db`.
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

engine = create_engine(settings.database_url, pool_pre_ping=True, future=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
