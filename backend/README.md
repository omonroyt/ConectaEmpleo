# Conecta Empleo — API (backend)

FastAPI + PostgreSQL 16 + SQLAlchemy 2.0 (síncrono) + Alembic + JWT (PyJWT + argon2). Ver
`CLAUDE.md` en esta carpeta para las reglas de arquitectura no negociables.

## Requisitos

- Python 3.12 (`python --version`)
- Docker Desktop / Docker Engine con `docker compose`

## Puesta en marcha (local)

```bash
# 1. Postgres
docker compose up -d

# 2. Dependencias
python -m venv .venv
.venv/Scripts/activate        # Windows (Git Bash: source .venv/Scripts/activate)
pip install -r requirements.txt

# 3. Variables de entorno
cp .env.example .env          # ajustar si es necesario
```

> **Nota sobre el puerto de Postgres**: `docker-compose.yml` mapea el contenedor a **5433** en el
> host, no 5432. En Windows se detectó que un PostgreSQL nativo ya escuchando en 5432 puede
> interceptar silenciosamente las conexiones dirigidas al contenedor (el `docker compose ps`
> reporta "healthy" pero `psql`/la app terminan hablando con el proceso equivocado). Si tu máquina
> no tiene ese conflicto, puedes cambiar el mapeo a `5432:5432` y ajustar `DATABASE_URL`.

> **Variables de entorno del sistema**: si tu shell ya exporta `DATABASE_URL` (u otras variables de
> este proyecto) desde otro proyecto o tu perfil de shell, esa variable **gana sobre `.env`**
> (comportamiento estándar de `pydantic-settings`: entorno real > archivo `.env`). Verifica con
> `echo $DATABASE_URL` antes de reportar un bug de conexión "misterioso".

## Migrar y sembrar

```bash
alembic upgrade head
python -m app.seeds.run    # catálogo: familias, competencias, skills, rúbricas, banco de preguntas
python -m app.seeds.demo   # demo: 15 candidatos EVALUATED, empresa + 3 vacantes, match runs
```

`app/seeds/run.py` es idempotente: correrlo varias veces no duplica familias, competencias,
skills, rúbricas ni el catálogo de aprendizaje (busca por código/clave natural antes de insertar).

`app/seeds/demo.py` (B13) también es idempotente (busca por email/título antes de crear) y deja la
base lista para presentar: 5 candidatos `EVALUATED` por familia (15 en total, nombres y ciudades
mexicanas realistas, perfiles claramente diferenciados — recorre el flujo real de entrevista con el
`DeterministicAdapter`, cero tokens de LLM), la empresa demo verificada "Logística del Bajío S.A. de
C.V." con 3 vacantes `OPEN` (una por familia) y un match run ya ejecutado por vacante, y los 3
usuarios demo de abajo. Tarda ~15-20 s (15 entrevistas completas de 14 turnos cada una).

## Levantar la API

```bash
uvicorn app.main:app --reload
```

- `GET /health` → `{"status": "ok", "database": "up", "environment": "local"}`
- Documentación interactiva: `http://localhost:8000/docs`
- Todo el resto de endpoints vive bajo `/api/v1` (ver `docs/build/02_API_CONTRACT.md`).

### Verificación rápida con curl

```bash
curl http://localhost:8000/health

curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"candidato@demo.mx","password":"demo1234","role":"CANDIDATE"}'

curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"candidato@demo.mx","password":"demo1234"}'

curl http://localhost:8000/api/v1/job-families
```

### Usuarios demo (después de `python -m app.seeds.demo`)

Contraseña `demo1234` para los tres:

| Email | Rol | Estado |
|---|---|---|
| `candidato@demo.mx` | CANDIDATE | `DRAFT`, perfil nuevo — para recorrer el golden path completo en vivo |
| `maria@demo.mx` | CANDIDATE | `EVALUATED`, familia `WAREHOUSE_SUPERVISOR`, la mejor evaluada de su familia |
| `empresa@demo.mx` | COMPANY | Empresa verificada, 3 vacantes `OPEN` con match run ya ejecutado |

## Tests

```bash
pytest
```

Los tests corren contra la misma base de `docker-compose.yml` (no hay un motor in-memory razonable
para las columnas JSONB de Postgres que usan `rubrics`, `candidate_profiles.education`, etc.). Cada
test se ejecuta dentro de una transacción con SAVEPOINT que se revierte al final (`tests/conftest.py`),
así que no ensucia datos entre corridas. Antes de correr `pytest` por primera vez, asegúrate de que
`alembic upgrade head` y `python -m app.seeds.run` ya corrieron (los tests de catálogo dependen de
las semillas).

## Estructura

Ver `CLAUDE.md` en esta misma carpeta.

## Desplegar (Railway)

1. `git push` a `main`.
2. Railway construye la imagen con `Dockerfile`.
3. Release command: `alembic upgrade head`.
4. Arranque: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (ya es el `CMD` del `Dockerfile`).
5. Verificar `GET /health` en verde antes de apuntar el frontend (`VITE_API_URL`).

Detalle completo en `docs/04_Arquitectura_Tecnica_Backend.md` §14.
