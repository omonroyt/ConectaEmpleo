"""`StoragePort` y `LocalStorageAdapter` (docs/04 §5.3, §11).

`StoragePort` es la única abstracción que el resto del backend conoce. Hoy
solo existe `LocalStorageAdapter` (filesystem local, bajo `STORAGE_LOCAL_DIR`).
La ruta a S3/Supabase queda preparada pero **no implementada**: cuando exista,
solo hace falta un nuevo adaptador que cumpla `StoragePort` y una selección
por `STORAGE_PROVIDER` en `get_storage()`, sin tocar `documents/service.py`.

Nombre de archivo siempre reescrito a UUID (docs/04 §11): nunca se confía en
el nombre que subió el usuario, ni para guardarlo ni para servirlo.
"""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Protocol

from app.config import Settings, get_settings


class StoragePort(Protocol):
    def save(self, *, owner_user_id: uuid.UUID, doc_type: str, filename: str, content: bytes) -> str:
        """Persiste `content` y devuelve el `storage_key` con el que se puede recuperar después."""
        ...

    def load(self, storage_key: str) -> bytes:
        """Lee de vuelta el contenido guardado bajo `storage_key` (B5: extracción real de texto)."""
        ...

    def save_text(self, *, owner_user_id: uuid.UUID, doc_type: str, filename: str, text: str) -> str:
        """Guarda `text` (utf-8) y devuelve el `storage_key`. Usado por el CV descargable de B5."""
        ...

    def url_for(self, storage_key: str) -> str | None:
        """URL pública (o `None` si el adaptador no puede exponer una)."""
        ...

    def delete(self, storage_key: str) -> None: ...


class LocalStorageAdapter:
    """Filesystem local bajo `settings.storage_local_dir`, organizado por usuario y tipo.

    `storage_key` es una ruta relativa (`{owner_user_id}/{doc_type}/{uuid}{ext}`)
    que también sirve como sufijo de URL cuando `app.main` monta `/storage`
    como archivos estáticos (solo en `environment=local`; ver nota en `app/main.py`).
    """

    def __init__(self, base_dir: str | Path, *, public_prefix: str = "/storage") -> None:
        self._base_dir = Path(base_dir)
        self._base_dir.mkdir(parents=True, exist_ok=True)
        self._public_prefix = public_prefix.rstrip("/")

    def save(self, *, owner_user_id: uuid.UUID, doc_type: str, filename: str, content: bytes) -> str:
        extension = Path(filename).suffix.lower()
        safe_name = f"{uuid.uuid4().hex}{extension}"
        relative_key = f"{owner_user_id}/{doc_type.lower()}/{safe_name}"
        destination = self._base_dir / relative_key
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(content)
        return relative_key

    def load(self, storage_key: str) -> bytes:
        return (self._base_dir / storage_key).read_bytes()

    def save_text(self, *, owner_user_id: uuid.UUID, doc_type: str, filename: str, text: str) -> str:
        extension = Path(filename).suffix.lower() or ".html"
        safe_name = f"{uuid.uuid4().hex}{extension}"
        relative_key = f"{owner_user_id}/{doc_type.lower()}/{safe_name}"
        destination = self._base_dir / relative_key
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(text, encoding="utf-8")
        return relative_key

    def url_for(self, storage_key: str) -> str | None:
        return f"{self._public_prefix}/{storage_key}"

    def delete(self, storage_key: str) -> None:
        path = self._base_dir / storage_key
        if path.exists():
            path.unlink()


def get_storage(settings: Settings | None = None) -> StoragePort:
    settings = settings or get_settings()
    if settings.storage_provider == "local":
        return LocalStorageAdapter(settings.storage_local_dir)
    # Punto de extensión: S3Adapter / SupabaseStorageAdapter cumpliendo StoragePort.
    raise NotImplementedError(
        f"STORAGE_PROVIDER={settings.storage_provider!r} todavía no tiene adaptador. "
        "Solo 'local' está implementado en B3; S3/Supabase quedan preparados para un bloque futuro."
    )
