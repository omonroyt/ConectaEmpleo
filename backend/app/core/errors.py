"""Excepciones de dominio y su traducción a `{code, message, details}`.

El frontend (`src/api/client.ts` / `ApiClientError`) espera exactamente ese
formato de error para cualquier 4xx/5xx, con `message` en español accionable.
Ver `docs/build/02_API_CONTRACT.md` §1.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class DomainError(Exception):
    """Base de todas las excepciones de dominio del backend."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    code: str = "DOMAIN_ERROR"
    default_message: str = "Ocurrió un error."

    def __init__(self, message: str | None = None, details: Any | None = None) -> None:
        self.message = message or self.default_message
        self.details = details
        super().__init__(self.message)


class InvalidCredentialsError(DomainError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "INVALID_CREDENTIALS"
    default_message = "Correo o contraseña incorrectos."


class EmailAlreadyExistsError(DomainError):
    status_code = status.HTTP_409_CONFLICT
    code = "EMAIL_ALREADY_EXISTS"
    default_message = "Ya existe una cuenta con ese correo."


class UnauthorizedError(DomainError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "UNAUTHORIZED"
    default_message = "No autenticado."


class ForbiddenRoleError(DomainError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "FORBIDDEN_ROLE"
    default_message = "Tu cuenta no tiene permiso para esta acción."


class RegistrationClosedError(DomainError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "REGISTRATION_CLOSED"
    default_message = (
        "El registro está cerrado durante la evaluación del hackatón. "
        "Entra con la cuenta que te compartimos."
    )


class UnlockRequiredError(DomainError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "UNLOCK_REQUIRED"
    default_message = "Debes desbloquear este perfil antes de ver esta información."


class NotEvaluatedError(DomainError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "NOT_EVALUATED"
    default_message = "Este candidato todavía no tiene un perfil de talento evaluado."


class NotFoundError(DomainError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "NOT_FOUND"
    default_message = "Recurso no encontrado."


class ValidationDomainError(DomainError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "VALIDATION_ERROR"
    default_message = "Los datos enviados no son válidos."


class UploadTooLargeError(DomainError):
    status_code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
    code = "UPLOAD_TOO_LARGE"
    default_message = "El archivo supera el tamaño máximo permitido (10 MB). Comprime el archivo o sube una versión más ligera."


class UnsupportedMediaTypeError(DomainError):
    status_code = status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
    code = "UNSUPPORTED_MEDIA_TYPE"
    default_message = (
        "El tipo de archivo no está permitido. Sube un PDF, Word (.docx), PNG o JPG."
    )


class EmptyUploadError(DomainError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "EMPTY_UPLOAD"
    default_message = "El archivo llegó vacío. Vuelve a intentar la subida."


class AIValidationError(DomainError):
    """El adaptador de IA respondió, pero la salida no valida contra su esquema (I-01).

    No hereda de `DomainError` para uso HTTP directo en la mayoría de los casos —
    normalmente se captura dentro de `invoke.py` y termina en un job `FAILED`
    o en un reintento — pero se deja como `DomainError` para que, si algún
    endpoint la deja escapar, el cliente reciba `{code, message, details}` en
    vez de un 500 genérico.
    """

    status_code = status.HTTP_502_BAD_GATEWAY
    code = "AI_VALIDATION_ERROR"
    default_message = "La IA respondió en un formato inesperado. Se reintentó automáticamente."


class AIProviderError(DomainError):
    """El adaptador de IA no pudo producir una respuesta (timeout, red, proveedor caído).

    Distinta de `AIValidationError` a propósito (docs/05 §8): esta es la falla
    que dispara failover de proveedor (B11) o fallback funcional, no un reintento
    con el mismo proveedor.
    """

    status_code = status.HTTP_502_BAD_GATEWAY
    code = "AI_PROVIDER_ERROR"
    default_message = "El servicio de IA no está disponible en este momento. Intenta de nuevo en unos minutos."


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def _domain_error_handler(_: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": exc.code, "message": exc.message, "details": exc.details},
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "code": "VALIDATION_ERROR",
                "message": "Los datos enviados no son válidos.",
                "details": exc.errors(),
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": "HTTP_ERROR", "message": str(exc.detail), "details": None},
        )

    @app.exception_handler(Exception)
    async def _unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "code": "INTERNAL_ERROR",
                "message": "Ocurrió un error inesperado. Intenta de nuevo.",
                "details": str(exc) if app.debug else None,
            },
        )
