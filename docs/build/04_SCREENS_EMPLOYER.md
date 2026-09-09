# 04 — Pantallas de empresa

Mismo formato que `03`. Journey: verificar empresa → crear vacante → perfil ideal → talento anónimo → evidencia → comparar → seleccionar → desbloquear. La empresa es más analítica y comparativa; superficies claras dominan. **Antes del desbloqueo nunca se muestra nombre, foto, edad ni género**: los componentes de esta fase reciben `AnonymousCandidateCard`, que no tiene esos campos.

Mensaje de privacidad fijo (header de talento y detalle anónimo): "La identidad del candidato se mantiene oculta en el primer filtro."

---

## E0 — Login / registro empresa (F3 construye `/login` y `/register`; F6 solo verifica el copy de empresa)

Ya cubierto en `03 §C1–C2`. Post-login empresa → `/employer`.

## E1 — Onboarding empresa `/employer/onboarding` (F6)

`ImmersiveLayout` · `employer` support · `company.update`. H1 "Conozcamos tu empresa". `ProgressSteps` 1 de 3.
1. Identidad: nombre comercial, razón social, industria (`Select`), tamaño (chips 1-10 / 11-50 / 51-200 / 200+), logo opcional.
2. Ubicación y modalidad: ciudad/estado, modalidad predominante (chips Presencial / Híbrido / Remoto).
3. Equipo y cultura: descripción corta (textarea, opcional). Al terminar → `/employer` con toast "Perfil creado".
No pedir datos legales adicionales.

## E2 — Home empresa `/employer` (F6)

`EmployerShell` · `employer` accent en header · `company.me`, `company.verification`, `vacancies.list`. Header con nombre comercial, `Badge` de verificación (`VERIFIED` verde con ShieldCheck; `PENDING` amarillo; `UNVERIFIED` gris) y CTA `Nueva vacante`. Card "Estado de verificación" con checks de `VerificationView` (visual, sin acción real; texto "Verificación visual para el MVP"). `MetricCard` ×3: vacantes activas, candidatos en selección (suma `shortlist_count`), desbloqueos. Lista de vacantes (`Card` con título, familia, estado, `last_match_run_id` → "Ranking listo" o "Sin matching aún", CTA `Ver talento`). Empty state: "Aún no tienes vacantes activas. Crea tu primera vacante para comenzar a comparar talento verificado." `[Crear vacante]`.

## E3 — Perfil de empresa `/employer/company` (F6)

`EmployerShell` · sin fondo · `company.me`, `company.update`, `company.verification`. Formulario por secciones como C12. Bloque de verificación con la lista de checks y el estado.

## E4 — Nueva vacante `/employer/vacancies/new` (F6)

`ImmersiveLayout` · `employer` support en hero · `catalog.jobFamilies`, `vacancies.create`. Hero oscuro + panel blanco. Campos: título, familia (3 cards compactas), modalidad, ubicación (ciudad/estado), tipo de jornada (chips), rango salarial (min/max MXN con validación min ≤ max), descripción del reto (textarea; placeholder "Describe qué necesitas: p. ej. que sepa manejar montacargas y llevar control de inventario en Excel"), número de posiciones. Panel derecho desktop: **preview visual de la vacante** (`Card dark` con `cards` accent) que se actualiza en vivo con `fadeUp`. CTA `Definir perfil ideal →` → `create` → `/employer/vacancies/:id/ideal-profile`.

## E5 — Perfil ideal `/employer/vacancies/:id/ideal-profile` (F6)

`ImmersiveLayout` · **sin fondo abstracto en el cuerpo** · `vacancies.get`, `catalog.competencies`, `vacancies.resolveRequirements`, `vacancies.setRequirements`, `vacancies.setWeights`. Dos bloques:

**A. Requisitos.** Al entrar, si la vacante no tiene requisitos, se llama `resolveRequirements(description)` con `ProcessingStatus` "Interpretando tus requisitos…". Resultado: lista de `RequirementInput` mapeados (label, competencia del catálogo, `kind` como selector segmentado **Esencial / Deseable**, `min_level` 1–4 como `Stepper`), `unmapped` como chips grises con "Elige una competencia" (`Select` del catálogo) o eliminar, y **advertencias** (`warnings`) en una card amarilla: "Este requisito podría ser discriminatorio y no se usará en el matching: «máximo 30 años»". Botón `Agregar requisito` manual.

**B. Prioridades (pesos).** Seis `Slider` por `MatchComponent` (Habilidades técnicas, Competencias conductuales, Experiencia, Calidad de evidencia, Compatibilidad salarial, Ubicación) con valor y suma visible; al cambiar uno, se muestra la suma y un botón `Normalizar a 100` (o normalización automática al guardar). Indicador de prioridad (chips Alta/Media/Baja derivados del peso). Mensaje fijo: "La IA apoya tu decisión; no la reemplaza."

CTA `Guardar y buscar talento →` → `setRequirements` + `setWeights` + `update(status: "OPEN")` + `runMatch` → `/employer/vacancies/:id/talent?job=`. Ghost `Guardar borrador`.

## E6 — Vacantes `/employer/vacancies` (F6)

`EmployerShell` · sin fondo · `vacancies.list`. Lista con filtros por estado (`FilterPills` Todas / Abiertas / Borrador / Cerradas), cada `Card` con título, familia, posiciones, estado, `shortlist_count`, acciones `Ver talento` / `Editar`. Empty state igual a E2.

## E7 — Detalle de vacante `/employer/vacancies/:id` (F6)

`EmployerShell` · `cards` accent en la card de resumen · `vacancies.get`, `vacancies.runMatch`, `matching.shortlist`. Resumen (título, familia, ubicación, modalidad, salario, posiciones, descripción), requisitos con `kind` y nivel, pesos como `ProgressBar` horizontales, estado del último matching con CTA `Ver ranking` o `Buscar talento` (→ `runMatch` con job). Enlace a `Editar perfil ideal`. Finalistas resumidos (conteo por etapa) con enlace a E11.

---

## E8 — Talento compatible `/employer/vacancies/:id/talent` (F7)

`EmployerShell` · `matching` accent **solo en el header** · `vacancies.get`, `jobs.get(?job)` polling con `ProcessingStatus` "Comparando habilidades y evidencia…", `matching.results(runId, {limit: 20, offset})`, `matching.setShortlistStage`. Header oscuro bajo: título de la vacante, `candidates_evaluated`, mensaje de privacidad, CTA `Comparar (n)` habilitado con 2–3 seleccionados. `FilterPills`: Todos · Evidencia alta (verified ≥ 2) · Disponibles (IMMEDIATE) · Mayor compatibilidad · Cerca (SAME_CITY/UNDER_30KM) · Salario compatible (sin penalty SALARY). Orden por `rank_position`. Destacados: los 3 primeros como `CandidateAnonymousCard` grandes; resto en lista compacta con paginación "Ver más".

`CandidateAnonymousCard`: `Avatar anonymous` (monograma neutro del `anon_code`), `CANDIDATO #024` (últimos 3 caracteres del anon_code o rank), familia, `geo_band` en texto ("Misma ciudad", "A menos de 30 km"), disponibilidad, `years_experience`, `ScoreBadge` con `total_score` + `score_label`, mini `ProgressRing`, chips de skills (máx. 5 + `+N`), evidencia como "Evaluada 5 · Verificada 2", checkbox `Comparar`, CTA `Ver perfil anónimo` → E9, acción secundaria `Agregar a selección` (→ `setShortlistStage("REVIEW")`, icono bookmark animado). Si `is_unlocked`, chip "Identidad desbloqueada" (sin mostrar nombre aquí).

Motion de carga: cards stagger → count-up de scores → rings → chips. Aceptación: **el tipo `AnonymousCandidateCard` no contiene nombre/foto y ningún componente de E8–E10 importa `UnlockedCandidateProfile` salvo E12**; filtros con transición; lista vacía con empty state "Aún no hay candidatos evaluados para esta familia".

## E9 — Detalle anónimo `/employer/candidates/:matchResultId` (F7)

`EmployerShell` · `matching` solo como acento en la card "Por qué es compatible" · `matching.result`, `matching.setShortlistStage`, `matching.unlock`. Cabecera clara: `Avatar anonymous`, `CANDIDATO #024`, familia, experiencia, disponibilidad, `geo_band`, `salary_band`. Card oscura protagonista: `ProgressRing` grande `total_score` + `score_label`, y **desglose** (`BreakdownItem` ×6 como barras: componente, peso, raw, contribución; texto accesible "Técnica: 82 de 100, peso 40 %, aporta 32.8 puntos"). Penalizaciones listadas con causa. `AIInsightCard` "Por qué es compatible": `explanation_text` (o skeleton "Redactando explicación…" si null y luego reintento), "Por qué": `strengths`, "Falta evidencia": `gaps`. Secciones claras: Habilidades con `EvidenceBadge`; Evidencias de entrevista (`skills[].evidence_summary`); Consistencias/inconsistencias (derivar: claims declarados no evaluados → "declarado, no validado"); Documentos verificados (conteo). CTAs: `Agregar a selección` (o etapa actual como `Select` REVIEW / INTERVIEW / FINALIST) y `Desbloquear identidad` (primary; `Modal` de confirmación: "Verás nombre, contacto y documentos. Esta acción queda registrada." → `unlock` → E12 con transición). Copy: "Basado en la evidencia disponible."

## E10 — Comparar `/employer/vacancies/:id/compare?ids=a,b,c` (F7)

`EmployerShell` · superficie clara · `matching.compare`. Desktop: hasta 3 columnas paralelas con cabecera sticky (`anon_code`, `ScoreBadge`); filas por criterio de `CompareView.criteria` (compatibilidad, técnica, conductual, experiencia, evidencia, disponibilidad, ubicación, salario) con `ProgressBar` de escala consistente; skills como chips con `EvidenceBadge`. Mobile: carrusel horizontal con snap y etiquetas de criterio sticky a la izquierda. Bloque `Ver diferencias clave` (`key_differences`): quién sobresale en qué, dónde hay menor evidencia, qué criterio podría cambiar la decisión. Copy: "Ningún ranking es una verdad absoluta; la decisión es tuya." Acciones por columna: `Ver perfil anónimo`, `Agregar a selección`.

## E11 — Selección / finalistas `/employer/vacancies/:id/shortlist` (F7)

`EmployerShell` · `matching` accent en header · `matching.shortlist`, `matching.setShortlistStage`. Funnel visual de tres columnas (desktop) o `Tabs` (mobile): **Revisar → Entrevistar → Finalistas**, con conteos. Cada entrada: `anon_code` (o nombre si `is_unlocked`, obtenido de `matching.fullProfile`), score, botones para mover de etapa (chevrons) y `Quitar`. Solo en FINALIST se muestra CTA `Desbloquear identidad` (además del detalle). Empty state por columna. Motion: mover entre columnas con `layoutId` de motion.

## E12 — Perfil desbloqueado `/employer/candidates/:matchResultId/full` (F7)

`EmployerShell` · `profile` support en hero · `matching.fullProfile` (403 → redirige a E9 con toast). Transición de entrada: `Avatar` de blur → nítido, nombre aparece con `fadeUp`, `Badge` "Identidad desbloqueada" con fecha. Datos de contacto (correo, teléfono, ubicación), CTA `Copiar correo` (copy-to-clipboard con check) y `Invitar a entrevista` (solo abre `Modal` con mensaje de plantilla; no envía). Debajo, todo lo de E9 (desglose, explicación, habilidades) más Experiencia, Estudios, Documentos (`DocumentRef` con enlace) y `company_note` (A4) en `AIInsightCard` "Qué convendría verificar en una entrevista presencial". Copy: "La IA apoya tu decisión; no la reemplaza."

## E13 — Stubs P2 (F8)

`/employer/notifications`, `/employer/messages`, `/employer/billing` (3 `Plan` como cards, `highlighted` con `cards` accent, CTA deshabilitado "Próximamente", sin pagos reales). `EmployerShell`, skeletons y empty states.
