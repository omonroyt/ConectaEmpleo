# Tablero de construcción — Conecta Empleo

> **Este es el único archivo que debe leer quien retome la construcción** (humano o agente, con cualquier modelo).
> Lo actualiza cada subagente al cerrar su tarea. No releer `docs/0*.md` ni la guía UX: todo lo necesario está condensado en `docs/build/`.

- Orquestador: Fable 5.1 / Opus 5 · Constructores: Sonnet 5 (Opus 5 en F4 y F7)
- Última actualización: 2026-09-09 (cierre de la fase frontend)

## Estado actual

| Campo | Valor |
|---|---|
| Fase activa | **BACKEND (fase 2)** — ver `05_BACKEND_TASKS.md`. La fase frontend está cerrada. |
| Siguiente tarea | **B6** (entrevista: sesiones, turnos, orquestador determinista, cobertura, Guardián de Equidad) |
| Tarea en curso | ninguna |
| Último commit de construcción | 05ab4ef |
| Bloqueos | ninguno |

### Cómo verificar el backend antes de tocar nada

```bash
cd backend
docker compose up -d                     # Postgres 16 en el puerto 5433 (el 5432 lo ocupa un Postgres nativo)
export DATABASE_URL="postgresql+psycopg://conecta:conecta@localhost:5433/conecta"
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m app.seeds.run          # idempotente
.venv/Scripts/python.exe -m pytest -q              # 43 en verde
.venv/Scripts/python.exe scripts/verify_b5_b8.py   # 34 verificaciones de punta a punta
```

**Siempre con `DATABASE_URL` explícito**: esta máquina tiene una variable global de otro proyecto (Supabase, formato JDBC) que `pydantic-settings` prioriza sobre `.env`. Desde el commit `3757311` la config la rechaza con un mensaje accionable en vez de fallar de forma confusa.

### Cómo verificar el frontend antes de tocar nada

```bash
cd frontend && npm install
npm run typecheck && npm run build   # ambos deben salir en verde
npm run smoke:mock                   # 22 pasos, golden path completo contra el mock
npm run smoke:interview              # 13 pasos, entrevista + evaluación
npm run e2e:smoke                    # 50 pasos en Chromium, ambos journeys, 390px y 1280px
```

El último recorrido de navegador quedó **50/50 en verde, sin errores de consola**. Capturas en `frontend/output/e2e/` (ignorado por git). Usuarios demo (contraseña `demo1234`): `candidato@demo.mx` (perfil nuevo, recorre el golden path), `maria@demo.mx` (ya evaluada), `empresa@demo.mx`. Para reiniciar los datos del mock: `window.__ce.resetMock()` en la consola del navegador.

## Cola de tareas — frontend

Estados: `PENDING` · `IN_PROGRESS` · `DONE` · `BLOCKED`. Un subagente solo cambia la fila de su propia tarea.

| ID | Tarea | Modelo | Depende de | Spec | Estado | Commit |
|---|---|---|---|---|---|---|
| F0 | Scaffold Vite+React+TS+Tailwind v4, tokens, assets WebP, extracción del Orb, router esqueleto | sonnet | — | 01 §1-§6, §9 | DONE | e2e36fd |
| F1 | Design system: componentes `ui/`, `layout/`, `brand/`, primitives de motion | sonnet | F0 | 01 §5-§8 | DONE | 669e012 |
| F2 | Capa API: tipos del contrato, `ApiClient`, mock con datos semilla, hooks TanStack Query, store de sesión, `VoiceGateway` browser | sonnet | F0 | 02 completo | DONE | d4eb5e5 |
| F3 | Candidato A: landing, auth (login/registro), onboarding, home, carga de CV, CV conversacional, revisión de claims | sonnet | F1, F2 | 03 §C0-§C7 | DONE | 02fe49e |
| F4 | Candidato B: preparación de entrevista, entrevista en curso con Orb, resultado | **opus** | F1, F2 | 03 §C8-§C10 | DONE | cca2792 |
| F5 | Candidato C: Perfil de Talento Verificado, perfil editable, oportunidades, detalle, postulación | sonnet | F1, F2 | 03 §C11-§C14 | DONE | 80f88d9 |
| F6 | Empresa A: auth, onboarding, home, perfil empresa, nueva vacante, perfil ideal (requisitos + pesos), lista y detalle de vacante | sonnet | F1, F2 | 04 §E0-§E7 | DONE | 4e401d5 |
| F7 | Empresa B: talento compatible (ranking anónimo), detalle anónimo con explicación, comparar, finalistas, desbloqueo, perfil desbloqueado | **opus** | F1, F2 | 04 §E8-§E12 | DONE | a49ad85 |
| F8 | Stubs P2 (notificaciones, mensajes, planes) + polish: responsive, a11y, reduced-motion, loading/empty/error, consistencia | sonnet | F3-F7 | 03 §C15, 04 §E13, 01 §10 | DONE | 60a8bce |
| F9 | Calidad de demo: candidatos de semilla diferenciados, evidencia sin repetir, curva de EXPERIENCE, layout del comparador, CTAs y ProgressRing sobre fondo oscuro | sonnet | F8 | ver bitácora | DONE | d1c43cd |

Paralelismo permitido: F1 ∥ F2 · luego F3 ∥ F4 ∥ F5 ∥ F6 ∥ F7 (carpetas disjuntas, ver protocolo). F8 al final.

## Cola de tareas — backend (fase 2)

Ver `05_BACKEND_TASKS.md` para el detalle de cada fila (dependencias, entregable verificable, modelo
sugerido). Esta tabla es el estado vivo — un subagente solo cambia su propia fila.

| ID | Tarea | Modelo | Estado | Commit |
|---|---|---|---|---|
| B0 | Base: pyproject, Docker, docker-compose Postgres, config, `database.py`, Alembic, `/health`, CORS, errores, logging | sonnet | DONE | 38df003 |
| B1 | Identidad: `users`, registro/login/me, JWT, `require_candidate/require_company` | sonnet | DONE | 38df003 |
| B2 | Catálogo y semillas: `job_families`, `competencies`, `skills`, `rubrics`, `learning_catalog` | sonnet | DONE | 38df003 |
| B2b | Realineación del catálogo al master prompt: 42 competencias, 42 rúbricas, banco de 42 preguntas (`interview_questions`) | sonnet | DONE | 0c9a15d |
| B3 | Perfil de candidato + documentos | sonnet | DONE | c1cfda9 |
| B4 | `AIPort` v1.1, `invoke.py`, `DeterministicAdapter`, tabla `jobs` + runner | sonnet | DONE | c1cfda9 |
| B5 | Extracción de CV y claims, `cv-builder` sessions | sonnet | DONE | 05ab4ef |
| B6 | Entrevista: sesiones, turnos, orquestador, Guardián de Equidad | opus | PENDING | — |
| B7 | Evaluación y perfil: A3, `competency_evaluations`, `candidate_skills`, `talent_profiles`, A4 | opus | PENDING | — |
| B8 | Empresa y vacantes: `companies` (extendido), `vacancies`, `vacancy_requirements`, A5 RESOLVE | sonnet | DONE | 05ab4ef |
| B9 | Motor de matching determinista, `match_runs`, `match_results` | opus | PENDING | — |
| B10 | Marketplace y anonimización, `candidate_unlocks`, compare, shortlist, A5 EXPLAIN | sonnet | PENDING | — |
| B11 | `AgenticAdapter` real (Anthropic + OpenAI, failover, prompts A1-A5) | opus | DONE | (ver bitácora) |
| B12 | Voz: `STTPort`/`TTSPort`, `ElevenLabsAdapter`, `VoiceGateway` WS | opus | PENDING | — |
| B13 | Mocks P2, `GET /admin/ai-invocations`, seeds de demo completas, deploy Railway | sonnet | PENDING | — |

Requisito cumplido: F0–F9 están `DONE` y B0-B2 ya están `DONE`, así que **B3 puede arrancar**.

### Deuda conocida que hereda el backend

Detectada al construir el frontend contra el contrato de `02_API_CONTRACT.md`. Cada punto es un ajuste **aditivo**: ninguno rompe lo ya construido, y el frontend ya funciona sin ellos gracias al mock.

| # | Gap | Qué hace falta en el backend |
|---|---|---|
| ~~D-01~~ | ~~No hay forma de listar las certificaciones ya subidas por un candidato.~~ | **Resuelto en B3**: `GET /candidates/me/documents?type=CERTIFICATION` → `DocumentRef[]`. |
| D-02 | `UnlockedCandidateProfile` no trae `unlocked_at`, así que la fecha del badge "Identidad desbloqueada" se sella en el cliente al abrir la pantalla. | Incluir `unlocked_at` (viene de la fila `candidate_unlocks`). |
| D-03 | `interviews.turns` existe en el contrato pero F2 no le dio hook; F4 lo resolvió con un `useQuery` local. | Ninguno en backend: implementar el endpoint como está especificado y, si se quiere, mover el hook a `api/hooks`. |
| D-04 | `VacancyInput` no tiene campo de tipo de jornada, aunque la spec de pantallas lo pedía. Se omitió en la UI por no tener dónde persistirlo. | Decidir si se agrega `work_schedule` a `vacancies` o si se retira definitivamente del alcance. |
| D-05 | El peso por requisito individual (`VacancyRequirement.weight`) no se expone en la UI: se envía 0 y el mock lo normaliza. Los pesos que la empresa edita son los seis de `VacancyWeights`. | Mantener la normalización en `PUT /vacancies/{id}/requirements` (RB-07) y aceptar pesos por requisito en 0. |
| D-06 | El conteo de "Desbloqueos" del home de empresa se calcula en el cliente pidiendo la shortlist de cada vacante. | Ofrecer un resumen (por ejemplo `GET /companies/me/summary`) para evitar N peticiones. |
| D-07 | El marketplace del candidato (`GET /vacancies/open`, `POST /vacancies/{id}/apply`) es **Should Have**: existe en el contrato y en el mock, pero no está en la arquitectura del documento 04. | Implementarlo en B10 si el tiempo alcanza; si no, el frontend degrada mostrando el estado vacío. |
| D-08 | `ServerVoiceGateway` no existe todavía: la entrevista usa `BrowserVoiceGateway` (speechSynthesis + webkitSpeechRecognition). | En B12, implementar la misma interfaz de `02 §6` sobre el WebSocket de ElevenLabs. La UI de entrevista no debe cambiar. |

### Riesgos abiertos para la demo

1. **Voz real sin probar en vivo.** El flujo por voz solo se ejercitó en modo texto y con el gateway del navegador. Conviene un ensayo en Chrome con micrófono real antes de presentar; en Firefox y Safari no hay reconocimiento de voz y la interfaz cae al campo de texto por diseño.
2. **Chunk de Three.js de ~460 KB** en la ruta de entrevista. Está aislado en su propio archivo y solo se descarga al entrar a esa pantalla, pero en una conexión lenta conviene abrir la entrevista una vez antes de la demo para que quede en caché.
3. **La confianza "baja" casi no aparece** con respuestas largas; el rango existe pero solo se activa con respuestas cortas reales.
4. **`VITE_API_MODE=mock` es el modo por defecto.** Al conectar el backend hay que cambiarlo a `http` y apuntar `VITE_API_URL`; el modo mock queda como plan B si el proveedor falla en vivo.

## Protocolo del subagente (obligatorio)

1. **Lee solo**: este archivo (sección de tu tarea) + los archivos de spec que indica tu fila + el prompt que recibiste. No leas `docs/0*.md` ni la guía UX salvo que el prompt lo pida explícitamente.
2. **Marca tu fila** `IN_PROGRESS` al empezar (edita solo tu fila).
3. **Trabaja solo dentro de las rutas que te asignó el prompt.** Si necesitas cambiar un archivo compartido (router, `api/types.ts`, `tokens.css`), hazlo de forma aditiva y mínima, y anótalo en la bitácora.
4. **Criterio de cierre**: `npm run typecheck` y `npm run build` en verde dentro de `frontend/`. Sin `any` nuevos, sin `console.log`, sin TODOs que rompan el flujo. Toda pantalla con estados loading / empty / error y `prefers-reduced-motion` respetado.
5. **Commit** al cerrar, solo con tus rutas:
   `git add <tus rutas> docs/build/00_BUILD_STATE.md && git commit -m "feat(fe/F3): <resumen corto>"`
   Si `index.lock` existe (otro agente en paralelo), espera unos segundos y reintenta.
6. **Actualiza este archivo**: tu fila a `DONE` con el hash corto del commit, y agrega una entrada en la bitácora (abajo) con: qué se construyó, qué quedó fuera, decisiones tomadas, y archivos compartidos tocados.
7. **Si no puedes terminar** (error irresoluble, límite de contexto): commit parcial con prefijo `wip(fe/F3):`, fila a `BLOCKED` o `IN_PROGRESS`, y en la bitácora escribe **exactamente** dónde te quedaste y cuál es el siguiente paso concreto. Eso es lo que permite reanudar sin releer nada.
8. **No inventes decisiones de producto.** Si la spec no cubre algo, elige la opción más simple que no contradiga la spec y anótala en la bitácora.

## Bitácora (más reciente arriba)

### 2026-09-09 — B2b (Sonnet)

**Qué se construyó** (solo dentro de `backend/app/seeds/`, `backend/app/modules/catalog/`, una
migración nueva y `backend/tests/`; `frontend/` no se tocó):

- **Catálogo de 42 competencias** (`app/seeds/families.py` reescrito): 3 familias × 14
  (7 `TECHNICAL` + 7 `BEHAVIORAL`), reemplazando las 24 anteriores. `code` = id de la pregunta del
  master prompt con guion bajo (`ADMIN_HA_01`↔`HA-01`, `WAREHOUSE_SA_07`↔`SE-07`,
  `HEAVY_SM_07`↔`SM-07`). `is_core=true` en 4 técnicas centrales + 1 conductual de
  integridad/confidencialidad por familia (2 conductuales en `HEAVY_MACHINERY_OPERATOR`: `SM-01` y
  `SM-07`, por la criticidad de seguridad de ese perfil). `name`/`description` de cada competencia
  citan el tema real de su pregunta, no una etiqueta genérica.
- **Banco de 42 preguntas** (`app/seeds/interview_bank/{admin_assistant,warehouse_supervisor,
  heavy_machinery_operator}.json`, formato exacto de docs/build/06 §2): texto de pregunta copiado
  **literal** del master prompt §14-§16 (incluye las dos variantes `no_experience_variant` que trae
  el original: `HA-06`, `HE-05`). `evaluates` = lista "Evaluar:" del master prompt cuando existe, o
  derivada del marco §17 (contexto→acción→criterio→resultado) para las 18 preguntas soft que no
  traían lista explícita. `suggested_follow_ups`: el único follow-up literal que da el master
  prompt (`HA-01`) más un follow-up genérico de §19 (tipo `PROFUNDIZACION`/`PROCEDIMIENTO`/
  `VERIFICACION`/`RIESGO`/`RESULTADO`) elegido por escenario para las 41 restantes.
  `risk_flag_triggers` derivados de §18: `SAFETY_CRITICAL` alto obligatorio en `HM-05` (fuga
  hidráulica) y en `SM-07` (presión del supervisor), `PHYSICAL_SAFETY_RISK` alto en `SE-07`
  (nunca premiar anteponer mercancía a integridad física), `CONFIDENTIALITY_BREACH` alto en
  `SA-07`, más `DATA_INTEGRITY`/`INVENTORY_INTEGRITY`/`UNAUTHORIZED_RELEASE`/
  `UNSAFE_CONDITION_IGNORED` en las preguntas donde el master prompt lo pide explícitamente
  (`HA-02`, `HA-04`, `HA-07`, `SA-02`, `HE-01`, `HE-03`, `HE-06`, `HE-07`, `HM-02`, `HM-04`, `HM-06`).
- **Modelo y migración nuevos**: `InterviewQuestion` en
  `app/modules/catalog/models.py` (`job_family_id`, `competency_id`, `question_id` único por
  familia, `block`, `sequence`, `text`, `evaluates`/`suggested_follow_ups`/`risk_flag_triggers`
  JSONB, `no_experience_variant`, `version`). Migración
  `alembic/versions/b60181a672b0_interview_questions_bank.py` (down_revision `3f5adcf29fbb`, la
  migración de `tts_usage_events` de B12). **Nota de coordinación entre agentes**: el autogenerate
  también proponía `DROP TABLE tts_usage_events` porque `alembic/env.py` no importaba
  `app.ai.voice.models` — se quitó ese drop de la migración (B2b no toca `app/ai/voice/`) y se
  agregó la línea de import que faltaba en `env.py` (cambio de una línea, aditivo) para que un
  autogenerate futuro no vuelva a proponer borrar la tabla de B12. Verificado con un
  `alembic revision --autogenerate` de control tras el fix: diff vacío (`pass`/`pass`), luego
  descartado.
- **42 rúbricas** (`app/seeds/rubrics/*.json` reescritos, mismo contrato `RubricCard` que ya
  cargaba `run.py`): 5 niveles 0-4 con las etiquetas de §9 del master prompt ("Sin evidencia" /
  "Evidencia débil" / "Evidencia básica" / "Evidencia sólida" / "Evidencia fuerte"),
  **particularizados por pregunta** (ningún descriptor genérico reutilizado entre competencias);
  `what_to_probe` = misma lista `evaluates` de la pregunta; `positive_signals`/`negative_signals`
  observables (verbos concretos: "menciona", "explica", "propone", nunca adjetivos). `score_mapping`
  fijo `{"0":0,"1":25,"2":50,"3":75,"4":100}` en las 42.
- **Endpoints** (`app/modules/catalog/router.py`, `service.py`, `schemas.py`):
  `GET /job-families/{id}/competencies` ahora devuelve 14 (sin cambio de contrato `Competency`).
  Nuevo `GET /job-families/{id}/interview-questions` → `InterviewQuestion[]` ordenado por
  `sequence`, con `competency_code`/`competency_name` resueltos en el propio endpoint (join, sin
  segunda consulta desde el cliente).
- **Seeder** (`app/seeds/run.py`): agrega `_upsert_interview_question` (upsert por
  `(job_family_id, question_id)`, natural key estable) y el bucle que carga
  `interview_bank/*.json` después de rúbricas. Idempotente: corrido dos veces seguidas, mismos
  conteos (verificado).
- **`app/seeds/learning_catalog.py` remapeado** (no pedía la spec tocarlo, pero las 20 entradas
  apuntaban a los 24 códigos viejos que ya no existen): cada entrada movida 1:1 a la competencia
  nueva más cercana en significado, documentado en el docstring del archivo.
- **Limpieza de datos de la semilla vieja**: la base de dev tenía 2 `vacancy_requirements` de
  prueba apuntando a competencias viejas (`INVENTORY_CONTROL`, `FORKLIFT_SAFETY`), lo que hubiera
  bloqueado un `DELETE` de esas filas por FK. Se optó por la vía que la spec autorizaba
  explícitamente ("la base de desarrollo puede recrearse"): `alembic downgrade base` +
  `alembic upgrade head` + `python -m app.seeds.run`, en vez de escribir lógica de borrado
  condicional dentro del seeder. Documentado aquí como el comando a repetir si alguien más tiene
  una base de dev con datos de la semilla de 24 competencias.
- **Tests nuevos** (`tests/test_interview_bank.py`, cubre master prompt §31 completo): 3 perfiles
  exactos; 14 preguntas por perfil (7 HARD + 7 SOFT); `question_id` únicos y con formato estable
  (`^[A-Z]{2}-\d{2}$`); ningún texto vacío; cada pregunta referencia una competencia de la semilla
  (cobertura 1:1, no solo "existe"); cada competencia tiene rúbrica con 5 niveles y `score_mapping`
  completo; `HM-05` produce `SAFETY_CRITICAL` alto (regla dura §31); `SE-07` nunca premia anteponer
  mercancía a integridad física (nivel 0 lo describe explícitamente, niveles 3-4 no lo premian) y sí
  trae `PHYSICAL_SAFETY_RISK`; `SA-07` produce `CONFIDENTIALITY_BREACH`; y el test real de §22 que
  recorre los 42 textos (+ 2 `no_experience_variant`) contra los 14 términos prohibidos
  (edad/género/estado civil/embarazo/religión/orientación/política/origen étnico/salud/familia).
  `tests/test_catalog.py` reescrito para 14 competencias por familia con los códigos y `is_core`
  exactos, más un test nuevo para `GET /interview-questions` (200 con 14, 404 en familia
  inexistente).
- **Cambio compartido documentado**: `alembic/env.py` (una línea, import de
  `app.ai.voice.models` — ver nota de migración arriba). Ningún otro archivo fuera del alcance
  asignado fue tocado; se confirmó con `git status` que los cambios en curso de B11
  (`app/ai/prompts/`, `app/ai/adapters/llm/`) y B12 (`app/ai/voice/`, `frontend/src/voice/`) siguen
  sin tocar.

**Verificación de cierre — salida real**:
- `alembic heads` → una sola cabeza, `b60181a672b0`. `alembic upgrade head` limpio.
- `python -m app.seeds.run` corrido dos veces seguidas → `seeds_completed` ambas veces; conteo
  verificado por SQL: `competencies=42` (14/14/14 por familia), `rubrics=42` (14/14/14),
  `interview_questions=42` (14/14/14), sin duplicados en la segunda corrida.
- `pytest -q` → **129 passed, 2 skipped** (0 failed). En una corrida intermedia,
  `tests/test_prompts.py` (de B11, ajeno a este alcance) falló con `NameError:
  _FORBIDDEN_MARKERS` por trabajo en curso en paralelo; en la corrida final ya estaba en verde —
  no se tocó ese archivo.
- `ruff check app/seeds app/modules/catalog tests/test_catalog.py tests/test_interview_bank.py
  alembic/versions/b60181a672b0_interview_questions_bank.py alembic/env.py` → sin hallazgos.
- Con `uvicorn` real en `:8010`: `GET /api/v1/job-families` → 3 familias con los códigos del
  contrato. `GET /job-families/{id}/competencies` → 14 por familia con los códigos
  `ADMIN_HA_*`/`ADMIN_SA_*`, `WAREHOUSE_HE_*`/`WAREHOUSE_SA_*`, `HEAVY_HM_*`/`HEAVY_SM_*` exactos y
  `is_core` correcto. `GET /job-families/{id}/interview-questions` → 14 filas ordenadas por
  `sequence`, bloque `HARD` (1-7) seguido de `SOFT` (8-14), `question_id` `HA-01..07`/`SA-01..07`
  para `ADMIN_ASSISTANT` verificado explícitamente.

**Mapa pregunta → competencia** (los 42, código de competencia = id de pregunta con `_`):
`ADMIN_ASSISTANT`: HA-01 Excel y hojas de cálculo · HA-02 Captura y calidad de información · HA-03
Gestión documental · HA-04 Reportes administrativos · HA-05 Seguimiento de pendientes · HA-06
Sistemas y bases de datos administrativas · HA-07 Facturas y documentos administrativos · SA-01
Organización y priorización · SA-02 Atención al detalle y responsabilidad · SA-03 Comunicación ·
SA-04 Trabajo en equipo · SA-05 Resolución de problemas · SA-06 Adaptabilidad · SA-07
Confidencialidad e integridad.
`WAREHOUSE_SUPERVISOR`: HE-01 Control de inventario · HE-02 Entradas de mercancía · HE-03 Salidas
de mercancía · HE-04 Organización física del almacén · HE-05 Excel y sistema de almacén · HE-06
Manejo de producto dañado o con incidencia · HE-07 Seguridad y control de riesgos · SE-01
Responsabilidad · SE-02 Priorización · SE-03 Comunicación · SE-04 Trabajo en equipo · SE-05
Resolución de problemas · SE-06 Adaptabilidad · SE-07 Integridad y criterio ante un incidente.
`HEAVY_MACHINERY_OPERATOR`: HM-01 Experiencia real con maquinaria · HM-02 Inspección preoperativa ·
HM-03 Seguridad y EPP · HM-04 Manejo de falla durante la operación · HM-05 Fuga hidráulica · HM-06
Maniobra en espacio reducido con personal cercano · HM-07 Condiciones adversas del terreno · SM-01
Responsabilidad y disciplina · SM-02 Organización y gestión del tiempo · SM-03 Comunicación · SM-04
Trabajo en equipo · SM-05 Resolución de problemas · SM-06 Adaptabilidad · SM-07 Criterio bajo
presión.

**Qué necesita saber quien siga con B6** (entrevista: sesiones, turnos, orquestador, Guardián de
Equidad):
- `InterviewQuestion` (tabla `interview_questions`) ya está sembrada con las 42 preguntas; B6 debe
  leerla vía `catalog.service.list_interview_questions(db, job_family_id)` (devuelve tuplas
  `(InterviewQuestion, Competency)` ordenadas por `sequence`) para construir el guion determinista
  de 14 preguntas base — **no** debe copiar los textos a ningún prompt ni a `interview_sessions`,
  solo referenciar `question_id`.
- `coverage_state` de docs/build/06 §6 (`phase`, `current_question_id`,
  `base_questions_answered`, `follow_ups_for_current_question`, `answered_question_ids`) mapea
  directo: el orquestador avanza por `sequence` 1-14 de la fila anterior, cambia `phase` de `HARD`
  a `SOFT` en la pregunta 8 (ya viene marcado en el campo `block` de cada fila, no hace falta
  inferirlo).
- `no_experience_variant` solo existe en `HA-06` y `HE-05` (las dos únicas que el master prompt
  trae): B6 debe decidir el criterio para detectar "sin experiencia" (ej. claim ausente o
  respuesta que lo declara) y usar esa variante en vez del texto base — el campo ya viene `null` en
  las 40 preguntas restantes, así que un `if question.no_experience_variant` sin más lógica ya es
  seguro.
- `risk_flag_triggers` de cada pregunta son **candidatos a evaluar por el LLM/heurística de B6**,
  no una regla determinista de texto — el campo `when` es una descripción en español de la
  condición (ej. "propone continuar operando pese a una fuga hidráulica..."), pensado para que el
  prompt de evaluación (B11, `app/ai/prompts/`) o el `AssessmentAdapter` (B7) lo usen como criterio,
  no para hacer regex sobre la transcripción.
- `suggested_follow_ups` es una sugerencia, no un guion obligatorio: B6/B11 deciden si usarla o
  generar una propia siguiendo los mismos 6 tipos de §19 (`PROFUNDIZACION`, `PROCEDIMIENTO`,
  `VERIFICACION`, `RIESGO`, `CONSISTENCIA`, `RESULTADO`).
- Las 42 rúbricas ya están en `rubrics` con `evidence_guidelines.what_to_probe` = `evaluates` de la
  pregunta correspondiente — B7 (evaluación) puede resolver la rúbrica de una competencia igual que
  ya hacía antes de B2b (`competency_id` no cambió de forma, solo el contenido).
- **Desviación a validar con B6/B7 si hace falta más granularidad**: `HEAVY_MACHINERY_OPERATOR`
  marca `is_core=true` en 2 competencias soft (`SM-01`, `SM-07`) en vez de 1 como las otras dos
  familias, por la criticidad de seguridad del puesto. Si el motor de matching (B9) pondera
  `is_core` de forma uniforme entre familias, esto le da más peso relativo a "seguridad" en esa
  familia — decisión intencional, no un descuido, pero queda anotada por si B9 la quiere igualar.

### 2026-09-09 — B3+B4 (Sonnet)

**Qué se construyó** (todo dentro de `backend/`; `frontend/` no se tocó):

- **B3 — Perfil de candidato y documentos**: `app/modules/candidates/schemas.py` (tipos del
  contrato §3: `Location`, `ExperienceItem`, `EducationItem`, `CandidateProfile`,
  `CandidateProfilePatch`, `CandidateStatusView`); `service.py` ampliado con `to_schema` (arma el
  DTO anidado desde las columnas planas `location_city`/`location_state`), `apply_patch`
  (`exclude_unset`, PATCH real — un segundo PATCH parcial no borra lo ya guardado, verificado con
  curl real), `set_job_family` (404 `NOT_FOUND` si el id no existe), `compute_status_view` y
  `build_candidate_snapshot_for_ai`; `router.py` nuevo con `GET/PATCH /candidates/me`,
  `POST /candidates/me/job-family`, `GET /candidates/me/status`. `completion_percent` ya existía
  de B1-B2 (heurística de 9 campos, documentada en el docstring de `service.py`); no se tocó.
  `next_step` replica exactamente la máquina de estados de
  `frontend/src/api/mock/index.ts::candidate.status()`, con una simplificación documentada: la
  señal "hay una extracción sin confirmar" (`REVIEW_CLAIMS`) se aproxima con "existe un documento
  `CV` en estado `PARSED`", porque `cv_extractions`/`confirmed_by_candidate` son de B5 — B5 puede
  sustituir esa señal sin cambiar la forma de `CandidateStatusView`. `interview_session_id` y
  `has_talent_profile` quedan `null`/`false` hasta B6/B7.
  `app/modules/documents/`: modelo `Document` (docs/04 §5.3); `StoragePort` (Protocol) +
  `LocalStorageAdapter` (nombre reescrito a UUID, organizado por `owner_user_id/tipo/`, ruta a
  S3/Supabase preparada vía `get_storage()` pero no implementada — levanta `NotImplementedError`
  explícito si `STORAGE_PROVIDER` no es `local`); `validation.py` con sniffing de MIME real por
  firma de bytes (PDF/DOCX-ZIP/PNG/JPG) — se evitó `python-magic` a propósito porque requiere
  `libmagic` del sistema, doloroso de instalar en Windows; límite 10 MB; errores
  `UPLOAD_TOO_LARGE`/`UNSUPPORTED_MEDIA_TYPE`/`EMPTY_UPLOAD` en español accionable.
  `POST /candidates/me/cv` (multipart, 202 + `job_id`), `POST /candidates/me/certifications`
  (síncrono, `DocumentRef`), `GET /candidates/me/documents?type=` (**resuelve D-01**). `main.py`
  monta `/storage` como estáticos solo si `STORAGE_PROVIDER=local`, para que `DocumentRef.url` sea
  navegable en dev/demo (sin auth — el nombre es un UUID no adivinable; documentado como
  simplificación aceptable para B3, no para producción real).
  **Invariante I-05**: `CandidateSnapshotForAI` (`app/ai/contracts/base.py`) carece físicamente de
  `full_name`/`photo_url`/`birth_date`/`gender`; `build_candidate_snapshot_for_ai` en
  `candidates/service.py` lo arma desde `CandidateProfile`. Test en frío en
  `tests/test_ai_snapshot.py` (dos tests: la clase no declara esos campos + la serialización de un
  perfil totalmente lleno no los filtra).
- **B4 — Puerto de IA, contratos, adaptador determinista y jobs**: `app/ai/contracts/` (`base.py`
  con los tipos compartidos incluido `CandidateSnapshotForAI`; `profiling.py`, `interview.py`,
  `assessment.py`, `advisory.py`, `matching.py` con las 9 operaciones, todas con `contract_version`
  y las validaciones duras de §6.3: `score` 0-100, `rubric_level` 0-4, `confidence` 0-1,
  `justification` `min_length=20`, `evidence_turn_ids` `min_length=1` — todas por Pydantic v2
  `Field`, así que un valor fuera de rango lanza `ValidationError` al construir el modelo, nunca se
  recorta). `app/ai/port.py`: `Protocol AIPort` con exactamente 9 métodos +
  `AI_OPERATIONS` (tupla, fuente única de nombres, con `assert` en `registry.py` que falla si se
  desincroniza). `app/ai/registry.py`: `get_adapter(operation)` resuelve `deterministic|agentic`
  por grupo (`cv`/`interview`/`assessment`/`advisory`/`matching`, variables `AI_ADAPTER_<GRUPO>`) o
  el default `AI_ADAPTER`; `AI_MODE=demo` fuerza `deterministic` sin excepción; pedir `agentic`
  levanta `AdapterNotImplementedError` explícito (no existe hasta B11, y no degrada en silencio).
  `app/ai/invoke.py`: wrapper único — arma el request, llama al método del adaptador resuelto,
  valida contra el `result_schema` Pydantic, reintenta con el **mismo** adaptador ante falla de
  validación (`AIValidationError`, hasta `LLM_MAX_RETRIES_PRIMARY`), o propaga `AIProviderError` si
  el adaptador lanzó una excepción (sin reintentar en el mismo intento); registra **siempre** en
  `ai_invocations` (operación, `contract_version`, adaptador, digest sha256 del request, salida
  cruda, latencia, reintentos, estado). Puntos de extensión de B11 comentados en el código:
  failover al proveedor secundario dentro de `invoke()`, y circuit breaker de docs/05 §8.1.
  `app/ai/adapters/deterministic.py`: las 9 operaciones sin LLM, coherentes con
  `frontend/src/api/mock/engine/*` (mismas reglas de negocio: CV plausible por familia, guion de 8
  turnos para el CV conversacional, entrevista adaptativa con ASK sobre competencias core primero,
  PROBE citando la respuesta más larga sin referenciar todavía — `references_turn_id` no nulo,
  verificado en un test de bucle completo —, evaluación que **lee `score_mapping` del `RubricSpec`
  recibido** (nunca de un prompt: la rúbrica la resuelve el servicio de dominio desde la tabla
  `rubrics` y se la pasa al adaptador ya armada), perfil de talento, feedback en dos tonos,
  learning path que **solo usa `catalog_entries` recibidas** (nunca inventa curso ni URL),
  resolución de requisitos con las mismas 8 frases discriminatorias del mock frontend, y
  explicación de match con una aserción defensiva propia (`_assert_no_foreign_percentage`) que
  replica en Python el `assertExplanation` de `frontend/src/api/mock/engine/explain.ts`.
  Modelo `AIInvocation` (`app/ai/models.py`) y `Job` + runner (`app/core/jobs.py`, con
  `BackgroundTasks`): ciclo `QUEUED → RUNNING → DONE | FAILED`; `run_job` le pasa al `worker` la
  misma sesión con la que va a marcar `DONE`, así que si el `worker` lanza cualquier excepción,
  `run_job` hace `rollback()` antes de marcar `FAILED` — ninguna escritura a medias del worker
  sobrevive (test explícito en `tests/test_jobs.py`, con `SessionLocal` real porque el runner abre
  su propia sesión a propósito). `GET /jobs/{id}` devuelve `Job` del contrato.
  **Límite de alcance con B5, importante para quien siga**: el job `CV_PARSE` (worker en
  `app/modules/documents/service.py::cv_parse_worker`) ejercita `AIPort.parse_cv` de punta a punta
  y deja el `Document` en `PARSED`/`FAILED`, pero usa un **texto de marcador de posición** derivado
  del nombre de archivo como `document_text` (no lee el PDF real) — igual que hace el mock del
  frontend. No existen todavía `cv_extractions` ni `claims`: el `result_ref` del job es el
  `document_id`, no una extracción persistida. B5 debe: (1) extraer texto real con
  `pypdf`/`python-docx`, (2) crear la fila `cv_extractions` y las `claims`, (3) construir el
  endpoint de confirmación que mueve `candidate_profiles.status` a `CV_READY` y así reemplaza la
  señal aproximada de `REVIEW_CLAIMS` en `compute_status_view`.
  Migración `9826d961beb1_documents_jobs_ai_invocations.py` (autogenerada y revisada): tablas
  `ai_invocations`, `jobs`, `documents`.

**Desviaciones respecto a docs/04 y docs/05** (documentadas también en el código, no solo aquí):

1. **`AIPort` con `def` síncrono, no `async def`** (docs/04 §6.1, docs/05 §8 lo declaran async).
   Coherente con la decisión ya tomada en B0 de SQLAlchemy síncrono en todo el backend — FastAPI ya
   ejecuta las dependencias síncronas en threadpool, así que mezclar dos estilos de concurrencia no
   compraba nada hoy. Cuando B11 conecte un cliente HTTP async real, `AgenticAdapter` puede
   envolver la llamada (hilo o `asyncio.run`) sin tocar el `Protocol`. Ver docstring de
   `app/ai/port.py`.
2. **`invoke()` comitea la sesión que recibe** al registrar `ai_invocations` (éxito o falla). Es lo
   que permite que un `worker` de job mute filas de dominio (ej. `document.status`) sin comitear
   él mismo, y que ese cambio se persista junto con el resultado de IA como una sola unidad. Efecto
   colateral documentado: cualquier cambio pendiente que el llamador ya hubiera hecho en esa misma
   sesión también se comitea. Ver docstring de `app/ai/invoke.py`.
3. **Evaluaciones de competencias no exploradas**: el adaptador determinista solo evalúa
   competencias con al menos un turno respondido (no genera automáticamente un nivel 0 por cada
   competencia de la rúbrica que nunca se tocó). Sintetiza una única entrada `BASELINE` de nivel 0
   solo para no violar `EvaluationResult.evaluations` (`min_length=1`) cuando la transcripción no
   cubrió nada. Backfillear "nivel 0 con confianza baja" para cada competencia core no explorada es
   una regla de negocio de `assessments/service.py` (B7), no una decisión que le corresponda al
   adaptador de IA — anotado en el docstring de `evaluate_competencies`.
4. **`uploadCertification(file, skillCode?)`** acepta `skill_code` (coherente con el contrato) pero
   no lo persiste: `documents` (docs/04 §5.3) no tiene esa columna: el vínculo evidencia-skill vive
   en `skill_evidences` (B7). Queda como parámetro aceptado y documentado para que B7 lo use sin
   cambiar la firma del endpoint.

**Verificación de cierre — salida real** (con el servidor corriendo,
`DATABASE_URL` explícito de `backend/README.md`, archivo real
`frontend/public/demo/cv-ejemplo.pdf`):
- `alembic upgrade head` → `Running upgrade fe3ea41d61ec -> 9826d961beb1, documents jobs ai_invocations`
  sin error. `python -m app.seeds.run` corrido después → `seeds_completed`, mismos conteos que B0-B2
  (idempotente, sin filas nuevas).
- `pytest` → **42/42 passed** (12 de B0-B2 + 30 nuevos: perfil GET/PATCH incluida preservación de
  campos en PATCH parcial, `job-family` con 404 en id inexistente, `next_step` en los 6 estados,
  upload con MIME no permitido → 415, upload > 10 MB → 413, ciclo de vida de un job éxito y falla
  sin escritura parcial, I-05 (2 tests), score/rubric_level/confidence fuera de rango → error sin
  clamp (I-04), justification corta y evidence_turn_ids vacío rechazados, las 9 operaciones del
  adaptador determinista validan contra sus contratos incluida la entrevista completa con
  `references_turn_id` no nulo, D-01 (listar certificaciones)).
- `ruff check app tests` → sin hallazgos.
- Con `uvicorn` corriendo en `:8000`: registro + login de candidato → 200/201 con token; `PATCH
  /candidates/me` (con `location` anidado) → 200, un segundo PATCH parcial preserva `full_name`;
  `POST /candidates/me/job-family` con `WAREHOUSE_SUPERVISOR` → 200, `job_family_id` correcto;
  `GET /candidates/me/status` → `ONBOARDING` sin familia, `CV` tras fijar familia; `POST
  /candidates/me/cv` con el PDF real de demo → `202 {"job_id": "..."}`; polling `GET /jobs/{id}` →
  `DONE` con `progress:100` y `result_ref` en el primer poll (adaptador determinista, sin red);
  `GET /candidates/me/status` después → `REVIEW_CLAIMS` (el documento CV quedó `PARSED`); `POST
  /candidates/me/certifications` → 200 con `DocumentRef` y `url` navegable bajo `/storage/...`;
  `GET /candidates/me/documents?type=CERTIFICATION` → lista con esa fila (D-01); upload de un
  `.txt` → `415 UNSUPPORTED_MEDIA_TYPE`; upload de un PDF de 11 MB → `413 UPLOAD_TOO_LARGE`. Log
  estructurado del servidor sin errores inesperados durante toda la corrida.

**Qué necesita saber quien siga con B5** (extracción de CV y CV conversacional):
- El job `CV_PARSE` ya existe y ya llama a `AIPort.parse_cv` vía `invoke()`; solo hace falta
  reemplazar el texto de marcador de posición en `cv_parse_worker`
  (`app/modules/documents/service.py`) por extracción real (`pypdf`/`python-docx`, con fallback a
  visión si el PDF es escaneado, según docs/05 §7 A1) y agregar la persistencia en `cv_extractions`/
  `claims` (modelos nuevos de B5) usando el `CVParseResult` ya validado que `invoke()` devuelve.
- `compute_status_view` en `candidates/service.py` tiene la señal `REVIEW_CLAIMS` aproximada con
  `Document.status == "PARSED"`; en cuanto exista `cv_extractions.confirmed_by_candidate`, esa
  condición debe reemplazarse (mismo `next_step`, misma forma de `CandidateStatusView`).
  `GET/PATCH /candidates/me/cv/extraction` (confirmación) es lo que debe mover
  `candidate_profiles.status` a `CV_READY`.
- `build_cv_conversationally` en `DeterministicAdapter` ya implementa el guion base de 8 turnos de
  forma **stateless** (recibe `turn_index`/`last_answer`/`answers_so_far`, devuelve el siguiente
  prompt): B5 es quien construye `cv-builder sessions` (persistencia de la sesión, avance de
  `turn_index`, ensamblado final del `CVExtraction` a partir de las respuestas capturadas) — el
  adaptador no guarda estado entre llamadas a propósito.
- El `AIPort`/`invoke()`/`registry` ya están completos y estables: cualquier operación nueva de B5
  reutiliza `parse_cv`/`build_cv_conversationally` tal cual están, sin tocar `port.py`.

### 2026-09-09 — B0+B1+B2 (Sonnet)

**Qué se construyó** (`backend/` completo, nuevo; `frontend/` no se tocó):

- **B0 — Base**: `pyproject.toml` + `requirements.txt` (versiones fijas, `pip install -r
  requirements.txt` verificado en un venv limpio y dentro del `Dockerfile`); `docker-compose.yml`
  con Postgres 16 (usuario/clave/db `conecta`, volumen persistente); `Dockerfile` de una sola etapa
  (`uvicorn app.main:app`, `$PORT` de Railway); `app/config.py` (pydantic-settings, todas las
  variables de `docs/04 §13` + `docs/05 §0.3`); `.env.example` completo y comentado;
  `app/database.py` (engine síncrono — decisión documentada en el docstring del propio archivo);
  `app/core/errors.py` (excepciones de dominio → `{code, message, details}`, incluye
  `INVALID_CREDENTIALS`, `UNLOCK_REQUIRED`, `NOT_EVALUATED`, `EMAIL_ALREADY_EXISTS`, más handlers
  de `RequestValidationError` y `HTTPException` para que **todo** error, no solo los de dominio,
  cumpla el formato del contrato); `app/core/logging.py` (structlog + middleware de `request_id`);
  `app/main.py` (CORS por allowlist, `/health` con verificación real de conexión a DB, todo bajo
  `/api/v1` salvo `/health`); `alembic/` inicializado con `env.py` leyendo `DATABASE_URL` desde
  `app.config.get_settings()` (nunca un valor fijo en `alembic.ini`).
- **B1 — Identidad**: modelo `users` (`app/modules/identity/models.py`); hash con argon2
  (`passlib[argon2]`) y JWT con **PyJWT** (`app/core/security.py`, `role` en el claim,
  `JWT_EXPIRE_MINUTES` configurable); `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
  devolviendo exactamente `AuthResponse`/`User` del contrato; registro con rol `CANDIDATE` crea
  `candidate_profiles` vacío con `anon_code` único (`CND-XXXX`, formato y unicidad verificados en
  test); rol `COMPANY` crea `companies` vacío en `UNVERIFIED`; `require_candidate()`,
  `require_company()`, `get_current_user()` como dependencias FastAPI; credenciales inválidas → 401
  `INVALID_CREDENTIALS` con mensaje en español, igual que el mock.
- **B2 — Catálogo y semillas**: modelos `job_families`, `competencies`, `skills`, `rubrics` (JSONB
  `levels` + `evidence_guidelines`, versionado), `learning_catalog`
  (`app/modules/catalog/models.py`); `GET /job-families`, `GET /job-families/{id}/competencies`,
  `GET /skills`; migración única de Alembic (`alembic/versions/fe3ea41d61ec_initial_schema.py`,
  generada con `--autogenerate` y revisada a mano) que crea las 8 tablas de B0-B2; `app/seeds/run.py`
  (`python -m app.seeds.run`) idempotente (upsert por clave natural: código de familia/competencia/
  skill, `(competency_id, version)` de rúbrica, `(competency_code, title)` de capacitación) que
  carga: 3 familias y sus 24 competencias con códigos/nombres/tipo/`is_core` copiados literalmente
  de `docs/build/02_API_CONTRACT.md` §2 y verificados contra
  `frontend/src/api/mock/seed/catalog.ts`; el catálogo de 41 skills (mismo archivo mock); **rúbricas
  v1 completas para las 24 competencias** (`app/seeds/rubrics/*.json`, 3 archivos por familia) con
  `what_to_probe`, 5 niveles 0-4 con descriptores observables (no adjetivos vagos), `positive_signals`,
  `negative_signals` y `score_mapping`, siguiendo la calidad del ejemplo `INVENTORY_CONTROL` de
  `docs/05 §6.2` (esa entrada se copió literal; las otras 23 se escribieron nuevas siguiendo el mismo
  patrón); y el catálogo de aprendizaje (20 filas, copiado de
  `frontend/src/api/mock/seed/learningCatalog.ts`).
- `backend/CLAUDE.md` con las reglas no negociables de `docs/build/05_BACKEND_TASKS.md` (dominio
  nunca importa adaptadores, `invoke.py` obligatorio, prompts versionados, rúbricas nunca en un
  prompt, `is_verified`/`total_score` nunca los escribe un agente, config solo por env, migración
  Alembic obligatoria) más las decisiones de este bloque. `backend/README.md` con puesta en marcha,
  migración, seed, verificación curl y tests.

**Decisiones y desviaciones** (ninguna contradice `docs/04`; todas están también en `backend/CLAUDE.md`):

1. **SQLAlchemy síncrono, no async** (docstring de `app/database.py`). FastAPI corre las
   dependencias síncronas en threadpool; se prioriza simplicidad de depuración y compatibilidad
   directa con Alembic/scripts de seed sobre concurrencia máxima. Documentado como decisión
   reversible si el volumen real lo exige.
2. **JWT con PyJWT**, no `python-jose` (ambos permitidos por la tarea). Passlib con backend argon2
   para el hash de contraseñas.
3. **Módulo `app/modules/catalog/`** agrupa `job_families`/`competencies`/`skills`/`rubrics`/
   `learning_catalog`. `docs/04 §4` no lo nombra explícitamente en su lista de módulos, pero B2 lo
   pide como bloque propio y no encajaba limpiamente en `candidates/`; queda anotado por si B3+
   prefiere fusionarlo.
4. **Puerto local de Postgres remapeado a 5433** (`docker-compose.yml`), no 5432. Hallazgo real al
   construir: en esta máquina Windows había un PostgreSQL nativo ya escuchando en 5432; Docker
   reportaba el contenedor como "healthy" y el mapeo `5432:5432` como activo, pero las conexiones a
   `localhost:5432` llegaban al proceso nativo (`no existe el rol "conecta"`). Remapear a 5433
   elimina la ambigüedad sin tocar nada del sistema del desarrollador. `.env.example`,
   `app/config.py` y `README.md` quedan consistentes con 5433; documentado también como riesgo para
   quien retome en otra máquina.
5. **Variable de entorno `DATABASE_URL` del sistema colisionaba con `.env`**: esta máquina tenía un
   `DATABASE_URL` exportado a nivel de shell (de otro proyecto, apuntando a Supabase) que
   `pydantic-settings` prioriza sobre el archivo `.env` (comportamiento estándar: entorno real >
   `.env`). Ningún comando de este bloque tocó esa base — todas las verificaciones pasaron
   `DATABASE_URL` explícito en la línea de comando apuntando al Postgres de `docker-compose.yml`.
   Anotado en `README.md` para que quien retome no pierda tiempo con un error "misterioso" de rol
   inexistente si le pasa lo mismo.
6. No se creó `app/modules/candidates/router.py` ni `GET/PATCH /candidates/me` — eso es alcance
   explícito de B3 en `docs/build/05_BACKEND_TASKS.md`. `app/modules/candidates/service.py` sí
   existe ya (con `generate_unique_anon_code`, `create_empty_profile`, `completion_percent`) porque
   B1 lo necesita para el registro.

**Cómo levantar todo (tres comandos, después de `docker compose up -d` y crear `.env` desde
`.env.example`)**:
```bash
alembic upgrade head
python -m app.seeds.run
uvicorn app.main:app --reload
```

**Verificación de cierre — salida real** (resumida; ver reporte del subagente para el detalle
completo de cada comando):
- `docker compose up -d` → contenedor `healthy` en el puerto 5433 tras el remapeo.
- `alembic upgrade head` → `Running upgrade -> fe3ea41d61ec, initial schema` sin error.
- `python -m app.seeds.run` corrido dos veces → mismo conteo ambas veces (3 familias, 24
  competencias, 41 skills, 24 rúbricas, 20 filas de aprendizaje); segunda corrida sin líneas
  `*_created` (todo upsert-sin-cambio).
- `GET /health` → `{"status":"ok","database":"up","environment":"local"}`.
- Registro candidato y empresa → `201` con `AuthResponse` válido; perfil de candidato creado con
  `anon_code` formato `CND-XXXX`; empresa creada en `UNVERIFIED`.
- Login de ambos → `200` con token; `GET /auth/me` con ese token → `200` con el `User` correcto.
- Login con contraseña incorrecta → `401 {"code":"INVALID_CREDENTIALS", ...}`.
- `GET /job-families` → 3 familias con los códigos exactos del contrato.
- `GET /job-families/{id}/competencies` (WAREHOUSE_SUPERVISOR) → 8 competencias con los códigos
  exactos.
- `GET /skills` → 41 skills.
- `pytest` → **12/12 passed** (registro+login+me, 401 con credenciales inválidas y con email
  desconocido, `/auth/me` sin token → 401, email duplicado → 409 `EMAIL_ALREADY_EXISTS`, contraseña
  corta → 422 `VALIDATION_ERROR`, `anon_code` único y con formato correcto entre dos candidatos,
  empresa creada `UNVERIFIED`, 3 familias con códigos exactos, cada familia con sus 8 competencias
  y `is_core` correcto, catálogo de skills sembrado, familia inexistente → 404 `NOT_FOUND`).
- `docker build` de la imagen del `Dockerfile` → exitosa; contenedor corrido contra la red de
  `docker-compose` → `/health` en verde con `database: up` y log estructurado con `request_id`.
- `ruff check app tests` → sin hallazgos.

**Qué queda pendiente para B3**: `GET/PATCH /candidates/me`, `POST /candidates/me/job-family`,
`GET /candidates/me/status`, módulo `documents` (modelo, storage, upload de CV/certificaciones),
invariante I-05 (snapshot para IA sin atributos protegidos — todavía no hay snapshot porque no hay
IA conectada). El modelo `CandidateProfile` de B0-B2 ya tiene todos los campos del contrato
(incluida `bio`, que `docs/04 §5.1` no lista explícitamente pero sí exige `CandidateProfilePatch`
del contrato — ver nota en `app/modules/candidates/models.py`), así que B3 solo necesita
service/router, no tocar el modelo salvo que surja un campo nuevo.

### 2026-09-09 — F9 (Sonnet)

**Qué se corrigió** (14 defectos visuales/de credibilidad de la demo, detectados en capturas de `frontend/output/e2e/`; ninguno cambió `src/api/types.ts` ni las invariantes de anonimato):

1. **Candidatos de semilla clonados** (`src/api/mock/seed/candidates.ts`): `buildSkills()` asignaba a los 5 candidatos de una familia las mismas skills, en el mismo orden, con el mismo conteo declarada/evaluada/verificada. Se agregó `rankHint: 1|2|3|4|5` a `CandidateSeedSpec` (1 = evidencia más fuerte de la familia) y tablas `SKILL_COUNT_RANGE`/`DECLARED_ONLY_RANGE`/`VERIFIED_RANGE`/`RUBRIC_LEVEL_RANGE` indexadas por ese hint; `buildSkills()` ahora usa `pickMany()` (ya existía en `util.ts`) sobre el pool de la familia para armar un subconjunto propio de 5-9 skills por candidato, con su propio orden y sus propios conteos evaluada/verificada (rankHint 5 siempre con 0 verificadas). `buildEvaluations()` también varía el rango de `rubric_level` por `rankHint` para que TECHNICAL/BEHAVIORAL discriminen de verdad. **Corregido** — confirmado en `21-e-talent-desktop.png`: los 3 destacados muestran skills y conteos ("8 declaradas·8 evaluadas·3 verificadas" vs "6·4·0") distintos, con separación de score real (75/51/38%).
2. **`evidence_summary` repetido**: se agregó `EVIDENCE_SUMMARIES: Record<string, string>` con una frase concreta por `skill_code` (~35 códigos, español de México) y `GENERIC_EVIDENCE_FALLBACKS` (4 variantes elegidas por ciclo, no rng, para nunca repetir dos veces seguidas si un código no tiene frase propia). **Corregido** — `22-e-candidate-detail-desktop.png` ya no repite ninguna frase entre las 8 evidencias mostradas.
3. **EXPERIENCE saturado en 100** (`src/api/mock/engine/matching.ts`): se reemplazó `min(100, años×20)` por `experienceCurve()`, interpolación lineal por tramos sobre anclas (0→0, 2→35, 4→55, 6→70, 9→85, 12→97, 16→100). **Corregido** — `24-e-compare-desktop.png` muestra 93%/89%/85% en vez de 100/100/100.
4. **Años de experiencia con decimales**: `yearsOfExperience()` ahora redondea a entero (`Math.round(months/12)`, antes 1 decimal). Se agregó `formatYearsExperience()` a `src/lib/format.ts` (singular/plural correcto) y se usa en `CandidateAnonymousCard`, `CandidateUnlockedCard` y `talentLabels.experienceLabel` (antes tenía su propia lógica duplicada con decimales). **Corregido**.
5. **Comparador cortado a 1280px** (`ComparePage.tsx`): columnas `minmax(240px,1fr)` + columna de criterios `minmax(140,168)` + `min-w-max` forzaban un ancho mayor a los ~956px útiles. Se redujo a `minmax(200px,1fr)` + criterios `minmax(110,140)` (740px mínimo, caben 3 columnas completas) y se quitó `min-w-max` (impedía que los tracks `1fr` se repartieran el espacio disponible). Se agregó un aviso `Desliza para ver los demás perfiles` visible solo `lg:hidden` para viewports angostos donde sí aplica el scroll horizontal. **Corregido**.
6. **Nomenclatura inconsistente** (`CANDIDATO #F82` en cards vs `CND-4F82` en "Ver diferencias clave"): el mock no puede importar `talentLabels.ts` (vive en `src/features`), así que se duplicó el helper como `anonDisplayCode()` en `src/api/mock/util.ts` y se usó en `explain.ts` (`buildExplanation`) y en el nuevo `buildKeyDifferences()`. También se corrigieron los `aria-label` de `ShortlistBoard.tsx` que aún usaban el código crudo. **Corregido** — sin romper la invariante de `assertExplanation` (ningún `%` distinto a `total_score`, no se tocó esa función).
7. **Icono superpuesto en "Enviar respuesta"** (`components/ui/Button.tsx`): el contenido (`children` + flecha opcional) vivía repartido entre el `gap-2` del `<button>` raíz y un `<span>` interno sin flex, lo que dependía del flujo inline por defecto para separar un ícono manual (`<Send/>`) del texto. Se envolvió todo el contenido (spinner, `children`, flecha) en un único `<span className="inline-flex items-center gap-2">`, garantizando separación consistente sin depender del `line-height`. **Corregido**.
8. **"Comparar (0)" con aspecto activo** (`TalentPage.tsx` + `Button.tsx`): el estado disabled solo bajaba la opacidad al 50% sobre el gradiente primario. Se agregó `disabledVisualClasses` (fondo `surface-soft`, texto `text-tertiary`, sin sombra/gradiente, `cursor-not-allowed`) aplicado solo cuando `disabled && !loading` (para no afectar el spinner de carga), y se cambió el texto de ayuda a "Selecciona 2 o 3 candidatos para comparar" visible con 0 o 1 seleccionados. **Corregido**.
9. **Una sola "diferencia clave"**: `compare()` en `src/api/mock/index.ts` generaba una sola línea. Se agregó `buildKeyDifferences()` en `explain.ts`: hasta 4 observaciones a partir del `breakdown`/`evidence_counts` ya calculados (líder general y brecha de puntos, líder técnico vs conductual, quién tiene más evidencia verificada o la más limitada, y en qué criterio individual el segundo lugar supera al líder — el dato que más podría inclinar la decisión). **Corregido**, sin inventar datos fuera del breakdown.
10. **Chips de skills apilados** (`CandidateAnonymousCard.tsx`): se agregó `MAX_VISIBLE_SKILLS=5` con chip `+N` para el resto (antes se cortaba en 6 sin indicar cuántas faltaban); `FeaturedCandidateCard` ahora pasa la lista completa de skills en vez de pre-cortarla a 5 para que el `+N` refleje el total real. **Corregido** (el ancho de cada chip ya era `inline-flex` a su contenido; el apilamiento visible era por texto largo en columnas angostas, no por full-width).
11. **ProgressRing ilegible sobre fondo oscuro** (reportado por el coordinador tras revisar capturas adicionales; **el más grave de los 14**): `ProgressRing` pintaba el número siempre en `text-text-primary` (oscuro), invisible sobre héroes oscuros. Se agregó `tone?: "light"|"dark"` (default `light`) que cambia número/etiqueta/track; se usa `tone="dark"` en el hero de `ResultPage.tsx` (entrevista), en el badge "Perfil completo" de `ProfilePage.tsx` y en `MatchScoreCard.tsx` (E9/E12), donde además se quitó la placa clara que F7 había improvisado como workaround. **Corregido** — "78%"/"100%"/"75%" ahora legibles en blanco sobre las 3 pantallas.
12. **Scores de entrevista saturados en 95** (`src/api/mock/engine/interview.ts`): `evaluateAnswer()` daba siempre el mismo score (rubric_level×20 + min(15,palabras)) para cualquier respuesta ≥25 palabras. Se agregó un hash FNV-1a del `turn.id`+texto sembrando un `mulberry32` que elige score y confianza dentro de un rango por nivel (76-92/62-78/48-64/28-42), determinista pero variado entre competencias. **Corregido** — la captura regenerada muestra 88/77/74/79/90% con confianza alta/media mixta en vez de 95/95/75/95/95.
13. **"Fortaleza principal"/"Oportunidad de desarrollo" mal redactadas**: `strengths` se armaba con `competency_name.toLowerCase()} (evaluada, ${score})`, produciendo minúsculas indebidas y paréntesis pegados a nombres que ya traían paréntesis propios (ej. "herramientas de oficina (excel, word, correo) (evaluada, 95)"). Se centralizó en `formatStrengthLine(name, score)` (nuevo, en `src/api/mock/util.ts`): conserva la capitalización real y separa el puntaje con dos puntos en vez de un paréntesis adosado. Se aplicó en las **3** funciones que generaban `strengths` (`seed/candidates.ts`, `engine/matching.ts`, `engine/interview.ts` — esta última se me había pasado en la primera pasada y se corrigió tras verificar la captura regenerada). También se corrigió la duplicación "Tu evidencia muestra evidencia sólida" → "Tu desempeño muestra evidencia sólida" en `candidate_note` (`seed/candidates.ts` y `engine/interview.ts`). Cuando no hay `evidence_gaps` reales, `ResultPage.tsx` ahora señala la competencia de menor confianza en vez de una línea vacía ("Tu evidencia quedó completa…"). **Corregido**.
14. **Bio contradictoria en el perfil** (`ProfilePage.tsx`, pestaña "Sobre mí"): se mostraba el placeholder de biografía vacía **y**, debajo, el `summary_text` del talent profile al mismo tiempo. Ahora es mutuamente excluyente: `profile.bio` → biografía real; si no hay bio pero sí `summary_text` → se muestra como "Resumen generado por IA" (con esa etiqueta, para no hacerlo pasar por biografía propia); si no hay ninguno, el placeholder original. **Corregido**.

**Suites de cierre**: `npm run typecheck` (0 errores), `npm run build` (verde), `npm run smoke:mock` (22/22), `npm run smoke:interview` (13/13), `npm run e2e:smoke` (**50/50**, dos corridas completas — la segunda tras corregir el punto 13 en `interview.ts`) — ningún selector del e2e cambió. Verificado con `Read` sobre las 4 capturas regeneradas (`21-e-talent-desktop.png`, `22-e-candidate-detail-desktop.png`, `24-e-compare-desktop.png`, `07-c-interview-inprogress-desktop.png`) y las 2 adicionales que motivaron los defectos 11-14 (`08-c-interview-result-desktop.png`, `17-m-profile-desktop.png`): los 14 defectos ya no se observan.

**Archivos tocados**: `src/api/mock/seed/candidates.ts`, `src/api/mock/engine/matching.ts`, `src/api/mock/engine/interview.ts`, `src/api/mock/engine/explain.ts`, `src/api/mock/index.ts`, `src/api/mock/util.ts`, `src/lib/format.ts`, `src/components/ui/Button.tsx`, `src/components/ui/ProgressRing.tsx`, `src/components/ui/CandidateAnonymousCard.tsx`, `src/components/ui/CandidateUnlockedCard.tsx`, `src/features/employer/talent/talentLabels.ts`, `src/features/employer/talent/ComparePage.tsx`, `src/features/employer/talent/TalentPage.tsx`, `src/features/employer/talent/components/{FeaturedCandidateCard,MatchScoreCard,ShortlistBoard}.tsx`, `src/features/candidate/interview/ResultPage.tsx`, `src/features/candidate/interview/InterviewControls.tsx` (sin cambios funcionales, solo se benefició del fix de `Button.tsx`), `src/features/candidate/profile/ProfilePage.tsx`. Ningún archivo de `api/types.ts` ni cambio de anonimato.

**Riesgo remanente para la demo**: la confianza "baja" (< 50 %) no apareció en la corrida capturada del e2e (las respuestas del script tienden a ser largas); la variedad de rango ya existe en el código (`evaluateAnswer` cubre 0.3-0.93) pero solo se ve con respuestas cortas reales. `years_experience` puede seguir siendo mayor al `yearsExperience` de la ficha semilla cuando `buildExperience()` agrega 1-2 empleos previos simulados (comportamiento preexistente de F2, fuera de alcance de esta tarea — solo se corrigió que se muestre como entero).

### 2026-09-09 — F5 (Sonnet)

**Qué se construyó** (`src/features/candidate/profile/**`, `src/features/candidate/opportunities/**`, y edición aditiva de `src/features/candidate/candidate.routes.tsx` + `src/api/hooks/mutations.ts`):

- **`profile/ProfilePage.tsx` (C11)** `/candidate/profile`: hero oscuro (`BrandBackground asset="profile" presence="support" ambient`) idéntico en ambas variantes (Avatar, nombre, familia vía `useJobFamilies`, ubicación, disponibilidad, `ProgressRing` de `completion_percent`, CTA `Editar perfil` y `Descargar CV`). Variante **evaluada** (`useTalentProfile()` resuelve con datos): badge "Entrevista con IA completada" + `Tabs` (Sobre mí · Habilidades · Evidencias · Experiencia · Estudios · Certificaciones · Ruta de desarrollo). Habilidades: `SkillChip`+`EvidenceBadge` derivado con `evidenceLevelForSkill()` (verified > evaluated > declared) + leyenda de los 3 niveles. Evidencias: `CompetencyEvaluation[]` de `talentProfile.evaluations` con `ProgressBar`, confianza en texto y badge "Rúbrica provisional" si aplica. Certificaciones: `CertificationUploader.tsx` (selector de skill del catálogo + `FileUploader` + `documents.uploadCertification`, badge `pending` fijo con la nota de la spec). Ruta de desarrollo: `learningPath.gaps.slice(0,3)` con recomendaciones. Variante **en construcción** (`talentProfile` 404 `NOT_EVALUATED`, detectado con `error instanceof ApiClientError && error.code === "NOT_EVALUATED"`): mismo hero, card "Tu perfil se está construyendo" con CTA a `/candidate/interview/prepare`.
- **`profile/ProfileEditPage.tsx` (C12)** `/candidate/profile/edit`: 6 secciones independientes (datos básicos, foto, ubicación, disponibilidad, salario, bio), cada una con su propio `<form>`, botón "Guardar" y `useUpdateCandidate().mutateAsync(patchParcial)` + `useToast()` (hook local `useSectionSave()` centraliza el patrón). Foto: URL o archivo → `FileReader` a data URL (`photo_url`). Nota de privacidad fija bajo datos básicos/foto.
- **`opportunities/OpportunitiesPage.tsx` (C13)** `/candidate/opportunities`: header oscuro con `BrandBackground asset="brand-main" presence="accent"`. `FilterPills` primarias (Para ti · Familia · Modalidad · Ubicación) definen una dimensión; al elegir Familia/Modalidad/Ubicación aparece una segunda fila de `FilterPills` con los valores presentes en la lista (filtrado 100% local, sin llamada extra). Card protagonista = mayor `compatibility` del conjunto filtrado (o la primera si todas son `null`) con `Card variant="dark" background={{asset:"cards",presence:"accent"}}`; grid de `JobCard` para el resto, bookmark en `localStorage["ce-bookmarks"]` (`opportunities.utils.ts`), texto "Completa tu entrevista para ver tu compatibilidad" bajo cada card sin score. Empty states para "sin oportunidades" y "sin resultados con este filtro".
- **`opportunities/OpportunityDetailPage.tsx` (C14)** `/candidate/opportunities/:id`: cabecera con meta (empresa+verificada, ubicación, modalidad, salario); `AIInsightCard` "Por qué encajas" (o card con CTA a la entrevista si no hay compatibilidad todavía) + card propia "Requisitos aún sin evidencia" con `EvidenceBadge level="pending"` por ítem; requisitos con `kind` (Esencial/Deseable) y nivel (Básico/Intermedio/Avanzado/Experto); CTA `Postularme` → `useApply()` → check animado (`motion` spring) + toast; si `applied` ya es `true` (o se acaba de postular), muestra el estado en vez del botón.
- `profile/profile.utils.ts` (labels de disponibilidad, estados de México — no existía una lista compartida, `evidenceLevelForSkill()`, `confidenceLabel()`) y `opportunities/opportunities.utils.ts` (labels de `WorkMode`/`RequirementKind`/nivel, `familyCodeLabels`, `salaryText()`/`locationText()` compartidos entre lista y detalle, helpers de bookmarks).

**Decisiones / desviaciones** (regla: opción más simple que no contradiga la spec):
1. El badge "Entrevista con IA completada" solo aparece en la variante evaluada (la spec lo lista dentro de esa viñeta); el resto del hero es idéntico en ambas variantes, tal como pide el prompt.
2. La edición de la biografía se centralizó en C12: la pestaña "Sobre mí" de C11 muestra el texto (o un placeholder) + un botón "Editar biografía" que navega a `/candidate/profile/edit`, en vez de duplicar un segundo flujo de guardado inline. También se agregó ahí el `ScoreBadge` de `overall_score`/`overall_label` y el `summary_text` del `TalentProfile` para aprovechar datos del contrato ya disponibles.
3. **Descargar CV**: no hay forma de obtener "el documento vigente del candidato" sin un `session_id` de `cvBuilder` (que no se persiste en `CandidateProfile`), así que se optó por la alternativa que el propio prompt permite ("o muestra el enlace demo"): el botón enlaza directo a `/demo/cv-ejemplo.pdf`. No se llamó a `api.cvBuilder.document()` porque hacerlo sin un id real solo serviría para fallar y caer al mismo enlace — se documenta aquí en vez de simular una llamada sin sentido.
4. **Certificaciones — límite real del contrato**: `ApiClient` no expone un endpoint para listar certificaciones ya subidas (`documents.uploadCertification` solo devuelve el `DocumentRef` de la subida en curso). La lista de certificaciones en C11 por diseño solo puede reflejar lo subido en la sesión actual del navegador; certificaciones subidas en sesiones previas no se recuperan. Si se agrega un `candidate.documents()`/`documents.list()` en la fase backend, esta sección debería consumirlo.
5. **Aviso sobre el mock**: `src/api/mock/index.ts` (`documents.uploadCertification`) marca `skill.is_verified = true` de inmediato cuando se pasa `skillCode`, en vez de dejarlo pendiente de revisión. El frontend no depende de ese flag para pintar el ítem recién subido (siempre se pinta `pending`, con estado local propio), pero si el usuario visita la pestaña Habilidades después de certificar, puede ver esa skill ya como "Verificada" — es un comportamiento del mock (F2, no tocado) que no coincide con "el frontend nunca marca verified"; queda anotado para quien retome el mock/backend.
6. `FilterPills` de C13: la spec solo da 4 etiquetas sin detallar el mecanismo; se interpretaron como selector de *dimensión* + segunda fila de valores concretos (ver arriba), documentado por no haber detalle adicional en la spec.
7. Nivel de requisito (`1-4`) en C14 etiquetado como Básico/Intermedio/Avanzado/Experto — el contrato no da estas etiquetas, es la opción más simple y consistente con el resto del copy.
8. Se agregó `useUploadCertification()` a `src/api/hooks/mutations.ts` (archivo compartido, cambio aditivo y mínimo: una función más siguiendo el mismo patrón que las demás mutaciones del archivo) porque C11 la necesitaba y no existía.

**Archivos compartidos tocados**: `src/features/candidate/candidate.routes.tsx` (agregadas mis 4 entradas `profile`, `profile/edit`, `opportunities`, `opportunities/:id` en `shellRoutes`, releído justo antes de editar; F3 ya había puesto `index`→`HomePage` y no se tocó), `src/api/hooks/mutations.ts` (agregado `useUploadCertification`, ver punto 8). No se tocó `api/types.ts`, `api/client.ts`, `api/mock/**`, `components/ui`, `components/layout`, `tokens.css` ni `app/router.tsx`.

**Verificación de cierre**: `npm run typecheck` y `npm run build` en verde con el árbol completo (F3/F4/F6/F7 ya presentes). `npm run dev` respondió `200` en `/` y `/candidate/profile` (curl, servidor detenido después). Sin `any` ni `console.log` en mis archivos (grep). No se pudo hacer un recorrido manual en navegador real (sin herramienta de browser en este entorno); la validación de datos se apoyó en la lectura directa de `src/api/mock/index.ts` y `seed/candidates.ts` para confirmar la forma exacta de `Opportunity`, `TalentProfile.evaluations` y `CandidateSkill`.

### 2026-09-09 — F7 (Opus)

**Qué se construyó** (`src/features/employer/talent/**`; las 5 entradas de ruta que agregué a `src/features/employer/employer.routes.tsx` quedaron barridas dentro del commit `4e401d5` de F6, ver "archivos compartidos"):

- `talentLabels.ts` — fuente única de etiquetas y derivaciones anónimas: `geoBandLabels`, `availabilityLabels`, `jobFamilyLabels`, `matchComponentLabels`, `penaltyReasonLabels`, `shortlistStageLabels/Order`, copys fijos (`PRIVACY_NOTICE`, `EVIDENCE_NOTICE`, `AI_SUPPORT_NOTICE`, `RANKING_NOTICE`), `anonDisplayCode` (`CND-4F82` → `CANDIDATO #F82`), `evidenceLevelFor(skill)`, `breakdownAriaText`, `unvalidatedClaims`, `interviewEvidence`, `candidateSummaryText`. No conoce identidad.
- **E8 `TalentPage.tsx`** (`/employer/vacancies/:id/talent`). Header oscuro con `BrandBackground asset="matching" presence="accent"` (solo header) + `LightSurface`. Resolución del ranking: si llega `?job=`, `useJob` hace polling con `ProcessingStatus` ("Comparando habilidades y evidencia…" + 2 mensajes más, con `progress` del job) y al `DONE` toma `result_ref` como `runId`; si no, `vacancy.last_match_run_id`; si es null, empty state "Aún no has buscado talento para esta vacante" con CTA `Buscar talento` → `useRunMatch` → mismo flujo (job `FAILED` tiene su propio estado con reintento). Filtros locales (`TalentFilters` + `applyTalentFilter`) sobre la página cargada, orden por `rank_position`. 3 destacados (`FeaturedCandidateCard`, envuelve `CandidateAnonymousCard` de F1) + lista compacta (`CandidateCompactRow`) con "Ver más" por `offset` (páginas de 20 acumuladas por `match_result_id` en estado local). Selección múltiple máx. 3 con toast al intentar la 4.ª y CTA `Comparar (n)` habilitado con 2–3. `Agregar a selección` → `setShortlistStage("REVIEW")` con bookmark animado y rollback optimista si falla. Motion: stagger de cards → count-up de scores (`useCountUp`) → anillos (`ProgressRing`).
- **E9 `CandidateDetailPage.tsx`** (`/employer/candidates/:matchResultId`). Cabecera clara anónima (`Avatar anonymous seed={anon_code}`, código, familia, experiencia, disponibilidad, `geo_band`, `salary_band`) + `MatchScoreCard` (card oscura con `ProgressRing` grande sobre placa clara, `score_label`, `BreakdownChart` de 6 barras con componente/peso/raw/contribución y texto accesible por barra, `PenaltyList` con causa y puntos) + `AIInsightCard` "Por qué es compatible" (`explanation_text` como `body`, `strengths` como "Por qué", `gaps` como "Falta evidencia"; si `explanation_text` es null muestra el skeleton "Redactando explicación…" del componente y reintenta `refetch()` a los 2 s) + `CandidateEvidenceSections` + `Select` de etapa (Sin seleccionar / Revisar / Entrevistar / Finalista) → `setShortlistStage` + `Desbloquear identidad` (primary) con `UnlockModal` ("Verás nombre, contacto y documentos. Esta acción queda registrada.") → `useUnlock` → E12.
- **E10 `ComparePage.tsx`** (`/employer/vacancies/:id/compare?ids=a,b,c`). `useCompare` con hasta 3 ids. Grid row-major (`gridTemplateColumns: 168px repeat(n, minmax(240px,1fr))`) dentro de un contenedor `overflow-x-auto snap-x`: columna de criterios `sticky left-0` (carrusel mobile), cabecera por candidato (`CompareColumn`: avatar anónimo, `ScoreBadge`, `Ver perfil anónimo`, `Agregar a selección`), una fila por `CompareView.criteria` con `ProgressBar` de escala 0–100 consistente + texto sr-only, fila extra "Disponibilidad y zona" y fila de habilidades con `EvidenceBadge`. Bloque `Ver diferencias clave` con `key_differences` y el copy "Ningún ranking es una verdad absoluta; la decisión es tuya."
- **E11 `ShortlistPage.tsx`** + `ShortlistBoard.tsx`. Funnel Revisar → Entrevistar → Finalistas con conteos en el header y por columna; desktop 3 columnas (`ShortlistBoard`), mobile las mismas etapas como `Tabs`; mover con chevrons (`setShortlistStage`) dentro de un `LayoutGroup` con `layoutId` por entrada (prefijo distinto en desktop/tabs para no colisionar), `Quitar` (stage `null`), empty state por columna, `Desbloquear identidad` solo en FINALIST (abre `UnlockModal` → `useUnlock` → E12).
- **E12 `UnlockedProfilePage.tsx`** (`/employer/candidates/:matchResultId/full`). `useFullProfile`; si el error es `ApiClientError` con code `UNLOCK_REQUIRED` (403) muestra toast y redirige a E9 con `replace`. Hero `profile` support con avatar `blur(14px) → nítido` y nombre con `fadeUp` retrasado, `Badge` "Identidad desbloqueada · <fecha>". Contacto (correo/teléfono/ubicación) con `Copiar correo` (clipboard + check 2 s + toast de error) e `Invitar a entrevista` (solo `Modal` con plantilla, no envía). Debajo, todo lo de E9 (`MatchScoreCard`, explicación, `CandidateEvidenceSections`) + Experiencia, Estudios, Documentos (`DocumentRef` con enlace `Abrir`) + `company_note` en un segundo `AIInsightCard` "Qué convendría verificar en una entrevista presencial" + copy "La IA apoya tu decisión; no la reemplaza."
- Componentes locales: `BreakdownChart`, `PenaltyList`, `MatchScoreCard`, `CandidateEvidenceSections` (habilidades con `EvidenceBadge`, evidencias de entrevista desde `skills[].evidence_summary`, consistencias con los declarados no evaluados marcados "declarado, no validado", conteo de documentos verificados), `TalentFilters`, `FeaturedCandidateCard`, `CandidateCompactRow`, `CompareColumn`, `ShortlistBoard`/`ShortlistColumn`, `UnlockModal`.

**Verificación de anonimato** (`grep -rn "full_name\|photo_url\|UnlockedCandidateProfile\|useFullProfile" frontend/src/features/employer/talent`):

```
ShortlistPage.tsx:7:import { useFullProfile, useSetShortlistStage, useShortlist, useUnlock, useVacancy } from "@/api/hooks";
ShortlistPage.tsx:26:  const { data } = useFullProfile(matchResultId);
ShortlistPage.tsx:27:  return <>{data?.full_name ?? fallback}</>;
UnlockedProfilePage.tsx:18:import { useFullProfile } from "@/api/hooks";
UnlockedProfilePage.tsx:47:  const profileQuery = useFullProfile(matchResultId);
UnlockedProfilePage.tsx:107:  const inviteTemplate = `Hola ${profile.full_name.split(" ")[0] ?? ""}:
UnlockedProfilePage.tsx:140:              <Avatar name={profile.full_name} src={profile.photo_url ?? undefined} size="lg" />
UnlockedProfilePage.tsx:157:                {profile.full_name}
```

Solo E12 y el sub-componente `UnlockedEntryName` de E11 (montado únicamente cuando `entry.is_unlocked`, como permite 04 §E11). Los componentes compartidos por E9 y E12 (`MatchScoreCard`, `CandidateEvidenceSections`, `BreakdownChart`, `PenaltyList`) están tipados contra `AnonymousCandidateCard`; E12 les pasa el perfil desbloqueado porque `UnlockedCandidateProfile extends AnonymousCandidateCard`, sin que esos archivos vean nunca identidad.

**Decisiones / desviaciones** (ninguna contradice la spec):
1. "Mayor compatibilidad" es un **filtro** (`total_score >= 70`, es decir compatibilidad alta o muy alta), no un orden: el orden por `rank_position` ya es descendente por score en todas las vistas.
2. La paginación acumula páginas de 20 por `offset` en estado local del componente (`Map` por `match_result_id`, reordenado por `rank_position`), porque `useMatchResults` devuelve una sola página por query key.
3. `useSetShortlistStage` (F2) solo invalida `["vacancies"]`; desde mis páginas agrego `invalidateQueries(["match-results"])` y `["match-result"]` en el `onSuccess` de cada `mutate` (opción local, sin tocar `api/hooks/mutations.ts`).
4. El anillo `ProgressRing` de F1 pinta el número en `text-text-primary`, ilegible sobre oscuro: en la card oscura de E9/E12 va sobre una placa `bg-surface` redonda. En los destacados de E8 el mini anillo va en la línea superior de la card (el `CandidateAnonymousCard` de F1 no admite slots, no se modificó).
5. `CandidateAnonymousCard` rotula el desbloqueo como "Contacto desbloqueado" (texto fijo de F1); el chip "Identidad desbloqueada" que pide la spec lo agrego yo en la cabecera del destacado, en la fila compacta y en E9/E10.
6. El contrato no tiene fecha de desbloqueo (`UnlockedCandidateProfile` no la expone): el badge de E12 sella la fecha al abrir la pantalla. Si el backend agrega `unlocked_at`, cambiar `unlockedAt` en `UnlockedProfilePage.tsx`.
7. `CompareView.criteria` del mock trae `total_score` + los 6 `MatchComponent` (no disponibilidad): agregué una fila de texto "Disponibilidad y zona" (disponibilidad, `geo_band`, `salary_band`) para cubrir lo que pide E10 sin inventar un criterio numérico.
8. "Documentos verificados (conteo)" en E9 se deriva de `evidence_counts.verified` (habilidades respaldadas por documento): `AnonymousCandidateCard` no expone `DocumentRef[]`, que sí aparece completo en E12.
9. En E10 la cabecera lleva `sticky top-0`, pero como el contenedor tiene `overflow-x-auto` (y por tanto `overflow-y` computado a `auto`) no llega a fijarse en la práctica; lo que sí funciona y es lo importante en mobile es la columna de criterios `sticky left-0`. Si F8 quiere la cabecera sticky real, hay que sacar el scroll horizontal a un wrapper con altura.

**Archivos compartidos tocados**: solo `src/features/employer/employer.routes.tsx`, con mis 5 entradas `lazy` aditivas dentro de `shellRoutes` (`vacancies/:id/talent`, `vacancies/:id/compare`, `vacancies/:id/shortlist`, `candidates/:matchResultId`, `candidates/:matchResultId/full`). F6 hizo `git add` de ese archivo mientras yo trabajaba, así que esas líneas viajaron en su commit `4e401d5`; el commit `a49ad85` de F7 contiene el resto (`src/features/employer/talent/**`). No se tocó `components/ui`, `components/layout`, `lib/`, `api/` ni `store/`.

**Cierre**: `npx tsc --noEmit` **sin ningún error en todo el proyecto** y `npm run build` en verde (chunks `TalentPage` 16.1 KB, `UnlockedProfilePage` 10.3 KB, `ShortlistPage` 9.9 KB, `ComparePage` 7.3 KB, `MatchScoreCard` 9.2 KB; el aviso de chunk >500 KB es el preexistente de `three`/`index`). Sin `any` ni `console.log` en mis rutas (grep en verde). `npm run dev` respondió `200` en `/`, en `/employer/vacancies/vac_warehouse_open/talent` y en el módulo `TalentPage.tsx` servido por Vite; servidor detenido después. **No se hizo recorrido manual E8→E12 en navegador** (sin driver disponible en este entorno): queda como riesgo para F8, sobre todo el `?job=` que produce E5 de F6 y el estado de "Ver más" con más de 20 candidatos (la semilla tiene 5 por familia, así que la paginación no se ejercita con datos por defecto).

### 2026-09-09 — F4 (Opus)

**Qué se construyó** (`src/features/candidate/interview/**` + `frontend/scripts/smoke-interview.mjs`; único archivo compartido tocado: `src/voice/BrowserVoiceGateway.ts`, cambio aditivo, ver abajo):

- **`PreparePage.tsx` (C8)** `/candidate/interview/prepare`: `ImmersiveLayout` + fondo `interview` presencia `support` en el tercio superior. Panel destacado con duración (~8 min / 6 preguntas), formato, **prueba de micrófono** con barra de nivel en vivo (`useMicrophone`, `role="progressbar"`) y estado de conexión (`navigator.onLine` + listeners `online`/`offline`). "Qué evaluaremos" = competencias `is_core` de la familia del candidato (`useCompetencies`) como `Badge`; checklist previo con checks animados (`staggerContainer` + `scaleIn`); selector de modo `Con voz (recomendado)` / `Por texto` como radiogroup propio (no `RadioCards`: ese componente está pensado para superficie clara y aquí el fondo es oscuro). Si el navegador no soporta voz, la opción de voz se deshabilita con explicación y el modo cae a `TEXT`. CTA `Comenzar entrevista →` (o `Continuar entrevista` si `candidate.status().interview_session_id` no es nulo) → `interviews.create(mode)` → `/candidate/interview/:id`.
- **`InterviewPage.tsx` (C9)** `/candidate/interview/:id`: `ImmersiveLayout` con `aside` (`ContextAside`, solo desktop `md:`). Composición: `QuestionPanel` (ProgressSteps + chip PROBE + H2 con `aria-live`, crossfade por `turn.id`) · `OrbStage` · banner de error con reintento · `TranscriptBox` · `InterviewControls` · aviso de privacidad fijo. Cerrar abre `Modal` de confirmación ("Puedes retomar después; tu progreso se guarda") y vuelve a `/candidate`.
- **`ResultPage.tsx` (C10)** `/candidate/interview/:id/result?job=`: `useJob(?job)` con `ProcessingStatus` ("Preparando tu resumen…" + 2 mensajes, ligado a `job.progress`); al `DONE` invalida `talentProfile`/`feedback`/`candidateMe` y habilita esas queries. Hero `results` con `ProgressRing` 180 px 0→`overall_score` + `overall_label` + `summary_text`; `LightSurface` con "Desempeño por competencia": `ProgressBar` por evaluación con `delay = index*120`, expandible (`aria-expanded`/`aria-controls`) mostrando `justification`, `limitations`, `confidence` en texto ("confianza alta/media/baja") y `EvidenceBadge`; badge `Rúbrica provisional` con `Tooltip` cuando `rubric_source !== "SPECIFIC"`. `AIInsightCard` ×2 ("Fortaleza principal" con `strengths` + `feedback.candidate_note`; "Oportunidad de desarrollo" con `evidence_gaps`). Copy fijo de la spec y CTA `Ver mi Perfil de Talento Verificado →` a `/candidate/profile`. Estado `FAILED` del job con reintento.
- Componentes locales: `OrbStage.tsx`, `QuestionPanel.tsx`, `TranscriptBox.tsx`, `InterviewControls.tsx`, `ContextAside.tsx`. Hooks: `useInterviewMachine.ts`, `useInterviewVoice.ts`. Entry de prueba: `__smoke__.ts`.

**Máquina de estados (`useInterviewMachine`)**: `loading → speaking → listening → thinking → speaking … → finished`, más `paused` y `error`. En modo `TEXT` se salta `speaking` (se va directo a `listening`) pero la pregunta se muestra igual. `finished` llama `interviews.complete` y navega a `/candidate/interview/:id/result?job=<job_id>` con `replace: true`. Estado derivado del Orb: `speaking→speaking`, `thinking|finished→thinking`, `listening` sin mute ni transcripción en curso → `listening`, resto → `idle`. Dentro de `listening` hay dos banderas: `micMuted` y `reviewing` (micrófono ya cerrado, transcripción editable pendiente de enviar) — se modelaron como banderas y no como estados nuevos para no desviarse de la máquina documentada en `03 §C9`. Concurrencia: un contador `epochRef` invalida toda continuación asíncrona superada por una acción posterior (repetir, pausar, cambiar de modo, enviar), así no hay carreras entre TTS/STT y la red.

**Cómo se conecta la voz (importante para el `ServerVoiceGateway` de la fase backend)**: toda la voz pasa por `useInterviewVoice`, que solo depende de la interfaz `VoiceGateway` de `02 §6` — la fase backend solo tiene que sustituir la construcción de `BrowserVoiceGateway` por `ServerVoiceGateway` (WebSocket) y **nada más cambia**. El hook garantiza: (1) una única instancia de gateway y un único `AudioContext` por sesión; (2) `speak()` resuelve al terminar y expone `analyser` para el Orb (con `BrowserVoiceGateway` es `null` → el Orb usa su animación procedural); (3) `startListening()` entrega el `analyser` del micrófono y `stopListening()` la transcripción, que se **acumula** en el borrador (no se sobrescribe) para que silenciar/repetir/pausar no borre lo dicho; (4) toda falla de voz se normaliza a `VoiceUnavailableError` para que la UI caiga a texto sin perder el turno; (5) al desmontar: cancela TTS, cierra STT, `gateway.dispose()` (detiene las pistas del micrófono) y cierra el `AudioContext`.

**Resiliencia de voz**: permiso denegado, `speak` que rechaza, o TTS que "resuelve" sin reproducir audio (heurística: resolvió en <400 ms con un texto >15 caracteres) → cambio a `TEXT` **sin perder el turno** + toast "No pudimos usar el audio; puedes continuar escribiendo" (una sola vez por sesión). Además hay un watchdog sobre `speak` (duración estimada + 8 s) para que un `onend` que nunca dispara —bug conocido de `speechSynthesis`— no deje la UI clavada en `speaking`. Toggle `Responder por texto` / `Responder por voz` siempre visible; `Repetir pregunta` vuelve a `speak` **sin llamar a `nextQuestion`** (no consume turno); `Pausar` deja el Orb en `idle` y conserva pregunta y borrador; cerrar y reabrir `/candidate/interview/:id` retoma la misma pregunta porque `nextQuestion` del mock devuelve el turno pendiente (verificado en la prueba de humo).

**Decisiones / desviaciones** (ninguna contradice la spec):
1. **`src/voice/BrowserVoiceGateway.ts` (compartido, cambio aditivo)**: se agregó un parámetro opcional de constructor `{ audioContext?: AudioContext }`. Si se pasa, `connectAudio` lo reutiliza y **no** lo cierra. Sin esto, `connectAudio(stream)` crea y destruye un `AudioContext` por turno (el criterio de cierre de F4 pedía explícitamente no recrearlo). El constructor sin argumentos sigue funcionando igual, así que `C6` (F3) no se ve afectado. `ServerVoiceGateway` debería aceptar la misma opción.
2. La transcripción del STT **se acumula** en el borrador en cada `stopListening` (mute, pausa, repetir, terminar respuesta) en vez de reemplazarlo, porque `BrowserVoiceGateway` reinicia su transcript en cada `startListening`.
3. **Detección de silencio de 2.5 s: no implementada** (la spec la marca como opcional). El usuario termina con `Terminar respuesta` o con Enter en el campo de texto.
4. `interviews.turns` no tenía hook en `api/hooks`; se usa un `useQuery` local en `ContextAside` con la clave `["interview", id, "turns"]`, que queda invalidada automáticamente por `useAnswer` (invalida el prefijo `["interview", id]`). No se tocó `api/hooks` ni `queryKeys.ts`.
5. El selector de modo de C8 y las cards de C8/C9 se construyeron a mano (no `RadioCards`/`Card variant="light"`) porque ambas pantallas viven sobre `ImmersiveLayout` oscuro; se reutilizan `Button`, `Badge`, `Modal`, `Textarea`, `ProgressSteps`, `ProgressBar`, `ProgressRing`, `ProcessingStatus`, `AIInsightCard`, `EvidenceBadge`, `Tooltip`, `Skeleton` y `useToast` tal cual.
6. No se agregó script a `package.json` (archivo compartido, con agentes en paralelo): la prueba se ejecuta con `node scripts/smoke-interview.mjs`.

**Orb**: una sola instancia montada durante toda la entrevista (`OrbStage` nunca se desmonta ni cambia de `key`); solo cambian `state` y `analyser`. `quality` se calcula **una vez al montar** (`hardwareConcurrency <= 4` o `innerWidth < 768` → `"low"`) porque cambiarla recrea el renderer de three. Tamaño responsivo por listener de `resize`: mobile `clamp(260, 72vw, 320)`, tablet 340, desktop 400. Detrás va `BrandBackground asset="interview" presence="accent" overlay="full"` con opacidad reducida y `saturate(.7)`: el Orb es el protagonista. Label textual del estado bajo el Orb con `aria-live="polite"`. Efecto colateral positivo: `three` ya no está en el bundle principal, quedó en el chunk lazy `InterviewPage` (501 kB) — el `index` bajó de ~969 kB a 593 kB.

**PROBE**: cuando `turn.references_turn_id != null`, chip "Profundiza en tu respuesta anterior" sobre la pregunta (`QuestionPanel`) y, en el aside desktop, bloque destacado con la pregunta y la respuesta referenciadas + el mismo turno resaltado dentro del historial colapsable.

**Verificación de cierre**: `npx tsc --noEmit` y `npm run build` en verde (build completo del árbol, con el código de F3/F6 ya presente). `node scripts/smoke-interview.mjs` — 13 pasos en verde: registro → familia → CV confirmado → `interviews.create("VOICE")` → `candidate.status.interview_session_id` (CTA "Continuar") → **`nextQuestion` idempotente al reabrir** (mismo `turn.id`, `asked` sin incrementar) → 6 respuestas con **PROBE detectada en el turno 5 referenciando el turno 2** → `finished (BUDGET_EXHAUSTED)` → `complete` → job DONE → `talentProfile` (score 75, "Evidencia sólida", 6 competencias, ningún `rubric_level` 0, todas con justificación) → `feedback`. `vite` dev responde 200 en `/`, `/candidate/interview/prepare` y `/candidate/interview/:id/result?job=…`, y los 7 módulos de la feature transpilan sin error (servidor detenido después). Sin `any` ni `console.log` en la feature (verificado con grep).

**Riesgos / pendientes para F8**: (1) el flujo por voz real solo se verificó por contrato y por tipos, no en un navegador con micrófono — conviene una pasada manual en Chrome (es el único con `webkitSpeechRecognition`); en Firefox/Safari el STT devuelve `""` y la UI cae al campo de texto por diseño. (2) `ImmersiveLayout` apila el `aside` debajo en mobile; en C9 el `ContextAside` se oculta con `hidden md:block`, así que en mobile queda un contenedor vacío sin altura (sin impacto visual, pero si F8 refactoriza el layout conviene un slot `asideDesktopOnly`). (3) El chunk de `InterviewPage` supera los 500 kB por `three`; es el aviso de Vite ya conocido desde F0, ahora aislado a esa ruta.

### 2026-09-09 — F6 (Sonnet)

**Qué se construyó** (`src/features/employer/onboarding/**`, `src/features/employer/home/**`, `src/features/employer/company/**`, `src/features/employer/vacancies/**`, y edición aditiva de `src/features/employer/employer.routes.tsx`):

- `onboarding/OnboardingPage.tsx` (E1): wizard 3 pasos con `ProgressSteps` (identidad → ubicación/modalidad → cultura), `ChipGroup` propio (radiogroup de `Chip`, no encajaba en `SegmentedControl` con 3-4 opciones) para tamaño/modalidad, `Select` de industrias (catálogo simple propio, la spec no da uno), URL de logo como `Input` opcional (no hay endpoint de subida de logo en el contrato; se usa `logo_url` de `CompanyPatch` directo). `onboarding.schemas.ts` valida por paso con `zod`. Al terminar: `company.update` + toast "Perfil creado" + `/employer`.
- `home/HomePage.tsx` (E2): redirige a onboarding si `company.me().trade_name` viene vacío (empresa recién registrada). Header con `VerificationBadge`, `MetricCard` ×3 (vacantes activas, `Σshortlist_count`, desbloqueos), lista de vacantes con badge "Ranking listo"/"Sin matching aún" y CTA `Ver talento`, empty state con el copy exacto de la spec. "Desbloqueos" se calcula con una query local (`["employer","unlocks",...]`) que llama `matching.shortlist(vacancyId)` por cada vacante y cuenta `is_unlocked` (no hay endpoint agregado de desbloqueos en el contrato).
- `company/CompanyProfilePage.tsx` (E3): mismo formulario que onboarding pero precargado y editable por secciones, `VerificationCard` reutilizado.
- `company/VerificationCard.tsx`: `VerificationBadge` (usado en E2 y aquí) + `VerificationCard` (lista de checks de `VerificationView`, nota "Verificación visual para el MVP"). `company/ChipGroup.tsx` y `company/company.constants.ts` (tamaños/modalidad/industrias) compartidos por onboarding, perfil de empresa y nueva vacante.
- `vacancies/NewVacancyPage.tsx` (E4): `ImmersiveLayout` con `aside` = preview en vivo (`Card dark` + `background={{asset:"cards",presence:"accent"}}`, `AnimatePresence`/`fadeUp` re-key en cada cambio). `RadioCards` para familia, `ChipGroup` para modalidad, `Stepper` para posiciones, `zod` valida salario min≤max. **Desviación**: la spec pide chips de "tipo de jornada", pero `VacancyInput` no tiene ese campo en el contrato (02 §3) — se omitió (no hay dónde persistirlo). Al crear, navega a `ideal-profile`.
- `vacancies/IdealProfilePage.tsx` (E5): al entrar sin `requirements`, llama `resolveRequirements(description)` con `ProcessingStatus` "Interpretando tus requisitos…"; si ya tenía requisitos, los precarga tal cual. Filas editables (label `Input`, competencia `Select` del catálogo de la familia, `SegmentedControl` Esencial/Deseable, `Stepper` 1-4, eliminar) + "Agregar requisito" manual; `unmapped` como `Chip` con `Select` de asignación o `onRemove`; `warnings` en card amarilla con el copy literal de la spec. Pesos: 6 `Slider` (orden fijo `WEIGHT_COMPONENT_ORDER`), suma visible, `Normalizar a 100` (normalización proporcional, misma fórmula que usa el mock en `setWeights`/`setRequirements` al guardar), chip de prioridad Alta/≥25 · Media/≥12 · Baja (umbral propio, la spec no da fórmula), mensaje fijo "La IA apoya tu decisión; no la reemplaza." **Decisión**: el peso por requisito individual (`RequirementInput.weight`) no se expone en UI (la spec de E5 no lo pide, solo pesos por `MatchComponent`) — se envía `weight:0` por fila y el mock (`normalizeRequirementWeights`) reparte 100 entre ellas al guardar. CTA `Guardar y buscar talento →` encadena `setRequirements` → `setWeights` → `update(status:"OPEN")` → `runMatch` → navega a `/employer/vacancies/:id/talent?job=<job_id>`; ghost `Guardar borrador` hace `setRequirements`+`setWeights` y vuelve a `/employer/vacancies`.
- `vacancies/VacanciesPage.tsx` (E6): `FilterPills` Todas/Abiertas/Borrador/Cerradas, `Card` por vacante con acciones `Ver talento` / `Editar` (→ detalle E7, que a su vez enlaza a editar perfil ideal — no existe una pantalla de "editar datos básicos" en el alcance de F6/F7). Empty state igual a E2; si el filtro no tiene resultados pero sí hay vacantes, mensaje corto adicional.
- `vacancies/VacancyDetailPage.tsx` (E7): resumen en `Card dark` con acento `cards`, requisitos con `kind`/nivel, pesos como `ProgressBar` horizontales, CTA `Ver ranking`/`Buscar talento` (`runMatch` → navega con `?job=`), enlace a `Editar perfil ideal`, finalistas resumidos por etapa desde `useShortlist` con enlace a `/employer/vacancies/:id/shortlist` (ruta de F7).
- `vacancies/vacancies.shared.ts`: labels/orden de `MatchComponent`, labels de `VacancyStatus`/`RequirementKind`/`WorkMode`, `jobFamilyName()`, `priorityForWeight()`, `sumWeights()`, `normalizeWeightsProportional()`, `formatSalaryRange()` — usado por E5/E6/E7.
- `employer.routes.tsx`: agregadas mis 7 entradas (`index`, `company`, `vacancies`, `vacancies/:id` en `shellRoutes`; `onboarding`, `vacancies/new`, `vacancies/:id/ideal-profile` en `immersiveRoutes`), todas con `lazy`. F7 ya había agregado las suyas en paralelo (`vacancies/:id/talent`, `.../compare`, `.../shortlist`, `candidates/:matchResultId[/full]`) — se dejaron intactas.

**Usuario demo verificado**: `empresa@demo.mx`/`demo1234` (VERIFIED) con `vac_admin_open`/`vac_heavy_open`/`vac_warehouse_open` sin `last_match_run_id` (confirmado en seed) → en Home/E6/E7 aparecen como "Sin matching aún" y el flujo de E5→"Guardar y buscar talento" o E7→"Buscar talento" es el camino para generarlo.

**Cierre**: `npm run typecheck` y `npm run build` en verde (verificado junto con el código de F3/F4/F5/F7 ya presente en el árbol en el momento de este commit). `npm run dev` respondió 200 en `/` y `/employer` (servidor de verificación detenido después). Sin `any` ni `console.log` en mis rutas. No toqué `api/`, `components/ui`, `components/layout` ni `app/router.tsx`.

### 2026-09-09 — F3 (Sonnet)

**Qué se construyó** (`src/features/auth/**`, `src/features/candidate/onboarding/**`, `src/features/candidate/home/**`, `src/features/candidate/cv/**`, más ediciones aditivas a `app/router.tsx` y `features/candidate/candidate.routes.tsx`):

- `features/auth/auth.schemas.ts`: esquemas `zod` de login/registro + `fieldErrorsFrom()` (mapea `ZodError` a `{campo: mensaje}`). `DemoHint.tsx`: hint de usuarios demo, solo si `import.meta.env.DEV`, reutilizado por login y registro.
- `LandingPage.tsx` (C0): hero oscuro (`BrandBackground asset="brand-main" presence="hero" priority ambient`) con eyebrow/H1/subtítulo/3 CTAs, `LightSurface` debajo con 3 `Card` de principios, `pageSequence`/`staggerContainer` de `useMotionSafe()`.
- `LoginPage.tsx` (C1) / `RegisterPage.tsx` (C2): `AuthLayout`, `SegmentedControl`/`RadioCards` para elegir rol/audiencia, validación `zod` + estado local, `useLogin`/`useRegister`, error accionable `aria-live`, respeta `?next=` y `?role=`, navegación post-auth según `user.role` de la respuesta (no del toggle).
- `onboarding/OnboardingPage.tsx` (C3): wizard de 3 pasos con `ProgressSteps`, transición `slideInRight`/`slideInLeft` según dirección (`AnimatePresence mode="wait"`), paso 1 `RadioCards` de familias (`catalog.jobFamilies` + `setJobFamily`), paso 2 formulario (`candidate.update`: nombre/teléfono/ciudad/estado/disponibilidad en chips/expectativa salarial con dos `Slider`), paso 3 dos `Card` de navegación (subir CV / construir desde cero). Precarga valores desde `candidate.me()` para que sobrevivan un recargado (mock). `onboarding/mexicoStates.ts`: los 32 estados para el `Select`.
- `home/HomePage.tsx` (C4): redirige a onboarding si `candidate.status().next_step === "ONBOARDING"`; si no, saluda por nombre + `ProgressRing` de `completion_percent`, card oscura "Tu siguiente paso" (copy/CTA por cada valor de `next_step`, `WAITING_EVALUATION` sin CTA), sección "Oportunidades para ti" con 3 `JobCard` (solo si `status === "EVALUATED"`, si no `EmptyState` "Completa tu entrevista para ver tu compatibilidad").
- `cv/CvUploadPage.tsx` (C5): `FileUploader` con nota de privacidad → `documents.uploadCV` → `useJob` (polling 1.5s) → `ProcessingStatus` con un solo mensaje ligado al rango de `progress` (no rotación temporal falsa) → `DONE` navega a `cv/review`; `FAILED` muestra error accionable con `Intentar de nuevo`/`Crear desde cero`, sin tocar el perfil.
- `cv/CvBuildPage.tsx` (C6): chat con `cvBuilder.createSession/sendMessage/finalize`, burbujas agente/candidato, "Sofía está escribiendo…", `Turno N de 8` con `ProgressSteps`, panel lateral desktop (`aside` de `ImmersiveLayout`) con `session.draft` en `fadeUp`, botón de micrófono con `BrowserVoiceGateway.startListening/stopListening` (oculto si `!available`), CTA `Revisar mi perfil` cuando `reply.done`.
- `cv/CvReviewPage.tsx` (C7): `documents.extraction` → estado local editable (experiencia/estudios vía `Modal` con formulario propio, habilidades como filas con selector de nivel 1-4 + eliminar, certificaciones con alta/baja inline), claims `needs_validation` con `EvidenceBadge level="pending"` + nota, texto de confianza (`alta/media/baja` según `confidence`), CTA fijo inferior `Confirmar y continuar` → `confirmExtraction` → `/candidate/interview/prepare`.
- `app/router.tsx`: reemplazados los 3 placeholders (`/`, `/login`, `/register`) por `lazy` a las pantallas reales; `/login` y `/register` ahora anidan `RedirectIfAuthenticated` (elemento) con un hijo índice `lazy` (no se puede mezclar `element` + `lazy` en el mismo `RouteObject`). Borrado `app/LandingPlaceholder.tsx` (ya sin referencias).
- `features/candidate/candidate.routes.tsx`: agregadas mis entradas (`index` → `HomePage` en `shellRoutes`; `onboarding`, `cv/upload`, `cv/build`, `cv/review` en `immersiveRoutes`) y quitado el import de `RoutePlaceholder` que quedó sin uso. F4 agregó sus rutas de entrevista en paralelo sobre el mismo archivo sin conflicto (releído justo antes de cada edición, tal como pide el protocolo).

**Desviaciones y por qué** (regla: opción más simple que no contradiga la spec, spec no cubre el detalle):
1. C0 no reutiliza literalmente `AuthLayout` (que es de dos columnas, pensado para formularios): se compuso a mano con `BrandBackground`+`LightSurface` para lograr el layout que pide la spec (hero completo arriba con eyebrow/H1/2 CTA, superficie clara debajo con 3 cards), siguiendo el mismo patrón "hero oscuro + superficie clara" de `01 §4`.
2. "Onboarding support en tercio superior": `ImmersiveLayout` no expone un slot fuera de su columna centrada (max-w-760), así que el `BrandBackground asset="onboarding"` se renderiza como una banda absoluta dentro de esa columna (no full-bleed de viewport). Visualmente cumple la intención (imagen de soporte arriba, discreta) pero no ocupa el ancho completo de la pantalla.
3. C6/C7: edición de experiencia/estudios siempre en `Modal` (no `BottomSheet` en mobile) — un solo componente cubre ambos casos razonablemente bien y evita duplicar formularios; simplificación de alcance.
4. C7 usa `ImmersiveLayout` (no `CandidateShell`), la alternativa explícita que da la spec ("`CandidateShell` (o Immersive con cerrar)"); se eligió porque la ruta ya vive en el grupo `immersiveRoutes` junto con el resto del flujo de CV.
5. Mic en C6: no se muestra nivel de audio en vivo (eso es más relevante en C9/entrevista); solo toggle grabar/detener y vuelca el `transcript` al textarea, editable antes de enviar.

**Verificación de cierre**: `npm run typecheck` y `npm run build` en verde (sin errores en ningún archivo, incluidos los de F4/F7 en curso en paralelo). Sin `any` ni `console.log` en los archivos de esta tarea (grep). `npm run dev` respondió `200` en `/`, `/login` y `/register` (curl), servidor detenido después. No se pudo hacer un recorrido manual en navegador real (no hay herramienta de browser/playwright disponible en este entorno de agente); la validación de flujo se apoyó en lectura del mock (`api/mock/engine/cv.ts`, `api/mock/seed/cvBuilderScript.ts`, `api/mock/seed/users.ts`) para confirmar contratos exactos (p. ej. que "no sé" dispara como máximo una repregunta y luego siempre avanza).

**Archivos compartidos tocados**: `app/router.tsx`, `features/candidate/candidate.routes.tsx` (ver arriba), borrado `app/LandingPlaceholder.tsx`. No se tocó `api/`, `store/`, `voice/`, `components/ui`, `components/layout` ni `tokens.css`.

### 2026-09-09 — F2 (Sonnet)

**Qué se construyó** (`src/api/**`, `src/store/**`, `src/voice/**`, `public/demo/**`, `frontend/scripts/{smoke-mock,generate-demo-cv}.mjs`, y ediciones aditivas a `app/router.tsx`/`app/providers.tsx`/`vite-env.d.ts`/`package.json`):

- `src/api/types.ts`: copia literal del bloque de `02 §3` + utilidades al final (`ID`, `Nullable<T>`, `PageParams`). No se tocó ningún tipo existente.
- `src/api/client.ts`: `interface ApiClient` (namespaces y firmas exactas de `02 §4`) + `class ApiClientError extends Error { code; status; details }`.
- `src/api/mock/`: implementación completa.
  - `seed/catalog.ts`: 3 familias (ids `jf_admin_assistant`, `jf_heavy_machinery`, `jf_warehouse_supervisor`), 24 competencias (8/familia, códigos y core exactos de `02 §2`, descripción de una línea c/u), 39 skills (`EXCEL_INTERMEDIATE`, `FORKLIFT_OPERATION`, `SAP_WMS`, etc.), pesos por defecto.
  - `seed/geo.ts`: 15 ciudades con lat/lng aproximada + haversine + `geoBandFor`.
  - `seed/candidates.ts`: **15 candidatos EVALUATED** (5/familia), `anon_code CND-XXXX`, nombres mexicanos, ubicaciones variadas, `CandidateSkill[]` con mezcla declarada/evaluada/verificada, `CompetencyEvaluation[]` completo por competencia de su familia (justificación con frase citada + `evidence_turn_ids`), `TalentProfile`/`FeedbackReport`/`LearningPath` completos. `MARIA_ANON_SUFFIX="4F82"` vincula a `maria@demo.mx`.
  - `seed/company.ts`: "Logística del Bajío S.A. de C.V." VERIFIED + 3 vacantes OPEN (una por familia, `VACANCY_IDS.ADMIN/HEAVY/WAREHOUSE`) + 1 DRAFT (`VACANCY_IDS.DRAFT`), todas con `requirements`/`weights` por defecto.
  - `seed/interviewBank.ts`: 7 preguntas/familia (≤2 oraciones, ~35 palabras), 4 core + 1 `PROBE` (con `{{prev_excerpt}}`, la de WAREHOUSE usa literalmente el ejemplo de `02 §5`) + 2 genéricas.
  - `seed/cvBuilderScript.ts`: 8 turnos de "Sofía" + repregunta si <6 palabras + cierre.
  - `seed/learningCatalog.ts`: 20 filas (Platzi/Coursera/CONOCER/STPS/Google/edX) mapeadas por `competency_code`, con fallback genérico.
  - `seed/misc.ts` / `seed/users.ts`: notificaciones, hilos, 3 planes; 3 usuarios demo (ver abajo).
  - `state.ts`: `MockDB` en memoria + persistencia `localStorage["ce-mock-v1"]`; `resetMock()` reconstruye la semilla; expuesto en dev como `window.__ce.resetMock()` (tipado en `vite-env.d.ts`).
  - `jobs.ts`: cola con `setTimeout`, 4 ticks (~4 s), `progress` 0→100, `DONE`/`FAILED`.
  - `engine/matching.ts`: fórmula exacta `total=clamp(Σ(peso/100×raw)−Σpenalties,0,100)` con los 6 componentes descritos en el prompt (TECHNICAL/BEHAVIORAL atenuados por confianza, EXPERIENCE con ajuste por familia ×0.85, EVIDENCE por conteo declarada/evaluada/verificada, SALARY por solape/distancia <20%, LOCATION por `geo_band` vía haversine) y penalizaciones `MANDATORY_UNMET −8`/`SALARY_OUT_OF_RANGE −5`/`LOCATION_FAR −5`.
  - `engine/explain.ts`: plantilla ≤120 palabras con posición relativa, fortalezas, brechas y penalizaciones; `assertExplanation()` verifica que ningún `%` del texto sea distinto a `total_score` (se ejecuta siempre al generar, lanza si se viola).
  - `engine/resolve.ts`: mapeo por keywords a competencia/skill + `warnings` por patrones discriminatorios (edad máx/mín, sexo/género, "buena presentación", estado civil, "sin hijos", nacionalidad) + `suggested_weights` por defecto.
  - `engine/interview.ts`: `question_budget=6`, prioriza core `UNTOUCHED`, luego `PROBE` sobre la respuesta más larga ya contestada (o forzada en el penúltimo turno si aún no se usó), nunca rubric_level 0 (mínimo 1 con confianza baja + `limitations`).
  - `engine/cv.ts`: `uploadCV` genera extracción plausible por familia (usa el nombre de archivo, no lee contenido); CV builder arma la extracción heurísticamente por campo de turno (logística/salario van a `claims` por no tener campo propio en `CVExtraction`).
- `src/api/http/client.ts`: implementación `fetch` completa sobre `VITE_API_URL`, Bearer desde el store, `multipart()` para uploads, `withQuery()` para paginación/ids, mapeo de errores → `ApiClientError`. No probada contra servidor real (no existe aún); compila.
- `src/api/index.ts`: selector `VITE_API_MODE` (default mock). `src/api/queryClient.ts`: instancia única (`retry:1, staleTime:10_000`) importada por `app/providers.tsx` y por `store/session.ts` (para `logout()`).
- `src/api/queryKeys.ts` + `src/api/hooks/{queries,mutations,useJob}.ts` (barrel en `hooks/index.ts`). Hooks de lectura: `useJobFamilies, useCompetencies(familyId), useSkillsCatalog, useCandidateMe, useCandidateStatus, useTalentProfile, useCandidateSkills, useFeedback, useLearningPath, useExtraction, useInterview(id), useInterviewProgress(id), useCompanyMe, useVerification, useVacancies, useVacancy(id), useMatchResults(runId,page), useMatchResult(id), useFullProfile(id), useCompare(vacancyId,ids), useShortlist(vacancyId), useOpportunities, useOpportunity(id), useNotifications, useMessages, usePlans` (todos devuelven el `UseQueryResult` de TanStack con la forma del contrato; los que dependen de un id soportan `id: null|undefined` con `enabled` automático). Mutaciones: `useLogin/useRegister` (llaman `useSessionStore.login()` en `onSuccess`), `useUpdateCandidate, useSetJobFamily, useUploadCV, useConfirmExtraction, useCvBuilder()` (devuelve `{createSession,sendMessage,finalize}`), `useCreateInterview, useAnswer, useCompleteInterview, useUpdateCompany, useCreateVacancy, useUpdateVacancy, useResolveRequirements, useSetRequirements, useSetWeights, useRunMatch, useUnlock, useSetShortlistStage, useApply` — todas invalidan las `queryKeys` relevantes. `useJob(jobId,{onDone,onFailed})`: `refetchInterval` 1500 ms hasta `DONE`/`FAILED`, dispara el callback una sola vez.
- `src/store/session.ts`: zustand + `persist` (`ce-session`): `token, user, login(AuthResponse), logout()` (limpia sesión y llama `queryClient.clear()`), selectores `useRole()/useIsAuthenticated()`, y `homePathForRole(role)` (usado también por el router).
- `src/voice/`: `VoiceGateway.ts` (interfaz literal de `02 §6`), `BrowserVoiceGateway.ts` (TTS `speechSynthesis` es-MX rate .95 con selección de voz en español si existe; STT con `webkitSpeechRecognition`/`SpeechRecognition` si existe, si no `transcript` siempre `""`; mic vía `getUserMedia`+`connectAudio()` del Orb; tipos mínimos propios para las Speech APIs no estándar, sin `any`), `useMicrophone.ts` (`request()/level 0-1 a ~12fps/stop()/error`), `index.ts`.
- `public/demo/cv-ejemplo.pdf`: PDF mínimo válido generado a mano por `scripts/generate-demo-cv.mjs` (~50 líneas, sin dependencias).

**Usuarios demo** (`demo1234` para los tres): `candidato@demo.mx` (CANDIDATE, perfil `DRAFT` vacío, golden path desde cero) · `maria@demo.mx` (CANDIDATE, ya `EVALUATED`, familia `WAREHOUSE_SUPERVISOR`, es una de las 5 candidatas seed de esa familia) · `empresa@demo.mx` (COMPANY, "Logística del Bajío", `VERIFIED`). **Resetear el mock**: en dev, consola del navegador → `window.__ce.resetMock()` (borra `localStorage["ce-mock-v1"]"` y reconstruye la semilla; recargar después).

**Decisiones del motor / desviaciones**:
1. El mock no mantiene su propia noción de "sesión actual": lee el token de `useSessionStore` (zustand) en cada llamada y lo decodifica (`mock.<base64 userId>.<rand>`) — evita duplicar estado de sesión entre el store y el mock, y hace que `http/client.ts` y `mock/index.ts` compartan la misma fuente de verdad para el Bearer.
2. `EXPERIENCE` del matching: "ajustado por familia" se implementó como ×0.85 cuando ninguna experiencia del candidato tiene `skills` asociadas (proxy simple de relevancia, la spec no detalla la fórmula exacta).
3. Las respuestas de logística/salario del CV builder no tienen campo propio en `CVExtraction` (solo experience/education/skills/certifications/claims): se guardan como `claims` con `source:"CONVERSATION"` y `needs_validation:true`.
4. Prueba de humo: la spec pedía `tsx` (no instalado, fuera de la lista de dependencias permitidas) o, si no, un `runSmoke()` disparado desde `/dev/api`. Se optó por una tercera vía más simple: `scripts/smoke-mock.mjs` usa `esbuild` (ya presente como dependencia transitiva de Vite) para empaquetar `src/api/mock/__smoke__.ts` con los alias `@/*` resueltos vía `tsconfig.json`, y lo ejecuta con Node (con un shim mínimo de `localStorage`/`window` y `define` para las 3 referencias a `import.meta.env` usadas en el árbol de imports del golden path). Comando: `npm run smoke:mock` (agregada esa entrada a `package.json`, aditiva).
5. `queryClient` centralizado en `src/api/queryClient.ts` (pedido por el prompt): `app/providers.tsx` se ajustó para importarlo en vez de crear su propia instancia (F1 ya había envuelto ahí `<ToastProvider>`, se conservó tal cual). `staleTime` quedó en `10_000` (spec de F2) en vez de los `30_000` que tenía el `QueryClient` original de F0/F1.
6. `documents.uploadCV` no lee el archivo real: genera una extracción plausible según `job_family_id` del candidato y usa `file.name` para el `DocumentRef`/claim, tal como pedía la spec.

**Resultado de la prueba de humo** (`npm run smoke:mock`, 22 pasos, todos en verde): registro candidato → familia `WAREHOUSE_SUPERVISOR` → update → uploadCV (job DONE) → extraction → confirmExtraction (→ `CV_READY`) → interview create → 6 preguntas respondidas (PROBE con `references_turn_id` confirmado) → complete (job DONE) → `talentProfile` (`overall_score=95`, "Evidencia sólida") → login empresa → createVacancy → resolveRequirements (texto con "máximo 30 años" + "buena presentación" → 2 `warnings`) → setRequirements → setWeights (suma 100) → runMatch (job DONE) → results (6 candidatos, orden desc verificado) → result → unlock (María José Hernández López) → fullProfile → compare → shortlist. `npm run typecheck` y `npm run build` en verde (bundle ~969 KB / 279 KB gzip, mismo aviso de chunk grande de Vite ya señalado por F0, sin acción en esta tarea). Sin `any` ni `console.log` en `src/`.

**Archivos compartidos tocados** (fuera de mis rutas exclusivas): `app/router.tsx` (agregado `RequireRole({role})` y `RedirectIfAuthenticated`, envolviendo `/candidate`, `/employer`, `/login`, `/register`; se conservó `devRoutes`/`/dev/ui` de F1 sin tocarlo), `app/providers.tsx` (ahora importa `queryClient` desde `@/api/queryClient` en vez de crear uno local; se conservó el `<ToastProvider>` de F1), `vite-env.d.ts` (tipado de `ImportMetaEnv` y `Window.__ce`), `package.json` (agregado script `smoke:mock`, aditivo). No se tocó `tokens.css`, `components/ui`, `components/layout` ni `lib/motion.ts`.

**Advertencias para F3–F7** (ids de semilla útiles para deep links/pruebas manuales): familias `jf_admin_assistant`/`jf_heavy_machinery`/`jf_warehouse_supervisor`; vacantes OPEN seed `vac_admin_open`/`vac_heavy_open`/`vac_warehouse_open` (+ `vac_draft_admin2` en DRAFT) — **no tienen `last_match_run_id` hasta que alguien llame `runMatch`** (no hay match runs precalculados en la semilla; F7 debe disparar "Ejecutar matching" al menos una vez, o llamar `resetMock()`+`runMatch` en un `useEffect` de desarrollo si necesita datos ya listos). `maria@demo.mx` = candidata `cand_4F82` (WAREHOUSE_SUPERVISOR) para probar el Perfil de Talento Verificado sin pasar por el golden path completo. El candidato demo nuevo (`candidato@demo.mx`) arranca en `DRAFT` sin `job_family_id`. `useJob` no expone `progress` con mensajes contextuales por sí mismo — eso es UI de F3/F4 (`ProcessingStatus` de F1) leyendo `job.progress`.

### 2026-09-09 — F1 (Sonnet)
- **`src/lib/motion.ts`**: `easings` (`outSmooth/standard/inOut`, arrays bezier) y `durations` (`fast .16/normal .32/slow .56`, segundos) coherentes con los tokens. Variantes `fadeUp`, `fadeIn`, `slideInRight`, `slideInLeft`, `scaleIn`, `cardEntrance`, `staggerContainer(stagger=.06, delayChildren=.1)`, `pageSequence` (container con `staggerChildren:.12`). Hooks `useCountUp(value, durationMs=900, enabled=true)` (rAF + ease-out cubic, devuelve el valor final de inmediato si `prefers-reduced-motion` o `enabled=false`), `useInViewOnce(ref, margin='-80px')` (IntersectionObserver, dispara una sola vez) y `useMotionSafe()` (degrada las variantes de arriba a opacidad `.15s` cuando hay reduced-motion; los contenedores de stagger degradan a `staggerChildren:0`). Usa `useReducedMotion` de `@/lib/a11y` (no la de `motion/react`) para mantener una sola fuente de verdad ya establecida por F0.
- **`src/components/ui/`** (48 archivos + `index.ts` barrel + `evidence.ts`). Props clave por componente (todas con `className` passthrough y `forwardRef` en controles de formulario/botones):
  - `Button({variant:"primary"|"secondary"|"ghost"|"danger-ghost", size:"md"|"lg", loading?, arrow?, href?})` — con `href` renderiza `<a>` (misma apariencia); sin él, `<button>`.
  - `Input/Textarea/Select` (props HTML nativas + `leadingIcon`/`autoResize`/`options,placeholder`) + `FormField({label, htmlFor, hint?, error?, required?, children: un solo elemento})` que inyecta `id/aria-describedby/aria-invalid` en el hijo vía `cloneElement`.
  - `Checkbox({label})`, `Radio({label})` (ambos con input real `sr-only` + indicador custom vía `peer-*`), `RadioCards({name, options:{value,label,description?,icon?}[], value, onChange, columns?})`, `Switch({checked,onCheckedChange,label?})` (spring con `motion`), `Slider({value,onChange,min?,max?,step?,label?,valueFormatter?})` (input nativo, teclado y `aria-valuenow` gratis), `Stepper({value,onChange,min?,max?,label?})`, `SegmentedControl({options,value,onChange,"aria-label"})` (indicador `layoutId`).
  - `FileUploader({onFileSelect,file?,progress?,error?,onClear?,privacyNote?})` — valida tipo (PDF/DOCX/PNG/JPG) y tamaño (10 MB) con mensaje accionable propio si no se pasa `error`.
  - `Card({variant:"light"|"dark", padding:"sm"|"md"|"lg", interactive?, selected?, background?})` — `background` acepta las props de `BrandBackground` (menos `className`) para el acento parcial en dark.
  - `Chip({selected?,onClick?,onRemove?})`, `FilterPills({options,value,onChange,"aria-label"?})` (indicador `layoutId`), `SkillChip({name,level?,evidence?:EvidenceLevel})`.
  - `EvidenceBadge({level:EvidenceLevel,size?})` — `EvidenceLevel` y sus labels/descripciones viven en `components/ui/evidence.ts` (no se importa nada de `src/api`, tal como pedía el prompt); tooltip siempre presente vía `Tooltip`.
  - `ScoreBadge({score,label,size?})` (nunca solo número), `ProgressBar({value,label?,showValue?,delay?})`, `ProgressRing({value,size?,stroke?,label?})`, `ProgressSteps({total,current,label?})`.
  - `MetricCard({icon,value,label,suffix?,delta?:{value,direction}})`, `AIInsightCard({title,why,missing,body?,cta?,loading?})` (loading muestra skeleton + "Redactando explicación…").
  - `Avatar({name?,src?,anonymous?,seed?,size?})` (si `anonymous`, nunca renderiza `src`), `Badge({tone:"neutral"|"info"|"success"|"warning"})`, `Divider`, `Tabs({items:{value,label,content}[],value?,defaultValue?,onChange?,"aria-label"})` (roving tabindex + `AnimatePresence`), `Tooltip({content})`.
  - `Toast.tsx` exporta `ToastProvider` + `useToast()` (`showToast({title,description?,tone?,durationMs?})`, cola con auto-dismiss 4s por defecto, `aria-live="polite"`). **Ya está montado en `app/providers.tsx`** (dentro de `QueryClientProvider`, envolviendo `children`) — F3-F7 solo llaman `useToast()`.
  - `Modal({open,onClose,title,children})` (480-640px, focus trap + Esc), `BottomSheet({open,onClose,title?,children})` (mobile, handle, radio superior 28px), `Drawer({open,onClose,title,children,side?})` (desktop lateral).
  - `EmptyState({icon,title,description?,cta?})`, `Skeleton`/`SkeletonCard` (shimmer 1.6s vía clase `.skeleton-shimmer` agregada a `globals.css`), `ProcessingStatus({messages,progress?,intervalMs?})` (rota mensajes, `aria-live`).
  - `PageHeader({eyebrow?,title,subtitle?,actions?})`, `SectionHeader({title,description?,actions?})`.
  - `JobCard({title,company,companyVerified?,location,modality,salaryText,compatibility?:{score,label},applied?,bookmarked?,onBookmarkChange?,onClick?})`, `CandidateAnonymousCard({anonCode,familyName,geoLabel,availabilityLabel,yearsExperience,score,scoreLabel,skills,evidence:{declared,evaluated,verified},selected?,onToggleCompare?,onView?,onShortlist?,shortlisted?,unlocked?})` (el tipo **no** admite `name`/`photo`), `CandidateUnlockedCard({name,photoUrl?,email,phone?,...mismos scores/skills/evidence})`. Ninguna de las tres importa de `src/api`: interfaces propias en cada archivo.
- **`src/components/layout/`** (+`index.ts`): `AuthLayout({heroTitle,heroSubtitle?,asset?,children})`, `ImmersiveLayout({children,aside?,onClose?})` (slot lateral 60/40 en desktop), `PageContainer` (max-w 1240 + padding), `LightSurface` (radio superior 32px + margen negativo, para superponer a un hero), `CandidateShell({user?,onLogout?})` y `EmployerShell({user?,onLogout?})` (usan `Outlet`, `useNavigate` para el CTA de sidebar; **no leen `src/store`**, reciben `user/onLogout` por props tal como pedía el prompt). Internos reutilizables: `BottomNav`/`Sidebar` (reciben `items: NavItem[]`, con `isActiveOverride?` para el caso "Talento" = `/employer/vacancies?tab=talent` vs "Vacantes" = `/employer/vacancies` sin ese query — ambos comparan `pathname+search` manualmente, no dependen del matching por defecto de `NavLink`) y `TopBar({user?,onNotificationsClick?})` (campana + avatar).
- **`src/app/DevKitchenSink.tsx`**: renderiza todo lo anterior con datos de ejemplo (incluye variantes dark/light de `Card`, los 5 niveles de `EvidenceBadge`, `AIInsightCard` normal y `loading`, `EmptyState`, `SkeletonCard`, `ProcessingStatus`, y previews recortados (480px, `overflow:hidden`) de `AuthLayout`/`ImmersiveLayout`/`CandidateShell`/`EmployerShell` ya que son layouts de página completa). Registrada en `app/router.tsx` como ruta adicional `{ path: "/dev/ui", lazy: ... }` dentro de un array `devRoutes` condicionado a `import.meta.env.DEV` (spread aditivo antes del `*` de 404); no se tocó ninguna otra entrada de F2 en ese archivo.
- **Archivos compartidos tocados (fuera de `ui/`, `layout/`, `motion.ts`)**: `app/router.tsx` (solo se agregó `devRoutes`, ver arriba), `app/providers.tsx` (se envolvió `children` en `<ToastProvider>`, tal como su propio comentario de F0 anticipaba: "Toaster se agrega en F1"), `styles/globals.css` (se agregó `@keyframes skeleton-shimmer` + `.skeleton-shimmer`, nada más). No se tocó `tokens.css`, `api/`, `store/` ni `voice/`.
- **Decisiones**: (1) Reduced-motion se maneja en dos niveles: transiciones CSS (hover/color) ya quedan cubiertas por la regla global de F0 en `globals.css`; las animaciones JS de `motion` (RadioCards check, Switch thumb, SegmentedControl/FilterPills indicator, Tooltip, Toast, Modal/BottomSheet/Drawer, ProcessingStatus icon, JobCard bookmark bounce) leen `useReducedMotion()` de `@/lib/a11y` y bajan `transition` a `{duration:0}` o remueven el `animate` continuo — no usé `useMotionSafe()` dentro de esos componentes puntuales porque son transiciones discretas (no la secuencia de entrada de página), `useMotionSafe` queda para cuando F3-F7 armen las secuencias `pageSequence`/`fadeUp` de pantalla completa. (2) `AIInsightCard`, `EmptyState`, `MetricCard` importan `Button`/`Card`/`Skeleton` de otros archivos del mismo `ui/` (no de `index.ts`, para evitar ciclos) — es el único acoplamiento interno del barrel. (3) El `Tooltip` es hover/focus (sin variante táctil dedicada); en mobile el texto base del badge/label sigue siendo legible sin el tooltip, se documenta como limitación aceptada por alcance. (4) `CandidateUnlockedCard` reexporta los tipos `CandidateAnonymousSkill`/`CandidateAnonymousEvidenceSummary` desde `CandidateAnonymousCard.tsx` para no duplicar shapes.
- **Verificación de cierre**: `npm run typecheck` — **0 errores en archivos de F1**; quedan 3 errores preexistentes de variables sin usar en `src/api/mock/seed/candidates.ts` (F2, en curso en paralelo — no se tocó ese archivo). `npx vite build` (bundle, sin el gate de `tsc`) compila y bundlea `/dev/ui` como chunk lazy sin errores. `npm run dev` respondió `200` tanto en `/` como en `/dev/ui` (verificado con `curl`, servidor detenido después). Sin `any` ni `console.log` en los archivos de esta tarea (verificado con grep). Cuando F2 cierre sus 3 unused-vars, `npm run build` completo debería quedar en verde sin cambios adicionales de mi parte.
- Commit de código: `669e012` (`feat(fe/F1): design system ui/layout components and motion primitives`). Este commit de documentación es un segundo commit pequeño porque el hash del commit de código no puede autorreferenciarse dentro del mismo commit sin usar `--amend` (evitado a propósito).

### 2026-09-09 — F0 (Sonnet)
- Scaffold manual de `frontend/` (Vite 6.4 + React 19.2 + TypeScript 5.9 strict, sin usar el wizard interactivo de `npm create vite`). Instalado exactamente lo pedido: `react@19.2.8 react-dom@19.2.8 react-router@7.18.3 @tanstack/react-query@5.102.8 zustand@5.0.15 motion@12.43.0 lucide-react@0.475.0 clsx tailwind-merge zod three@0.180.0 @fontsource-variable/inter` y dev `typescript@5.9.3 @types/react @types/react-dom @types/three vite@6.4.3 @vitejs/plugin-react tailwindcss@4.3.3 @tailwindcss/vite sharp@0.33.5`. Scripts `dev/build/typecheck/preview/optimize:backgrounds` tal como se pidió.
- **Decisión/ajuste de tsconfig**: la spec no detalla si usar el patrón de "project references" (tsconfig.json + tsconfig.app.json + tsconfig.node.json) típico del scaffold oficial de Vite. Lo probé primero y detecté que con `"files": []` + `references` el comando `tsc --noEmit` (sin `-b`) **no revisa nada y sale en verde silenciosamente** (confirmado inyectando un error de tipos a propósito: no lo detectaba). Como el criterio de cierre exige `tsc --noEmit` real, consolidé todo en un único `tsconfig.json` con `include: ["src"]` — verificado inyectando errores de tipos (sí los detecta) y luego revirtiendo. `vite.config.ts` queda fuera del `include` de tsc (usa `node:url`, y no se instaló `@types/node` por no estar en la lista de dependencias pedida); Vite lo transpila con esbuild igualmente, así que `dev`/`build` funcionan sin problema.
- Tokens: `src/styles/tokens.css` con el bloque `@theme` completo de §3 (colores, radios, sombras, easings/duraciones, `--font-sans`) + gradientes como variables `:root` + utilidades `.bg-gradient-brand/cta/hero`. `src/styles/globals.css` con reset, `@fontsource-variable/inter`, focus-visible, reduced-motion y fondo oscuro por defecto en `body`. Verifiqué que Tailwind v4 genera `bg-primary`, `text-text-secondary`, `rounded-lg` a partir de los tokens (prueba temporal en una página, confirmé en el CSS compilado, y la revertí).
- Assets: `scripts/optimize-backgrounds.mjs` (sharp) lee los 8 PNG de la raíz (incluye el typo `fondo_oboarding.png`) y genera 16 WebP en `public/assets/brand/backgrounds/` (8 assets × desktop 1600px + mobile 900px, calidad 78). Ejecutado; todos muy por debajo de 350 KB (la más pesada, `interview.webp`, 66 KB). PNG originales intactos en la raíz (no se tocaron, siguen ignorados por el `.gitignore` raíz).
- Orb: copiados tal cual (sin cambios de API ni shaders) `AudioOrb.tsx/.css, AudioAnalyzer.ts, OrbRenderer.ts, orbShaders.ts, orbStates.ts, orbConfig.ts, index.ts` a `src/components/interview/AudioOrb/`. No se copió `AudioAnalyzer.test.ts` (no se agregó vitest en esta tarea, según lo permitido por la spec). Compila en `strict` sin ajustes.
- `BrandBackground.tsx` (props `asset/presence/overlay/position/ambient/priority/className`, `<picture>` con fuente mobile ≤768px, overlay con gradientes de la spec, animación ambiental vía clase CSS `brand-background__ambient` en `globals.css`, respeta `prefers-reduced-motion` a través de la regla global) y `Logo.tsx` (wordmark SVG inline "Conecta Empleo" con punto de acento en gradiente, `variant`/`size`). Ancho del texto en el SVG es una aproximación fija por tamaño de fuente (no hay medición real de texto en SSR/build), suficiente para un wordmark corto y consistente.
- Utilidades `lib/cn.ts`, `lib/format.ts` (`formatMXN`, `formatDate`, `formatRange`), `lib/a11y.ts` (`useReducedMotion` con `matchMedia`, no depende de `motion` a propósito).
- Router esqueleto: `app/router.tsx` (`/`, `/login`, `/register`, `/candidate` → `features/candidate/candidate.routes.tsx`, `/employer` → `features/employer/employer.routes.tsx`, `*` → 404), `app/providers.tsx` (`QueryClientProvider`), `main.tsx`. `/` (`LandingPlaceholder`) usa `BrandBackground asset="brand-main" presence="hero" priority ambient` + `AudioOrb state="idle" size={320}` + `Logo` para verificar visualmente ambos. Placeholders de candidato/empresa son una única ruta índice cada uno, tal como pide la spec para esta tarea.
- Creadas (vacías, sin contenido de F0) las carpetas `components/ui`, `components/layout`, `api/`, `store/`, `voice/`, `features/auth`, `features/shared` para que F1/F2 no tengan que crear la estructura base; git no versiona directorios vacíos así que no aparecen en el commit.
- Cierre verificado: `npm run typecheck` y `npm run build` en verde (bundle único ~831 KB sin comprimir / 233 KB gzip — aviso de chunk grande de Vite por `three`, sin acción en esta tarea; code-splitting queda para cuando F3-F7 agreguen rutas lazy). `npm run dev` responde `200` en `http://localhost:5173` (verificado con curl y detenido después). Sin `any` ni `console.log` en `src/`.
- No se instaló `@types/node` (no estaba en la lista pedida) ni se agregó ESLint (fuera de alcance de esta fase, según spec §1).

### 2026-09-09 — Orquestador (Fable)
- Creado el tablero y las specs `01`–`05`. Decisiones del usuario: constructores Sonnet 5 con Opus 5 en F4 y F7; PNG de raíz se mueven a `frontend/public/assets/brand/backgrounds/` en WebP; `PRUEBA - ORB/` queda fuera de git y se borra solo con confirmación del usuario; alcance FE = P0 + P1 completos, P2 como stubs; marketplace de candidato (oportunidades + postulación) se construye con mock y se agrega al contrato API como Should Have.

### 2026-09-09 — B5 + B8 (recuperados por el orquestador, Opus)

Ambos agentes constructores se quedaron sin límite de sesión a media tarea y **no alcanzaron a commitear**. El orquestador recuperó el árbol de trabajo, completó lo que faltaba y verificó todo. Commit `05ab4ef`.

Lo que faltaba y se completó:
- Import de `SkillClaimDTO` en `app/ai/adapters/deterministic.py` (el DTO existía en `contracts/profiling.py` pero no estaba importado; rompía `parse_cv`).
- Migración `879be33e9940` con `cv_extractions`, `claims`, `cv_builder_sessions` y `cv_builder_messages`. B5 había escrito los modelos pero no la migración.
- Registro de `cv_builder.models` en `alembic/env.py` (sin él, autogenerate no veía esas tablas).
- `app/modules/cv_builder/router.py` completo: el servicio (404 líneas) ya estaba, faltaba exponerlo. Registrado en `main.py`.
- `POST /vacancies/{id}/resolve-requirements` ahora acepta llamada **sin cuerpo** y cae a la descripción guardada de la vacante, que es el caso normal cuando la empresa entra a "perfil ideal" recién creada la vacante.
- `test_status_next_step_review_claims_when_cv_parsed` quedó obsoleto: B5 cambió (bien) la señal de `Document.status == "PARSED"` a `cv_extractions.confirmed_by_candidate`. Se actualizó el test a la señal real y se agregó `test_status_stays_on_cv_when_extraction_already_confirmed`.

Verificación: **43 pruebas en verde**, `ruff` limpio, una sola cabeza de Alembic, semillas idempotentes, y `scripts/verify_b5_b8.py` con **34 verificaciones de punta a punta en verde**, incluidas: subida real del PDF de demo → job `DONE` → extracción con claims citables → confirmación que copia la experiencia al perfil y avanza a `CV_READY`; los 8 turnos del CV conversacional hasta el documento descargable; y del lado de empresa, la detección del requisito "máximo 30 años" como advertencia **sin incorporarlo al mapeo**, la normalización de pesos a 100 (RB-07) y el aislamiento entre empresas (404 al leer una vacante ajena).

Para B6 (entrevista): el perfil ya llega a `CV_READY` con `next_step = INTERVIEW`, los `claims` están persistidos con `source_ref` citable, y `compute_status_view` deja `interview_session_id` y `has_talent_profile` en `None`/`False` esperando a B6 y B7. El `DeterministicAdapter` ya implementa `next_interview_question` con presupuesto y `references_turn_id`.
