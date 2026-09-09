const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Formatea un número como moneda MXN, ej. "$14,000". */
export function formatMXN(n: number): string {
  return mxn.format(n);
}

/** Formatea una fecha ISO como texto legible en español, ej. "9 de septiembre de 2026". */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateFormatter.format(date);
}

/** Formatea un rango numérico en miles, ej. formatRange(14000, 18000) -> "14–18 mil". */
export function formatRange(min: number, max: number): string {
  const toMiles = (n: number) => Math.round(n / 1000);
  return `${toMiles(min)}–${toMiles(max)} mil`;
}

/**
 * Años de experiencia en texto, siempre entero y con singular correcto,
 * ej. formatYearsExperience(8.6) -> "8 años de experiencia",
 * formatYearsExperience(1) -> "1 año de experiencia".
 */
export function formatYearsExperience(years: number): string {
  const rounded = Math.round(years);
  return `${rounded} ${rounded === 1 ? "año" : "años"} de experiencia`;
}
