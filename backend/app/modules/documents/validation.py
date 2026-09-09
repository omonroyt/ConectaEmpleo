"""Validación de uploads (docs/04 §11): MIME real, tamaño máximo, extensiones permitidas.

"MIME real" significa que no confiamos en `Content-Type` que manda el cliente
ni en la extensión del nombre de archivo: se leen los primeros bytes
("magic numbers") del contenido. Se evita depender de `python-magic` (requiere
`libmagic` instalado en el sistema, doloroso en Windows) porque los cuatro
formatos permitidos tienen firmas de bytes triviales de reconocer.
"""

from __future__ import annotations

from app.core.errors import EmptyUploadError, UnsupportedMediaTypeError, UploadTooLargeError

MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024  # ~10 MB (docs/04 §11)

#: mime real -> extensiones aceptadas para ese mime (informativo, no se usa para decidir).
ALLOWED_MIME_TYPES: dict[str, tuple[str, ...]] = {
    "application/pdf": (".pdf",),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (".docx",),
    "image/png": (".png",),
    "image/jpeg": (".jpg", ".jpeg"),
}


def sniff_mime_type(content: bytes) -> str | None:
    """Detecta el tipo real de archivo por firma de bytes. `None` si no coincide con ninguno soportado."""

    if content.startswith(b"%PDF"):
        return "application/pdf"
    if content[:4] == b"PK\x03\x04":
        # DOCX es un ZIP; en el alcance de este bloque solo se acepta este mime para ZIP.
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    if content[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if content[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    return None


def validate_upload(*, filename: str, content: bytes) -> str:
    """Valida tamaño y tipo real de `content`. Devuelve el mime detectado o lanza `DomainError`."""

    if not content:
        raise EmptyUploadError()
    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise UploadTooLargeError(
            details={"size_bytes": len(content), "max_bytes": MAX_UPLOAD_SIZE_BYTES}
        )

    mime = sniff_mime_type(content)
    if mime is None or mime not in ALLOWED_MIME_TYPES:
        raise UnsupportedMediaTypeError(
            details={"filename": filename, "allowed": list(ALLOWED_MIME_TYPES)}
        )
    return mime
