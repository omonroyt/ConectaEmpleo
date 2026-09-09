# Conecta Empleo

Marketplace de talento verificado por IA para empresas que necesitan contratar personal sin contar con una infraestructura robusta de reclutamiento.

## Contexto

Conecta Empleo transforma un proceso de selección basado principalmente en información autodeclarada en uno sustentado en **evidencia, compatibilidad y evaluación estructurada**.

La plataforma analiza la información de las personas candidatas, crea currículums cuando es necesario, realiza entrevistas adaptativas y evalúa habilidades técnicas y conductuales mediante rúbricas. A partir de ello, genera evidencia verificable y construye un **Perfil de Talento Verificado**.

Las empresas configuran sus vacantes y un agente de IA compara sus requisitos contra la base de candidatos para generar un ranking explicable de compatibilidad. El alcance está pensado como un MVP enfocado en demostrar esta propuesta de valor durante el Hackatón IA.

## Problema

Muchas empresas, especialmente las que no disponen de equipos o herramientas especializadas de reclutamiento, enfrentan procesos lentos, poco estandarizados y difíciles de validar. Los currículums tradicionales no siempre permiten comprobar habilidades, experiencia o compatibilidad real con una vacante.

## Propuesta de valor

- Evalúa talento con criterios y rúbricas estructuradas.
- Genera evidencia para respaldar los perfiles de las personas candidatas.
- Facilita la creación de un currículum cuando la persona no cuenta con uno.
- Ayuda a las empresas a identificar candidatos compatibles mediante un ranking explicable.
- Reduce la incertidumbre en las primeras etapas de contratación.

## Funcionalidades esperadas del MVP

### Para candidatos

- Registro y captura de información profesional.
- Creación asistida de currículum.
- Entrevista adaptativa.
- Evaluación de habilidades técnicas y conductuales.
- Consulta de Perfil de Talento Verificado y su evidencia.

### Para empresas

- Creación y configuración de vacantes.
- Definición de requisitos y criterios de evaluación.
- Búsqueda de talento en la base de perfiles verificados.
- Ranking de compatibilidad con explicación de resultados.

## Principios del proyecto

- **Evidencia antes que declaración:** las recomendaciones se respaldan con resultados y señales de evaluación.
- **Explicabilidad:** empresas y candidatos deben poder entender los factores que influyen en una compatibilidad.
- **Evaluación estructurada:** se usan criterios consistentes para reducir la subjetividad.
- **MVP enfocado:** se prioriza validar el valor central de la solución dentro del contexto del hackatón.

## Estado del proyecto

**Operativo de punta a punta.** Backend (FastAPI + PostgreSQL) y frontend (Vite + React) están
completos y probados juntos: `pytest` (172+ pruebas), `ruff`, `npm run typecheck`/`build`, y un
recorrido real en navegador (`npm run e2e:smoke`) contra el backend real, ambos journeys (candidato
y empresa), en verde. Detalle completo del proceso de construcción en `docs/build/00_BUILD_STATE.md`
(tarea B13 — integración final).

Stack: FastAPI + PostgreSQL 16 + SQLAlchemy 2.0 + Alembic + JWT (backend) · Vite 6 + React 19 +
TypeScript + Tailwind v4 (frontend) · Claude (Anthropic) como proveedor de IA, con un
`DeterministicAdapter` sin costo para desarrollo/CI y un `AgenticAdapter` real para demo en vivo.

## Arranque en local

Requisitos: Docker Desktop, Python 3.12, Node 20+.

### 1. Base de datos

```bash
cd backend
docker compose up -d   # Postgres 16 en el puerto 5433 (no 5432, ver nota abajo)
```

> **`DATABASE_URL` heredado**: si tu shell ya exporta una variable `DATABASE_URL` de otro proyecto
> (por ejemplo una URL JDBC de Supabase), esa variable **gana sobre `backend/.env`**
> (`pydantic-settings`: entorno real > `.env`). Verifica con `echo $DATABASE_URL` y, si hace falta,
> exporta la correcta explícitamente en cada terminal antes de correr algo del backend:
> `export DATABASE_URL="postgresql+psycopg://conecta:conecta@localhost:5433/conecta"`.
>
> **Puerto 5433, no 5432**: `docker-compose.yml` mapea el contenedor a 5433 a propósito — en Windows
> un PostgreSQL nativo ya escuchando en 5432 puede interceptar silenciosamente las conexiones.

### 2. Backend

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate   # Windows; Git Bash: source .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env   # ajustar ANTHROPIC_API_KEY/ELEVENLABS_API_KEY si vas a probar el modo agentic/voz

export DATABASE_URL="postgresql+psycopg://conecta:conecta@localhost:5433/conecta"
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m app.seeds.run     # catálogo: familias, competencias, skills, rúbricas
.venv/Scripts/python.exe -m app.seeds.demo    # demo: 15 candidatos evaluados, empresa, 3 vacantes, match runs

uvicorn app.main:app --reload --port 8000
```

`GET http://localhost:8000/health` debe responder `{"status": "ok", "database": "up", ...}`.
Documentación interactiva en `http://localhost:8000/docs`. Ambos seeds son idempotentes: correrlos
de nuevo no duplica nada. Detalle completo en `backend/README.md`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # y edita VITE_API_MODE=http (el backend real ya está corriendo)
npm run dev            # http://localhost:5173
```

Con `VITE_API_MODE=mock` el frontend funciona standalone contra un mock en memoria (sin backend) —
útil para desarrollo de UI aislado. Detalle completo en `frontend/README.md`.

### 4. Usuarios demo (contraseña `demo1234` para los tres)

| Email | Rol | Estado |
|---|---|---|
| `candidato@demo.mx` | CANDIDATE | `DRAFT`, perfil nuevo — recorre el golden path completo en vivo |
| `maria@demo.mx` | CANDIDATE | `EVALUATED`, familia `WAREHOUSE_SUPERVISOR`, mejor evaluada de su familia |
| `empresa@demo.mx` | COMPANY | Empresa verificada, 3 vacantes `OPEN` con ranking ya poblado |

### Script de conveniencia

`scripts/dev.ps1` (PowerShell) o `scripts/dev.sh` (Bash) levantan Postgres + backend + frontend
juntos, cada uno en su propia ventana/proceso, para no repetir estos pasos a mano cada vez:

```powershell
./scripts/dev.ps1
```

```bash
bash scripts/dev.sh
```

Ninguno de los dos corre migraciones ni semillas — eso es manual la primera vez (pasos 1-3 arriba),
para poder diagnosticar cada paso por separado si algo falla.

## Verificación completa

```bash
# Backend (con DATABASE_URL explícito, ver nota arriba)
cd backend && pytest -q && ruff check .

# Frontend
cd frontend
npm run typecheck && npm run build
npm run smoke:mock          # 22 pasos contra el mock
npm run e2e:smoke           # 50 pasos en Chromium contra el mock (default)
E2E_TARGET=http npm run e2e:smoke   # mismo recorrido contra el backend real (backend ya corriendo)
```

## Equipo

Pendiente de agregar integrantes, roles y formas de contacto.

## Contribución

Por ahora, las contribuciones se coordinan con el equipo del proyecto. Cuando se establezca el flujo de trabajo, aquí se documentarán las convenciones, el proceso de revisión y las pautas para colaborar.

## Licencia

Pendiente de definir.
