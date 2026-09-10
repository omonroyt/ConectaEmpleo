# 08 — Redacción del CV conversacional (capa de normalización A1 COMPOSE)

> Spec de una tarea de mejora posterior al cierre del build. Normativa para
> `backend/app/ai/` + `backend/app/modules/cv_builder/` +
> `frontend/src/api/mock/engine/cv.ts`. Quien la ejecute solo necesita este
> archivo y `docs/build/00_BUILD_STATE.md`.

## Estado

| Paso (§5) | Estado | Notas |
|---|---|---|
| 1 — Normalizador determinista + tests | **HECHO** | `backend/app/modules/cv_builder/normalize.py`, `backend/tests/test_cv_normalize.py` (10 tests, incluida la transcripción real que originó el defecto). |
| 3 — `_build_parts`, puerto del mock | **HECHO** | `cv_builder/service.py`, `frontend/src/api/mock/engine/cvNormalize.ts` (puerto TS 1:1). |
| §3.5 — fechas/años sin inventar | **HECHO**, opción A | `start_date=""`, `EducationItem.start_year: int \| None`. El motor ya lo toleraba (`_parse_date("")` → `None`). |
| 2 — Operación `compose_cv_narrative` (contrato, prompt, adaptadores) | **PENDIENTE** | Bloqueado: `app/ai/prompts/loader.py`, `app/ai/adapters/deterministic.py` y `app/ai/contracts/base.py` los está editando otra sesión en paralelo. Hacerlo ahora garantiza conflicto. |
| 4 — e2e completo con la operación agéntica | **PENDIENTE** | Depende del paso 2. |

Con el paso 1+3 el defecto visible **ya no ocurre**, incluso con `AI_MODE=demo`
(que es el modo en el que corre la demo y donde nunca se llama a un LLM). El
paso 2 añade calidad de redacción, no corrige el defecto.

**Deuda que deja el paso 3**: `EducationItemDTO.start_year`
(`app/ai/contracts/base.py`) sigue siendo `int` obligatorio, así que
`candidates/service.py::build_candidate_snapshot_for_ai` manda `0` como "sin
dato" al snapshot de IA. Al hacer el paso 2 conviene volverlo `int | None` y
quitar ese `or 0`.

## 1. El problema, con el caso real

Un candidato construyó su CV por voz. La pantalla C7 (`/candidate/cv/review`)
le mostró esto:

| Sección | Lo que se ve hoy | Lo que debería ver |
|---|---|---|
| Experiencia #1 · puesto | `se me escucha bueno diría que mi experiencia parte de la universidad tengo título universitario en este rubro y Bueno estoy buscando mi primer empleo` | *(no debería existir esta entrada: no es un empleo)* |
| Experiencia #1 · empresa | `Por confirmar · Actual` | — |
| Experiencia #1 · descripción | `Ah claro bueno llevaba la contabilidad los registros en una base de datos en Excel` | `Registro y control de información contable en hojas de cálculo (Excel).` |
| Experiencia #2 · puesto | `no no estuve en otros trabajos` | *(no debería existir; en su lugar, encabezado "En búsqueda de mi primer empleo")* |
| Estudios · grado | `tengo la licenciatura en administra` | `Licenciatura en Administración` *(marcada como incompleta por corte de STT)* |

El texto que sale de la boca del candidato llega **literal** al CV. No hay
ninguna capa que traduzca habla espontánea a registro de CV.

## 2. Causa raíz — cuatro capas, todas fallando en la misma dirección

### 2.1 Ninguna de las 9 operaciones de `AIPort` redacta

`build_cv_conversationally` (`app/ai/port.py:54`) solo decide **la siguiente
pregunta**. Su contrato `CVConversationResult`
(`app/ai/contracts/profiling.py:66`) devuelve `captured_value: str | None` sin
una sola palabra sobre qué debe contener ese valor. El
`DeterministicAdapter` hace literalmente:

```python
# app/ai/adapters/deterministic.py:304, 311
captured_value=req.last_answer,   # eco de la transcripción, sin tocar
```

### 2.2 El ensamblado del CV es copia de strings

`app/modules/cv_builder/service.py::_build_parts` (líneas 108-160) mapea 1:1
respuesta → campo del CV:

```python
"position": last_job,            # la respuesta cruda del turno 1
"description": answers.get("activities", ""),   # la del turno 2
"position": previous_jobs,       # la del turno 4  ← "no no estuve en otros trabajos"
"degree": education_answer,      # la del turno 5
```

Además **inventa datos que nadie dio**:

- `"company": "Por confirmar"` — un placeholder que la UI muestra como si
  fuera el nombre de la empresa.
- `start_date = f"{now_year - 1}-01-01"`, `start_date = f"{now_year - 8}-01-01"`
  para estudios. **Esto no es cosmético**: `matching/engine.py::years_of_experience`
  lee esas fechas y les asigna ~1 año (o ~2 con el bloque de `previous_jobs`)
  de experiencia real al candidato. El motor de matching está puntuando
  experiencia fabricada por el propio ensamblador. Contradice de frente el
  límite que el prompt de extracción sí declara ("No inventas fechas, empresas,
  puestos", `profiler/extract_v1.md:13`) — el modo BUILD nunca recibió ese
  límite porque el que arma la estructura no es la IA, es este `for`.

### 2.3 El prompt del modo BUILD no pide redactar

`app/ai/prompts/profiler/build_v1.md` es íntegramente sobre **estilo
conversacional**: cómo preguntar, no insistir, no usar jerga. Ni una línea
sobre convertir habla en prosa de CV, porque en el diseño actual ese no es su
trabajo.

### 2.4 En la demo no hay LLM en absoluto

`backend/.env` tiene `AI_MODE=demo`, y `registry.resolve_adapter_name` fuerza
`deterministic` **para las 9 operaciones sin excepción** (es intencional: es
el modo de presentación). Con `ANTHROPIC_API_KEY` presente y todo, hoy el CV
conversacional no toca un modelo. Cualquier arreglo tiene que funcionar
**también sin LLM**, o la demo lo sigue mostrando roto.

### 2.5 El mock del frontend replica el mismo bug

`frontend/src/api/mock/engine/cv.ts::buildExtractionFromCvBuilder` (líneas
71-147) es el puerto TypeScript de `_build_parts`, con las mismas asignaciones
crudas y las mismas fechas inventadas. Hay que corregir los dos o `mock` y
`http` divergen.

## 3. Solución — operación 10 de `AIPort`: `compose_cv_narrative` (A1 modo COMPOSE)

El punto de intervención correcto **no es el turno de la conversación** (ahí
todavía no se sabe qué pertenece a dónde: el candidato mezcló estudios,
experiencia y expectativa en un mismo párrafo). Es **una sola llamada al
cerrar**, con las 8 respuestas completas a la vista, en
`cv_builder/service.py::finalize_session`.

Ventajas de esta ubicación: una invocación por CV (costo despreciable),
contexto completo (puede mover a *Estudios* algo que se dijo en el turno de
*último trabajo*), y no toca la latencia de cada turno de voz.

### 3.1 Contrato nuevo — `app/ai/contracts/profiling.py`

```python
# --- Operación 10: compose_cv_narrative (modo COMPOSE) ---

class CVComposeRequest(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    job_family_code: str | None = None
    #: Las 8 respuestas crudas, por campo del guion (`_FIELD_ORDER`).
    answers: dict[str, str] = Field(default_factory=dict)

class ComposedExperience(AIBaseModel):
    position: str
    company: str | None = None          # None = la persona no lo dijo. NUNCA un placeholder.
    description: str = ""
    duration_text: str | None = None    # "poco más de un año", tal como lo dijo
    start_date: str | None = None       # SOLO si dio una fecha real
    end_date: str | None = None
    is_current: bool = False
    skills: list[str] = Field(default_factory=list)
    source_fields: list[str] = Field(default_factory=list)   # trazabilidad al turno

class ComposedEducation(AIBaseModel):
    degree: str
    institution: str | None = None
    level: Literal["SECUNDARIA","BACHILLERATO","TECNICO","LICENCIATURA","POSGRADO","CURSO","OTRO"]
    is_complete: bool | None = None     # None = no se sabe; nunca se asume completo
    start_year: int | None = None
    end_year: int | None = None
    source_fields: list[str] = Field(default_factory=list)

class CVComposeResult(AIBaseModel):
    contract_version: ContractVersion = "1.1"
    headline: str                       # "Auxiliar administrativo · en búsqueda de primer empleo"
    summary: str                        # 2-3 frases, primera persona implícita
    experience: list[ComposedExperience] = Field(default_factory=list)
    education: list[ComposedEducation] = Field(default_factory=list)
    skills: list[SkillClaimDTO] = Field(default_factory=list)
    certifications: list[CertificationDTO] = Field(default_factory=list)
    claims: list[ClaimDTO] = Field(default_factory=list)
    #: True cuando la persona declaró no haber trabajado formalmente.
    no_formal_experience: bool = False
    #: Fragmentos que no se pudieron clasificar. No se tiran: van a la UI
    #: como "esto lo dijiste pero no supimos dónde ponerlo".
    unclassified: list[str] = Field(default_factory=list)
    #: Campos con transcripción cortada o dudosa, para que C7 los resalte.
    needs_user_review: list[str] = Field(default_factory=list)
```

### 3.2 Reglas de redacción — nuevo `app/ai/prompts/profiler/compose_v1.md`

Estas son las reglas normativas; el archivo las desarrolla en las 3 capas
(rol / límites / contrato) del formato ya establecido en `prompts/`.

1. **Traduce habla a registro de CV.** Elimina muletillas ("bueno", "este",
   "o sea", "diría que", "ah claro"), autocorrecciones y ruido de dictado
   ("se me escucha"). Usa frases nominales con verbo de acción.
2. **Prohibido inventar.** Sin empresa dicha → `company=None`. Sin fecha
   dicha → `start_date=None` y, si dio una duración hablada, `duration_text`.
   Ni un placeholder que pueda leerse como dato.
3. **Interpreta las negaciones.** `no he trabajado` / `no estuve en otros
   trabajos` / `es mi primer empleo` / `ninguno` **no producen una entrada de
   experiencia**: producen `no_formal_experience=true` y un `headline` del
   tipo "En búsqueda de mi primer empleo".
4. **Clasifica, no transcribe.** "mi experiencia parte de la universidad,
   tengo título universitario" es **educación**, aunque se haya dicho en el
   turno de *último trabajo*. Un turno no determina la sección.
5. **Nivelar el registro no puede subir el nivel de la afirmación.**
   `"llevaba la contabilidad, los registros en una base de datos en Excel"`
   → `"Registro y control de información contable en hojas de cálculo
   (Excel)."` ✔ · → `"Especialista en control financiero"` ✘. Es la misma
   regla que la Constitución ya aplica a las evaluaciones: describir la
   evidencia, no inflarla.
6. **Transcripción cortada se marca, no se completa.** "licenciatura en
   administra" → se conserva y se lista en `needs_user_review`. Autocompletar
   a "Administración" es inventar, aunque suene obvio.
7. **Nada de datos protegidos.** Ni edad, ni género, ni estado civil, ni
   situación migratoria — ni siquiera si la persona los mencionó (mismo
   límite que `extract_v1.md:24`).
8. **Todo es borrador.** C7 sigue siendo el punto de confirmación humana; esta
   operación no marca nada como verificado (I-03).

### 3.3 Normalizador determinista — `app/modules/cv_builder/normalize.py` (nuevo)

**Obligatorio, no opcional**: con `AI_MODE=demo` es el único camino que se
ejecuta (§2.4), y además es el `functional_fallback` del `AgenticAdapter`.
Python puro, sin SQLAlchemy y sin IA, testeable en aislamiento — mismo criterio
que `matching/engine.py`.

Alcance mínimo:

- `NEGATION_PATTERNS`: `no he trabajado`, `no tengo experiencia`, `no estuve`,
  `nunca he`, `primer empleo`, `ninguno`, `no` a secas → suprime la entrada y
  activa `no_formal_experience`.
- `FILLER_PATTERNS`: muletillas y ruido de dictado al inicio de frase.
- `DEGREE_MAP`: `licenciatura|ingeniería|técnico|bachillerato|preparatoria|
  secundaria|maestría|curso` → `level` + forma canónica **neutra en género**
  ("Licenciatura en Administración", nunca "Licenciado/Licenciada": el grado
  no debe revelar género, I-05).
- `TITLE_FALLBACK`: si la respuesta de `last_job` no contiene un puesto
  reconocible, usa el título de la familia laboral (`_FAMILY_TITLES`) y lo
  agrega a `needs_user_review`.
- Sentence-case + punto final. Corte de longitud por frase, no por palabra.

### 3.4 Cableado

| Archivo | Cambio |
|---|---|
| `app/ai/port.py` | `compose_cv_narrative` en el `Protocol` y en `AI_OPERATIONS` (pasa a 10). |
| `app/ai/registry.py` | Entrada `"compose_cv_narrative": "cv"` en `_OPERATION_GROUP` (el `assert` de sincronía lo exige). |
| `app/ai/prompts/loader.py` | `"compose_cv_narrative": ("profiler", "compose_v1")`. |
| `app/ai/adapters/deterministic.py` | Método nuevo que delega en `normalize.py`. |
| `app/ai/adapters/agentic.py` | Método nuevo vía `self._run(...)`, con `fallback=partial(self._deterministic.compose_cv_narrative, req)`. |
| `app/modules/cv_builder/service.py` | `finalize_session` llama `invoke(db, "compose_cv_narrative", ...)` y arma el `CVExtraction` desde el resultado. `_build_parts` queda **solo** para el borrador en vivo de `to_session_schema` (donde el eco crudo sí es correcto: es "lo que llevamos dicho"), o se elimina si se prefiere no mostrar borrador durante la conversación. |
| `app/modules/cv_builder/service.py::_render_cv_document_html` | Consume el resultado compuesto, con `headline`/`summary` arriba. |
| `frontend/src/api/mock/engine/cv.ts` | Puerto TS del normalizador determinista, para que `mock` y `http` coincidan. |

### 3.5 Decisión pendiente — fechas ausentes en el contrato HTTP

`ExperienceItem.start_date` es `str` obligatorio
(`app/modules/candidates/schemas.py:26` y el tipo espejo del frontend). Al
dejar de inventar fechas hay que representar "no se sabe". Dos opciones:

- **(A, recomendada)** `start_date: str = ""` — cadena vacía como "sin dato".
  Cero churn de contrato; `engine._parse_date("")` ya devuelve `None` y
  `years_of_experience` ya hace `continue` en ese caso
  (`matching/engine.py:287`), así que el motor **ya tolera** el cambio sin
  tocarlo. Se agrega `duration_text: str | None` para no perder "un año y
  medio". La UI ya trata la cadena vacía como ausencia tras el rediseño de C7.
- **(B)** `start_date: str | None` — más honesto en el tipo, pero obliga a
  tocar los esquemas de backend, `api/types.ts`, el mock y `ExperienceItemInput`
  del motor.

Elegir A salvo que el orquestador prefiera pagar B.

### 3.6 Configuración para la demo

Para que la redacción real se vea en vivo, sin encender el LLM en todo el
sistema:

```dotenv
AI_MODE=live            # `demo` fuerza determinista en las 10 operaciones
AI_ADAPTER=deterministic
AI_ADAPTER_CV=agentic   # solo el grupo `cv` usa Claude
```

Con `AI_MODE=demo` el flujo sigue funcionando y **se ve razonable** gracias a
§3.3 — ese es justamente el criterio de aceptación del normalizador.

## 4. Criterios de aceptación

1. Con las respuestas literales de §1 como entrada, el `CVExtraction`
   resultante **no contiene** ninguna entrada de experiencia, tiene
   `no_formal_experience=true`, un `headline` que menciona la búsqueda de
   primer empleo, y una entrada de educación de nivel `LICENCIATURA`.
2. Ningún campo del `CVExtraction` es igual, carácter por carácter, a la
   respuesta cruda del candidato (salvo `claims[].statement`, que **debe**
   citar lo dicho: es una declaración a validar, no prosa de CV).
3. Ningún `start_date` inventado: para las mismas respuestas de §1,
   `years_of_experience` del motor devuelve `0`, no `1` ni `2`.
4. Con `AI_MODE=demo` (sin LLM) los puntos 1-3 se cumplen igual.
5. Test de no-regresión de anonimización: el `CVComposeRequest` no lleva
   `full_name`, `photo_url`, `birth_date` ni `gender` — se verifica sobre
   `model_fields`, como ya hace `test_anonymous_candidate_card_json_never_contains_protected_keys`.
6. `pytest -q` y `ruff check .` en verde; `npm run typecheck`, `npm run build`
   y `npm run e2e:smoke` (mock y `E2E_TARGET=http`) en verde.

## 5. Orden sugerido y modelo

| Paso | Contenido | Modelo |
|---|---|---|
| 1 | `normalize.py` + sus tests (sin tocar nada más). Es la pieza que arregla la demo. | sonnet |
| 2 | Contrato, prompt `compose_v1.md`, cableado de `port`/`registry`/`loader`/adaptadores. | **opus** (toca la Constitución y el contrato de IA) |
| 3 | `finalize_session`, CV descargable, puerto del mock en `cv.ts`. | sonnet |
| 4 | Decisión §3.5 aplicada + e2e completo. | sonnet |

El paso 1 ya entrega valor visible por sí solo: si el presupuesto se acaba
ahí, la pantalla deja de mostrar transcripciones crudas.
