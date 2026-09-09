"""Bootstrap de FastAPI: CORS, routers, manejadores de error, `/health`."""

from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.errors import register_error_handlers
from app.core.logging import install_logging
from app.database import get_db
from app.modules.catalog.router import router as catalog_router
from app.modules.identity.router import router as identity_router

settings = get_settings()

app = FastAPI(
    title="Conecta Empleo API",
    version="0.1.0",
    debug=settings.environment == "local",
)

install_logging(app, settings.environment)
register_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"
app.include_router(identity_router, prefix=API_PREFIX)
app.include_router(catalog_router, prefix=API_PREFIX)
# Nota para B3: agregar aquí `app.modules.candidates.router` cuando exista
# (GET/PATCH /candidates/me, /status, documentos — fuera de alcance de B0-B2).


@app.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    try:
        db.execute(text("SELECT 1"))
        database_status = "up"
    except Exception:  # noqa: BLE001 — health check no debe propagar el error crudo
        database_status = "down"

    return {
        "status": "ok" if database_status == "up" else "degraded",
        "database": database_status,
        "environment": settings.environment,
    }
