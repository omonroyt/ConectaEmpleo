/** Mide si el hero cabe sin scroll vertical en los tamaños de escritorio. */
import { chromium } from "playwright";
const URL = process.env.URL ?? "http://localhost:5173/";
const sizes = [
  { w: 1440, h: 900 },
  { w: 1280, h: 800 },
  { w: 1536, h: 864 },
  { w: 1680, h: 1050 },
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
];
const browser = await chromium.launch();
for (const { w, h } of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2200);
  const m = await page.evaluate(() => ({
    doc: document.documentElement.scrollHeight,
    vis: window.innerHeight,
    overX: document.documentElement.scrollWidth > window.innerWidth,
  }));
  const extra = m.doc - m.vis;
  console.log(
    `${w}x${h}: alto=${m.doc} viewport=${m.vis} sobra=${extra}px ${extra <= 4 ? "OK sin scroll" : "HAY SCROLL"}${m.overX ? " | OVERFLOW-X" : ""}`,
  );
  await page.close();
}
await browser.close();
