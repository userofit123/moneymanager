// Starts everything the app needs on this computer, with no setup: the database (in-process PostgreSQL), the bank scraper and the web server.
// Everything stays on this machine (data folder), and every part listens on 127.0.0.1 only.
// Used by main.js (Electron); it has no Electron code in it, so it can also be run with plain Node.
const fs = require("node:fs");
const path = require("node:path");
const net = require("node:net");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { pathToFileURL } = require("node:url");

// A fixed port keeps the web address the same on every launch, so the window remembers its own browser storage (appearance, language). If it is taken, any free port.
// While the previous version is still shutting down after an update it holds the port for a few seconds: wait for it instead of taking another one, which would be a new address with empty browser storage.
const tryPort = (want) => new Promise((ok, no) => { const s = net.createServer(); s.once("error", no); s.listen(want, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); });
const freePort = async (want) => {
  if (want) for (let i = 0; i < 20; i++) { try { return await tryPort(want); } catch { await new Promise((r) => setTimeout(r, 500)); } }
  return tryPort(0);
};
const freePort0 = () => new Promise((ok, no) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => ok(p)); }); s.on("error", no); });

// The installer builder never copies folders named node_modules, so the build ships them as app_modules (see the workflow).
// The first time the app starts, they are put back under their real name. Renaming is instant and keeps the files where they are.
function restoreModules(dir) {
  const want = path.join(dir, "node_modules"), have = path.join(dir, "app_modules");
  if (fs.existsSync(want) || !fs.existsSync(have)) return true;
  try { fs.renameSync(have, want); return true; } catch { /* a program folder that cannot be changed: see codeFolders */ }
  return false;
}

// Where the server and the scraper run from. Normally the program folder itself; but an AppImage is a read-only disk image and the .deb/.rpm
// install where a normal user cannot write, so the modules cannot be renamed there. Then they run from a copy in the data folder, made once per version.
function codeFolders(root, dataDir, log = console.log) {
  const here = { server: path.join(root, "server"), scraper: path.join(root, "scraper") };
  if (restoreModules(here.server) && restoreModules(here.scraper)) return here;
  let ver = "0"; try { ver = JSON.parse(fs.readFileSync(path.join(here.server, "package.json"), "utf8")).version || "0"; } catch { /* the copy is just named 0 */ }
  const base = path.join(dataDir, "runtime"), dir = path.join(base, ver), mark = path.join(dir, ".ready");
  if (!fs.existsSync(mark)) {
    log("preparing a writable copy of the app code in", dir);
    fs.rmSync(dir, { recursive: true, force: true });
    for (const d of ["server", "scraper"]) { fs.cpSync(here[d], path.join(dir, d), { recursive: true }); fs.chmodSync(path.join(dir, d), 0o755); }
    for (const d of ["server", "scraper"]) { makeWritable(path.join(dir, d)); restoreModules(path.join(dir, d)); }
    fs.writeFileSync(mark, ver);
    try { for (const e of fs.readdirSync(base)) if (e !== ver) fs.rmSync(path.join(base, e), { recursive: true, force: true }); } catch { /* old copies stay */ }
  }
  return { server: path.join(dir, "server"), scraper: path.join(dir, "scraper") };
}
// files copied out of a read-only image keep their read-only mode: give the owner write access
function makeWritable(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name);
    if (e.isSymbolicLink()) continue;
    if (e.isDirectory()) { try { fs.chmodSync(f, 0o755); } catch {} makeWritable(f); } else { try { fs.chmodSync(f, fs.statSync(f).mode | 0o200); } catch {} }
  }
}

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
 * root: folder holding server/, scraper/, web/ (the built app) and chrome/ (the app's resources; when developing, the repository, with the app built in frontend/dist)
 * appKey: base64 key for saved logins; without it the server keeps its own key file in the data folder
 * nodeBin: the executable that runs the scraper (Electron's own binary with ELECTRON_RUN_AS_NODE, or plain node)
 */
async function startBackend({ dataDir, root, nodeBin = process.execPath, appKey = null, log = console.log }) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });
  const code = codeFolders(root, dataDir, log);
  // 1. the database: PostgreSQL running inside the app, kept as plain files in the data folder (no separate database program to install or start)
  const dbDir = path.join(dataDir, "database");

  // 2. the bank scraper (its own process: it drives a browser)
  const scraperPort = await freePort(), scraperKey = crypto.randomBytes(24).toString("hex");
  const chrome = findChrome(path.join(root, "chrome")) || process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
  const scraper = spawn(nodeBin, [path.join(code.scraper, "server.js")], {
    cwd: code.scraper, stdio: ["ignore", "inherit", "inherit"], windowsHide: true,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", HOST: "127.0.0.1", PORT: String(scraperPort), SCRAPER_KEY: scraperKey, PROFILE_DIR: path.join(dataDir, "profiles"), ...(chrome ? { PUPPETEER_EXECUTABLE_PATH: chrome } : {}), PUPPETEER_SKIP_DOWNLOAD: "true" },
  });
  scraper.on("exit", (c) => log("scraper stopped", c));

  // 3. the app itself, in this process
  const port = await freePort(+process.env.MONEY_PORT || 47821);
  Object.assign(process.env, {
    ...(appKey ? { APP_KEY: appKey } : {}), // the key that encrypts saved logins, when the caller keeps it protected (see main.js)
    DB_DRIVER: "pglite", PGLITE_DIR: dbDir, DATA_DIR: path.join(dataDir, "data"), DOCS_DIR: path.join(dataDir, "data", "documents"),
    WEB_DIR: fs.existsSync(path.join(root, "web")) ? path.join(root, "web") : path.join(root, "frontend", "dist"), CHANGELOG_FILE: path.join(root, "CHANGELOG.md"), SCRAPER_URL: `http://127.0.0.1:${scraperPort}`, SCRAPER_KEY: scraperKey, HOST: "127.0.0.1", PORT: String(port), NODE_ENV: "production",
  });
  fs.mkdirSync(process.env.DOCS_DIR, { recursive: true });
  const server = await import(pathToFileURL(path.join(code.server, "src", "index.js")).href);
  await server.start();
  await new Promise((ok, no) => { const t0 = Date.now(), tick = () => { const c = net.connect(port, "127.0.0.1"); c.on("connect", () => { c.destroy(); ok(); }); c.on("error", () => (Date.now() - t0 > 30000 ? no(new Error("the app did not start")) : setTimeout(tick, 200))); }; tick(); });

  return {
    url: `http://127.0.0.1:${port}`, port,
    async stop() { try { scraper.kill(); } catch {} try { await server.stop(); } catch (e) { log("database stop:", e.message); } },
  };
}
module.exports = { startBackend, findChrome, codeFolders };
