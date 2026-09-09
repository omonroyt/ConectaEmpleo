# Conecta Empleo — Frontend

SPA con Vite 6 + React 19 + TypeScript (strict) + Tailwind CSS v4. Ver `docs/build/01_FRONTEND_FOUNDATIONS.md` para la spec completa.

## Comandos

```bash
npm install
npm run dev             # servidor de desarrollo (http://localhost:5173)
npm run typecheck       # tsc --noEmit
npm run build           # typecheck + build de producción (dist/)
npm run preview         # sirve dist/ localmente
npm run optimize:backgrounds  # regenera los WebP de fondo de marca
```

Variables de entorno: copiar `.env.example` a `.env` (`VITE_API_MODE=mock|http`, `VITE_API_URL`).

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

## Regenerar los fondos de marca

Los PNG originales viven en la raíz del repo (`../fondo_*.png`, ignorados por git) y no deben moverse ni borrarse: son el origen del que se regeneran los WebP.

```bash
npm run optimize:backgrounds
```

Esto lee los 8 PNG y escribe 16 archivos en `public/assets/brand/backgrounds/` (`<asset>.webp` a 1600px y `<asset>-mobile.webp` a 900px, calidad 78).
