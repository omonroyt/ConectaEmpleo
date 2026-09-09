"""`invoke()` — el wrapper obligatorio de `docs/05 §8` para toda llamada a `AIPort`.

Ningún servicio llama a un adaptador directamente (regla no negociable de
`backend/CLAUDE.md`). Todo pasa por aquí, que:

1. Resuelve el adaptador para la operación vía `app/ai/registry.py`.
2. Ejecuta la operación.
3. Valida la respuesta contra `result_schema` (I-01: nada se persiste sin validar).
4. Ante **falla de validación** (el adaptador respondió pero fuera de esquema):
   reintenta con el **mismo** adaptador, hasta `max_retries` veces — cambiar de
   proveedor no ayuda si el problema es de formato (docs/05 §8).
5. Ante **falla de proveedor** (el adaptador lanzó una excepción — timeout, red,
   lo que sea): no se reintenta en el mismo intento; se registra y se
   propaga como `AIProviderError` para que la capa de arriba decida (fallback
   funcional por operación, docs/05 §11.1, o dejar el job en
   `FAILED`/reintentable — `AgenticAdapter` ya resuelve el failover de
   proveedor internamente vía `LLMFailoverPolicy`, así que en la práctica
   `invoke()` solo ve una excepción si tanto el primario como el fallback
   funcional fallan).
6. Registra **siempre** en `ai_invocations` — éxito o falla — con operación,
   versión de contrato, adaptador, digest de entrada, salida cruda, latencia,
   estado y, cuando la respuesta vino de un proveedor real (`AgenticAdapter`,
   B11/B6), también `provider`/`model`/`tokens_in`/`tokens_out` (leídos de
   `AgenticAdapter.last_response`, ver `_adapter_telemetry`).

Las dos fallas son clases distintas a propósito (`app.core.errors`):
`AIValidationError` (reintenta mismo proveedor) vs. `AIProviderError`
(dispara failover / fallback). Confundirlas fue explícitamente señalado en
docs/05 §8 como un error a evitar.

**Nota de diseño**: `invoke()` hace `db.commit()` de la fila de `ai_invocations`
en la sesión que recibe. Es una simplificación deliberada para un backend de
hackatón de un solo proceso: garantiza que la bitácora de auditoría sobrevive
aunque el resto de la operación falle después, a costa de committear también
cualquier cambio pendiente que el llamador ya hubiera hecho en esa misma
sesión antes de invocar. Si eso deja de ser aceptable, la solución es una
sesión de base de datos dedicada solo para `ai_invocations`.
"""

from __future__ import annotations

import hashlib
import time
from typing import TypeVar

from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app.ai.models import AIInvocation
from app.ai.registry import resolve_adapter_name
from app.ai.registry import get_adapter as _get_adapter
from app.config import get_settings
from app.core.errors import AIProviderError, AIValidationError

TResult = TypeVar("TResult", bound=BaseModel)


def _input_digest(request: BaseModel) -> str:
    return hashlib.sha256(request.model_dump_json().encode("utf-8")).hexdigest()


def _record(
    db: Session,
    *,
    operation: str,
    contract_version: str,
    prompt_version: str,
    adapter: str,
    input_digest: str,
    raw_output: dict | None,
    latency_ms: int,
    retries: int,
    status: str,
    error: str | None,
    provider: str | None = None,
    model: str | None = None,
    tokens_in: int | None = None,
    tokens_out: int | None = None,
) -> AIInvocation:
    row = AIInvocation(
        operation=operation,
        contract_version=contract_version,
        prompt_version=prompt_version,
        adapter=adapter,
        provider=provider,
        model=model,
        input_digest=input_digest,
        raw_output=raw_output,
        latency_ms=latency_ms,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        retries=retries,
        status=status,
        error=error,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _adapter_telemetry(adapter: object) -> tuple[str | None, str | None, int | None, int | None]:
    """Lee `provider`/`model`/tokens de `AgenticAdapter.last_response` (B11), si existe.

    B11 dejó expuesto `AgenticAdapter.last_response: StructuredResponse | None`
    (`None` cuando la respuesta vino del fallback funcional al
    `DeterministicAdapter`, ver `app/ai/adapters/llm/failover.py`) documentando
    explícitamente que "quien conecte `invoke.py` puede leer ese atributo justo
    después de invocar el método de `AIPort`". Eso es lo que hace esta función
    — `DeterministicAdapter` no declara `last_response`, así que `getattr`
    devuelve `None` para él sin necesidad de un `isinstance` que acoplaría este
    módulo a una clase concreta de adaptador.
    """

    last_response = getattr(adapter, "last_response", None)
    if last_response is None:
        return None, None, None, None
    return (
        last_response.provider,
        last_response.model,
        last_response.input_tokens,
        last_response.output_tokens,
    )


def invoke(
    db: Session,
    operation: str,
    request: BaseModel,
    result_schema: type[TResult],
    *,
    prompt_version: str = "n/a",
    max_retries: int | None = None,
) -> TResult:
    """Ejecuta `operation` sobre el `AIPort` resuelto para ella y devuelve el resultado validado.

    Lanza `AIProviderError` si el adaptador no pudo responder, o `AIValidationError`
    si respondió pero nunca produjo una salida válida dentro del presupuesto de reintentos.
    """

    settings = get_settings()
    adapter_name = resolve_adapter_name(operation, settings)
    adapter = _get_adapter(operation, settings)
    method = getattr(adapter, operation)

    contract_version = getattr(request, "contract_version", "1.1")
    digest = _input_digest(request)
    retries_budget = max_retries if max_retries is not None else settings.llm_max_retries_primary

    started = time.monotonic()
    last_validation_error: ValidationError | None = None
    attempt = 0

    while attempt <= retries_budget:
        attempt += 1
        try:
            raw_result = method(request)
        except Exception as exc:  # noqa: BLE001 — cualquier excepción del adaptador es "no respondió"
            latency_ms = int((time.monotonic() - started) * 1000)
            _record(
                db,
                operation=operation,
                contract_version=contract_version,
                prompt_version=prompt_version,
                adapter=adapter_name,
                input_digest=digest,
                raw_output=None,
                latency_ms=latency_ms,
                retries=attempt - 1,
                status="PROVIDER_FAILED",
                error=str(exc),
            )
            # Punto de extensión B11: intentar aquí el proveedor secundario antes de propagar.
            raise AIProviderError(
                f"El adaptador de IA ({adapter_name}) falló al ejecutar '{operation}'."
            ) from exc

        try:
            payload = raw_result.model_dump(mode="json") if isinstance(raw_result, BaseModel) else raw_result
            validated = result_schema.model_validate(payload)
        except ValidationError as exc:
            last_validation_error = exc
            continue  # I-08: falla de validación -> reintenta con el MISMO adaptador

        latency_ms = int((time.monotonic() - started) * 1000)
        provider, model, tokens_in, tokens_out = _adapter_telemetry(adapter)
        _record(
            db,
            operation=operation,
            contract_version=contract_version,
            prompt_version=prompt_version,
            adapter=adapter_name,
            input_digest=digest,
            raw_output=validated.model_dump(mode="json"),
            latency_ms=latency_ms,
            retries=attempt - 1,
            status="SUCCESS",
            error=None,
            provider=provider,
            model=model,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
        )
        return validated

    latency_ms = int((time.monotonic() - started) * 1000)
    _record(
        db,
        operation=operation,
        contract_version=contract_version,
        prompt_version=prompt_version,
        adapter=adapter_name,
        input_digest=digest,
        raw_output=None,
        latency_ms=latency_ms,
        retries=attempt - 1,
        status="VALIDATION_FAILED",
        error=str(last_validation_error),
    )
    raise AIValidationError(
        f"La operación '{operation}' no produjo una salida válida tras {attempt} intento(s)."
    )
