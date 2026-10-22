// Money Manager for Windows. The same app as the Docker version: this window opens it, and the database, bank scraper and server
// run inside the installed program. Data is kept in the user's own folder (%APPDATA%\Money Manager on Windows, ~/.config/Money Manager on Linux) and nothing is sent anywhere.
const { app, BrowserWindow, Menu, Tray, shell, dialog, session, safeStorage, nativeTheme, ipcMain } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const crypto = require("node:crypto");
const path = require("node:path");
const { startBackend } = require("./launcher");

const root = app.isPackaged ? process.resourcesPath : path.join(__dirname, "..");
// The key that encrypts saved bank logins is kept protected by the system (Windows DPAPI, or the Linux keyring, through Electron's safeStorage): the file on disk can only be
// opened by this Windows user on this computer, so copying the data folder elsewhere does not expose the logins.
function protectedKey(dir) {
  // On Linux without a keyring (GNOME Keyring, KWallet), Electron falls back to a fixed built-in password, which protects nothing: use the key file then
  const weak = process.platform === "linux" && typeof safeStorage.getSelectedStorageBackend === "function" && safeStorage.getSelectedStorageBackend() === "basic_text";
  if (weak || !safeStorage.isEncryptionAvailable()) return null; // the server then keeps its own key file in the data folder, as the Docker version does
  const enc = path.join(dir, "app.key.protected"), plain = path.join(dir, "data", "app.key");
  fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(enc)) {
    try { return safeStorage.decryptString(fs.readFileSync(enc)); }
    catch {
      dialog.showMessageBoxSync({ type: "warning", title: "Saved logins", message: "Your saved bank logins can't be unlocked on this computer account.", detail: "This happens when the data folder was moved from another computer or user. The app will start, but you need to enter your bank logins again in Settings → Connections." });
      fs.unlinkSync(enc);
    }
  }
  let key;
  if (fs.existsSync(plain)) { key = fs.readFileSync(plain, "utf8").trim(); fs.unlinkSync(plain); } // an older unprotected key is moved under protection
  else key = crypto.randomBytes(32).toString("base64");
  fs.writeFileSync(enc, safeStorage.encryptString(key), { mode: 0o600 });
  return key;
}

const Srv = require("./servers");
const { dict, fill } = require("./texts");

// An AppImage is only a file: with no installer, nothing gives it an icon or a place in the app menu. So on each start (it is cheap) the app
// adds its own menu entry with the coin icon, pointing at wherever the file is now, and gives the file itself that icon in the file manager.
function integrateAppImage() {
  const img = process.env.APPIMAGE;
  if (process.platform !== "linux" || !img) return;
  try {
    const share = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
    const iconDir = path.join(share, "icons", "hicolor", "512x512", "apps"), icon = path.join(iconDir, "money-manager.png");
    fs.mkdirSync(iconDir, { recursive: true }); fs.copyFileSync(path.join(root, "web", "icon-512.png"), icon);
    const dir = path.join(share, "applications"), file = path.join(dir, "money-manager.desktop");
    const body = `[Desktop Entry]\nType=Application\nName=Money Manager\nComment=Your money in one private place\nExec="${img.replace(/"/g, '\\"')}" %U\nIcon=${icon}\nTerminal=false\nCategories=Office;Finance;\nStartupWMClass=Money Manager\n`;
    fs.mkdirSync(dir, { recursive: true });
    let cur = ""; try { cur = fs.readFileSync(file, "utf8"); } catch { /* not there yet */ }
    if (cur !== body) fs.writeFileSync(file, body);
    require("node:child_process").execFile("gio", ["set", img, "metadata::custom-icon", "file://" + icon], () => {}); // GNOME's file manager; harmless elsewhere
  } catch { /* the app works without the menu entry */ }
}

let backend = null, win = null, manager = null, tray = null, quitting = false, state = { v: 1, active: null, list: [] }, T = dict("en");
const dataDir = () => app.getPath("userData");

if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => { const w = win && !win.isDestroyed() ? win : manager; if (w && !w.isDestroyed()) { w.show(); w.focus(); } });

// ---------- which server the window shows ----------
// "This computer" runs the app's own database and bank scraper (the backend below). Any other entry is a Money Manager server somewhere else:
// the window just opens its address, in its own session, so the logins and saved copies of one server never mix with another.
const saveState = (s) => { state = s; Srv.save(dataDir(), s); buildMenus(); };
const publicState = () => ({ active: state.active, list: state.list.map(({ id, name, url }) => ({ id, name, url })) });

const wired = new Set(), lastBad = new Map(), tempTrust = new Set();
// A certificate the computer does not know is accepted only when the user trusted that exact certificate for that server.
function wireSession(ses, server) {
  if (wired.has(ses)) return ses;
  wired.add(ses);
  ses.setCertificateVerifyProc((req, cb) => {
    if (req.verificationResult === "net::OK") return cb(0);
    const fp = req.certificate && req.certificate.fingerprint, cur = server && state.list.find((x) => x.id === server.id);
    if (fp && ((cur && cur.trust === fp) || tempTrust.has(req.hostname + "|" + fp))) return cb(0);
    lastBad.set(req.hostname, fp || ""); cb(-2);
  });
  // only the app's own page may use the camera (receipt photos)
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(perm === "media" && !!server && wc.getURL().startsWith(server.url)));
  return ses;
}
const sessionFor = (server) => (server ? wireSession(session.fromPartition("persist:server-" + server.id), server) : session.defaultSession);

async function startLocal() {
  backend = await startBackend({ dataDir: dataDir(), root, nodeBin: process.execPath, appKey: protectedKey(dataDir()) });
}
async function stopLocal() { const b = backend; backend = null; if (b) await b.stop(); }

function closeWindow() { if (win && !win.isDestroyed()) { win.removeAllListeners("close"); win.destroy(); } win = null; }

// The window has no system title bar: the page draws its own strip (in the app's colours) and the system's window buttons sit on it. The page tells
// us its colours (frame:titlebar) so the buttons match; until then, the system's light or dark.
const TB = 38, colour = (c) => /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\))$/i.test(String(c).trim());
// The colours the page last asked for are kept, so the next start already has the right ones (no white box before the page has loaded)
const frameFile = () => path.join(app.getPath("userData"), "frame.json");
let frameSaved = null;
const frameLast = () => { if (frameSaved === null) { try { const j = JSON.parse(fs.readFileSync(frameFile(), "utf8")); frameSaved = colour(j.bg) && colour(j.fg) ? j : false; } catch { frameSaved = false; } } return frameSaved || null; };
const frameOptions = () => {
  if (process.platform === "darwin") return {};
  const last = frameLast(), dark = nativeTheme.shouldUseDarkColors;
  return { titleBarStyle: "hidden", titleBarOverlay: { color: last ? last.bg : dark ? "#14161c" : "#fbf8fd", symbolColor: last ? last.fg : dark ? "#e6e4ea" : "#1b1b22", height: TB } };
};
ipcMain.on("frame:titlebar", (e, bg, fg) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w && w === win && typeof w.setTitleBarOverlay === "function" && colour(bg) && colour(fg)) {
    try { w.setTitleBarOverlay({ color: String(bg).trim(), symbolColor: String(fg).trim(), height: TB }); } catch { /* the buttons keep their colours */ }
    const last = frameLast();
    if (!last || last.bg !== String(bg).trim() || last.fg !== String(fg).trim()) { frameSaved = { bg: String(bg).trim(), fg: String(fg).trim() }; try { fs.writeFileSync(frameFile(), JSON.stringify(frameSaved)); } catch { /* not saved: next start uses the system's light or dark */ } }
  }
});

// GNOME has no system tray (unless an extension adds one): a window hidden there could never be brought back, so closing it quits instead
const hasTray = () => process.platform !== "linux" || !/gnome|unity|pantheon|budgie/i.test(process.env.XDG_CURRENT_DESKTOP || "");

function openWindow() {
  const server = Srv.current(state), base = server ? server.url : backend.url;
  // the desktop controls (updates, backup folder) are only for the app's own page; another server's page gets just the server list
  win = new BrowserWindow({ width: 1280, height: 860, minWidth: 380, minHeight: 600, title: server ? "Money Manager · " + server.name : "Money Manager", icon: path.join(root, "web", "icon-512.png"), backgroundColor: "#f7f8fd", autoHideMenuBar: true, ...frameOptions(), webPreferences: { ...(server ? { sandbox: true, preload: path.join(__dirname, "remote-preload.js") } : { preload: path.join(__dirname, "preload.js") }), session: sessionFor(server), contextIsolation: true, nodeIntegration: false } });
  win.loadURL(base);
  // links to other sites (a bank, a help page) open in the normal browser, never inside the app
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith(base)) { e.preventDefault(); shell.openExternal(url); } });
  // a server that does not answer: try again, or pick another one
  let asking = false;
  win.webContents.on("did-fail-load", (_e, code, _d, _u, isMain) => {
    if (!server || !isMain || code === -3 || asking) return;
    asking = true;
    const w = win, r = dialog.showMessageBoxSync(w, { type: "warning", title: T.failTitle, message: fill(T.failMsg, { name: server.name }), buttons: [T.retry, T.other, T.quit], defaultId: 0, cancelId: 2, noLink: true });
    asking = false;
    if (!w || w.isDestroyed()) return;
    if (r === 0) w.loadURL(base); else if (r === 1) openManager(); else { quitting = true; app.quit(); }
  });
  // closing the window keeps the app (and its automatic sync) running in the tray; where there is no tray to bring it back from (plain GNOME), it quits
  win.on("close", (e) => { if (quitting) return; if (hasTray()) { e.preventDefault(); win.hide(); } else { quitting = true; app.quit(); } });
}

// Open the window for one entry. Moving away from "This computer" stops its backend (no syncing while another server is open); moving back starts it.
async function show(id) {
  closeWindow();
  try {
    if (id === Srv.LOCAL) { if (!backend) await startLocal(); } else await stopLocal();
  } catch (e) {
    dialog.showErrorBox("Money Manager", String((e && e.message) || e));
    openManager(); return;
  }
  openWindow();
}
function switchTo(id) {
  if (id === state.active && win && !win.isDestroyed()) { win.show(); win.focus(); return; }
  saveState(Srv.use(state, id));
  show(id);
}

// ---------- the server list window ----------
function openManager() {
  if (manager && !manager.isDestroyed()) { manager.show(); manager.focus(); return; }
  manager = new BrowserWindow({ width: 600, height: 800, minWidth: 420, minHeight: 520, title: "Money Manager", icon: path.join(root, "web", "icon-512.png"), backgroundColor: "#fbf8fd", autoHideMenuBar: true, parent: win && !win.isDestroyed() && win.isVisible() ? win : undefined, webPreferences: { preload: path.join(__dirname, "servers-preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  manager.loadFile(path.join(__dirname, "servers.html"));
  manager.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  manager.on("closed", () => { manager = null; if (!win && !quitting) { quitting = true; app.quit(); } }); // closed before choosing anything on the first run
}
const closeManager = () => { if (manager && !manager.isDestroyed()) manager.close(); };

// Can this address be reached, and is it a Money Manager? A certificate the computer does not know is offered to the user once, by its fingerprint.
async function reach(url) {
  const ses = wireSession(session.fromPartition("persist:server-test"), null);
  try {
    const r = await ses.fetch(url + "/api/auth/status", { signal: AbortSignal.timeout(8000) }), j = await r.json().catch(() => null);
    return j && typeof j === "object" && "setup" in j ? "ok" : "notMoney";
  } catch { return "unreachable"; }
}
function registerServerIpc(ipcMain) {
  ipcMain.handle("servers:texts", () => T);
  ipcMain.handle("servers:state", () => publicState());
  ipcMain.handle("servers:add", async (_e, name, url) => {
    let next;
    try { next = Srv.add(state, { name, url }); } catch (e) { return { error: e.message }; }
    const added = next.list[next.list.length - 1], host = new URL(added.url).hostname;
    lastBad.delete(host);
    let r = await reach(added.url), fp = "";
    if (r === "unreachable" && lastBad.has(host)) {
      fp = lastBad.get(host);
      const yes = dialog.showMessageBoxSync(manager || undefined, { type: "warning", title: T.certTitle, message: fill(T.certMsg, { host, fp }), buttons: [T.certYes, T.certNoBtn], defaultId: 1, cancelId: 1, noLink: true }) === 0;
      if (!yes) return { error: "certNo" };
      tempTrust.add(host + "|" + fp); r = await reach(added.url);
    }
    if (r !== "ok") return { error: r };
    saveState(fp ? Srv.trust(next, added.id, fp) : next);
    return { ok: true, id: added.id, state: publicState() };
  });
  ipcMain.handle("servers:use", (_e, id) => { try { saveState(Srv.use(state, id)); } catch { return; } setImmediate(() => { closeManager(); show(id); }); });
  ipcMain.handle("servers:remove", async (_e, id) => {
    const wasOpen = state.active === id;
    let next = Srv.remove(state, id);
    if (wasOpen) next = Srv.use(next, Srv.LOCAL);
    saveState(next);
    try { await session.fromPartition("persist:server-" + id).clearStorageData(); } catch { /* nothing saved */ }
    if (wasOpen) setImmediate(() => { closeManager(); show(Srv.LOCAL); });
    return publicState();
  });
  ipcMain.handle("servers:close", () => closeManager());
}

// The Server menu (Alt on Windows and Linux) and the tray menu list the same choices.
function switchItems() {
  return [
    { label: T.local, type: "radio", checked: state.active === Srv.LOCAL, click: () => switchTo(Srv.LOCAL) },
    ...state.list.map((s) => ({ label: s.name, type: "radio", checked: state.active === s.id, click: () => switchTo(s.id) })),
    { type: "separator" },
    { label: T.manage, click: openManager },
  ];
}
function buildMenus() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: T.serverMenu, submenu: [...switchItems(), { type: "separator" }, { type: "separator" }, { label: fill(T.thisApp, { v: app.getVersion() }), enabled: false }, { label: T.checkUpdates, click: checkNow }, { label: T.quit, accelerator: "CmdOrCtrl+Q", click: () => { quitting = true; app.quit(); } }] }]));
  if (tray) tray.setContextMenu(Menu.buildFromTemplate([
    { label: T.openApp, click: () => { if (win && !win.isDestroyed()) { win.show(); win.focus(); } else openManager(); } },
    { label: T.switchTo, submenu: switchItems() },
    { label: T.dataFolder, click: () => shell.openPath(dataDir()) },
    { type: "separator" },
    { label: T.quit, click: () => { quitting = true; app.quit(); } },
  ]));
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
// "Check for updates…" in the menu: the app's own version, which the page cannot show when it is another server's page
async function checkNow() {
  await check();
  const w = win && !win.isDestroyed() ? win : undefined;
  const msg = upd.status === "error" ? fill(T.updateError, { e: upd.error }) : ["available", "downloading", "ready"].includes(upd.status) ? fill(T.newVersion, { v: upd.version || "" }) : fill(T.upToDate, { v: app.getVersion() });
  dialog.showMessageBox(w, { type: upd.status === "error" ? "warning" : "info", title: "Money Manager", message: msg, buttons: ["OK"], noLink: true });
}
function fail(e) { upd.status = "error"; upd.error = String(e && e.message || e).slice(0, 200); pushUpdate(); }
async function check() { if (!autoUpdater || ["downloading", "ready"].includes(upd.status)) return; try { await autoUpdater.checkForUpdates(); } catch (e) { fail(e); } }

app.whenReady().then(async () => {
  T = dict(app.getLocale());
  state = Srv.load(dataDir());
  // an installed copy from before the list existed already has its data here: it stays on this computer, with no question asked
  if (state.active == null && !fs.existsSync(path.join(dataDir(), "servers.json")) && fs.existsSync(path.join(dataDir(), "database"))) { state = Srv.use(state, Srv.LOCAL); Srv.save(dataDir(), state); }
  integrateAppImage();
  setupUpdates();
  registerServerIpc(ipcMain);
  tray = new Tray(path.join(root, "web", "favicon.png"));
  tray.setToolTip("Money Manager");
  tray.on("click", () => { if (win && !win.isDestroyed()) { win.show(); win.focus(); } else openManager(); });
  buildMenus();
  if (state.active == null) openManager(); else await show(state.active);
});

app.on("before-quit", async (e) => {
  quitting = true;
  if (backend) { e.preventDefault(); const b = backend; backend = null; await b.stop(); app.exit(0); }
});
app.on("window-all-closed", () => {}); // stay in the tray
