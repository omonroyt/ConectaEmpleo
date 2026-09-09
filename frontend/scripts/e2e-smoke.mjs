#!/usr/bin/env node
/**
 * F8 — Recorrido real en navegador (Chromium headless vía Playwright).
 *
 * Levanta `vite` en modo dev (necesario: `window.__ce.resetMock()` solo existe
 * en `import.meta.env.DEV`) en un puerto libre y recorre los journeys de
 * candidato, empresa y `maria@demo.mx` descritos en la spec de F8, capturando:
 *   - Excepciones no manejadas (`page.on("pageerror")`).
 *   - `console.error` (se reportan; no todos son fatales, pero se listan).
 *   - Screenshots a 390×844 (mobile) y 1280×800 (desktop) en `output/e2e/`.
 *
 * Las interacciones reales (formularios, clics) ocurren a 1280×800 porque el
 * aside/sidebar desktop está siempre montado y los selectores son estables;
 * en cada punto de control (`snap`) se cambia el viewport a 390×844, se toma
 * la captura mobile, y se regresa a 1280×800 sin perder el estado de la SPA
 * (mismo `page`, mismo React tree) antes de continuar.
 *
 * Sale con código != 0 si hubo `pageerror`, o si algún paso no encontró su
 * elemento / no cumplió su aserción (anonimato, advertencia discriminatoria,
 * conteo de candidatos, etc.).
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "output", "e2e");
const DEMO_CV = path.join(ROOT, "public", "demo", "cv-ejemplo.pdf");

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };
const CANDIDATE_ANON_EMAIL = "candidato@demo.mx";
const CANDIDATE_PASSWORD = "demo1234";
const MARIA_EMAIL = "maria@demo.mx";
const EMPLOYER_EMAIL = "empresa@demo.mx";

/** Nombres reales de la semilla (15 candidatos) — nunca deben aparecer en E8/E9. */
const SEED_FULL_NAMES = [
  "Ana Karen Flores Jiménez",
  "Diego Alejandro Ramírez Torres",
  "Lucía Fernanda Morales Castillo",
  "José Manuel Herrera Vázquez",
  "Paola Guadalupe Sánchez Reyes",
  "Juan Carlos Mendoza Ríos",
  "Roberto Carlos Aguilar Domínguez",
  "Miguel Ángel Torres Salinas",
  "Francisco Javier Cruz Ortega",
  "Alejandro Gómez Villanueva",
  "María José Hernández López",
  "Sergio Iván Martínez Cabrera",
  "Karla Patricia Delgado Nuñez",
  "Eduardo Daniel Rojas Peña",
  "Verónica Isabel Campos Rivera",
];

const problems = [];
let stepCount = 0;
let okCount = 0;

function log(msg) {
  console.log(msg);
}

function fail(label, err) {
  const message = err instanceof Error ? err.message : String(err);
  problems.push(`FALLO — ${label}: ${message}`);
  log(`  ✗ ${label}: ${message}`);
}

async function step(label, fn) {
  stepCount += 1;
  log(`→ [${stepCount}] ${label}`);
  try {
    await fn();
    okCount += 1;
    log(`  ✓ ok`);
  } catch (err) {
    fail(label, err);
    throw err;
  }
}

function attachDiagnostics(page, journeyLabel) {
  page.on("pageerror", (err) => {
    problems.push(`PAGEERROR [${journeyLabel}] en ${page.url()}: ${err.message}`);
    log(`  !! pageerror [${journeyLabel}]: ${err.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Ruido conocido e inofensivo de Chromium headless sin hardware de audio/mic real.
      if (/favicon|ERR_INTERNET_DISCONNECTED|getUserMedia|NotFoundError/i.test(text)) return;
      problems.push(`CONSOLE.ERROR [${journeyLabel}] en ${page.url()}: ${text}`);
      log(`  !! console.error [${journeyLabel}]: ${text}`);
    }
  });
}

let snapSeq = 0;

/**
 * Recorre la página en incrementos (scroll real, no solo resize) para que las
 * secciones con `whileInView`/`useInViewOnce` (fade-in al hacer scroll, ej. el
 * bloque de principios de la landing) disparen su animación al menos una vez
 * antes del screenshot `fullPage` — si no, Playwright expande el viewport
 * justo antes de capturar y esas secciones nunca llegaron a "entrar" en
 * cámara mientras el observer podía verlas, y la captura las muestra en
 * blanco (su estado `hidden` inicial) aunque un usuario real sí las vería.
 */
async function revealByScrolling(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = 500;
  for (let y = 0; y < height; y += step) {
    await page.evaluate((yPos) => window.scrollTo(0, yPos), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

async function snap(page, name) {
  snapSeq += 1;
  const prefixed = `${String(snapSeq).padStart(2, "0")}-${name}`;
  const mobilePath = path.join(OUT_DIR, `${prefixed}-mobile.png`);
  const desktopPath = path.join(OUT_DIR, `${prefixed}-desktop.png`);
  // 700ms > la duración más larga de las secuencias de entrada (`durations.slow`
  // = .56s + stagger) para no capturar la animación de fadeUp a medio hacer.
  await page.setViewportSize(MOBILE);
  await page.waitForTimeout(700);
  await revealByScrolling(page).catch(() => {});
  await page.screenshot({ path: mobilePath, fullPage: true }).catch((err) => fail(`screenshot mobile ${name}`, err));
  await page.setViewportSize(DESKTOP);
  await page.waitForTimeout(700);
  await revealByScrolling(page).catch(() => {});
  await page.screenshot({ path: desktopPath, fullPage: true }).catch((err) => fail(`screenshot desktop ${name}`, err));
}

/** Levanta `vite` (modo dev) y devuelve `{ child, baseURL }` cuando el server anuncia su puerto. */
async function startDevServer() {
  return new Promise((resolve, reject) => {
    const bin = process.platform === "win32" ? "npx.cmd" : "npx";
    const child = spawn(`${bin} vite --port 5183`, {
      cwd: ROOT,
      env: { ...process.env },
      shell: true,
    });
    let buffer = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        killTree(child);
        reject(new Error("Timed out esperando a que `vite` anuncie su puerto (30 s)."));
      }
    }, 30000);
    child.stdout.on("data", (data) => {
      const text = data.toString();
      buffer += text;
      process.stdout.write(`[vite] ${text}`);
      // eslint-disable-next-line no-control-regex
      const plain = buffer.replace(/\x1b\[[0-9;]*m/g, "");
      const match = plain.match(/Local:\s+https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)\//);
      if (match && !settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ child, baseURL: `http://localhost:${match[1]}` });
      }
    });
    child.stderr.on("data", (data) => process.stderr.write(`[vite:err] ${data}`));
    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });
    child.on("exit", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`\`vite\` terminó antes de anunciar su puerto (código ${code}).`));
      }
    });
  });
}

async function login(page, { email, password, role }) {
  await page.getByRole("button", { name: "Ya tengo cuenta" }).click();
  await page.waitForURL(/\/login/);
  if (role === "COMPANY") {
    await page.getByRole("radio", { name: "Empresa" }).click();
  }
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

async function runCandidateJourney(browser, baseURL) {
  const journey = "candidato";
  const context = await browser.newContext({ viewport: DESKTOP, baseURL });
  const page = await context.newPage();
  attachDiagnostics(page, journey);

  await step("candidato: landing", async () => {
    await page.goto("/");
    await page.waitForSelector("text=Marketplace de talento verificado");
  });
  await snap(page, "c-landing");

  await step("candidato: resetMock()", async () => {
    await page.evaluate(() => {
      const w = /** @type {{ __ce?: { resetMock: () => void } }} */ (window);
      w.__ce?.resetMock();
    });
    await page.reload();
    await page.waitForSelector("text=Marketplace de talento verificado");
  });

  await step("candidato: login", async () => {
    await login(page, { email: CANDIDATE_ANON_EMAIL, password: CANDIDATE_PASSWORD, role: "CANDIDATE" });
    await page.waitForURL(/\/candidate\/onboarding/, { timeout: 15000 });
  });
  await snap(page, "c-onboarding-1");

  await step("candidato: onboarding paso 1 (familia)", async () => {
    // RadioCards usa un <input> `sr-only`: el <label> visible es lo que un
    // usuario real hace clic (forwarding nativo de HTML al input asociado).
    await page.locator("label", { hasText: "Auxiliar administrativo" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.waitForSelector("text=Cuéntanos sobre ti.");
  });

  await step("candidato: onboarding paso 2 (datos)", async () => {
    await page.getByLabel("Nombre completo").fill("Candidato Demo QA");
    await page.getByLabel("Ciudad").fill("León");
    await page.getByLabel("Estado").selectOption({ label: "Guanajuato" });
    await page.getByRole("button", { name: "Inmediata" }).click();
    await snap(page, "c-onboarding-2");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.waitForSelector("text=¿Cómo quieres construir tu perfil?");
  });

  await step("candidato: onboarding paso 3 → subir CV", async () => {
    await page.getByRole("button", { name: /Subir mi CV/ }).click();
    await page.waitForURL(/\/candidate\/cv\/upload/);
  });

  await step("candidato: sube CV de ejemplo", async () => {
    await snap(page, "c-cv-upload");
    await page.locator('input[type="file"]').setInputFiles(DEMO_CV);
    await page.waitForURL(/\/candidate\/cv\/review/, { timeout: 20000 });
  });
  await snap(page, "c-cv-review");

  await step("candidato: confirma revisión de CV", async () => {
    await page.getByRole("button", { name: "Confirmar y continuar" }).click();
    await page.waitForURL(/\/candidate\/interview\/prepare/, { timeout: 15000 });
  });
  await snap(page, "c-interview-prepare");

  await step("candidato: elige modo texto y comienza entrevista", async () => {
    await page.getByRole("radio", { name: "Por texto" }).click();
    await page.getByRole("button", { name: /Comenzar entrevista|Continuar entrevista/ }).click();
    await page.waitForURL(/\/candidate\/interview\/[^/]+$/, { timeout: 15000 });
  });

  const ANSWERS = [
    "En mi trabajo anterior organizaba la agenda de la gerencia, controlaba el archivo físico y digital, y daba seguimiento puntual a pendientes de varios equipos a la vez.",
    "Cuando surgía un conflicto de prioridades, hablaba directamente con las personas involucradas, proponía una fecha realista y avisaba con anticipación si algo se iba a retrasar.",
    "Aprendí a usar Excel de manera intermedia llevando el control de inventario de papelería y generando reportes semanales de gastos para mi jefa directa.",
    "Una vez detecté un error en la facturación de un proveedor, lo reporté de inmediato, documenté el hallazgo y ayudé a corregirlo antes de que se pagara de más.",
    "Me organizo con listas de tareas por prioridad cada mañana, reviso correos pendientes primero y bloqueo tiempo específico para tareas que requieren concentración.",
    "Disfruto trabajar en equipo porque puedo apoyar a mis compañeros cuando tienen carga de trabajo alta, y también pedir ayuda cuando yo la necesito sin ningún problema.",
  ];
  for (let i = 0; i < ANSWERS.length; i += 1) {
    await step(`candidato: responde pregunta ${i + 1}/6`, async () => {
      const textarea = page.getByLabel("Tu respuesta");
      await textarea.waitFor({ state: "visible", timeout: 15000 });
      await expectEnabled(textarea, 15000);
      await textarea.fill(ANSWERS[i]);
      if (i === 2) await snap(page, "c-interview-inprogress");
      await page.getByRole("button", { name: "Enviar respuesta" }).click();
    });
  }

  await step("candidato: espera resultado de entrevista", async () => {
    await page.waitForURL(/\/candidate\/interview\/[^/]+\/result/, { timeout: 15000 });
    await page.waitForSelector("text=Ver mi Perfil de Talento Verificado", { timeout: 20000 });
  });
  await snap(page, "c-interview-result");

  await step("candidato: va a su Perfil de Talento Verificado", async () => {
    await page.getByRole("button", { name: /Ver mi Perfil de Talento Verificado/ }).click();
    await page.waitForURL(/\/candidate\/profile$/, { timeout: 15000 });
    await page.waitForSelector("text=Entrevista con IA completada", { timeout: 15000 });
  });
  await snap(page, "c-profile");

  await step("candidato: oportunidades", async () => {
    await page.goto("/candidate/opportunities");
    await page.waitForSelector("text=Auxiliar administrativo de operaciones", { timeout: 15000 });
  });
  await snap(page, "c-opportunities");

  await step("candidato: detalle de oportunidad", async () => {
    await page.getByText("Auxiliar administrativo de operaciones").first().click();
    await page.waitForURL(/\/candidate\/opportunities\/.+/, { timeout: 15000 });
  });
  await snap(page, "c-opportunity-detail");

  await step("candidato: postularme", async () => {
    const applyButton = page.getByRole("button", { name: "Postularme" });
    await applyButton.click();
    await page.waitForTimeout(600);
  });
  await snap(page, "c-opportunity-applied");

  await step("candidato: editar perfil", async () => {
    await page.goto("/candidate/profile/edit");
    await page.waitForSelector("text=Nombre completo", { timeout: 15000 });
  });
  await snap(page, "c-profile-edit");

  await step("candidato: notificaciones", async () => {
    await page.goto("/candidate/notifications");
    await page.waitForSelector("text=Notificaciones", { timeout: 15000 });
  });
  await snap(page, "c-notifications");

  await step("candidato: mensajes", async () => {
    await page.goto("/candidate/messages");
    await page.waitForSelector("text=Mensajes", { timeout: 15000 });
  });
  await snap(page, "c-messages");

  await step("candidato: campana de notificaciones navega", async () => {
    await page.goto("/candidate");
    await page.getByRole("button", { name: "Notificaciones" }).click();
    await page.waitForURL(/\/candidate\/notifications/, { timeout: 10000 });
  });

  await context.close();
}

async function expectEnabled(locator, timeout) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await locator.isEnabled().catch(() => false)) return;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("El elemento no quedó habilitado a tiempo.");
}

async function runMariaJourney(browser, baseURL) {
  const journey = "maria";
  const context = await browser.newContext({ viewport: DESKTOP, baseURL });
  const page = await context.newPage();
  attachDiagnostics(page, journey);

  await step("maria: login", async () => {
    await page.goto("/");
    await login(page, { email: MARIA_EMAIL, password: CANDIDATE_PASSWORD, role: "CANDIDATE" });
    await page.waitForURL(/\/candidate/, { timeout: 15000 });
  });
  await snap(page, "m-home");

  await step("maria: perfil de talento verificado (variante evaluada)", async () => {
    await page.goto("/candidate/profile");
    await page.waitForSelector("text=Entrevista con IA completada", { timeout: 15000 });
  });
  await snap(page, "m-profile");

  await context.close();
}

async function runEmployerJourney(browser, baseURL) {
  const journey = "empresa";
  const context = await browser.newContext({ viewport: DESKTOP, baseURL });
  const page = await context.newPage();
  attachDiagnostics(page, journey);

  await step("empresa: login", async () => {
    await page.goto("/");
    await login(page, { email: EMPLOYER_EMAIL, password: CANDIDATE_PASSWORD, role: "COMPANY" });
    await page.waitForURL(/\/employer$/, { timeout: 15000 });
  });
  await snap(page, "e-home");

  await step("empresa: nueva vacante", async () => {
    // La CTA existe tanto en el Sidebar como en el Home (04 §E2): tomamos la primera.
    await page.getByRole("button", { name: "Nueva vacante" }).first().click();
    await page.waitForURL(/\/employer\/vacancies\/new/, { timeout: 10000 });
  });

  let vacancyId = "";
  await step("empresa: completa el formulario de la vacante", async () => {
    await page.getByLabel("Título del puesto").fill("Encargado de turno de almacén");
    // RadioCards usa un <input> `sr-only`: clic sobre el <label> visible.
    await page.locator("label", { hasText: "Encargado de almacén" }).click();
    await page.getByRole("button", { name: "Presencial" }).click();
    await page.getByLabel("Ciudad").fill("León");
    await page.getByLabel("Estado").fill("Guanajuato");
    await page.getByLabel("Salario mínimo (MXN)").fill("12000");
    await page.getByLabel("Salario máximo (MXN)").fill("16000");
    await page
      .getByLabel("Describe qué necesitas")
      .fill(
        "Buscamos una persona con experiencia operando montacargas y llevando control de inventarios en Excel. Requisito: máximo 30 años.",
      );
    await snap(page, "e-new-vacancy");
    await page.getByRole("button", { name: "Definir perfil ideal" }).click();
    await page.waitForURL(/\/employer\/vacancies\/[^/]+\/ideal-profile/, { timeout: 15000 });
    vacancyId = new URL(page.url()).pathname.split("/")[3];
  });

  await step("empresa: perfil ideal muestra advertencia discriminatoria", async () => {
    await page.waitForSelector("text=/discriminatori/i", { timeout: 20000 });
  });
  await snap(page, "e-ideal-profile-warning");

  await step("empresa: guarda y busca talento", async () => {
    await page.getByRole("button", { name: "Guardar y buscar talento" }).click();
    await page.waitForURL(/\/employer\/vacancies\/[^/]+\/talent/, { timeout: 15000 });
  });

  await step("empresa: espera el ranking de talento (≥5 candidatos)", async () => {
    await waitForCount(page.getByRole("button", { name: /^Ver perfil/ }), 5, 25000);
  });
  await snap(page, "e-talent");

  await step("empresa: verifica que ningún nombre de la semilla aparezca (anónimo)", async () => {
    const html = await page.content();
    const leaked = SEED_FULL_NAMES.filter((name) => html.includes(name));
    if (leaked.length > 0) {
      throw new Error(`Se filtraron nombres reales en el ranking anónimo: ${leaked.join(", ")}`);
    }
  });

  let matchResultUrl = "";
  await step("empresa: abre el detalle anónimo del primer candidato", async () => {
    await page.getByRole("button", { name: "Ver perfil" }).first().click();
    await page.waitForURL(/\/employer\/candidates\/[^/]+$/, { timeout: 15000 });
    matchResultUrl = page.url();
  });
  await snap(page, "e-candidate-detail");

  await step("empresa: el detalle anónimo tampoco filtra nombres", async () => {
    const html = await page.content();
    const leaked = SEED_FULL_NAMES.filter((name) => html.includes(name));
    if (leaked.length > 0) {
      throw new Error(`Se filtró un nombre real en el detalle anónimo: ${leaked.join(", ")}`);
    }
  });

  await step("empresa: agrega a selección (etapa Revisar)", async () => {
    await page.getByLabel("Etapa de selección").selectOption({ value: "REVIEW" });
    await page.waitForTimeout(500);
  });

  await step("empresa: desbloquea la identidad", async () => {
    await page.getByRole("button", { name: "Desbloquear identidad" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Desbloquear identidad" }).click();
    await page.waitForURL(/\/employer\/candidates\/[^/]+\/full/, { timeout: 15000 });
    await page.waitForSelector("text=Identidad desbloqueada", { timeout: 15000 });
  });

  await step("empresa: el perfil desbloqueado ahora sí muestra el nombre", async () => {
    const html = await page.content();
    const revealed = SEED_FULL_NAMES.some((name) => html.includes(name));
    if (!revealed) {
      throw new Error("El perfil desbloqueado no muestra ningún nombre real de la semilla.");
    }
  });
  await snap(page, "e-candidate-unlocked");

  await step("empresa: vuelve al ranking para comparar", async () => {
    await page.goto(matchResultUrl.replace(/\/employer\/candidates\/.+/, `/employer/vacancies/${vacancyId}/talent`));
    await waitForCount(page.getByRole("button", { name: /^Ver perfil/ }), 5, 20000);
  });

  await step("empresa: selecciona 3 candidatos y compara", async () => {
    // Cada clic cambia el aria-label del botón a "Quitar de comparar", así que
    // el conjunto que matchea "Agregar a comparar" encoge en vivo: `.first()`
    // siempre apunta al próximo no seleccionado (un `.all()` con `.nth(i)`
    // fijo se desincroniza en cuanto el primero deja de matchear).
    const toggle = page.getByRole("button", { name: "Agregar a comparar" });
    for (let i = 0; i < 3; i += 1) await toggle.first().click();
    await page.getByRole("button", { name: /Comparar \(\d\)/ }).click();
    await page.waitForURL(/\/employer\/vacancies\/[^/]+\/compare/, { timeout: 15000 });
  });
  await snap(page, "e-compare");

  await step("empresa: shortlist / finalistas", async () => {
    await page.goto(`/employer/vacancies/${vacancyId}/shortlist`);
    await page.waitForSelector("text=Proceso de selección", { timeout: 15000 });
  });
  await snap(page, "e-shortlist");

  await step("empresa: perfil de empresa", async () => {
    await page.goto("/employer/company");
    await page.waitForSelector("body", { timeout: 15000 });
  });
  await snap(page, "e-company");

  await step("empresa: lista de vacantes", async () => {
    await page.goto("/employer/vacancies");
    await page.waitForSelector("text=Encargado de turno de almacén", { timeout: 15000 });
  });
  await snap(page, "e-vacancies");

  await step("empresa: detalle de vacante", async () => {
    await page.goto(`/employer/vacancies/${vacancyId}`);
    await page.waitForSelector("text=Encargado de turno de almacén", { timeout: 15000 });
  });
  await snap(page, "e-vacancy-detail");

  await step("empresa: planes / facturación", async () => {
    await page.goto("/employer/billing");
    await page.waitForSelector("text=Próximamente", { timeout: 15000 });
  });
  await snap(page, "e-billing");

  await step("empresa: notificaciones", async () => {
    await page.goto("/employer/notifications");
    await page.waitForSelector("text=Notificaciones", { timeout: 15000 });
  });
  await snap(page, "e-notifications");

  await step("empresa: mensajes", async () => {
    await page.goto("/employer/messages");
    await page.waitForSelector("text=Mensajes", { timeout: 15000 });
  });
  await snap(page, "e-messages");

  await step("empresa: campana de notificaciones navega", async () => {
    await page.goto("/employer");
    await page.getByRole("button", { name: "Notificaciones" }).click();
    await page.waitForURL(/\/employer\/notifications/, { timeout: 10000 });
  });

  await context.close();
}

async function waitForCount(locator, min, timeout) {
  const start = Date.now();
  let last = 0;
  while (Date.now() - start < timeout) {
    last = await locator.count();
    if (last >= min) return last;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Se esperaban al menos ${min} elementos, se encontraron ${last}.`);
}

async function runMiscJourney(browser, baseURL) {
  const journey = "misc";
  const context = await browser.newContext({ viewport: DESKTOP, baseURL });
  const page = await context.newPage();
  attachDiagnostics(page, journey);

  await step("dev/ui: kitchen sink sin errores de consola", async () => {
    await page.goto("/dev/ui");
    await page.waitForSelector("body", { timeout: 15000 });
    await page.waitForTimeout(500);
  });
  await snap(page, "dev-ui");

  await step("404: ruta inexistente", async () => {
    await page.goto("/ruta-inexistente");
    await page.waitForSelector("text=Página no encontrada", { timeout: 15000 });
  });
  await snap(page, "not-found");

  await context.close();
}

/** `child.kill()` no basta en Windows con `shell: true` (solo mata cmd.exe, no vite/esbuild). */
function killTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

async function main() {
  if (!existsSync(DEMO_CV)) {
    throw new Error(`No se encontró el CV de ejemplo en ${DEMO_CV}`);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  log("Levantando `vite` (modo dev)…");
  const { child, baseURL } = await startDevServer();
  log(`Servidor listo en ${baseURL}`);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const journeys = [
      ["candidato", runCandidateJourney],
      ["maria", runMariaJourney],
      ["empresa", runEmployerJourney],
      ["misc (dev/ui + 404)", runMiscJourney],
    ];

    for (const [label, fn] of journeys) {
      log(`\n=== Journey: ${label} ===`);
      try {
        await fn(browser, baseURL);
      } catch (err) {
        log(`Journey "${label}" abortado: ${err instanceof Error ? err.message : err}`);
      }
    }
  } finally {
    if (browser) await browser.close();
    killTree(child);
  }

  log(`\n${okCount} pasos en verde de ${stepCount} totales.`);
  if (problems.length > 0) {
    log(`\n${problems.length} problema(s) encontrados:`);
    for (const p of problems) log(`  - ${p}`);
    process.exitCode = 1;
  } else {
    log("\nSin errores de consola ni excepciones. Screenshots en output/e2e/.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
