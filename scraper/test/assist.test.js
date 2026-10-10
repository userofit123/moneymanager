// Mechanism test against a fake bank that behaves like Hapoalim: password first, then a one-time code,
// but only when it does not recognise the device. Proves the remembered-device profile survives between sessions.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const CHROME = process.env.PUPPETEER_EXECUTABLE_PATH || "/opt/pw-browsers/chromium";
const skip = fs.existsSync(CHROME) ? false : "no chromium available";
let bank, scraper, profiles, base = "http://127.0.0.1:18111";

const page = (body) => `<!doctype html><meta charset=utf-8><body style="margin:0;font:16px sans-serif">${body}`;
before(async () => {
  if (skip) return;
  bank = http.createServer((req, res) => {
    const trusted = /trusted=1/.test(req.headers.cookie || "");
    const html = (b, h = {}) => { res.writeHead(200, { "content-type": "text/html", ...h }); res.end(page(b)); };
    const go = (to, h = {}) => { res.writeHead(302, { location: to, ...h }); res.end(); };
    if (req.url === "/login" && req.method === "GET") return html(`<form method=post action=/login><input name=u autofocus style="position:absolute;left:20px;top:20px;width:200px"><input name=p type=password style="position:absolute;left:20px;top:60px;width:200px"><button style="position:absolute;left:20px;top:100px">Login</button></form>`);
    if (req.url === "/login") return go(trusted ? "/home" : "/otp");
    if (req.url === "/otp" && req.method === "GET") return html(`<p style="position:absolute;top:0;left:20px">Enter the code we sent you (SMS)</p><form method=post action=/otp><input name=code style="position:absolute;left:20px;top:60px;width:200px;height:30px"><input type=checkbox name=remember style="position:absolute;left:20px;top:120px;width:30px;height:30px"><button style="position:absolute;left:20px;top:180px;width:100px;height:40px">Send</button></form>`);
    if (req.url === "/otp") { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => go("/home", /remember=on/.test(b) && /code=123456/.test(b) ? { "set-cookie": "trusted=1; Max-Age=31536000; Path=/" } : {})); return; }
    if (req.url === "/home") return html("<h1>Welcome</h1>");
    res.writeHead(404); res.end();
  });
  await new Promise((r) => bank.listen(18111, "127.0.0.1", r));
  profiles = fs.mkdtempSync(path.join(os.tmpdir(), "profiles-"));
  scraper = spawn("node", ["server.js"], {
    cwd: path.resolve(import.meta.dirname, ".."),
    env: { ...process.env, PORT: "18112", SCRAPER_KEY: "k", PROFILE_DIR: profiles, TEST_LOGIN_URL: `${base}/login`, PUPPETEER_EXECUTABLE_PATH: CHROME, ASSIST_IDLE_MS: "60000" },
    stdio: "ignore",
  });
  for (let i = 0; i < 40; i++) { try { if ((await fetch("http://127.0.0.1:18112/healthz")).ok) break; } catch {} await new Promise((r) => setTimeout(r, 150)); }
});
after(async () => { scraper?.kill(); bank?.close(); if (profiles) fs.rmSync(profiles, { recursive: true, force: true }); });

const S = "http://127.0.0.1:18112";
const call = async (method, p, body, key = "k") => {
  const r = await fetch(S + p, { method, headers: { "x-scraper-key": key, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const ct = r.headers.get("content-type") || "";
  return { status: r.status, body: ct.includes("json") ? await r.json() : Buffer.from(await r.arrayBuffer()) };
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const where = async () => (await call("GET", "/assist/status")).body.path;
const login = async () => { await call("POST", "/assist/type", { text: "me" }); await call("POST", "/assist/key", { key: "Tab" }); await call("POST", "/assist/type", { text: "pw" }); await call("POST", "/assist/key", { key: "Enter" }); await wait(700); };

test("needs the key; only whitelisted keys; nothing works without a window", { skip }, async () => {
  assert.equal((await call("GET", "/assist/status", null, "wrong")).status, 401);
  assert.equal((await call("GET", "/assist/screen")).status, 409);
  assert.equal((await call("POST", "/assist/click", { x: 1, y: 1 })).status, 409);
});

test("first time: the bank asks for the code; entering it and ticking 'remember' verifies the device", { skip, timeout: 60000 }, async () => {
  assert.equal((await call("POST", "/assist/start", { company: "hapoalim" })).status, 200);
  assert.equal(await where(), "/login");
  const shot = await call("GET", "/assist/screen");
  assert.equal(shot.body[0], 0xff); assert.equal(shot.body[1], 0xd8); // a JPEG
  assert.equal((await call("POST", "/assist/key", { key: "F12" })).status, 400);
  await login();
  assert.equal(await where(), "/otp"); // unknown device: code required
  await call("POST", "/assist/click", { x: 100, y: 75 });
  await call("POST", "/assist/type", { text: "123456" });
  await call("POST", "/assist/click", { x: 35, y: 135 });  // "remember this device"
  await call("POST", "/assist/click", { x: 60, y: 200 });  // send
  await wait(700);
  assert.equal(await where(), "/home");
  await call("POST", "/assist/stop");
  assert.equal((await call("GET", "/assist/status")).body.active, false);
});

test("afterwards the same browser profile is recognised: no code needed", { skip, timeout: 60000 }, async () => {
  await call("POST", "/assist/start", { company: "hapoalim" });
  await login();
  assert.equal(await where(), "/home");
  await call("POST", "/assist/stop");
});

test("another bank has its own profile and is not trusted", { skip, timeout: 60000 }, async () => {
  await call("POST", "/assist/start", { company: "max" });
  await login();
  assert.equal(await where(), "/otp");
  await call("POST", "/assist/stop");
});

test("forgetting a bank wipes its remembered device", { skip, timeout: 60000 }, async () => {
  assert.equal((await call("POST", "/assist/forget", { company: "hapoalim" })).status, 200);
  await call("POST", "/assist/start", { company: "hapoalim" });
  await login();
  assert.equal(await where(), "/otp"); // asks for the code again
  await call("POST", "/assist/stop");
});

test("a scrape is refused while a verification window is open", { skip, timeout: 60000 }, async () => {
  await call("POST", "/assist/start", { company: "hapoalim" });
  const r = await call("POST", "/scrape", { company: "hapoalim", credentials: { userCode: "abc", password: "def" }, startDate: "2026-09-01" });
  assert.equal(r.status, 500); assert.match(r.body.error, /verification window is open/);
  await call("POST", "/assist/stop");
});
