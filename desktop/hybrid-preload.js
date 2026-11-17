// The page of the app's own screens when they show a server's data: the update controls and the server list, but not the backup folder
// (a backup folder is on the server, not on this computer).
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  getUpdate: () => ipcRenderer.invoke("update:get"),
  check: () => ipcRenderer.invoke("update:check"),
  download: () => ipcRenderer.invoke("update:download"),
  install: () => ipcRenderer.invoke("update:install"),
  // the three choices: { autoCheck, autoDownload, wifiOnly }
  setChoices: (c) => ipcRenderer.invoke("update:choices", { autoCheck: c && c.autoCheck, autoDownload: c && c.autoDownload, wifiOnly: c && c.wifiOnly }),
  setAuto: (on) => ipcRenderer.invoke("update:auto", !!on), // what a page older than this app calls
  // { metered, known }: whether the connection is mobile data or metered, and whether this computer can tell
  metered: () => ipcRenderer.invoke("update:metered"),
  onUpdate: (fn) => ipcRenderer.on("update:state", (_e, s) => fn(s)),
  // a click on the "ready to install" or "did not download" notification: open Settings → Version and updates
  onShowUpdates: (fn) => ipcRenderer.on("update:show", () => fn()),
});
contextBridge.exposeInMainWorld("desktopServers", {
  state: () => ipcRenderer.invoke("servers:state"),
  add: (name, url) => ipcRenderer.invoke("servers:add", name, url),
  use: (id) => ipcRenderer.invoke("servers:use", id),
  remove: (id) => ipcRenderer.invoke("servers:remove", id),
});
if (process.platform !== "darwin") contextBridge.exposeInMainWorld("desktopFrame", { setTitleBar: (bg, fg) => ipcRenderer.send("frame:titlebar", String(bg), String(fg)), menu: (x, y) => ipcRenderer.send("frame:menu", Math.round(+x) || 0, Math.round(+y) || 0) });
