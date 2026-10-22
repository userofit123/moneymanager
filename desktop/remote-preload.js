// A remote server's page gets only the server list (to switch or add servers from Settings), never the update or backup controls.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktopServers", {
  state: () => ipcRenderer.invoke("servers:state"),
  add: (name, url) => ipcRenderer.invoke("servers:add", name, url),
  use: (id) => ipcRenderer.invoke("servers:use", id),
  remove: (id) => ipcRenderer.invoke("servers:remove", id),
});
