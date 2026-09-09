"""Política de conmutación y circuit breaker (docs/05 §8, §8.1, §11.1).

**Cadena de resiliencia implementada aquí** (adaptada del docs/05 §8.1 a la
realidad de este proyecto: no hay clave de OpenAI disponible, ver
`docs/build/00_BUILD_STATE.md` B11 y docs/build/06_INTERVIEW_SYSTEM.md §9):

1. Falla de **validación** (el proveedor respondió, pero fuera de esquema):
   reintento en el **mismo** proveedor, pasando el error como feedback
   (máx. 2 — ya lo hace `AnthropicClient.complete_structured` internamente).
2. Falla de **proveedor** (red, timeout, 429, 5xx): caída al
   `DeterministicAdapter` de esa operación. No hay un segundo proveedor LLM
   real que probar.
3. **Circuit breaker**: tras 3 fallas de proveedor en 60 segundos, se deja de
   intentar el primario durante 5 minutos y se va directo al fallback
   determinista — evita pagar la latencia de un timeout de Anthropic en cada
   llamada durante una caída sostenida.

**Punto de extensión para un segundo proveedor real** (no implementado; no
hay `OPENAI_API_KEY` disponible en este proyecto — docs/05 §0.2 lo describe
como `gpt-5.6-terra`, pero la decisión final del equipo, en
`docs/build/06_INTERVIEW_SYSTEM.md` §9, es "sin clave de OpenAI disponible.
Si el primario falla: reintento y luego caída al adaptador determinista, no a
otro proveedor. Dejar el punto de extensión listo por si aparece la clave"):

    Cuando exista un segundo `LLMClient` (p. ej. `OpenAIClient` en
    `app/ai/adapters/llm/openai_client.py`, implementando el mismo `Protocol`
    de `base.py`), esta clase debe:

    1. Recibir también `secondary: LLMClient | None = None` en el constructor.
    2. En `run()`, cuando `primary` lance `LLMProviderError` y el circuit
       breaker no esté abierto hacia el fallback funcional, intentar
       `secondary.complete_structured(...)` con el **mismo** `system` (nunca
       una variante por modelo) antes de caer al fallback determinista.
    3. Registrar `provider="openai"` en el `StructuredResponse` resultante,
       para que `ai_invocations.provider` distinga qué proveedor respondió
       de verdad (docs/05 §8.1 regla 3).
    4. El circuit breaker pasaría a tener dos estados útiles: "todo al
       secundario" (como describe docs/05 §8.1 regla 5) en vez del estado
       actual, que es "todo al fallback funcional" porque no existe
       secundario.

    Ningún otro archivo de este módulo necesita cambiar: `AgenticAdapter` ya
    depende de `LLMFailoverPolicy.run(...)`, no de `AnthropicClient`
    directamente.
"""

from __future__ import annotations

import time
from collections import deque
from dataclasses import dataclass, field
from typing import Callable, Sequence, TypeVar

from pydantic import BaseModel

from app.ai.adapters.llm.base import LLMClient, LLMProviderError, LLMValidationError, Message, StructuredResponse

TResult = TypeVar("TResult", bound=BaseModel)

#: docs/05 §8.1 regla 5: "tras 3 fallas de proveedor en 60 segundos".
_FAILURE_THRESHOLD = 3
_FAILURE_WINDOW_SECONDS = 60.0
#: "se envía todo al secundario durante 5 minutos antes de volver a intentar
#: el primario". Sin secundario real, "todo al secundario" es "todo al
#: fallback funcional" (ver docstring del módulo).
_OPEN_DURATION_SECONDS = 300.0


@dataclass
class CircuitBreaker:
    """Circuit breaker sencillo de una sola vía (docs/05 §8.1 regla 5).

    `clock` es inyectable para pruebas deterministas (nunca `time.sleep` en un
    test de circuit breaker). Sin estado compartido entre instancias: cada
    `LLMFailoverPolicy` trae la suya, así que un test puede construir una
    política nueva sin heredar fallas de otro test.
    """

    clock: Callable[[], float] = field(default=time.monotonic)
    _failure_timestamps: deque[float] = field(default_factory=deque, init=False, repr=False)
    _opened_at: float | None = field(default=None, init=False, repr=False)

    def is_open(self) -> bool:
        """`True` si el circuito está abierto (ir directo al fallback, sin tocar el primario)."""

        if self._opened_at is None:
            return False
        if self.clock() - self._opened_at >= _OPEN_DURATION_SECONDS:
            # Cerró el periodo de apertura: vuelve a intentar el primario (half-open).
            self._opened_at = None
            self._failure_timestamps.clear()
            return False
        return True

    def record_success(self) -> None:
        self._failure_timestamps.clear()
        self._opened_at = None

    def record_failure(self) -> None:
        now = self.clock()
        self._failure_timestamps.append(now)
        while self._failure_timestamps and now - self._failure_timestamps[0] > _FAILURE_WINDOW_SECONDS:
            self._failure_timestamps.popleft()
        if len(self._failure_timestamps) >= _FAILURE_THRESHOLD:
            self._opened_at = now


class LLMFailoverPolicy:
    """Orquesta primario + circuit breaker + fallback funcional para una operación.

    No conoce contratos de `AIPort` ni rúbricas: solo sabe ejecutar
    `complete_structured` contra `primary` y, si no puede, invocar
    `functional_fallback` (una función sin argumentos que produce el mismo
    tipo de resultado — típicamente un método del `DeterministicAdapter`
    parcialmente aplicado por `AgenticAdapter`).
    """

    def __init__(self, primary: LLMClient, *, breaker: CircuitBreaker | None = None) -> None:
        self._primary = primary
        self._breaker = breaker or CircuitBreaker()

    @property
    def breaker(self) -> CircuitBreaker:
        return self._breaker

    def run(
        self,
        *,
        system: str,
        messages: Sequence[Message],
        schema: type[TResult],
        model: str,
        temperature: float,
        max_tokens: int,
        timeout: float | None,
        max_validation_retries: int,
        functional_fallback: Callable[[], TResult],
    ) -> tuple[TResult, StructuredResponse | None]:
        """Ejecuta la cadena de resiliencia completa para una operación.

        Devuelve `(resultado, structured_response)`. `structured_response` es
        `None` cuando la respuesta vino del fallback funcional (no hubo
        llamada real a un proveedor que registrar con `provider`/`model`/tokens).
        """

        if self._breaker.is_open():
            return functional_fallback(), None

        try:
            response = self._primary.complete_structured(
                system,
                messages,
                schema,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
                max_validation_retries=max_validation_retries,
            )
        except LLMProviderError:
            # Falla de proveedor: dispara el circuit breaker y cae al
            # fallback funcional de la operación (docs/05 §11.1 nivel 2).
            self._breaker.record_failure()
            return functional_fallback(), None
        except LLMValidationError:
            # `AnthropicClient` ya agotó sus reintentos de validación en el
            # MISMO proveedor (docs/05 §8). No es una falla de proveedor —el
            # proveedor respondió, solo que nunca dentro de esquema— así que
            # no cuenta para el circuit breaker, pero tampoco hay nada más
            # que reintentar: cae al fallback funcional.
            return functional_fallback(), None

        self._breaker.record_success()
        return response.data, response  # type: ignore[return-value]  # validado por complete_structured
