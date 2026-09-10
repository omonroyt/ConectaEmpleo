/**
 * Etiquetas legibles para habilidades que a veces llegan sin nombre propio.
 *
 * La extracción mock de "Subir mi CV" (`src/api/mock/engine/cv.ts` ::
 * `generateExtractionFromFile`) usa el código de la competencia también como
 * `name` cuando no hay archivo real que leer — ver `skills: skillCodes.map(
 * (code) => ({ code, name: code, ... }))`. Eso hacía que la revisión
 * mostrara literalmente "OFFICE_TOOLS" en vez de "Herramientas de oficina".
 *
 * No existe un mapa código→etiqueta ya expuesto por la API para estos
 * códigos: `useSkillsCatalog()` (`api.catalog.skills()`) trae un catálogo de
 * habilidades distinto (Excel, Word, montacargas, etc.), y los códigos que
 * aparecen aquí (`OFFICE_TOOLS`, `MACHINERY_OPERATION`...) son en realidad
 * códigos de *competencia* (`src/api/mock/seed/catalog.ts`). Este mapa vive
 * en la propia vista porque solo cambia cómo se muestra: el valor que viaja
 * a `useConfirmExtraction` sigue siendo el `code`/`name` originales.
 */
const SKILL_CODE_LABELS: Record<string, string> = {
  OFFICE_TOOLS: "Herramientas de oficina (Excel, Word, correo)",
  DOCUMENT_CONTROL: "Control documental y archivo",
  CUSTOMER_SERVICE: "Atención a clientes y proveedores",
  MACHINERY_OPERATION: "Operación de maquinaria",
  SAFETY_PROTOCOLS: "Protocolos de seguridad",
  LOAD_HANDLING: "Manejo de cargas",
  INVENTORY_CONTROL: "Control de inventarios",
  FORKLIFT_SAFETY: "Seguridad en montacargas",
  RECEIVING_DISPATCH: "Recepción y despacho",
};

/** Un nombre real que alguien redactó (a mano o por voz) nunca calza este
 * patrón — solo lo hace un código crudo tipo `ENUM_VALUE`, así que no hay
 * riesgo de "corregir" un dato legítimo del candidato. */
const RAW_CODE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/;

/** `MACHINERY_OPERATION` → `Machinery operation`, para cualquier código sin
 * entrada en el mapa (red de seguridad ante códigos futuros). */
function humanizeCode(code: string): string {
  const words = code.toLowerCase().split("_").filter(Boolean);
  if (words.length === 0) return code;
  return [words[0].charAt(0).toUpperCase() + words[0].slice(1), ...words.slice(1)].join(" ");
}

/** Nombre a mostrar para una habilidad de la revisión de CV. */
export function skillDisplayName(skill: { code: string; name: string }): string {
  if (!RAW_CODE_PATTERN.test(skill.name)) return skill.name;
  return SKILL_CODE_LABELS[skill.code] ?? humanizeCode(skill.code);
}
