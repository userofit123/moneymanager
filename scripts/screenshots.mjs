// Takes the screenshots used in the README and the docs site (docs/screenshots), light and dark, English and Hebrew, computer and phone,
// from a running copy of the app that has the made-up demo data.
//
//   cd server && DB_DRIVER=pglite PGLITE_DIR=/tmp/money-demo/db DATA_DIR=/tmp/money-demo PORT=18600 HOST=127.0.0.1 SCHEDULER=0 AUTO_DEMO_SEED=1 SCRAPER_KEY=x node src/index.js
//   node scripts/screenshots.mjs http://127.0.0.1:18600 [name-filter]
//
// Needs puppeteer (it is in scraper/node_modules; run `npm ci` there) or puppeteer-core in the current folder, and a Chromium:
// set CHROME=/path/to/chrome if it is not found. The optional filter keeps only the shots whose file name contains it (for example "recap").
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const load = () => { for (const base of [path.join(root, "scraper", "package.json"), path.join(process.cwd(), "package.json")]) for (const m of ["puppeteer", "puppeteer-core"]) { try { return createRequire(base)(m); } catch { /* try the next */ } } throw new Error("puppeteer is not installed (cd scraper && npm ci)"); };
const puppeteer = load();
const BASE = (process.argv[2] || "http://127.0.0.1:18600").replace(/\/$/, ""), ONLY = process.argv[3] || "", OUT = path.join(root, "docs", "screenshots"), PW = "demo-password-123";
const w = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || undefined, args: ["--no-sandbox"] });
const page = await browser.newPage();
// the Server section of Settings only shows in the desktop app, so the desktop shell's list is faked here (made-up server)
await page.evaluateOnNewDocument(() => {
  const st = { active: "local", list: [{ id: "a", name: "Home server", url: "https://money.home" }] };
  window.desktopServers = { state: async () => st, add: async () => ({}), use: () => {}, remove: async () => st };
});
const desktop = { width: 1360, height: 860, deviceScaleFactor: 2 };
const phone = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

// a look is kept the way the app keeps it (moneyTheme, stamped newer than the copy on the server), then the page is loaded again
const store = (o) => page.evaluate((o) => {
  const t = JSON.parse(localStorage.getItem("moneyTheme") || "{}");
  localStorage.setItem("moneyTheme", JSON.stringify({ ...t, ...(o.theme || {}) }));
  localStorage.setItem("moneyPrefsAt", String(Date.now())); localStorage.setItem("moneyPrefsSeen", "1");
  if (o.lang) localStorage.setItem("moneyLang", o.lang);
}, o);
const dismiss = async () => { for (let i = 0; i < 3; i++) { await page.keyboard.press("Escape"); await w(250); } };
const visit = async (route) => {
  for (let tries = 0; ; tries++) { try { await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 45000 }); break; } catch (e) { if (tries >= 2) throw e; await w(2000); } } // a page now and then does not answer: ask again
  await page.waitForFunction(() => !document.documentElement.classList.contains("boot") && !document.querySelector("#splash")?.offsetParent, { timeout: 25000 }).catch(() => {}); // the loading screen is gone
  await w(2200); await dismiss(); await w(500);
};
const wanted = (file) => (!ONLY || file.includes(ONLY)) && !(process.env.SKIP_EXISTING && fs.existsSync(path.join(OUT, file + ".webp"))); // SKIP_EXISTING=1 carries on after an interrupted run
const shot = async (file, opts = {}) => { if (!wanted(file)) return; await w(300); await page.screenshot({ path: path.join(OUT, file + ".webp"), type: "webp", quality: 82, ...opts }); console.log(file); };

// sign in once (the demo password is only for the made-up data), and skip the first-run questions so no pop-up covers a page
page.setDefaultNavigationTimeout(60000);
await page.goto(BASE, { waitUntil: "domcontentloaded" }); await w(800);
await page.evaluate(async (pw) => {
  const st = await (await fetch("/api/auth/status")).json();
  await fetch(st.setup ? "/api/auth/setup" : "/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
  const r = await fetch("/api/state"), s = await r.json();
  if (!(s.cfg && s.cfg.profile)) { s.cfg = { ...(s.cfg || {}), profile: { asked: 1 } }; await fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(s) }); }
}, PW);

const PAGES = [["home", "/"], ["recap", "/recap"], ["activity", "/activity"], ["accounts", "/accounts"], ["jars", "/jars"], ["bills", "/bills"], ["budgets", "/budgets"], ["reports", "/reports"], ["forecast", "/forecast"], ["alerts", "/alerts"], ["categories", "/categories"]];
const settingsTab = async (id) => { await visit("/settings"); await page.evaluate((i) => document.querySelector(`[data-t="${i}"]`)?.click(), id); await w(900); };

for (const mode of ["light", "dark"]) {
  // the computer, in English
  await page.setViewport(desktop);
  await store({ theme: { mode, atm: "Indigo", surf: "solid", bg: "glow", tex: "none" }, lang: "en" });
  for (const [f, route] of PAGES) {
    await visit(route); await shot(`${f}-${mode}`);
    if (f === "recap") { await page.evaluate(() => document.scrollingElement.scrollTo(0, 1500)); await w(2500); await shot(`recap-scroll-${mode}`); } // further down the story, where the graphs are
  }
  for (const [f, id] of [["settings-connections", "conn"], ["settings-sorting", "crules"], ["settings-alerts", "alr"], ["settings-server", "server"]]) { await settingsTab(id); await shot(`${f}-${mode}`); }
  // the Appearance panel
  await visit("/");
  await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => /Appearance/.test(x.textContent))?.click()); await w(700);
  await shot(`appearance-${mode}`, { clip: { x: 0, y: 0, width: 520, height: 860 } });
  await dismiss(); await page.mouse.click(900, 400); await w(300);
  // glass on a stronger background
  await store({ theme: { surf: "glass", bg: "mesh", atm: mode === "dark" ? "Aurora" : "Sunset", gbl: 20, gsat: 170, gop: 40 } });
  await visit("/"); await shot(`glass-${mode}`);

  // the computer, in Hebrew (right to left)
  await store({ theme: { surf: "solid", bg: "glow", atm: "Indigo" }, lang: "he" });
  for (const [f, route] of [["home", "/"], ["activity", "/activity"], ["recap", "/recap"], ["forecast", "/forecast"]]) { await visit(route); await shot(`${f}-he-${mode}`); }

  // the phone
  await page.setViewport(phone);
  await store({ lang: "en" });
  for (const [f, route] of [["home", "/"], ["activity", "/activity"], ["recap", "/recap"], ["forecast", "/forecast"], ["jars", "/jars"]]) { await visit(route); await shot(`mobile-${f}-${mode}`); }
  await store({ lang: "he" });
  for (const [f, route] of [["home", "/"], ["recap", "/recap"]]) { await visit(route); await shot(`mobile-${f}-he-${mode}`); }
}

// the sign-in screen, as a visitor
{
  const ctx = await browser.createBrowserContext(), p2 = await ctx.newPage();
  for (const mode of ["light", "dark"]) {
    await p2.setViewport({ width: 900, height: 620, deviceScaleFactor: 2 });
    await p2.emulateMediaFeatures([{ name: "prefers-color-scheme", value: mode }]);
    await p2.goto(BASE, { waitUntil: "domcontentloaded" }); await w(1500);
    if (wanted(`signin-${mode}`)) { await p2.screenshot({ path: path.join(OUT, `signin-${mode}.webp`), type: "webp", quality: 82 }); console.log(`signin-${mode}`); }
  }
  await ctx.close();
}

// the desktop app's server list (its own window, so it is drawn from the file with a made-up list)
{
  const file = pathToFileURL(path.join(root, "desktop", "servers.html")).href, texts = (await import(pathToFileURL(path.join(root, "desktop", "texts.js")).href)).default;
  const T = { en: texts.en, he: texts.he };
  for (const lang of ["en", "he"]) for (const mode of ["light", "dark"]) {
    const p3 = await browser.newPage(); // a page of its own for each, because the made-up list is put in before the page loads
    await p3.setViewport({ width: 600, height: 860, deviceScaleFactor: 2 });
    await p3.emulateMediaFeatures([{ name: "prefers-color-scheme", value: mode }]);
    await p3.evaluateOnNewDocument((t, l) => {
      Object.defineProperty(navigator, "language", { get: () => l });
      window.servers = { texts: async () => t, state: async () => ({ active: "local", list: [{ id: "a", name: l === "he" ? "הבית" : "Home server", url: "https://money.home" }] }), add: async () => ({}), use: () => {}, remove: async () => ({}), close: () => {} };
    }, T[lang], lang);
    await p3.goto(file); await w(700);
    const f = `desktop-servers-${lang === "he" ? "he-" : ""}${mode}`;
    if (wanted(f)) { await p3.screenshot({ path: path.join(OUT, f + ".webp"), type: "webp", quality: 82 }); console.log(f); }
    await p3.close();
  }
}
await browser.close();
