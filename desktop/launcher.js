// Starts everything the app needs on this computer, with no setup: the database (in-process PostgreSQL), the bank scraper and the web server.
// Everything stays on this machine (data folder), and every part listens on 127.0.0.1 only.
// Used by main.js (Electron); it has no Electron code in it, so it can also be run with plain Node.
const fs = require("node:fs");
const path = require("node:path");
const net = require("node:net");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { pathToFileURL } = require("node:url");

const freePort = () => new Promise((ok, no) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); s.on("error", no); });

function findChrome(dir) {
  const want = process.platform === "win32" ? "chrome.exe" : "chrome";
  const walk = (d, depth) => {
    if (depth > 6 || !fs.existsSync(d)) return null;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isFile() && e.name === want) return f;
      if (e.isDirectory()) { const r = walk(f, depth + 1); if (r) return r; }
    }
    return null;
  };
  return walk(dir, 0);
}

/**
 * dataDir: where everything is kept (database, encryption key, receipts, bank browser profiles)
 * root: folder holding server/, scraper/, web/ and chrome/ (the app's resources, or the repository when developing)
 * nodeBin: the executable that runs the scraper (Electron's own binary with ELECTRON_RUN_AS_NODE, or plain node)
 */
async function startBackend({ dataDir, root, nodeBin = process.execPath, log = console.log }) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });
  // 1. the database: PostgreSQL running inside the app, kept as plain files in the data folder (no separate database program to install or start)
  const dbDir = path.join(dataDir, "database");

  // 2. the bank scraper (its own process: it drives a browser)
  const scraperPort = await freePort(), scraperKey = crypto.randomBytes(24).toString("hex");
  const chrome = findChrome(path.join(root, "chrome")) || process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  const scraper = spawn(nodeBin, [path.join(root, "scraper", "server.js")], {
    cwd: path.join(root, "scraper"), stdio: ["ignore", "inherit", "inherit"], windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", HOST: "127.0.0.1", PORT: String(scraperPort), SCRAPER_KEY: scraperKey, PROFILE_DIR: path.join(dataDir, "profiles"), ...(chrome ? { PUPPETEER_EXECUTABLE_PATH: chrome } : {}), PUPPETEER_SKIP_DOWNLOAD: "true" },
  });
  scraper.on("exit", (c) => log("scraper stopped", c));

  // 3. the app itself, in this process
  const port = await freePort();
  Object.assign(process.env, {
    DB_DRIVER: "pglite", PGLITE_DIR: dbDir, DATA_DIR: path.join(dataDir, "data"), DOCS_DIR: path.join(dataDir, "data", "documents"),
    WEB_DIR: path.join(root, "web"), SCRAPER_URL: `http://127.0.0.1:${scraperPort}`, SCRAPER_KEY: scraperKey, HOST: "127.0.0.1", PORT: String(port), NODE_ENV: "production",
  });
  fs.mkdirSync(process.env.DOCS_DIR, { recursive: true });
  const server = await import(pathToFileURL(path.join(root, "server", "src", "index.js")).href);
  await server.start();
  await new Promise((ok, no) => { const t0 = Date.now(), tick = () => { const c = net.connect(port, "127.0.0.1"); c.on("connect", () => { c.destroy(); ok(); }); c.on("error", () => (Date.now() - t0 > 30000 ? no(new Error("the app did not start")) : setTimeout(tick, 200))); }; tick(); });

  return {
    url: `http://127.0.0.1:${port}`, port,
    async stop() { try { scraper.kill(); } catch {} try { await server.stop(); } catch (e) { log("database stop:", e.message); } },
  };
}
module.exports = { startBackend, findChrome };
