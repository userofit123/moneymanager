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
  win = new BrowserWindow({ width: 1280, height: 860, minWidth: 380, minHeight: 600, title: "Money Manager", icon: path.join(root, "web", "icon-512.png"), backgroundColor: "#f7f8fd", autoHideMenuBar: true });
  win.loadURL(backend.url);
  // links to other sites (a bank, a help page) open in the normal browser, never inside the app
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith(backend.url)) { e.preventDefault(); shell.openExternal(url); } });
  // closing the window keeps the app (and its automatic sync) running in the tray
  win.on("close", (e) => { if (!quitting) { e.preventDefault(); win.hide(); } });
}

// Updates: the installed app checks for a newer version, downloads it quietly and installs it when the app is next closed.
// Installing a new version replaces this one (same program, same data); it never adds a second copy.
function checkForUpdates() {
  if (!app.isPackaged) return;
  let autoUpdater;
  try { ({ autoUpdater } = require("electron-updater")); } catch { return; }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("update-downloaded", (info) => {
    if (!win) return;
    dialog.showMessageBox(win, { type: "info", buttons: ["Restart now", "Later"], defaultId: 0, title: "Update ready", message: `Money Manager ${info.version} is ready.`, detail: "Restart to finish updating. Your data stays as it is. If you choose Later, it updates the next time you close the app." })
      .then((r) => { if (r.response === 0) { quitting = true; autoUpdater.quitAndInstall(); } });
  });
  autoUpdater.on("error", (e) => console.log("update check:", e && e.message));
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  check(); setInterval(check, 6 * 60 * 60 * 1000);
}

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
  openWindow();
  checkForUpdates();
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
