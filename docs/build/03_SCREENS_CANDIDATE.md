# 03 — Pantallas del candidato

Formato por pantalla: ruta · layout · fondo · datos (métodos de `ApiClient`) · contenido · estados · motion · aceptación. Mobile-first, luego desktop. Todo texto en español de México. Tokens y componentes: `01_FRONTEND_FOUNDATIONS.md`. Tipos: `02_API_CONTRACT.md`.

Guards de ruta (en `app/router.tsx`, tarea F2): `/candidate/*` requiere sesión con `role=CANDIDATE`; `/employer/*` requiere `COMPANY`; sin sesión → `/login?next=`. Un `CandidateGate` opcional redirige según `candidate.status().next_step` cuando el usuario entra a `/candidate` (raíz).

---

## C0 — Landing `/` (F3)

`AuthLayout` sin formulario · `brand-main` hero · sin datos. Hero oscuro con eyebrow `MARKETPLACE DE TALENTO VERIFICADO`, H1 "No hacemos match entre vacantes y currículums. Hacemos match entre vacantes y capacidades demostradas.", subtítulo corto, dos CTA: `Soy candidato` (primary, → `/register?role=CANDIDATE`) y `Soy empresa` (secondary, → `/register?role=COMPANY`), enlace ghost `Ya tengo cuenta` → `/login`. Debajo, sobre superficie clara, tres `Card` con los principios: Evidencia sobre declaraciones · Matching explicable · Primer filtro sin sesgos. Motion: secuencia de entrada completa (§7 de 01) y ambient scale del fondo. Aceptación: LCP con imagen `eager`, ninguna otra imagen eager.

## C1 — Login `/login` (F3)

`AuthLayout` · `brand-main` (si `?role=COMPANY` o toggle activo → `employer`) · `auth.login`. Toggle segmentado `Candidato | Empresa` (solo cambia copy y destino post-login; el backend deduce el rol del usuario). Copy candidato: "Bienvenido de vuelta" / "Tu talento habla por ti." Copy empresa: "Acceso para empresas" / "Encuentra talento con evidencia." Campos correo y contraseña (`zod`), CTA `Entrar →`, enlace `Crear cuenta`. Post-login: candidato → `/candidate` (gate decide), empresa → `/employer`. Error de credenciales accionable bajo el formulario, `aria-live`. Hint discreto en modo mock con los usuarios demo. Motion: hero fade, panel blanco sube 30 px, inputs stagger, CTA al final.

## C2 — Registro `/register` (F3)

Igual que C1 con `auth.register`. Selector de rol como dos cards seleccionables con icono (User / Building2) y check animado. Campos: correo, contraseña (≥ 8), confirmar. Al crear: candidato → `/candidate/onboarding`; empresa → `/employer/onboarding`. Mensaje de privacidad bajo el CTA.

## C3 — Onboarding candidato `/candidate/onboarding` (F3)

`ImmersiveLayout` · `onboarding` support en tercio superior · `catalog.jobFamilies`, `candidate.update`, `candidate.setJobFamily`. `ProgressSteps` "Paso 1 de 3" con transición horizontal entre pasos (`slideInRight`/`Left`).

1. **¿Qué tipo de puesto buscas?** Tres cards grandes seleccionables con icono (ClipboardList · HardHat · Warehouse), nombre y `role_objective`. Selección: scale .98→1, halo, check dibujado. Guarda con `setJobFamily`.
2. **Cuéntanos sobre ti.** Nombre completo, teléfono (opcional), ciudad y estado (`Select` con estados de México + input ciudad), disponibilidad (chips: Inmediata / 2 semanas / 1 mes), expectativa salarial mensual (`Slider` doble o dos inputs con formato MXN). Guarda con `candidate.update`.
3. **¿Cómo quieres construir tu perfil?** Dos cards: `Subir mi CV` (FileText, "Extraemos tu información con IA") → `/candidate/cv/upload`; `Crear desde cero` (Sparkles, "Construye tu perfil paso a paso, conversando") → `/candidate/cv/build`.

Estados: guardado con toast; error de red con reintento. Botón `Volver` ghost. Aceptación: se puede completar con teclado; datos persisten al recargar (mock).

## C4 — Home candidato `/candidate` y `/candidate/home` (F3)

`CandidateShell` · sin fondo o `brand-main` accent en la card "Tu siguiente paso" · `candidate.status`, `candidate.me`, `opportunities.list` (3 primeras). Header con saludo por nombre y `ProgressRing` de `completion_percent`. Card oscura protagonista "Tu siguiente paso" con CTA según `next_step` (ONBOARDING → onboarding, CV → carga, REVIEW_CLAIMS → revisión, INTERVIEW → `/candidate/interview/prepare`, WAITING_EVALUATION → estado de proceso, DONE → `/candidate/profile`). Sección "Oportunidades para ti" con 3 `JobCard` y enlace a ver todas (si el candidato no está EVALUATED, mostrar empty state "Completa tu entrevista para ver tu compatibilidad"). Motion: ring y cascade.

## C5 — Carga de CV `/candidate/cv/upload` (F3)

`ImmersiveLayout` · sin fondo · `documents.uploadCV` → `jobs.get` polling → `documents.extraction`. `FileUploader` con mensaje de privacidad del CV. Al subir: `ProcessingStatus` con mensajes "Leyendo experiencia" → "Identificando habilidades" → "Organizando tu perfil" vinculados a `progress`. DONE → `/candidate/cv/review`. FAILED → error "No pudimos procesar este archivo…" con opciones `Intentar de nuevo` y `Crear desde cero`. El perfil no se altera en fallo. Aceptación: no fingir análisis; si el job ya terminó, la animación dura < 1 s.

## C6 — CV conversacional `/candidate/cv/build` (F3)

`ImmersiveLayout` · `onboarding` accent · `cvBuilder.createSession`, `sendMessage`, `finalize`. Chat con burbujas (agente izquierda con `Avatar` de marca, candidato derecha), textarea de 1–4 líneas con envío por Enter, indicador "Sofía está escribiendo…" mientras responde. Barra superior `Turno 3 de 8`. Panel lateral en desktop (40 %) "Tu perfil se va armando" que muestra `session.draft` (experiencia, estudios, habilidades) actualizándose con `fadeUp`. Botón de voz (Mic) que usa `VoiceGateway.startListening/stopListening` para dictar al textarea si `available`; si no, oculto. Al `done`: CTA `Revisar mi perfil` → `finalize` → `/candidate/cv/review`. Lenguaje del agente llano (viene del mock). Aceptación: "no sé" se acepta y avanza; se puede editar la respuesta antes de enviar.

## C7 — Revisión de claims `/candidate/cv/review` (F3)

`CandidateShell` (o Immersive con cerrar) · sin fondo · `documents.extraction`, `documents.confirmExtraction`. Eyebrow `REVISA TU INFORMACIÓN`, H1 "Así entendimos tu experiencia". Secciones editables: Experiencia (lista de `ExperienceItem` con editar/eliminar/agregar en `BottomSheet`/`Modal`), Estudios, Habilidades (chips con nivel 1–4 seleccionable, eliminar), Certificaciones. Claims con `needs_validation` muestran `EvidenceBadge level="pending"` y nota "Lo exploraremos en la entrevista". Indicador de confianza de la extracción como texto ("Extracción con confianza alta"). CTA fijo inferior `Confirmar y continuar` → `confirmExtraction` → `/candidate/interview/prepare`. Aceptación: la versión confirmada es la que ve la entrevista (mock la usa para claims).

---

## C8 — Preparación de entrevista `/candidate/interview/prepare` (F4)

`ImmersiveLayout` · `interview` support · `candidate.me`, `catalog.competencies`, `interviews.create(mode)`. Debe transmitir calma. H1 "Tu entrevista con IA", sub "Una conversación para conocer mejor tu experiencia y cómo resuelves situaciones reales." Panel destacado: duración estimada (~8 min), formato (voz o texto), estado del micrófono (probar con `useMicrophone` y mostrar nivel en una barra), conexión. "Qué evaluaremos": lista de competencias core de su familia con `Badge`. Checklist previo con checks animados. Selector de modo: `Con voz` (recomendado, solo si `VoiceGateway.available` y permiso concedido) / `Por texto`. Mensaje de privacidad de entrevista. CTA `Comenzar entrevista →` → `create(mode)` → `/candidate/interview/:id`. Si ya hay sesión IN_PROGRESS: CTA `Continuar entrevista`.

## C9 — Entrevista en curso `/candidate/interview/:id` (F4) — pantalla clave

`ImmersiveLayout` full dark, sin nav · `interview` presence accent detrás del Orb (opacidad .2–.4, `saturate(.7)`, overlay) · `interviews.get`, `nextQuestion`, `answer`, `progress`, `complete` + `VoiceGateway` + `AudioOrb`.

Estructura mobile (columna): logo · botón cerrar (confirma en `Modal` "Puedes retomar después; tu progreso se guarda") · `Pregunta 3 de 6` + `ProgressSteps` · pregunta grande (H2, máx. 2 oraciones) con `aria-live="polite"` · `AudioOrb` 260–320 px centrado · label de estado bajo el Orb · controles. Desktop: 60/40, Orb + pregunta a la izquierda, panel de contexto a la derecha (competencia que se explora, cobertura como lista con `CoverageStatus`, historial de turnos colapsable, y transcripción en vivo).

Máquina de estados de la UI (`useInterviewMachine`):
`loading` → `speaking` (Orb `speaking`, `VoiceGateway.speak(question)`; en modo texto se salta) → `listening` (Orb `listening` con analyser del micrófono; timer visible; botón `Terminar respuesta`; en texto: textarea + `Enviar`) → `thinking` (Orb `thinking`, label "Analizando respuesta…", `interviews.answer`) → `speaking` con la nueva pregunta… → `finished` cuando `NextQuestion.finished` → llama `complete` → `/candidate/interview/:id/result?job=`.

Controles: `Repetir pregunta` (vuelve a `speak` sin consumir turno), micrófono (mute/unmute), `Pausar` (Orb `idle`, guarda estado), `Terminar respuesta`. Toggle `Responder por texto` siempre visible: si la voz falla (permiso denegado, `speak` rechaza) se cambia a texto **sin perder el turno**, con toast "No pudimos usar el audio; puedes continuar escribiendo". Transcripción visible y editable antes de enviar en modo voz. Detección de silencio 2.5 s (opcional, solo si STT del navegador lo soporta; si no, el usuario pulsa `Terminar respuesta`).

Motion: pregunta entra con `fadeUp`; cambio de pregunta con crossfade; Orb nunca se remonta (misma instancia, cambia `state`); Orb en `quality="low"` si `hardwareConcurrency <= 4` o pantalla < 768. Reduced motion: el Orb ya lo respeta; sin count-ups.

Aceptación: la entrevista completa se puede hacer 100 % por texto y por teclado; al menos una pregunta del mock cita una respuesta anterior y la UI la marca con un chip "Profundiza en tu respuesta anterior"; `references_turn_id` visible en el panel de contexto; cerrar y volver retoma en la misma pregunta; `dispose` de audio al desmontar (sin fugas de `AudioContext`).

## C10 — Resultado de entrevista `/candidate/interview/:id/result` (F4)

`ImmersiveLayout` con salida a shell · `results` hero · `jobs.get(?job)` polling con `ProcessingStatus` ("Preparando tu resumen…") → `candidate.talentProfile`, `candidate.feedback`. Hero oscuro con `ProgressRing` grande `overall_score` (0→valor) y `overall_label` textual moderado. Card blanca "Desempeño por competencia" con `ProgressBar` por evaluación (delay incremental), cada una expandible mostrando `justification`, `confidence` en texto ("confianza media") y `EvidenceBadge` (`rubric_source` PROVISIONAL → badge "rúbrica provisional" con tooltip). `AIInsightCard` "Fortaleza principal" y "Oportunidad de desarrollo" (desde `strengths[0]`, `evidence_gaps[0]`, `feedback.candidate_note`). Copy fijo: "Resultados basados en tu entrevista por competencias con IA. Son una guía sobre la evidencia observada durante esta sesión." CTA `Ver mi Perfil de Talento Verificado →`. Motion: H1 → ring → card → barras → insight cards. Aceptación: ningún score sin texto; nada que suene a aprobado/reprobado.

---

## C11 — Perfil de Talento Verificado `/candidate/profile` (F5)

`CandidateShell` · `profile` support en hero · `candidate.me`, `candidate.talentProfile` (404 → variante "perfil en construcción"), `candidate.skills`, `candidate.learningPath`. Hero: eyebrow `PERFIL VERIFICADO`, H1 "Tu talento habla por ti.", `Avatar` (foto o iniciales), nombre, familia, ubicación, disponibilidad, `Badge` "Entrevista con IA completada". Cuerpo claro con `Tabs` o secciones: Sobre mí (bio editable) · Habilidades (`SkillChip` + `EvidenceBadge` por skill según flags `is_declared/is_evaluated/is_verified`; leyenda de los tres niveles) · Evidencias (`CompetencyEvaluation` resumidas) · Experiencia · Estudios · Certificaciones (`documents.uploadCertification` con selector de skill; tras subir, badge `pending` con nota "Se revisará para marcarla como verificada" — el frontend nunca marca verified) · Ruta de desarrollo (`LearningPath`, máx. 3 brechas con recomendaciones del catálogo). Botón `Descargar CV` si existe `cvBuilder.document` (mock: enlace a un PDF estático de ejemplo). Motion: ring de completitud, secciones en cascade, badge verificado con scale-in.

## C12 — Editar perfil `/candidate/profile/edit` (F5)

`CandidateShell` · sin fondo · `candidate.update`. Formulario por secciones (datos básicos, ubicación, disponibilidad, salario, bio) con `FormField`, guardado por sección con toast. Foto opcional (solo URL o archivo local a data URL en mock). Nota: "Tu nombre y foto solo se muestran a empresas después de que te seleccionen."

## C13 — Oportunidades `/candidate/opportunities` (F5)

`CandidateShell` · `brand-main` accent en header · `opportunities.list`. H1 "Oportunidades para ti". `FilterPills`: Para ti · Familia · Modalidad · Ubicación. Card protagonista (`Card dark` + `cards` accent) con la de mayor compatibilidad; grid de `JobCard` (rol, empresa + check verificada, ubicación, modalidad, salario, `ScoreBadge` compatibilidad con label o "Completa tu entrevista para ver compatibilidad", `applied` chip, bookmark animado local). Empty state si no hay. Motion: ring fill, reveal, filtros con transición.

## C14 — Detalle de oportunidad `/candidate/opportunities/:id` (F5)

`CandidateShell` · sin fondo · `opportunities.get`, `opportunities.apply`. Cabecera con puesto, empresa, ubicación, modalidad, salario. `AIInsightCard` "Por qué encajas" (`why_fit`) y "Requisitos aún sin evidencia" (`missing_evidence`) con `EvidenceBadge`. Requisitos listados con `kind` (Esencial / Deseable) y nivel. Descripción. CTA `Postularme` → `apply` → estado `Postulación enviada` con check animado y toast. Sin paso adicional de contacto.

## C15 — Stubs P2 (F8)

`/candidate/notifications` y `/candidate/messages` con `CandidateShell`, listas desde `mocks.notifications/messages`, empty states y skeletons. Sin lógica real. Enlaces desde el header (Bell) y bottom nav secundaria.
