"""`AnthropicClient` — implementación real y primaria de `LLMClient` (docs/05 §8.1).

Usa el SDK oficial `anthropic` con **salida estructurada por herramienta**:
el esquema Pydantic de cada operación se traduce a una única *tool* de
Anthropic (`input_schema` = `schema.model_json_schema()`), se fuerza su uso
con `tool_choice={"type": "tool", ...}` y la respuesta se valida siempre con
`schema.model_validate()` antes de devolverse. Nunca se parsea texto libre
(regla dura de B11 y de `docs/Master_Prompt_Conecta_Empleo_Entrevistas_IA.md`
§24: "no dependas de parsear texto libre si el stack ya soporta salidas
tipadas").

Modelo, temperatura, `max_tokens` y timeout llegan siempre como parámetros —
nunca hay un literal `model="..."` aquí; los valores por defecto viven en
`app/config.py` / `.env` (regla no negociable de `backend/CLAUDE.md`).
"""

from __future__ import annotations

import time
from typing import Any, Sequence

import anthropic
from pydantic import BaseModel, ValidationError

from app.ai.adapters.llm.base import (
    LLMProviderError,
    LLMValidationError,
    Message,
    StructuredResponse,
)

#: Nombre fijo de la única herramienta que se ofrece al modelo. No es una
#: elección de negocio, así que no necesita ser configurable.
_TOOL_NAME = "emit_result"


def _tool_input_schema(schema: type[BaseModel]) -> dict[str, Any]:
    """Traduce el esquema Pydantic al `input_schema` de una tool de Anthropic.

    `model_json_schema()` ya produce JSON Schema válido (incluidos `$defs`
    para modelos anidados como `RubricSpec` o `CandidateSnapshotForAI`).
    Solo se asegura `additionalProperties: false` en el nivel raíz para que
    el modelo no agregue campos fuera de contrato (I-01 se sigue validando
    de todas formas con Pydantic, esto es una defensa adicional del lado del
    proveedor).
    """

    json_schema = schema.model_json_schema()
    json_schema.setdefault("additionalProperties", False)
    return json_schema


def _is_retryable_provider_error(exc: anthropic.APIStatusError) -> bool:
    return exc.status_code == 429 or exc.status_code >= 500


class AnthropicClient:
    """`LLMClient` real contra la API de Anthropic (primario, docs/05 §0.2)."""

    provider_name = "anthropic"

    def __init__(self, *, api_key: str, timeout: float | None = None) -> None:
        if not api_key:
            raise ValueError(
                "ANTHROPIC_API_KEY vacío: no se puede construir AnthropicClient. "
                "Configura la variable en backend/.env (ver .env.example)."
            )
        self._client = anthropic.Anthropic(api_key=api_key, timeout=timeout)

    def complete_structured(
        self,
        system: str,
        messages: Sequence[Message],
        schema: type[BaseModel],
        *,
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float | None = None,
        max_validation_retries: int = 2,
    ) -> StructuredResponse:
        # `temperature` sigue siendo parte del contrato de `LLMClient` (viene de
        # configuración, nunca de un literal -- regla de backend/CLAUDE.md) para
        # no acoplar el Protocol a las particularidades de un modelo concreto.
        # Pero `claude-sonnet-5` real la rechaza con 400 ("`temperature` is
        # deprecated for this model") -- confirmado contra la API en vivo durante
        # B11 (ver docs/build/00_BUILD_STATE.md). Por eso no se reenvía en el
        # payload: se documenta aquí, en el único punto que habla con el SDK.
        del temperature

        tool = {
            "name": _TOOL_NAME,
            "description": (
                f"Emite el resultado final como un objeto {schema.__name__}, "
                "estrictamente conforme a su esquema. Es la única forma válida de responder."
            ),
            "input_schema": _tool_input_schema(schema),
        }

        api_messages: list[dict[str, Any]] = [{"role": m.role, "content": m.content} for m in messages]

        total_input_tokens = 0
        total_output_tokens = 0
        started = time.monotonic()
        last_validation_error: ValidationError | None = None

        attempt = 0
        while attempt <= max_validation_retries:
            attempt += 1
            try:
                response = self._client.messages.create(
                    model=model,
                    max_tokens=max_tokens,
                    system=system,
                    messages=api_messages,
                    tools=[tool],
                    tool_choice={"type": "tool", "name": _TOOL_NAME},
                    timeout=timeout,
                )
            except (
                anthropic.APIConnectionError,
                anthropic.APITimeoutError,
                anthropic.RateLimitError,
                anthropic.InternalServerError,
            ) as exc:
                # Red, timeout, 429 o 5xx: falla de proveedor (docs/05 §8).
                # No se reintenta aquí — eso es responsabilidad de failover.py.
                raise LLMProviderError(f"Anthropic no respondió ({type(exc).__name__}): {exc}") from exc
            except anthropic.APIStatusError as exc:
                if _is_retryable_provider_error(exc):
                    raise LLMProviderError(f"Anthropic devolvió {exc.status_code}: {exc}") from exc
                # 4xx que no es rate limit (ej. 400 por un input_schema mal formado):
                # es un bug de programación, no una falla de proveedor. Propaga tal cual
                # para que aparezca fuerte en desarrollo en vez de degradar en silencio.
                raise

            total_input_tokens += response.usage.input_tokens
            total_output_tokens += response.usage.output_tokens

            tool_use = next((block for block in response.content if block.type == "tool_use"), None)
            if tool_use is None:
                # No debería pasar con tool_choice forzado, pero si el modelo
                # respondió solo texto, se trata como falla de validación:
                # reintentar en el mismo proveedor recordándole el contrato.
                last_validation_error = None
                api_messages.append({"role": "assistant", "content": response.content})
                api_messages.append(
                    {
                        "role": "user",
                        "content": (
                            f"No llamaste a la herramienta '{_TOOL_NAME}'. Tu única respuesta "
                            "válida es una llamada a esa herramienta con el JSON solicitado."
                        ),
                    }
                )
                continue

            try:
                validated = schema.model_validate(tool_use.input)
            except ValidationError as exc:
                last_validation_error = exc
                api_messages.append({"role": "assistant", "content": response.content})
                api_messages.append(
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": tool_use.id,
                                "content": (
                                    "Tu respuesta no valida contra el esquema requerido. "
                                    f"Error de validación: {exc}. Corrige y vuelve a llamar "
                                    f"a '{_TOOL_NAME}' con datos válidos."
                                ),
                                "is_error": True,
                            }
                        ],
                    }
                )
                continue

            latency_ms = int((time.monotonic() - started) * 1000)
            return StructuredResponse(
                data=validated,
                provider=self.provider_name,
                model=model,
                input_tokens=total_input_tokens,
                output_tokens=total_output_tokens,
                latency_ms=latency_ms,
                retries=attempt - 1,
            )

        raise LLMValidationError(
            f"'{schema.__name__}' no validó tras {attempt} intento(s) contra Anthropic.",
            raw_output=str(last_validation_error) if last_validation_error else None,
        )
