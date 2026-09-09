# Product Brief --- Conecta Empleo

**Versión:** 1.0\
**Proyecto:** Conecta Empleo\
**Tipo:** Marketplace de talento verificado por Inteligencia Artificial\
**Contexto:** MVP para Hackatón IA 2026\
**Horizonte de construcción:** aproximadamente una semana\
**Estado:** Definición inicial del producto

## 1. Resumen ejecutivo

Conecta Empleo es un marketplace de talento verificado por Inteligencia
Artificial orientado a facilitar la contratación, especialmente para
PYMEs, pequeños negocios y organizaciones que no cuentan con un equipo
especializado de reclutamiento.

La plataforma busca reducir una falla común del mercado laboral: gran
parte de la información utilizada para filtrar candidatos es
autodeclarada. Un currículum indica qué conocimientos, experiencia y
habilidades afirma poseer una persona, pero no necesariamente aporta
evidencia suficiente para determinar su nivel real.

Conecta Empleo complementa esa información mediante agentes de IA que
analizan o construyen el currículum del candidato, realizan entrevistas
adaptativas, evalúan conocimientos técnicos y competencias conductuales
mediante rúbricas y estructuran evidencia sobre las capacidades
demostradas.

Posteriormente, un agente de matching compara los perfiles evaluados
contra los requisitos de las vacantes y entrega a las empresas un
ranking explicable de candidatos.

La propuesta central puede resumirse así:

> **Conecta Empleo no hace match entre vacantes y currículums; hace
> match entre vacantes y capacidades demostradas.**

## 2. Problema

### 2.1 Problema para las empresas

Las empresas deben invertir tiempo y recursos en descubrir si los
candidatos realmente poseen las competencias que declaran. Este problema
se intensifica en organizaciones pequeñas que no cuentan con
reclutadores, psicólogos organizacionales o procesos formales de
evaluación.

Entre las principales fricciones se encuentran:

-   revisión manual de numerosos currículums;
-   dificultad para comparar perfiles heterogéneos;
-   entrevistas iniciales repetitivas;
-   dificultad para validar conocimientos técnicos;
-   evaluación inconsistente de competencias conductuales;
-   información insuficiente o exagerada en currículums;
-   costos de oportunidad derivados de procesos largos;
-   riesgo de contratar perfiles poco compatibles con el puesto.

### 2.2 Problema para los candidatos

Muchos candidatos tienen experiencia práctica que no está bien
representada en un currículum. Esto afecta especialmente a perfiles
operativos y personas que no acostumbran utilizar plataformas
profesionales.

También existen candidatos capaces que:

-   no saben construir un CV;
-   describen pobremente su experiencia;
-   no cuentan con certificaciones formales;
-   poseen habilidades adquiridas en la práctica;
-   son descartados antes de tener oportunidad de demostrar lo que
    saben.

### 2.3 Formulación del problema central

> **El mercado laboral conecta candidatos y vacantes principalmente a
> partir de información autodeclarada, obligando a las empresas a
> invertir tiempo y recursos en descubrir quién realmente posee las
> competencias necesarias, mientras candidatos capaces pueden quedar
> fuera por no saber representar adecuadamente su experiencia.**

## 3. Usuarios objetivo

### 3.1 Candidatos

Personas que buscan empleo en las familias inicialmente soportadas,
incluyendo candidatos con y sin currículum formal.

### 3.2 Empresas

Principalmente:

-   PYMEs;
-   pequeños negocios;
-   empresas con poca capacidad interna de reclutamiento;
-   organizaciones con contratación recurrente de perfiles
    administrativos, operativos o logísticos.

## 4. Familias de empleo del MVP

### Auxiliar administrativo

Objetivo del rol: apoyar el funcionamiento administrativo y operativo de
una oficina.

### Obrero operador de maquinaria pesada

Objetivo del rol: operar maquinaria pesada de forma segura y eficiente
dentro de procesos industriales, logísticos o de construcción.

### Encargado de almacén

Objetivo del rol: mantener el almacén organizado, controlado y operando
eficientemente.

Estas tres familias permiten demostrar que el sistema puede evaluar
perfiles con características distintas sin intentar cubrir todo el
mercado laboral durante el MVP.

## 5. Propuesta de valor

### Para candidatos

-   posibilidad de demostrar habilidades más allá del CV;
-   generación asistida de CV cuando no existe uno;
-   estructuración de experiencia práctica;
-   perfil basado en evidencia;
-   mayor visibilidad ante empresas compatibles.

### Para empresas

-   candidatos previamente evaluados;
-   reducción del trabajo inicial de filtrado;
-   matching explicable;
-   comparación homogénea de candidatos;
-   apoyo para empresas sin infraestructura robusta de RH;
-   anonimización inicial para centrar el primer filtro en competencias.

## 6. Solución

El candidato:

1.  crea su perfil;
2.  carga su CV o conversa con un agente para construirlo;
3.  realiza una entrevista adaptativa;
4.  responde preguntas técnicas y escenarios conductuales;
5.  aporta documentos o certificaciones cuando corresponda;
6.  recibe un **Perfil de Talento Verificado**.

La empresa:

1.  se registra y aparece como empresa verificada;
2.  configura una vacante;
3.  define requisitos, ubicación y rango salarial;
4.  recibe candidatos ordenados por compatibilidad;
5.  visualiza el desglose y explicación del match;
6.  selecciona perfiles de interés;
7.  desbloquea la identidad y datos completos de los candidatos
    seleccionados.

## 7. Principios de producto

1.  **Evidencia sobre declaraciones.**
2.  **IA como núcleo funcional, no como complemento decorativo.**
3.  **Matching explicable.**
4.  **Entrevista adaptativa en lugar de cuestionario estático.**
5.  **Inclusión de candidatos sin CV formal.**
6.  **Primer filtro centrado en competencias.**
7.  **La IA apoya la decisión; no realiza una contratación automática.**
8.  **MVP enfocado antes que plataforma extensa.**

## 8. Niveles de evidencia

Cada habilidad puede presentar tres estados:

-   **Declarada:** el candidato afirma poseerla.
-   **Evaluada:** fue explorada mediante entrevista, ejercicio o
    escenario.
-   **Verificada:** existe evidencia documental o externa suficiente.

Una habilidad puede contar con uno, dos o los tres niveles.

## 9. Diferenciadores

-   entrevista generada a partir del CV y de las respuestas previas;
-   identificación de claims relevantes que requieren validación;
-   generación de CV mediante conversación para perfiles sin currículum;
-   evaluación estructurada mediante rúbricas;
-   Perfil de Talento Verificado;
-   ranking por compatibilidad con explicación;
-   visualización inicial anonimizada;
-   incorporación de perfiles operativos además de perfiles de oficina.

## 10. Alcance del MVP

### Debe funcionar

-   registro básico de candidato;
-   carga o creación asistida de CV;
-   análisis de CV;
-   entrevista IA;
-   evaluación de competencias;
-   generación de perfil evaluado;
-   registro básico de empresa;
-   creación/configuración de vacante;
-   marketplace;
-   ranking de candidatos;
-   explicación del match;
-   vista anonimizada y desbloqueo del perfil.

### Puede ser prototipo navegable

-   mensajería;
-   notificaciones;
-   pagos;
-   configuraciones avanzadas;
-   paneles administrativos secundarios.

### Fuera del MVP

-   verificación legal real automatizada de empresas;
-   contratación o firma de contratos;
-   procesamiento real de pagos;
-   integración con nómina;
-   evaluación de todas las profesiones;
-   entrenamiento de un modelo fundacional propio;
-   decisión automática de contratación.

## 11. Métricas de éxito del MVP

El MVP será exitoso si permite demostrar de punta a punta:

-   creación de al menos un perfil de candidato;
-   extracción correcta de habilidades relevantes;
-   entrevista adaptativa funcional;
-   generación de evidencia estructurada;
-   construcción de un Perfil de Talento Verificado;
-   creación de una vacante;
-   ranking de varios candidatos;
-   explicación comprensible del porcentaje de compatibilidad;
-   desbloqueo visual de un candidato seleccionado;
-   demo estable y comprensible en pocos minutos.

## 12. Riesgos principales

-   scoring de IA inconsistente;
-   sesgos en evaluación;
-   preguntas irrelevantes o inapropiadas;
-   sobreprometer que la IA "certifica" psicológicamente a una persona;
-   confundir evidencia evaluada con evidencia verificada;
-   construir demasiadas funcionalidades;
-   fallas del modelo durante una demo en vivo;
-   tratamiento inadecuado de datos personales.

## 13. Hipótesis de producto

1.  Una empresa pequeña obtiene valor si recibe candidatos previamente
    evaluados y comparables.
2.  Un candidato está dispuesto a realizar una entrevista inicial si el
    resultado aumenta su capacidad de demostrar habilidades.
3.  Una explicación del match genera más confianza que un porcentaje
    aislado.
4.  La creación conversacional de CV reduce una barrera de entrada para
    perfiles operativos.
5.  La anonimización inicial puede reducir la influencia de atributos
    personales irrelevantes en el primer filtro.

## 14. Visión

Conecta Empleo busca evolucionar hacia una infraestructura de confianza
para el mercado laboral donde una persona sea representada por:

> **Lo que declara + lo que demuestra + lo que puede verificarse.**

El objetivo de largo plazo es facilitar mejores conexiones laborales
mediante evidencia, compatibilidad y evaluación estructurada.
