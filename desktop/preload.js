// The only things the app's page may ask of the desktop shell: its version and the update controls.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  getUpdate: () => ipcRenderer.invoke("update:get"),
  check: () => ipcRenderer.invoke("update:check"),
  download: () => ipcRenderer.invoke("update:download"),
  install: () => ipcRenderer.invoke("update:install"),
  chooseFolder: (cur) => ipcRenderer.invoke("backup:choose", cur),
  openFolder: (dir) => ipcRenderer.invoke("backup:open", dir),
  setAuto: (on) => ipcRenderer.invoke("update:auto", !!on),
  onUpdate: (fn) => ipcRenderer.on("update:state", (_e, s) => fn(s)),
});
