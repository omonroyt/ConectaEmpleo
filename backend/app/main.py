"""Bootstrap de FastAPI: CORS, routers, manejadores de error, `/health`."""

from __future__ import annotations

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.ai.voice.router import router as voice_router
from app.config import get_settings
from app.core.errors import register_error_handlers
from app.core.jobs import router as jobs_router
from app.core.logging import install_logging
from app.database import get_db
from app.modules.admin.router import router as admin_router
from app.modules.assessments.router import router as assessments_router
from app.modules.candidates.router import router as candidates_router
from app.modules.catalog.router import router as catalog_router
from app.modules.companies.router import router as companies_router
from app.modules.cv_builder.router import router as cv_builder_router
from app.modules.documents.router import router as documents_router
from app.modules.identity.router import router as identity_router
from app.modules.interviews.router import router as interviews_router
from app.modules.marketplace.router import router as marketplace_router
from app.modules.matching.router import router as matching_router
from app.modules.misc.router import router as misc_router
from app.modules.vacancies.router import router as vacancies_router

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
app.include_router(candidates_router, prefix=API_PREFIX)
app.include_router(documents_router, prefix=API_PREFIX)
app.include_router(cv_builder_router, prefix=API_PREFIX)
app.include_router(companies_router, prefix=API_PREFIX)
# `marketplace_router` DEBE registrarse antes que `vacancies_router`: expone
# `GET /vacancies/open`, que colisionaría con `GET /vacancies/{vacancy_id}`
# de `vacancies_router` si ese router matcheara primero (Starlette prueba
# rutas en orden de registro, no por especificidad). Ver docstring de
# `app/modules/marketplace/router.py`.
app.include_router(marketplace_router, prefix=API_PREFIX)
app.include_router(vacancies_router, prefix=API_PREFIX)
app.include_router(matching_router, prefix=API_PREFIX)
app.include_router(interviews_router, prefix=API_PREFIX)
app.include_router(assessments_router, prefix=API_PREFIX)
app.include_router(jobs_router, prefix=API_PREFIX)
app.include_router(voice_router, prefix=API_PREFIX)
app.include_router(misc_router, prefix=API_PREFIX)
app.include_router(admin_router, prefix=API_PREFIX)

if settings.storage_provider == "local":
    # Sirve los archivos de `LocalStorageAdapter` para que `DocumentRef.url` sea navegable
    # en desarrollo/demo. Sin autenticación (el nombre de archivo es un UUID no adivinable) —
    # aceptable para B3; `docs/04 §11` pide URLs firmadas de vida corta para producción real
    # con S3/Supabase, que es cuando ese `StoragePort` se implemente.
    import os

    os.makedirs(settings.storage_local_dir, exist_ok=True)
    app.mount("/storage", StaticFiles(directory=settings.storage_local_dir), name="storage")


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
