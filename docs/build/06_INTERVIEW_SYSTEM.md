# 06 — Sistema de entrevistas y evaluación (decisiones normativas)

Traduce `docs/Master_Prompt_Conecta_Empleo_Entrevistas_IA.md` (fuente de verdad del contenido) a decisiones de implementación ya tomadas. **Ante conflicto entre este archivo y `docs/05`, gana este** para lo relativo a entrevista, rúbricas y scoring; `docs/05` sigue mandando en orquestación, invariantes, failover y voz.

Decisiones confirmadas por el usuario el 2026-09-09.

## 1. Catálogo alineado al master prompt

**3 familias × 14 competencias = 42.** Una competencia por pregunta base, 7 `TECHNICAL` (hard) + 7 `BEHAVIORAL` (soft). Reemplaza la semilla anterior de 8 por familia.

Las 7 dimensiones soft son **comunes a las tres familias** (§8 del master prompt), con texto adaptado al puesto: responsabilidad/ownership, organización y priorización, comunicación, trabajo en equipo, resolución de problemas, adaptabilidad, y criterio/integridad/seguridad según contexto.

Los `code` de competencia siguen el id de su pregunta para que la trazabilidad sea directa: `ADMIN_HA_01`, `ADMIN_SA_07`, `WAREHOUSE_HE_03`, `HEAVY_HM_05`, etc. `is_core = true` para toda pregunta cuya competencia sea crítica del puesto (mínimo las de seguridad e integridad).

## 2. Banco de preguntas como dato semilla

Vive en `backend/app/seeds/interview_bank/{admin_assistant,warehouse_supervisor,heavy_machinery_operator}.json`, versionado y cargado en runtime. **Ningún prompt contiene el texto de una pregunta ni de una rúbrica** (regla dura de `docs/05 §6.1` y §24 del master prompt).

Cada entrada:

```json
{
  "question_id": "HA-01",
  "block": "HARD",
  "sequence": 1,
  "competency_code": "ADMIN_HA_01",
  "competency_name": "Excel y hojas de cálculo",
  "text": "Cuéntame una tarea concreta que hayas realizado en Excel...",
  "evaluates": ["experiencia real", "nivel operativo", "uso de fórmulas", "verificación"],
  "suggested_follow_ups": [
    {"type": "PROFUNDIZACION", "text": "Si tuvieras una lista de 500 registros..."}
  ],
  "no_experience_variant": "Si entraras a una empresa con un sistema que no conoces, ¿cómo aprenderías...?",
  "risk_flag_triggers": [
    {"code": "DATA_INTEGRITY", "severity": "high", "when": "propone modificar datos para hacerlos coincidir"}
  ]
}
```

`question_id` es **estable y no se renumera nunca**: es la llave de comparabilidad entre candidatos y entre versiones.

## 3. Rúbricas: 42, derivadas de los criterios del master prompt

Una por competencia, con la escala común 0–4 de §9 del master prompt (Sin evidencia / Débil / Básica / Sólida / Fuerte) particularizada con los criterios "Evaluar:" que cada pregunta ya trae. Conservan el contrato `RubricCard` de `docs/05 §6.2` (`what_to_probe`, `levels`, `positive_signals`, `negative_signals`, `score_mapping`).

`score_mapping` fijo: `{"0":0,"1":25,"2":50,"3":75,"4":100}`.

Las hard se evalúan con los 5 criterios de §7 (conocimiento técnico, secuencia, aplicación práctica, riesgos, autonomía). Las soft con la estructura de §17 (contexto → acción → criterio → resultado → aprendizaje), **sin exigir formato STAR al candidato**.

## 4. Scoring

```
hard_points = Σ nivel(0–4) de las 7 preguntas HARD      → máx 28
soft_points = Σ nivel(0–4) de las 7 preguntas SOFT      → máx 28
hard_skills_score = hard_points / 28 × 100
soft_skills_score = soft_points / 28 × 100
interview_score   = hard_skills_score × 0.50 + soft_skills_score × 0.50
```

`interview_score` es **desempeño en la entrevista, no compatibilidad con una vacante**. La compatibilidad la calcula el motor de matching (B9) y es otra cosa.

Niveles descriptivos (§12): 85–100 "Evidencia muy sólida" · 70–84 "Evidencia sólida con áreas puntuales de desarrollo" · 50–69 "Evidencia parcial" · 0–49 "Evidencia insuficiente actualmente". Prohibido cualquier etiqueta de apto/no apto.

## 5. Presupuesto y modo demo

| Variable | Valor | Efecto |
|---|---|---|
| `INTERVIEW_QUESTION_BUDGET` | 14 | Recorrido completo: 7 hard + 7 soft |
| `INTERVIEW_DEMO_MODE` | `false` | En `true`, recorrido corto de 6 (3 hard + 3 soft) para presentar en vivo |
| `INTERVIEW_MAX_FOLLOWUPS_PER_QUESTION` | 2 | 1 recomendado, 2 solo ante inconsistencia o ambigüedad grave |

**Los follow-ups nunca incrementan el contador de preguntas base** (§2 y §31 del master prompt). Un `interview_turn` de follow-up se marca como tal y hereda el `question_id` de su pregunta base.

En modo demo, el `talent_profile` resultante se marca con `coverage: "PARTIAL"` y la interfaz debe decir que la evidencia es parcial. Un perfil parcial **nunca** se presenta como equivalente a uno completo.

## 6. Estado conversacional persistido

`interview_sessions.coverage_state` (JSONB ya existente) guarda:

```json
{
  "phase": "HARD | SOFT | COMPLETED",
  "current_question_id": "HA-03",
  "base_questions_answered": 2,
  "follow_ups_for_current_question": 0,
  "answered_question_ids": ["HA-01", "HA-02"],
  "claims_to_validate": ["SAP_WMS"],
  "contradictions": []
}
```

El orquestador (código Python) decide el flujo; el agente decide únicamente el contenido. Regla que ya existe y no cambia: si el agente pide terminar antes de cubrir el mínimo, se ignora.

## 6.1 Capa de comprensión antes de repreguntar (B14)

Entre "lo que la persona dijo" y "qué le pregunto ahora" hay una **etapa intermedia obligatoria**. El transcript de voz llega con muletillas y frases cortadas; repreguntar citándolo produce preguntas incoherentes y humilla a quien titubeó.

El agente llena `answer_interpretation` (`AnswerInterpretation`, `app/ai/contracts/base.py`) **antes** de decidir la acción — el campo va primero en el esquema de `InterviewTurnResult` a propósito, para que el orden en que se llena fuerce el orden del razonamiento:

| Campo | Qué es |
|---|---|
| `clean_answer` | La respuesta sin muletillas ni repeticiones |
| `summary` | 1–2 frases: qué dijo realmente |
| `topics` | Herramientas, sistemas, tareas o cifras mencionadas |
| `evidence_quality` | `SUFFICIENT \| PARTIAL \| VAGUE \| OFF_TOPIC \| NO_EXPERIENCE` |
| `missing_elements` | Qué le falta para ser evidencia |
| `contradicts_claims` | Claims del CV con los que choca |
| `probe_focus` | El tema a profundizar, ya redactado de forma legible |

**La siguiente pregunta se construye sobre `probe_focus`, nunca sobre `answer_text`.**

Dos reglas duras sobre `clean_answer`, ambas con test: no agrega información que la persona no dijo, y **no cambia su registro ni su vocabulario** — "traducir" a lenguaje corporativo rompería §8.4 y contradiría la Constitución ("La forma de hablar no es la competencia").

Se persiste en `interview_turns.answer_interpretation` (JSONB). `answer_text` conserva siempre el transcript crudo: la interpretación es lectura derivada y auditable, nunca un reemplazo de la evidencia.

Que la etapa ocurrió **no depende del modelo**: el Guardián de Equidad bloquea por código toda pregunta que devuelva el transcript a la persona (`VERBATIM_QUOTE`, `TRANSCRIPT_ARTIFACT` — ver §8).

## 7. Extensiones aditivas al contrato

No rompen nada de lo ya construido en el frontend.

| Tipo | Campo nuevo | Motivo |
|---|---|---|
| `InterviewTurn` | `question_id: string \| null` | ID estable del banco (`HA-01`). Null en follow-ups libres |
| `InterviewTurn` | `is_follow_up: boolean` | Para no contarlo como pregunta base |
| `InterviewTurn` | `block: "HARD" \| "SOFT" \| null` | Permite mostrar la transición entre bloques |
| `InterviewTurnResult` | `answer_interpretation: AnswerInterpretation \| null` | B14, §6.1. Va primero en el esquema: interpretar antes de preguntar |
| `TurnDTO` | `interpretation: AnswerInterpretation \| null` | La lectura limpia viaja junto al transcript crudo hacia A2 y A3 |
| `CompetencyEvaluation` | `question_id: string \| null` | Trazabilidad pregunta ↔ evaluación |
| `TalentProfile` | `hard_skills_score: number` | §11 del master prompt |
| `TalentProfile` | `soft_skills_score: number` | §11 |
| `TalentProfile` | `interview_score: number` | §11 |
| `TalentProfile` | `coverage: "FULL" \| "PARTIAL"` | Distingue el modo demo |
| `TalentProfile` | `risk_flags: RiskFlag[]` | §18 |
| `TalentProfile` | `inconsistencies: Inconsistency[]` | §23 |

```ts
interface RiskFlag { code: string; severity: "low" | "medium" | "high"; question_id: string | null; description: string; }
interface Inconsistency { claim: string; observed_evidence: string; severity: "low" | "medium" | "high"; }
```

**Las banderas de riesgo son evidencia, nunca decisiones** (§18). Se muestran a la empresa solo tras el desbloqueo, junto con la nota de A4.

## 8. Reglas de seguridad que se prueban con tests

De §31 del master prompt, obligatorias:

1. Operador de maquinaria: una respuesta que decide seguir operando ante una fuga hidráulica o falla crítica **produce** `SAFETY_CRITICAL` de severidad alta.
2. Almacén: nunca se puntúa positivamente una respuesta que anteponga la mercancía a la integridad física de una persona.
3. Administrativo: divulgar información confidencial sin autorización, o alterar datos para "hacerlos coincidir", produce bandera.
4. Registro formal contra registro coloquial: dos transcripciones equivalentes en contenido obtienen scores dentro de ±10 puntos. **Es la prueba de sesgo más importante del sistema** y no es negociable.
5. Ninguna pregunta emitida toca los temas prohibidos de §22 (edad, género, estado civil, embarazo, religión, orientación, afiliación política, origen étnico, salud, situación familiar).
6. **B14** — Ninguna pregunta emitida devuelve el transcript crudo a la persona: ni un tramo de ≥5 palabras copiado de su respuesta anterior (`VERBATIM_QUOTE`), ni muletillas o citas cortadas con puntos suspensivos (`TRANSCRIPT_ARTIFACT`). Se verifica sobre el adaptador determinista, sobre el agente real y de punta a punta por la API (`tests/test_answer_interpretation.py`).

## 9. Proveedores confirmados

| Capa | Decisión |
|---|---|
| LLM | `claude-sonnet-5` primario (verificado contra la cuenta del usuario: responde 200). `AI_MODE=live` por defecto, con `demo` como respaldo conmutable en caliente |
| Failover | Sin clave de OpenAI disponible. Si el primario falla: reintento y luego **caída al adaptador determinista**, no a otro proveedor. Dejar el punto de extensión listo por si aparece la clave |
| Voz | ElevenLabs Scribe (STT) + Flash v2.5 (TTS), **activada por defecto** por decisión del usuario |

**Salvaguarda de cuota (obligatoria):** la cuenta de ElevenLabs tiene 10,000 caracteres de tier `payg`. Implementar un contador persistente de caracteres sintetizados y un corte automático que conmuta a texto al llegar al 85 % del límite configurable (`TTS_CHARACTER_BUDGET`), avisando en la interfaz. El objetivo es que la voz nunca muera a media presentación: es preferible perderla antes, avisando, que a mitad de la demo.
