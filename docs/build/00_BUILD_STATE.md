# Tablero de construcción — Conecta Empleo

> **Este es el único archivo que debe leer quien retome la construcción** (humano o agente, con cualquier modelo).
> Lo actualiza cada subagente al cerrar su tarea. No releer `docs/0*.md` ni la guía UX: todo lo necesario está condensado en `docs/build/`.

- Orquestador original: Fable 5.1 · Constructores: Sonnet 5 (Opus 5 solo en F4 y F7)
- Última actualización: 2026-09-09 (creación del tablero)

## Estado actual

| Campo | Valor |
|---|---|
| Fase activa | **FRONTEND** (fase 1). Backend es fase 2, ver `05_BACKEND_TASKS.md` |
| Siguiente tarea | **F0** |
| Tarea en curso | ninguna |
| Último commit de construcción | (ninguno todavía) |
| Bloqueos | ninguno |

## Cola de tareas — frontend

Estados: `PENDING` · `IN_PROGRESS` · `DONE` · `BLOCKED`. Un subagente solo cambia la fila de su propia tarea.

| ID | Tarea | Modelo | Depende de | Spec | Estado | Commit |
|---|---|---|---|---|---|---|
| F0 | Scaffold Vite+React+TS+Tailwind v4, tokens, assets WebP, extracción del Orb, router esqueleto | sonnet | — | 01 §1-§6, §9 | PENDING | |
| F1 | Design system: componentes `ui/`, `layout/`, `brand/`, primitives de motion | sonnet | F0 | 01 §5-§8 | PENDING | |
| F2 | Capa API: tipos del contrato, `ApiClient`, mock con datos semilla, hooks TanStack Query, store de sesión, `VoiceGateway` browser | sonnet | F0 | 02 completo | PENDING | |
| F3 | Candidato A: landing, auth (login/registro), onboarding, home, carga de CV, CV conversacional, revisión de claims | sonnet | F1, F2 | 03 §C0-§C7 | PENDING | |
| F4 | Candidato B: preparación de entrevista, entrevista en curso con Orb, resultado | **opus** | F1, F2 | 03 §C8-§C10 | PENDING | |
| F5 | Candidato C: Perfil de Talento Verificado, perfil editable, oportunidades, detalle, postulación | sonnet | F1, F2 | 03 §C11-§C14 | PENDING | |
| F6 | Empresa A: auth, onboarding, home, perfil empresa, nueva vacante, perfil ideal (requisitos + pesos), lista y detalle de vacante | sonnet | F1, F2 | 04 §E0-§E7 | PENDING | |
| F7 | Empresa B: talento compatible (ranking anónimo), detalle anónimo con explicación, comparar, finalistas, desbloqueo, perfil desbloqueado | **opus** | F1, F2 | 04 §E8-§E12 | PENDING | |
| F8 | Stubs P2 (notificaciones, mensajes, planes) + polish: responsive, a11y, reduced-motion, loading/empty/error, consistencia | sonnet | F3-F7 | 03 §C15, 04 §E13, 01 §10 | PENDING | |

Paralelismo permitido: F1 ∥ F2 · luego F3 ∥ F4 ∥ F5 ∥ F6 ∥ F7 (carpetas disjuntas, ver protocolo). F8 al final.

## Cola de tareas — backend (fase 2)

Ver `05_BACKEND_TASKS.md`. No se arranca hasta que F0–F7 estén `DONE`.

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

### 2026-09-09 — Orquestador (Fable)
- Creado el tablero y las specs `01`–`05`. Decisiones del usuario: constructores Sonnet 5 con Opus 5 en F4 y F7; PNG de raíz se mueven a `frontend/public/assets/brand/backgrounds/` en WebP; `PRUEBA - ORB/` queda fuera de git y se borra solo con confirmación del usuario; alcance FE = P0 + P1 completos, P2 como stubs; marketplace de candidato (oportunidades + postulación) se construye con mock y se agrega al contrato API como Should Have.
