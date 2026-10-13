// Money Manager for Windows. The same app as the Docker version: this window opens it, and the database, bank scraper and server
// run inside the installed program. Data is kept in the user's own folder (%APPDATA%\Money Manager) and nothing is sent anywhere.
const { app, BrowserWindow, Menu, Tray, shell, dialog, session, safeStorage } = require("electron");
const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const { startBackend } = require("./launcher");

const root = app.isPackaged ? process.resourcesPath : path.join(__dirname, "..");
// The key that encrypts saved bank logins is kept protected by Windows (DPAPI, through Electron's safeStorage): the file on disk can only be
// opened by this Windows user on this computer, so copying the data folder elsewhere does not expose the logins.
function protectedKey(dir) {
  if (!safeStorage.isEncryptionAvailable()) return null; // the server then keeps its own key file in the data folder, as the Docker version does
  const enc = path.join(dir, "app.key.protected"), plain = path.join(dir, "data", "app.key");
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(enc)) {
    try { return safeStorage.decryptString(fs.readFileSync(enc)); }
    catch {
      dialog.showMessageBoxSync({ type: "warning", title: "Saved logins", message: "Your saved bank logins can't be unlocked on this Windows account.", detail: "This happens when the data folder was moved from another computer or user. The app will start, but you need to enter your bank logins again in Settings → Connections." });
      fs.unlinkSync(enc);
    }
  }
  let key;
  if (fs.existsSync(plain)) { key = fs.readFileSync(plain, "utf8").trim(); fs.unlinkSync(plain); } // an older unprotected key is moved under protection
  else key = crypto.randomBytes(32).toString("base64");
  fs.writeFileSync(enc, safeStorage.encryptString(key), { mode: 0o600 });
  return key;
}

let backend = null, win = null, tray = null, quitting = false;

if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => { if (win) { win.show(); win.focus(); } });

function openWindow() {
  win = new BrowserWindow({ width: 1280, height: 860, minWidth: 380, minHeight: 600, title: "Money Manager", icon: path.join(root, "web", "icon-512.png"), backgroundColor: "#f7f8fd", autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false } });
  win.loadURL(backend.url);
  // links to other sites (a bank, a help page) open in the normal browser, never inside the app
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith(backend.url)) { e.preventDefault(); shell.openExternal(url); } });
  // closing the window keeps the app (and its automatic sync) running in the tray
  win.on("close", (e) => { if (!quitting) { e.preventDefault(); win.hide(); } });
}

// Updates. The app checks this project's GitHub releases at start and every few hours. With "Update automatically" on (the default) a newer
// version downloads by itself and installs when the app is next closed (or when you press Restart). With it off, the sidebar only tells you
// a newer version exists and you decide. Installing replaces this program (same app, same data); it never adds a second copy.
let autoUpdater = null;
const upd = { current: app.getVersion(), status: "idle", version: null, notes: "", percent: 0, error: "", auto: true, checkedAt: null };
const settingsFile = () => path.join(app.getPath("userData"), "desktop-settings.json");
function loadSettings() { try { upd.auto = JSON.parse(fs.readFileSync(settingsFile(), "utf8")).autoUpdate !== false; } catch { upd.auto = true; } }
function saveSettings() { try { fs.writeFileSync(settingsFile(), JSON.stringify({ autoUpdate: upd.auto })); } catch {} }
const pushUpdate = () => { if (win && !win.isDestroyed()) win.webContents.send("update:state", { ...upd }); };
const notesText = (n) => Array.isArray(n) ? n.map((x) => x.note).join("\n") : String(n || "").replace(/<[^>]+>/g, "");

function setupUpdates() {
  const { ipcMain } = require("electron");
  // backup folder: pick one, or open it in Explorer (the page itself cannot reach the file system)
  ipcMain.handle("backup:choose", async (_e, cur) => {
    const r = await dialog.showOpenDialog(win || undefined, { title: "Choose the backup folder", defaultPath: typeof cur === "string" ? cur : undefined, properties: ["openDirectory", "createDirectory"] });
    return r.canceled || !r.filePaths[0] ? null : r.filePaths[0];
  });
  ipcMain.handle("backup:open", (_e, dir) => { if (typeof dir === "string" && path.isAbsolute(dir)) { fs.mkdirSync(dir, { recursive: true }); return shell.openPath(dir); } });
  ipcMain.handle("update:get", () => ({ ...upd }));
  ipcMain.handle("update:auto", (_e, on) => { upd.auto = !!on; saveSettings(); if (autoUpdater) autoUpdater.autoDownload = upd.auto; if (upd.auto && upd.status === "available") autoUpdater && autoUpdater.downloadUpdate().catch(() => {}); pushUpdate(); return { ...upd }; });
  ipcMain.handle("update:check", async () => { await check(); return { ...upd }; });
  ipcMain.handle("update:download", () => { if (autoUpdater && upd.status === "available") { upd.status = "downloading"; upd.percent = 0; pushUpdate(); autoUpdater.downloadUpdate().catch((e) => fail(e)); } return { ...upd }; });
  ipcMain.handle("update:install", () => { if (autoUpdater && upd.status === "ready") { quitting = true; autoUpdater.quitAndInstall(); } });
  loadSettings();
  if (!app.isPackaged) { upd.status = "dev"; return; } // updates only apply to the installed app
  try { ({ autoUpdater } = require("electron-updater")); } catch { upd.status = "dev"; return; }
  autoUpdater.autoDownload = upd.auto;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("checking-for-update", () => { upd.status = "checking"; pushUpdate(); });
  autoUpdater.on("update-not-available", () => { upd.status = "uptodate"; upd.checkedAt = Date.now(); pushUpdate(); });
  autoUpdater.on("update-available", (i) => { upd.status = upd.auto ? "downloading" : "available"; upd.version = i.version; upd.notes = notesText(i.releaseNotes); upd.percent = 0; upd.checkedAt = Date.now(); pushUpdate(); });
  autoUpdater.on("download-progress", (p) => { upd.status = "downloading"; upd.percent = Math.round(p.percent || 0); pushUpdate(); });
  autoUpdater.on("update-downloaded", (i) => { upd.status = "ready"; upd.version = i.version; upd.percent = 100; pushUpdate(); });
  autoUpdater.on("error", (e) => fail(e));
  setTimeout(check, 4000); setInterval(check, 6 * 60 * 60 * 1000);
}
function fail(e) { upd.status = "error"; upd.error = String(e && e.message || e).slice(0, 200); pushUpdate(); }
async function check() { if (!autoUpdater || ["downloading", "ready"].includes(upd.status)) return; try { await autoUpdater.checkForUpdates(); } catch (e) { fail(e); } }

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  // only the app's own page may use the camera (receipt photos)
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === "media" && wc.getURL().startsWith("http://127.0.0.1")));
  try {
    backend = await startBackend({ dataDir: app.getPath("userData"), root, nodeBin: process.execPath, appKey: protectedKey(app.getPath("userData")) });
  } catch (e) {
    dialog.showErrorBox("Money Manager could not start", String(e && e.message || e));
    app.exit(1); return;
  }
  setupUpdates();
  openWindow();
  tray = new Tray(path.join(root, "web", "favicon.png"));
  tray.setToolTip("Money Manager");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open Money Manager", click: () => { win.show(); win.focus(); } },
    { label: "Open data folder", click: () => shell.openPath(app.getPath("userData")) },
    { type: "separator" },
    { label: "Quit", click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on("click", () => { win.show(); win.focus(); });
});

app.on("before-quit", async (e) => {
  quitting = true;
  if (backend) { e.preventDefault(); const b = backend; backend = null; await b.stop(); app.exit(0); }
});
app.on("window-all-closed", () => {}); // stay in the tray
