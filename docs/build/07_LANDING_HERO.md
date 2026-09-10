# 07 — Hero de la landing (spec visual)

Rediseño de `/` a partir de una referencia visual aportada por el cliente. **La referencia manda**: no es un brief abierto para proponer dirección propia, es una maqueta a replicar con fidelidad, adaptada al producto real y a los tokens que ya existen en `src/styles/tokens.css`.

Decisiones confirmadas por el cliente: los mockups del lado derecho van **en código, no como imagen**; se añade un botón "Busco empleo" en la barra superior; el logo es un icono provisional; el retrato real se usa en el panel de perfil desbloqueado y el resto de candidatos van con monograma anónimo.

## 1. Composición general

Split horizontal en desktop, una sola columna en móvil.

```
┌──────────────────────────────────────────────────────────────────────┐
│ [◧ logo] Inicio  Cómo funciona  Talento  Empresas   [Busco empleo]   │
│                                        [Iniciar sesión] [Publicar ▸] │
├───────────────────────────┬──────────────────────────────────────────┤
│                           │        ┌─────────────────────────┐       │
│ PARA EMPRESAS QUE...      │  ┌─────┤  PERFIL DESBLOQUEADO    │       │
│                           │  │ RAN-│  [foto] Nombre    (92%) │       │
│ Encuentra talento         │  │ KING│  tabs · acerca · chips  │       │
│ con evidencia real        │  │     │        ┌────────────────┴──┐    │
│                           │  │ #024│        │ COMPARAR TALENTO  │    │
│ Evalúa, verifica y...     │  │ #087│        │ 3 col · barras    │    │
│                           │  └─────┘        └───────────────────┘    │
│ [Publicar vacante ▸] [Ver │                                          │
│  talento verificado]      │                                          │
│                           │                                          │
│ ◈ Matching  ◈ Perfiles    │                                          │
│   inteligente verificados │                                          │
└───────────────────────────┴──────────────────────────────────────────┘
```

Proporción desktop ≥1280 px: columna izquierda ~42 %, derecha ~58 %. Contenedor `max-w-[1440px]`, padding lateral 40 px. El hero ocupa alto de viewport (`min-h-[100svh]`) sin forzar scroll interno.

## 2. Fondo

Oscuro casi negro con haces de luz azul entrando desde la derecha y un suelo reflectante sutil abajo. Se construye **en CSS**, sin imagen nueva:

- Base `--color-bg-dark` (#070a12).
- Dos haces diagonales: gradientes lineales a ~18° desde la esquina superior derecha, `rgba(60,82,255,.45)` y `rgba(101,67,255,.28)`, muy difuminados, con `mix-blend-mode: screen`.
- Halo radial detrás de los paneles: `radial-gradient(ellipse at 72% 38%, rgba(74,69,255,.35), transparent 60%)`.
- Suelo: banda inferior de ~22 % con `linear-gradient(to top, rgba(120,140,255,.10), transparent)` y un reflejo tenue bajo los paneles.
- Grano casi imperceptible (`opacity: .025`) para evitar el banding de los degradados.

Se puede usar `fondo_marca.webp` a muy baja opacidad (≤ .18) como textura de apoyo, **solo** si mejora; ante la duda, sin imagen. El fondo nunca compite con los paneles.

## 3. Barra superior

Transparente sobre el hero, `sticky` con `backdrop-blur` al hacer scroll.

- **Logo provisional**: marca tipográfica existente `Logo` acompañada de un icono nuevo — dos formas geométricas en gradiente de marca que sugieren dos piezas que encajan (empresa y candidato). SVG inline en `Logo`, sin imagen. Debe verse deliberado, no un placeholder gris.
- **Navegación central** (desktop ≥1024): Inicio · Cómo funciona · Talento · Empresas. El activo lleva subrayado corto en gradiente. Son anclas a secciones de la propia landing salvo Talento y Empresas, que llevan a `/register?role=...`.
- **Derecha**: `Busco empleo` (secundario, texto claro sobre fondo translúcido, → `/register?role=CANDIDATE`), `Iniciar sesión` (outline pill, → `/login`), `Publicar vacante` (primario gradiente con flecha, → `/register?role=COMPANY`).
- Móvil: logo + botón hamburguesa que abre un panel con las mismas acciones.

## 4. Columna izquierda

| Elemento | Tratamiento |
|---|---|
| Eyebrow | `PARA EMPRESAS QUE CONSTRUYEN EL MAÑANA`, 11–12 px, `tracking-[.22em]`, color `--color-text-on-dark-secondary` al 70 % |
| Titular | "Encuentra talento con evidencia real" · 56–72 px desktop, 38–44 px móvil, peso 600, `leading-[1.02]`, blanco. **"real" en gradiente de marca** con `background-clip: text` |
| Párrafo | "Evalúa, verifica y compara candidatos con inteligencia artificial. Toma mejores decisiones y construye equipos de alto impacto." · 17–18 px, `max-w-[46ch]`, secundario sobre oscuro |
| CTAs | `Publicar vacante` (primario, pill, flecha que se desplaza al hover) y `Ver talento verificado` (outline claro, pill, mismo alto) |
| Features | Tres en fila con icono en cuadrado redondeado 44 px de fondo `rgba(74,69,255,.14)` y borde sutil: **Matching inteligente** ("Conecta con el mejor talento para tu equipo."), **Perfiles verificados** ("Talento con habilidades y experiencia validadas."), **Evaluación con IA** ("Decisiones basadas en datos, no en suposiciones.") |
| Pie | Filete corto + `PERSONAS · IDEAS · RESULTADOS REALES` en tres líneas, 10–11 px, tracking amplio, opacidad baja |

Iconos de Lucide, coherentes con el resto del sistema: `Sparkles`, `ShieldCheck`, `BarChart3`.

## 5. Los tres paneles (en código)

Todos son `<div>` con fondo `--color-surface`, radio 18–22 px, sombra profunda (`0 40px 80px -20px rgba(4,8,30,.65)`) y borde `1px solid rgba(255,255,255,.08)`. Escalonados con `translate` y `z-index`, ligeramente rotados (≤1.5°) para dar profundidad. **Contenido real del producto**, no lorem ni roles inventados de otra industria.

### 5.1 Panel trasero izquierdo — "Talento compatible"
Buscador simulado (no funcional), pills `Todos · Verificados · Disponibles`, y **cuatro filas de candidatos en estado anónimo**:

```
(MT)  CANDIDATO #024   Encargado de almacén    92%
      Inventarios · Seguridad · WMS
(DR)  CANDIDATO #087   Encargado de almacén    87%
(VD)  CANDIDATO #112   Auxiliar administrativo 81%
(SM)  CANDIDATO #140   Operador de maquinaria  78%
```

Monograma de dos letras sobre fondo tenue en distintos tonos de la paleta, anillo de porcentaje a la derecha. Este panel cuenta el primer filtro sin sesgos, que es el diferenciador del producto.

### 5.2 Panel central (protagonista) — perfil desbloqueado
Es el único que muestra identidad, porque representa el estado **posterior al desbloqueo**. Ahí va el retrato real (`/assets/demo/usuario-demo.webp`, 440 px, con su variante de 160 px).

- Foto con radio 14 px, insignia de verificado sobre ella.
- Nombre **María José Hernández López**, rol *Encargada de almacén*, ubicación *León, Guanajuato*, disponibilidad *Disponible en 2 semanas*.
- Anillo `92% Compatible` arriba a la derecha.
- Chips: `Inventarios`, `Montacargas`, `WMS/ERP`, `+2`.
- Tabs: Resumen · Habilidades · Experiencia · Evidencias · Evaluaciones (Resumen activo, subrayado).
- "Acerca de" con dos líneas de texto real y creíble para el puesto.
- Tres métricas: `6 años de experiencia`, `14 competencias evaluadas`, `3 verificadas con documento`.
- "Habilidades destacadas" con chips: Control de inventarios, Recepción y despacho, Seguridad en montacargas, WMS, Coordinación de equipo.

**Coherencia obligatoria**: los datos deben corresponder a las familias reales del producto y al vocabulario de la plataforma. Nada de "Diseñadora de Producto" ni "Figma", que vienen de la referencia genérica.

### 5.3 Panel frontal derecho — "Comparar talento"
Tres columnas con monograma anónimo, anillo de porcentaje (92 / 87 / 81) y cuatro filas de criterios con barras: Habilidades técnicas, Experiencia, Comunicación, Evidencia verificada. Botón inferior `Ver comparación detallada` en gradiente.

## 6. Texto vertical derecho

`TALENTO QUE IMPULSA GRANDES HISTORIAS` en tres o cuatro líneas contra el borde derecho, 10 px, tracking amplio, opacidad ~.35. Se oculta por debajo de 1280 px.

## 7. Movimiento

**Una sola secuencia orquestada al cargar**, nada de animar cada tarjeta al hacer scroll:

1. Fondo visible de inmediato.
2. Barra superior entra con fade (250 ms).
3. Eyebrow → titular → párrafo → CTAs, escalonados 70 ms, con `fadeUp` de 24 px y blur mínimo.
4. Los tres paneles entran **juntos como composición** (no uno por uno): fade + `translateY(28px)` + `scale(.985)`, 600 ms, easing `--ease-out-smooth`, con 60 ms entre ellos para dar profundidad.
5. Los anillos de porcentaje se rellenan de 0 a su valor una vez, al terminar la entrada.

Ambiental: el halo azul respira muy lentamente (12–16 s, solo opacidad). Nada más se mueve solo. `prefers-reduced-motion` elimina desplazamientos y contadores, dejando solo opacidad.

## 8. Responsive

| Ancho | Comportamiento |
|---|---|
| ≥1280 | Split completo, tres paneles escalonados, texto vertical visible |
| 1024–1279 | Split, sin texto vertical, paneles reducidos (`scale(.88)`) |
| 768–1023 | Una columna: texto arriba; abajo solo los paneles de perfil y ranking, apilados |
| <768 | Una columna, titular 38–44 px, CTAs a ancho completo apiladas, **solo el panel de perfil** a escala reducida y sin rotación. Sin scroll horizontal en ningún punto |

## 9. Calidad mínima

- Contraste AA en todo texto sobre fondo oscuro; el párrafo secundario nunca por debajo de `#b5bbd0`.
- Foco visible por teclado en los cinco elementos interactivos de la barra y en las dos CTAs.
- La foto lleva `alt` descriptivo; los paneles decorativos que no aportan información se marcan `aria-hidden`, pero el contenido textual con significado permanece accesible.
- El retrato es de una persona no identificable como real: no se le atribuye una cita ni un testimonio, solo se usa como perfil de demostración.
- Nada de scroll horizontal, ni salto de layout al cargar la imagen (reservar `aspect-ratio`).
