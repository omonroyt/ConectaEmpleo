import type { RequirementInput, RequirementResolution } from "@/api/types";
import { DEFAULT_WEIGHTS } from "../seed/catalog";

interface KeywordRule {
  pattern: RegExp;
  competency_code?: string;
  skill_code?: string;
  label: string;
  kind: "MANDATORY" | "DESIRABLE";
  min_level: 1 | 2 | 3 | 4;
}

/** Mapeo por palabras clave al catálogo (competencias/skills), agnóstico de familia. */
const KEYWORD_RULES: KeywordRule[] = [
  { pattern: /excel/i, skill_code: "EXCEL_INTERMEDIATE", label: "Manejo de Excel", kind: "MANDATORY", min_level: 2 },
  { pattern: /word/i, skill_code: "WORD_ADVANCED", label: "Manejo de Word", kind: "DESIRABLE", min_level: 2 },
  { pattern: /correo|outlook/i, skill_code: "OUTLOOK_MANAGEMENT", label: "Gestión de correo", kind: "DESIRABLE", min_level: 2 },
  { pattern: /archivo|documental|expedientes/i, competency_code: "DOCUMENT_CONTROL", label: "Control documental y archivo", kind: "MANDATORY", min_level: 2 },
  { pattern: /atenci[oó]n a clientes?|servicio a clientes?/i, competency_code: "CUSTOMER_SERVICE", label: "Atención a clientes", kind: "MANDATORY", min_level: 2 },
  { pattern: /agenda|coordinar reuniones/i, competency_code: "SCHEDULING_COORDINATION", label: "Agenda y coordinación", kind: "DESIRABLE", min_level: 2 },
  { pattern: /redacci[oó]n|comunicaci[oó]n escrita/i, competency_code: "WRITTEN_COMMUNICATION", label: "Comunicación escrita", kind: "DESIRABLE", min_level: 2 },
  { pattern: /priorizar|organizaci[oó]n/i, competency_code: "ORGANIZATION_PRIORITIZATION", label: "Organización y priorización", kind: "DESIRABLE", min_level: 2 },
  { pattern: /montacargas|forklift/i, skill_code: "FORKLIFT_OPERATION", label: "Operación de montacargas", kind: "MANDATORY", min_level: 3 },
  { pattern: /grúa|grua/i, skill_code: "CRANE_OPERATION", label: "Operación de grúa", kind: "MANDATORY", min_level: 3 },
  { pattern: /retroexcavadora|excavadora/i, skill_code: "EXCAVATOR_OPERATION", label: "Operación de retroexcavadora", kind: "MANDATORY", min_level: 3 },
  { pattern: /bulldozer|topador/i, skill_code: "BULLDOZER_OPERATION", label: "Operación de bulldozer", kind: "MANDATORY", min_level: 3 },
  { pattern: /cargador frontal/i, skill_code: "LOADER_OPERATION", label: "Operación de cargador frontal", kind: "MANDATORY", min_level: 3 },
  { pattern: /maquinaria pesada|operador de maquinaria/i, competency_code: "MACHINERY_OPERATION", label: "Operación de maquinaria pesada", kind: "MANDATORY", min_level: 3 },
  { pattern: /seguridad|protocolos de seguridad|epp/i, competency_code: "SAFETY_PROTOCOLS", label: "Protocolos de seguridad", kind: "MANDATORY", min_level: 3 },
  { pattern: /mantenimiento preventivo/i, competency_code: "PREVENTIVE_MAINTENANCE", label: "Mantenimiento preventivo", kind: "DESIRABLE", min_level: 2 },
  { pattern: /manejo de cargas|carga pesada/i, competency_code: "LOAD_HANDLING", label: "Manejo de cargas", kind: "MANDATORY", min_level: 2 },
  { pattern: /inventario/i, competency_code: "INVENTORY_CONTROL", label: "Control de inventarios", kind: "MANDATORY", min_level: 3 },
  { pattern: /sap/i, skill_code: "SAP_WMS", label: "Experiencia con SAP WMS", kind: "DESIRABLE", min_level: 2 },
  { pattern: /wms|erp/i, competency_code: "WMS_ERP_SYSTEMS", label: "Sistemas WMS / ERP", kind: "DESIRABLE", min_level: 2 },
  { pattern: /recepci[oó]n|despacho/i, competency_code: "RECEIVING_DISPATCH", label: "Recepción y despacho", kind: "MANDATORY", min_level: 2 },
  { pattern: /coordinaci[oó]n de equipo|liderar equipo/i, competency_code: "TEAM_COORDINATION", label: "Coordinación de equipo", kind: "DESIRABLE", min_level: 2 },
  { pattern: /ingl[eé]s/i, skill_code: "BILINGUAL_ENGLISH_BASIC", label: "Inglés básico", kind: "DESIRABLE", min_level: 1 },
];

/** Frases discriminatorias que deben advertirse y nunca traducirse en un requisito. */
const DISCRIMINATORY_RULES: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /m[aá]ximo\s+\d{2}\s*años?/i, reason: "Límite máximo de edad: criterio discriminatorio por edad." },
  { pattern: /m[ií]nimo\s+\d{2}\s*años?\s+de\s+edad/i, reason: "Límite mínimo de edad fuera de lo laboralmente exigible: criterio discriminatorio por edad." },
  { pattern: /solo\s+(hombres|mujeres)/i, reason: "Restricción por sexo o género: criterio discriminatorio." },
  { pattern: /sexo\s+(masculino|femenino)/i, reason: "Restricción por sexo: criterio discriminatorio." },
  { pattern: /buena presentaci[oó]n/i, reason: "Exigencia de \"buena presentación\": criterio discriminatorio por apariencia." },
  { pattern: /estado civil|soltera?o?/i, reason: "Referencia a estado civil: criterio discriminatorio." },
  { pattern: /sin hijos/i, reason: "Exclusión por tener hijos: criterio discriminatorio." },
  { pattern: /nacionalidad mexicana|de nacimiento/i, reason: "Restricción por nacionalidad: criterio discriminatorio." },
];

function splitPhrases(freeText: string): string[] {
  return freeText
    .split(/[\n.;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function resolveRequirements(freeText: string): RequirementResolution {
  const phrases = splitPhrases(freeText);
  const mapped: RequirementInput[] = [];
  const unmapped: string[] = [];
  const warnings: { text: string; reason: string }[] = [];
  const usedCodes = new Set<string>();

  for (const phrase of phrases) {
    let matchedThisPhrase = false;
    for (const rule of KEYWORD_RULES) {
      if (rule.pattern.test(phrase)) {
        const key = rule.competency_code ?? rule.skill_code ?? rule.label;
        if (!usedCodes.has(key)) {
          usedCodes.add(key);
          mapped.push({
            competency_code: rule.competency_code ?? null,
            skill_code: rule.skill_code ?? null,
            label: rule.label,
            kind: rule.kind,
            min_level: rule.min_level,
            weight: 0,
          });
        }
        matchedThisPhrase = true;
      }
    }
    for (const rule of DISCRIMINATORY_RULES) {
      if (rule.pattern.test(phrase)) {
        warnings.push({ text: phrase, reason: rule.reason });
        matchedThisPhrase = true;
      }
    }
    if (!matchedThisPhrase) unmapped.push(phrase);
  }

  const equalWeight = mapped.length > 0 ? Math.round(100 / mapped.length) : 0;
  const withWeights = mapped.map((r, idx) => ({
    ...r,
    weight: idx === mapped.length - 1 ? 100 - equalWeight * (mapped.length - 1) : equalWeight,
  }));

  return {
    mapped: withWeights,
    unmapped,
    warnings,
    suggested_weights: { ...DEFAULT_WEIGHTS },
  };
}
