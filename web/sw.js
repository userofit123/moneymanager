const V="money-v6",SHELL=["./","index.html","he-core.js","he-dict.js","manifest.webmanifest","icon-192.png","icon-512.png","icon-maskable-512.png","apple-touch-icon.png","favicon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);if(u.pathname.startsWith("/api/"))return; /* data is never cached by the service worker */
if(u.origin!==location.origin){e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(V+"-rates").then(ch=>ch.put(r,c));return x}).catch(()=>caches.match(r)));return}
if(r.mode==="navigate"){e.respondWith(fetch(r).then(x=>{const c=x.clone();caches.open(V).then(ch=>ch.put("index.html",c));return x}).catch(()=>caches.match("index.html")));return}
e.respondWith(caches.match(r).then(h=>h||fetch(r).then(x=>{const c=x.clone();caches.open(V).then(ch=>ch.put(r,c));return x})))});
self.addEventListener("message",e=>{if(e.data&&e.data.type==="notify"){self.registration.showNotification(e.data.title,{body:e.data.body,icon:"icon-192.png",badge:"favicon.png",tag:e.data.tag||"money",data:{url:"./?view=alerts"}})}});
self.addEventListener("notificationclick",e=>{e.notification.close();e.waitUntil(clients.matchAll({type:"window"}).then(l=>{for(const c of l){if("focus"in c){c.navigate(e.notification.data.url);return c.focus()}}return clients.openWindow(e.notification.data.url)}))});
