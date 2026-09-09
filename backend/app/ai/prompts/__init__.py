"""Arquitectura de prompts en 4 capas (docs/05 §9.1, §9.3, §9.2).

```
[1] CONSTITUCIÓN — compartida, `constitution/v1.md`, nunca cambia por agente.
[2] ROL          — misión, límites y estilo del agente específico.
[3] CONTRATO     — esquema de salida y reglas de formato.
[4] CONTEXTO     — datos runtime (rúbricas, historial, perfil). Se construye
                   en código (`app/ai/adapters/agentic.py`), nunca en un
                   archivo de esta carpeta.
```

Las capas 1-3 viven en los archivos `.md` de este paquete. `loader.py` las
compone en un único `system` string y calcula el `prompt_version` que
`AgenticAdapter` persiste en `ai_invocations` (docs/05 §9.3: "el
`prompt_version` se persiste en `ai_invocations`").

Reglas duras (verificadas en `backend/tests/test_prompts.py`):
- Ningún archivo de esta carpeta contiene el texto de una rúbrica ni de una
  pregunta del banco — esas llegan como datos en runtime (docs/05 §6.1,
  Master Prompt §24).
- Un prompt por operación, sin variantes por modelo.
- Cambiar un prompt crea `vN+1`; nunca se edita una versión publicada.
"""

from __future__ import annotations
