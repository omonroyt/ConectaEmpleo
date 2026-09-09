"""Cliente LLM real y política de failover (docs/05 §8.1, B11).

`base.py` declara el `Protocol` `LLMClient` y los tipos compartidos.
`anthropic_client.py` es la única implementación real (primario). No existe
`openai_client.py` todavía: no hay clave de OpenAI disponible (ver
`docs/build/00_BUILD_STATE.md`, B11). El punto de extensión para un segundo
proveedor está documentado en `failover.py`.
"""

from __future__ import annotations
