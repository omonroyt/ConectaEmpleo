import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.emulateMedia({ reducedMotion: "reduce" });
await p.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await p.waitForTimeout(900);
const vis = await p.evaluate(() => {
  const el = document.querySelector(".hero-panels");
  if (!el) return null;
  const s = getComputedStyle(el);
  return { opacity: s.opacity, alto: document.documentElement.scrollHeight };
});
console.log("con reduced-motion:", JSON.stringify(vis));
await b.close();
