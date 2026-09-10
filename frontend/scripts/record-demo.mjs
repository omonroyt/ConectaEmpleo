#!/usr/bin/env node
/**
 * Graba el vídeo demo de Conecta Empleo: un recorrido continuo de 150 s por el
 * corazón del producto, con rótulos explicativos y un cursor sintético.
 *
 * Todo es local: Playwright graba la página en WebM y ffmpeg lo pasa a MP4 con
 * duración exacta. No hay servicios externos ni claves.
 *
 * Tres cosas que el guion resuelve y conviene no deshacer:
 *  - Playwright no dibuja el cursor del sistema, así que se inyecta uno propio
 *    (20 px, con sombra para leerse sobre panel claro y sobre lienzo oscuro) y
 *    un aro de clic. Se reinyecta en cada navegación con `addInitScript`.
 *  - Los rótulos son una capa dentro de la página, no un quemado posterior:
 *    salen nítidos, con la tipografía de marca y sincronizados al fotograma.
 *  - Cada bloque tiene un presupuesto de tiempo y se rellena hasta cumplirlo,
 *    así el total cae exactamente en 150 s sin depender de lo que tarde la red.
 *
 * Uso:  node scripts/record-demo.mjs      (con el dev server ya corriendo)
 */
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, renameSync } from "node:fs";
import path from "node:path";

const BASE = process.env.OPEN_BASE_URL || "http://localhost:5173";
const ROOT = process.cwd();
const REPO = path.resolve(ROOT, "..");
const DEST = path.join(REPO, "video-demo");
const RAW = path.join(ROOT, "output", "video-raw");
const SALIDA = path.join(DEST, "conecta-empleo-demo.mp4");

const W = Number(process.env.DEMO_WIDTH || 1920);
const H = Number(process.env.DEMO_HEIGHT || 1080);
const TOTAL_S = 150;

const PASSWORD = "demo1234";
const CANDIDATE = "candidato@demo.mx";
const EMPLOYER = "empresa@demo.mx";

/* ------------------------------------------------------------------ */
/* Capa de presentación inyectada en la página                         */
/* ------------------------------------------------------------------ */

const OVERLAY = () => {
  const build = () => {
    if (!document.body || document.getElementById("__demo_layer")) return;

    const layer = document.createElement("div");
    layer.id = "__demo_layer";
    layer.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:'Inter Variable',Inter,system-ui,sans-serif;";

    // Cursor: flecha de 20 px con contorno oscuro y sombra, legible sobre
    // cualquier superficie del producto.
    const cursor = document.createElement("div");
    cursor.style.cssText =
      "position:absolute;left:0;top:0;width:20px;height:20px;" +
      "transition:transform .5s cubic-bezier(.16,1,.3,1);will-change:transform;transform:translate(60px,60px);";
    cursor.innerHTML =
      "<svg width='20' height='20' viewBox='0 0 24 24' style='filter:drop-shadow(0 2px 4px rgba(0,0,0,.6))'>" +
      "<path d='M5 2 L5 19.5 L9.6 15.1 L12.4 21.4 L15.6 20 L12.8 13.8 L18.8 13.6 Z' " +
      "fill='#ffffff' stroke='#0b0e18' stroke-width='1.4' stroke-linejoin='round'/></svg>";

    // Rótulo inferior centrado.
    const cap = document.createElement("div");
    cap.style.cssText =
      "position:absolute;left:50%;bottom:64px;transform:translateX(-50%) translateY(10px);" +
      "max-width:min(76vw,1000px);padding:16px 30px;border-radius:999px;" +
      "background:rgba(9,12,22,.86);border:1px solid rgba(255,255,255,.16);" +
      "box-shadow:0 22px 60px -26px rgba(3,6,20,.95);" +
      "color:#f7f8fc;font-size:25px;font-weight:500;line-height:1.35;letter-spacing:-.01em;" +
      "text-align:center;opacity:0;text-wrap:balance;" +
      "transition:opacity .5s ease,transform .5s cubic-bezier(.16,1,.3,1);";
    try {
      cap.style.backdropFilter = "blur(16px)";
    } catch {
      /* sin backdrop-filter el fondo sólido ya da contraste suficiente */
    }

    layer.append(cursor, cap);
    document.body.appendChild(layer);

    window.__demo = {
      moveTo(x, y) {
        cursor.style.transform = `translate(${x}px, ${y}px)`;
      },
      clickFx(x, y) {
        const r = document.createElement("div");
        r.style.cssText =
          `position:absolute;left:${x}px;top:${y}px;width:30px;height:30px;margin:-15px 0 0 -15px;` +
          "border-radius:50%;border:2px solid rgba(124,138,255,.95);background:rgba(124,138,255,.18);" +
          "transform:scale(.35);opacity:1;transition:transform .42s ease-out,opacity .42s ease-out;";
        layer.appendChild(r);
        requestAnimationFrame(() => {
          r.style.transform = "scale(1.7)";
          r.style.opacity = "0";
        });
        setTimeout(() => r.remove(), 500);
      },
      caption(text) {
        cap.textContent = text;
        cap.style.opacity = "1";
        cap.style.transform = "translateX(-50%) translateY(0)";
      },
      hideCaption() {
        cap.style.opacity = "0";
        cap.style.transform = "translateX(-50%) translateY(10px)";
      },
    };
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
  // La SPA puede sustituir el árbol al montar: se reintenta un par de veces.
  setTimeout(build, 250);
  setTimeout(build, 1200);
};

/* ------------------------------------------------------------------ */
/* Utilidades de conducción                                            */
/* ------------------------------------------------------------------ */

const log = (m) => console.log(m);

async function caption(page, text) {
  await page.evaluate((t) => window.__demo?.caption(t), text).catch(() => {});
}
async function hideCaption(page) {
  await page.evaluate(() => window.__demo?.hideCaption()).catch(() => {});
}

/** Lleva el cursor sintético al centro del elemento. */
async function moveTo(page, locator) {
  const box = await locator.boundingBox();
  if (!box) return null;
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);
  await page.evaluate(([px, py]) => window.__demo?.moveTo(px, py), [x, y]).catch(() => {});
  return { x, y };
}

/** Mueve el cursor, dispara el aro y hace el clic real. */
async function click(page, locator, { pausa = 620 } = {}) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const p = await moveTo(page, locator);
  await page.waitForTimeout(pausa);
  if (p) await page.evaluate(([x, y]) => window.__demo?.clickFx(x, y), [p.x, p.y]).catch(() => {});
  await page.waitForTimeout(150);
  await locator.click();
}

/** Escribe carácter a carácter para que se vea la redacción. */
async function escribir(page, locator, texto, delay = 22) {
  await click(page, locator, { pausa: 380 });
  await locator.pressSequentially(texto, { delay });
}

async function scrollSuave(page, y) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "smooth" }), y);
}

/** Ejecuta un bloque y lo rellena hasta consumir su presupuesto exacto. */
async function bloque(page, nombre, segundos, fn) {
  const t0 = Date.now();
  try {
    await fn();
  } catch (err) {
    log(`  !! ${nombre}: ${String(err.message).split("\n")[0]}`);
  }
  const restante = segundos * 1000 - (Date.now() - t0);
  if (restante > 0) await page.waitForTimeout(restante);
  const real = ((Date.now() - t0) / 1000).toFixed(1);
  log(`  ${nombre.padEnd(34)} ${real}s / ${segundos}s${restante < 0 ? "  (se pasó)" : ""}`);
}

/* ------------------------------------------------------------------ */

/**
 * Respuestas del CV conversacional, una por cada uno de los 8 turnos del
 * guion de Sofía (ver `api/mock/seed/cvBuilderScript.ts`). Tienen que
 * corresponder a su pregunta: en una toma anterior se usó un relleno genérico
 * para los turnos rápidos y el vídeo mostraba la misma frase contestando a
 * "¿cuál es tu último grado de estudios?", lo que se leía como un fallo.
 */
const CV_RESPUESTAS = [
  "Trabajé dos años como auxiliar administrativa en una empresa de logística en León.",
  "Llevaba la agenda de gerencia, el archivo físico y digital, y daba seguimiento a pendientes de varias áreas.",
  "Usaba Excel a nivel intermedio, el correo institucional y el sistema de inventarios de la empresa.",
  "Antes estuve un año en una papelería, atendiendo mostrador y llevando el control de caja.",
  "Terminé la preparatoria en el CBTIS de León, en 2019.",
  "Tomé un curso de ofimática en el CECATI y otro de control de inventarios en línea.",
  "Vivo en León, Guanajuato, y puedo empezar de inmediato.",
  "Espero entre catorce y dieciocho mil pesos al mes.",
];

/** Banco de la entrevista: seis respuestas distintas, nunca la misma dos veces. */
const ENTREVISTA_RESPUESTAS = [
  "Una vez detecté un error en la facturación de un proveedor. Lo reporté el mismo día, documenté el hallazgo y ayudé a corregirlo antes del pago.",
  "Cuando dos áreas me pedían lo mismo para la misma hora, hablaba con ambas, proponía una fecha realista y avisaba con anticipación.",
  "Aprendí Excel intermedio llevando el control de inventario de papelería y armando el reporte semanal de gastos para mi jefa.",
  "Organizo el archivo por año y por proveedor, y dejo un índice digital para que cualquiera del equipo encuentre un documento sin preguntarme.",
  "Si un cliente llega molesto, primero lo dejo explicarse completo, confirmo lo que entendí y le doy una fecha concreta de respuesta.",
  "Me organizo con listas por prioridad cada mañana, reviso primero lo urgente y bloqueo tiempo para lo que requiere concentración.",
];

async function main() {
  if (!existsSync(DEST)) mkdirSync(DEST, { recursive: true });
  if (existsSync(RAW)) rmSync(RAW, { recursive: true, force: true });
  mkdirSync(RAW, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--force-device-scale-factor=1", "--hide-scrollbars", "--mute-audio"],
  });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: RAW, size: { width: W, height: H } },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
  });
  await ctx.addInitScript(OVERLAY);
  const page = await ctx.newPage();

  log(`Grabando ${W}x${H}, objetivo ${TOTAL_S}s\n`);
  const inicio = Date.now();

  // 1 — Landing ------------------------------------------------------------
  await bloque(page, "01 Landing", 8, async () => {
    await page.goto(`${BASE}/`);
    await page.waitForSelector("text=Para empresas que construyen el mañana");
    await page.waitForTimeout(2400); // deja correr la cascada del hero
    await caption(page, "Talento verificado con evidencia, no con palabras");
    await page.waitForTimeout(3200);
    await hideCaption(page);
  });

  // 2 — Login + onboarding -------------------------------------------------
  await bloque(page, "02 Onboarding del candidato", 12, async () => {
    await page.goto(`${BASE}/login`);
    await escribir(page, page.getByLabel("Correo"), CANDIDATE, 12);
    await click(page, page.getByLabel("Contraseña"), { pausa: 300 });
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await click(page, page.getByRole("button", { name: "Entrar" }));
    await page.waitForURL(/\/candidate\/onboarding/, { timeout: 20000 });
    // Las familias de puesto llegan por API: sin esta espera el rótulo salía
    // sobre tres tarjetas vacías en esqueleto de carga.
    await page.waitForSelector("label:has-text('Auxiliar administrativo')", { timeout: 20000 });
    await caption(page, "Empieza por lo esencial: qué busca y dónde");
    await page.waitForTimeout(600);
    await click(page, page.locator("label", { hasText: "Auxiliar administrativo" }));
    await click(page, page.getByRole("button", { name: "Continuar" }));
    await page.waitForSelector("text=Cuéntanos sobre ti.");
    await escribir(page, page.getByLabel("Nombre completo"), "María José Hernández", 26);
    await page.getByLabel("Ciudad").fill("León");
    await page.getByLabel("Estado").selectOption({ label: "Guanajuato" });
    await click(page, page.getByRole("button", { name: "Inmediata" }), { pausa: 320 });
    await click(page, page.getByRole("button", { name: "Continuar" }));
    await page.waitForSelector("text=¿Cómo quieres construir tu perfil?");
    await hideCaption(page);
  });

  // 3 — CV conversacional --------------------------------------------------
  await bloque(page, "03 CV conversacional", 18, async () => {
    await click(page, page.getByText("Crear desde cero"));
    await page.waitForURL(/\/candidate\/cv\/build/, { timeout: 20000 });
    await page.waitForTimeout(1600);
    await caption(page, "Puede armar su CV hablando, sin llenar formularios");
    await page.waitForTimeout(2800);
    await hideCaption(page); // deja libre el compositor antes de escribir
    const caja = page.getByPlaceholder("Escribe tu respuesta…");
    await escribir(page, caja, CV_RESPUESTAS[0], 20);
    await click(page, page.getByRole("button", { name: "Enviar" }), { pausa: 380 });
    await page.waitForTimeout(2200);
    await escribir(page, caja, CV_RESPUESTAS[1], 20);
    await click(page, page.getByRole("button", { name: "Enviar" }), { pausa: 380 });
    await page.waitForTimeout(1800);
  });

  // 4 — Revisión del CV ----------------------------------------------------
  await bloque(page, "04 Revisión del CV", 14, async () => {
    const cerrar = page.getByRole("button", { name: "Revisar mi perfil" });
    // Turnos 3 a 8: cada uno con la respuesta que corresponde a su pregunta.
    for (let i = 2; i < CV_RESPUESTAS.length; i += 1) {
      if (await cerrar.isVisible().catch(() => false)) break;
      const caja = page.getByPlaceholder("Escribe tu respuesta…");
      await caja.waitFor({ state: "visible", timeout: 12000 }).catch(() => {});
      if (!(await caja.isEnabled().catch(() => false))) {
        await page.waitForTimeout(300);
        i -= 1;
        continue;
      }
      await caja.fill(CV_RESPUESTAS[i]);
      await page.getByRole("button", { name: "Enviar" }).click();
      await page.waitForTimeout(1150);
    }
    if (await cerrar.isVisible().catch(() => false)) await click(page, cerrar, { pausa: 400 });
    await page.waitForURL(/\/candidate\/cv\/review/, { timeout: 25000 });
    await caption(page, "Antes de guardar nada, revisa y corrige lo que se entendió");
    await page.waitForTimeout(1200);
    await scrollSuave(page, 620);
    await page.waitForTimeout(2600);
    await hideCaption(page);
  });

  // 5 — Preparación de la entrevista ---------------------------------------
  await bloque(page, "05 Preparación de entrevista", 6, async () => {
    await scrollSuave(page, 99999);
    await page.waitForTimeout(900);
    await click(page, page.getByRole("button", { name: "Confirmar y continuar" }));
    await page.waitForURL(/\/candidate\/interview\/prepare/, { timeout: 25000 });
    await caption(page, "La entrevista es por voz o por texto; él elige");
    await page.waitForTimeout(2200);
  });

  // 6 — Entrevista ---------------------------------------------------------
  await bloque(page, "06 Entrevista con el Orbe", 26, async () => {
    await click(page, page.getByRole("radio", { name: "Por texto" }), { pausa: 420 });
    await hideCaption(page);
    await click(page, page.getByRole("button", { name: /Comenzar entrevista|Continuar entrevista/ }));
    await page.waitForURL(/\/candidate\/interview\/[^/]+$/, { timeout: 25000 });
    await page.waitForTimeout(1400);
    await caption(page, "Una conversación real. Cada respuesta se convierte en evidencia");
    await page.waitForTimeout(3600);
    await hideCaption(page); // el compositor vive abajo: el rótulo lo taparía

    const fin = /\/candidate\/interview\/[^/]+\/result/;
    // Dos intercambios en cámara lenta, con la redacción visible…
    for (const texto of ENTREVISTA_RESPUESTAS.slice(0, 2)) {
      if (fin.test(page.url())) break;
      const caja = page.getByLabel("Tu respuesta");
      await caja.waitFor({ state: "visible", timeout: 20000 });
      await escribir(page, caja, texto, 17);
      await click(page, page.getByRole("button", { name: "Enviar respuesta" }), { pausa: 340 });
      await page.waitForTimeout(1900);
    }
    // …y el resto de turnos en seco, para llegar al resultado dentro del tiempo.
    // Mientras el turno se procesa, el campo queda deshabilitado un instante:
    // tratar eso como "ya no hay campo" abortaba el bucle y la entrevista no
    // llegaba nunca al resultado. Se espera a que vuelva a estar disponible.
    for (let i = 0; i < 20 && !fin.test(page.url()); i += 1) {
      const caja = page.getByLabel("Tu respuesta");
      await caja.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
      if (fin.test(page.url())) break;
      if (!(await caja.isEnabled().catch(() => false))) {
        await page.waitForTimeout(350);
        continue;
      }
      await caja.fill(ENTREVISTA_RESPUESTAS[2 + (i % 4)]);
      await page.getByRole("button", { name: "Enviar respuesta" }).click();
      await Promise.race([
        page.waitForURL(fin, { timeout: 15000 }),
        page.getByLabel("Tu respuesta").waitFor({ state: "visible", timeout: 15000 }),
      ]).catch(() => {});
    }
    await page.waitForURL(fin, { timeout: 20000 }).catch(() => {});
    await hideCaption(page);
  });

  // 7 — Resultado ----------------------------------------------------------
  await bloque(page, "07 Resultado por competencias", 16, async () => {
    await page.waitForSelector("text=Ver mi Perfil de Talento Verificado", { timeout: 30000 });
    await page.waitForTimeout(1200);
    await caption(page, "Desempeño por competencias, siempre con el porqué detrás del número");
    await page.waitForTimeout(3600); // el anillo se llena de 0 al valor
    await hideCaption(page);
    await scrollSuave(page, 700);
    await page.waitForTimeout(3200); // las barras animan al entrar en pantalla
    await scrollSuave(page, 1500);
    await page.waitForTimeout(3200);
    await scrollSuave(page, 0);
  });

  // 8 — Perfil de Talento Verificado ---------------------------------------
  await bloque(page, "08 Perfil de Talento Verificado", 10, async () => {
    await click(page, page.getByRole("button", { name: /Ver mi Perfil de Talento Verificado/ }));
    await page.waitForURL(/\/candidate\/profile$/, { timeout: 25000 });
    await page.waitForTimeout(1400);
    await caption(page, "Su perfil muestra lo que puede demostrar");
    await page.waitForTimeout(3200);
    await hideCaption(page);
    await scrollSuave(page, 560);
    await page.waitForTimeout(2200);
  });

  // 9 — Empresa: nueva vacante y perfil ideal ------------------------------
  await bloque(page, "09 Empresa: perfil ideal", 14, async () => {
    await page.goto(`${BASE}/`);
    await page.evaluate(() => {
      try {
        localStorage.clear();
      } catch {
        /* la navegación siguiente rehidrata vacío igualmente */
      }
    });
    await page.goto(`${BASE}/login`);
    await click(page, page.getByRole("radio", { name: "Empresa" }), { pausa: 380 });
    await page.getByLabel("Correo").fill(EMPLOYER);
    await page.getByLabel("Contraseña").fill(PASSWORD);
    await click(page, page.getByRole("button", { name: "Entrar" }), { pausa: 380 });
    await page.waitForURL(/\/employer$/, { timeout: 20000 });
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
      .fill("Buscamos experiencia operando montacargas y llevando control de inventarios en Excel.");
    await click(page, page.getByRole("button", { name: "Definir perfil ideal" }), { pausa: 420 });
    await page.waitForURL(/\/employer\/vacancies\/[^/]+\/ideal-profile/, { timeout: 25000 });
    await page.waitForTimeout(1200);
    await caption(page, "La empresa decide qué pesa en el match, y de ahí sale la explicación");
    await page.waitForTimeout(1600);
    await scrollSuave(page, 900);
    await page.waitForTimeout(3000);
  });

  // 10 — Ranking anónimo ---------------------------------------------------
  await bloque(page, "10 Ranking anónimo de talento", 16, async () => {
    await hideCaption(page);
    await scrollSuave(page, 99999);
    await page.waitForTimeout(700);
    await click(page, page.getByRole("button", { name: "Guardar y buscar talento" }), { pausa: 420 });
    await page.waitForURL(/\/employer\/vacancies\/[^/]+\/talent/, { timeout: 25000 });
    await page.getByRole("button", { name: /^Ver perfil/ }).first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(1200);
    await caption(page, "El primer filtro es anónimo: sin nombre, sin foto, sin edad");
    await page.waitForTimeout(4200);
    await hideCaption(page);
    await scrollSuave(page, 520);
    await page.waitForTimeout(1600);
  });

  // 11 — Detalle del candidato ---------------------------------------------
  await bloque(page, "11 Detalle del candidato", 10, async () => {
    await scrollSuave(page, 0);
    await page.waitForTimeout(500);
    await click(page, page.getByRole("button", { name: "Ver perfil" }).first());
    await page.waitForURL(/\/employer\/candidates\/[^/]+$/, { timeout: 25000 });
    await page.waitForTimeout(1400);
    await caption(page, "Y cada porcentaje viene con su explicación");
    await page.waitForTimeout(4000);
    await scrollSuave(page, 620);
    await page.waitForTimeout(2600);
    await hideCaption(page);
    await page.waitForTimeout(600);
  });

  const dur = ((Date.now() - inicio) / 1000).toFixed(1);
  log(`\nRecorrido: ${dur}s`);

  await ctx.close();
  await browser.close();

  const webm = readdirSync(RAW).filter((f) => f.endsWith(".webm"));
  if (webm.length === 0) throw new Error("Playwright no dejó ningún .webm");
  const origen = path.join(RAW, webm[0]);

  // Duración real del bruto. Si el recorrido se pasó del presupuesto, se
  // comprime el tiempo en vez de recortar: cortar por la cola se comería el
  // final del recorrido (la parte de empresa), que es justo lo que no puede
  // faltar. Una aceleración de pocos puntos porcentuales no se percibe.
  const probe = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", origen],
    { encoding: "utf8" },
  );
  const bruto = Number.parseFloat(String(probe.stdout).trim()) || TOTAL_S;
  const factor = bruto > TOTAL_S + 0.4 ? TOTAL_S / bruto : 1;
  const filtro = factor < 1 ? ["-filter:v", `setpts=${factor.toFixed(6)}*PTS`] : [];
  log(`Bruto: ${bruto.toFixed(1)}s` + (factor < 1 ? `  ->  ajuste x${(1 / factor).toFixed(3)}` : ""));
  if (factor < 0.8) log("  aviso: la compresión de tiempo supera el 20%, revisa los presupuestos");

  log("Convirtiendo a MP4 con ffmpeg…");
  const r = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i", origen,
      ...filtro,
      "-t", String(TOTAL_S),
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "20",
      "-pix_fmt", "yuv420p",
      "-r", "30",
      "-movflags", "+faststart",
      SALIDA,
    ],
    { stdio: ["ignore", "ignore", "pipe"], encoding: "utf8" },
  );
  if (r.status !== 0) {
    log(String(r.stderr).split("\n").slice(-15).join("\n"));
    throw new Error("ffmpeg falló");
  }

  // El WebM original se conserva por si hay que recortar distinto.
  renameSync(origen, path.join(DEST, "conecta-empleo-demo.webm"));
  rmSync(RAW, { recursive: true, force: true });
  log(`\nListo: ${SALIDA}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
