# 0. Instrucción maestra para el agente de desarrollo

Construye la experiencia front-end de **Conecta Empleo** como un producto digital premium, contemporáneo, humano y confiable. La interfaz debe transmitir que la Inteligencia Artificial es una capa de apoyo, verificación y explicabilidad, no un elemento frío ni invasivo.

La estética debe combinar:

- fondos oscuros profundos en zonas hero y momentos de alta atención;
- superficies blancas o casi blancas para formularios, lectura y comparación;
- acentos eléctricos en azul, índigo y violeta;
- tipografía sans-serif limpia, editorial y de alto contraste;
- tarjetas amplias, redondeadas y muy ordenadas;
- fotografía humana preferentemente monocromática o de saturación muy reducida;
- abstracciones arquitectónicas, geométricas o de luz azul como recursos visuales;
- composición minimalista;
- microinteracciones constantes, suaves y funcionales;
- transiciones de entrada, cambio de estado y progreso;
- gráficos que se animan hasta alcanzar su valor;
- interfaces que “respiran”: nunca saturar una pantalla con información sin jerarquía.

La experiencia debe sentirse **fluida, sofisticada y agradable**, evitando tanto el aspecto genérico de una bolsa de empleo como el aspecto excesivamente futurista de una “app de IA”.

La prioridad absoluta es: **claridad > confianza > fluidez > sofisticación visual > densidad de información**.

---

# 1. Principios de producto que deben gobernar la interfaz

Toda decisión visual debe reforzar los siguientes principios:

1. **Evidencia por encima de declaraciones.**
2. **La IA ayuda a validar y organizar; no sentencia ni diagnostica personas.**
3. **El matching debe ser explicable.**
4. **El candidato debe poder demostrar capacidades aunque no tenga un CV formal.**
5. **La empresa debe poder tomar decisiones iniciales con menos fricción.**
6. **La privacidad y reducción de sesgos forman parte del producto, no son un texto legal secundario.**
7. **La experiencia debe ser usable para usuarios no técnicos.**
8. **El MVP debe verse como un producto real y coherente, no como una colección de pantallas independientes.**
9. **Todo porcentaje, score o insignia debe comunicar qué significa y de dónde proviene.**
10. **Los procesos largos deben sentirse divididos en pasos claros, alcanzables y con progreso visible.**

---

# 2. Regla de prioridad entre referencias visuales y lógica funcional

Las imágenes de referencia definen principalmente:

- dirección visual;
- estilo gráfico;
- jerarquía;
- tipografía;
- composición;
- tratamiento de tarjetas;
- tratamiento de fondos;
- navegación;
- ritmo espacial;
- uso del color;
- motion esperado.

Sin embargo, cuando una referencia visual contradiga el comportamiento funcional definido por el producto, **prevalece la lógica funcional**.

Ejemplo crítico:

En el primer filtro empresarial, el producto debe ocultar inicialmente nombre, fotografía, edad y género para reducir sesgos. Por tanto, aunque algunas referencias muestren fotografías y nombres en listados empresariales, la implementación del MVP deberá usar identificadores anónimos como:

- `Candidato #024`
- `Perfil #083`
- avatar abstracto o iniciales neutras;
- ubicación aproximada;
- experiencia;
- habilidades;
- evidencia;
- compatibilidad.

Nombre y fotografía solo aparecen después del desbloqueo previsto dentro del flujo de selección.

---

# 3. Personalidad visual

La personalidad de Conecta Empleo debe sentirse:

- **profesional**, pero no corporativa rígida;
- **tecnológica**, pero no “cyberpunk”;
- **humana**, sin caer en clichés de recursos humanos;
- **premium**, pero accesible;
- **precisa**, sin ser fría;
- **optimista**, sin promesas exageradas;
- **elegante**, sin ornamentación innecesaria;
- **confiable**, especialmente en evaluación, privacidad y resultados.

Palabras guía:

> Talento. Evidencia. Movimiento. Confianza. Potencial. Claridad. Compatibilidad. Oportunidades reales.

Palabras que NO deben definir la interfaz:

> robótico, burocrático, saturado, infantil, gamificado, neon excesivo, dashboard genérico, plantilla SaaS genérica.

---

# 4. Sistema cromático

## 4.1 Paleta principal

Usar una base cromática cercana a la siguiente:

```css
:root {
  --color-bg-dark: #070a12;
  --color-bg-dark-soft: #0d1020;
  --color-surface-dark: #111521;

  --color-bg-light: #f7f8fb;
  --color-surface: #ffffff;
  --color-surface-soft: #f1f3f8;

  --color-text-primary: #0a0b10;
  --color-text-secondary: #62687a;
  --color-text-tertiary: #9197a8;

  --color-text-on-dark: #f7f8fc;
  --color-text-on-dark-secondary: #b5bbd0;

  --color-primary: #173cff;
  --color-primary-2: #4a45ff;
  --color-accent: #8e6dff;
  --color-accent-soft: #cbc5ff;

  --color-success: #28b75a;
  --color-success-soft: #e9f8ee;

  --color-warning: #f0a52b;
  --color-warning-soft: #fff6e6;

  --color-danger: #e25151;
  --color-danger-soft: #fff0f0;

  --color-border: #d9dce5;
  --color-border-dark: rgba(255, 255, 255, 0.12);
}
```

## 4.2 Gradiente principal

El gradiente de marca se utiliza en:

- CTA principales;
- barras de progreso;
- anillos porcentuales;
- resaltes de IA;
- glow sutil;
- hero visuales;
- estados activos.

Referencia:

```css
background: linear-gradient(
  100deg,
  #173cff 0%,
  #3946ff 42%,
  #805dff 78%,
  #9b7bff 100%
);
```

No usar más de 1–2 gradientes protagonistas simultáneamente en la misma zona visible.

## 4.3 Fondo oscuro de hero

Los bloques superiores pueden usar:

```css
background:
  radial-gradient(circle at 85% 22%, rgba(60, 82, 255, 0.75), transparent 34%),
  radial-gradient(
    circle at 100% 44%,
    rgba(101, 67, 255, 0.35),
    transparent 28%
  ),
  linear-gradient(145deg, #070a12 0%, #10152a 70%, #0a0d18 100%);
```

Debe conservarse suficiente negro o azul casi negro para que el azul brillante destaque.

## 4.4 Uso del color

- Azul/índigo = acción, progreso, IA, compatibilidad, estado activo.
- Verde = éxito, disponibilidad, verificación positiva.
- Amarillo = atención, evidencia parcial o validación pendiente.
- Rojo = error real o bloqueo. No usar para puntuaciones “bajas” si eso puede interpretarse como juicio personal.
- Gris = información secundaria, estado neutral, elementos aún no completados.

---

# 5. Tipografía

## 5.1 Familia

Preferir:

- **Inter**
- **Geist**
- **Manrope**
- **SF Pro** solo si está disponible legal y técnicamente en el entorno.

Orden recomendado para web:

```css
font-family:
  Inter,
  Geist,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

## 5.2 Escala tipográfica

### Mobile

| Uso               |   Tamaño |    Peso | Line-height |
| ----------------- | -------: | ------: | ----------: |
| Display hero      | 44–54 px | 500–650 |   0.98–1.06 |
| H1                | 36–44 px |     600 |        1.05 |
| H2                | 28–34 px |     600 |        1.10 |
| H3                | 22–26 px |     600 |        1.15 |
| Título de tarjeta | 18–22 px |     600 |         1.2 |
| Body principal    | 16–18 px | 400–500 |        1.45 |
| Body secundario   | 14–16 px |     400 |        1.45 |
| Caption           | 12–13 px |     500 |        1.35 |
| Eyebrow           | 11–13 px | 500–600 |         1.2 |

### Desktop

| Uso          |   Tamaño |
| ------------ | -------: |
| Display hero | 64–88 px |
| H1           | 48–64 px |
| H2           | 36–48 px |
| H3           | 26–32 px |
| Body         | 16–18 px |

## 5.3 Reglas tipográficas

- Evitar bold extremo salvo números de score.
- Los hero titulares pueden usar 600, nunca parecer “heavy”.
- Usar tracking amplio en etiquetas tipo `ENTREVISTA EN CURSO`.
- Los microtitulares uppercase pueden usar `letter-spacing: .18em`.
- Mantener líneas de texto relativamente cortas.
- El texto secundario en fondo oscuro no debe ser gris demasiado tenue.
- No usar más de 3 pesos tipográficos distintos en una pantalla.

---

# 6. Espaciado, grid y ritmo

## 6.1 Base

Sistema de 4 px, con preferencia por múltiplos de 8.

Tokens recomendados:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
```

## 6.2 Márgenes

Mobile:

- margen lateral mínimo: 20 px;
- recomendado: 24 px;
- en pantallas densas: 16–20 px solo si es necesario.

Desktop:

- max-width contenido principal: 1180–1320 px;
- margen lateral mínimo: 32 px;
- ancho de lectura: 640–760 px;
- formularios: 620–760 px;
- grids comparativos: 1100–1320 px.

## 6.3 Separación vertical

- 8–12 px: elementos íntimamente relacionados.
- 16 px: subgrupo.
- 24 px: grupo.
- 32–40 px: sección.
- 56–80 px: cambio importante de bloque en desktop.

---

# 7. Bordes, radios y sombras

## 7.1 Radios

- Inputs: 16–20 px.
- Botones primarios: 999 px o 20–28 px.
- Tarjetas estándar: 20–24 px.
- Cards hero: 24–32 px.
- Panel blanco sobre hero oscuro: 28–36 px en esquinas superiores.

## 7.2 Bordes

Borde claro:

```css
border: 1px solid rgba(20, 24, 40, 0.12);
```

Borde oscuro:

```css
border: 1px solid rgba(255, 255, 255, 0.14);
```

Estado seleccionado:

```css
border: 1.5px solid rgba(59, 75, 255, 0.85);
box-shadow: 0 0 0 3px rgba(52, 72, 255, 0.07);
```

## 7.3 Sombras

Mantenerlas suaves.

```css
box-shadow:
  0 10px 40px rgba(15, 18, 38, 0.08),
  0 2px 10px rgba(15, 18, 38, 0.04);
```

No usar sombras negras duras ni múltiples niveles dramáticos.

---

# 8. Sistema de fondos abstractos de marca y tratamiento de assets visuales

Conecta Empleo cuenta con una familia de fondos abstractos ya generados que deben utilizarse como **atmósferas de marca**, no como wallpapers protagonistas.

La regla central es:

> **80% interfaz / contenido funcional limpio + 20% recurso visual de marca.**

El usuario debe percibir primero la información, la acción y la jerarquía de la interfaz. El fondo abstracto debe sentirse después como una capa de profundidad y personalidad.

Los fondos NO deben competir con:

- titulares;
- formularios;
- tablas;
- comparaciones;
- scores;
- barras;
- CTAs;
- textos explicativos;
- información de candidatos.

## 8.1 Assets existentes

En la raíz inicial del repositorio podrán encontrarse archivos con nombres equivalentes a:

```text
fondo_marca
fondo_entrevista
fondo_matching
fondo_resultados
fondo_perfil
fondo_empresa
fondo_onboarding
fondo_cards
```

El agente de desarrollo debe:

1. detectar la extensión real de cada archivo;
2. moverlos fuera de la raíz del repositorio;
3. colocarlos en una estructura de assets acorde con el framework;
4. renombrarlos solo si ello mejora consistencia y mantenibilidad;
5. actualizar todas las referencias;
6. no dejar duplicados innecesarios en la raíz;
7. preservar los archivos originales hasta confirmar que las nuevas rutas funcionan.

### Estructura recomendada

Si el proyecto utiliza un directorio público:

```text
/public
  /assets
    /brand
      /backgrounds
        brand-main.*
        interview.*
        matching.*
        results.*
        profile.*
        employer.*
        onboarding.*
        cards.*
```

Si el framework recomienda assets importables desde `src`:

```text
/src
  /assets
    /brand
      /backgrounds
```

La ubicación final debe seguir las mejores prácticas del framework elegido.

No incrustar estas imágenes como Base64 en componentes.

## 8.2 Significado visual de cada fondo

### `fondo_marca`

**Función:** atmósfera visual general de Conecta Empleo.

Usar principalmente en:

- login;
- landing;
- bienvenida;
- hero principal;
- headers institucionales muy importantes.

Puede tener más presencia que los demás, pero nunca debe degradar la legibilidad del contenido.

### `fondo_entrevista`

**Función:** voz, resonancia, escucha e interacción con IA.

Usar en:

- preparación de entrevista;
- entrevista en curso;
- estados de voz;
- transición entre pregunta / escucha / procesamiento.

En la entrevista en curso puede ocupar una proporción grande del viewport porque es una experiencia inmersiva.

No debe competir con el Audio Orb. Si Orb y fondo están presentes simultáneamente:

- el Orb es el protagonista;
- el fondo debe reducir saturación, contraste y opacidad;
- evitar que ondas del fondo coincidan visualmente con las ondas del Orb.

### `fondo_matching`

**Función:** conexión, afinidad, red de oportunidades y compatibilidad.

Usar en:

- headers de talento compatible;
- matching;
- ranking;
- selección;
- bloques “por qué es compatible”.

No usar como fondo continuo detrás de listas largas de candidatos.

Preferir:

- hero/header;
- franja;
- card de insight;
- panel parcial.

### `fondo_resultados`

**Función:** análisis, estructura, evaluación e insight.

Usar en:

- hero de resultados;
- card oscura de resultado general;
- resumen de evaluación;
- bloques destacados de métricas.

No colocar detrás de todas las barras, métricas o cards. Los gráficos requieren superficies limpias.

### `fondo_perfil`

**Función:** identidad profesional, evidencia revelada y profundidad.

Usar en:

- hero de perfil;
- perfil verificado;
- cabecera de identidad;
- banners de evidencia.

No utilizar detrás de listas extensas de experiencia, educación, certificaciones o portafolio.

### `fondo_empresa`

**Función:** contexto empresarial, decisión y selección.

Usar en:

- login empresa;
- hero de empresa;
- cabecera de creación/configuración de vacante;
- algún panel institucional.

El cuerpo del flujo empresarial debe permanecer principalmente claro, ordenado y analítico.

### `fondo_onboarding`

**Función:** progreso, camino y avance.

Usar en:

- onboarding;
- configuración inicial;
- pasos guiados;
- “tu siguiente paso”.

Preferirlo en el tercio superior, lateral o como banda contextual; no necesariamente full-screen.

### `fondo_cards`

**Función:** textura de apoyo reutilizable.

Usar con mucha moderación en:

- card destacada;
- preview de vacante;
- banner interno;
- card de insight premium;
- panel “resultado general”.

No aplicar a todas las cards.

Regla:

> En una misma pantalla no debería haber más de 1–2 cards con fondo abstracto protagonista.

## 8.3 Jerarquía de presencia visual

Clasificar el uso de los fondos en tres niveles:

### Nivel A — protagonista controlado

Permitido en:

- login;
- landing;
- entrevista en curso;
- hero de resultados.

El recurso puede ocupar aproximadamente **30–50% del viewport**, siempre con zona segura para texto.

### Nivel B — apoyo contextual

Preferido en la mayoría de pantallas.

El recurso ocupa aproximadamente:

- 20–35% de la altura;
- un header;
- una franja;
- una card;
- un lateral.

### Nivel C — acento

Uso recomendado en pantallas densas:

- pequeños crops;
- pseudo-background de card;
- glow;
- textura de 10–20% del área.

## 8.4 Regla de superficies limpias

Mantener **blancos o casi blancos** como superficie dominante en:

- formularios largos;
- listas;
- resultados detallados;
- comparadores;
- marketplace;
- tablas;
- perfil ideal;
- detalle anónimo;
- filtros;
- edición de perfil;
- configuración de vacante.

Patrón preferido:

```text
┌──────────────────────────────────────┐
│ HERO / HEADER OSCURO                 │
│ + fondo abstracto controlado         │
│ + título / subtítulo / progreso      │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ SUPERFICIE CLARA                     │
│                                      │
│ cards / forms / gráficos / datos     │
│                                      │
└──────────────────────────────────────┘
```

## 8.5 Overlays obligatorios

Cuando exista texto encima de una imagen abstracta, aplicar una capa de control de contraste.

Ejemplo:

```css
.brand-background::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      90deg,
      rgba(5, 8, 18, .88) 0%,
      rgba(5, 8, 18, .68) 45%,
      rgba(5, 8, 18, .28) 100%
    );
  pointer-events: none;
}
```

En otros casos:

```css
background-color: rgba(5, 8, 18, .45);
background-blend-mode: multiply;
```

La orientación del overlay debe responder a dónde se encuentre el texto.

## 8.6 Opacidad, saturación y blur

Los valores NO son absolutos; son rangos de referencia.

### Fondos de apoyo

```css
opacity: .30 – .55;
filter: saturate(.75 – .95);
```

### Fondos hero

```css
opacity: .55 – .85;
```

### Cuando existe Audio Orb o visualización protagonista

```css
opacity: .20 – .40;
filter: saturate(.65 – .85) blur(0px – 2px);
```

No aplicar blur fuerte porque puede degradar nitidez y rendimiento.

## 8.7 Crop y posicionamiento

No asumir que la imagen completa debe mostrarse.

Preferir:

```css
object-fit: cover;
background-size: cover;
```

Ajustar:

```css
object-position
background-position
```

por pantalla y breakpoint para conservar:

- zona de luz principal;
- espacio negativo;
- legibilidad;
- balance visual.

El agente debe probar el crop en:

- mobile;
- tablet;
- desktop.

Una composición que funciona en desktop puede requerir reposicionamiento importante en mobile.

## 8.8 No mezclar fondos porque “hay espacio”

No usar una imagen simplemente porque existe un asset relacionado semánticamente.

Un fondo solo debe aparecer si mejora:

- jerarquía;
- identidad;
- contextualización;
- profundidad;
- narrativa.

Si la interfaz funciona mejor limpia, NO utilizar fondo abstracto.

## 8.9 No animar todas las imágenes

Los fondos estáticos pueden recibir solo movimiento ambiental muy ligero mediante CSS:

- scale 1.00 → 1.015;
- translate 0 → 4 px;
- cambios suaves de opacity;
- parallax mínimo.

Duración orientativa:

```text
10–20 segundos
```

No animar de forma perceptiblemente rápida.

No combinar simultáneamente:

- parallax fuerte;
- scale;
- translate;
- glow;
- blur;
- rotación.

Elegir como máximo 1–2 propiedades ambientales.

## 8.10 Fondo y motion de contenido

El fondo nunca debe competir con las animaciones funcionales.

Prioridad de movimiento:

1. acción del usuario;
2. feedback;
3. gráficos;
4. Audio Orb;
5. contenido;
6. fondo.

El fondo debe ser la capa con menor velocidad visual.

## 8.11 Optimización de assets

Antes de producción:

- comprimir imágenes;
- convertir a WebP o AVIF si el pipeline lo permite;
- conservar originales solo cuando sea necesario;
- generar dimensiones adecuadas;
- no servir imágenes enormes en cards pequeñas;
- usar lazy loading fuera del primer viewport;
- precargar únicamente el fondo hero realmente crítico;
- establecer `width` / `height` o `aspect-ratio` para evitar CLS.

Si el framework dispone de optimización automática de imágenes, utilizarla.

## 8.12 Responsive y art direction

Si una imagen no funciona correctamente en mobile con un simple crop:

- generar o utilizar una variante mobile;
- usar `<picture>`;
- usar `srcset`;
- o seleccionar asset alternativo por breakpoint.

No sacrificar legibilidad intentando reutilizar a la fuerza el mismo crop.

## 8.13 Accesibilidad

Los fondos son decorativos.

Por tanto:

- no deben contener información indispensable;
- no requieren `alt` descriptivo cuando se implementen como decoración;
- si se usan `<img>` decorativas, usar `alt=""`;
- el contenido textual debe conservar significado sin el fondo;
- contraste final mínimo AA.

## 8.14 Regla de densidad visual

Evitar una sucesión de:

```text
fondo abstracto
↓
card con fondo abstracto
↓
otro banner abstracto
↓
otra sección oscura
```

Después de un bloque visual protagonista debe existir suficiente superficie neutra para permitir descanso visual.

Regla orientativa:

> Por cada sección visualmente intensa, procurar al menos una sección de contenido limpia antes de introducir otra composición abstracta importante.

## 8.15 Qué NO hacer con estos assets

No:

- usar todos los fondos en una sola ruta;
- hacer que cada pantalla tenga un fondo diferente por obligación;
- colocar texto directamente sobre zonas luminosas sin overlay;
- añadir bordes o glow adicionales a una imagen que ya es muy luminosa;
- usar `fondo_matching` detrás de 20 candidatos;
- usar `fondo_cards` en todas las cards;
- usar `fondo_entrevista` con tanto contraste que compita con el Audio Orb;
- convertir la interfaz en una galería de arte abstracto;
- introducir imágenes abstractas en tablas o campos de formulario;
- modificar la paleta individualmente hasta romper coherencia;
- animar los fondos a velocidad alta;
- cargar todos los assets al inicio.

## 8.16 Criterio de decisión rápido para el agente

Antes de colocar un fondo, responder:

```text
1. ¿Esta pantalla necesita una atmósfera visual fuerte?
2. ¿El recurso tiene relación semántica con la pantalla?
3. ¿Existe suficiente espacio negativo?
4. ¿El contenido sigue siendo lo primero que percibo?
5. ¿Puedo mantener WCAG AA?
6. ¿Hay ya otro elemento protagonista en la vista?
```

Si las respuestas 4 o 5 son “no”, reducir o eliminar el fondo.

Si la respuesta 6 es “sí”, el fondo debe pasar a un rol secundario.

---


# 9. Iconografía

Usar un único set consistente:

- Lucide;
- Phosphor;
- Heroicons outline.

Estilo:

- outline;
- stroke 1.5–2 px;
- esquinas redondeadas;
- tamaño común 20–24 px.

Para acciones principales, 22–24 px.

No mezclar estilos filled, duotone y outline de múltiples librerías salvo casos deliberados.

---

# 10. Botones

## 10.1 Primario

Características:

- alto: 52–60 px;
- gradiente azul-violeta;
- texto blanco;
- radio pill;
- flecha a la derecha en acciones de avance;
- hover con elevación mínima + desplazamiento del gradiente;
- active con escala ~0.985;
- disabled con opacidad y sin glow.

Ejemplo:

```css
.cta-primary {
  min-height: 56px;
  border-radius: 999px;
  background: linear-gradient(100deg, #173cff, #4e46ff 55%, #9271ff);
  color: white;
  font-weight: 500;
}
```

## 10.2 Secundario

- fondo blanco;
- borde azul o gris;
- texto azul o negro;
- mismo alto que primario si están en pareja.

## 10.3 Ghost

- sin fondo;
- hover con superficie tenue;
- reservado para “Volver”, “Ver consejos”, “Guardar para después”.

## 10.4 Microinteracción

Al hover:

- flecha se desplaza 4–6 px;
- botón sube 1–2 px;
- glow aumenta ligeramente.

Duración: 160–220 ms.

---

# 11. Inputs y formularios

Los formularios deben parecer fáciles de completar aunque contengan varios campos.

## 11.1 Input estándar

- alto mínimo: 56 px;
- radio: 16–18 px;
- fondo blanco o #FAFBFD;
- borde #D9DCE5;
- icono opcional a izquierda;
- label siempre visible fuera o dentro como floating label estable;
- placeholder gris suave;
- focus con borde azul y halo mínimo.

## 11.2 Estados

### Focus

```css
border-color: #4a45ff;
box-shadow: 0 0 0 4px rgba(74, 69, 255, 0.1);
```

### Error

- borde rojo tenue;
- mensaje explicativo debajo;
- no depender solo del color;
- usar icono + texto.

### Correcto

- check verde solo si existe validación útil.

## 11.3 Formularios largos

Dividir en pasos.

Mostrar:

- `Paso 1 de 3`;
- progress segments;
- título del paso;
- una explicación corta;
- CTA fijo o claramente visible.

No mostrar 20 campos seguidos en una sola pantalla si pueden agruparse.

---

# 12. Navegación

## 12.1 Mobile

Barra inferior persistente para áreas principales.

### Candidato

- Inicio
- Explorar
- Entrevista
- Perfil

### Empresa

- Inicio
- Talento
- Vacantes
- Empresa

Estado activo:

- icono más oscuro/azul;
- pequeño punto azul debajo;
- texto activo con mayor contraste.

## 12.2 Desktop

Usar sidebar o top nav según densidad:

### Recomendación

- navegación lateral compacta de 240–280 px para dashboard;
- logo arriba;
- items con icono + etiqueta;
- CTA destacado para “Nueva vacante” o “Continuar entrevista”;
- perfil al final.

Para flujos inmersivos — entrevista, onboarding, creación de vacante — eliminar navegación secundaria y centrar al usuario en la tarea.

---

# 13. Header

En pantallas mobile:

- logo / wordmark izquierda;
- búsqueda, notificación o avatar a la derecha;
- padding superior generoso;
- no saturar.

En hero oscuro:

- header transparente;
- iconos blancos;
- avatar con status verde si aplica.

---

# 14. Tarjetas

## 14.1 Card estándar

- fondo blanco;
- borde 1 px;
- 20–24 px radius;
- padding 16–24 px.

## 14.2 Card oscura protagonista

Uso:

- oportunidad destacada;
- resumen de evaluación;
- preview de vacante;
- IA entrevistadora.

Características:

- fondo negro/azul;
- recurso abstracto parcial;
- texto blanco;
- CTA blanco o gradiente;
- métricas en capsule.

## 14.3 Card de candidato

En modo anónimo mostrar:

- ID;
- rol;
- ubicación aproximada;
- experiencia;
- disponibilidad;
- skills;
- compatibilidad;
- nivel de evidencia;
- CTA “Ver evidencia” o “Revisar perfil”.

Después de desbloquear:

- nombre;
- fotografía;
- información completa.

---

# 15. Chips, tags y pills

Uso:

- skills;
- modalidad;
- filtros;
- disponibilidad;
- estados.

Reglas:

- altura 30–38 px;
- padding horizontal 12–16 px;
- radius pill;
- fondo gris claro;
- texto 13–14 px.

Seleccionado:

- azul/índigo;
- texto blanco.

No usar más de 5–6 chips visibles por card; agrupar resto como `+2`.

---

# 16. Progreso

El progreso debe ser visible y animado.

## 16.1 Progress bars

- track gris claro;
- fill gradiente;
- altura 7–10 px;
- radius total;
- animación desde 0 al valor final.

## 16.2 Anillos

Para:

- compatibilidad;
- perfil completado;
- evaluación.

Deben animarse al entrar al viewport.

Ejemplo:

- valor final 92%;
- comenzar en 0%;
- duración 900–1400 ms;
- easing tipo spring suave o cubic-bezier;
- contador numérico sincronizado de 0 → 92.

## 16.3 Segmentos de pasos

Usar 3–8 segmentos horizontales.

- completado = blanco/azul brillante;
- actual = azul;
- pendiente = opacidad baja.

---

# 17. Motion design — regla general

**El movimiento forma parte del lenguaje del producto. No debe añadirse al final como decoración.**

Toda pantalla debe tener una secuencia de entrada.

Regla:

> Ninguna vista importante debe aparecer de golpe como un bloque estático.

Pero tampoco deben animarse todos los elementos simultáneamente.

## 17.1 Curvas

Recomendadas:

```css
--ease-out-smooth: cubic-bezier(0.16, 1, 0.3, 1);
--ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

## 17.2 Duraciones

- microinteracción: 120–220 ms;
- input/focus: 150–200 ms;
- card entrance: 350–550 ms;
- section reveal: 450–700 ms;
- modal/page transition: 450–650 ms;
- gráfico principal: 900–1400 ms;
- hero ambient motion: 8–20 s loop.

## 17.3 Entrada de página

Secuencia recomendada:

1. fondo visible de inmediato;
2. header fade + translateY(-8px), 250–350 ms;
3. eyebrow;
4. H1 entra 80–120 ms después;
5. subtítulo;
6. panel principal;
7. cards internas en stagger;
8. CTA final.

Stagger: 50–90 ms.

## 17.4 Reveal al scroll

Cada sección importante:

```text
opacity: 0 → 1
translateY: 18–28px → 0
blur: 3–5px → 0
duration: 450–650ms
```

Trigger al 15–25% de entrada en viewport.

No repetir la animación cada vez que el usuario sube y baja si puede resultar molesto.

## 17.5 Cards

Cards en grids:

- stagger 60 ms;
- scale inicial 0.985;
- translateY 18 px;
- opacity 0.

## 17.6 Cambio de filtros

Al seleccionar un filtro:

- pill activa se desliza o cambia color suavemente;
- resultados hacen fade + translateY 8 px;
- evitar refresh brusco.

## 17.7 Cambio entre pasos

Usar transición horizontal leve:

- avanzar = contenido actual sale 20–40 px a izquierda;
- nuevo contenido entra desde derecha;
- volver = inverso.

Duración: 350–500 ms.

---

# 18. Motion de métricas y gráficos

## 18.1 Porcentajes

Todo porcentaje destacado debe animarse.

Ejemplo:

```text
0 → 92
```

Puede usarse `requestAnimationFrame`, Framer Motion, Motion One o GSAP.

## 18.2 Barras

El fill inicia en 0 y crece a su porcentaje.

Añadir delay incremental en múltiples barras.

Ejemplo:

- Comunicación 92: delay 100 ms
- Pensamiento crítico 84: delay 180 ms
- Experiencia técnica 78: delay 260 ms

## 18.3 Anillos

SVG `stroke-dashoffset` animado.

El número interior debe animarse en paralelo.

## 18.4 Estados verificables

Checks:

- círculo aparece por scale;
- check se dibuja con path;
- duración total 350–500 ms.

## 18.5 Matching

Al cargar resultados:

1. cards aparecen;
2. score count-up;
3. ring fill;
4. explicación “Por qué es compatible” aparece al final.

Esto produce sensación de análisis sin fingir tiempo de procesamiento excesivo.

---

# 19. Motion ambiental

En hero oscuro:

- glow azul lento;
- gradiente desplazándose 2–4%;
- parallax mínimo;
- ruido/grain casi imperceptible.

Nunca:

- flashes;
- partículas agresivas;
- fondos que distraigan;
- loops rápidos.

---

# 20. Preferencias de movimiento y accesibilidad

Respetar:

```css
@media (prefers-reduced-motion: reduce);
```

En ese caso:

- eliminar parallax;
- eliminar count-up prolongado;
- reducir transforms;
- mantener cambios de opacidad rápidos;
- gráficos pueden aparecer directamente con transición mínima.

---

# 21. Layout responsive

Aunque las referencias sean mobile, construir mobile-first y adaptar a web.

Breakpoints recomendados:

```css
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1440px
```

## 21.1 Mobile

- una columna;
- navegación inferior;
- hero 30–42% del viewport en pantallas híbridas;
- cards apiladas.

## 21.2 Tablet

- 2 columnas cuando tenga sentido;
- panel lateral opcional;
- evitar estirar forms a todo el ancho.

## 21.3 Desktop

- dashboard con sidebar;
- contenido central max-width;
- cards 2–3 columnas;
- formularios centrados;
- en comparación de candidatos, usar columnas paralelas;
- entrevista puede ocupar layout 60/40 con visualizador principal y panel de contexto.

---

# 22. Accesibilidad

Cumplir mínimo WCAG AA.

Reglas:

- contraste de texto suficiente;
- focus visible;
- navegación por teclado;
- labels reales;
- `aria-live` para cambios de estado;
- no depender del color;
- targets táctiles de mínimo 44x44 px;
- textos no menores a 12 px;
- imágenes con alt útil;
- gráficos con resumen textual;
- scores con significado textual.

Ejemplo:

No mostrar solo:

`92%`

Mostrar:

`Compatibilidad 92% — alta compatibilidad con los criterios definidos para esta vacante.`

---

# 23. Tono del microcopy

Debe ser claro, humano y no intimidante.

Usar:

- “Cuéntanos…”
- “Muéstranos…”
- “Tu siguiente paso…”
- “Aquí puedes…”
- “Basado en la evidencia disponible…”
- “La IA apoya tu decisión; no la reemplaza.”

Evitar:

- “La IA determinó que…”
- “Eres apto/no apto.”
- “Personalidad baja.”
- “Candidato deficiente.”
- “Fracaso.”
- “Reprobado.”

---

# 24. Arquitectura de experiencia — candidato

El journey candidato prioritario debe construir una narrativa:

> entrar → estructurar experiencia → demostrar habilidades → recibir evaluación → convertirla en perfil verificable → encontrar oportunidades.

Pantallas mínimas:

1. Bienvenida/login.
2. Registro.
3. Onboarding.
4. Carga de CV o creación asistida.
5. Perfil inicial.
6. Preparación de entrevista.
7. Entrevista en curso.
8. Resultado de entrevista.
9. Perfil de Talento Verificado.
10. Marketplace / oportunidades.
11. Detalle de oportunidad.
12. Postulación.

---

# 25. Login candidato

Composición:

- hero oscuro superior de 40–48%;
- branding;
- fondo abstracto de marca, preferentemente `fondo_marca`, con presencia controlada;
- copy de bienvenida;
- panel blanco inferior superpuesto con borde superior redondeado.

Elementos:

- correo;
- contraseña;
- CTA;
- crear cuenta.

Animación:

- hero fade;
- panel blanco sube 30 px;
- inputs stagger;
- CTA aparece al final.

---

# 26. Onboarding candidato

Objetivo: personalizar sin parecer interrogatorio.

Preguntas:

- ¿Qué te gustaría hacer primero?
- área profesional;
- modalidad;
- ubicación;
- disponibilidad;
- expectativa.

UI:

- cards seleccionables;
- iconos simples;
- radio/check superior derecho;
- progress `1 de 3`.

Motion:

- selección con scale 0.98 → 1;
- border glow;
- check animado.

---

# 27. Carga de CV / creación asistida

Dos acciones principales:

### Subir CV

- icono documento;
- texto “Extraemos tu información con IA”;
- drag & drop en desktop;
- selector de archivo mobile.

### Crear desde cero

- icono sparkles;
- texto “Construye tu perfil paso a paso”.

Estado de carga:

- skeleton + progress real si existe;
- mensajes concretos:
  - “Leyendo experiencia”
  - “Identificando habilidades”
  - “Organizando tu perfil”

No fingir análisis si el backend ya terminó; mantener la animación breve.

---

# 28. Perfil profesional candidato

Hero oscuro superior.

Mostrar:

- porcentaje de perfil completado;
- foto opcional;
- nombre;
- rol;
- ubicación;
- bio;
- acciones para subir CV o completar manualmente.

Secciones:

- experiencia;
- habilidades;
- educación;
- portafolio;
- documentos/evidencias;
- disponibilidad.

Cada item:

- estado;
- conteo;
- chevron;
- progress si aplica.

Animaciones:

- anillo de completitud;
- secciones en cascade;
- estados completos con check animado.

---

# 29. Preparación de entrevista

Debe transmitir calma.

Hero:

`Tu entrevista con IA`

Subcopy:

`Una conversación para conocer mejor tu experiencia y cómo resuelves situaciones reales.`

Panel destacado:

- duración estimada;
- formato;
- micrófono;
- cámara solo si realmente se usa;
- estado técnico.

“Qué evaluaremos”:

- comunicación;
- resolución de problemas;
- experiencia / conocimiento técnico.

Checklist previo:

- micrófono;
- cámara si aplica;
- espacio tranquilo;
- conexión.

CTA:

`Comenzar entrevista`

---

# 30. Entrevista en curso — pantalla clave

Esta debe ser una de las pantallas más memorables del producto.

Estética:

- full dark;
- gradiente azul;
- sin navegación inferior;
- foco absoluto.

Estructura:

- logo;
- cerrar;
- `Pregunta 3 de 6`;
- barra segmentada;
- pregunta grande;
- visualizador de voz;
- timer;
- estado “Escuchando…”;
- repetir pregunta;
- micrófono;
- pausar;
- CTA “Terminar respuesta”.

## 30.1 Visualizador de voz

Puede ser:

- esfera;
- anillo;
- waveform;
- forma orgánica.

Debe reaccionar al audio real si es viable.

Si no, usar animación procedural discreta.

Estados:

### Esperando

- animación lenta;
- opacidad 0.55.

### Escuchando

- amplitud mayor;
- glow azul;
- micro-pulsos.

### Procesando

- waveform se contrae;
- anillo de luz gira suavemente;
- texto `Analizando respuesta…`

### IA hablando

- ondas con ritmo diferente;
- label `Pregunta de la entrevista`.

No hacer visualizador frenético.

---

# 31. Resultado de entrevista

Hero oscuro + score grande.

Debe incluir:

- evaluación total;
- clasificación textual moderada;
- desempeño por competencias;
- fortaleza principal;
- oportunidad de desarrollo;
- CTA a perfil verificado.

Gráficos:

- score ring;
- barras de competencias.

Animación:

1. H1;
2. ring 0→86;
3. card resultado;
4. barras;
5. insight cards.

Copy:

`Resultados basados en tu entrevista por competencias con IA. Son una guía sobre la evidencia observada durante esta sesión.`

No presentar como diagnóstico absoluto.

---

# 32. Perfil de Talento Verificado

Pantalla de identidad profesional.

Hero:

- `PERFIL VERIFICADO`
- `Tu talento habla por ti.`

Mostrar:

- fotografía;
- nombre;
- rol;
- ubicación;
- modalidad;
- descripción;
- insignia verificada.

Bloque principal:

`Entrevista con IA completada`

Secciones:

- sobre mí;
- habilidades;
- evidencias;
- experiencia;
- portafolio;
- certificaciones.

Para cada habilidad mostrar nivel de evidencia:

### Declarada

badge gris.

### Evaluada

badge azul.

### Verificada

badge azul + check o verde según contexto.

No confundir “evaluada” con “verificada externamente”.

---

# 33. Marketplace candidato

Hero superior oscuro, cuerpo claro.

Título:

`Oportunidades para ti`

Filtros:

- Para ti
- área
- modalidad
- tipo de jornada

Card protagonista:

- rol;
- empresa;
- ubicación;
- modalidad;
- seniority;
- compatibilidad;
- CTA;
- guardar.

Cards secundarias en grid.

Motion:

- ring fill;
- card reveal;
- filtros con transition.

---

# 34. Detalle de oportunidad

Debe explicar:

- puesto;
- empresa;
- ubicación;
- salario si disponible;
- modalidad;
- requisitos;
- responsabilidades;
- compatibilidad;
- “por qué encajas”;
- qué evidencia coincide;
- qué requisitos aún no están respaldados.

CTA principal:

`Postularme`

No obligar a solicitar contacto manual como paso adicional para el MVP.

---

# 35. Arquitectura de experiencia — empresa

Journey:

> verificar empresa → crear vacante → definir perfil ideal → explorar talento anónimo → revisar evidencia → comparar → seleccionar → desbloquear perfil completo.

Pantallas mínimas:

1. Login empresa.
2. Perfil/registro empresa.
3. Verificación visual.
4. Nueva vacante.
5. Perfil ideal.
6. Talento compatible.
7. Detalle anónimo.
8. Comparación.
9. Selección/finalistas.
10. Perfil desbloqueado.

---

# 36. Login empresa

Reutilizar el lenguaje visual del candidato, pero con copy:

`Acceso para empresas`

`Encuentra talento con evidencia`

Formulario blanco inferior.

Acción secundaria:

`Soy candidato`

Mantener separación de journeys.

---

# 37. Perfil / onboarding empresa

Título:

`Conozcamos tu empresa`

Campos:

- logo;
- nombre;
- industria;
- tamaño;
- ubicación;
- modalidad;
- descripción de cultura/equipo.

Diseño por pasos.

No pedir información empresarial innecesaria para el demo.

---

# 38. Nueva vacante

Hero oscuro + panel de formulario blanco.

Campos:

- título;
- familia de empleo;
- modalidad;
- ubicación;
- tipo;
- rango salarial;
- descripción del reto;
- número de vacantes.

CTA:

`Definir perfil ideal`

Agregar preview visual de vacante.

---

# 39. Perfil ideal

La empresa debe priorizar criterios.

Categorías iniciales:

- habilidades técnicas;
- experiencia;
- comunicación;
- pensamiento crítico;
- disponibilidad;
- ubicación;
- rango salarial.

Cada criterio:

- icono;
- descripción;
- selector:
  - Esencial
  - Importante
  - Deseable

Mostrar un indicador de prioridad.

Mensaje fijo:

`La IA apoya tu decisión; no la reemplaza.`

---

# 40. Talento compatible — versión correcta para reducción de sesgos

**No mostrar foto ni nombre en el primer filtro.**

Card:

```text
CANDIDATO #024
Encargado de almacén
CDMX · disponible ahora

92% compatibilidad

Habilidades:
Inventarios · Seguridad · ERP · +2

Evidencia:
Evaluada 5
Verificada 2

[Ver perfil anónimo]
```

Mostrar:

- porcentaje;
- score por criterio;
- evidencia;
- experiencia;
- disponibilidad;
- ubicación aproximada.

Filtros:

- Todos
- Evidencia alta
- Disponibles
- Mayor compatibilidad
- Ubicación
- Salario

---

# 41. Detalle anónimo

Esta pantalla debe convencer al reclutador de que el producto ofrece más que un CV.

Mostrar:

- ID candidato;
- rol;
- experiencia;
- compatibilidad global;
- desglose;
- habilidades;
- evidencias;
- entrevista IA;
- consistencias/inconsistencias;
- documentos verificados;
- disponibilidad.

Bloque:

`Por qué es compatible`

Texto generado por IA, pero basado en criterios visibles.

CTA:

`Agregar a selección`

---

# 42. Comparar talento

Desktop ideal: 3 columnas.

Mobile: cards horizontales o carrusel con sticky criteria labels.

Comparar:

- compatibilidad;
- habilidades;
- experiencia;
- comunicación;
- pensamiento crítico;
- disponibilidad;
- evidencia.

No presentar un único ranking como verdad absoluta.

Incluir:

`Ver diferencias clave`

Y explicar:

- quién sobresale en qué;
- dónde hay menor evidencia;
- qué criterio podría cambiar la decisión.

---

# 43. Selección / finalistas

Funnel visual:

- Revisar
- Entrevistar
- Finalistas

Lista:

- perfiles seleccionados;
- estado;
- evaluadores internos si aplica.

Solo tras la etapa definida de selección puede desbloquearse la identidad.

CTA:

`Invitar a entrevista` o `Continuar proceso`.

---

# 44. Perfil desbloqueado

Mostrar identidad completa.

Al desbloquear:

- transición de blur → claro o placeholder → foto;
- nombre aparece;
- datos de contacto si están contemplados.

La animación debe ser sobria y comunicar que se accedió a un nivel adicional de información.

---

# 45. Diseño de explicabilidad de IA

Toda salida de IA importante debe responder visualmente:

1. ¿Qué resultado obtuve?
2. ¿Por qué?
3. ¿Qué evidencia lo respalda?
4. ¿Qué tan confiable o completo es?
5. ¿Qué acción puedo tomar?

Patrón recomendado:

```text
92% compatibilidad
Alta compatibilidad

Por qué:
- Inventarios evaluado
- Seguridad verificada
- 4 años de experiencia

Falta evidencia:
- ERP declarado, no validado

[Ver evidencia]
```

---

# 46. Estados de evidencia

Crear un componente reutilizable `EvidenceBadge`.

Estados:

```ts
type EvidenceLevel =
  | "declared"
  | "evaluated"
  | "verified"
  | "partial"
  | "pending";
```

Visual:

- declared → gris;
- evaluated → azul;
- verified → azul intenso + check;
- partial → amarillo;
- pending → gris claro con clock.

Tooltip obligatorio en desktop; bottom sheet o info en mobile.

---

# 47. Skeletons y loading

No usar spinner genérico como única respuesta.

Preferir:

- skeleton de cards;
- shimmer leve;
- progress contextual;
- mensajes de proceso.

Ejemplos:

### CV

`Organizando tu experiencia…`

### Matching

`Comparando habilidades y evidencia…`

### Evaluación

`Preparando tu resumen…`

Duración de animación shimmer: 1.4–1.8 s.

---

# 48. Empty states

Deben contener:

- icono;
- título claro;
- explicación;
- CTA.

Ejemplo empresa:

`Aún no tienes vacantes activas.`  
`Crea tu primera vacante para comenzar a comparar talento verificado.`  
`[Crear vacante]`

---

# 49. Errores

Usar lenguaje accionable.

Mal:

`Error 422`

Bien:

`No pudimos procesar este archivo.`  
`Prueba con un PDF o DOCX de hasta 10 MB.`

Mostrar detalles técnicos solo en modo desarrollo.

---

# 50. Toasts

Usar para feedback transitorio:

- perfil guardado;
- vacante creada;
- candidato añadido;
- enlace copiado.

Duración: 3–5 s.

Animación:

- slide + fade;
- no bloquear.

---

# 51. Modales y drawers

Mobile:

- bottom sheet preferente;
- radius superior 24–28 px;
- handle opcional.

Desktop:

- modal centrado 480–680 px;
- backdrop blur ligero.

No usar modal para procesos largos.

---

# 52. Imágenes de personas

Para coherencia visual:

- retratos limpios;
- fondo neutro;
- blanco y negro o saturación baja;
- recorte editorial;
- iluminación suave;
- expresiones naturales.

Evitar stock corporativo obvio.

En el flujo anónimo empresarial, usar:

- avatar abstracto;
- silueta;
- monograma neutral;
- NO fotografías.

---

# 53. Gráficos y visualizaciones

Preferir:

- progress bars;
- ring charts;
- radar solo si aporta;
- comparación horizontal;
- badges de evidencia.

Evitar:

- pie charts innecesarios;
- gauges velocímetro;
- dashboards densos;
- charts 3D.

Todos los charts deben tener texto equivalente.

---

# 54. Componentes front-end reutilizables

Construir al menos:

```text
AppShell
CandidateShell
EmployerShell
AuthLayout
HeroPanel
SectionHeader
ProgressSteps
ProgressRing
ProgressBar
EvidenceBadge
ScoreBadge
SkillChip
JobCard
CandidateAnonymousCard
CandidateUnlockedCard
MetricCard
AIInsightCard
FormField
SelectField
FileUploader
PrimaryButton
SecondaryButton
BottomNav
Sidebar
FilterPills
EmptyState
SkeletonCard
Toast
Modal
BottomSheet
AudioVisualizer
InterviewControls
```

---

# 55. Recomendación de stack de UI y motion

Si el front-end es React/Next:

- Tailwind CSS;
- Radix UI / shadcn solo como base accesible;
- Framer Motion / Motion;
- Lucide;
- Recharts solo si se requiere chart complejo.

Si es Angular:

- Tailwind CSS;
- Angular CDK;
- Motion One / GSAP;
- Lucide Angular.

No permitir que shadcn/Material/Bootstrap definan la apariencia final. Pueden aportar primitives, pero el diseño debe ser custom.

---

# 56. Reglas de implementación de animaciones

Crear primitives reutilizables:

```ts
fadeUp;
fadeIn;
slideInRight;
slideInLeft;
staggerContainer;
scaleIn;
numberCountUp;
progressFill;
ringProgress;
```

Ejemplo conceptual:

```ts
const fadeUp = {
  initial: { opacity: 0, y: 24, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
};
```

No copiar la misma animación idéntica en todo. Variar sutilmente según jerarquía.

---

# 57. Page transitions

Entre rutas:

- fondo no debe flashear blanco;
- usar layout persistente;
- transición 250–450 ms;
- animar contenido, no toda la app con un zoom.

Para experiencias inmersivas:

- transición tipo “focus mode”;
- nav desaparece;
- fondo oscuro ocupa la vista.

---

# 58. Scroll behavior

- `scroll-behavior: smooth` solo para navegación interna;
- no bloquear scroll natural;
- usar sticky headers cuando ayuden;
- no crear scroll-jacking.

En desktop:

- ciertos paneles laterales pueden ser sticky;
- comparar candidatos puede mantener cabeceras.

---

# 59. Hover states

Desktop:

- cards elevan 2–4 px;
- borde aumenta contraste;
- imagen hace scale 1.015;
- flecha se desplaza;
- chip no debe animarse excesivamente.

Mobile:

- depender de active/focus, no hover.

---

# 60. Microinteracciones importantes

Implementar:

- check dibujado al completar;
- toggle con spring;
- upload con progreso;
- filtro con transición;
- badge verificado con scale-in;
- copy-to-clipboard;
- guardar vacante con icono bookmark animado;
- cambio de favorito con fill;
- score al entrar en viewport;
- card seleccionada con halo;
- CTA con flecha dinámica.

---

# 61. Haptics y audio

Si es PWA/mobile y es sencillo:

- vibración ligera al completar paso;
- NO vibración en cada tap.

No reproducir audio decorativo.

---

# 62. Especificaciones de interview visualizer

Canvas/SVG recomendado.

Visual:

- esfera de 240–340 px mobile;
- 320–460 px desktop;
- inner waveform orgánica;
- halo exterior;
- blur controlado.

Parámetros:

- 3–5 capas;
- alpha baja;
- velocidad lenta;
- amplitud vinculada a audio;
- color de cian → azul → violeta.

---


# 62.1 Integración del Audio Orb desde repositorio externo `ORB`

Existe un repositorio separado llamado **`ORB`** que contiene una implementación ya construida del Audio Orb con Three.js.

Este repositorio debe considerarse una **fuente de componente**, no una aplicación que deba integrarse completa.

El repositorio `ORB` contiene una experiencia de prueba / beta con elementos auxiliares alrededor del orbe para visualizarlo, configurarlo o probar distintos estados. La nueva plataforma **NO debe copiar esa interfaz de demo**.

La instrucción para el agente es:

> Extrae únicamente el Audio Orb reusable y todo aquello estrictamente necesario para que funcione dentro de Conecta Empleo. Descarta la UI de prueba, controles de laboratorio, playgrounds, paneles de configuración, botones de demo, layouts experimentales, wrappers visuales y cualquier elemento que exista solamente para probar el componente.

## 62.1.1 Objetivo de integración

El resultado final debe ser un componente aislado, reusable y limpio que pueda insertarse dentro de la experiencia de entrevista de Conecta Empleo.

El componente debe mantener:

- la calidad visual del Orb actual;
- su comportamiento Three.js;
- sus shaders y materiales necesarios;
- su sistema de animación;
- su lógica reactiva al audio;
- sus estados visuales reutilizables;
- sus optimizaciones;
- sus utilidades necesarias;
- su lógica de resize;
- sus mecanismos de cleanup;
- su compatibilidad responsive.

Pero debe eliminar:

- controles de demo;
- selectores de estado visibles;
- sliders;
- paneles de debug;
- botones de reproducción de ejemplo;
- contenedores de “beta”;
- textos explicativos de prueba;
- fondos propios de la demo si pertenecen al playground;
- layouts externos al Orb;
- cualquier dependencia que no sea necesaria para el componente final.

## 62.1.2 Proceso esperado para el agente

Antes de copiar código desde `ORB`, el agente debe inspeccionar el repositorio y separar conceptualmente:

```text
ORB REPO
│
├── Core del Orb                   ← CONSERVAR
│   ├── Three.js scene
│   ├── geometry
│   ├── shaders
│   ├── materials
│   ├── audio-reactive logic
│   ├── state interpolation
│   └── rendering lifecycle
│
├── Helpers necesarios             ← CONSERVAR SI SON REQUERIDOS
│   ├── AudioAnalyzer
│   ├── smoothing
│   ├── resize
│   ├── quality settings
│   └── cleanup
│
└── Demo / playground / beta UI   ← NO INTEGRAR
    ├── sliders
    ├── selectors
    ├── debug panels
    ├── sample audio controls
    ├── status buttons
    ├── wrapper backgrounds
    └── experimental layout
```

No copiar archivos masivamente sin entender su función.

## 62.1.3 Componente final esperado

La implementación final dentro de Conecta Empleo debe exponer una API simple.

Ejemplo conceptual:

```ts
type OrbState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking";

interface AudioOrbProps {
  state: OrbState;
  analyser?: AnalyserNode;
  intensity?: number;
  className?: string;
  quality?: "high" | "medium" | "low";
}
```

Este contrato es orientativo.

Si el repositorio `ORB` ya utiliza una interfaz mejor diseñada, conservarla y adaptarla solo cuando sea necesario para integrarse con la arquitectura principal.

## 62.1.4 No reescribir innecesariamente

Si el Orb del repositorio `ORB` ya funciona correctamente:

- no reconstruirlo desde cero;
- no reemplazar shaders sin una razón concreta;
- no simplificarlo hasta perder calidad;
- no cambiar su lenguaje visual arbitrariamente;
- no introducir una segunda implementación paralela.

Priorizar **extraer, desacoplar y reutilizar**.

Refactorizar únicamente lo necesario para:

- remover dependencias del playground;
- integrarlo con el sistema de componentes;
- conectarlo con el audio real;
- hacerlo responsive;
- garantizar cleanup;
- cumplir performance y accesibilidad.

## 62.1.5 Ubicación dentro del nuevo repositorio

El agente debe mover el código extraído del Orb a una estructura coherente con el stack.

Ejemplo:

```text
/src
  /components
    /interview
      /AudioOrb
        AudioOrb.tsx
        AudioOrb.types.ts
        orbShaders.ts
        orbConfig.ts
        useAudioAnalyzer.ts
        useOrbRenderer.ts
        index.ts
```

o equivalente en Angular:

```text
/src/app
  /features
    /interview
      /audio-orb
```

No dejar el código del Orb como una carpeta opaca copiada del repo externo si puede integrarse limpiamente en la arquitectura principal.

## 62.1.6 Integración con audio real

El Orb debe reaccionar al audio real de la experiencia.

### Cuando habla el candidato

La señal del micrófono puede alimentar el análisis de audio del Orb en estado:

```text
listening
```

### Cuando la IA procesa

El Orb debe usar una animación procedural:

```text
thinking
```

No fingir una señal de audio inexistente.

### Cuando habla el agente de IA

El audio real del agente debe alimentar el Orb en estado:

```text
speaking
```

Usar la integración ya existente del repo `ORB` si está implementada.

Si el repo acepta:

- `AnalyserNode`;
- `MediaStream`;
- `HTMLAudioElement`;
- stream WebRTC;

preservar el mecanismo más adecuado y conectarlo a la capa de voz de Conecta Empleo.

## 62.1.7 Estados y transición

La experiencia principal controlará el estado del Orb.

Flujo conceptual:

```text
idle
  ↓
listening
  ↓
thinking
  ↓
speaking
  ↓
listening
```

Las transiciones deben conservar el morph / interpolación suave existente en `ORB` siempre que sea compatible.

Nunca desmontar y volver a crear la escena Three.js en cada cambio de estado si puede evitarse.

Preferir:

- escena persistente;
- actualización de uniforms;
- interpolación de parámetros;
- cambios de estado suaves.

## 62.1.8 Relación con `fondo_entrevista`

En la pantalla de entrevista:

> **Audio Orb = protagonista visual.**  
> **`fondo_entrevista` = atmósfera secundaria.**

Por tanto:

- reducir contraste del fondo;
- evitar que sus ondas compitan con las del Orb;
- utilizar overlay oscuro si es necesario;
- conservar espacio visual alrededor del Orb;
- no añadir otros efectos 3D importantes en la misma zona.

El usuario debe identificar inmediatamente el Orb como el elemento vivo de la conversación.

## 62.1.9 Responsive

El Orb debe adaptarse al layout de la plataforma, no forzar al layout a replicar la demo.

Referencia:

```text
Mobile: 240–320 px
Tablet: 300–380 px
Desktop: 340–480 px
```

Los valores pueden variar según composición.

El canvas debe:

- conservar aspect ratio;
- no provocar overflow horizontal;
- responder al contenedor;
- utilizar ResizeObserver o mecanismo equivalente;
- ajustar pixel ratio según performance.

## 62.1.10 Performance

Al extraer el Orb, revisar que el playground no haya introducido overhead innecesario.

Verificar:

- un solo render loop;
- ningún listener duplicado;
- no crear geometrías por frame;
- no crear materiales por frame;
- no recrear AudioContext innecesariamente;
- cleanup de geometrías/materiales/texturas;
- cleanup de listeners;
- cancelación de `requestAnimationFrame`;
- pausa o reducción de render si no está visible;
- pixel ratio limitado;
- quality mode si el repo ya lo contempla.

No sacrificar calidad visual de forma preventiva si el componente ya mantiene buen rendimiento.

## 62.1.11 Dependencias

Antes de añadir dependencias provenientes de `ORB`:

1. identificar cuáles son realmente necesarias;
2. comprobar si ya existen en el proyecto principal;
3. evitar versiones duplicadas de Three.js;
4. evitar traer librerías de demo;
5. evitar importar un framework UI solo porque el playground lo usaba.

La nueva aplicación no debe heredar deuda innecesaria del repo de prueba.

## 62.1.12 Estilos

No copiar estilos globales del repo `ORB`.

El Orb debe quedar visualmente encapsulado.

Preferir:

- CSS Modules;
- scoped styles;
- Tailwind local;
- styled component aislado;
- estilos equivalentes según stack.

La demo externa no debe sobrescribir:

- `body`;
- `html`;
- tipografía global;
- colores;
- spacing;
- botones;
- backgrounds;
- z-index globales.

## 62.1.13 Accesibilidad y reduced motion

El Orb es principalmente visual.

Debe respetar:

```css
@media (prefers-reduced-motion: reduce)
```

La experiencia puede:

- reducir amplitud;
- reducir velocidad;
- eliminar deformaciones secundarias;
- conservar únicamente glow / estado mínimo necesario.

La entrevista nunca debe depender exclusivamente del Orb para comunicar:

- escuchando;
- procesando;
- hablando.

Debe existir también un label textual.

## 62.1.14 Fallback

Si WebGL no está disponible o el Orb falla:

mostrar un fallback visual coherente:

- círculo gradiente;
- halo SVG/CSS;
- waveform simple;
- estado textual.

La entrevista debe seguir siendo funcional.

## 62.1.15 Criterios de aceptación de la extracción

Antes de considerar la integración terminada:

- [ ] el Orb funciona fuera del playground original;
- [ ] no aparece ninguna UI de demo;
- [ ] no existen sliders / debug controls visibles;
- [ ] el Orb mantiene su calidad visual;
- [ ] reacciona al audio real cuando corresponde;
- [ ] soporta `idle`, `listening`, `thinking` y `speaking` o sus equivalentes;
- [ ] no se recrea la escena innecesariamente en cada estado;
- [ ] no existen render loops duplicados;
- [ ] se adapta a mobile/tablet/desktop;
- [ ] el fondo de entrevista no compite con él;
- [ ] reduced motion funciona;
- [ ] fallback funciona;
- [ ] recursos Three.js se liberan correctamente al desmontar;
- [ ] solo se integraron dependencias necesarias del repo `ORB`.

## 62.1.16 Regla crítica para Codex

> No construyas un Audio Orb nuevo si el repositorio `ORB` contiene uno funcional. Inspecciona el repo, identifica el núcleo reusable, extrae únicamente ese núcleo y adáptalo a Conecta Empleo. Elimina todo aquello que pertenezca al playground de prueba. Trata `ORB` como una librería de código fuente especializada, no como una pantalla que deba copiarse.

---

# 63. Performance

Objetivos:

- LCP < 2.5 s en condiciones razonables;
- CLS < 0.1;
- evitar video hero pesado si no es imprescindible;
- lazy-load de imágenes;
- `transform` y `opacity` para motion;
- no animar `width` de layouts complejos si puede usarse `scaleX`;
- comprimir fondos;
- SVG para geometría;
- respetar reduced-motion.

---

# 64. Mobile UX

La experiencia debe ser completamente usable con una mano.

- CTAs principales cerca de la parte inferior;
- bottom nav;
- inputs grandes;
- no usar hover-only;
- evitar tablas horizontales sin alternativa;
- comparación puede usar swipe/carrusel.

---

# 65. Desktop UX

Aprovechar el espacio sin volverlo un dashboard denso.

- máximo 3 columnas para comparación;
- sidebars;
- paneles sticky;
- hero menos alto;
- contenido respirado.

---

# 66. Consistencia cross-journey

Candidato y empresa comparten:

- identidad visual;
- botones;
- inputs;
- motion;
- cards;
- sistema de progreso.

Difieren en:

### Candidato

más humano, desarrollo, progreso personal.

### Empresa

más analítico, comparativo, explicable.

---

# 67. Seguridad y privacidad en UI

Mostrar mensajes breves en puntos críticos:

### CV

`Usaremos tu archivo para estructurar tu perfil y preparar la entrevista.`

### Entrevista

`Tu evaluación se basa en tus respuestas y la evidencia disponible.`

### Empresa

`La identidad del candidato se mantiene oculta en el primer filtro.`

No esconder estas ideas en términos y condiciones.

---

# 68. No hacer

No construir:

- pantallas con 10 gradientes;
- tarjetas sin jerarquía;
- dashboards llenos de widgets;
- IA personificada como robot;
- score sin explicación;
- evaluación de personalidad absoluta;
- colores de semáforo simplistas para personas;
- animaciones exageradas;
- loaders falsos largos;
- navegación distinta en cada pantalla;
- componentes con radios inconsistentes;
- 5 estilos de botones;
- iconos de distintas familias;
- texto diminuto;
- sombras duras;
- glassmorphism excesivo.

---

# 69. Design tokens sugeridos

```css
:root {
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 22px;
  --radius-xl: 28px;
  --radius-pill: 999px;

  --shadow-sm: 0 4px 16px rgba(10, 12, 26, 0.05);
  --shadow-md: 0 10px 32px rgba(10, 12, 26, 0.08);
  --shadow-lg: 0 20px 64px rgba(10, 12, 26, 0.12);

  --duration-fast: 160ms;
  --duration-normal: 320ms;
  --duration-slow: 560ms;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

# 70. Orden recomendado de construcción

## Fase 1 — Foundations

Construir:

- tokens;
- tipografía;
- buttons;
- inputs;
- cards;
- nav;
- badges;
- motion primitives.

## Fase 2 — candidato

Construir primero:

1. login;
2. onboarding;
3. CV;
4. entrevista;
5. resultado;
6. perfil verificado;
7. oportunidades.

## Fase 3 — empresa

1. login;
2. empresa;
3. vacante;
4. perfil ideal;
5. talento compatible;
6. detalle;
7. comparación;
8. selección.

## Fase 4 — polish

- responsive;
- accessibility;
- loading;
- empty;
- error;
- reduced-motion;
- visual consistency.

---

# 71. Criterios de aceptación visual

La UI NO se considera terminada hasta que:

- [ ] el sistema se siente como una sola marca;
- [ ] no existen pantallas “genéricas” visualmente;
- [ ] todos los CTA principales usan el mismo lenguaje;
- [ ] todos los scores relevantes están explicados;
- [ ] los gráficos se animan;
- [ ] los reveals son suaves;
- [ ] no hay saltos de layout;
- [ ] el flujo candidato funciona mobile-first;
- [ ] el flujo empresa funciona en desktop y mobile;
- [ ] se respeta anonimato en primer filtro;
- [ ] existen estados de loading;
- [ ] existen empty states;
- [ ] existen errores;
- [ ] keyboard focus funciona;
- [ ] reduced-motion funciona;
- [ ] no se usan fotografías donde el flujo exige anonimato;
- [ ] no existen frases que presenten a la IA como juez absoluto;
- [ ] los fondos abstractos fueron movidos fuera de la raíz del repositorio a una estructura de assets mantenible;
- [ ] los fondos funcionan como atmósfera y no compiten con contenido o CTAs;
- [ ] las pantallas densas conservan superficies claras y limpias;
- [ ] ninguna pantalla usa un fondo abstracto solo por disponibilidad del asset;
- [ ] texto sobre imagen cumple contraste AA mediante overlay cuando sea necesario;
- [ ] los crops fueron revisados en mobile, tablet y desktop;
- [ ] no hay más de 1–2 cards abstractas protagonistas simultáneamente en una pantalla salvo justificación explícita;
- [ ] los assets fuera del primer viewport usan lazy loading cuando corresponde;
- [ ] el Audio Orb conserva protagonismo sobre `fondo_entrevista`.

---

# 72. Criterios de aceptación de motion

- [ ] page entrance consistente;
- [ ] stagger en grupos de cards;
- [ ] progress rings 0→valor;
- [ ] progress bars 0→valor;
- [ ] score count-up;
- [ ] filtros animados;
- [ ] buttons con microinteracción;
- [ ] step transitions;
- [ ] interview visualizer reactivo o procedural;
- [ ] loading contextual;
- [ ] modal/drawer transitions;
- [ ] hover y active states;
- [ ] reduced-motion fallback.

---

# 73. Prompt operativo corto para Codex

Usa el documento completo como fuente de verdad. Antes de implementar cualquier pantalla:

1. identifica si pertenece al journey candidato o empresa;
2. conserva la identidad visual definida;
3. usa los design tokens;
4. prioriza mobile-first;
5. implementa responsive desktop;
6. añade estados de loading/error/empty;
7. añade motion;
8. valida accesibilidad;
9. respeta la privacidad;
10. no inventes decisiones de UX que contradigan la lógica funcional;
11. detecta los fondos abstractos ubicados inicialmente en la raíz del repositorio, muévelos a una estructura de assets siguiendo las mejores prácticas del framework y actualiza sus referencias;
12. no uses los fondos como wallpapers obligatorios: emplea hero, franjas, cards destacadas o crops parciales;
13. mantén formularios, listas, comparadores y zonas analíticas principalmente sobre superficies claras;
14. controla los fondos mediante overlays, opacidad, saturación y crop para garantizar que el contenido tenga siempre mayor protagonismo;
15. existe un repositorio separado llamado `ORB`: inspecciónalo y extrae exclusivamente el núcleo reusable del Audio Orb Three.js, incluyendo únicamente shaders, lógica de render, análisis de audio, estados y helpers estrictamente necesarios;
16. no integres la interfaz beta/playground del repo `ORB`, sus sliders, controles, botones de demo, debug panels, sample audio, wrappers o estilos globales;
17. integra el Orb extraído como componente desacoplado dentro del flujo de entrevista y conecta sus estados a `idle`, `listening`, `thinking` y `speaking` o a los equivalentes existentes;
18. no reescribas desde cero un Orb que ya funciona: prioriza extraer, desacoplar, optimizar e integrar.

La salida debe sentirse como un producto listo para demo de hackatón, no como wireframe.

---

# 74. Prompt madre — versión directa para copiar en Codex

> Construye el front-end de **Conecta Empleo**, un marketplace de talento verificado por IA. La experiencia debe verse premium, moderna, humana, tecnológica y confiable, siguiendo una estética de negro/azul profundo + superficies blancas + acentos índigo/violeta. Usa tipografía sans-serif editorial, cards amplias con bordes redondeados, iconografía lineal, fotografía monocromática y una familia de fondos abstractos semánticos en azul/índigo/violeta (`fondo_marca`, `fondo_entrevista`, `fondo_matching`, `fondo_resultados`, `fondo_perfil`, `fondo_empresa`, `fondo_onboarding`, `fondo_cards`). Estos fondos son atmósferas de marca y deben ocupar un rol secundario frente al contenido, siguiendo aproximadamente una relación 80% UI limpia / 20% recurso visual.
>
> Implementa dos journeys coherentes: candidato y empresa.
>
> Para candidato, prioriza: registro, onboarding, carga o creación de CV, preparación de entrevista, entrevista con IA, resultado, perfil verificado, oportunidades y postulación.
>
> Para empresa, prioriza: registro/verificación, creación de vacante, definición de perfil ideal, marketplace de talento, detalle anónimo, comparación, selección y desbloqueo de identidad.
>
> La interfaz debe respetar un principio crítico: en el primer filtro empresarial se ocultan nombre, foto, edad y género. La empresa ve inicialmente evidencia, habilidades, experiencia, compatibilidad, ubicación aproximada y disponibilidad.
>
> Todo matching debe ser explicable: nunca muestres solo un porcentaje. Acompaña scores con criterios y evidencia.
>
> Motion design obligatorio: cada pantalla debe tener una secuencia de entrada suave; secciones con fade + translate + blur mínimo; cards con stagger; transiciones entre pasos; gráficos que se rellenan desde cero; anillos y porcentajes con count-up; barras de progreso animadas; filtros con transición; botones con microinteracciones; loaders contextuales; checkmarks animados; modales y drawers fluidos; hero con ambient motion discreto; entrevista con visualizador de voz reactivo o procedural. Respeta `prefers-reduced-motion`.
>
> Los formularios deben sentirse simples y divididos por pasos. Usa inputs de 56 px, radios de 16–20 px, cards de 20–28 px, CTAs pill de 52–60 px y un sistema consistente de 8 px.
>
> Mobile: bottom nav, una columna y CTAs al alcance del pulgar. Desktop: sidebar, max-width 1180–1320 px, 2–3 columnas donde convenga y paneles sticky para comparación.
>
> Usa componentes reutilizables y design tokens. No uses un kit UI sin personalización. No uses robots, circuitos, dashboards genéricos, glassmorphism excesivo ni animaciones llamativas. No presentes a la IA como juez de personalidad o verdad absoluta.
>
> Existe además un repositorio separado llamado `ORB` que contiene el Audio Orb Three.js ya construido. No copies su aplicación beta completa ni su playground. Inspecciona ese repositorio y extrae únicamente el componente visual reusable y sus dependencias estrictamente necesarias: escena Three.js, geometría, shaders, materiales, lógica audio-reactiva, estados, smoothing, resize, performance y cleanup. Elimina sliders, botones de prueba, sample audio, paneles de debug, wrappers, fondos y estilos globales propios de la demo. Integra el Orb como componente aislado dentro de la entrevista de Conecta Empleo y conecta sus estados a la conversación real. No reconstruyas un Orb nuevo si el existente funciona.

> El producto debe comunicar: evidencia, confianza, progreso, oportunidad y claridad.
>
> Antes de considerar una pantalla finalizada, verifica responsive, accesibilidad AA, loading, empty, error, focus, reduced motion, jerarquía tipográfica, coherencia de botones y consistencia de motion.

---

# 74.1 Mapa rápido de uso de fondos por pantalla

| Pantalla / contexto | Asset recomendado | Presencia |
|---|---|---|
| Login candidato | `fondo_marca` | Alta controlada |
| Login empresa | `fondo_empresa` o `fondo_marca` | Alta controlada |
| Onboarding candidato | `fondo_onboarding` | Media |
| Onboarding empresa | `fondo_onboarding` o `fondo_empresa` | Media |
| Preparación entrevista | `fondo_entrevista` | Media |
| Entrevista en curso | `fondo_entrevista` | Media, detrás del Orb |
| Resultado entrevista | `fondo_resultados` | Media/alta en hero |
| Perfil verificado | `fondo_perfil` | Media en hero |
| Marketplace candidato | `fondo_marca` o sin fondo | Baja |
| Nueva vacante | `fondo_empresa` | Media en hero |
| Perfil ideal | preferentemente sin fondo abstracto en cuerpo | Baja |
| Talento compatible | `fondo_matching` | Baja/media en header |
| Detalle anónimo | `fondo_matching` solo como acento | Baja |
| Comparar talento | preferentemente superficie clara | Muy baja |
| Finalistas | `fondo_matching` o `fondo_empresa` solo en header | Baja |
| Cards destacadas | `fondo_cards` | Baja |
| Preview de vacante | `fondo_cards` | Media dentro de una sola card |

Regla final:

> Si existe duda entre usar o no usar un fondo, empezar sin él. Añadirlo únicamente si mejora claramente la jerarquía y la personalidad de marca.

---

# 75. Nota final de dirección creativa

Conecta Empleo debe causar una primera impresión fuerte, pero la sofisticación no debe depender de “efectos”.

La sensación premium debe surgir de:

- proporciones;
- jerarquía;
- aire;
- ritmo;
- tipografía;
- iluminación;
- coherencia;
- microinteracciones;
- velocidad percibida;
- explicabilidad;
- claridad del proceso.

El usuario debe sentir que la plataforma “lo acompaña” y que cada etapa fluye naturalmente hacia la siguiente.

El estándar visual deseado es:

> **una experiencia de producto seria, contemporánea y memorable, donde la IA se percibe avanzada porque la interfaz es clara, útil y elegante, no porque esté llena de elementos futuristas.**
