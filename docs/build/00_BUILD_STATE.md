# Tablero de construcción — Conecta Empleo

> **Este es el único archivo que debe leer quien retome la construcción** (humano o agente, con cualquier modelo).
> Lo actualiza cada subagente al cerrar su tarea. No releer `docs/0*.md` ni la guía UX: todo lo necesario está condensado en `docs/build/`.

- Orquestador original: Fable 5.1 · Constructores: Sonnet 5 (Opus 5 solo en F4 y F7)
- Última actualización: 2026-09-09 (creación del tablero)

## Estado actual

| Campo | Valor |
|---|---|
| Fase activa | **FRONTEND** (fase 1). Backend es fase 2, ver `05_BACKEND_TASKS.md` |
| Siguiente tarea | **F1 y F2 (en paralelo)** |
| Tarea en curso | ninguna |
| Último commit de construcción | 669e012 |
| Bloqueos | ninguno |

## Cola de tareas — frontend

Estados: `PENDING` · `IN_PROGRESS` · `DONE` · `BLOCKED`. Un subagente solo cambia la fila de su propia tarea.

| ID | Tarea | Modelo | Depende de | Spec | Estado | Commit |
|---|---|---|---|---|---|---|
| F0 | Scaffold Vite+React+TS+Tailwind v4, tokens, assets WebP, extracción del Orb, router esqueleto | sonnet | — | 01 §1-§6, §9 | DONE | e2e36fd |
| F1 | Design system: componentes `ui/`, `layout/`, `brand/`, primitives de motion | sonnet | F0 | 01 §5-§8 | DONE | 669e012 |
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
