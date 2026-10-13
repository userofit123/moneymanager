// Takes the screenshots used in the README (docs/screenshots), in light and dark, from a running copy of the app that has the demo data.
//
//   cd server && DB_DRIVER=pglite PGLITE_DIR=/tmp/money-demo/db DATA_DIR=/tmp/money-demo PORT=18600 HOST=127.0.0.1 SCHEDULER=0 AUTO_DEMO_SEED=1 SCRAPER_KEY=x node src/index.js
//   node scripts/screenshots.mjs http://127.0.0.1:18600
//
// Needs puppeteer (it is in scraper/node_modules; run `npm ci` there) and a Chromium: set CHROME=/path/to/chrome if it is not found.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const puppeteer = createRequire(path.join(root, "scraper", "package.json"))("puppeteer");
const BASE = process.argv[2] || "http://127.0.0.1:18600", OUT = path.join(root, "docs", "screenshots"), PW = "demo-password-123";
const w = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || undefined, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.goto(BASE); await w(600);
await page.evaluate(async (pw) => {
  const st = await (await fetch("/api/auth/status")).json();
  await fetch(st.setup ? "/api/auth/setup" : "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
}, PW);

const theme = (o) => page.evaluate((o) => { Object.assign(st, o); applyTheme(); renderAll(); }, o);
const open = async (name) => { await page.evaluate((n) => [...document.querySelectorAll("nav .nb")].find((x) => x.textContent.includes(n)).click(), name); await w(1300); };
const shot = async (file, opts = {}) => { await w(250); await page.screenshot({ path: path.join(OUT, file + ".webp"), type: "webp", quality: 88, ...opts }); console.log(file); };
const desktop = { width: 1360, height: 860, deviceScaleFactor: 1 };

for (const mode of ["light", "dark"]) {
  await page.setViewport(desktop);
  await page.goto(BASE); await w(2500);
  await theme({ mode, atm: "Indigo", surf: "solid", bg: "glow", tex: "none" });
  for (const [n, f] of [["Home", "home"], ["Activity", "activity"], ["Jars", "jars"], ["Bills", "bills"], ["Budgets", "budgets"], ["Reports", "reports"], ["Forecast", "forecast"]]) { await open(n); await shot(`${f}-${mode}`); }
  await open("Settings"); await page.evaluate(() => document.querySelector('[data-t="conn"]').click()); await w(900); await shot(`settings-${mode}`);
  // the Appearance panel
  await open("Home");
  await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => /Appearance/.test(x.textContent)).click()); await w(600);
  await shot(`appearance-${mode}`, { clip: { x: 0, y: 0, width: 520, height: 860 } });
  await page.keyboard.press("Escape"); await page.mouse.click(900, 400); await w(300);
  // glass on a stronger background
  await theme({ surf: "glass", bg: "mesh", atm: mode === "dark" ? "Aurora" : "Sunset", gbl: 20, gsat: 170, gop: 40 });
  await open("Home"); await shot(`glass-${mode}`);
  // phone
  await theme({ surf: "solid", bg: "glow", atm: "Indigo" });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(BASE); await w(2500); await theme({ mode });
  await shot(`mobile-home-${mode}`);
  await page.evaluate(() => [...document.querySelectorAll("nav .nb")].find((x) => x.textContent.includes("Activity")).click()); await w(1200); await shot(`mobile-activity-${mode}`);
}
await browser.close();
