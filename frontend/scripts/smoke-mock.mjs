// Prueba de humo del mock (criterio de cierre de F2).
//
// La spec pide `tsx` para ejecutar src/api/mock/__smoke__.ts directamente; no
// está instalado en este proyecto (no está en la lista de dependencias
// permitidas), así que en su lugar usamos `esbuild` -ya presente como
// dependencia de Vite- para empaquetar __smoke__.ts (resolviendo los alias
// "@/..." vía tsconfig.json) en un único archivo ESM y ejecutarlo con Node.
//
// Node 24 no expone `localStorage`/`import.meta.env` fuera de Vite, así que
// se definen aquí antes de importar el bundle.
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// ---- shim mínimo de localStorage (persist de zustand lo requiere al crear el store) ----
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  // zustand/middleware lee `window.localStorage`, no solo el global: en un
  // script de Node plano no existe `window`, así que se alía a globalThis.
  if (typeof globalThis.window === "undefined") globalThis.window = globalThis;
}

const tmpDir = mkdtempSync(join(tmpdir(), "ce-smoke-"));
const outfile = join(tmpDir, "smoke-bundle.mjs");

async function main() {
  await build({
    entryPoints: [join(projectRoot, "src/api/mock/__smoke__.ts")],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
    tsconfig: join(projectRoot, "tsconfig.json"),
    logLevel: "warning",
    define: {
      "import.meta.env.DEV": "false",
      "import.meta.env.VITE_API_MODE": JSON.stringify("mock"),
      "import.meta.env.VITE_API_URL": JSON.stringify("http://localhost:8000/api/v1"),
    },
  });

  const mod = await import(pathToFileURL(outfile).href);
  const log = await mod.runSmoke();
  console.log("\n=== Smoke test del mock (F2) — OK ===");
  for (const line of log) console.log(`  ✓ ${line}`);
  console.log(`\nTotal de pasos verificados: ${log.length}\n`);
}

main()
  .catch((error) => {
    console.error("\n=== Smoke test del mock (F2) — FALLÓ ===");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });
