#!/usr/bin/env node
/**
 * Captura de verificación visual del hero de la landing (07_LANDING_HERO.md).
 * Abre `/` contra el dev server ya corriendo y guarda capturas a los cuatro
 * anchos pedidos en el criterio de cierre. `--reduced` emula
 * `prefers-reduced-motion: reduce` (sin desplazamientos ni contadores).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "output", "landing");
const BASE_URL = process.env.SHOT_BASE_URL || "http://localhost:5173";
const REDUCED = process.argv.includes("--reduced");

const SIZES = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "900x1000", width: 900, height: 1000 },
  { name: "390x844", width: 390, height: 844 },
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  for (const size of SIZES) {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
    const page = await context.newPage();
    if (REDUCED) await page.emulateMedia({ reducedMotion: "reduce" });
    page.on("pageerror", (err) => console.error(`pageerror [${size.name}]: ${err.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error(`console.error [${size.name}]: ${msg.text()}`);
    });

    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    // Deja que corra la secuencia de entrada (fadeUp + paneles) antes de capturar.
    await page.waitForTimeout(1500);

    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    if (hasHorizontalScroll) {
      console.error(`⚠ scroll horizontal detectado en ${size.name}`);
    }

    const suffix = REDUCED ? "-reduced" : "";
    const filePath = path.join(OUT_DIR, `${size.name}${suffix}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`✓ ${filePath}`);

    await context.close();
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
