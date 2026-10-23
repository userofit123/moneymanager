// The desktop app's own screens for a Money Manager server elsewhere. A small web server on this computer (127.0.0.1 only) serves the app's
// bundled screens (so what you see is the installed app, updated with it) and passes every /api request on to the server, with the sign-in
// cookie kept here. The server keeps the data, the saved-logins key and the bank scraper; this only carries the requests.
const http = require("node:http");
const https = require("node:https");
const tls = require("node:tls");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".txt": "text/plain; charset=utf-8", ".map": "application/json" };
// the same hop-by-hop headers a proxy must not copy
const HOP = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]);

// "sha256/<base64>" of a certificate, the same form the desktop app keeps as the trusted fingerprint
const fingerprint = (der) => "sha256/" + crypto.createHash("sha256").update(der).digest("base64");

// A cookie the server set for its own address becomes one for this one: no Domain, and no Secure (this side is plain http on 127.0.0.1)
const localCookie = (c) => c.split(";").map((x) => x.trim()).filter((x) => x && !/^(domain|secure)(=|$)/i.test(x)).join("; ");

/**
 * webDir: the built app. remote: the server's address ("https://money.home"). trusted(): the fingerprint the user trusted for it, or "".
 * request: how to reach the server, with the same call as http.request. Default is node's own; the desktop app passes the browser's network stack
 * instead (so a certificate the computer trusts, for example a home network's own authority, is trusted here too).
 * Gives back a node http.Server (not listening yet).
 */
function createShellServer({ webDir, remote, trusted = () => "", request = null }) {
  const target = new URL(remote), secure = target.protocol === "https:", lib = secure ? https : http;
  // A connection to a server whose certificate this computer does not know is handed over (so nothing is sent on it) only when it is exactly the
  // certificate the user trusted for this server.
  const agent = secure && !request ? new (class extends https.Agent {
    createConnection(options, cb) {
      const sock = tls.connect({ ...options, rejectUnauthorized: false });
      sock.once("secureConnect", () => {
        if (sock.authorized) return cb(null, sock);
        const c = sock.getPeerCertificate();
        if (c && c.raw && trusted() && fingerprint(c.raw) === trusted()) return cb(null, sock);
        sock.destroy(); cb(new Error("certificate"));
      });
      sock.once("error", (e) => cb(e));
    }
  })({ keepAlive: true }) : undefined;

  function proxy(req, res) {
    const headers = { ...req.headers, host: target.host };
    for (const k of Object.keys(headers)) if (HOP.has(k)) delete headers[k];
    if (headers.origin) headers.origin = target.origin;
    if (headers.referer) { try { headers.referer = target.origin + new URL(headers.referer).pathname; } catch { delete headers.referer; } }
    const up = (request || lib.request)({ protocol: target.protocol, hostname: target.hostname, port: target.port || (secure ? 443 : 80), path: req.url, method: req.method, headers, ...(agent ? { agent } : {}) }, (r) => {
      const out = {};
      for (const [k, v] of Object.entries(r.headers)) { if (HOP.has(k) || (request && (k === "content-encoding" || k === "content-length"))) continue; /* a browser-side request has already unpacked the body: its size and packing no longer apply */ out[k] = k === "set-cookie" ? (Array.isArray(v) ? v.map(localCookie) : localCookie(String(v))) : v; }
      res.writeHead(r.statusCode || 502, out);
      r.pipe(res);
      r.on("error", () => res.destroy());
    });
    // a server that cannot be reached: the connection just fails (not an error page), so the app falls back to its saved copy, as offline
    up.on("error", (e) => { if (process.env.MM_DEBUG) console.error("shell proxy:", req.method, req.url, "-", e && e.message); if (!res.headersSent) req.socket.destroy(); else res.destroy(); });
    res.on("close", () => up.destroy());
    req.pipe(up);
  }

  function serve(req, res) {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400).end(); return; }
    const file = path.normalize(path.join(webDir, rel));
    if (file !== webDir && !file.startsWith(webDir + path.sep)) { res.writeHead(403).end(); return; }
    let f = file;
    try { if (fs.statSync(f).isDirectory()) f = path.join(f, "index.html"); } catch { f = null; }
    // an address that is not a file (/jars, /settings) opens the app, which shows that page
    if (!f || !fs.existsSync(f)) { if (path.extname(rel) || rel.startsWith("/assets/")) { res.writeHead(404).end(); return; } f = path.join(webDir, "index.html"); }
    const ext = path.extname(f), asset = f.startsWith(path.join(webDir, "assets") + path.sep);
    res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": asset ? "public, max-age=31536000, immutable" : "no-cache", "X-Content-Type-Options": "nosniff" });
    if (req.method === "HEAD") { res.end(); return; }
    fs.createReadStream(f).on("error", () => res.destroy()).pipe(res);
  }

  return http.createServer((req, res) => { if (req.url.startsWith("/api/")) proxy(req, res); else serve(req, res); });
}

const listen = (server, port) => new Promise((ok, no) => { server.once("error", no); server.listen(port, "127.0.0.1", () => ok(server.address().port)); });

// What the server says about itself in its sign-in status: { version, api, apiMin } (a server older than 0.12.1 says nothing: empty version), or null when it did not answer.
async function remoteInfo(remote, { timeout = 8000 } = {}) {
  const u = new URL("/api/auth/status", remote), lib = u.protocol === "https:" ? https : http;
  return new Promise((ok) => {
    const req = lib.get(u, { timeout, ...(u.protocol === "https:" ? { rejectUnauthorized: false } : {}) }, (r) => {
      let b = ""; r.setEncoding("utf8"); r.on("data", (d) => { b += d; if (b.length > 5000) req.destroy(); });
      r.on("end", () => { try { const j = JSON.parse(b); ok({ version: String(j.version || ""), ...(typeof j.api === "number" ? { api: j.api } : {}), ...(typeof j.apiMin === "number" ? { apiMin: j.apiMin } : {}) }); } catch { ok(null); } });
    });
    req.on("timeout", () => req.destroy()); req.on("error", () => ok(null));
  });
}
const remoteVersion = async (remote, o) => ((await remoteInfo(remote, o)) || {}).version || "";
// The screens fit a server when its version has the same first two numbers (0.12.x with 0.12.y): they change the server's API only with those.
const sameLine = (a, b) => { const x = String(a).split("."), y = String(b).split("."); return x.length >= 2 && y.length >= 2 && x[0] === y[0] && x[1] === y[1]; };

module.exports = { createShellServer, listen, remoteInfo, remoteVersion, sameLine, fingerprint, localCookie };
