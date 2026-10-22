// The page of the app's own screens when they show a server's data: the update controls and the server list, but not the backup folder
// (a backup folder is on the server, not on this computer).
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  getUpdate: () => ipcRenderer.invoke("update:get"),
  check: () => ipcRenderer.invoke("update:check"),
  download: () => ipcRenderer.invoke("update:download"),
  install: () => ipcRenderer.invoke("update:install"),
  setAuto: (on) => ipcRenderer.invoke("update:auto", !!on),
  onUpdate: (fn) => ipcRenderer.on("update:state", (_e, s) => fn(s)),
});
contextBridge.exposeInMainWorld("desktopServers", {
  state: () => ipcRenderer.invoke("servers:state"),
  add: (name, url) => ipcRenderer.invoke("servers:add", name, url),
  use: (id) => ipcRenderer.invoke("servers:use", id),
  remove: (id) => ipcRenderer.invoke("servers:remove", id),
});
contextBridge.exposeInMainWorld("desktopFrame", { setTitleBar: (bg, fg) => ipcRenderer.send("frame:titlebar", String(bg), String(fg)), menu: (x, y) => ipcRenderer.send("frame:menu", Math.round(+x) || 0, Math.round(+y) || 0) });
