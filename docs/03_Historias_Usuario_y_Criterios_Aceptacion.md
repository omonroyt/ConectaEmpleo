# Historias de Usuario y Criterios de Aceptación --- Conecta Empleo

**Versión:** 1.0

## Convenciones

Prioridades: - **P0:** imprescindible para demo/MVP. - **P1:**
importante. - **P2:** deseable.

------------------------------------------------------------------------

## Épica A --- Candidato

### HU-C01 --- Registro de candidato --- P0

**Como** persona que busca empleo\
**quiero** crear una cuenta como candidato\
**para** construir mi perfil profesional.

**Criterios de aceptación**

-   Dado que soy un usuario nuevo, cuando completo los campos
    obligatorios válidos, entonces mi cuenta se crea.
-   El sistema identifica mi rol como candidato.
-   Los errores de campos obligatorios son visibles.
-   Al terminar, avanzo al onboarding.

### HU-C02 --- Seleccionar familia laboral --- P0

**Como** candidato\
**quiero** indicar el tipo de puesto que busco\
**para** recibir una evaluación relevante.

**Criterios**

-   Puedo elegir entre Auxiliar administrativo, Obrero operador y
    Encargado de almacén.
-   La selección queda guardada.
-   La rúbrica posterior corresponde a la familia seleccionada.

### HU-C03 --- Subir CV --- P0

**Como** candidato con currículum\
**quiero** subir mi documento\
**para** evitar capturar manualmente mi experiencia.

**Criterios**

-   Puedo seleccionar un archivo soportado.
-   El sistema informa que está procesando el documento.
-   Se extraen experiencia, estudios, habilidades y certificaciones
    cuando estén presentes.
-   Puedo revisar la información antes de continuar.
-   Un fallo de análisis no destruye mi perfil.

### HU-C04 --- Crear CV conversacional --- P0

**Como** candidato sin CV\
**quiero** contar mi experiencia mediante una conversación\
**para** obtener un currículum básico.

**Criterios**

-   Puedo iniciar sin archivo.
-   El agente pregunta por experiencia, actividades, estudios y
    habilidades relevantes.
-   Las preguntas se adaptan a respuestas anteriores.
-   El resultado se presenta estructurado.
-   Puedo corregir información antes de guardarla.
-   El sistema genera un CV básico reutilizable/descargable en el
    alcance implementado.

### HU-C05 --- Revisar claims --- P0

**Como** candidato\
**quiero** revisar la información extraída\
**para** corregir errores antes de ser evaluado.

**Criterios**

-   Veo experiencia y skills detectadas.
-   Puedo corregir campos editables.
-   La versión confirmada es la usada por la entrevista.

------------------------------------------------------------------------

## Épica B --- Entrevista y evaluación

### HU-I01 --- Iniciar entrevista adaptativa --- P0

**Como** candidato\
**quiero** iniciar una entrevista relacionada con mi experiencia y
puesto\
**para** demostrar mis competencias.

**Criterios**

-   La entrevista recibe mi familia laboral y perfil.
-   La primera pregunta es relevante.
-   El sistema conserva el contexto entre preguntas.
-   Existe indicador de progreso.

### HU-I02 --- Profundización adaptativa --- P0

**Como** candidato\
**quiero** que las preguntas consideren mis respuestas\
**para** que la evaluación no sea un cuestionario genérico.

**Criterios**

-   Al menos una pregunta posterior hace referencia lógica a evidencia
    de una respuesta anterior durante el golden path.
-   El agente puede profundizar cuando una respuesta es insuficiente.
-   El agente puede cambiar de competencia cuando ya existe evidencia
    suficiente.
-   No repite preguntas equivalentes sin necesidad.

### HU-I03 --- Evaluación técnica --- P0

**Como** empresa futura\
**quiero** que las habilidades técnicas del candidato sean evaluadas\
**para** distinguir claims de evidencia.

**Criterios**

-   Cada competencia evaluada utiliza una rúbrica.
-   Se almacena score, evidencia y justificación.
-   El resultado distingue "declarada" de "evaluada".
-   La justificación se basa en respuestas del candidato.

### HU-I04 --- Evaluación conductual --- P0

**Como** empresa\
**quiero** observar evidencia de competencias conductuales\
**para** contar con información estructurada adicional.

**Criterios**

-   El agente presenta escenarios relacionados con el trabajo.
-   Evalúa dimensiones definidas por rúbrica.
-   No diagnostica personalidad ni salud.
-   La salida indica evidencia observada y limitaciones.

### HU-I05 --- Manejo de incertidumbre --- P1

**Como** candidato\
**quiero** que una duda o un "no recuerdo" no sea tratado
automáticamente como incompetencia\
**para** recibir una evaluación más razonable.

**Criterios**

-   El agente puede reformular o solicitar ejemplo cuando procede.
-   La incertidumbre puede afectar confianza de la evidencia.
-   No asigna automáticamente cero por expresiones dubitativas.
-   La justificación conserva qué ocurrió.

### HU-I06 --- Evidencia verificada --- P1

**Como** candidato\
**quiero** aportar certificaciones o documentos\
**para** respaldar habilidades.

**Criterios**

-   El sistema puede asociar evidencia a una skill.
-   Solo evidencia aceptada por las reglas puede marcar "Verificada".
-   Se conserva la fuente/tipo de evidencia.

### HU-I07 --- Perfil de Talento Verificado --- P0

**Como** candidato\
**quiero** recibir un resumen de mis competencias\
**para** conocer cómo seré presentado a empresas.

**Criterios**

-   Muestra skills principales.
-   Distingue Declarada/Evaluada/Verificada.
-   Muestra scores donde proceda.
-   Incluye fortalezas y áreas con evidencia insuficiente.
-   No presenta inferencias sensibles.

------------------------------------------------------------------------

## Épica C --- Empresa y vacantes

### HU-E01 --- Registro de empresa --- P0

**Como** empresa\
**quiero** crear una cuenta\
**para** buscar candidatos.

**Criterios**

-   El registro empresarial funciona.
-   El perfil conserva datos básicos.
-   El MVP muestra estado de verificación.

### HU-E02 --- Crear vacante --- P0

**Como** empresa\
**quiero** configurar una vacante\
**para** encontrar candidatos compatibles.

**Criterios**

-   Selecciono familia laboral.
-   Defino requisitos.
-   Puedo distinguir obligatorios y deseables.
-   Registro rango salarial y ubicación.
-   Indico número de posiciones.
-   La vacante queda persistida.

### HU-E03 --- Configurar pesos --- P1

**Como** empresa\
**quiero** priorizar competencias\
**para** reflejar lo que más importa en mi vacante.

**Criterios**

-   Los pesos son editables dentro de límites.
-   El sistema valida/normaliza la suma.
-   Los pesos usados quedan visibles.

------------------------------------------------------------------------

## Épica D --- Marketplace y matching

### HU-M01 --- Obtener ranking --- P0

**Como** empresa\
**quiero** recibir candidatos ordenados por compatibilidad\
**para** reducir el filtrado manual.

**Criterios**

-   El sistema evalúa candidatos elegibles.
-   Los ordena de mayor a menor score.
-   Destaca los principales.
-   Permite visualizar también los restantes.

### HU-M02 --- Comprender el match --- P0

**Como** empresa\
**quiero** saber por qué un candidato obtuvo su porcentaje\
**para** no depender de un score opaco.

**Criterios**

-   Se muestra score general.
-   Se muestran componentes parciales.
-   Existe explicación textual.
-   La explicación se corresponde con datos/evidencia del perfil.
-   Se identifican fortalezas y gaps relevantes.

### HU-M03 --- Primer filtro anonimizado --- P0

**Como** empresa\
**quiero** evaluar inicialmente capacidades sin ver atributos personales
irrelevantes\
**para** centrar el primer filtro en compatibilidad.

**Criterios**

-   Antes del desbloqueo no se muestra nombre, foto, edad ni género.
-   Esos atributos no forman parte del cálculo.
-   Se utiliza un identificador anónimo.
-   Puede mostrarse ubicación aproximada/compatibilidad geográfica sin
    domicilio exacto.

### HU-M04 --- Desbloquear candidato --- P0

**Como** empresa\
**quiero** seleccionar un candidato de interés\
**para** acceder a su información completa.

**Criterios**

-   Existe una acción explícita de selección/desbloqueo.
-   Tras ejecutarla se muestra el perfil completo disponible.
-   El estado del candidato queda registrado.
-   El MVP no requiere una aprobación posterior del candidato.

### HU-M05 --- Comparar candidatos --- P1

**Como** empresa\
**quiero** comparar perfiles\
**para** entender rápidamente diferencias.

**Criterios**

-   Se visualizan las mismas dimensiones principales.
-   Los scores utilizan escalas consistentes.
-   Las diferencias de evidencia son visibles.

------------------------------------------------------------------------

## Épica E --- Experiencia complementaria

### HU-X01 --- Notificaciones --- P2

Debe existir una pantalla navegable de notificaciones aunque su backend
pueda ser simulado.

### HU-X02 --- Mensajes --- P2

Debe existir una pantalla navegable de mensajería aunque el intercambio
real pueda quedar fuera.

### HU-X03 --- Pagos --- P2

Debe existir una pantalla conceptual de planes/pagos si se desea
comunicar la visión comercial, sin procesar pagos reales.

------------------------------------------------------------------------

## Criterios transversales de aceptación

-   Ninguna evaluación debe presentarse como decisión automática de
    contratación.
-   "Verificada" no puede asignarse únicamente por autodeclaración.
-   Los atributos personales ocultos no deben participar en el matching.
-   Los scores principales deben ser explicables.
-   Los outputs críticos de IA deben ser estructurados y persistibles.
-   Los journeys P0 deben funcionar en el entorno desplegado antes de
    dedicar tiempo a P2.
