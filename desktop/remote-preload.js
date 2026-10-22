// A remote server's page gets only the server list (to switch or add servers from Settings), never the update or backup controls.
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktopServers", {
  state: () => ipcRenderer.invoke("servers:state"),
  add: (name, url) => ipcRenderer.invoke("servers:add", name, url),
  use: (id) => ipcRenderer.invoke("servers:use", id),
  remove: (id) => ipcRenderer.invoke("servers:remove", id),
});
// The window frame: the app tells the shell its colours so the title bar matches the page
contextBridge.exposeInMainWorld("desktopFrame", { setTitleBar: (bg, fg) => ipcRenderer.send("frame:titlebar", String(bg), String(fg)) });

// A server that is older than this app has no title bar of its own in its page (and never tells us its colours). The window has no system title
// bar, so draw a strip for it here, in the page's own colours, and keep the window buttons' colours the same. A newer page does all this itself.
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (document.getElementById("dragbar")) return;
    const css = document.createElement("style");
    css.textContent = "#mm-dragbar{position:fixed;inset:0 0 auto 0;height:38px;z-index:2147483000;-webkit-app-region:drag;background:transparent;backdrop-filter:blur(18px)}html.mm-frame body{padding-top:38px}";
    const bar = document.createElement("div"); bar.id = "mm-dragbar"; bar.setAttribute("aria-hidden", "true");
    document.head.append(css); document.documentElement.classList.add("mm-frame"); document.body.prepend(bar);
    let last = "";
    const sync = () => {
      const s = getComputedStyle(document.documentElement), bg = s.getPropertyValue("--bg").trim() || getComputedStyle(document.body).backgroundColor, fg = s.getPropertyValue("--tx").trim() || getComputedStyle(document.body).color;
      if (bg + "|" + fg !== last) { last = bg + "|" + fg; try { ipcRenderer.send("frame:titlebar", bg, fg); } catch { /* the buttons keep their colours */ } }
    };
    sync(); setInterval(sync, 1500);
  }, 2500);
});
