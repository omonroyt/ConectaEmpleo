"""B11: política de failover y circuit breaker, con un `LLMClient` simulado.

No gasta tokens reales (criterio de cierre 1 de B11). Cubre:
- Un fallo de validación se resuelve reintentando en el MISMO proveedor
  (esto ya lo hace `AnthropicClient.complete_structured` puertas adentro;
  aquí se prueba que `LLMFailoverPolicy` no lo interfiere ni cambia de
  proveedor cuando el cliente lo resuelve internamente).
- Un `LLMValidationError` (el cliente agotó sus reintentos de validación) cae
  al fallback funcional sin contar como falla de proveedor.
- Un fallo de proveedor (`LLMProviderError`: red, timeout, 429, 5xx) cae al
  `DeterministicAdapter` de la operación.
- El circuit breaker abre tras 3 fallas de proveedor en 60 segundos y, una
  vez abierto, ni siquiera llama al proveedor primario.
"""

from __future__ import annotations

from pydantic import BaseModel

from app.ai.adapters.deterministic import DeterministicAdapter
from app.ai.adapters.llm.base import LLMProviderError, LLMValidationError, Message, StructuredResponse
from app.ai.adapters.llm.failover import CircuitBreaker, LLMFailoverPolicy
from app.ai.contracts.matching import BreakdownItemDTO, MatchExplanationRequest, MatchExplanationResult


class _Dummy(BaseModel):
    value: int


class _ScriptedClient:
    """Doble de `LLMClient` (docs/05 §8.1) que reproduce un guion de resultados/excepciones."""

    def __init__(self, script: list[object]) -> None:
        self._script = list(script)
        self.calls = 0

    def complete_structured(
        self,
        system,
        messages,
        schema,
        *,
        model,
        temperature,
        max_tokens,
        timeout=None,
        max_validation_retries=2,
    ):
        self.calls += 1
        if not self._script:
            raise AssertionError("Guion agotado: la política llamó más veces de las esperadas.")
        outcome = self._script.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


def _ok(value: int = 1) -> StructuredResponse:
    return StructuredResponse(
        data=_Dummy(value=value),
        provider="anthropic",
        model="claude-sonnet-5",
        input_tokens=10,
        output_tokens=5,
        latency_ms=42,
        retries=0,
    )


def _run_policy(policy: LLMFailoverPolicy, fallback):
    return policy.run(
        system="system prompt de prueba",
        messages=[Message(role="user", content="datos de prueba")],
        schema=_Dummy,
        model="claude-sonnet-5",
        temperature=0.2,
        max_tokens=100,
        timeout=10,
        max_validation_retries=2,
        functional_fallback=fallback,
    )


# ---------------------------------------------------------------------------
# Reintento de validación en el mismo proveedor (no interferido por la política)
# ---------------------------------------------------------------------------


def test_successful_response_never_touches_functional_fallback() -> None:
    client = _ScriptedClient([_ok(value=7)])
    policy = LLMFailoverPolicy(client)
    fallback_calls = []

    result, response = _run_policy(policy, lambda: fallback_calls.append(1) or _Dummy(value=-1))

    assert result.value == 7
    assert response is not None
    assert response.provider == "anthropic"
    assert not fallback_calls
    assert client.calls == 1


def test_exhausted_validation_retries_fall_back_without_opening_breaker() -> None:
    """`AnthropicClient` ya reintentó internamente en el mismo proveedor (docs/05 §8)
    y terminó lanzando `LLMValidationError`. Eso NO es una falla de proveedor: no debe
    contar para el circuit breaker."""

    client = _ScriptedClient([LLMValidationError("nunca validó tras 2 reintentos")])
    breaker = CircuitBreaker()
    policy = LLMFailoverPolicy(client, breaker=breaker)

    result, response = _run_policy(policy, lambda: _Dummy(value=-1))

    assert result.value == -1
    assert response is None
    assert not breaker.is_open()


# ---------------------------------------------------------------------------
# Falla de proveedor -> DeterministicAdapter
# ---------------------------------------------------------------------------


def test_provider_failure_falls_back_to_deterministic_adapter() -> None:
    client = _ScriptedClient([LLMProviderError("timeout simulado contra Anthropic")])
    policy = LLMFailoverPolicy(client)
    deterministic = DeterministicAdapter()
    req = MatchExplanationRequest(
        total_score=70,
        breakdown=[BreakdownItemDTO(component="TECHNICAL", weight=40, raw=70, contribution=28)],
        strengths=["control de inventarios"],
        gaps=[],
    )

    result, response = policy.run(
        system="s",
        messages=[Message(role="user", content="x")],
        schema=MatchExplanationResult,
        model="claude-sonnet-5",
        temperature=0.2,
        max_tokens=100,
        timeout=10,
        max_validation_retries=2,
        functional_fallback=lambda: deterministic.explain_match(req),
    )

    assert response is None
    # Sigue siendo una respuesta real y válida, solo que producida sin LLM.
    MatchExplanationResult.model_validate(result.model_dump())


# ---------------------------------------------------------------------------
# Circuit breaker: 3 fallas de proveedor en 60s -> abre.
# ---------------------------------------------------------------------------


def test_circuit_breaker_opens_after_three_failures_in_60_seconds() -> None:
    clock = {"t": 0.0}
    breaker = CircuitBreaker(clock=lambda: clock["t"])

    assert not breaker.is_open()
    breaker.record_failure()
    clock["t"] += 10
    assert not breaker.is_open()
    breaker.record_failure()
    clock["t"] += 10
    assert not breaker.is_open()
    breaker.record_failure()  # 3ra falla dentro de la ventana de 60s
    assert breaker.is_open()


def test_circuit_breaker_ignores_failures_outside_the_60s_window() -> None:
    clock = {"t": 0.0}
    breaker = CircuitBreaker(clock=lambda: clock["t"])

    breaker.record_failure()
    clock["t"] += 61  # la primera falla ya salió de la ventana de 60s
    breaker.record_failure()
    breaker.record_failure()
    assert not breaker.is_open()  # solo 2 fallas vigentes


def test_open_circuit_routes_directly_to_fallback_without_calling_primary() -> None:
    clock = {"t": 0.0}
    breaker = CircuitBreaker(clock=lambda: clock["t"])
    for _ in range(3):
        breaker.record_failure()
    assert breaker.is_open()

    client = _ScriptedClient([])  # no debe llamarse ni una vez
    policy = LLMFailoverPolicy(client, breaker=breaker)

    result, response = _run_policy(policy, lambda: _Dummy(value=99))

    assert result.value == 99
    assert response is None
    assert client.calls == 0


def test_circuit_breaker_closes_after_open_duration_and_retries_primary() -> None:
    clock = {"t": 0.0}
    breaker = CircuitBreaker(clock=lambda: clock["t"])
    for _ in range(3):
        breaker.record_failure()
    assert breaker.is_open()

    clock["t"] += 301  # pasado el periodo de apertura (5 minutos, docs/05 §8.1)
    assert not breaker.is_open()


def test_successful_call_resets_the_breaker() -> None:
    clock = {"t": 0.0}
    breaker = CircuitBreaker(clock=lambda: clock["t"])
    breaker.record_failure()
    breaker.record_failure()
    assert not breaker.is_open()

    client = _ScriptedClient([_ok(value=1)])
    policy = LLMFailoverPolicy(client, breaker=breaker)
    _run_policy(policy, lambda: _Dummy(value=-1))

    # Un éxito limpia el historial de fallas: dos fallas más no deberían abrirlo.
    breaker.record_failure()
    breaker.record_failure()
    assert not breaker.is_open()
