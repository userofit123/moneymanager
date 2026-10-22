const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { createShellServer, listen, remoteVersion, sameLine, localCookie, fingerprint } = require("../shellserver.js");

const web = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "mm-web-"));
  fs.mkdirSync(path.join(d, "assets")); fs.writeFileSync(path.join(d, "index.html"), "<html>app</html>"); fs.writeFileSync(path.join(d, "assets", "a.js"), "1"); fs.writeFileSync(path.join(d, "sw.js"), "sw");
  return d;
};
// a made-up Money Manager server that echoes what it gets
const fake = async (opts = {}) => {
  const srv = (opts.tls ? https.createServer({ key: fs.readFileSync(path.join(__dirname, "fixtures/test-key.pem")), cert: fs.readFileSync(path.join(__dirname, "fixtures/test-cert.pem")) }) : http.createServer());
  srv.on("request", (req, res) => {
    let body = ""; req.on("data", (c) => (body += c));
    req.on("end", () => {
      res.setHeader("set-cookie", ["sid=abc; Path=/; HttpOnly; Secure; SameSite=Strict; Domain=money.home"]);
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ method: req.method, url: req.url, cookie: req.headers.cookie || "", host: req.headers.host, origin: req.headers.origin || "", body, version: "0.12.3", setup: false }));
    });
  });
  const port = await listen(srv, 0);
  return { srv, port };
};
const get = (port, p, o = {}) => new Promise((ok, no) => { const r = http.request({ port, host: "127.0.0.1", path: p, ...o }, (x) => { let b = ""; x.on("data", (c) => (b += c)); x.on("end", () => ok({ status: x.statusCode, headers: x.headers, body: b })); }); r.on("error", no); r.end(o.body); });

test("the bundled screens are served, and any other address opens the app", async () => {
  const f = await fake(), shell = createShellServer({ webDir: web(), remote: `http://127.0.0.1:${f.port}` }), port = await listen(shell, 0);
  try {
    assert.equal((await get(port, "/")).body, "<html>app</html>");
    assert.equal((await get(port, "/jars")).body, "<html>app</html>");
    const a = await get(port, "/assets/a.js"); assert.equal(a.status, 200); assert.match(a.headers["cache-control"], /immutable/);
    assert.equal((await get(port, "/assets/missing.js")).status, 404);
    assert.equal((await get(port, "/..%2f..%2fetc/passwd")).status === 200, false);
    assert.equal((await get(port, "/sw.js")).headers["cache-control"], "no-cache");
  } finally { shell.close(); f.srv.close(); }
});

test("/api goes to the server: method, body and cookie pass, the address is the server's, and its cookie is made local", async () => {
  const f = await fake(), shell = createShellServer({ webDir: web(), remote: `http://127.0.0.1:${f.port}` }), port = await listen(shell, 0);
  try {
    const r = await get(port, "/api/state?x=1", { method: "PUT", headers: { cookie: "sid=old", origin: `http://127.0.0.1:${port}` }, body: "{\"a\":1}" });
    const j = JSON.parse(r.body);
    assert.deepEqual([j.method, j.url, j.cookie, j.body], ["PUT", "/api/state?x=1", "sid=old", "{\"a\":1}"]);
    assert.equal(j.host, `127.0.0.1:${f.port}`); assert.equal(j.origin, `http://127.0.0.1:${f.port}`);
    assert.equal(r.headers["set-cookie"][0], "sid=abc; Path=/; HttpOnly; SameSite=Strict");
  } finally { shell.close(); f.srv.close(); }
});

test("a server that cannot be reached makes the request fail (so the app uses its saved copy), not an error page", async () => {
  const f = await fake(), dead = f.port; f.srv.close();
  const shell = createShellServer({ webDir: web(), remote: `http://127.0.0.1:${dead}` }), port = await listen(shell, 0);
  try { await assert.rejects(() => get(port, "/api/state")); } finally { shell.close(); }
});

test("a certificate the computer does not know is refused, unless it is exactly the trusted one", async () => {
  const f = await fake({ tls: true }), pem = fs.readFileSync(path.join(__dirname, "fixtures/test-cert.pem"), "utf8");
  const der = new crypto.X509Certificate(pem).raw, fp = fingerprint(der);
  let trust = "";
  const shell = createShellServer({ webDir: web(), remote: `https://127.0.0.1:${f.port}`, trusted: () => trust }), port = await listen(shell, 0);
  try {
    await assert.rejects(() => get(port, "/api/state"), "no trust, refused");
    trust = "sha256/" + Buffer.from("not the cert").toString("base64");
    await assert.rejects(() => get(port, "/api/state"), "another certificate, refused");
    trust = fp;
    const r = await get(port, "/api/state"); assert.equal(JSON.parse(r.body).version, "0.12.3");
  } finally { shell.close(); f.srv.close(); }
});

test("the server's version is read from its sign-in status, and screens fit when the first two numbers match", async () => {
  const f = await fake();
  try { assert.equal(await remoteVersion(`http://127.0.0.1:${f.port}`), "0.12.3"); } finally { f.srv.close(); }
  assert.equal(await remoteVersion("http://127.0.0.1:1", { timeout: 500 }), "");
  assert.ok(sameLine("0.12.1", "0.12.9")); assert.ok(!sameLine("0.12.1", "0.13.0")); assert.ok(!sameLine("0.12.1", "")); assert.ok(!sameLine("1.0.0", "0.12.0"));
});

test("a cookie keeps its other settings and loses Domain and Secure", () => {
  assert.equal(localCookie("a=b; Domain=x.y; Path=/; Secure; HttpOnly; SameSite=Lax"), "a=b; Path=/; HttpOnly; SameSite=Lax");
});
