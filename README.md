<div align="center">

# Conecta Empleo

**Marketplace de talento verificado por IA para empresas que contratan sin un área de reclutamiento.**

![Hackatón IA UTEL × Hostinger · septiembre 2026](https://img.shields.io/badge/Hackat%C3%B3n%20IA-UTEL%20%C3%97%20Hostinger%20%C2%B7%20septiembre%202026-173CFF?style=for-the-badge)

![React 19](https://img.shields.io/badge/React-19-149ECA?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-estricto-3178C6?style=flat-square&logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.12-009688?style=flat-square&logo=fastapi&logoColor=white)
![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Claude Sonnet 5](https://img.shields.io/badge/IA-Claude%20Sonnet%205-D97757?style=flat-square&logo=anthropic&logoColor=white)
![ElevenLabs](https://img.shields.io/badge/Voz-ElevenLabs-111111?style=flat-square&logo=elevenlabs&logoColor=white)

</div>

<br>

<p align="center">
  <img src="docs/pantallas/01-publica-landing-desktop.png" alt="Portada de Conecta Empleo con el ranking de talento compatible, un perfil verificado y el comparador de candidatos" width="100%">
</p>

> Un currículum dice lo que una persona **afirma** saber. Conecta Empleo lo convierte en **evidencia**: entrevista a cada candidato con IA, evalúa sus respuestas con rúbricas y entrega a la empresa un ranking anónimo y explicable de quién encaja mejor con su vacante.

## Sobre el proyecto

Conecta Empleo se construyó para el **Hackatón IA de UTEL y Hostinger, en septiembre de 2026**. Es un MVP hecho en cerca de una semana con una idea en el centro: que una pyme pueda tener lo que hoy solo tienen las grandes empresas, un proceso de selección con criterios claros, evidencia y explicaciones.

## El problema

Muchas pymes contratan sin reclutadores ni herramientas especializadas. Filtran currículums a mano, y casi todo lo que filtran es autodeclarado: nadie comprueba las habilidades hasta la entrevista final, cuando equivocarse ya salió caro.

Del otro lado están las personas candidatas. En México la tasa de informalidad laboral es de 56.2 % (INEGI, julio de 2026): mucha gente con años de experiencia nunca ha tenido un currículum que la respalde.

## Cómo funciona

```mermaid
flowchart LR
    A["CV subido o creado<br/>conversando con Sofía"] --> B["Entrevista adaptativa<br/>por voz o texto"]
    B --> C["Evaluación<br/>con rúbricas"]
    C --> D["Perfil de Talento<br/>Verificado"]
    D --> E["Ranking anónimo<br/>y explicable"]
    E --> F["La empresa desbloquea<br/>a sus finalistas"]
```

<table>
  <tr>
    <td width="50%"><img src="docs/pantallas/17-candidato-entrevista-en-curso-desktop.png" alt="Entrevista con IA en curso: la pregunta arriba, el orbe de voz al centro y el campo de respuesta abajo"></td>
    <td width="50%"><img src="docs/pantallas/21-candidato-perfil-talento-verificado-maria-desktop.png" alt="Perfil de Talento Verificado con el porcentaje de evidencia y el resumen generado por IA"></td>
  </tr>
  <tr>
    <td><b>La entrevista.</b> Preguntas que se adaptan a cada respuesta, por voz o por texto, frente a un orbe que reacciona a quien habla.</td>
    <td><b>El perfil verificado.</b> Lo que la persona demostró, con qué evidencia y qué le falta para crecer.</td>
  </tr>
</table>

### Para personas candidatas

- Suben su CV o lo construyen conversando con **Sofía**, la perfiladora con IA.
- Hacen una entrevista adaptativa por voz o por texto.
- Reciben su **Perfil de Talento Verificado**, con la evidencia detrás de cada habilidad.
- Exploran vacantes abiertas y se postulan.

### Para empresas

- Publican una vacante y definen el perfil ideal con requisitos y pesos; la plataforma advierte cuando un requisito puede ser discriminatorio.
- Reciben un ranking de talento compatible, con tarjetas anónimas y la explicación de cada porcentaje.
- Comparan candidatos lado a lado, arman su lista de finalistas y solo entonces desbloquean su identidad.

## Lo que no negociamos

| Principio | Cómo se garantiza |
|---|---|
| **Anonimato en el primer filtro** | Nombre, foto, edad y género nunca viajan en la tarjeta anónima ni a la IA. Lo impiden los tipos y los DTO, no un condicional en la interfaz. |
| **La IA apoya, no decide** | Ningún score aparece sin su explicación y ningún texto presenta a la IA como juez: nunca "apto" ni "reprobado". |
| **Un porcentaje auditable** | El match lo calcula código determinista; la IA solo redacta la explicación sobre ese desglose. |
| **"Verificada" significa verificada** | Una habilidad solo se marca así con evidencia documental aceptada, nunca por autodeclaración ni por decisión de un agente. |

## Impacto estimado

| Horas humanas por vacante | Costo por contratación | Costo de IA por candidato |
|:---:|:---:|:---:|
| **−83 %**<br><sub>de 20 h a 3.35 h</sub> | **−59 %**<br><sub>de 20,000 a 8,206 MXN</sub> | **US$0.86**<br><sub>por texto · US$1.18 con voz</sub> |

<sub>Cifras estimadas en el documento integral del proyecto. El costo de IA sale de las llamadas reales al modelo registradas durante las pruebas.</sub>

## Stack

| Capa | Tecnología |
|---|---|
| **Frontend** | Vite 6, React 19, TypeScript estricto, Tailwind CSS v4, Motion y three.js para el orbe de la entrevista. SPA estática lista para Hostinger. |
| **Backend** | FastAPI, PostgreSQL 16, SQLAlchemy 2.0, Alembic y autenticación con JWT. |
| **IA** | Claude Sonnet 5 (Anthropic) en un sistema multiagente, con un adaptador determinista sin costo para desarrollo y CI. |
| **Voz** | ElevenLabs para transcribir y sintetizar, con una salvaguarda de cuota que pasa la entrevista a texto antes de agotarla. |

## Estado

**Operativo de punta a punta.** 205 pruebas de backend en verde y un recorrido real en navegador que cubre los dos journeys, candidato y empresa: 50/50 pasos contra el mock y 83/83 contra el backend real. La bitácora completa de la construcción está en [`docs/build/00_BUILD_STATE.md`](docs/build/00_BUILD_STATE.md).

## Arranque en local

Requisitos: Docker Desktop, Python 3.12 y Node 20+.

### 1. Base de datos

```bash
cd backend
docker compose up -d   # Postgres 16 en el puerto 5433
```

<details>
<summary><b>Dos trampas del entorno que conviene conocer</b></summary>
<br>

- **`DATABASE_URL` heredado.** Si tu shell ya exporta una `DATABASE_URL` de otro proyecto (por ejemplo, una URL JDBC de Supabase), esa variable **gana sobre `backend/.env`** (`pydantic-settings`: entorno real > `.env`). Verifica con `echo $DATABASE_URL` y, si hace falta, exporta la correcta en cada terminal antes de correr algo del backend: `export DATABASE_URL="postgresql+psycopg://conecta:conecta@localhost:5433/conecta"`.
- **Puerto 5433, no 5432.** `docker-compose.yml` mapea el contenedor a 5433 a propósito: en Windows, un PostgreSQL nativo que ya escucha en 5432 puede interceptar las conexiones sin avisar.

</details>

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

`GET http://localhost:8000/health` debe responder `{"status": "ok", "database": "up", ...}`. La documentación interactiva vive en `http://localhost:8000/docs`. Las dos semillas son idempotentes: correrlas de nuevo no duplica nada. Detalle completo en [`backend/README.md`](backend/README.md).

> [!IMPORTANT]
> Las claves de Anthropic y ElevenLabs van solo en `backend/.env`, que git ignora; el frontend nunca las recibe. En producción define un `JWT_SECRET` propio: el valor de `.env.example` es solo para desarrollo.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # y cambia a VITE_API_MODE=http si el backend ya está corriendo
npm run dev            # http://localhost:5173
```

Con `VITE_API_MODE=mock` el frontend funciona solo, contra un mock en memoria y sin backend: útil para trabajar la interfaz de forma aislada. Detalle completo en [`frontend/README.md`](frontend/README.md).

### Todo junto

`scripts/dev.ps1` (PowerShell) o `scripts/dev.sh` (Bash) levantan Postgres, backend y frontend a la vez, cada uno en su propia ventana o proceso:

```powershell
./scripts/dev.ps1
```

```bash
bash scripts/dev.sh
```

Ninguno corre migraciones ni semillas: eso se hace a mano la primera vez (pasos 1 a 3), para poder diagnosticar cada paso por separado si algo falla.

### Usuarios demo

Los tres usan la contraseña `demo1234`.

| Email | Rol | Estado |
|---|---|---|
| `candidato@demo.mx` | Candidato | Perfil nuevo (`DRAFT`): recorre el golden path completo en vivo |
| `maria@demo.mx` | Candidata | Ya evaluada (`EVALUATED`), familia `WAREHOUSE_SUPERVISOR`, la mejor evaluada de su familia |
| `empresa@demo.mx` | Empresa | Empresa verificada con 3 vacantes abiertas y su ranking ya calculado |

## Verificación

```bash
# Backend (con DATABASE_URL explícito, ver las trampas del entorno)
cd backend && pytest -q && ruff check .

# Frontend
cd frontend
npm run typecheck && npm run build
npm run smoke:mock                  # 22 pasos contra el mock
npm run e2e:smoke                   # recorrido en Chromium contra el mock (default)
E2E_TARGET=http npm run e2e:smoke   # el mismo recorrido contra el backend real, ya corriendo
```

## Documentación

| Documento | Qué encontrarás |
|---|---|
| [Product Brief](docs/01_Product_Brief_Conecta_Empleo.md) | Visión, problema y propuesta de valor |
| [PRD](docs/02_PRD_Conecta_Empleo.md) | Requisitos del producto y alcance del MVP |
| [Historias de usuario](docs/03_Historias_Usuario_y_Criterios_Aceptacion.md) | Historias y criterios de aceptación |
| [Arquitectura del backend](docs/04_Arquitectura_Tecnica_Backend.md) | API, modelo de datos, seguridad y despliegue |
| [Sistema multiagente](docs/05_Arquitectura_Sistema_Multiagente.md) | Los agentes de IA, sus contratos y el failover |
| [Guía UX/UI](docs/Conecta_Empleo_Guia_UX_UI_Frontend_Prompt_Madre_v3.md) | Dirección visual y de interacción |
| [Pantallas](docs/pantallas/) | Capturas de las 45 pantallas, en desktop y mobile |
| [Tablero de construcción](docs/build/00_BUILD_STATE.md) | Bitácora de cómo se construyó, tarea por tarea |

<br>

<div align="center">
<sub>Hecho para el Hackatón IA UTEL × Hostinger · septiembre de 2026</sub>
</div>
