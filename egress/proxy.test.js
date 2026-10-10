import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import http from "node:http";
process.env.EGRESS_ALLOW = "bank.example,max.example";
process.env.EGRESS_ALLOW_PRIVATE = "1";
const { hostAllowed, isPrivateIp, createProxy } = await import("./proxy.js");

test("allowlist: exact and subdomains only", () => {
  assert.ok(hostAllowed("bank.example", ["bank.example"]));
  assert.ok(hostAllowed("login.bank.example", ["bank.example"]));
  assert.ok(!hostAllowed("evilbank.example", ["bank.example"]));
  assert.ok(!hostAllowed("bank.example.evil.com", ["bank.example"]));
});
test("private and tailscale addresses are recognised", () => {
  for (const ip of ["10.0.0.5", "127.0.0.1", "192.168.1.9", "172.20.1.1", "100.100.1.1", "169.254.1.1", "::1", "fd00::1"]) assert.ok(isPrivateIp(ip), ip);
  for (const ip of ["8.8.8.8", "172.32.0.1", "100.128.0.1"]) assert.ok(!isPrivateIp(ip), ip);
});

const connect = (port, target) => new Promise((resolve) => {
  const s = net.connect(port, "127.0.0.1", () => s.write(`CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\n\r\n`));
  s.once("data", (d) => { resolve(String(d).split("\r\n")[0]); s.destroy(); });
});

test("proxy refuses hosts that are not allowed, non-443 ports and plain http; allows listed hosts", async () => {
  const srv = createProxy(); await new Promise((r) => srv.listen(0, r)); const port = srv.address().port;
  assert.match(await connect(port, "evil.example:443"), /403/);
  assert.match(await connect(port, "bank.example.evil.com:443"), /403/);
  assert.match(await connect(port, "bank.example:22"), /403/);
  // an allowed name that resolves nowhere is refused too (never an open tunnel to an unknown place)
  assert.match(await connect(port, "nonexistent.bank.example:443"), /403/);
  const code = await new Promise((r) => http.get({ host: "127.0.0.1", port, path: "http://bank.example/", headers: { host: "bank.example" } }, (res) => r(res.statusCode)));
  assert.equal(code, 403);
  srv.close();
});
