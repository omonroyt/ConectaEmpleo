# Arquitectura Técnica — Conecta Empleo (Backend)

**Versión:** 1.0
**Documento:** 04
**Basado en:** 01 Product Brief, 02 PRD, 03 Historias de Usuario
**Horizonte:** MVP de hackatón (~1 semana), construido con Claude Code

---

## 0. Alcance de este documento

**Sí cubre:** arquitectura del backend, modelo de datos, contratos con la capa de IA, motor de matching, privacidad/anonimización, API, stack tecnológico y despliegue a producción.

**No cubre (documento 05):** la arquitectura multiagente. Aquí la IA se trata como un **proveedor conectado detrás de una interfaz estable**. Este documento define *qué le pide el sistema a la IA y qué recibe de vuelta*, no *cómo razona*.

El objetivo explícito de diseño es que se pueda reescribir por completo el interior de los agentes —cambiar de framework, de modelo, de estrategia de razonamiento, de número de agentes— **sin tocar una sola tabla, endpoint o pantalla**.

---

## 1. Principios de arquitectura

1. **La IA es un adaptador, no el núcleo.** El dominio (candidatos, evidencia, vacantes, matching) vive en el backend. La IA produce insumos que el backend valida, normaliza y persiste.
2. **Contratos antes que prompts.** Todo intercambio con la capa de IA pasa por esquemas Pydantic versionados. Si el output no valida, no entra al sistema.
3. **Scoring determinista, explicación generada.** El porcentaje de match lo calcula código Python auditable. La IA solo redacta la explicación *a partir del desglose ya calculado* (cumple RNF-03, RB-09).
4. **Privacidad por construcción.** La anonimización no es un filtro de UI: son DTOs distintos. Los atributos protegidos jamás llegan al motor de scoring ni al payload anónimo (RF-19, RB-05).
5. **Todo output de IA es auditable.** Se persiste invocación, versión de prompt, modelo, entrada y salida cruda (RNF-06).
6. **Monolito modular, no microservicios.** Una semana no alcanza para orquestar servicios. Módulos con fronteras claras que *podrían* separarse después.
7. **Degradación controlada.** Existe un adaptador de IA determinista (seed/mock) que permite ejecutar el golden path completo aunque el proveedor falle en vivo (RNF-09).
8. **Estado explícito para operaciones largas.** Nada de requests HTTP de 60 segundos: jobs con estado consultable.

---

## 2. Stack tecnológico

| Capa | Elección | Razón corta | Alternativa viable |
|---|---|---|---|
| Lenguaje | **Python 3.12** | El ecosistema de agentes es Python-first; evita mantener dos runtimes | Node 20 + NestJS (obliga a servicio de IA aparte) |
| API | **FastAPI** | Async nativo, OpenAPI automático, integración directa con Pydantic | Litestar, Django REST |
| Validación / contratos | **Pydantic v2** | Mismo esquema sirve para API, DB y structured outputs del LLM | — |
| ORM | **SQLAlchemy 2.0 + Alembic** | Control de migraciones y JSONB sin pelear | SQLModel (más simple, menos control) |
| Base de datos | **PostgreSQL 16** | Relacional + JSONB para evidencia/rúbricas; `pgvector` opcional | — |
| Almacenamiento de archivos | **Supabase Storage** (o Cloudflare R2 / S3) | CVs y certificaciones fuera del contenedor de la app | S3 |
| Autenticación | **JWT propio** (PyJWT + passlib/argon2) | Dos roles, cero dependencia externa, control total | Supabase Auth |
| Trabajos asíncronos | **Tabla `jobs` + BackgroundTasks** | Suficiente para el MVP; ruta de upgrade clara | Redis + `arq`/Celery |
| Cliente LLM | SDK del proveedor con *structured outputs* | Predecible y depurable | LangGraph (ver §6.6) |
| Logs | `structlog` + request_id | Trazabilidad sin infraestructura | — |
| Tests | `pytest` + `httpx` | Solo lo crítico (§16) | — |
| Empaquetado | **Docker** (imagen única) | Mismo artefacto en local y producción | — |
| Frontend (contexto) | React + Vite o Next.js | Build estático desplegable en Hostinger | — |

**Sobre el lenguaje:** si el equipo es fuertemente JS/TS, la alternativa razonable es NestJS para el backend + un servicio Python solo para agentes. Cuesta un contrato HTTP extra, un deploy extra y sincronización de esquemas. Para una semana, **un solo runtime Python es la apuesta segura**.

---

## 3. Vista general del sistema

```
┌──────────────────────────────────────────────────────────┐
│  FRONTEND (Hostinger)                                     │
│  React SPA — Candidato · Empresa · Marketplace            │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTPS / JSON  (JWT Bearer)
                         │ CORS allowlist
┌────────────────────────▼─────────────────────────────────┐
│  API — FastAPI (Railway / Render)                         │
│                                                            │
│  ┌── Capa HTTP ──────────────────────────────────────┐    │
│  │ routers · DTOs de entrada/salida · authz por rol  │    │
│  └───────────────────────┬───────────────────────────┘    │
│  ┌── Capa de Servicios (dominio) ────────────────────┐    │
│  │ candidates · documents · interviews · assessments │    │
│  │ companies · vacancies · matching · marketplace    │    │
│  └───────┬──────────────────────────────┬────────────┘    │
│          │                              │                  │
│  ┌───────▼──────────┐        ┌──────────▼──────────────┐  │
│  │ Motor de Matching│        │  AI PORT (interfaz)     │  │
│  │  determinista    │        │  contratos Pydantic     │  │
│  └───────┬──────────┘        └──────────┬──────────────┘  │
│          │                              │ adaptadores      │
│  ┌───────▼──────────────────────────────▼──────────────┐  │
│  │ Repositorios · SQLAlchemy · Alembic                 │  │
│  └───────┬──────────────────────────────┬──────────────┘  │
└──────────┼──────────────────────────────┼─────────────────┘
           │                              │
   ┌───────▼────────┐            ┌────────▼─────────────┐
   │ PostgreSQL     │            │ CAPA DE AGENTES      │
   │ (Supabase/Neon)│            │  → documento 05      │
   └────────────────┘            │ mock · real · futura │
   ┌────────────────┐            └────────┬─────────────┘
   │ Object Storage │                     │
   │ CVs, certifs.  │            ┌────────▼─────────────┐
   └────────────────┘            │ Proveedor LLM        │
                                 └──────────────────────┘
```

La frontera crítica es **AI PORT**: todo lo que está a su derecha puede reemplazarse sin afectar lo que está a su izquierda.

---

## 4. Modularización y estructura del repositorio

```
conecta-empleo/
├── CLAUDE.md                     # convenciones para Claude Code
├── docker-compose.yml            # postgres local
├── Dockerfile
├── pyproject.toml
├── alembic/
│   └── versions/
├── app/
│   ├── main.py                   # bootstrap FastAPI, CORS, routers
│   ├── config.py                 # pydantic-settings, .env
│   ├── database.py               # engine, session, base
│   ├── core/
│   │   ├── security.py           # hashing, JWT, dependencias de rol
│   │   ├── errors.py             # excepciones de dominio → HTTP
│   │   ├── logging.py
│   │   └── jobs.py               # runner de trabajos async
│   ├── modules/
│   │   ├── identity/             # users, auth, roles
│   │   ├── candidates/           # perfil, claims, skills declaradas
│   │   ├── documents/            # upload, storage, parsing
│   │   ├── interviews/           # sesiones, turnos, transcripción
│   │   ├── assessments/          # rúbricas, evidencia, talent profile
│   │   ├── companies/            # empresa, verificación visual
│   │   ├── vacancies/            # vacantes, requisitos, pesos
│   │   ├── matching/             # motor determinista, runs, resultados
│   │   ├── marketplace/          # ranking, anonimización, desbloqueo
│   │   └── mocks/                # notificaciones, mensajes, planes
│   ├── ai/
│   │   ├── contracts.py          # ★ DTOs de entrada/salida de IA
│   │   ├── port.py               # ★ interfaz abstracta
│   │   ├── registry.py           # selector de adaptador por config
│   │   └── adapters/
│   │       ├── deterministic.py  # golden path sin LLM
│   │       └── agentic.py        # implementación real → doc 05
│   └── seeds/
│       ├── families.py
│       ├── rubrics/              # JSON versionados por familia
│       └── demo_candidates.py
└── tests/
```

Cada módulo sigue el mismo patrón interno: `models.py` (SQLAlchemy) · `schemas.py` (Pydantic) · `service.py` (lógica) · `router.py` (HTTP) · `repository.py` cuando la consulta es no trivial.

**Regla de dependencia:** los módulos de dominio pueden importar de `ai/port.py` y `ai/contracts.py`, **nunca** de `ai/adapters/`. La selección del adaptador ocurre en `registry.py` vía inyección de dependencias.

---

## 5. Modelo de datos

### 5.1 Identidad y perfiles

**`users`** — `id (uuid)`, `email (unique)`, `password_hash`, `role (CANDIDATE|COMPANY)`, `created_at`, `is_active`

**`candidate_profiles`** — `id`, `user_id (fk)`, `full_name`, `birth_date`, `gender` *(opcional, nunca usado en scoring)*, `photo_url`, `phone`, `job_family_id (fk)`, `location_city`, `location_state`, `location_lat`, `location_lng`, `availability`, `salary_expectation_min`, `salary_expectation_max`, `education (jsonb)`, `experience (jsonb)`, `status (DRAFT|CV_READY|INTERVIEWING|EVALUATED)`, `anon_code (unique, ej. "CND-4F82")`

**`companies`** — `id`, `user_id (fk)`, `legal_name`, `trade_name`, `industry`, `size`, `location_*`, `logo_url`, `verification_status (UNVERIFIED|PENDING|VERIFIED)` *(visual en el MVP, RF-14)*

### 5.2 Catálogo y rúbricas

**`job_families`** — `id`, `code (ADMIN_ASSISTANT|HEAVY_MACHINERY_OPERATOR|WAREHOUSE_SUPERVISOR)`, `name`, `role_objective`

**`competencies`** — `id`, `job_family_id (fk)`, `code`, `name`, `type (TECHNICAL|BEHAVIORAL)`, `description`, `is_core (bool)`

**`rubrics`** — `id`, `competency_id (fk)`, `version (int)`, `levels (jsonb)`, `evidence_guidelines (jsonb)`, `is_active`
> `levels` describe niveles 0–4 con descriptores observables. Es **dato semilla versionado**, no código: cambiar una rúbrica no requiere redeploy del backend.

**`skills`** — `id`, `code`, `name`, `category` — catálogo normalizado, se autoextiende con skills nuevas detectadas.

### 5.3 Documentos y extracción

**`documents`** — `id`, `owner_user_id`, `type (CV|CERTIFICATION|OTHER)`, `storage_key`, `original_filename`, `mime_type`, `size_bytes`, `status (UPLOADED|PROCESSING|PARSED|FAILED)`, `uploaded_at`

**`cv_extractions`** — `id`, `document_id (fk)`, `candidate_id (fk)`, `raw_payload (jsonb)`, `normalized_payload (jsonb)`, `contract_version`, `ai_invocation_id (fk)`, `confirmed_by_candidate (bool)`, `confirmed_at`
> Regla clave (HU-C03): un fallo de parsing marca `FAILED` y **no muta el perfil**. La extracción vive aparte hasta que el candidato la confirma (HU-C05).

**`claims`** — `id`, `candidate_id`, `source (CV|CONVERSATION|MANUAL)`, `skill_id (nullable)`, `statement`, `claimed_level`, `needs_validation (bool)`, `source_ref (jsonb)`

### 5.4 Entrevista

**`interview_sessions`** — `id`, `candidate_id`, `job_family_id`, `status (PENDING|IN_PROGRESS|COMPLETED|ABANDONED)`, `question_budget (int)`, `questions_asked (int)`, `coverage_state (jsonb)`, `started_at`, `completed_at`, `agent_version`

**`interview_turns`** — `id`, `session_id`, `sequence (int)`, `question_text`, `target_competency_id`, `question_intent (PROBE|SCENARIO|CLARIFY|SWITCH)`, `references_turn_id (nullable, fk)`, `answer_text`, `answer_received_at`, `ai_invocation_id`
> `references_turn_id` es la prueba estructural de HU-I02: permite demostrar en datos —no en discurso— que una pregunta derivó de una respuesta previa.

### 5.5 Evidencia y evaluación

**`competency_evaluations`** — `id`, `candidate_id`, `competency_id`, `rubric_id`, `rubric_version`, `score (0–100)`, `rubric_level (0–4)`, `confidence (0–1)`, `justification (text)`, `evidence_refs (jsonb → [turn_id])`, `limitations (text)`, `ai_invocation_id`, `created_at`

**`candidate_skills`** — `id`, `candidate_id`, `skill_id`, `is_declared (bool)`, `is_evaluated (bool)`, `is_verified (bool)`, `evaluated_score`, `confidence`, `evidence_summary`
> Los tres estados son **banderas independientes**, no un enum. Una skill puede ser declarada + evaluada + verificada simultáneamente (§8 del Brief, RF-12).

**`skill_evidences`** — `id`, `candidate_skill_id`, `type (INTERVIEW_ANSWER|DOCUMENT|EXTERNAL)`, `document_id (nullable)`, `interview_turn_id (nullable)`, `accepted_for_verification (bool)`, `notes`
> **Invariante de dominio:** `is_verified = true` solo si existe al menos una evidencia con `type IN (DOCUMENT, EXTERNAL)` y `accepted_for_verification = true`. Se aplica en `service.py`, no en el prompt (RB-02, criterio transversal).

**`talent_profiles`** — `id`, `candidate_id`, `version`, `top_skills (jsonb)`, `strengths (jsonb)`, `evidence_gaps (jsonb)`, `summary_text`, `generated_at`, `is_current`

### 5.6 Vacantes

**`vacancies`** — `id`, `company_id`, `job_family_id`, `title`, `description`, `location_*`, `work_mode`, `salary_min`, `salary_max`, `positions_count`, `status (DRAFT|OPEN|CLOSED)`, `created_at`

**`vacancy_requirements`** — `id`, `vacancy_id`, `competency_id (nullable)`, `skill_id (nullable)`, `kind (MANDATORY|DESIRABLE)`, `min_level`, `weight (decimal)`
> Los pesos se **normalizan a 100 al guardar** (RB-07). Se persiste el valor normalizado para que la explicación sea reproducible.

### 5.7 Matching y marketplace

**`match_runs`** — `id`, `vacancy_id`, `executed_at`, `algorithm_version`, `weights_snapshot (jsonb)`, `candidates_evaluated (int)`
> El snapshot de pesos hace que un ranking viejo siga siendo explicable aunque la empresa cambie los pesos después.

**`match_results`** — `id`, `match_run_id`, `candidate_id`, `total_score`, `breakdown (jsonb)`, `strengths (jsonb)`, `gaps (jsonb)`, `explanation_text`, `penalties (jsonb)`, `rank_position`

**`candidate_unlocks`** — `id`, `company_id`, `candidate_id`, `vacancy_id`, `unlocked_at`, `source_match_result_id`
> Presencia de fila = identidad visible. No hay flag mutable en el perfil (HU-M04).

### 5.8 Transversales

**`jobs`** — `id`, `type (CV_PARSE|INTERVIEW_EVALUATE|PROFILE_BUILD|MATCH_RUN)`, `status (QUEUED|RUNNING|DONE|FAILED)`, `payload (jsonb)`, `result_ref`, `error`, `progress (0–100)`, `created_at`, `finished_at`

**`ai_invocations`** — `id`, `operation`, `contract_version`, `adapter`, `model`, `prompt_version`, `input_digest`, `raw_output (jsonb)`, `latency_ms`, `tokens_in/out`, `status`, `error`, `created_at`
> Tabla de auditoría (RNF-06). Toda fila producida por IA apunta aquí. También es el registro que permite depurar la demo en vivo.

---

## 6. Capa de IA: puertos y adaptadores

Esta sección es el contrato que hace posible el documento 05 sin reescribir el backend.

### 6.1 La interfaz

```python
# app/ai/port.py
class AIPort(Protocol):
    async def parse_cv(self, req: CVParseRequest) -> CVParseResult: ...
    async def build_cv_conversationally(self, req: CVConversationRequest) -> CVConversationResult: ...
    async def next_interview_question(self, req: InterviewTurnRequest) -> InterviewTurnResult: ...
    async def evaluate_competencies(self, req: EvaluationRequest) -> EvaluationResult: ...
    async def build_talent_profile(self, req: TalentProfileRequest) -> TalentProfileResult: ...
    async def explain_match(self, req: MatchExplanationRequest) -> MatchExplanationResult: ...
```

Seis operaciones. Nada más. Si el documento 05 introduce ocho agentes, un supervisor y memoria de largo plazo, el backend sigue viendo estas seis funciones.

### 6.2 Contratos ilustrativos

```python
class InterviewTurnRequest(BaseModel):
    contract_version: Literal["1.0"] = "1.0"
    session_id: UUID
    job_family_code: str
    candidate_snapshot: CandidateSnapshot     # sin nombre, foto, edad ni género
    rubrics: list[RubricSpec]                 # inyectadas por el backend
    claims: list[ClaimDTO]
    history: list[TurnDTO]
    coverage_state: dict[str, CoverageStatus]
    remaining_questions: int

class InterviewTurnResult(BaseModel):
    contract_version: Literal["1.0"]
    action: Literal["ASK", "PROBE", "SWITCH_COMPETENCY", "FINISH"]
    question_text: str | None
    target_competency_code: str | None
    references_turn_id: UUID | None
    rationale: str
    coverage_update: dict[str, CoverageStatus]
```

```python
class CompetencyScore(BaseModel):
    competency_code: str
    rubric_version: int
    score: conint(ge=0, le=100)
    rubric_level: conint(ge=0, le=4)
    confidence: confloat(ge=0, le=1)
    justification: str = Field(min_length=20)
    evidence_turn_ids: list[UUID] = Field(min_length=1)   # obliga a citar
    limitations: str | None
```

### 6.3 Invariantes que el backend impone (pase lo que pase con los agentes)

| # | Invariante | Dónde se aplica |
|---|---|---|
| I-01 | Ningún output de IA se persiste sin validar contra su esquema | `ai/registry.py` (wrapper) |
| I-02 | `evidence_turn_ids` debe referenciar turnos reales de esa sesión, o la evaluación se rechaza | `assessments/service.py` |
| I-03 | Ningún agente puede marcar `is_verified` | `assessments/service.py` |
| I-04 | Scores fuera de 0–100 → error, no clamp silencioso | validación Pydantic |
| I-05 | El `candidate_snapshot` enviado a IA nunca incluye nombre, foto, edad ni género | constructor del DTO + test |
| I-06 | La entrevista termina al agotar `question_budget`, decida lo que decida el agente | `interviews/service.py` |
| I-07 | La IA nunca calcula el `total_score` del match; solo redacta sobre el desglose recibido | `matching/engine.py` |
| I-08 | Timeout + N reintentos + fallback al adaptador determinista | wrapper del puerto |

Estas ocho reglas son la razón por la que el sistema "sigue funcionando aunque cambie el modo de razonar de los agentes".

### 6.4 Adaptadores

- **`DeterministicAdapter`** — sin LLM. Devuelve respuestas coherentes desde datos semilla. Sirve para tests, desarrollo del frontend sin gastar tokens, y **plan B en vivo** si el proveedor falla durante la demo (RNF-09).
- **`AgenticAdapter`** — la implementación real. Su interior es materia del documento 05.

Selección por variable de entorno: `AI_ADAPTER=deterministic|agentic`. Puede fijarse **por operación** (`AI_ADAPTER_INTERVIEW=agentic`, `AI_ADAPTER_CV=deterministic`), lo cual permite construir y demostrar por partes.

### 6.5 Versionado de contratos

`contract_version` viaja en cada request/response y se persiste en `ai_invocations`. Un cambio incompatible crea `1.1` y el adaptador declara qué versiones soporta. Evita que evaluaciones viejas se vuelvan ilegibles.

### 6.6 Nota sobre LangChain (respuesta directa a la pregunta)

Evaluación breve; la decisión final pertenece al documento 05:

- **LangChain "clásico"** (chains, loaders): aporta poco aquí. El parsing de CV lo resuelven mejor `pypdf`/`python-docx` + un LLM con structured output, y las abstracciones agregan capas que dificultan depurar bajo presión de tiempo.
- **LangGraph**: es el candidato serio. La entrevista adaptativa es una máquina de estados con memoria y ramificación —exactamente su caso de uso— y su modelo de grafo se documenta bien para un jurado.
- **SDK del proveedor + Pydantic**: la opción más rápida y predecible para las cinco operaciones que *no* son la entrevista. Cero dependencias, structured outputs nativos.

**Recomendación:** no comprometer el backend con ninguna. Con `AIPort` definido, se puede arrancar con SDK directo, migrar la entrevista a LangGraph si el tiempo lo permite, y no cambiar nada más. Esa opcionalidad es justamente lo que compra el patrón de puertos y adaptadores.

---

## 7. Motor de matching determinista

### 7.1 Fórmula

```
score_bruto = Σ (peso_normalizado_i × score_componente_i)
total       = clamp(score_bruto − penalizaciones, 0, 100)
```

### 7.2 Componentes

| Componente | Fuente | Peso sugerido por defecto |
|---|---|---|
| Competencia técnica | `competency_evaluations` (TECHNICAL) | 40 |
| Competencia conductual | `competency_evaluations` (BEHAVIORAL) | 20 |
| Experiencia | años y relevancia del perfil | 15 |
| Calidad de evidencia | mezcla declarada/evaluada/verificada + confianza | 10 |
| Compatibilidad salarial | solapamiento de rangos | 8 |
| Compatibilidad geográfica | distancia por bandas | 7 |

Editables por vacante dentro de límites, normalizados a 100 (HU-E03, RB-07).

### 7.3 Reglas de cálculo

- **Requisito obligatorio incumplido** → penalización explícita registrada en `penalties` (RB-08). No elimina al candidato en silencio: la empresa ve *por qué* bajó.
- **Skill solo declarada** → aporta con factor reducido frente a evaluada. Sin evidencia no hay puntaje pleno (principio 1 del Brief).
- **Confianza baja** en una evaluación → atenúa su contribución, no la anula (RB-10).
- **Geografía** por bandas (misma ciudad / <30km / <80km / fuera), nunca con domicilio exacto (RB-06).
- **Elegibilidad**: solo candidatos con `status = EVALUATED` y `talent_profile` vigente entran al run (RB-01).

### 7.4 Salida

```json
{
  "total_score": 78,
  "breakdown": [
    {"component": "TECHNICAL", "weight": 40, "raw": 82, "contribution": 32.8},
    {"component": "BEHAVIORAL", "weight": 20, "raw": 70, "contribution": 14.0}
  ],
  "penalties": [
    {"reason": "MANDATORY_UNMET", "requirement": "Licencia tipo E", "points": -8}
  ],
  "strengths": ["control de inventarios (evaluada, 88)"],
  "gaps": ["manejo de montacargas: sin evidencia"]
}
```

Ese JSON es la **única entrada** de `explain_match`. La IA redacta prosa sobre números que ya existen; no puede inventar un porcentaje ni contradecir el desglose (RNF-03, RB-09, HU-M02).

---

## 8. Privacidad y anonimización

Tres DTOs distintos para un candidato, no un solo modelo con condicionales:

| DTO | Contiene | Se usa en |
|---|---|---|
| `AnonymousCandidateCard` | `anon_code`, familia, skills+estados, scores, fortalezas, gaps, banda geográfica, banda salarial | Ranking y detalle previo al desbloqueo |
| `UnlockedCandidateProfile` | Lo anterior + nombre, contacto, foto, CV, documentos | Solo con fila en `candidate_unlocks` |
| `CandidateSnapshotForAI` | Datos profesionales, sin atributos protegidos | Requests a la capa de IA |

Refuerzos:

- La query del ranking **no selecciona** `full_name`, `photo_url`, `birth_date`, `gender`. No es que se oculten en la respuesta: no se traen de la base.
- El motor de matching recibe un `MatchingCandidateView` que carece físicamente de esos campos (I-05, RB-05).
- Test explícito: serializar `AnonymousCandidateCard` y afirmar que ninguna clave prohibida aparece en el JSON (HU-M03).
- El desbloqueo es una operación de escritura auditada; en el MVP no requiere aprobación del candidato (HU-M04).

---

## 9. Operaciones asíncronas

Las cuatro operaciones lentas (parse de CV, evaluación final, construcción de perfil, run de matching) siguen el mismo patrón:

```
POST /candidates/me/cv          → 202 { job_id }
GET  /jobs/{job_id}             → { status, progress, result_ref }
```

El frontend hace polling cada 1.5–2 s y muestra estado (RNF-02). La entrevista turno a turno **sí** es síncrona: una pregunta a la vez, latencia tolerable, con opción de streaming vía SSE si sobra tiempo.

Ciclo de vida: `QUEUED → RUNNING → DONE | FAILED`. Un job fallido es reintentable y **nunca deja el perfil en estado inconsistente** (HU-C03).

Upgrade path si `BackgroundTasks` no alcanza: Redis + `arq`, mismo contrato de tabla `jobs`, sin cambios en el frontend.

---

## 10. Superficie de API

| Módulo | Endpoints |
|---|---|
| Auth | `POST /auth/register` · `POST /auth/login` · `GET /auth/me` |
| Catálogo | `GET /job-families` · `GET /job-families/{id}/competencies` |
| Candidato | `GET/PATCH /candidates/me` · `POST /candidates/me/job-family` · `GET /candidates/me/status` |
| Documentos | `POST /candidates/me/cv` · `GET /candidates/me/cv/extraction` · `PATCH /candidates/me/cv/extraction` (confirmar) · `POST /candidates/me/certifications` |
| CV conversacional | `POST /cv-builder/sessions` · `POST /cv-builder/sessions/{id}/messages` · `POST /cv-builder/sessions/{id}/finalize` · `GET /cv-builder/sessions/{id}/document` |
| Entrevista | `POST /interviews` · `GET /interviews/{id}/next-question` · `POST /interviews/{id}/answers` · `GET /interviews/{id}/progress` · `POST /interviews/{id}/complete` |
| Perfil evaluado | `GET /candidates/me/talent-profile` · `GET /candidates/me/skills` |
| Empresa | `GET/PATCH /companies/me` · `GET /companies/me/verification` |
| Vacantes | `POST /vacancies` · `GET /vacancies` · `GET/PATCH /vacancies/{id}` · `PUT /vacancies/{id}/requirements` · `PUT /vacancies/{id}/weights` |
| Matching | `POST /vacancies/{id}/match-runs` → job · `GET /match-runs/{id}/results?limit&offset` |
| Marketplace | `GET /match-results/{id}` (anónimo) · `POST /match-results/{id}/unlock` · `GET /candidates/{id}/full` (requiere unlock) · `GET /vacancies/{id}/compare?ids=` |
| Jobs | `GET /jobs/{id}` |
| Mocks | `GET /notifications` · `GET /messages` · `GET /billing/plans` |

Convenciones: errores con `{code, message, details}`; paginación `limit/offset`; todo bajo `/api/v1`.

---

## 11. Seguridad

- JWT de acceso (~60 min) + refresh opcional; `role` en el claim.
- Dependencias `require_candidate()` / `require_company()` / `require_unlock()` a nivel de router.
- Contraseñas con argon2.
- Uploads: validación de MIME real, límite de tamaño (~10 MB), extensiones permitidas (PDF, DOCX, imágenes), nombre de archivo reescrito a UUID.
- URLs de storage firmadas y de vida corta.
- Secretos solo en variables de entorno del servidor; el frontend nunca ve la API key del proveedor LLM (RNF-05).
- CORS con allowlist explícita del dominio de Hostinger.
- Rate limiting básico en endpoints de IA para evitar quemar cuota durante la demo.

---

## 12. Observabilidad y auditoría

- Logs estructurados JSON con `request_id`, `user_id`, `operation`, `latency_ms`.
- `ai_invocations` como bitácora completa de IA: entrada, salida cruda, versión de prompt, modelo, latencia, tokens.
- `GET /admin/ai-invocations` (protegido) para depurar en vivo sin abrir la base.
- Contador de costo aproximado por sesión — evita sorpresas en el presupuesto del hackatón.
- `/health` con verificación de DB y del proveedor de IA.

---

## 13. Configuración y entornos

```
DATABASE_URL=
JWT_SECRET=
STORAGE_PROVIDER=supabase|s3|local
STORAGE_BUCKET=
LLM_PROVIDER=
LLM_API_KEY=
LLM_MODEL=
AI_ADAPTER=deterministic|agentic
INTERVIEW_QUESTION_BUDGET=12
CORS_ORIGINS=
ENVIRONMENT=local|staging|production
```

Tres entornos: **local** (docker-compose con Postgres + adaptador determinista), **staging** (deploy automático desde `main`), **producción/demo** (rama estable, datos semilla cargados, congelada antes de presentar).

---

## 14. Despliegue a producción

### 14.1 Distribución

| Pieza | Plataforma | Comentario |
|---|---|---|
| Frontend | **Hostinger** | Build estático (`dist/`) subido por FTP o Git deploy |
| API | **Railway** | Deploy desde GitHub, detecta Dockerfile, dominio HTTPS incluido |
| PostgreSQL | **Railway Postgres** o **Supabase** | Provisión en un clic, `DATABASE_URL` inyectada |
| Storage | **Supabase Storage** | Free tier suficiente para CVs de demo |

### 14.2 Comparativa breve

| Opción | A favor | En contra |
|---|---|---|
| **Railway** *(recomendado)* | API + Postgres en el mismo proyecto, deploy en minutos, logs claros, sin cold start en plan pago mínimo | Free tier limitado por horas |
| **Render** | Free tier real para web service | El servicio gratuito duerme; el primer request tarda ~50 s (mala demo) |
| **Fly.io** | Buen control, regiones cercanas a México | Más configuración de la que justifica una semana |
| **Supabase** | Postgres + Storage + backups en un solo panel | No ejecuta el backend Python; se combina, no sustituye |
| **Neon** | Postgres serverless con branching | Solo base de datos |
| **Hostinger VPS** | Todo en un lugar | Configurar Nginx, Docker, certbot y systemd cuesta medio día |

**Combinación recomendada:** `Frontend en Hostinger + API en Railway + Postgres en Railway + Storage en Supabase`. Es la ruta con menos configuración manual y con `git push` como único ritual de despliegue —relevante cuando se trabaja con Claude Code e iteraciones frecuentes.

### 14.3 Flujo de despliegue

1. `git push` a `main`.
2. Railway construye la imagen Docker.
3. Release command: `alembic upgrade head`.
4. Arranque: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
5. `/health` verde.
6. Frontend con `VITE_API_URL` apuntando al dominio de Railway; se sube el build a Hostinger.

### 14.4 Antes de la demo

- Ejecutar seeds (familias, competencias, rúbricas, candidatos demo).
- Snapshot de la base restaurable en un comando.
- `AI_ADAPTER` conmutable en caliente por si el proveedor falla.
- Recorrido completo del golden path ensayado sobre el ambiente desplegado, no en local.

---

## 15. Datos semilla y golden path

**Semillas obligatorias:** 3 familias · ~6–8 competencias por familia (mezcla técnica/conductual) · rúbricas v1 en JSON · catálogo base de skills · 1 empresa demo verificada · 1 vacante por familia · **5+ candidatos evaluados por familia** con perfiles y evidencia completos (criterio de éxito §16 del PRD).

Los candidatos semilla se generan con el adaptador determinista y quedan persistidos. El ranking se ve poblado y creíble desde el primer segundo, incluso si nadie completa una entrevista en vivo.

**Golden path de la demo (~6 minutos):**
`registro de candidato → familia → CV (subir o conversar) → revisión de claims → entrevista con al menos una repregunta que cite una respuesta anterior → Perfil de Talento Verificado` → cambio a empresa → `crear vacante con pesos → ranking anónimo → abrir explicación del match → desbloquear candidato`.

---

## 16. Estrategia mínima de pruebas

Con una semana, se prueba solo lo que rompe la demo o rompe la promesa del producto:

1. Ningún atributo protegido aparece en `AnonymousCandidateCard`.
2. Los atributos protegidos no llegan al motor de matching.
3. La suma de pesos siempre normaliza a 100.
4. `is_verified` no puede activarse sin evidencia documental aceptada.
5. Un output de IA malformado no corrompe estado y activa el fallback.
6. El score total se recalcula igual dados los mismos insumos (determinismo).
7. Smoke test del journey completo contra el adaptador determinista.

---

## 17. Riesgos técnicos y mitigaciones

| Riesgo | Mitigación arquitectónica |
|---|---|
| El proveedor de IA falla en la demo | `DeterministicAdapter` conmutable por env var |
| Output de IA inválido | Validación Pydantic + reintento + fallback (I-01, I-08) |
| Entrevista interminable | `question_budget` impuesto por el backend (I-06) |
| Score opaco | Cálculo determinista con `breakdown` persistido |
| Filtración de datos personales | DTOs separados + test de serialización |
| Latencia percibida | Jobs asíncronos con progreso |
| Cambio tardío en el diseño de agentes | Puerto de IA estable, seis operaciones |
| Costos de tokens | Adaptador determinista en desarrollo + contador por sesión |
| Alucinación en evaluaciones | `evidence_turn_ids` obligatorio y validado contra turnos reales (I-02) |

---

## 18. Orden de construcción sugerido

Pensado para sesiones de Claude Code, cada bloque deja algo demostrable:

1. **Base:** proyecto, config, Docker, Postgres, Alembic, `/health`.
2. **Identidad:** users, JWT, roles, guards.
3. **Catálogo y semillas:** familias, competencias, rúbricas.
4. **Perfil de candidato + módulo de documentos.**
5. **`AIPort` + contratos + `DeterministicAdapter`.** ← desbloquea todo lo demás y permite avanzar el frontend en paralelo.
6. **Extracción de CV y claims** (jobs asíncronos).
7. **Entrevista:** sesiones, turnos, presupuesto, cobertura.
8. **Evaluación, evidencia y Perfil de Talento Verificado.**
9. **Empresa y vacantes** con requisitos y pesos.
10. **Motor de matching + rankings** (aún sin explicación IA).
11. **Anonimización y desbloqueo.**
12. **`AgenticAdapter`** — documento 05.
13. **Explicaciones de match, comparación, mocks (P2).**

Los pasos 1–11 producen un sistema **completo y demostrable sin un solo LLM conectado**. Esa propiedad no es un accidente del plan: es la consecuencia directa del principio 1.

### Nota para `CLAUDE.md`

Conviene fijar en el repo: estructura de módulos, la regla de que el dominio nunca importa adaptadores, patrón `models/schemas/service/router`, obligación de migración Alembic ante cambios de modelo, prohibición de secretos en código, y la lista de invariantes de §6.3 como reglas no negociables.

---

## 19. Lo que este documento deliberadamente no define

- Diseño interno de agentes, número de agentes, orquestación, memoria, prompts, herramientas y estrategia de razonamiento → **documento 05**.
- Ingeniería de prompts y calibración de rúbricas.
- Diseño visual y sistema de componentes del frontend.
- Modelo de negocio, planes y cobros.

Cualquiera de esos puntos puede cambiar por completo sin invalidar la arquitectura descrita aquí.
