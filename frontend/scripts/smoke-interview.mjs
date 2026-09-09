// Prueba de humo del flujo de entrevista (F4): C8 → C9 → C10 sobre el mock.
//
// Mismo patrón que scripts/smoke-mock.mjs (F2): esbuild empaqueta el entry TS
// resolviendo los alias "@/..." y Node ejecuta el bundle con un shim mínimo de
// localStorage/window. Uso: node scripts/smoke-interview.mjs
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

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
  if (typeof globalThis.window === "undefined") globalThis.window = globalThis;
}

const tmpDir = mkdtempSync(join(tmpdir(), "ce-smoke-interview-"));
const outfile = join(tmpDir, "smoke-interview-bundle.mjs");

async function main() {
  await build({
    entryPoints: [join(projectRoot, "src/features/candidate/interview/__smoke__.ts")],
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
  const log = await mod.runInterviewSmoke();
  console.log("\n=== Smoke test de la entrevista (F4) — OK ===");
  for (const line of log) console.log(`  ✓ ${line}`);
  console.log(`\nTotal de pasos verificados: ${log.length}\n`);
}

main()
  .catch((error) => {
    console.error("\n=== Smoke test de la entrevista (F4) — FALLÓ ===");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });
