// The only things the app's page may ask of the desktop shell: its version and the update controls.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  getUpdate: () => ipcRenderer.invoke("update:get"),
  check: () => ipcRenderer.invoke("update:check"),
  download: () => ipcRenderer.invoke("update:download"),
  install: () => ipcRenderer.invoke("update:install"),
  chooseFolder: (cur) => ipcRenderer.invoke("backup:choose", cur),
  openFolder: (dir) => ipcRenderer.invoke("backup:open", dir),
  // the three choices: { autoCheck, autoDownload, wifiOnly }
  setChoices: (c) => ipcRenderer.invoke("update:choices", { autoCheck: c && c.autoCheck, autoDownload: c && c.autoDownload, wifiOnly: c && c.wifiOnly }),
  setAuto: (on) => ipcRenderer.invoke("update:auto", !!on), // what a page older than this app calls
  // { metered, known }: whether the connection is mobile data or metered, and whether this computer can tell
  metered: () => ipcRenderer.invoke("update:metered"),
  onUpdate: (fn) => ipcRenderer.on("update:state", (_e, s) => fn(s)),
  // a click on the "ready to install" or "did not download" notification: open Settings → Version and updates
  onShowUpdates: (fn) => ipcRenderer.on("update:show", () => fn()),
});
// The server list (Settings → App and data): the same for the app's own page and for a remote server's page
contextBridge.exposeInMainWorld("desktopServers", {
  state: () => ipcRenderer.invoke("servers:state"),
  add: (name, url) => ipcRenderer.invoke("servers:add", name, url),
  use: (id) => ipcRenderer.invoke("servers:use", id),
  remove: (id) => ipcRenderer.invoke("servers:remove", id),
});
// The window frame: the app tells the shell its colours so the title bar matches the page
if (process.platform !== "darwin") contextBridge.exposeInMainWorld("desktopFrame", { setTitleBar: (bg, fg) => ipcRenderer.send("frame:titlebar", String(bg), String(fg)), menu: (x, y) => ipcRenderer.send("frame:menu", Math.round(+x) || 0, Math.round(+y) || 0) });
