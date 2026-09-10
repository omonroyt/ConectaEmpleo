#!/usr/bin/env node
/**
 * Abre TODAS las pantallas del producto en un Chromium real y visible, cada
 * una parada en su propia pestaña, para revisarlas a mano.
 *
 * Por qué no basta con abrir URLs: alrededor de veinte pantallas no son una
 * ruta sino un estado dentro de un flujo (paso 2 de un onboarding, entrevista
 * en curso, perfil ideal con la advertencia, comparador con candidatos ya
 * elegidos…). Este guion las recorre y deja la pestaña parada en ese punto.
 *
 * Dos ventanas con perfiles de Chromium separados porque la sesión vive en
 * `localStorage` y las de candidato y empresa se pisarían entre sí.
 *
 * El mock vive en memoria y es propio de cada pestaña, así que cada pestaña
 * que necesita estado (una vacante creada, una entrevista terminada) rehace su
 * flujo por su cuenta. Es la razón de que el arranque tarde unos minutos.
 *
 * Uso:  node scripts/open-screens.mjs      (con el dev server ya corriendo)
 * El proceso queda vivo a propósito: al terminarlo se cierran las ventanas.
 */
import { chromium } from "playwright";
import path from "node:path";
import os from "node:os";
import { existsSync, mkdirSync } from "node:fs";

const BASE = process.env.OPEN_BASE_URL || "http://localhost:5173";
const ROOT = process.cwd();
const DEMO_CV = path.join(ROOT, "public", "demo", "cv-ejemplo.pdf");
// Los perfiles de Chromium van FUERA del proyecto a propósito: dentro, el
// vigilante de archivos de Vite intenta observar el `Cookies` que Chromium
// mantiene bloqueado y el dev server se cae con EBUSY.
const PROFILES = path.join(os.tmpdir(), "conecta-empleo-revision-perfiles");

const PASSWORD = "demo1234";
const CANDIDATE = "candidato@demo.mx";
const MARIA = "maria@demo.mx";
const EMPLOYER = "empresa@demo.mx";

let opened = 0;
const failures = [];

function log(msg) {
  console.log(msg);
}

/** Abre una pestaña, ejecuta su recorrido y la deja parada con nombre propio. */
async function tab(ctx, title, fn) {
  const pages = ctx.pages();
  // `launchPersistentContext` ya trae una pestaña en blanco: se reutiliza.
  const page =
    pages.length === 1 && pages[0].url() === "about:blank" ? pages[0] : await ctx.newPage();
  try {
    await fn(page);
    opened += 1;
    log(`  ok  ${title}`);
  } catch (err) {
    const first = String(err.message).split("\n")[0];
    failures.push(`${title}: ${first}`);
    log(`  --  ${title}  (${first})`);
  }
  // El título es estático en index.html, así que se renombra la pestaña: es lo
  // único que permite distinguirlas en la barra.
  await page.evaluate((t) => {
    document.title = t;
  }, title).catch(() => {});
  return page;
}

/**
 * Borra la sesión de esta pestaña.
 *
 * Hace falta antes de entrar con otra cuenta o de registrar una nueva: con
 * sesión activa, `/login` y `/register` redirigen a la home del rol y el
 * formulario no llega a existir. No basta con vaciar `localStorage`, porque el
 * store ya está en memoria; la siguiente navegación completa lo rehidrata
 * vacío, y eso lo hace el `goto` de quien llama.
 */
async function cerrarSesion(page) {
  await page.goto(`${BASE}/`);
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* almacenamiento bloqueado: la navegación siguiente igual parte de cero */
    }
  });
}

async function login(page, email, role) {
  await page.goto(`${BASE}/login`);
  if (role === "COMPANY") await page.getByRole("radio", { name: "Empresa" }).click();
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** Deja al candidato en el paso 3 (elegir cómo construir el perfil). */
async function onboardingHastaPaso3(page) {
  await page.locator("label", { hasText: "Auxiliar administrativo" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForSelector("text=Cuéntanos sobre ti.");
  await page.getByLabel("Nombre completo").fill("Candidato Demo QA");
  await page.getByLabel("Ciudad").fill("León");
  await page.getByLabel("Estado").selectOption({ label: "Guanajuato" });
  await page.getByRole("button", { name: "Inmediata" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForSelector("text=¿Cómo quieres construir tu perfil?");
}

/**
 * Onboarding + CV subido y confirmado: deja la pestaña en preparación.
 *
 * No inicia sesión: para cuando se llama ya hay sesión en `localStorage` y
 * `/login` redirigiría a la home del rol. Lo que sí hay que rehacer en cada
 * pestaña es el onboarding, porque el mock vive en memoria y cada pestaña
 * arranca con el candidato otra vez en borrador.
 */
async function hastaPreparacion(page) {
  await page.goto(`${BASE}/candidate/onboarding`);
  await onboardingHastaPaso3(page);
  await page.getByRole("button", { name: /Subir mi CV/ }).click();
  await page.waitForURL(/\/candidate\/cv\/upload/);
  await page.locator('input[type="file"]').setInputFiles(DEMO_CV);
  await page.waitForURL(/\/candidate\/cv\/review/, { timeout: 30000 });
  await page.getByRole("button", { name: "Confirmar y continuar" }).click();
  await page.waitForURL(/\/candidate\/interview\/prepare/, { timeout: 25000 });
}

const RESPUESTAS = [
  "En mi trabajo anterior organizaba la agenda de la gerencia, controlaba el archivo físico y digital, y daba seguimiento puntual a pendientes de varios equipos a la vez.",
  "Cuando surgía un conflicto de prioridades hablaba con las personas involucradas, proponía una fecha realista y avisaba con anticipación si algo se iba a retrasar.",
  "Aprendí a usar Excel de manera intermedia llevando el control de inventario de papelería y generando reportes semanales de gastos para mi jefa directa.",
  "Una vez detecté un error en la facturación de un proveedor, lo reporté de inmediato, documenté el hallazgo y ayudé a corregirlo antes de que se pagara de más.",
  "Me organizo con listas de tareas por prioridad cada mañana, reviso correos pendientes primero y bloqueo tiempo para lo que requiere concentración.",
  "Disfruto trabajar en equipo porque puedo apoyar a mis compañeros cuando tienen carga alta, y también pedir ayuda cuando la necesito sin ningún problema.",
];

/** Entra a la entrevista en modo texto y responde hasta `turnos` preguntas. */
async function entrevista(page, turnos) {
  await page.getByRole("radio", { name: "Por texto" }).click();
  await page.getByRole("button", { name: /Comenzar entrevista|Continuar entrevista/ }).click();
  await page.waitForURL(/\/candidate\/interview\/[^/]+$/, { timeout: 25000 });
  const fin = /\/candidate\/interview\/[^/]+\/result/;
  for (let i = 0; i < turnos; i += 1) {
    if (fin.test(page.url())) break;
    const box = page.getByLabel("Tu respuesta");
    await box.waitFor({ state: "visible", timeout: 25000 });
    await box.fill(RESPUESTAS[i % RESPUESTAS.length]);
    await page.getByRole("button", { name: "Enviar respuesta" }).click();
    await Promise.race([
      page.waitForURL(fin, { timeout: 25000 }),
      page.getByLabel("Tu respuesta").waitFor({ state: "visible", timeout: 25000 }),
    ]).catch(() => {});
  }
}

/** Crea la vacante del recorrido y deja la pestaña en el perfil ideal. */
async function crearVacante(page) {
  await page.goto(`${BASE}/employer/vacancies/new`);
  await page.getByLabel("Título del puesto").fill("Encargado de turno de almacén");
  await page.locator("label", { hasText: "Encargado de almacén" }).click();
  await page.getByRole("button", { name: "Presencial" }).click();
  await page.getByLabel("Ciudad").fill("León");
  await page.locator("#vacancy_state").fill("Guanajuato");
  await page.getByLabel("Salario mínimo (MXN)").fill("12000");
  await page.getByLabel("Salario máximo (MXN)").fill("16000");
  await page
    .getByLabel("Describe qué necesitas")
    .fill(
      "Buscamos una persona con experiencia operando montacargas y llevando control de inventarios en Excel. Requisito: máximo 30 años.",
    );
  await page.getByRole("button", { name: "Definir perfil ideal" }).click();
  await page.waitForURL(/\/employer\/vacancies\/[^/]+\/ideal-profile/, { timeout: 25000 });
  await page.waitForSelector("text=/discriminatori/i", { timeout: 25000 });
  return new URL(page.url()).pathname.split("/")[3];
}

async function alRanking(page) {
  await page.getByRole("button", { name: "Guardar y buscar talento" }).click();
  await page.waitForURL(/\/employer\/vacancies\/[^/]+\/talent/, { timeout: 25000 });
  await page.getByRole("button", { name: /^Ver perfil/ }).first().waitFor({ timeout: 30000 });
}

async function registrarEmpresa(page) {
  await cerrarSesion(page);
  await page.goto(`${BASE}/register`);
  await page.locator("label", { hasText: "Empresa" }).first().click();
  await page.getByLabel("Correo").fill(`revision-${Date.now()}@demo.mx`);
  await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.waitForURL(/\/employer\/onboarding/, { timeout: 25000 });
  await page.waitForSelector("text=Conozcamos tu empresa", { timeout: 20000 });
}

async function identidadEmpresa(page) {
  await page.getByLabel("Nombre comercial").fill("Logística del Bajío");
  await page.getByLabel("Razón social").fill("Logística del Bajío S.A. de C.V.");
  await page.getByLabel("Industria").selectOption({ index: 1 });
  await page.getByRole("button", { name: /personas/ }).nth(1).click().catch(() => {});
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForSelector("text=Ubicación y modalidad", { timeout: 15000 });
}

async function main() {
  if (!existsSync(DEMO_CV)) throw new Error(`No se encontró el CV de ejemplo en ${DEMO_CV}`);
  mkdirSync(PROFILES, { recursive: true });

  const ventana = (nombre, x, y) =>
    chromium.launchPersistentContext(path.join(PROFILES, nombre), {
      headless: false,
      viewport: null,
      args: ["--window-size=1500,940", `--window-position=${x},${y}`],
      ignoreDefaultArgs: ["--enable-automation"],
    });

  log("Ventana 1 — público y candidato…");
  const cand = await ventana("candidato", 0, 0);

  // Público primero: con sesión iniciada, /login y /register redirigen.
  await tab(cand, "01 Landing", async (p) => {
    await p.goto(`${BASE}/`);
    await p.waitForSelector("text=Para empresas que construyen el mañana");
  });
  await tab(cand, "02 Login · candidato", async (p) => {
    await p.goto(`${BASE}/login`);
    await p.waitForSelector("text=Iniciar sesión");
  });
  await tab(cand, "03 Login · empresa", async (p) => {
    await p.goto(`${BASE}/login`);
    await p.getByRole("radio", { name: "Empresa" }).click();
    await p.waitForTimeout(400);
  });
  await tab(cand, "04 Registro · candidato", async (p) => {
    await p.goto(`${BASE}/register`);
    await p.waitForSelector("text=Crear cuenta");
  });
  await tab(cand, "05 Registro · empresa", async (p) => {
    await p.goto(`${BASE}/register`);
    await p.locator("label", { hasText: "Empresa" }).first().click();
    await p.waitForTimeout(400);
  });
  await tab(cand, "06 Registro · errores de validación", async (p) => {
    await p.goto(`${BASE}/register`);
    await p.getByLabel("Correo").fill("no-es-un-correo");
    await p.getByLabel("Contraseña", { exact: true }).fill("123");
    await p.getByRole("button", { name: "Crear cuenta" }).click();
    await p.waitForTimeout(600);
  });
  await tab(cand, "07 Página no encontrada", async (p) => {
    await p.goto(`${BASE}/ruta-inexistente`);
    await p.waitForSelector("text=Página no encontrada");
  });
  await tab(cand, "45 Design system", async (p) => {
    await p.goto(`${BASE}/dev/ui`);
    await p.waitForTimeout(1500);
  });

  await tab(cand, "08 Onboarding 1 · familia laboral", async (p) => {
    await login(p, CANDIDATE, "CANDIDATE");
    await p.waitForURL(/\/candidate\/onboarding/, { timeout: 25000 });
  });
  await tab(cand, "09 Onboarding 2 · datos", async (p) => {
    await p.goto(`${BASE}/candidate/onboarding`);
    await p.locator("label", { hasText: "Auxiliar administrativo" }).click();
    await p.getByRole("button", { name: "Continuar" }).click();
    await p.waitForSelector("text=Cuéntanos sobre ti.");
  });
  await tab(cand, "10 Onboarding 3 · cómo construir", async (p) => {
    await p.goto(`${BASE}/candidate/onboarding`);
    await onboardingHastaPaso3(p);
  });
  await tab(cand, "11 CV · subir archivo", async (p) => {
    await p.goto(`${BASE}/candidate/onboarding`);
    await onboardingHastaPaso3(p);
    await p.getByRole("button", { name: /Subir mi CV/ }).click();
    await p.waitForURL(/\/candidate\/cv\/upload/);
  });
  await tab(cand, "12 CV conversacional · inicio", async (p) => {
    await p.goto(`${BASE}/candidate/onboarding`);
    await onboardingHastaPaso3(p);
    await p.getByText("Crear desde cero").click();
    await p.waitForURL(/\/candidate\/cv\/build/, { timeout: 20000 });
    await p.waitForTimeout(2500);
  });
  await tab(cand, "13 CV conversacional · en curso", async (p) => {
    await p.goto(`${BASE}/candidate/onboarding`);
    await onboardingHastaPaso3(p);
    await p.getByText("Crear desde cero").click();
    await p.waitForURL(/\/candidate\/cv\/build/, { timeout: 20000 });
    for (const r of RESPUESTAS.slice(0, 3)) {
      const box = p.getByPlaceholder("Escribe tu respuesta…");
      await box.waitFor({ state: "visible", timeout: 25000 });
      await box.fill(r);
      await p.getByRole("button", { name: "Enviar" }).click();
      await p.waitForTimeout(2500);
    }
  });
  await tab(cand, "14 CV · revisión", async (p) => {
    await p.goto(`${BASE}/candidate/onboarding`);
    await onboardingHastaPaso3(p);
    await p.getByRole("button", { name: /Subir mi CV/ }).click();
    await p.waitForURL(/\/candidate\/cv\/upload/);
    await p.locator('input[type="file"]').setInputFiles(DEMO_CV);
    await p.waitForURL(/\/candidate\/cv\/review/, { timeout: 30000 });
  });
  await tab(cand, "15 Entrevista · preparación (texto)", async (p) => {
    await hastaPreparacion(p);
  });
  await tab(cand, "16 Entrevista · preparación (voz)", async (p) => {
    await hastaPreparacion(p);
    await p.getByRole("radio", { name: /voz/i }).click().catch(() => {});
    await p.waitForTimeout(500);
  });
  await tab(cand, "17 Entrevista · en curso", async (p) => {
    await hastaPreparacion(p);
    await entrevista(p, 2);
  });
  await tab(cand, "18 Entrevista · resultado", async (p) => {
    await hastaPreparacion(p);
    await entrevista(p, 40);
    await p.waitForSelector("text=Ver mi Perfil de Talento Verificado", { timeout: 40000 });
  });

  // A partir de aquí la sesión pasa a la candidata ya evaluada. Las pestañas
  // anteriores no se ven afectadas: cada una cargó su sesión al abrirse.
  await tab(cand, "19 Candidato · inicio", async (p) => {
    await cerrarSesion(p);
    await login(p, MARIA, "CANDIDATE");
    await p.waitForURL(/\/candidate$/, { timeout: 25000 });
    await p.waitForTimeout(1200);
  });
  await tab(cand, "20 Perfil de talento verificado", async (p) => {
    await p.goto(`${BASE}/candidate/profile`);
    await p.waitForSelector("text=Entrevista con IA completada", { timeout: 25000 });
  });
  await tab(cand, "21 Perfil · editar", async (p) => {
    await p.goto(`${BASE}/candidate/profile/edit`);
    await p.waitForSelector("text=Nombre completo", { timeout: 20000 });
  });
  await tab(cand, "22 Oportunidades", async (p) => {
    await p.goto(`${BASE}/candidate/opportunities`);
    await p.waitForTimeout(1500);
  });
  await tab(cand, "23 Oportunidad · detalle", async (p) => {
    await p.goto(`${BASE}/candidate/opportunities`);
    await p.getByText(/Auxiliar administrativo|Encargado|Operador/).first().click();
    await p.waitForURL(/\/candidate\/opportunities\/.+/, { timeout: 20000 });
  });
  await tab(cand, "24 Oportunidad · ya postulado", async (p) => {
    await p.goto(`${BASE}/candidate/opportunities`);
    await p.getByText(/Auxiliar administrativo|Encargado|Operador/).first().click();
    await p.waitForURL(/\/candidate\/opportunities\/.+/, { timeout: 20000 });
    await p.getByRole("button", { name: "Postularme" }).click();
    await p.waitForTimeout(900);
  });
  await tab(cand, "25 Notificaciones · candidato", async (p) => {
    await p.goto(`${BASE}/candidate/notifications`);
    await p.waitForTimeout(1000);
  });
  await tab(cand, "26 Mensajes · candidato", async (p) => {
    await p.goto(`${BASE}/candidate/messages`);
    await p.waitForTimeout(1000);
  });

  log("Ventana 2 — empresa…");
  const emp = await ventana("empresa", 60, 40);

  await tab(emp, "27 Empresa · inicio", async (p) => {
    await login(p, EMPLOYER, "COMPANY");
    await p.waitForURL(/\/employer$/, { timeout: 25000 });
    await p.waitForTimeout(1200);
  });
  await tab(emp, "28 Empresa · vacantes", async (p) => {
    await p.goto(`${BASE}/employer/vacancies`);
    await p.waitForTimeout(1200);
  });
  await tab(emp, "29 Nueva vacante · vacía", async (p) => {
    await p.goto(`${BASE}/employer/vacancies/new`);
    await p.waitForTimeout(900);
  });
  await tab(emp, "30 Nueva vacante · llena", async (p) => {
    await p.goto(`${BASE}/employer/vacancies/new`);
    await p.getByLabel("Título del puesto").fill("Encargado de turno de almacén");
    await p.locator("label", { hasText: "Encargado de almacén" }).click();
    await p.getByRole("button", { name: "Presencial" }).click();
    await p.getByLabel("Ciudad").fill("León");
    await p.locator("#vacancy_state").fill("Guanajuato");
    await p.getByLabel("Salario mínimo (MXN)").fill("12000");
    await p.getByLabel("Salario máximo (MXN)").fill("16000");
    await p
      .getByLabel("Describe qué necesitas")
      .fill(
        "Buscamos una persona con experiencia operando montacargas y llevando control de inventarios en Excel.",
      );
  });
  await tab(emp, "31 Perfil ideal · advertencia de sesgo", async (p) => {
    await crearVacante(p);
  });
  await tab(emp, "32 Vacante · detalle", async (p) => {
    const id = await crearVacante(p);
    await alRanking(p);
    await p.goto(`${BASE}/employer/vacancies/${id}`);
    await p.waitForTimeout(1500);
  });
  await tab(emp, "33 Talento · ranking anónimo", async (p) => {
    await crearVacante(p);
    await alRanking(p);
  });
  await tab(emp, "34 Candidato · detalle anónimo", async (p) => {
    await crearVacante(p);
    await alRanking(p);
    await p.getByRole("button", { name: "Ver perfil" }).first().click();
    await p.waitForURL(/\/employer\/candidates\/[^/]+$/, { timeout: 20000 });
  });
  await tab(emp, "35 Candidato · perfil desbloqueado", async (p) => {
    await crearVacante(p);
    await alRanking(p);
    await p.getByRole("button", { name: "Ver perfil" }).first().click();
    await p.waitForURL(/\/employer\/candidates\/[^/]+$/, { timeout: 20000 });
    await p.getByRole("button", { name: "Desbloquear identidad" }).click();
    await p.getByRole("dialog").getByRole("button", { name: "Desbloquear identidad" }).click();
    await p.waitForURL(/\/employer\/candidates\/[^/]+\/full/, { timeout: 25000 });
  });
  await tab(emp, "36 Comparar candidatos", async (p) => {
    await crearVacante(p);
    await alRanking(p);
    const toggle = p.getByRole("button", { name: "Agregar a comparar" });
    for (let i = 0; i < 3; i += 1) await toggle.first().click();
    await p.getByRole("button", { name: /Comparar \(\d\)/ }).click();
    await p.waitForURL(/\/employer\/vacancies\/[^/]+\/compare/, { timeout: 20000 });
  });
  await tab(emp, "37 Finalistas", async (p) => {
    const id = await crearVacante(p);
    await alRanking(p);
    await p.getByRole("button", { name: "Ver perfil" }).first().click();
    await p.waitForURL(/\/employer\/candidates\/[^/]+$/, { timeout: 20000 });
    await p.getByLabel("Etapa de selección").selectOption({ value: "REVIEW" });
    await p.waitForTimeout(600);
    await p.goto(`${BASE}/employer/vacancies/${id}/shortlist`);
    await p.waitForSelector("text=Proceso de selección", { timeout: 20000 });
  });
  await tab(emp, "38 Perfil de la empresa", async (p) => {
    await p.goto(`${BASE}/employer/company`);
    await p.waitForTimeout(1200);
  });
  await tab(emp, "39 Planes y facturación", async (p) => {
    await p.goto(`${BASE}/employer/billing`);
    await p.waitForTimeout(1200);
  });
  await tab(emp, "40 Notificaciones · empresa", async (p) => {
    await p.goto(`${BASE}/employer/notifications`);
    await p.waitForTimeout(1000);
  });
  await tab(emp, "41 Mensajes · empresa", async (p) => {
    await p.goto(`${BASE}/employer/messages`);
    await p.waitForTimeout(1000);
  });

  // Al final: registrar cuentas nuevas cambia la sesión de esta ventana.
  await tab(emp, "42 Onboarding empresa 1 · identidad", async (p) => {
    await registrarEmpresa(p);
  });
  await tab(emp, "43 Onboarding empresa 2 · ubicación", async (p) => {
    await registrarEmpresa(p);
    await identidadEmpresa(p);
  });
  await tab(emp, "44 Onboarding empresa 3 · equipo y cultura", async (p) => {
    await registrarEmpresa(p);
    await identidadEmpresa(p);
    await p.getByLabel("Ciudad").fill("León");
    await p.getByLabel("Estado").fill("Guanajuato");
    await p.getByRole("button", { name: "Presencial" }).first().click().catch(() => {});
    await p.getByRole("button", { name: "Continuar" }).click();
    await p.waitForSelector("text=Equipo y cultura", { timeout: 15000 });
  });

  log(`\n${opened} pestañas abiertas.`);
  if (failures.length) {
    log(`${failures.length} no quedaron en su estado:`);
    for (const f of failures) log(`  - ${f}`);
  }
  log("\nLas dos ventanas quedan abiertas. Cierra este proceso para cerrarlas.");
  await new Promise(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
