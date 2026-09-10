/** Capta la entrada del hero en varios momentos para revisar el escalonado. */
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
const marks = [300, 550, 800, 1100, 1500, 2100];
let prev = 0;
for (const ms of marks) {
  await page.waitForTimeout(ms - prev);
  prev = ms;
  await page.screenshot({ path: `output/landing/seq-${String(ms).padStart(4, "0")}ms.png` });
}
await browser.close();
console.log("secuencia:", marks.join(", "), "ms");
