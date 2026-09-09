// Convierte los PNG de fondo de marca (raíz del repo) a WebP optimizado.
// Uso: npm run optimize:backgrounds (desde frontend/)
import sharp from "sharp";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");
const outDir = resolve(__dirname, "..", "public", "assets", "brand", "backgrounds");

/** Mapa: PNG de origen (raíz del repo) -> nombre de asset de salida. */
const assets = [
  { src: "fondo_marca.png", out: "brand-main" },
  { src: "fondo_entrevista.png", out: "interview" },
  { src: "fondo_matching.png", out: "matching" },
  { src: "fondo_resultados.png", out: "results" },
  { src: "fondo_perfil.png", out: "profile" },
  { src: "fondo_empresa.png", out: "employer" },
  { src: "fondo_oboarding.png", out: "onboarding" }, // typo intencional del archivo original
  { src: "fondo_cards.png", out: "cards" },
];

const variants = [
  { suffix: "", width: 1600 },
  { suffix: "-mobile", width: 900 },
];

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

let ok = 0;
let failed = 0;

for (const asset of assets) {
  const srcPath = resolve(repoRoot, asset.src);
  if (!existsSync(srcPath)) {
    console.error(`[optimize-backgrounds] Falta el origen: ${asset.src}`);
    failed++;
    continue;
  }
  for (const variant of variants) {
    const outPath = resolve(outDir, `${asset.out}${variant.suffix}.webp`);
    await sharp(srcPath)
      .resize({ width: variant.width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(outPath);
    const kb = (statSync(outPath).size / 1024).toFixed(0);
    console.log(`[optimize-backgrounds] ${asset.out}${variant.suffix}.webp — ${kb} KB`);
    ok++;
  }
}

console.log(`[optimize-backgrounds] Listo: ${ok} archivos generados, ${failed} orígenes faltantes.`);
if (failed > 0) process.exitCode = 1;
