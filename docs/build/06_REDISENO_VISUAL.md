# R — Rediseño visual (dirección R1: lienzo oscuro + paneles mixtos)

> Spec **normativa** para las tareas `R1`–`R7`. Es lo único que necesitas leer
> además de tu fila de tareas. No releas `docs/0*.md` ni la guía UX.

Origen: revisión pantalla por pantalla del usuario sobre las 45 capturas de
`pantallas-a-modificar/`. El veredicto se resume en una frase: **la
información y la distribución están bien; lo que falla es cómo se ve.**

## 0. Qué NO se toca

- **Funcionalidad, rutas, contratos de API, hooks, stores, validaciones.**
  Esto es un rediseño visual. Si necesitas cambiar lógica para lograr un
  efecto, no lo hagas: cambia el efecto.
- **La información que muestra cada pantalla y su distribución general.**
  Al usuario le gusta *qué* ve y *dónde* lo ve. Salvo las eliminaciones
  explícitas de tu fila, no quites ni agregues datos, secciones ni campos.
- **Las reglas no negociables del producto** (ver `CLAUDE.md`): anonimización
  estructural, ningún score sin explicación, la IA nunca como juez, el
  porcentaje de match lo calcula código determinista, "verificada" solo por
  evidencia documental.

## 1. Dirección visual

El área logueada deja de ser clara. Todo se apoya sobre un **lienzo oscuro de
marca con glow azul**, igual que la landing, la entrevista y el resultado —
las pantallas que ya funcionaban visualmente. Encima conviven tres familias
de panel; alternarlas es lo que evita el "todo blanco se siente pobre".

## 2. Superficies (`Card variant=...`)

| Variante | Cuándo | Notas |
|---|---|---|
| `glass` | **Default.** Métricas, resúmenes, listados, navegación, tarjetas de candidato/vacante | Vidrio oscuro translúcido con filo hairline. |
| `light` | Contenido denso y de lectura larga: revisión de CV, pestañas de perfil, tablas | Panel blanco. Nunca a sangre: siempre redondeado con aire alrededor. |
| `soft` | Alternar bloques **dentro** de un panel `light` | Tintado frío; rompe la monotonía blanca. |
| `dark` | Anidar dentro de `glass` cuando hace falta un escalón sólido | Sin translucidez. |

**Pasa siempre `variant` explícito.** El default cambió a `glass`; una `Card`
sin variante dentro de un panel claro se verá mal.

Otras piezas de superficie:

- `.app-canvas` — el lienzo (ya aplicado en los shells). No lo repitas.
- `<LightSurface>` — panel claro flotante sobre un hero oscuro.
- `.glass`, `.glass-hover` — utilidades para nodos que no son `Card`.
- `Card spotlight` — borde que se ilumina con el cursor. Úsalo en tarjetas
  clicables importantes, no en todas.

## 3. Tono de superficie (importante)

`Card` declara el tono de su subárbol vía contexto (`Surface`). Los controles
de formulario (`Input`, `Textarea`, `Select`, `FormField`, `Checkbox`,
`Radio`, `Switch`, `Stepper`) **eligen su paleta solos**.

- No pintes a mano un input para oscuro. Si se ve mal, es que falta un
  `<Surface tone="...">` alrededor del bloque, o que la `Card` tiene mal la
  variante.
- Para un bloque claro/oscuro que no es `Card`, envuélvelo:
  `<Surface tone="light">…</Surface>`.
- `ProgressRing`, `ProgressBar`, `ProgressSteps`, `Slider`,
  `SegmentedControl`, `RadioCards`, `Eyebrow` reciben `tone` por prop
  (`"dark"` por defecto salvo `SegmentedControl`, que es `"light"`).

### Colores de texto

| Sobre lienzo/vidrio | Sobre panel claro |
|---|---|
| `text-text-on-dark` (principal) | `text-text-primary` |
| `text-text-on-dark-secondary` | `text-text-secondary` |
| `text-text-on-dark-tertiary` | `text-text-tertiary` |
| `text-primary-on-dark` (enlaces/acentos) | `text-primary` |
| `text-success-on-dark` · `text-warning-on-dark` · `text-danger-on-dark` | `text-success` · `text-warning` · `text-danger` |

**Nunca** `text-primary`, `text-danger`, `text-success` puros sobre el lienzo
oscuro: no cumplen contraste. Ese es exactamente el bug de "textos azul
oscuro que se pierden" que reportó el usuario.

## 4. Animación de datos — obligatoria en TODA la app

Petición explícita y repetida del usuario:

> "quiero ver cómo este gráfico empieza a cargar de cero a cien en una
> animación de aproximadamente unos dos segundos […] el número va subiendo y
> también se va cargando la barra. Eso lo quiero para todas las páginas."

- **Todo porcentaje, score, anillo y barra** usa `ProgressRing` o
  `ProgressBar`. Ambos ya animan de 0 al valor en ~1.8 s **al entrar en
  pantalla** (no al montar), con la cifra contando a la par.
- ¿Un número suelto que no es barra ni anillo (contadores, "48 candidatos")?
  Usa `useAnimatedNumber(value)` de `@/lib/motion` y cuelga su `ref`.
- Nada de porcentajes pintados a mano con `<div style={{width}}>`. Si
  encuentras uno, cámbialo por `ProgressBar`.
- Escalona listas de barras con `delay` (0 ms, 90 ms, 180 ms…).

### Entrada escalonada de tarjetas

> "me gustaría que estas animaciones vayan cayendo un card tras el otro […]
> ahí mismo en su contenedor."

Toda grilla o lista de tarjetas se envuelve así:

```tsx
<RevealGroup className="grid gap-4 md:grid-cols-3">
  {items.map((item) => (
    <Reveal key={item.id}>
      <Card variant="glass">…</Card>
    </Reveal>
  ))}
</RevealGroup>
```

`RevealGroup` dispara al entrar en pantalla, una sola vez, y respeta
`prefers-reduced-motion` (con reduced-motion no anima nada y renderiza el
nodo plano).

## 5. Reglas transversales

1. **Cero rastros de demo.** Ningún texto que diga "demo", "solo desarrollo",
   "prueba", "mock", ni credenciales de ejemplo, en ninguna pantalla. Si
   encuentras uno en tu área, elimínalo y reaprovecha el espacio.
2. **Responsive real.** Ningún desbordamiento horizontal a 390 px. Nada de
   `min-width` mayor que la pantalla. Tablas, comparadores y diagramas van
   cada uno en su propio contenedor con `overflow-x-auto`; el `body` nunca
   scrollea en horizontal.
3. **Jerarquía tipográfica.** Antetítulo (`<Eyebrow>`) + display + apoyo.
   Displays con `tracking-[-0.03em]`, `text-balance` en títulos y
   `text-pretty` en párrafos. Ancho de lectura máximo ~65 caracteres.
   Cifras siempre con `tabular-nums`.
4. **Menos ruido de contenedor.** No anides card dentro de card dentro de
   card. Si un bloque solo agrupa, usa espaciado, no un borde más.
5. **Estados.** Cada pantalla conserva sus estados loading / vacío / error, y
   los skeletons sobre oscuro usan `skeleton-shimmer--dark`.
6. **Accesibilidad.** WCAG AA de contraste, foco visible, objetivos táctiles
   ≥ 24 px, `aria-label` en botones de solo ícono. Nada de animación que no
   se degrade con `prefers-reduced-motion`.
7. **Redacción.** Frases en tono normal, sin signos de admiración, sin
   "¡Listo!", sin "Oops", sin mayúsculas de título en cada palabra. No
   presentes a la IA como juez.
8. **Sin dependencias nuevas.** Todo se hace con lo que ya está en
   `package.json` (`motion`, `lucide-react`, Tailwind v4, `three` para el Orb).

## 6. Definición de terminado

Antes de cerrar tu tarea, desde `frontend/`:

```bash
npm run typecheck     # obligatorio, en verde
npm run build         # obligatorio, en verde
```

Y una revisión visual real de **cada** pantalla de tu fila, a 1280×800 y a
390×844, con Playwright (ya está instalado; mira `scripts/e2e-smoke.mjs` para
el patrón de arranque de `vite` + navegación). No cierres la tarea sin haber
mirado tus capturas: el objetivo de esta tarea es cómo se ve.

Al terminar: commit con tus rutas y una entrada en la bitácora de
`docs/build/00_BUILD_STATE.md`.
