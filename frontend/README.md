# Conecta Empleo — Frontend

SPA con Vite 6 + React 19 + TypeScript (strict) + Tailwind CSS v4. Ver `docs/build/01_FRONTEND_FOUNDATIONS.md` para la spec completa.

## Comandos

```bash
npm install
npm run dev             # servidor de desarrollo (http://localhost:5173)
npm run typecheck       # tsc --noEmit
npm run build           # typecheck + build de producción (dist/)
npm run preview         # sirve dist/ localmente
npm run smoke:mock     # 22 pasos, golden path contra el mock
npm run smoke:interview # 13 pasos, entrevista + evaluación contra el mock
npm run e2e:smoke       # Playwright/Chromium, ambos journeys — ver abajo
```

Variables de entorno: copiar `.env.example` a `.env` (`VITE_API_MODE=mock|http`, `VITE_API_URL`).
Con `VITE_API_MODE=http` el frontend habla con el backend real (`../backend`, ver su README) — debe
estar corriendo en `VITE_API_URL` (default `http://localhost:8000/api/v1`) con las semillas de
`python -m app.seeds.run` + `python -m app.seeds.demo` ya aplicadas.

### `npm run e2e:smoke` — mock vs. backend real

`E2E_TARGET=mock` (default) o `E2E_TARGET=http` eligen contra qué API corre el recorrido de
Playwright, sin tocar el archivo `.env` (la variable de entorno tiene prioridad sobre `.env` al
arrancar `vite`):

```bash
npm run e2e:smoke                    # contra el mock en memoria (igual que antes de B13)
E2E_TARGET=http npm run e2e:smoke    # contra el backend real — debe estar corriendo primero
```

En `http` el journey de candidato registra una cuenta nueva en cada corrida (no reutiliza
`candidato@demo.mx`, que en Postgres se queda `EVALUATED` después de la primera corrida y no hay
`resetMock()` para un backend real) y el bucle de respuestas de la entrevista es dinámico (el
presupuesto real es 14 preguntas, o 6 con `INTERVIEW_DEMO_MODE=true` en el backend, contra las 6
fijas del mock). `maria@demo.mx` y `empresa@demo.mx` sí se reutilizan.

## Estructura

```
src/
  app/          # router, providers, main.tsx, placeholders
  styles/       # tokens.css (@theme), globals.css
  lib/          # cn, format, a11y
  components/
    brand/      # BrandBackground, Logo
    interview/AudioOrb/  # extraído de PRUEBA - ORB/src/orb (three.js)
    ui/         # design system (F1)
    layout/     # shells de layout (F1)
  features/
    candidate/  # rutas + pantallas candidato
    employer/   # rutas + pantallas empresa
    auth/       # landing, login, registro
    shared/     # stubs P2
```

## Imágenes

Los fondos de marca están en `public/assets/brand/backgrounds/` (8 assets, cada uno como `<asset>.webp` a 1600px y `<asset>-mobile.webp` a 900px) y la foto del usuario demo de la landing en `public/assets/demo/`. Esos WebP son los archivos fuente: los PNG de los que salieron ya no están en el repo, así que para cambiar una imagen se reemplaza su WebP.
