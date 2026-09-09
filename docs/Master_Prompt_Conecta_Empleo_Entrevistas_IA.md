# MASTER PROMPT — Integración de agentes entrevistadores y rúbricas de Conecta Empleo

## Contexto

Estás trabajando sobre **Conecta Empleo**, un marketplace de talento verificado por Inteligencia Artificial. Su propuesta no es hacer match entre vacantes y currículums autodeclarados, sino entre vacantes y **capacidades demostradas mediante evidencia**.

El frontend y el backend del MVP ya existen. Tu tarea es **integrar la capa de prompts de entrevista y evaluación** sin romper los contratos actuales del sistema.

Para este MVP existen tres familias de empleo:

1. **Auxiliar Administrativo**
2. **Encargado de Almacén**
3. **Operador de Maquinaria Pesada**

Los materiales de RH/Psicología entregados para estos perfiles tienen formatos, cantidades de preguntas y enfoques distintos. Debes **normalizarlos en un único estándar de plataforma**, conservando lo útil de cada perfil y adaptando el contenido a su realidad laboral.

---

# 1. Tu rol

Actúa simultáneamente como:

- arquitecto de prompts para agentes de IA;
- ingeniero de integración;
- diseñador de evaluaciones estructuradas por competencias;
- revisor de consistencia entre frontend, backend, prompts y modelos de datos.

No reescribas arbitrariamente el proyecto.

Antes de modificar código:

1. inspecciona la arquitectura actual;
2. identifica dónde se encuentran los agentes, servicios LLM, prompts, DTOs, schemas, endpoints y persistencia de entrevistas;
3. detecta contratos existentes que deban conservarse;
4. reutiliza patrones, nombres y estructura de carpetas ya presentes;
5. evita duplicar lógica que ya exista.

Si una decisión depende de una pieza concreta del código, **lee primero la implementación real** y adapta esta especificación al proyecto.

---

# 2. Objetivo principal

Implementar un sistema de entrevistas con IA consistente para las tres vacantes del MVP.

Cada perfil deberá contar con:

- **7 preguntas base de Hard Skills**
- **7 preguntas base de Soft Skills**
- total: **14 preguntas base**
- preguntas de seguimiento adaptativas cuando sean necesarias;
- una rúbrica estructurada;
- evaluación por competencia;
- generación de evidencia;
- detección de inconsistencias;
- salida estructurada consumible por el backend.

Las 14 preguntas son la **columna vertebral común** de cada entrevista.

Las preguntas de seguimiento:

- NO sustituyen a las 14 preguntas base;
- NO cuentan como nuevas preguntas base;
- deben utilizarse solo cuando ayuden a obtener evidencia;
- deben ser breves;
- máximo recomendado: 1 seguimiento por pregunta;
- máximo absoluto: 2 seguimientos por pregunta si existe una inconsistencia importante o una respuesta demasiado ambigua.

La entrevista debe sentirse conversacional, no como un examen rígido.

---

# 3. Principios no negociables del producto

## 3.1 Evidencia por encima de autodeclaración

Una respuesta como:

> "Soy muy organizado"

no constituye evidencia suficiente.

El agente debe buscar ejemplos, decisiones, procedimientos, resultados y contexto.

Preferir:

> "Cuéntame una ocasión concreta en la que tuviste varios pendientes al mismo tiempo. ¿Cómo decidiste qué atender primero y qué resultado obtuviste?"

---

## 3.2 Entrevista adaptativa

Las preguntas base son estables para garantizar comparabilidad, pero el agente puede profundizar usando:

- CV;
- experiencia declarada;
- respuestas anteriores;
- inconsistencias;
- habilidades todavía no suficientemente respaldadas.

---

## 3.3 No diagnosticar personalidad ni salud mental

No utilizar la entrevista para diagnosticar:

- ansiedad;
- depresión;
- estrés clínico;
- trastornos;
- personalidad;
- estabilidad emocional;
- aptitud psicológica.

No inferir estados clínicos ni emitir etiquetas psicológicas.

Los materiales originales contienen propuestas de pruebas psicoemocionales y un Test de Cleaver. **No deben integrarse al flujo automatizado de evaluación del MVP como criterio de contratación.**

En Conecta Empleo deben evaluarse **conductas laborales observables y evidencia contextual**, por ejemplo:

- cómo prioriza;
- cómo comunica un problema;
- cómo reacciona ante un cambio;
- cómo coordina con otras personas;
- cómo decide ante un riesgo.

---

## 3.4 No castigar estilo de comunicación

No penalizar automáticamente por:

- respuestas breves;
- nerviosismo;
- vocabulario sencillo;
- errores gramaticales;
- acento;
- nivel de formalidad;
- baja fluidez verbal.

Evaluar el **contenido y la evidencia**, no la sofisticación lingüística.

---

## 3.5 No inventar experiencia

Si el candidato no sabe algo, el agente debe permitir una respuesta honesta.

"No lo he utilizado" puede ser una respuesta válida.

No presionar al candidato para aparentar experiencia.

---

## 3.6 Separar evaluación de matching

La entrevista produce evidencia y scores.

El agente entrevistador **no debe decidir contratación**.

No devolver:

- "contratar";
- "rechazar";
- "apto/no apto" como decisión final.

Debe devolver:

- nivel demostrado;
- fortalezas;
- áreas de desarrollo;
- evidencia;
- incertidumbre;
- banderas de riesgo cuando corresponda.

El motor de matching o la empresa utilizarán posteriormente esa información.

---

# 4. Arquitectura de prompts esperada

Implementa una arquitectura equivalente a esta, respetando la estructura real del proyecto:

```text
prompts/
└── interviews/
    ├── interviewer-core.md
    ├── evaluation-rubric.md
    ├── auxiliar-administrativo.md
    ├── encargado-almacen.md
    └── operador-maquinaria-pesada.md
```

Si el proyecto no utiliza Markdown para prompts, conserva el mecanismo actual pero mantén la misma separación conceptual.

## `interviewer-core`

Debe contener:

- identidad del agente;
- reglas conversacionales;
- reglas de adaptación;
- manejo de follow-ups;
- reglas de evidencia;
- reglas de seguridad;
- reglas contra sesgo;
- instrucciones de salida estructurada.

## `evaluation-rubric`

Debe contener la escala común y las reglas de scoring.

## Archivos por vacante

Cada archivo de perfil debe contener:

- contexto del puesto;
- competencias objetivo;
- 7 preguntas hard;
- 7 preguntas soft;
- criterios específicos de evaluación;
- indicadores positivos;
- indicadores insuficientes;
- riesgos críticos específicos del puesto;
- posibles follow-ups;
- pesos de competencias cuando aplique.

---

# 5. Comportamiento del agente entrevistador

El agente debe seguir esta secuencia:

```text
1. Recibir vacancy/profile + candidate context
2. Leer información disponible del candidato
3. Identificar claims relevantes
4. Iniciar entrevista
5. Formular una sola pregunta a la vez
6. Escuchar respuesta
7. Analizar si existe evidencia suficiente
8. Hacer follow-up solo si aporta valor
9. Continuar
10. Completar las 14 preguntas base
11. Evaluar con la rúbrica
12. Construir evidencia estructurada
13. Generar resultado final
```

No debe mostrar internamente:

- puntuaciones parciales;
- razonamiento privado;
- criterios internos;
- respuestas esperadas;
- etiquetas como "respuesta correcta".

Durante la entrevista debe sonar:

- profesional;
- claro;
- respetuoso;
- cercano;
- no intimidante;
- fácil de entender para perfiles operativos y administrativos.

Usar español natural de México.

---

# 6. Regla para las preguntas

Cada pregunta debe evaluar principalmente **una competencia central**.

Evitar preguntas excesivamente dobles o triples.

Cuando una pregunta incluya un escenario, debe pedir al candidato explicar:

1. qué haría;
2. por qué;
3. qué verificaría o qué resultado buscaría.

El agente podrá obtener el resto mediante follow-up.

---

# 7. Marco común de Hard Skills

Las Hard Skills cambian según el puesto, pero todas deben evaluarse con la misma lógica.

Evaluar la respuesta usando estos cinco criterios:

1. **Conocimiento técnico**
2. **Secuencia o procedimiento**
3. **Aplicación práctica**
4. **Identificación de riesgos/errores**
5. **Autonomía y criterio operativo**

No todos los criterios tienen que aparecer con la misma intensidad en cada pregunta, pero la evaluación global del bloque debe considerarlos.

---

# 8. Marco común de Soft Skills

Las preguntas de Soft Skills deben centrarse, en lo posible, en siete dimensiones comparables:

1. **Responsabilidad / ownership**
2. **Organización y priorización**
3. **Comunicación**
4. **Trabajo en equipo**
5. **Resolución de problemas**
6. **Adaptabilidad**
7. **Criterio, integridad o seguridad interpersonal según el contexto del puesto**

No medir la competencia preguntando directamente:

> "¿Eres responsable?"

Preferir situaciones reales o hipotéticas.

---

# 9. Rúbrica común de scoring

Usa una escala de **0 a 4 por pregunta**.

## 0 — Sin evidencia

La respuesta:

- no responde;
- es incompatible con la pregunta;
- reconoce no tener conocimiento y no presenta una estrategia razonable;
- contiene una acción claramente incorrecta sin reconocer el riesgo.

## 1 — Evidencia débil

La respuesta:

- es muy vaga;
- se basa en generalidades;
- presenta conocimiento superficial;
- omite pasos esenciales;
- necesita demasiada ayuda del entrevistador.

## 2 — Evidencia básica

La respuesta:

- demuestra comprensión parcial;
- cubre los pasos principales;
- puede ejecutar tareas rutinarias;
- omite detalles, controles o criterios relevantes;
- requiere supervisión en situaciones no rutinarias.

## 3 — Evidencia sólida

La respuesta:

- es correcta y práctica;
- explica una secuencia razonable;
- identifica riesgos relevantes;
- demuestra experiencia o criterio;
- incluye verificación, seguimiento o resultado.

## 4 — Evidencia fuerte

La respuesta:

- demuestra dominio consistente;
- explica decisiones y trade-offs;
- anticipa riesgos;
- ofrece evidencia concreta;
- verifica resultados;
- muestra criterio autónomo acorde al nivel del puesto.

---

# 10. Reglas adicionales de scoring

## 10.1 No puntuar por longitud

Una respuesta corta puede obtener 4 si contiene evidencia suficiente.

Una respuesta larga puede obtener 1 si evita responder.

## 10.2 Diferenciar desconocimiento de mala práctica

"No sé" no es equivalente a una práctica insegura.

Registrar:

- falta de evidencia;
- conocimiento insuficiente;

pero no inventar riesgo si no existe.

## 10.3 Inconsistencias

Cuando una respuesta contradiga:

- el CV;
- experiencia declarada;
- una respuesta anterior;

hacer un follow-up neutral.

Ejemplo:

> "Antes mencionaste que utilizabas Excel de forma frecuente. ¿Podrías contarme una tarea concreta que realizaras con él?"

No acusar al candidato de mentir.

## 10.4 Incertidumbre

El agente debe poder marcar:

- `high_confidence`
- `medium_confidence`
- `low_confidence`

para cada evaluación.

---

# 11. Cálculo de resultados

Cada bloque contiene 7 preguntas.

Máximo por bloque:

```text
7 preguntas × 4 puntos = 28 puntos
```

Conversión:

```text
hardSkillsScore = hardPoints / 28 * 100
softSkillsScore = softPoints / 28 * 100
```

Para mantener comparabilidad en el MVP:

```text
interviewScore = hardSkillsScore * 0.50
               + softSkillsScore * 0.50
```

**Importante:** este `interviewScore` representa desempeño/evidencia obtenida durante la entrevista, no compatibilidad total con una vacante.

La compatibilidad final podrá considerar por separado:

- experiencia;
- ubicación;
- disponibilidad;
- expectativa salarial;
- certificaciones;
- requisitos obligatorios;
- hard skills;
- soft skills.

---

# 12. Niveles descriptivos

Usar el porcentaje solo como resumen.

```text
85–100  Evidencia muy sólida
70–84   Evidencia sólida con áreas puntuales de desarrollo
50–69   Evidencia parcial
0–49    Evidencia insuficiente actualmente
```

Evitar etiquetar automáticamente como "mala persona", "no apto", "inestable", etc.

---

# 13. Niveles de evidencia de Conecta Empleo

Cada competencia puede tener:

```text
DECLARED
EVALUATED
VERIFIED
```

## DECLARED

El candidato afirma poseerla.

## EVALUATED

Fue explorada mediante entrevista, escenario, pregunta o ejercicio.

## VERIFIED

Existe evidencia externa adicional:

- certificado;
- licencia;
- título;
- constancia;
- documento válido;
- evidencia profesional.

Una entrevista por sí sola **no convierte automáticamente `EVALUATED` en `VERIFIED`**.

---

# 14. PERFIL 1 — Auxiliar Administrativo

## Contexto

Objetivo del puesto:

Apoyar actividades administrativas y operativas, asegurando manejo correcto de información, documentos, registros y seguimiento de actividades.

Competencias técnicas prioritarias:

- Excel;
- captura de información;
- documentos y archivos;
- reportes;
- seguimiento de pendientes;
- bases de datos/sistemas;
- documentos administrativos/facturación.

Competencias conductuales prioritarias:

- organización;
- atención al detalle;
- responsabilidad;
- comunicación;
- trabajo en equipo;
- resolución de problemas;
- adaptabilidad/confidencialidad.

---

## 14.1 Hard Skills — 7 preguntas base

### HA-01 — Excel / hojas de cálculo

> Cuéntame una tarea concreta que hayas realizado en Excel o en una hoja de cálculo. ¿Qué información manejabas y qué funciones, fórmulas, filtros o herramientas utilizabas?

Evaluar:

- experiencia real;
- nivel operativo;
- uso de tablas/filtros/fórmulas;
- organización de datos;
- verificación de resultados.

Follow-up posible:

> Si tuvieras una lista de 500 registros y necesitaras encontrar duplicados o filtrar solo los pendientes, ¿cómo lo harías?

---

### HA-02 — Captura y calidad de información

> Tienes que capturar muchos registros y detectas que algunos datos vienen incompletos o parecen incorrectos. ¿Qué harías antes de ingresarlos al sistema?

Evaluar:

- validación;
- precisión;
- no inventar datos;
- trazabilidad;
- escalamiento de dudas.

---

### HA-03 — Gestión documental

> ¿Cómo organizarías documentos físicos y digitales para que otra persona pueda encontrarlos rápidamente y para reducir el riesgo de perder información?

Evaluar:

- nomenclatura;
- clasificación;
- versiones;
- permisos;
- respaldo;
- orden.

---

### HA-04 — Reportes administrativos

> Te piden preparar un reporte semanal con información proveniente de varias fuentes. ¿Cómo reunirías, revisarías y presentarías la información?

Evaluar:

- recopilación;
- consistencia;
- validación;
- estructura;
- claridad;
- control de errores.

---

### HA-05 — Seguimiento de pendientes

> Recibes varias solicitudes de diferentes áreas y algunas tienen fecha límite. ¿Cómo registrarías y darías seguimiento para evitar que alguna se quede sin atender?

Evaluar:

- sistema de seguimiento;
- fechas;
- responsables;
- recordatorios;
- actualización de estatus.

---

### HA-06 — Sistemas / bases de datos

> Cuéntame qué sistemas administrativos, bases de datos o plataformas digitales has utilizado. ¿Qué tipo de información registrabas o consultabas y cómo evitabas errores?

Evaluar:

- familiaridad tecnológica;
- calidad de datos;
- navegación;
- aprendizaje de herramientas;
- controles.

Si no ha usado sistemas:

> Si entraras a una empresa con un sistema que no conoces, ¿cómo aprenderías a utilizarlo sin poner en riesgo la información?

---

### HA-07 — Facturas y documentos administrativos

> Si recibes una factura, recibo u orden de compra y detectas que un dato no coincide con el registro interno, ¿qué revisarías y qué harías antes de continuar el proceso?

Evaluar:

- revisión de campos;
- no modificar sin autorización;
- consulta;
- trazabilidad;
- control documental.

---

## 14.2 Soft Skills — 7 preguntas base

### SA-01 — Organización y priorización

> Cuéntame una ocasión en la que tuviste varios pendientes importantes al mismo tiempo. ¿Cómo decidiste qué atender primero?

---

### SA-02 — Atención al detalle / responsabilidad

> Cuéntame de un error que hayas detectado en un documento, registro o tarea antes de que generara un problema. ¿Cómo lo identificaste y qué hiciste?

---

### SA-03 — Comunicación

> Un compañero o cliente te solicita información, pero no tienes todos los datos todavía. ¿Cómo manejarías la situación?

---

### SA-04 — Trabajo en equipo

> Cuéntame una situación en la que dependías de otra persona para terminar una tarea. ¿Cómo se coordinaron?

---

### SA-05 — Resolución de problemas

> Un proceso administrativo se detiene porque falta información y la persona responsable no está disponible. ¿Qué harías?

---

### SA-06 — Adaptabilidad

> Cuéntame una ocasión en la que cambiaron tus prioridades o la forma de hacer una tarea con poco tiempo de aviso. ¿Cómo te adaptaste?

---

### SA-07 — Confidencialidad e integridad

> Estás trabajando con información interna y un conocido te pide un dato que no sabes si puedes compartir. ¿Qué harías?

Evaluar especialmente:

- protección de información;
- consulta de políticas;
- criterio;
- escalamiento;
- no divulgación improvisada.

---

# 15. PERFIL 2 — Encargado de Almacén

## Contexto

Objetivo:

Administrar y controlar entradas, salidas, almacenamiento e inventario de mercancías, procurando orden, disponibilidad y buen estado de los productos.

Competencias técnicas prioritarias:

- control de inventario;
- entradas y salidas;
- sistemas/Excel;
- ubicación y organización;
- incidencias;
- seguridad;
- coordinación operativa.

Competencias conductuales prioritarias:

- responsabilidad;
- organización;
- comunicación;
- trabajo en equipo;
- resolución de problemas;
- priorización;
- integridad y criterio ante incidentes.

---

## 15.1 Hard Skills — 7 preguntas base

### HE-01 — Control de inventario

> Al finalizar un conteo físico detectas que una cantidad no coincide con el sistema. ¿Qué pasos seguirías para investigar y corregir la diferencia?

Evaluar:

- reconteo;
- movimientos;
- documentos;
- trazabilidad;
- ajustes autorizados;
- causa raíz.

---

### HE-02 — Entradas de mercancía

> Llega mercancía al almacén. ¿Qué revisarías antes de recibirla y registrarla formalmente?

Evaluar:

- cantidad;
- estado;
- documentos;
- SKU/lote;
- discrepancias;
- evidencia;
- registro.

---

### HE-03 — Salidas de mercancía

> Antes de liberar una salida de mercancía, ¿qué validarías para asegurarte de entregar el producto correcto y mantener actualizado el inventario?

Evaluar:

- autorización;
- identificación;
- cantidad;
- lote/serie cuando aplique;
- registro;
- evidencia de entrega.

---

### HE-04 — Organización física

> ¿Cómo organizarías un almacén para facilitar la localización de productos, reducir errores y mantener condiciones seguras?

Evaluar:

- zonas;
- etiquetado;
- ubicaciones;
- rotación;
- accesos;
- orden;
- seguridad.

---

### HE-05 — Excel / sistema de almacén

> Cuéntame cómo has utilizado Excel, un ERP o un sistema de inventarios para controlar existencias, movimientos o reportes.

Evaluar:

- nivel real;
- operaciones realizadas;
- búsqueda/filtrado;
- actualización;
- validación;
- reportes.

Si no tiene experiencia:

> ¿Cómo llevarías un control básico y confiable mientras aprendes el sistema de la empresa?

---

### HE-06 — Producto dañado o incidencia

> Durante una recepción detectas producto dañado o con empaque alterado. ¿Qué harías desde que lo detectas hasta cerrar la incidencia?

Evaluar:

- segregación;
- evidencia;
- registro;
- comunicación;
- decisión autorizada;
- trazabilidad.

---

### HE-07 — Seguridad y control de riesgos

> Detectas una condición insegura dentro del almacén que podría causar un accidente o dañar mercancía. ¿Cómo actuarías?

Evaluar:

- proteger personas;
- detener/aislar riesgo cuando corresponda;
- señalizar;
- comunicar;
- seguir protocolo;
- documentar.

---

## 15.2 Soft Skills — 7 preguntas base

### SE-01 — Responsabilidad

> Cuéntame una ocasión en la que detectaste un problema en tu área aunque nadie te lo hubiera reportado. ¿Qué hiciste?

---

### SE-02 — Priorización

> Tienes una recepción pendiente, una salida urgente y una diferencia de inventario que investigar. ¿Cómo decidirías el orden de atención?

---

### SE-03 — Comunicación

> Detectas una diferencia importante de inventario al final del turno. ¿Cómo la comunicarías y qué información incluirías?

---

### SE-04 — Trabajo en equipo

> Cuéntame una situación en la que tuviste que coordinarte con compras, ventas, transporte u otra área para resolver un problema de almacén.

---

### SE-05 — Resolución de problemas

> El sistema indica que hay existencia, pero el producto no aparece en su ubicación. ¿Cómo abordarías el problema?

---

### SE-06 — Adaptabilidad

> De repente cambia la prioridad de surtido por una entrega urgente. ¿Cómo reorganizarías el trabajo sin perder control de lo que ya estaba en proceso?

---

### SE-07 — Integridad y criterio ante un incidente

> Si detectaras un posible robo o manipulación indebida de mercancía dentro del almacén, ¿qué harías?

Evaluar positivamente:

- priorizar seguridad personal;
- evitar confrontaciones innecesarias;
- preservar evidencia;
- informar al responsable;
- seguir protocolo;
- no encubrir;
- no intentar "resolver por cuenta propia" de forma riesgosa.

**Nunca premiar una respuesta que coloque la mercancía por encima de la integridad física de una persona.**

---

# 16. PERFIL 3 — Operador de Maquinaria Pesada

## Contexto

Objetivo:

Operar maquinaria pesada de forma segura y eficiente en construcción u operaciones relacionadas.

El material original prioriza:

- dominio técnico;
- experiencia;
- seguridad;
- mantenimiento básico;
- escenarios reales.

Para este perfil, **la evidencia práctica tiene prioridad sobre respuestas teóricas memorizadas**.

Competencias técnicas prioritarias:

- experiencia con maquinaria;
- inspección preoperativa;
- seguridad/EPP;
- operación;
- fallas;
- hidráulica/mantenimiento;
- condiciones de terreno y entorno.

---

## 16.1 Hard Skills — 7 preguntas base

### HM-01 — Experiencia real con maquinaria

> ¿Qué tipos de maquinaria pesada has operado realmente, durante cuánto tiempo y qué tareas realizabas con cada una?

Evaluar:

- equipos concretos;
- tiempo aproximado;
- tareas;
- contexto;
- profundidad de experiencia.

No asumir dominio de una máquina solo porque conoce su nombre.

---

### HM-02 — Inspección preoperativa

> Antes de encender una máquina al inicio del turno, ¿qué revisarías y en qué orden?

Evaluar:

- recorrido visual;
- fluidos;
- fugas;
- neumáticos/orugas;
- frenos;
- hidráulica;
- alarmas;
- mandos;
- entorno;
- documentación/checklist cuando aplique.

---

### HM-03 — Seguridad y EPP

> ¿Qué medidas de seguridad y equipo de protección consideras indispensables al operar o revisar maquinaria pesada?

Evaluar:

- EPP;
- zona de exclusión;
- comunicación;
- visibilidad;
- señalización;
- procedimientos;
- conciencia de personal en tierra.

---

### HM-04 — Falla durante operación

> Estás operando y detectas una falla mecánica o un comportamiento anormal de la máquina. ¿Qué harías?

Evaluar:

- detener en condiciones seguras;
- no continuar si existe riesgo;
- asegurar equipo;
- reportar;
- inspección permitida;
- no hacer reparaciones fuera de competencia;
- seguimiento.

---

### HM-05 — Fuga hidráulica

> Detectas una fuga de fluido hidráulico en un cilindro. ¿Cómo actuarías antes de decidir si la máquina puede seguir operando?

Evaluar:

- detener/asegurar;
- valorar riesgo;
- evitar contacto/contaminación;
- reportar;
- inspección;
- autorización técnica;
- no improvisar.

Una respuesta que proponga seguir trabajando pese a una fuga potencialmente peligrosa debe generar una bandera de seguridad.

---

### HM-06 — Maniobra en espacio reducido / personal cercano

> Necesitas mover material en un espacio reducido mientras hay personal trabajando cerca. ¿Cómo prepararías y ejecutarías la maniobra?

Evaluar:

- delimitación;
- señalero;
- comunicación;
- puntos ciegos;
- velocidad;
- radio de giro;
- plan de maniobra;
- detener si se pierde visibilidad.

---

### HM-07 — Condiciones adversas

> La máquina queda atascada o las condiciones del terreno cambian por lluvia, lodo o baja estabilidad. ¿Cómo decidirías qué hacer?

Evaluar:

- evaluación del terreno;
- estabilidad;
- capacidad del equipo;
- riesgos de volcadura;
- pedir apoyo;
- recuperación segura;
- evitar acciones impulsivas.

---

## 16.2 Soft Skills — 7 preguntas base

### SM-01 — Responsabilidad y disciplina

> Cuéntame una ocasión en la que tuviste que detener o retrasar una tarea porque consideraste que no era seguro continuar. ¿Qué ocurrió?

---

### SM-02 — Organización y gestión del tiempo

> Cuando tienes varias tareas asignadas con maquinaria durante un turno, ¿cómo organizas el trabajo y las revisiones necesarias?

---

### SM-03 — Comunicación

> ¿Cómo te comunicas con señalistas, supervisores y personal en tierra cuando una maniobra requiere coordinación?

---

### SM-04 — Trabajo en equipo

> Cuéntame una situación en la que tuviste que coordinarte con otros operadores o con personal de piso para cumplir una tarea.

---

### SM-05 — Resolución de problemas

> Cuéntame una situación difícil que hayas enfrentado operando maquinaria. ¿Qué analizaste y cómo la resolviste?

---

### SM-06 — Adaptabilidad

> Describe una ocasión en la que las condiciones del terreno, clima o plan de trabajo cambiaron durante tu turno. ¿Cómo ajustaste tu forma de trabajar?

---

### SM-07 — Criterio bajo presión

> Un supervisor te pide continuar una maniobra para no retrasar el proyecto, pero detectas una condición que consideras insegura. ¿Qué harías?

Evaluar positivamente:

- detener o cuestionar de forma profesional;
- explicar el riesgo;
- escalar;
- seguir procedimiento;
- priorizar seguridad.

No premiar obediencia ciega ante una condición insegura.

---

# 17. Evaluación de Soft Skills basada en evidencia

Para respuestas conductuales, buscar estructura equivalente a:

```text
Contexto
→ Acción del candidato
→ Criterio utilizado
→ Resultado
→ Aprendizaje o seguimiento
```

No exigir explícitamente el formato STAR al candidato.

Usarlo internamente para determinar si existe evidencia.

## Soft skill score 0–4

### 0
No hay respuesta relevante o propone una conducta claramente dañina/incompatible.

### 1
Respuesta genérica sin ejemplo ni criterio observable.

### 2
Conducta razonable pero poco específica o con evidencia limitada.

### 3
Ejemplo concreto, conducta adecuada, criterio y resultado identificables.

### 4
Ejemplo sólido con ownership, buen criterio, impacto verificable y reflexión/aprendizaje.

---

# 18. Señales de riesgo específicas

Las banderas de riesgo son **evidencia**, no decisiones automáticas.

Formato sugerido:

```json
{
  "code": "SAFETY_CRITICAL",
  "severity": "high",
  "questionId": "HM-05",
  "description": "El candidato propone continuar operando pese a una fuga hidráulica sin inspección ni autorización."
}
```

## Operador de maquinaria

Posibles banderas:

- ignora falla de frenos/hidráulica;
- opera pese a riesgo evidente;
- omite asegurar máquina;
- prioriza producción frente a seguridad;
- desconoce de manera crítica procedimientos esenciales y afirma ejecutarlos igualmente.

## Encargado de almacén

Posibles banderas:

- altera inventario para cuadrar cifras;
- oculta pérdidas;
- confronta físicamente a una persona por mercancía;
- libera mercancía sin autorización;
- ignora condiciones inseguras.

## Auxiliar administrativo

Posibles banderas:

- modifica datos para "hacerlos coincidir";
- comparte información confidencial sin autorización;
- borra registros para ocultar errores;
- procesa documentos inconsistentes sin validación.

---

# 19. Follow-ups adaptativos

Generar follow-up cuando:

```text
answer == vague
OR evidence == insufficient
OR contradictionDetected == true
OR criticalCompetencyNeedsValidation == true
```

No generar follow-up cuando:

```text
evidence == sufficient
AND no contradiction
AND no critical uncertainty
```

Tipos de follow-up permitidos:

### Profundización

> "¿Puedes darme un ejemplo concreto?"

### Procedimiento

> "¿Qué harías primero?"

### Verificación

> "¿Cómo comprobarías que quedó correcto?"

### Riesgo

> "¿Qué riesgo intentarías evitar?"

### Consistencia

> "Mencionaste X anteriormente. ¿Cómo se relaciona con este caso?"

### Resultado

> "¿Cuál fue el resultado?"

Evitar interrogatorios repetitivos.

---

# 20. Política ante respuestas incorrectas

Durante la entrevista:

- no corregir inmediatamente salvo que exista una razón de seguridad de la experiencia conversacional;
- no revelar la puntuación;
- no enseñar al candidato la respuesta esperada;
- registrar evidencia;
- continuar.

La plataforma evalúa capacidades; no es un tutor durante esta fase.

---

# 21. Uso del CV y perfil

Si existe CV/perfil, utilizarlo para personalizar follow-ups.

Ejemplo:

```text
CV:
"3 años manejando inventarios en SAP"

Base question:
"Cuéntame cómo has utilizado un ERP..."

Follow-up adaptativo:
"En tu CV mencionas SAP. ¿Qué movimientos o consultas realizabas normalmente?"
```

No reemplazar la pregunta base por información del CV.

Las preguntas base permiten comparar candidatos.

---

# 22. Preguntas que NO deben usarse

No preguntar ni utilizar para scoring:

- edad;
- género;
- estado civil;
- embarazo;
- religión;
- orientación sexual;
- afiliación política;
- origen étnico;
- condiciones médicas no directamente necesarias para un requisito legal/operativo;
- situación familiar;
- preguntas clínicas sobre salud mental.

No inferir estos atributos a partir del lenguaje o del CV.

---

# 23. Formato de salida de evaluación

Adapta el schema al backend actual, pero conceptualmente debe incluir lo siguiente:

```json
{
  "interviewId": "string",
  "candidateId": "string",
  "vacancyProfile": "AUXILIAR_ADMINISTRATIVO | ENCARGADO_ALMACEN | OPERADOR_MAQUINARIA_PESADA",
  "status": "completed",
  "hardSkills": {
    "score": 0,
    "maxScore": 28,
    "percentage": 0,
    "items": [
      {
        "questionId": "HA-01",
        "competency": "Excel",
        "score": 0,
        "confidence": "high_confidence | medium_confidence | low_confidence",
        "evidence": [
          "string"
        ],
        "gaps": [
          "string"
        ],
        "followUpsUsed": 0
      }
    ]
  },
  "softSkills": {
    "score": 0,
    "maxScore": 28,
    "percentage": 0,
    "items": []
  },
  "interviewScore": 0,
  "strengths": [
    {
      "competency": "string",
      "evidence": "string"
    }
  ],
  "developmentAreas": [
    {
      "competency": "string",
      "evidence": "string"
    }
  ],
  "inconsistencies": [
    {
      "claim": "string",
      "observedEvidence": "string",
      "severity": "low | medium | high"
    }
  ],
  "riskFlags": [],
  "evidenceSummary": [
    {
      "skill": "string",
      "status": "DECLARED | EVALUATED | VERIFIED",
      "confidence": "high_confidence | medium_confidence | low_confidence",
      "summary": "string"
    }
  ],
  "summary": "string"
}
```

---

# 24. Regla crítica sobre JSON / structured output

Si el proveedor LLM actual soporta:

- JSON Schema;
- structured outputs;
- function calling;
- tool calling;

utiliza el mecanismo ya existente en el proyecto para garantizar una respuesta estructurada.

No dependas de parsear texto libre si el stack ya soporta salidas tipadas.

Si existen DTOs o modelos equivalentes, **reutilízalos o extiéndelos mínimamente**.

---

# 25. Estado conversacional recomendado

La sesión debe poder saber:

```json
{
  "phase": "hard_skills | soft_skills | completed",
  "currentQuestionIndex": 0,
  "currentQuestionId": "HA-01",
  "baseQuestionsAnswered": 0,
  "followUpsForCurrentQuestion": 0,
  "evidenceCollected": [],
  "claimsToValidate": [],
  "contradictions": []
}
```

No confíes exclusivamente en el historial completo del chat para determinar el estado si el backend ya maneja persistencia.

---

# 26. Orden de entrevista

Orden recomendado para UX:

```text
Introducción breve
↓
Hard Skills 1–7
↓
Transición natural
↓
Soft Skills 1–7
↓
Cierre
↓
Evaluación estructurada
```

Si la implementación actual alterna preguntas por razones de UX, puede conservarse siempre que:

- existan 7 hard + 7 soft;
- todas se completen;
- los IDs permanezcan estables;
- el scoring siga separado.

---

# 27. Mensaje de apertura del entrevistador

Ejemplo base:

> Hola. Voy a hacerte una entrevista breve sobre situaciones y tareas relacionadas con el puesto. No buscamos respuestas memorizadas: nos interesa entender qué has hecho, cómo resolverías distintos escenarios y qué experiencia puedes demostrar. Si alguna herramienta o situación no la conoces, puedes decirlo con confianza.

Después iniciar con una pregunta.

No entregar todas las preguntas simultáneamente.

---

# 28. Mensaje de transición

Ejemplo:

> Gracias. Ahora voy a hacerte algunas preguntas sobre cómo organizas el trabajo y cómo actúas en situaciones del día a día.

---

# 29. Mensaje de cierre

Ejemplo:

> Gracias. Hemos terminado la entrevista. La plataforma procesará tus respuestas para construir la evidencia de competencias asociada a tu perfil.

No mostrar un veredicto inmediato salvo que el flujo actual del producto sí contemple una pantalla posterior de resultados.

---

# 30. Requisitos de implementación

Al completar el trabajo:

1. integrar los prompts sin romper frontend/backend;
2. mantener identificadores estables;
3. evitar hardcodear lógica duplicada;
4. separar contenido común de contenido por vacante;
5. validar que cada perfil tenga exactamente:
   - 7 hard;
   - 7 soft;
6. agregar validación automática o tests para garantizarlo;
7. comprobar que no existan preguntas duplicadas;
8. comprobar que cada pregunta tenga:
   - ID;
   - tipo;
   - competencia;
   - texto;
   - criterios de scoring;
   - follow-ups sugeridos cuando sean relevantes;
9. asegurar que el resultado final sea parseable;
10. preservar compatibilidad con los modelos y endpoints existentes.

---

# 31. Tests mínimos

Implementa pruebas equivalentes a:

## Estructura

- cada perfil carga correctamente;
- existen exactamente tres perfiles del MVP;
- cada perfil tiene 14 preguntas;
- cada perfil tiene 7 `HARD_SKILL`;
- cada perfil tiene 7 `SOFT_SKILL`;
- IDs únicos;
- ninguna pregunta vacía;
- cada pregunta referencia una competencia.

## Evaluación

- score permitido: 0–4;
- porcentajes limitados a 0–100;
- máximo hard = 28;
- máximo soft = 28;
- entrevista completa = 14 preguntas base;
- follow-ups no incrementan el contador de preguntas base.

## Safety / reglas

- operador: una respuesta que decide seguir operando ante una falla crítica puede producir flag;
- almacén: nunca se valora positivamente arriesgar integridad física para proteger mercancía;
- administrativo: divulgar información confidencial sin autorización puede producir flag.

## Structured output

- schema válido;
- campos obligatorios;
- arrays vacíos permitidos donde corresponda;
- enums consistentes.

---

# 32. Logging

Registrar suficiente información para depuración, sin guardar razonamiento privado del modelo.

Puede registrarse:

- interviewId;
- questionId;
- duración;
- follow-up utilizado;
- score final;
- parsing success/failure;
- modelo;
- latencia;
- token usage si ya se mide.

No persistir chain-of-thought.

---

# 33. Configuración

No dispersar:

- nombres de modelos;
- temperaturas;
- límites de tokens;
- versiones de prompts;

por múltiples archivos si el proyecto ya posee configuración centralizada.

Añadir versión de prompt cuando sea posible:

```text
interviewer_prompt_version: 1.0.0
rubric_version: 1.0.0
```

Esto permitirá comparar evaluaciones realizadas bajo diferentes versiones.

---

# 34. Reglas para modificar el código existente

Antes de crear archivos nuevos, busca:

```text
prompt
interview
agent
llm
openai
anthropic
claude
evaluation
rubric
vacancy
candidate
assessment
```

Identifica la solución existente.

Después:

- cambia lo mínimo necesario;
- no cambies contratos públicos sin necesidad;
- no reemplaces librerías funcionales;
- no cambies naming global por preferencia personal;
- no conviertas el proyecto entero a otro patrón arquitectónico.

---

# 35. Entregables que debes producir en el repositorio

Al finalizar deben existir, usando nombres compatibles con el proyecto:

### A. Prompt base común
Reglas del entrevistador.

### B. Rúbrica común
Escala y reglas de evaluación.

### C. Prompt de Auxiliar Administrativo
14 preguntas + competencias + criterios.

### D. Prompt de Encargado de Almacén
14 preguntas + competencias + criterios.

### E. Prompt de Operador de Maquinaria Pesada
14 preguntas + competencias + criterios.

### F. Integración
Servicio/carga de prompts en el flujo real.

### G. Schema/DTO
Solo si el actual no cubre la salida requerida.

### H. Tests
Validación de estructura y scoring.

### I. Documentación breve
Cómo:

- agregar una cuarta vacante;
- modificar preguntas;
- versionar una rúbrica;
- cambiar pesos;
- ejecutar los tests.

---

# 36. No sobre-ingenierizar

Este proyecto es un MVP de hackatón.

Prioriza:

1. demo estable;
2. coherencia de entrevistas;
3. evidencia clara;
4. integración real;
5. salida estructurada;
6. mantenibilidad suficiente.

Evita construir:

- un motor psicométrico;
- un DSL complejo de entrevistas;
- entrenamiento de modelos;
- un sistema de reglas innecesariamente grande;
- microservicios nuevos si no son necesarios.

---

# 37. Criterio de éxito

La implementación será correcta si puede demostrarse este flujo:

```text
Candidato
↓
Selecciona/aplica a un perfil
↓
Agente carga prompt correspondiente
↓
Realiza 14 preguntas base
↓
Hace follow-ups solo cuando son necesarios
↓
Evalúa cada respuesta con escala 0–4
↓
Genera Hard Skills Score
↓
Genera Soft Skills Score
↓
Genera evidencia por competencia
↓
Detecta inconsistencias y riesgos
↓
Persiste resultado estructurado
↓
Perfil de Talento Verificado puede consumir esa evaluación
↓
Motor de matching puede utilizarla posteriormente
```

La experiencia final debe demostrar el principio fundamental de Conecta Empleo:

> **No evaluar únicamente lo que una persona dice que sabe, sino generar evidencia estructurada sobre lo que puede demostrar.**

---

# 38. Forma de trabajar solicitada al agente de código

Ejecuta el trabajo en este orden:

1. analiza el repositorio;
2. describe brevemente la integración actual de IA que encontraste;
3. identifica los archivos que modificarás;
4. implementa la estructura común;
5. crea/adapta los tres perfiles;
6. conecta los prompts al flujo;
7. añade structured output;
8. añade tests;
9. ejecuta tests/build/lint disponibles;
10. corrige errores;
11. entrega un resumen final de:
    - archivos creados;
    - archivos modificados;
    - decisiones tomadas;
    - comandos ejecutados;
    - tests superados;
    - cualquier limitación restante.

No te detengas después del análisis si tienes acceso al repositorio y puedes realizar la implementación.

No dejes solamente pseudocódigo.

No generes tres soluciones aisladas: deben compartir un **núcleo común de entrevista y evaluación** y diferenciar únicamente lo necesario por perfil.
