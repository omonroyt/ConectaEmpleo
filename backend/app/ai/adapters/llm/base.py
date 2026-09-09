"""`LLMClient` — el `Protocol` de docs/05 §8.1: "dos proveedores, un cliente".

Abstracción delgada que normaliza las diferencias de salida estructurada entre
proveedores, para que `AgenticAdapter` (docs/05 §7, B11) nunca hable con el SDK
de un proveedor directamente. Hoy solo existe una implementación real
(`AnthropicClient`, en `anthropic_client.py`) porque no hay clave de OpenAI
disponible — ver `docs/build/00_BUILD_STATE.md` B11 y el punto de extensión
documentado en `failover.py`.

**Desviación respecto a docs/05 §8.1**: ahí `complete_structured` se declara
`async def`. Este backend es síncrono en toda la capa de dominio (decisión de
B0) y `app/ai/port.py` ya documenta la misma desviación para `AIPort` — aplica
aquí por la misma razón: no mezclar dos estilos de concurrencia sin necesidad
real. El SDK oficial de Anthropic expone un cliente síncrono
(`anthropic.Anthropic`) que cubre esto sin `asyncio`.

Dos clases de falla, cada una con su propia excepción, porque exigen políticas
distintas en `failover.py` (docs/05 §8, la distinción que ese documento marca
como "un error a evitar" si se confunden):

- `LLMValidationError`: el proveedor respondió, pero la salida no valida
  contra el esquema Pydantic pedido. Se reintenta en el MISMO proveedor,
  pasándole el error como feedback (cambiar de proveedor no arregla un
  problema de formato).
- `LLMProviderError`: el proveedor no pudo responder (red, timeout, 429,
  5xx). Dispara failover / fallback funcional — nunca un reintento con
  feedback, porque no hay nada que corregir en el prompt.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol, Sequence

from pydantic import BaseModel

Role = Literal["system", "user", "assistant"]


@dataclass(frozen=True)
class Message:
    """Un turno de la conversación enviada al proveedor. Capa 4 (contexto) la
    arma `AgenticAdapter` en código — nunca en un archivo de prompt."""

    role: Role
    content: str


class LLMValidationError(Exception):
    """El proveedor respondió, pero `schema.model_validate()` la rechazó.

    `raw_output` conserva la salida cruda (o el error de Pydantic) para que
    quien construye el siguiente intento pueda pasarlo como feedback, y para
    que `ai_invocations.error` quede con algo diagnosticable.
    """

    def __init__(self, message: str, *, raw_output: str | None = None) -> None:
        super().__init__(message)
        self.raw_output = raw_output


class LLMProviderError(Exception):
    """El proveedor no pudo producir una respuesta (red, timeout, 429, 5xx).

    Nunca se reintenta en el mismo intento con feedback: no hay nada de
    formato que corregir. Es la señal que activa el failover de proveedor
    (§8.1) y, en su ausencia, el fallback funcional (§11.1) — hoy, caer al
    `DeterministicAdapter` de la operación (ver `failover.py`).
    """


@dataclass(frozen=True)
class StructuredResponse:
    """Resultado normalizado de `complete_structured`, ya validado contra `schema`.

    Los campos de telemetría (`provider`, `model`, tokens, latencia) son los
    que `AgenticAdapter` usa para poblar `ai_invocations.provider/model/tokens_*`
    (docs/05 §8.1 regla 3: "sin eso es imposible saber después por qué dos
    evaluaciones parecidas salieron distintas").
    """

    data: BaseModel
    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    latency_ms: int
    retries: int


class LLMClient(Protocol):
    """Dos implementaciones posibles (docs/05 §8.1): `AnthropicClient` (real,
    primaria) y un futuro `OpenAIClient` (failover — no implementado, ver
    `failover.py`). El prompt (`system`) es idéntico para ambas: ninguna
    variante por modelo (regla no negociable de `backend/CLAUDE.md`)."""

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
        """Pide una respuesta que valide contra `schema`.

        Reintenta hasta `max_validation_retries` veces **en el mismo
        proveedor** ante una falla de validación, pasando el error como
        feedback (docs/05 §8). Lanza `LLMProviderError` ante cualquier falla
        de proveedor (no reintenta internamente esa clase de falla: eso es
        responsabilidad de `failover.py`). Lanza `LLMValidationError` si se
        agota el presupuesto de reintentos sin una salida válida.
        """
        ...
