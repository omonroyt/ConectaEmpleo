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
