/**
 * Convierte `usuario_demo.png` (raíz del repo) a WebP para la landing y las
 * pantallas de demo. Ejecutar solo cuando cambie el archivo original:
 *   node scripts/optimize-demo-user.mjs
 */
import sharp from "sharp";
import { mkdirSync, statSync } from "node:fs";

const SRC = "../usuario_demo.png";
const OUT = "public/assets/demo";
mkdirSync(OUT, { recursive: true });

const sizes = [
  { name: "usuario-demo.webp", size: 440, quality: 82 },
  { name: "usuario-demo-sm.webp", size: 160, quality: 80 },
];

for (const { name, size, quality } of sizes) {
  await sharp(SRC).resize(size, size, { fit: "cover", position: "top" }).webp({ quality }).toFile(`${OUT}/${name}`);
  console.log(`${name}: ${Math.round(statSync(`${OUT}/${name}`).size / 1024)} KB`);
}
