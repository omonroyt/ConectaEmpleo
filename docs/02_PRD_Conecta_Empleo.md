# PRD --- Conecta Empleo

**Versión:** 1.0\
**Producto:** Conecta Empleo\
**Objetivo:** especificar el MVP funcional del marketplace de talento
verificado por IA.

## 1. Propósito

Este PRD traduce la visión de Conecta Empleo en requisitos concretos de
producto para un MVP construido durante aproximadamente una semana.

## 2. Objetivo del MVP

Demostrar que un candidato puede pasar de información autodeclarada a un
perfil con evidencia estructurada y que una empresa puede utilizar dicho
perfil para encontrar candidatos compatibles con una vacante mediante
matching explicable.

## 3. Actores

### Candidato

Persona que busca empleo.

### Empresa

Organización que busca candidatos.

### Sistema de IA

Conjunto de componentes responsables de análisis de CV, entrevista,
evidencia y matching.

## 4. Familias soportadas

-   Auxiliar administrativo.
-   Obrero operador de maquinaria pesada.
-   Encargado de almacén.

## 5. Alcance priorizado --- MoSCoW

### Must Have

-   registro/login básico;
-   selección de tipo de usuario;
-   perfil candidato;
-   carga de CV;
-   creación conversacional de CV;
-   extracción de claims y skills;
-   entrevista adaptativa;
-   rúbricas por familia;
-   evaluación de hard skills;
-   evaluación conductual;
-   niveles Declarada/Evaluada/Verificada;
-   Perfil de Talento Verificado;
-   perfil empresa;
-   estado visual de empresa verificada;
-   creación de vacante;
-   requisitos obligatorios/deseables;
-   matching;
-   ranking;
-   explicación de match;
-   anonimización inicial;
-   desbloqueo de identidad.

### Should Have

-   ubicación aproximada/distancia compatible;
-   expectativa/rango salarial;
-   carga de certificaciones;
-   descarga del CV generado;
-   historial de entrevista;
-   filtros básicos del marketplace.

### Could Have

-   mensajes;
-   notificaciones;
-   pagos;
-   favoritos;
-   dashboard analítico;
-   historial de procesos.

### Won't Have en el MVP

-   verificación gubernamental real;
-   contratación automática;
-   nómina;
-   firma electrónica;
-   background checks;
-   procesamiento real de pagos;
-   evaluación universal de profesiones.

## 6. Requisitos funcionales

### RF-01 Registro de candidato

El sistema debe permitir crear una cuenta de candidato.

### RF-02 Registro de empresa

El sistema debe permitir crear una cuenta empresarial.

### RF-03 Perfil de candidato

Debe almacenar experiencia, estudios, disponibilidad, expectativa
salarial, ubicación aproximada y familia laboral.

### RF-04 Carga de CV

El candidato debe poder cargar un CV compatible con los formatos
definidos por el MVP.

### RF-05 Creación de CV por IA

Un candidato sin CV debe poder conversar con un agente que recopile
información y genere un CV básico estructurado.

### RF-06 Análisis de CV

El sistema debe extraer experiencia, educación, habilidades,
certificaciones y claims relevantes.

### RF-07 Inicio de entrevista

El candidato debe poder iniciar una entrevista correspondiente a su
familia laboral.

### RF-08 Entrevista adaptativa

Las preguntas posteriores deben poder variar según CV, claims,
respuestas y evidencia pendiente.

### RF-09 Evaluación técnica

El sistema debe evaluar competencias técnicas mediante preguntas y
escenarios vinculados con el puesto.

### RF-10 Evaluación conductual

El sistema debe evaluar respuestas a escenarios mediante rúbricas, sin
realizar diagnósticos psicológicos.

### RF-11 Persistencia

Las respuestas y evaluaciones deben persistirse.

### RF-12 Evidencia

Cada competencia debe distinguir entre declarada, evaluada y verificada.

### RF-13 Perfil de Talento Verificado

Al finalizar la evaluación debe generarse un resumen estructurado del
candidato.

### RF-14 Empresa verificada

El MVP debe representar visualmente el estado de verificación de la
empresa.

### RF-15 Vacantes

La empresa debe poder crear una vacante indicando familia, requisitos,
pesos, ubicación y rango salarial.

### RF-16 Matching

El sistema debe comparar una vacante contra candidatos elegibles.

### RF-17 Ranking

Los candidatos deben ordenarse de mayor a menor compatibilidad.

### RF-18 Explicabilidad

Cada match debe mostrar score general, scores parciales y explicación
textual.

### RF-19 Anonimización

Antes de la selección, deben ocultarse nombre, fotografía, edad y
género.

### RF-20 Desbloqueo

La empresa debe poder seleccionar un candidato y visualizar su perfil
completo.

### RF-21 Resto de candidatos

Además de los candidatos destacados, la empresa debe poder consultar el
resto ordenado por compatibilidad.

## 7. Requisitos no funcionales

### RNF-01 Usabilidad

Los journeys principales deben ser comprensibles sin capacitación.

### RNF-02 Rendimiento

Las operaciones de IA deben mostrar estado de procesamiento y evitar que
la interfaz parezca bloqueada.

### RNF-03 Explicabilidad

Ningún score principal debe presentarse sin factores explicativos.

### RNF-04 Privacidad

Los datos personales no necesarios para el primer filtro deben
permanecer ocultos.

### RNF-05 Seguridad

Las credenciales y secretos de proveedores deben mantenerse fuera del
frontend.

### RNF-06 Auditabilidad

Las evaluaciones deben conservar la evidencia que justifica el
resultado.

### RNF-07 Consistencia

Los outputs de IA utilizados por el sistema deben producirse mediante
esquemas estructurados.

### RNF-08 Accesibilidad básica

La interfaz debe mantener etiquetas, contraste, navegación y textos
comprensibles.

### RNF-09 Resiliencia de demo

Debe existir un camino de demostración estable con datos preparados.

## 8. Journey del candidato

1.  Registro.
2.  Selección de familia laboral.
3.  Completar datos básicos.
4.  Elegir entre subir CV o crearlo mediante conversación.
5.  Revisar información extraída/generada.
6.  Iniciar entrevista.
7.  Responder preguntas adaptativas.
8.  Completar evaluación.
9.  Visualizar Perfil de Talento Verificado.
10. Ingresar al marketplace como candidato elegible.

## 9. Journey de empresa

1.  Registro.
2.  Perfil empresarial.
3.  Visualización de estado verificado.
4.  Crear vacante.
5.  Definir competencias y condiciones.
6.  Solicitar matching.
7.  Visualizar candidatos recomendados.
8.  Revisar explicación individual.
9.  Consultar candidatos adicionales.
10. Seleccionar candidatos.
11. Desbloquear perfil completo.

## 10. Reglas de negocio

-   RB-01: solo candidatos con evaluación suficiente pueden aparecer
    como "evaluados".
-   RB-02: "Verificada" requiere evidencia externa definida; una
    respuesta del candidato no basta.
-   RB-03: un score de match no representa probabilidad de éxito
    laboral.
-   RB-04: el sistema no debe realizar contratación automática.
-   RB-05: los atributos ocultos no deben formar parte del cálculo de
    matching.
-   RB-06: la ubicación puede usarse como compatibilidad logística,
    evitando exponer domicilio exacto.
-   RB-07: los pesos de matching deben sumar 100% o normalizarse.
-   RB-08: requisitos obligatorios pueden aplicar penalizaciones
    explícitas si no se cumplen.
-   RB-09: las explicaciones deben basarse en evidencia almacenada.
-   RB-10: respuestas dubitativas pueden reducir confianza de una
    evidencia, pero no deben interpretarse automáticamente como ausencia
    de habilidad.
-   RB-11: las soft skills se reportan como evidencia observada frente a
    rúbricas, no como rasgos psicológicos absolutos.

## 11. Modelo conceptual de scoring

Para una vacante con competencias (i):

**Match = suma(peso_i × score_i) + ajustes controlados**

Posibles componentes:

-   competencia técnica;
-   experiencia;
-   evidencia;
-   competencia conductual;
-   compatibilidad salarial;
-   compatibilidad geográfica.

El score final debe conservar el desglose para explicar el resultado.

## 12. Estados de evidencia

-   `DECLARED`
-   `EVALUATED`
-   `VERIFIED`

Una skill puede conservar múltiples banderas y un nivel de confianza
separado.

## 13. Pantallas principales

### Candidato

-   Login/registro.
-   Onboarding.
-   Perfil.
-   Subir/crear CV.
-   Revisión de CV.
-   Entrevista.
-   Progreso.
-   Resultado.
-   Perfil de Talento Verificado.

### Empresa

-   Login/registro.
-   Dashboard.
-   Verificación.
-   Crear vacante.
-   Vacantes.
-   Marketplace.
-   Ranking.
-   Detalle anónimo.
-   Perfil desbloqueado.

### Mockups secundarios

-   Mensajes.
-   Notificaciones.
-   Pagos.

## 14. Datos mínimos por candidato

-   ID;
-   familia laboral;
-   experiencia;
-   educación;
-   skills;
-   evidencia;
-   evaluación;
-   ubicación aproximada;
-   disponibilidad;
-   expectativa salarial;
-   CV;
-   documentos opcionales.

## 15. Datos mínimos por vacante

-   ID;
-   empresa;
-   familia;
-   título;
-   descripción;
-   requisitos;
-   pesos;
-   obligatorios/deseables;
-   rango salarial;
-   ubicación;
-   número de posiciones.

## 16. Criterios de éxito

-   completar ambos journeys;
-   entrevista adaptativa visible;
-   evaluación basada en rúbrica;
-   al menos cinco candidatos de demostración por familia o dataset
    suficiente para visualizar ranking;
-   ranking explicable;
-   identidad inicialmente oculta;
-   demo E2E sin bloqueos críticos.

## 17. Dependencias

-   proveedor de modelo LLM/multimodal;
-   almacenamiento de documentos;
-   base de datos;
-   autenticación;
-   frontend;
-   backend/API;
-   despliegue público.

## 18. Riesgos y mitigaciones

  -----------------------------------------------------------------------
  Riesgo                              Mitigación
  ----------------------------------- -----------------------------------
  IA inconsistente                    JSON schemas, rúbricas y
                                      temperatura controlada

  Entrevista demasiado larga          presupuesto máximo de preguntas y
                                      criterio de suficiencia

  Sesgo                               atributos protegidos fuera del
                                      scoring y evaluación por evidencia

  Scope excesivo                      MoSCoW estricto

  Demo falla                          dataset semilla y flujo golden path

  Latencia                            loaders, streaming cuando aplique y
                                      llamadas mínimas

  Alucinación                         evidencias citables desde
                                      respuestas/documentos

  Score opaco                         desglose y explicación
  -----------------------------------------------------------------------

## 19. Definición de Done del MVP

El MVP se considera listo cuando un candidato puede completar el flujo
hasta obtener su perfil evaluado y una empresa puede crear una vacante,
obtener un ranking explicable y desbloquear un candidato, todo desde una
versión desplegada y demostrable.
