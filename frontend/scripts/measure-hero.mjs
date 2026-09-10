import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(2200);
const m = await page.evaluate(() => {
  const pick = (sel) => { const el = document.querySelector(sel); return el ? Math.round(el.getBoundingClientRect().height) : null; };
  const nav = document.querySelector("header, nav");
  const grid = document.querySelector("main, [class*='max-w-[1440px]']");
  const left = document.querySelector("h1")?.closest("div");
  return {
    topbar: nav ? Math.round(nav.getBoundingClientRect().height) : null,
    grid: grid ? Math.round(grid.getBoundingClientRect().height) : null,
    left: left ? Math.round(left.getBoundingClientRect().height) : null,
    h1: pick("h1"),
    doc: document.documentElement.scrollHeight,
  };
});
console.log(JSON.stringify(m, null, 1));
await browser.close();
