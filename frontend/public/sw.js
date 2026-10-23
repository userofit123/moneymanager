// The service worker: keeps a copy of the app on this device so it opens without a connection, and shows phone notifications.
// - The page: the newest from the server, the saved copy when offline.
// - /assets/*: files whose name changes with their content, so a saved copy is always right (saved on first use).
// - The data (/api/state, /api/fx, /api/auth/status): the newest, or the last good copy when offline or very slow (the app then shows it read-only,
//   marked with the x-offline-cache header). Signing out clears it. Nothing else from /api/ is ever saved.
const V = "money-v5", D = "money-data", SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/favicon.png", "/badge-96.png"];
// The app's files that are loaded only later (the other language, the page guide, the windows), so they work offline even before
// they were first used. Filled in by the build (vite.config.js); one that cannot be fetched is simply left for later.
const LATER = [];
const keepLater = (c) => Promise.all(LATER.map((u) => c.match(u).then((h) => h || c.add(u)).catch(() => {})));
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL).then(() => keepLater(c))).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== V && x !== D).map((x) => caches.delete(x)))).then(() => self.clients.claim())); });

const save = (cache, key, res) => { if (res.ok) { const c = res.clone(); caches.open(cache).then((ch) => ch.put(key, c)); } return res; };
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  if (u.pathname === "/api/state" || u.pathname === "/api/fx" || u.pathname === "/api/auth/status") {
    const key = u.pathname;
    const saved = () => caches.open(D).then((ch) => ch.match(key)).then((h) => {
      if (!h) return Response.error();
      const hd = new Headers(h.headers); hd.set("x-offline-cache", "1");
      return h.blob().then((b) => new Response(b, { status: 200, headers: hd }));
    });
    e.respondWith(Promise.race([fetch(r).then((x) => { if (x.status >= 502 && x.status <= 504) throw new Error("down"); return save(D, key, x); }), new Promise((_, no) => setTimeout(() => no(new Error("slow")), 9000))]).catch(saved));
    return;
  }
  if (u.pathname.startsWith("/api/")) return;
  if (r.mode === "navigate") { e.respondWith(fetch(r).then((x) => save(V, "/", x)).catch(() => caches.match("/"))); return; }
  if (u.pathname.startsWith("/assets/")) { e.respondWith(caches.match(r).then((h) => h || fetch(r).then((x) => save(V, r, x)))); return; }
  // icons, fonts, pdf.js: the newest, the saved copy when offline
  e.respondWith(fetch(r).then((x) => save(V, r, x)).catch(() => caches.match(r)));
});

const show = (d) => self.registration.showNotification(d.title || "Money", { body: d.body || "", icon: "/icon-192.png", badge: "/badge-96.png", tag: d.tag || "money", data: { url: "/?view=alerts" } });
self.addEventListener("message", (e) => { if (e.data && e.data.type === "notify") show(e.data); });
self.addEventListener("push", (e) => { let d = {}; try { d = e.data ? e.data.json() : {}; } catch { /* not JSON */ } e.waitUntil(show(d)); });
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window" }).then((l) => { for (const c of l) if ("focus" in c) { c.navigate(e.notification.data.url); return c.focus(); } return clients.openWindow(e.notification.data.url); }));
});
