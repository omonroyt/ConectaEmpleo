#!/usr/bin/env node
/**
 * Complemento de `e2e-smoke.mjs`: captura las pantallas que ese recorrido no
 * visita (login, registro, onboarding paso 3, CV conversacional, onboarding
 * de empresa, perfil ideal en estado limpio).
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = "C:/Users/elosc/OneDrive/Documentos/00 WEB PROYECTS/HACKATON IA UTEL 2026/ConectaEmpleo/frontend";
const OUT_DIR = path.join(ROOT, "output", "extra");
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };
const PASSWORD = "demo1234";

const problems = [];
const log = (m) => console.log(m);

async function revealByScrolling(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((yPos) => window.scrollTo(0, yPos), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

async function snap(page, name) {
  for (const [label, vp] of [["mobile", MOBILE], ["desktop", DESKTOP]]) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(700);
    await revealByScrolling(page).catch(() => {});
    await page
      .screenshot({ path: path.join(OUT_DIR, `${name}-${label}.png`), fullPage: true })
      .catch((err) => problems.push(`screenshot ${name} ${label}: ${err.message}`));
  }
  log(`  · captura ${name}`);
}

async function startDevServer() {
  return new Promise((resolve, reject) => {
    const bin = process.platform === "win32" ? "npx.cmd" : "npx";
    const child = spawn(`${bin} vite --port 5187`, {
      cwd: ROOT,
      env: { ...process.env, VITE_API_MODE: "mock" },
      shell: true,
    });
    let buffer = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; killTree(child); reject(new Error("timeout vite")); }
    }, 40000);
    child.stdout.on("data", (data) => {
      buffer += data.toString();
      // eslint-disable-next-line no-control-regex
      const plain = buffer.replace(/\x1b\[[0-9;]*m/g, "");
      const match = plain.match(/Local:\s+https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)\//);
      if (match && !settled) {
        settled = true; clearTimeout(timer);
        resolve({ child, baseURL: `http://localhost:${match[1]}` });
      }
    });
    child.stderr.on("data", (d) => process.stderr.write(`[vite:err] ${d}`));
    child.on("exit", (code) => {
      if (!settled) { settled = true; clearTimeout(timer); reject(new Error(`vite salió (${code})`)); }
    });
  });
}

function killTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/f", "/t"], { stdio: "ignore" });
  else child.kill("SIGTERM");
}

async function step(label, fn) {
  log(`→ ${label}`);
  try { await fn(); } catch (err) {
    problems.push(`${label}: ${err.message}`);
    log(`  ✗ ${err.message}`);
    throw err;
  }
}

async function run(browser, baseURL) {
  const context = await browser.newContext({ viewport: DESKTOP, baseURL });
  const page = await context.newPage();
  page.on("pageerror", (e) => problems.push(`pageerror ${page.url()}: ${e.message}`));

  // --- auth ------------------------------------------------------------
  await step("login (candidato)", async () => {
    await page.goto("/login");
    await page.waitForSelector("text=Correo", { timeout: 15000 });
  });
  await snap(page, "a-login-candidato");

  await step("login (empresa)", async () => {
    await page.getByRole("radio", { name: "Empresa" }).click();
    await page.waitForTimeout(400);
  });
  await snap(page, "a-login-empresa");

  await step("registro (candidato)", async () => {
    await page.goto("/register");
    await page.waitForSelector("text=Crear cuenta", { timeout: 15000 });
  });
  await snap(page, "a-registro-candidato");

  await step("registro (empresa)", async () => {
    await page.getByRole("radio", { name: "Empresa" }).click();
    await page.waitForTimeout(400);
  });
  await snap(page, "a-registro-empresa");

  await step("registro: errores de validación", async () => {
    await page.getByRole("radio", { name: "Busco empleo" }).click().catch(() => {});
    await page.getByLabel("Correo").fill("no-es-un-correo");
    await page.getByLabel("Contraseña", { exact: true }).fill("123");
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await page.waitForTimeout(600);
  });
  await snap(page, "a-registro-errores");

  // --- candidato: onboarding paso 3 + CV conversacional ------------------
  await step("candidato: resetMock + login", async () => {
    await page.goto("/");
    await page.evaluate(() => window.__ce?.resetMock());
    await page.goto("/login");
    await page.getByLabel("Correo").fill("candidato@demo.mx");
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(/\/candidate\/onboarding/, { timeout: 20000 });
  });

  await step("candidato: onboarding pasos 1 y 2", async () => {
    await page.locator("label", { hasText: "Auxiliar administrativo" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.waitForSelector("text=Cuéntanos sobre ti.");
    await page.getByLabel("Nombre completo").fill("Candidato Demo QA");
    await page.getByLabel("Ciudad").fill("León");
    await page.getByLabel("Estado").selectOption({ label: "Guanajuato" });
    await page.getByRole("button", { name: "Inmediata" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.waitForSelector("text=¿Cómo quieres construir tu perfil?");
  });
  await snap(page, "b-onboarding-paso3-como-construir");

  await step("candidato: CV conversacional (inicio)", async () => {
    await page.getByText("Crear desde cero").click();
    await page.waitForURL(/\/candidate\/cv\/build/, { timeout: 15000 });
    await page.waitForTimeout(2500);
  });
  await snap(page, "b-cv-build-inicio");

  await step("candidato: CV conversacional (con respuestas)", async () => {
    const answers = [
      "Trabajé dos años como auxiliar administrativo en una empresa de logística en León.",
      "Manejo Excel intermedio, control de archivo, atención a proveedores y seguimiento de pendientes.",
      "Terminé la preparatoria y tomé un curso de ofimática en el CECATI de mi ciudad.",
    ];
    for (const answer of answers) {
      const box = page.getByPlaceholder("Escribe tu respuesta…");
      await box.waitFor({ state: "visible", timeout: 20000 });
      await box.fill(answer);
      await page.getByRole("button", { name: "Enviar" }).click();
      await page.waitForTimeout(2500);
    }
  });
  await snap(page, "b-cv-build-conversacion");

  await step("candidato: preparación de entrevista (modo voz)", async () => {
    await page.goto("/candidate/interview/prepare");
    await page.waitForTimeout(1500);
    await page.getByRole("radio", { name: /voz/i }).click().catch(() => {});
    await page.waitForTimeout(500);
  });
  await snap(page, "b-interview-prepare-voz");

  await context.close();

  // --- empresa: onboarding ----------------------------------------------
  const ctx2 = await browser.newContext({ viewport: DESKTOP, baseURL });
  const page2 = await ctx2.newPage();
  page2.on("pageerror", (e) => problems.push(`pageerror ${page2.url()}: ${e.message}`));

  await step("empresa: registro nuevo → onboarding", async () => {
    await page2.goto("/register");
    await page2.getByRole("radio", { name: "Empresa" }).click();
    await page2.getByLabel("Correo").fill(`qa-empresa-${Date.now()}@demo.mx`);
    await page2.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
    await page2.getByLabel("Confirmar contraseña").fill(PASSWORD);
    await page2.getByRole("button", { name: "Crear cuenta" }).click();
    await page2.waitForURL(/\/employer\/onboarding/, { timeout: 20000 });
    await page2.waitForSelector("text=Conozcamos tu empresa", { timeout: 15000 });
  });
  await snap(page2, "c-empresa-onboarding-paso1");

  await step("empresa: onboarding paso 2 (ubicación)", async () => {
    await page2.getByLabel("Nombre comercial").fill("Logística del Bajío");
    await page2.getByLabel("Razón social").fill("Logística del Bajío S.A. de C.V.");
    await page2.getByLabel("Industria").fill("Logística y transporte");
    await page2.getByRole("button", { name: "Continuar" }).click();
    await page2.waitForSelector("text=Ubicación y modalidad", { timeout: 10000 });
  });
  await snap(page2, "c-empresa-onboarding-paso2");

  await step("empresa: onboarding paso 3 (equipo y cultura)", async () => {
    await page2.getByLabel("Ciudad").fill("León");
    await page2.getByLabel("Estado").selectOption({ index: 1 }).catch(() => {});
    await page2.getByRole("button", { name: "Continuar" }).click();
    await page2.waitForSelector("text=Equipo y cultura", { timeout: 10000 });
  });
  await snap(page2, "c-empresa-onboarding-paso3");

  await ctx2.close();
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const { child, baseURL } = await startDevServer();
  log(`vite listo en ${baseURL}`);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    await run(browser, baseURL).catch((e) => log(`recorrido abortado: ${e.message}`));
  } finally {
    if (browser) await browser.close();
    killTree(child);
  }
  if (problems.length) {
    log(`\n${problems.length} problema(s):`);
    for (const p of problems) log(`  - ${p}`);
  } else log("\nSin problemas.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
