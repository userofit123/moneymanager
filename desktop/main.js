// Money Manager for Windows. The same app as the Docker version: this window opens it, and the database, bank scraper and server
// run inside the installed program. Data is kept in the user's own folder (%APPDATA%\Money Manager on Windows, ~/.config/Money Manager on Linux) and nothing is sent anywhere.
const { app, BrowserWindow, Menu, Tray, shell, dialog, session, safeStorage, nativeTheme, ipcMain, net, Notification } = require("electron");
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
const Shell = require("./shellserver");
const Compat = require("./compat");
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

let appMenu = null, backend = null, win = null, manager = null, tray = null, quitting = false, state = { v: 1, active: null, list: [] }, T = dict("en");
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
  ses.setPermissionRequestHandler((wc, perm, cb) => { const u = wc.getURL(), mine = server && shells.get(server.id); cb(perm === "notifications" || (perm === "media" && !!server && (u.startsWith(server.url) || (!!mine && u.startsWith(mine.base))))); });
  return ses;
}
const sessionFor = (server) => (server ? wireSession(session.fromPartition("persist:server-" + server.id), server) : session.defaultSession);

async function startLocal() {
  backend = await startBackend({ dataDir: dataDir(), root, nodeBin: process.execPath, appKey: protectedKey(dataDir()) });
}

// The app's own screens for a server: a small web server on this computer serves them and passes the data requests on (shellserver.js). Only when the
// server fits these screens (compat.js: API levels); otherwise the window shows the server's own pages, as before.
const shells = new Map();
// Reaching a server through the browser's own network stack (the session's), shaped like http.request: it trusts what the computer trusts, and the
// certificate the user pinned (wireSession). The answer is made to look like node's: statusCode, headers (set-cookie as a list) and a stream.
function netRequestFor(ses) {
  return (opts, cb) => {
    const req = net.request({ method: opts.method, url: `${opts.protocol}//${opts.hostname}${opts.port ? ":" + opts.port : ""}${opts.path}`, session: ses, useSessionCookies: false, redirect: "manual" });
    for (const [k, v] of Object.entries(opts.headers || {})) { if (/^(host|content-length|connection|accept-encoding|upgrade-insecure-requests|sec-.*)$/i.test(k)) continue; /* the browser sets these itself (and refuses them from us) */ try { req.setHeader(k, v); } catch { /* a header the browser sets itself */ } }
    req.on("response", (r) => { r.statusCode = r.statusCode || 502; cb(r); });
    req.on("redirect", () => req.followRedirect());
    if (!req.destroy) req.destroy = () => { try { req.abort(); } catch { /* already done */ } };
    return req;
  };
}
const portFor = (id) => 47900 + (parseInt(String(id).replace(/\D/g, "").slice(0, 6) || "0", 10) % 90);
// Installing an update closes the app and runs the installer (the .rpm and .deb ask for your password, and wait for it). While that waits the windows cannot answer,
// and the desktop then offers "Force quit or wait". So the windows are hidden first: nothing is left to flag.
function installNow() {
  quitting = true;
  for (const w of BrowserWindow.getAllWindows()) { try { w.hide(); } catch { /* already gone */ } }
  setTimeout(() => autoUpdater.quitAndInstall(), 150);
}
async function stopShells() { for (const [id, s] of shells) { try { s.srv.closeAllConnections(); s.srv.close(); } catch { /* already closed */ } shells.delete(id); } }
async function shellFor(server) {
  const have = shells.get(server.id);
  if (have) return have.base;
  const make = () => Shell.createShellServer({ webDir: path.join(root, "web"), remote: server.url, request: netRequestFor(sessionFor(server)), client: "desktop/" + app.getVersion() });
  let srv = make(), port; try { port = await Shell.listen(srv, portFor(server.id)); } catch { srv = make(); port = await Shell.listen(srv, 0).catch(() => 0); }
  if (!port) return null;
  shells.set(server.id, { srv, base: "http://127.0.0.1:" + port });
  return "http://127.0.0.1:" + port;
}
let lastMismatch = "";
// where the window should load a server from: this app's own screens (a local address) or, when the versions do not fit, the server's own address
async function addressFor(server) {
  await stopShells();
  const info = await Shell.remoteInfo(server.url, { timeout: 5000 }), v = (info && info.version) || "";
  if (Compat.fits(info)) { const b = await shellFor(server); if (b) return { base: b, own: true }; }
  if (lastMismatch !== server.id + v) { lastMismatch = server.id + v; setTimeout(() => dialog.showMessageBox(win && !win.isDestroyed() ? win : undefined, { type: "info", title: "Money Manager", message: fill(v ? T.mismatch : T.mismatchOld, { s: v, a: app.getVersion() }), buttons: ["OK"], noLink: true }), 1500); }
  return { base: server.url, own: false };
}

function closeWindow() { if (win && !win.isDestroyed()) { win.removeAllListeners("close"); win.destroy(); } win = null; }

// The window has no system title bar: the page draws its own strip (in the app's colours) and the system's window buttons sit on it. The page tells
// us its colours (frame:titlebar) so the buttons match; until then, the system's light or dark.
// the window buttons sit on nothing (see-through), so the page's own background shows behind them; only their symbols take the page's text colour
const OVERLAY_BG = "#00000000", TB = 38, colour = (c) => /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%/]+\))$/i.test(String(c).trim());
// The colours the page last asked for are kept, so the next start already has the right ones (no white box before the page has loaded)
const frameFile = () => path.join(app.getPath("userData"), "frame.json");
let frameSaved = null;
const frameLast = () => { if (frameSaved === null) { try { const j = JSON.parse(fs.readFileSync(frameFile(), "utf8")); frameSaved = colour(j.bg) && colour(j.fg) ? j : false; } catch { frameSaved = false; } } return frameSaved || null; };
const frameOptions = () => {
  if (process.platform === "darwin") return {};
  const last = frameLast(), dark = nativeTheme.shouldUseDarkColors;
  return { titleBarStyle: "hidden", titleBarOverlay: { color: OVERLAY_BG, symbolColor: last ? last.fg : dark ? "#e6e4ea" : "#1b1b22", height: TB } };
};
// The window has no system menu bar (no title bar), so the Server menu is opened from the page (the ⋮ button in the strip) or with Alt, at the top left
const popMenu = (x, y) => { if (appMenu && win && !win.isDestroyed()) appMenu.popup({ window: win, x: Math.max(0, x), y: Math.max(0, y) }); };
ipcMain.on("frame:menu", (e, x, y) => { if (BrowserWindow.fromWebContents(e.sender) === win) popMenu(x, y); });
ipcMain.on("frame:titlebar", (e, bg, fg) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w && w === win && typeof w.setTitleBarOverlay === "function" && colour(bg) && colour(fg)) {
    try { w.setTitleBarOverlay({ color: OVERLAY_BG, symbolColor: String(fg).trim(), height: TB }); } catch { /* the buttons keep their colours */ }
    const last = frameLast();
    if (!last || last.bg !== String(bg).trim() || last.fg !== String(fg).trim()) { frameSaved = { bg: String(bg).trim(), fg: String(fg).trim() }; try { fs.writeFileSync(frameFile(), JSON.stringify(frameSaved)); } catch { /* not saved: next start uses the system's light or dark */ } }
  }
});

// GNOME has no system tray (unless an extension adds one): a window hidden there could never be brought back, so closing it quits instead
const hasTray = () => process.platform !== "linux" || !/gnome|unity|pantheon|budgie/i.test(process.env.XDG_CURRENT_DESKTOP || "");

function openWindow(addr) {
  const server = Srv.current(state), base = addr ? addr.base : server ? server.url : backend.url, own = !server || (addr && addr.own);
  // the app's own screens (this computer's, or a server's data shown through them) get the desktop controls; another server's own pages get only the server list
  win = new BrowserWindow({ width: 1280, height: 860, minWidth: 380, minHeight: 600, title: server ? "Money Manager · " + server.name : "Money Manager", icon: path.join(root, "web", "icon-512.png"), backgroundColor: "#f7f8fd", autoHideMenuBar: true, ...frameOptions(), webPreferences: { ...(!server ? { preload: path.join(__dirname, "preload.js") } : own ? { sandbox: true, preload: path.join(__dirname, "hybrid-preload.js") } : { sandbox: true, preload: path.join(__dirname, "remote-preload.js") }), session: sessionFor(server), contextIsolation: true, nodeIntegration: false } });
  win.loadURL(base);
  // links to other sites (a bank, a help page) open in the normal browser, never inside the app
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith(base)) { e.preventDefault(); shell.openExternal(url); } });
  // a server that does not answer: try again, or pick another one
  let asking = false;
  win.webContents.on("did-fail-load", (_e, code, _d, _u, isMain) => {
    if (!server || own || !isMain || code === -3 || asking) return;
    asking = true;
    const w = win, r = dialog.showMessageBoxSync(w, { type: "warning", title: T.failTitle, message: fill(T.failMsg, { name: server.name }), buttons: [T.retry, T.other, T.quit], defaultId: 0, cancelId: 2, noLink: true });
    asking = false;
    if (!w || w.isDestroyed()) return;
    if (r === 0) w.loadURL(base); else if (r === 1) openManager(); else { quitting = true; app.quit(); }
  });
  // Ctrl+Q quits, and Alt on its own opens the menu (there is no menu bar to show)
  let altAlone = false;
  win.webContents.on("before-input-event", (e, i) => {
    if (i.type === "keyDown" && i.control && !i.alt && !i.meta && String(i.key).toLowerCase() === "q") { e.preventDefault(); quitting = true; app.quit(); return; }
    if (i.key === "Alt") { if (i.type === "keyDown") altAlone = true; else if (altAlone) { altAlone = false; popMenu(8, TB); } } else if (i.type === "keyDown") altAlone = false;
  });
  // closing the window keeps the app (and its automatic sync) running in the tray; where there is no tray to bring it back from (plain GNOME), it quits
  win.on("close", (e) => { if (quitting) return; if (hasTray()) { e.preventDefault(); win.hide(); } else { quitting = true; app.quit(); } });
}

// Open the window for one entry. "This computer" starts its backend the first time it is opened.
async function show(id) {
  closeWindow();
  await stopShells();
  try {
    // the local backend, once started, keeps running while a server is shown (it keeps syncing; its database cannot be opened a second time in this process); it stops when the app quits
    if (id === Srv.LOCAL && !backend) await startLocal();
  } catch (e) {
    dialog.showErrorBox("Money Manager", String((e && e.message) || e));
    openManager(); return;
  }
  openWindow(id === Srv.LOCAL ? null : await addressFor(Srv.current(state)));
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
// The update line of the menus follows the update: check, download, restart. (The same steps as Settings → Version and updates.)
function updateItems() {
  const v = upd.version || "";
  if (upd.status === "available" && MAC) return [{ label: fill(T.updDownload, { v }), click: () => shell.openExternal(RELEASE_PAGE) }];
  if (upd.status === "available" && autoUpdater) return [{ label: fill(T.updDownload, { v }), click: () => { lastFail = 0; startDownload(); } }];
  if (upd.status === "downloading") return [{ label: fill(T.updDownloading, { v, p: Math.max(0, upd.percent || 0) }), enabled: false }];
  if (upd.status === "ready" && autoUpdater) return [{ label: fill(T.updRestart, { v }), click: () => { installNow(); } }];
  if (upd.status === "checking") return [{ label: T.updChecking, enabled: false }];
  return [{ label: T.checkUpdates, click: checkNow }];
}
function buildMenus() {
  appMenu = Menu.buildFromTemplate([{ label: T.serverMenu, submenu: [...switchItems(), { type: "separator" }, { label: fill(T.thisApp, { v: app.getVersion() }), enabled: false }, ...updateItems(), { label: T.quit, accelerator: "CmdOrCtrl+Q", click: () => { quitting = true; app.quit(); } }] }]);
  Menu.setApplicationMenu(MAC ? Menu.buildFromTemplate([{ role: "appMenu" }, { label: T.serverMenu, submenu: [...switchItems(), { type: "separator" }, ...updateItems()] }, { role: "editMenu" }, { role: "windowMenu" }]) : appMenu);
  if (tray) tray.setContextMenu(Menu.buildFromTemplate([
    { label: T.openApp, click: () => { if (win && !win.isDestroyed()) { win.show(); win.focus(); } else openManager(); } },
    { label: T.switchTo, submenu: switchItems() },
    ...updateItems(),
    { label: T.dataFolder, click: () => shell.openPath(dataDir()) },
    { type: "separator" },
    { label: T.quit, click: () => { quitting = true; app.quit(); } },
  ]));
}

// Updates. The app checks this project's GitHub releases at start and every 6 hours, and again when its window comes back to the front after
// an hour. The person's choices (Settings → Version and updates, kept in desktop-settings.json, rules in updates.js): "Check automatically",
// "Download automatically" (a newer version downloads in the background) and "Only on Wi-Fi" (that download waits on mobile data or a
// metered connection). A download only ever ends in "ready to install": only the person's Install installs it (the app restarts), never a quit.
// Installing replaces this program (same app, same data); it never adds a second copy.
let autoUpdater = null;
const U = require("./updates");
const MAC = process.platform === "darwin"; // an unsigned Mac app cannot replace itself: it only tells you a newer one is out, and opens the download page
const RELEASE_PAGE = "https://github.com/userofit123/moneymanager/releases/latest";
// auto is the old name of autoDownload, kept for a page older than this app
const upd = { current: app.getVersion(), status: "idle", version: null, notes: "", percent: 0, done: 0, total: 0, error: "", auto: !MAC, manual: MAC, checkedAt: null, autoCheck: true, autoDownload: !MAC, wifiOnly: true };
let lastCheck = 0, lastFail = 0;
const settingsFile = () => path.join(app.getPath("userData"), "desktop-settings.json");
function loadSettings() { let saved = {}; try { saved = JSON.parse(fs.readFileSync(settingsFile(), "utf8")); } catch { /* first start: the defaults */ } setChoices(U.readChoices(saved)); }
function saveSettings() { try { fs.writeFileSync(settingsFile(), JSON.stringify({ autoCheck: upd.autoCheck, autoDownload: upd.autoDownload, wifiOnly: upd.wifiOnly })); } catch {} }
function setChoices(c) { Object.assign(upd, c); if (MAC) upd.autoDownload = false; upd.auto = upd.autoDownload; }
const pushUpdate = () => { if (win && !win.isDestroyed()) win.webContents.send("update:state", { ...upd }); if (appMenu) buildMenus(); }; // the menus show where the update has got to
const notesText = (n) => Array.isArray(n) ? n.map((x) => x.note).join("\n") : String(n || "").replace(/<[^>]+>/g, "");
// whether the connection is metered (mobile data, or set as metered), for "Only on Wi-Fi"; known is false where the system can't be asked
function metered() {
  const q = U.meteredQuery(process.platform);
  if (!q) return Promise.resolve({ metered: false, known: false });
  return new Promise((done) => require("node:child_process").execFile(q.cmd, q.args, { timeout: 8000, windowsHide: true }, (err, out) => done(U.meteredAnswer(q, err, out))));
}
const showWin = () => { if (!win || win.isDestroyed()) return false; if (win.isMinimized()) win.restore(); win.show(); win.focus(); return true; };
// held here: a notification that is garbage-collected loses its click
let notice = null;
// When a download is done or failed: a system notification if the window isn't in front (in front, the page already says so). A click brings
// the window back on Settings → Version and updates, where Install is.
function updateDone(title, body) {
  if (win && !win.isDestroyed()) win.setProgressBar(-1);
  if (!Notification.isSupported() || (win && !win.isDestroyed() && win.isFocused())) return;
  notice = new Notification({ title, body, icon: path.join(root, "web", "icon-512.png") });
  notice.on("click", () => { if (showWin()) win.webContents.send("update:show"); });
  notice.show();
}
function startDownload() {
  if (!autoUpdater || upd.status !== "available") return;
  Object.assign(upd, { status: "downloading", percent: 0, done: 0, total: 0, error: "" }); pushUpdate();
  autoUpdater.downloadUpdate().catch((e) => fail(e));
}
// a found version downloads by itself when the choices allow it
async function autoDownload() {
  const m = upd.wifiOnly ? await metered() : { metered: false };
  if (U.downloadDue({ now: Date.now(), choices: upd, status: upd.status, metered: m.metered, lastFail })) startDownload();
}
// the timer, and the window back in front: a check when one is due, or a download that waited (for Wi-Fi, or after a failure)
function autoStep(every) {
  if (!autoUpdater) return;
  if (upd.status === "available") { autoDownload(); return; }
  if (U.checkDue({ now: Date.now(), choices: upd, status: upd.status, lastCheck, lastFail, every })) check();
}

function setupUpdates() {
  const { ipcMain } = require("electron");
  // backup folder: pick one, or open it in Explorer (the page itself cannot reach the file system)
  ipcMain.handle("backup:choose", async (_e, cur) => {
    const r = await dialog.showOpenDialog(win || undefined, { title: "Choose the backup folder", defaultPath: typeof cur === "string" ? cur : undefined, properties: ["openDirectory", "createDirectory"] });
    return r.canceled || !r.filePaths[0] ? null : r.filePaths[0];
  });
  ipcMain.handle("backup:open", (_e, dir) => { if (typeof dir === "string" && path.isAbsolute(dir)) { fs.mkdirSync(dir, { recursive: true }); return shell.openPath(dir); } });
  ipcMain.handle("update:get", () => ({ ...upd }));
  const choose = (c) => { setChoices(U.mergeChoices(upd, c)); saveSettings(); pushUpdate(); autoStep(); return { ...upd }; };
  ipcMain.handle("update:choices", (_e, c) => choose(c));
  ipcMain.handle("update:auto", (_e, on) => choose({ autoDownload: !!on })); // a page older than this app has only this one switch
  ipcMain.handle("update:metered", () => metered());
  ipcMain.handle("update:check", async () => { await check(); return { ...upd }; });
  ipcMain.handle("update:download", () => { if (MAC && upd.status === "available") shell.openExternal(RELEASE_PAGE); else { lastFail = 0; startDownload(); } return { ...upd }; });
  ipcMain.handle("update:install", () => { if (autoUpdater && upd.status === "ready") { installNow(); } });
  loadSettings();
  if (!app.isPackaged) { upd.status = "dev"; return; } // updates only apply to the installed app
  if (MAC) { setTimeout(check, 4000); setInterval(check, U.CHECK_EVERY); return; }
  try { ({ autoUpdater } = require("electron-updater")); } catch { upd.status = "dev"; return; }
  autoUpdater.autoDownload = false; // the app decides when to download (autoDownload above)
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.on("checking-for-update", () => { upd.status = "checking"; pushUpdate(); });
  autoUpdater.on("update-not-available", () => { upd.status = "uptodate"; upd.checkedAt = lastCheck = Date.now(); lastFail = 0; pushUpdate(); });
  autoUpdater.on("update-available", (i) => {
    if (upd.status === "downloading") return; // the check that a download starts with
    Object.assign(upd, { status: "available", version: i.version, notes: notesText(i.releaseNotes), percent: 0, checkedAt: Date.now() }); lastCheck = Date.now();
    pushUpdate(); autoDownload();
  });
  autoUpdater.on("download-progress", (p) => {
    Object.assign(upd, { status: "downloading", percent: p.total > 0 ? Math.round(p.percent || 0) : -1, done: p.transferred || 0, total: p.total || 0 });
    if (win && !win.isDestroyed()) win.setProgressBar(U.taskbarValue(p, process.platform));
    pushUpdate();
  });
  autoUpdater.on("update-downloaded", (i) => { Object.assign(upd, { status: "ready", version: i.version, percent: 100 }); lastFail = 0; pushUpdate(); updateDone(T.deskNotifReady, T.deskNotifReadyD); });
  autoUpdater.on("error", (e) => fail(e));
  app.on("browser-window-focus", (_e, w) => { if (w === win) autoStep(U.ON_FRONT_EVERY); });
  setTimeout(() => autoStep(), 4000); setInterval(() => autoStep(), U.TICK);
}
// "Check for updates…" in the menu: the app's own version, which the page cannot show when it is another server's page
async function checkNow() {
  await check();
  const w = win && !win.isDestroyed() ? win : undefined;
  const msg = upd.status === "error" ? fill(T.updateError, { e: upd.error }) : ["available", "downloading", "ready"].includes(upd.status) ? fill(T.newVersion, { v: upd.version || "" }) : fill(T.upToDate, { v: app.getVersion() });
  dialog.showMessageBox(w, { type: upd.status === "error" ? "warning" : "info", title: "Money Manager", message: msg, buttons: ["OK"], noLink: true });
}
// a release that is still being built (its files are added a few minutes after the release shows up) is not a failure: there is just nothing to install yet
function fail(e) {
  if (upd.status === "error") return; // the same failure, told twice (the promise and the error event)
  if (/Cannot find latest.*\.yml|latest.*\.yml.*404/is.test(String((e && e.message) || e))) { upd.status = "uptodate"; upd.checkedAt = lastCheck = Date.now(); pushUpdate(); return; }
  const wasDownload = upd.status === "downloading";
  upd.status = "error"; upd.error = String(e && e.message || e).slice(0, 200); lastFail = Date.now(); pushUpdate();
  if (wasDownload) updateDone(T.deskNotifFailed, T.deskNotifFailedD);
}
const newerThan = (a, b) => { const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
async function checkMac() {
  upd.status = "checking"; pushUpdate();
  try {
    const r = await net.fetch("https://api.github.com/repos/userofit123/moneymanager/releases/latest", { headers: { accept: "application/vnd.github+json" } });
    if (!r.ok) throw new Error("GitHub answered HTTP " + r.status);
    const j = await r.json(), v = String(j.tag_name || "").replace(/^v/, "");
    upd.checkedAt = Date.now();
    if (v && newerThan(v, app.getVersion())) { upd.status = "available"; upd.version = v; upd.notes = String(j.body || "").slice(0, 6000); } else upd.status = "uptodate";
  } catch (e) { upd.status = "error"; upd.error = String((e && e.message) || e).slice(0, 200); }
  pushUpdate();
}
async function check() { if (MAC) { if (upd.status !== "checking") await checkMac(); return; } if (!autoUpdater || ["checking", "downloading", "ready"].includes(upd.status)) return; try { await autoUpdater.checkForUpdates(); } catch (e) { fail(e); } }

app.whenReady().then(async () => {
  T = dict(app.getLocale());
  state = Srv.load(dataDir());
  // an installed copy from before the list existed already has its data here: it stays on this computer, with no question asked
  if (state.active == null && !fs.existsSync(path.join(dataDir(), "servers.json")) && fs.existsSync(path.join(dataDir(), "database"))) { state = Srv.use(state, Srv.LOCAL); Srv.save(dataDir(), state); }
  integrateAppImage();
  setupUpdates();
  registerServerIpc(ipcMain);
  const trayImg = path.join(root, "web", "favicon.png");
  tray = new Tray(MAC ? require("electron").nativeImage.createFromPath(trayImg).resize({ width: 18, height: 18 }) : trayImg); // the Mac menu bar wants a small picture
  tray.setToolTip("Money Manager");
  tray.on("click", () => { if (win && !win.isDestroyed()) { win.show(); win.focus(); } else openManager(); });
  buildMenus();
  if (state.active == null) openManager(); else await show(state.active);
});

app.on("before-quit", async (e) => {
  quitting = true;
  for (const w of BrowserWindow.getAllWindows()) { try { w.hide(); } catch { /* already gone */ } } // closing takes a moment: no window is left to be flagged as not answering
  // quitting never waits for ever: if the database or the connections do not close within a few seconds, the app goes on quitting
  if (backend) { e.preventDefault(); const b = backend; backend = null; await Promise.race([b.stop().catch(() => {}), new Promise((ok) => setTimeout(ok, 5000))]); app.exit(0); }
});
app.on("activate", () => { if (win && !win.isDestroyed()) { win.show(); win.focus(); } else if (!manager) openManager(); }); // the Mac dock icon
app.on("window-all-closed", () => {}); // stay in the tray
