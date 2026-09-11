# Conecta Empleo — Contexto para Claude

Marketplace de talento verificado por IA (Hackatón IA UTEL 2026). Monorepo: `frontend/` (React SPA) y `backend/` (FastAPI, fase 2).

## Si vas a construir o retomar la construcción: empieza aquí

1. Lee **solo** [docs/build/00_BUILD_STATE.md](docs/build/00_BUILD_STATE.md). Ahí está la fase activa, la siguiente tarea, el protocolo de subagentes y la bitácora con el punto exacto donde se quedó el último agente.
2. Lee los archivos de spec que indique la fila de tu tarea (`01`–`05` en `docs/build/`). Son la versión condensada y normativa; **no releas `docs/0*.md` ni la guía UX** salvo que una spec te lo pida.
3. Al terminar: build verde, commit con tus rutas, fila a `DONE`, entrada en la bitácora. Si te quedas a medias: commit `wip(...)`, y escribe en la bitácora exactamente dónde continuar.

Modelo de orquestación: un orquestador (Fable/Opus) redacta tareas cerradas; constructores (Sonnet, Opus en tareas críticas) las ejecutan sin releer la documentación completa.

## Documentación fuente (solo para el orquestador o cuando una spec lo pida)

- `docs/01_Product_Brief_Conecta_Empleo.md` · `docs/02_PRD_Conecta_Empleo.md` · `docs/03_Historias_Usuario_y_Criterios_Aceptacion.md`
- `docs/04_Arquitectura_Tecnica_Backend.md` (normativo para `backend/`)
- `docs/05_Arquitectura_Sistema_Multiagente.md` (normativo para `backend/app/ai`)
- `docs/Conecta_Empleo_Guia_UX_UI_Frontend_Prompt_Madre_v3.md` (normativo para `frontend/`, condensado en `docs/build/01`)

## Reglas no negociables (aplican a todo el repo)

- Anonimización estructural: nombre, foto, edad y género nunca viajan en `AnonymousCandidateCard` ni a la IA. Se garantiza por tipos y DTOs, no por condicionales de UI.
- Ningún score sin explicación textual. Ningún texto que presente a la IA como juez ("apto", "reprobado", "la IA determinó").
- El porcentaje de match lo calcula código determinista; la IA solo redacta sobre el desglose.
- "Verificada" solo por evidencia documental aceptada; nunca por autodeclaración ni por un agente.
- Secretos y modelos solo por variables de entorno. Nada hardcodeado.
- Frontend: `prefers-reduced-motion` respetado, WCAG AA, estados loading/empty/error en toda pantalla.

## Activos

- Imágenes: fondos de marca en `frontend/public/assets/brand/backgrounds/*.webp` y foto del usuario demo en `frontend/public/assets/demo/`. Los WebP son los archivos fuente; los PNG originales ya no existen.
- Audio Orb: `frontend/src/components/interview/AudioOrb/`. Es la única copia; el repo de prueba del que se extrajo ya no forma parte del proyecto.
- Capturas actuales de las 45 pantallas (desktop y mobile): `docs/pantallas/`.
- El vídeo demo (`video-demo/`, lo genera `frontend/scripts/record-demo.mjs`) no se versiona.

## Skills disponibles

`.claude/skills/` trae skills de diseño/frontend (design-dna, frontend-design, scroll-craft, taste-skill y otras). Úsalas solo si una tarea de diseño lo justifica; las specs de `docs/build/01` ya fijan la dirección visual.
