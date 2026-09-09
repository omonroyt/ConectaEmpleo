# Conecta Empleo — Backend — Contexto para Claude

Reglas no negociables para quien construya sobre `backend/` (humano o agente). Vienen de
`docs/04_Arquitectura_Tecnica_Backend.md` y `docs/build/05_BACKEND_TASKS.md`, condensadas aquí
para no tener que releer los documentos completos en cada tarea.

## Estructura

```
backend/
├── app/
│   ├── main.py            # bootstrap FastAPI, CORS, routers, /health
│   ├── config.py          # pydantic-settings — única fuente de configuración
│   ├── database.py        # engine síncrono, Base, get_db
│   ├── core/               # security.py, errors.py, logging.py (transversal, sin lógica de negocio)
│   ├── modules/<nombre>/   # identity, candidates, companies, catalog, ... (uno por dominio)
│   │   ├── models.py       # SQLAlchemy
│   │   ├── schemas.py      # Pydantic v2 (equivalentes a docs/build/02_API_CONTRACT.md)
│   │   ├── service.py      # lógica de negocio
│   │   └── router.py       # HTTP
│   ├── ai/                 # AIPort, contratos, adaptadores (desde B4)
│   └── seeds/               # datos semilla versionados (JSON de rúbricas incluido)
└── tests/
```

Cada módulo nuevo sigue el mismo patrón `models → schemas → service → router`. Un módulo de
dominio **nunca** importa de otro módulo de dominio directamente para lógica de negocio; si dos
módulos necesitan compartir algo, ese algo vive en `app/core/` o se pasa explícitamente.

## Reglas no negociables (docs/build/05_BACKEND_TASKS.md, sección final)

1. **El dominio nunca importa adaptadores de IA.** Los módulos de `app/modules/*` pueden importar
   de `app/ai/port.py` y `app/ai/contracts.py`, **nunca** de `app/ai/adapters/*`. La selección del
   adaptador ocurre solo en `app/ai/registry.py`.
2. **Toda llamada a un proveedor de IA pasa por `invoke.py`.** Ningún servicio llama a un SDK de
   LLM directamente.
3. **Los prompts están versionados** (`vN+1` ante cualquier cambio de contrato o instrucción, nunca
   se edita un prompt existente en el lugar).
4. **Ninguna rúbrica vive dentro de un prompt.** Las rúbricas son datos en la tabla `rubrics`
   (JSON versionado, ver `app/seeds/rubrics/*.json`), inyectadas en runtime. Un prompt contiene la
   instrucción de usarlas, nunca su contenido.
5. **Ningún agente escribe `is_verified`.** Esa bandera solo la puede activar
   `assessments/service.py`, y solo si existe una `skill_evidences` con
   `type IN (DOCUMENT, EXTERNAL)` y `accepted_for_verification = true`.
6. **Ningún agente calcula `total_score`.** El motor de matching determinista
   (`app/modules/matching/engine.py`, futuro) es la única fuente del score; la IA solo redacta
   explicaciones sobre un `breakdown` ya calculado.
7. **Modelos y claves de proveedores solo por configuración** (`app/config.py` / variables de
   entorno). Nunca hardcodeados, nunca en un commit.
8. **Migración de Alembic obligatoria ante cualquier cambio de modelo.** No se edita el esquema de
   una tabla sin generar (`alembic revision --autogenerate`) y revisar la migración correspondiente.

## Decisiones ya tomadas (no las reabras sin razón nueva)

- **SQLAlchemy síncrono**, no async. Ver docstring de `app/database.py` para el razonamiento
  completo. FastAPI ejecuta dependencias síncronas en threadpool; se prioriza simplicidad de
  depuración sobre concurrencia máxima, razonable para el volumen de un hackatón.
- **JWT con PyJWT + passlib[argon2]** (no `python-jose`). `role` viaja en el claim.
- Módulo `app/modules/catalog/` agrupa `job_families`, `competencies`, `skills`, `rubrics` y
  `learning_catalog`. El documento 04 §4 no lo nombra explícitamente (agrupa candidatos/documentos/
  entrevistas/etc.) pero tampoco lo prohíbe; se creó porque B2 lo pide como bloque propio y no
  encaja limpiamente en `candidates/`.
- El puerto local de Postgres en `docker-compose.yml` es **5433**, no 5432. Ver comentario en ese
  archivo: en Windows, un Postgres nativo ya escuchando en 5432 puede interceptar las conexiones
  del contenedor sin que Docker reporte error. Si tu máquina no tiene ese conflicto, puedes usar
  5432 localmente, pero el valor por defecto de `.env.example` asume 5433.

## Antes de tocar código

Lee `docs/build/00_BUILD_STATE.md` (tu tarea en la cola de backend) y las filas relevantes de
`docs/build/05_BACKEND_TASKS.md`. El contrato HTTP normativo es `docs/build/02_API_CONTRACT.md`:
cualquier endpoint nuevo debe calzar exactamente con los tipos y rutas ahí definidos, porque el
frontend ya está construido contra ese contrato (`VITE_API_MODE=http`).
