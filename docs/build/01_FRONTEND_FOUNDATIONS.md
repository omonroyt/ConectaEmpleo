# 01 — Fundamentos del frontend (spec condensada)

Fuente de verdad condensada de `docs/Conecta_Empleo_Guia_UX_UI_Frontend_Prompt_Madre_v3.md`. Si algo no está aquí, aplica la opción más simple y coherente con estos tokens.

## 1. Stack y comandos

| Pieza | Elección |
|---|---|
| Runtime | Node 24 (mínimo 22.12) |
| App | Vite 6 + React 19 + TypeScript 5 (strict). SPA estática (`dist/`) para Hostinger |
| Estilos | Tailwind CSS v4 (`@tailwindcss/vite`, config CSS-first con `@theme`) + `src/styles/tokens.css` |
| Motion | `motion` (`import { motion, AnimatePresence } from "motion/react"`) |
| Iconos | `lucide-react` únicamente. Outline, stroke 1.5–2, 20–24 px |
| Router | `react-router` v7 en modo librería (`createBrowserRouter`, lazy routes) |
| Data | `@tanstack/react-query` v5 (polling de jobs cada 1.5 s) |
| Estado global | `zustand` solo para sesión (token, rol, usuario). El resto es estado de servidor o local |
| Fuentes | `@fontsource-variable/inter` (autohospedada, sin Google Fonts) |
| Orb | `three` ≥ 0.180 + `@types/three` (solo para `components/interview/AudioOrb`) |
| Utilidades | `clsx` + `tailwind-merge` (`cn()`), `zod` para validación de formularios |
| Calidad | `npm run typecheck` (`tsc --noEmit`), `npm run build`, `npm run dev`. Sin ESLint en esta fase |

Variables: `VITE_API_MODE=mock|http` (default `mock`), `VITE_API_URL=http://localhost:8000/api/v1`. Archivo `.env.example` obligatorio.

## 2. Estructura de carpetas (`frontend/`)

```
frontend/
  index.html
  public/assets/brand/backgrounds/{brand-main,interview,matching,results,profile,employer,onboarding,cards}.webp
  scripts/optimize-backgrounds.mjs         # PNG raíz → WebP (sharp), se ejecuta una vez
  src/
    main.tsx                               # StrictMode + providers + RouterProvider
    app/router.tsx                         # createBrowserRouter; compone las rutas de features
    app/providers.tsx                      # QueryClientProvider, Toaster
    styles/tokens.css                      # @theme con TODOS los tokens de §3
    styles/globals.css                     # @import "tailwindcss"; reset, fuente, scrollbars, reduced-motion
    lib/cn.ts · lib/motion.ts · lib/format.ts · lib/a11y.ts
    api/types.ts                           # contrato (02) — NO editar sin anotar en bitácora
    api/client.ts                          # interface ApiClient
    api/index.ts                           # selector mock|http
    api/http/*.ts · api/mock/*.ts · api/mock/seed/*.ts
    api/hooks/*.ts                         # useJobFamilies, useCandidateMe, useJob(id) con polling, etc.
    store/session.ts
    voice/VoiceGateway.ts · voice/BrowserVoiceGateway.ts · voice/useMicrophone.ts
    components/ui/*                        # design system (§5)
    components/layout/*                    # AppShell, CandidateShell, EmployerShell, AuthLayout, BottomNav, Sidebar, ImmersiveLayout
    components/brand/BrandBackground.tsx · components/brand/Logo.tsx
    components/interview/AudioOrb/*        # extraído de PRUEBA - ORB/src/orb (§9)
    features/auth/*                        # landing, login, registro (ambos roles)
    features/candidate/**                  # rutas + pantallas del candidato
    features/employer/**                   # rutas + pantallas de empresa
    features/shared/*                      # notificaciones, mensajes, planes (stubs)
```

Reglas de propiedad para trabajo en paralelo: F3/F4/F5 escriben solo en `features/candidate/<subcarpeta propia>`; F6/F7 solo en `features/employer/<subcarpeta propia>`. Las rutas se registran en `features/candidate/candidate.routes.tsx` y `features/employer/employer.routes.tsx` (cada tarea agrega sus entradas de forma aditiva). Componentes nuevos reutilizables van a `components/ui` solo si son genéricos; si son de una feature, quedan dentro de la feature.

## 3. Design tokens (copiar a `tokens.css` dentro de `@theme`)

```css
/* Colores */
--color-bg-dark: #070a12;  --color-bg-dark-soft: #0d1020;  --color-surface-dark: #111521;
--color-bg-light: #f7f8fb; --color-surface: #ffffff;       --color-surface-soft: #f1f3f8;
--color-text-primary: #0a0b10; --color-text-secondary: #62687a; --color-text-tertiary: #9197a8;
--color-text-on-dark: #f7f8fc; --color-text-on-dark-secondary: #b5bbd0;
--color-primary: #173cff; --color-primary-2: #4a45ff; --color-accent: #8e6dff; --color-accent-soft: #cbc5ff;
--color-success: #28b75a; --color-success-soft: #e9f8ee;
--color-warning: #f0a52b; --color-warning-soft: #fff6e6;
--color-danger: #e25151;  --color-danger-soft: #fff0f0;
--color-border: #d9dce5;  --color-border-dark: rgba(255,255,255,.12);
/* Gradientes (usar como utilidades bg-gradient-brand, etc.) */
--gradient-brand: linear-gradient(100deg,#173cff 0%,#3946ff 42%,#805dff 78%,#9b7bff 100%);
--gradient-cta: linear-gradient(100deg,#173cff,#4e46ff 55%,#9271ff);
--gradient-hero: radial-gradient(circle at 85% 22%,rgba(60,82,255,.75),transparent 34%),radial-gradient(circle at 100% 44%,rgba(101,67,255,.35),transparent 28%),linear-gradient(145deg,#070a12 0%,#10152a 70%,#0a0d18 100%);
/* Espaciado base 4px, preferir múltiplos de 8 (usar escala de Tailwind) */
/* Radios */
--radius-sm: 12px; --radius-md: 16px; --radius-lg: 22px; --radius-xl: 28px; --radius-2xl: 32px; --radius-pill: 999px;
/* Sombras (suaves, nunca negras duras) */
--shadow-sm: 0 4px 16px rgba(10,12,26,.05); --shadow-md: 0 10px 32px rgba(10,12,26,.08); --shadow-lg: 0 20px 64px rgba(10,12,26,.12);
--shadow-selected: 0 0 0 3px rgba(52,72,255,.07);
/* Motion */
--ease-out-smooth: cubic-bezier(.16,1,.3,1); --ease-standard: cubic-bezier(.2,.8,.2,1); --ease-in-out: cubic-bezier(.65,0,.35,1);
--duration-fast: 160ms; --duration-normal: 320ms; --duration-slow: 560ms;
/* Tipografía */
--font-sans: "Inter Variable", Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
```

Uso del color: azul/índigo = acción, progreso, IA, compatibilidad. Verde = éxito/verificado. Amarillo = atención/evidencia parcial. Rojo = solo errores reales, **nunca** para scores bajos. Gris = secundario/pendiente.

## 4. Tipografía, espaciado, superficies

- Escala mobile: display 44–54/600 lh 1.02 · H1 36–44/600 · H2 28–34/600 · H3 22–26/600 · card title 18–22/600 · body 16–18/400 · secondary 14–16 · caption 12–13/500 · eyebrow 11–13/600 uppercase `tracking-[.18em]`.
- Desktop: display 64–88 · H1 48–64 · H2 36–48 · H3 26–32. Máximo 3 pesos por pantalla. Bold extremo solo en números de score.
- Contenedor: `max-w-[1240px]` desktop, padding lateral 24 px mobile / 32 px desktop. Lectura y formularios 640–760 px.
- Separación vertical: 8–12 íntimo · 16 subgrupo · 24 grupo · 32–40 sección · 64–80 cambio de bloque desktop.
- Patrón dominante de pantalla: **hero/header oscuro** (con fondo de marca controlado) + **superficie clara** debajo con radio superior 28–36 px que se superpone al hero. Formularios, listas, tablas, comparadores y marketplace siempre sobre superficie clara.
- Bordes: claro `1px solid rgba(20,24,40,.12)`; oscuro `1px solid rgba(255,255,255,.14)`; seleccionado `1.5px solid rgba(59,75,255,.85)` + `--shadow-selected`.

## 5. Componentes del design system (`components/ui`)

Todos con `className` passthrough, `forwardRef` donde aplique, accesibles (label real, focus visible `ring-2 ring-primary-2/40`, targets ≥ 44 px). Sin librería de UI externa: se construye custom.

| Componente | Spec |
|---|---|
| `Button` | variants `primary` (gradiente CTA, pill, alto 56, texto blanco 500, flecha opcional que se desplaza 4–6 px al hover, sube 1 px, active scale .985, disabled opacidad sin glow) · `secondary` (blanco, borde, texto azul/negro, mismo alto) · `ghost` · sizes `md`/`lg`; prop `loading` |
| `Input`, `Textarea`, `Select`, `FormField` | alto 56, radio 16–18, fondo `#FAFBFD`, borde `--color-border`, label visible, icono opcional izquierda, focus `border-primary-2` + `shadow 0 0 0 4px rgba(74,69,255,.1)`, error con icono + texto (no solo color), hint |
| `FileUploader` | drag & drop desktop, selector mobile, PDF/DOCX/imagen ≤ 10 MB, progreso, error accionable |
| `Card` | `variant="light"` (blanco, borde, radio 22, padding 16–24) · `variant="dark"` (bg-dark/azul, texto blanco, fondo abstracto parcial opcional vía `BrandBackground`) |
| `Chip` / `FilterPills` | alto 32–36, pill, gris claro; seleccionado azul texto blanco; máximo 5–6 visibles + `+N` |
| `EvidenceBadge` | `level: "declared"\|"evaluated"\|"verified"\|"partial"\|"pending"` → gris / azul / azul intenso + check / amarillo / gris claro + reloj. Tooltip desktop, bottom sheet mobile, texto explicativo obligatorio |
| `ScoreBadge` | porcentaje + etiqueta textual ("alta compatibilidad") — nunca solo el número |
| `ProgressBar` | track gris, fill gradiente, alto 8, anima 0→valor con delay incremental |
| `ProgressRing` | SVG stroke-dashoffset 0→valor 900–1400 ms + contador sincronizado; `aria-valuenow` + texto |
| `ProgressSteps` | 3–8 segmentos: completado azul brillante, actual azul, pendiente opacidad baja; etiqueta "Paso 1 de 3" |
| `MetricCard`, `AIInsightCard` | AIInsightCard: eyebrow "Basado en la evidencia disponible", lista de "Por qué" y "Falta evidencia", CTA "Ver evidencia" |
| `SkillChip`, `JobCard`, `CandidateAnonymousCard`, `CandidateUnlockedCard` | ver 03/04; `CandidateAnonymousCard` **nunca** recibe props de nombre/foto (tipo TS lo impide) |
| `EmptyState` | icono + título + explicación + CTA |
| `SkeletonCard`, `Skeleton` | shimmer 1.4–1.8 s, más `ProcessingStatus` con mensajes contextuales rotativos |
| `Toast` (+ `useToast`) | slide + fade, 3–5 s, no bloquea, `aria-live="polite"` |
| `Modal`, `BottomSheet`, `Drawer` | mobile bottom sheet radio superior 24–28; desktop modal 480–680 px, backdrop blur ligero; focus trap, Esc cierra |
| `Tooltip`, `Avatar` (`anonymous` = monograma neutro, nunca foto), `Badge`, `Divider`, `Tabs`, `Switch`, `Slider` (pesos), `Stepper` |

## 6. Layouts (`components/layout`)

- `AuthLayout`: hero oscuro superior 40–48 % con `BrandBackground`, branding y copy; panel blanco inferior superpuesto con radio superior 32 px. Desktop: dos columnas (hero izquierda 45 %, formulario derecha centrado).
- `CandidateShell`: mobile bottom nav (Inicio · Explorar · Entrevista · Perfil) con punto azul bajo el activo; desktop sidebar 260 px (logo, items icono+etiqueta, CTA "Continuar entrevista", perfil abajo).
- `EmployerShell`: igual con (Inicio · Talento · Vacantes · Empresa), CTA "Nueva vacante".
- `ImmersiveLayout`: sin nav, fondo oscuro completo, solo logo + cerrar. Para entrevista, onboarding y creación de vacante. Transición "focus mode" al entrar (nav desaparece, fondo oscuro ocupa la vista).
- Header en hero: transparente, iconos blancos. Page transitions 250–450 ms sin flash blanco: fondo de `body` oscuro por defecto y contenedores claros por página.

## 7. Motion (`lib/motion.ts`)

Exportar variantes reutilizables: `fadeUp` (opacity 0→1, y 24→0, blur 4→0, .55 s ease-out-smooth), `fadeIn`, `slideInRight`/`slideInLeft` (pasos, 24–40 px, .4 s), `scaleIn`, `staggerContainer(stagger = .06, delayChildren = .1)`, `cardEntrance` (scale .985, y 18), hooks `useCountUp(value, duration)`, `useInViewOnce()`. Todas las variantes leen `useReducedMotion()` y degradan a opacidad rápida.

Reglas: entrada de página en secuencia (fondo → header → eyebrow → H1 → subtítulo → panel → cards stagger 50–90 ms → CTA). Reveal al scroll una sola vez. Microinteracciones 120–220 ms. Gráficos 900–1400 ms. Fondos ambientales 10–20 s con máximo 1–2 propiedades (scale 1→1.015 u opacidad). Matching: cards → count-up → ring → explicación al final. Desbloqueo: blur → nítido. Nunca: flashes, partículas, loops rápidos, loaders falsos largos.

## 8. Fondos de marca (`components/brand/BrandBackground`)

Props: `asset: "brand-main"|"interview"|"matching"|"results"|"profile"|"employer"|"onboarding"|"cards"`, `presence: "hero"|"support"|"accent"`, `overlay: "left"|"bottom"|"full"|"none"`, `position` (object-position), `ambient?: boolean`. Renderiza `<img alt="" loading="lazy" decoding="async">` (eager solo en login/landing) con `object-fit: cover`, opacidad por presencia (hero .55–.85, support .30–.55, accent .20–.40 + `saturate(.8)`), overlay `linear-gradient(90deg, rgba(5,8,18,.88) 0%, rgba(5,8,18,.68) 45%, rgba(5,8,18,.28) 100%)` orientado hacia el texto, `aspect-ratio` fijo para evitar CLS.

Mapa de uso (regla 80 % UI limpia / 20 % marca; ante la duda, sin fondo):

| Pantalla | Asset | Presencia |
|---|---|---|
| Landing / login candidato | brand-main | hero |
| Login / onboarding empresa | employer | hero / support |
| Onboarding candidato | onboarding | support (tercio superior) |
| Preparación y entrevista | interview | support, detrás del Orb con opacidad .2–.4 y `saturate(.7)`; el Orb siempre es protagonista |
| Resultado de entrevista | results | hero |
| Perfil verificado | profile | support en hero |
| Marketplace candidato | brand-main o ninguno | accent |
| Nueva vacante | employer | support en hero |
| Talento compatible / finalistas | matching | accent solo en header, nunca detrás de la lista |
| Detalle anónimo, comparar, perfil ideal | ninguno (superficie clara) | — |
| Card destacada / preview de vacante | cards | accent, máximo 1–2 por pantalla |

## 9. Audio Orb (extracción de `PRUEBA - ORB/src/orb`)

Copiar **solo** estos archivos a `src/components/interview/AudioOrb/`: `AudioOrb.tsx`, `AudioOrb.css`, `AudioAnalyzer.ts`, `OrbRenderer.ts`, `orbShaders.ts`, `orbStates.ts`, `orbConfig.ts`, `index.ts` (y `AudioAnalyzer.test.ts` solo si se agrega vitest; si no, omitir). No copiar `src/demo`, `src/examples`, `main.tsx`, estilos globales ni audio de muestra. Dependencia: `three` + `@types/three`. API existente que se conserva tal cual:

```ts
type OrbState = "idle" | "listening" | "thinking" | "speaking";
<AudioOrb state analyser? intensity?=0.8 quality?="medium" size?="100%" onLevels? onError? />
connectAudio(source: HTMLMediaElement | MediaStream | AnalyserNode, { context?, monitor? }) → { analyser, resume(), dispose() }
```

Reglas: no cambiar `key` para transicionar estados; una sola instancia montada; `quality="medium"` por defecto, `low` en `navigator.hardwareConcurrency <= 4` o mobile; tamaño mobile 260–320 px, tablet 300–380, desktop 360–460; fallback CSS ya incluido; reduced-motion ya soportado. Siempre acompañar con label textual del estado (`Escuchando…`, `Analizando respuesta…`, `Pregunta de la entrevista`).

## 10. Microcopy, accesibilidad, prohibiciones

- Tono: claro, humano, español de México. Usar "Cuéntanos…", "Tu siguiente paso…", "Basado en la evidencia disponible…", "La IA apoya tu decisión; no la reemplaza." Prohibido: "La IA determinó que…", "apto/no apto", "reprobado", "candidato deficiente", "personalidad baja".
- Mensajes de privacidad fijos: CV → "Usaremos tu archivo para estructurar tu perfil y preparar la entrevista." · Entrevista → "Tu evaluación se basa en tus respuestas y la evidencia disponible." · Empresa → "La identidad del candidato se mantiene oculta en el primer filtro."
- Todo score con texto explicativo: `Compatibilidad 92 % — alta compatibilidad con los criterios definidos para esta vacante.`
- WCAG AA: contraste, focus visible, teclado, labels, `aria-live` en cambios de estado, targets 44 px, texto ≥ 12 px, gráficos con resumen textual. `prefers-reduced-motion` en todo.
- Errores accionables: "No pudimos procesar este archivo. Prueba con un PDF o DOCX de hasta 10 MB." Nunca códigos crudos.
- No construir: dashboards densos, gauges, pie charts, glassmorphism excesivo, robots/circuitos, 5 estilos de botón, iconos de varias familias, sombras duras, colores semáforo sobre personas.
