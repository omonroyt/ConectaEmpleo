"""B11: `AnthropicClient` con el SDK de Anthropic real pero la llamada HTTP
sustituida (`_client.messages.create` reemplazado por un doble) — no gasta
tokens ni hace red. Cubre:

- Traducción del esquema Pydantic a `input_schema` de una tool.
- Reintento en el MISMO proveedor ante una salida que no valida, pasando el
  error como feedback (docs/05 §8), hasta lograr una respuesta válida.
- Mapeo de errores de red/timeout/429/5xx del SDK a `LLMProviderError`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import anthropic
import httpx
import pytest
from pydantic import BaseModel

from app.ai.adapters.llm.anthropic_client import AnthropicClient, _tool_input_schema
from app.ai.adapters.llm.base import LLMProviderError, LLMValidationError, Message


class _Result(BaseModel):
    value: int
    label: str


@dataclass
class _FakeToolUseBlock:
    input: dict[str, Any]
    id: str = "tool_1"
    type: str = "tool_use"


@dataclass
class _FakeTextBlock:
    text: str
    type: str = "text"


@dataclass
class _FakeUsage:
    input_tokens: int
    output_tokens: int


@dataclass
class _FakeResponse:
    content: list[Any]
    usage: _FakeUsage = field(default_factory=lambda: _FakeUsage(input_tokens=1, output_tokens=1))


def _client_with_stub(create_fn) -> AnthropicClient:
    client = AnthropicClient(api_key="sk-ant-not-a-real-key")
    client._client.messages.create = create_fn  # type: ignore[attr-defined]
    return client


def test_tool_input_schema_forbids_additional_properties() -> None:
    schema = _tool_input_schema(_Result)
    assert schema["additionalProperties"] is False
    assert "value" in schema["properties"]


def test_complete_structured_returns_validated_data_on_first_try() -> None:
    def create_fn(**kwargs):
        assert kwargs["tool_choice"] == {"type": "tool", "name": "emit_result"}
        assert kwargs["tools"][0]["input_schema"]["additionalProperties"] is False
        return _FakeResponse(content=[_FakeToolUseBlock(input={"value": 5, "label": "ok"})])

    client = _client_with_stub(create_fn)
    response = client.complete_structured(
        system="s",
        messages=[Message(role="user", content="x")],
        schema=_Result,
        model="claude-sonnet-5",
        temperature=0.1,
        max_tokens=100,
    )
    assert response.data == _Result(value=5, label="ok")
    assert response.provider == "anthropic"
    assert response.retries == 0


def test_validation_failure_retries_same_provider_with_feedback_then_succeeds() -> None:
    calls: list[dict[str, Any]] = []

    def create_fn(**kwargs):
        calls.append(kwargs)
        if len(calls) == 1:
            # Falta el campo requerido "label": ValidationError -> debe reintentar.
            return _FakeResponse(content=[_FakeToolUseBlock(input={"value": 5})])
        return _FakeResponse(content=[_FakeToolUseBlock(input={"value": 5, "label": "corregido"})])

    client = _client_with_stub(create_fn)
    response = client.complete_structured(
        system="s",
        messages=[Message(role="user", content="x")],
        schema=_Result,
        model="claude-sonnet-5",
        temperature=0.1,
        max_tokens=100,
        max_validation_retries=2,
    )

    assert response.data == _Result(value=5, label="corregido")
    assert response.retries == 1
    assert len(calls) == 2
    # El segundo intento debe incluir el error de validación como feedback,
    # en el mismo proveedor (nunca cambia de modelo entre intentos).
    second_call_messages = calls[1]["messages"]
    assert any(
        isinstance(m.get("content"), list)
        and any(block.get("is_error") for block in m["content"] if isinstance(block, dict))
        for m in second_call_messages
    )


def test_validation_exhausted_raises_llm_validation_error() -> None:
    def create_fn(**kwargs):
        return _FakeResponse(content=[_FakeToolUseBlock(input={"value": "no-es-un-entero"})])

    client = _client_with_stub(create_fn)
    with pytest.raises(LLMValidationError):
        client.complete_structured(
            system="s",
            messages=[Message(role="user", content="x")],
            schema=_Result,
            model="claude-sonnet-5",
            temperature=0.1,
            max_tokens=100,
            max_validation_retries=1,
        )


@pytest.mark.parametrize(
    "make_exc",
    [
        lambda req: anthropic.APITimeoutError(req),
        lambda req: anthropic.APIConnectionError(request=req),
        lambda req: anthropic.RateLimitError("rate limited", response=httpx.Response(429, request=req), body=None),
        lambda req: anthropic.InternalServerError("boom", response=httpx.Response(500, request=req), body=None),
    ],
)
def test_provider_errors_map_to_llm_provider_error(make_exc) -> None:
    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")

    def create_fn(**kwargs):
        raise make_exc(request)

    client = _client_with_stub(create_fn)
    with pytest.raises(LLMProviderError):
        client.complete_structured(
            system="s",
            messages=[Message(role="user", content="x")],
            schema=_Result,
            model="claude-sonnet-5",
            temperature=0.1,
            max_tokens=100,
        )


def test_client_rejects_empty_api_key() -> None:
    with pytest.raises(ValueError):
        AnthropicClient(api_key="")
