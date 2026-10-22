// What the server list window may ask of the desktop shell.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("servers", {
  texts: () => ipcRenderer.invoke("servers:texts"),
  state: () => ipcRenderer.invoke("servers:state"),
  add: (name, url) => ipcRenderer.invoke("servers:add", name, url),
  use: (id) => ipcRenderer.invoke("servers:use", id),
  remove: (id) => ipcRenderer.invoke("servers:remove", id),
  close: () => ipcRenderer.invoke("servers:close"),
});
