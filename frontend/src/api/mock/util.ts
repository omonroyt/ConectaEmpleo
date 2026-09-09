/** Utilidades internas del mock: latencia simulada, ids e id de secuencia determinista. */

/** Espera entre 300 y 900 ms (o el rango dado) para simular latencia de red. */
export function delay(minMs = 300, maxMs = 900): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let counter = 0;
/** Id incremental legible, estable dentro de una sesión del proceso (no persiste el contador entre recargas). */
export function genId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

/** Generador pseudoaleatorio determinista (mulberry32) para que la semilla sea reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

export function pickMany<T>(items: readonly T[], count: number, rng: () => number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < count && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}

export function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(min + rng() * (max - min + 1));
}

export function wordCount(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

export function excerpt(text: string, words = 8): string {
  const parts = text.trim().split(/\s+/);
  return parts.slice(0, words).join(" ") + (parts.length > words ? "…" : "");
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function nowIso(): string {
  return new Date().toISOString();
}
