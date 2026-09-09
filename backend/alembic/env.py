from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import get_settings
from app.database import Base

# Importar todos los modelos para que `Base.metadata` los conozca y
# `alembic revision --autogenerate` los detecte.
from app.ai import models as ai_models  # noqa: F401
from app.ai.voice import models as ai_voice_models  # noqa: F401
from app.core.jobs import Job  # noqa: F401
from app.modules.candidates import models as candidates_models  # noqa: F401
from app.modules.catalog import models as catalog_models  # noqa: F401
from app.modules.companies import models as companies_models  # noqa: F401
from app.modules.cv_builder import models as cv_builder_models  # noqa: F401
from app.modules.documents import models as documents_models  # noqa: F401
from app.modules.identity import models as identity_models  # noqa: F401
from app.modules.vacancies import models as vacancies_models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# La URL real viene siempre de la configuración de la app (variable de entorno
# DATABASE_URL), nunca del valor fijo de alembic.ini.
config.set_main_option("sqlalchemy.url", get_settings().database_url)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
