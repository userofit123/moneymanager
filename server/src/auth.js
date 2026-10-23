// One user: password (scrypt) + optional TOTP 2FA. Sessions are random tokens in an HttpOnly, SameSite=Strict cookie;
// only a hash of the token is stored. Failed logins are rate limited.
import crypto from "node:crypto";
import { q } from "./db.js";
import { encrypt, decrypt } from "./secrets.js";

const SESSION_DAYS = +process.env.SESSION_DAYS || 14;
export const COOKIE = "mm_session";
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

// ---------- password ----------
export function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64")}$${h.toString("base64")}`;
}
export function checkPassword(pw, stored) {
  const [alg, N, r, p, salt, hash] = String(stored).split("$");
  if (alg !== "scrypt") return false;
  const h = crypto.scryptSync(pw, Buffer.from(salt, "base64"), 64, { N: +N, r: +r, p: +p });
  const want = Buffer.from(hash, "base64");
  return h.length === want.length && crypto.timingSafeEqual(h, want);
}
export function passwordProblem(pw) {
  if (typeof pw !== "string" || pw.length < 10) return "Use at least 10 characters.";
  if (/^(.)\1+$/.test(pw) || ["password123", "1234567890"].includes(pw.toLowerCase())) return "That password is too easy to guess.";
  return null;
}

// ---------- TOTP (RFC 6238, SHA-1, 6 digits, 30 s) ----------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const b32encode = (buf) => { let bits = "", out = ""; for (const b of buf) bits += b.toString(2).padStart(8, "0"); for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)]; return out; };
export const b32decode = (s) => { let bits = ""; for (const ch of s.replace(/=+$/, "").toUpperCase()) bits += B32.indexOf(ch).toString(2).padStart(5, "0"); const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); };
export function totp(secretB32, t = Date.now(), step = 30, digits = 6) {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(t / 1000 / step)));
  const h = crypto.createHmac("sha1", b32decode(secretB32)).update(counter).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 10 ** digits).padStart(digits, "0");
}
export function totpOk(secretB32, code, t = Date.now()) {
  code = String(code || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  return [-1, 0, 1].some((d) => crypto.timingSafeEqual(Buffer.from(totp(secretB32, t + d * 30000)), Buffer.from(code)));
}
export const newTotpSecret = () => b32encode(crypto.randomBytes(20));

// ---------- user ----------
export const getUser = async () => (await q("SELECT * FROM auth_user WHERE id=1")).rows[0] || null;
export async function createUser(pw) {
  const bad = passwordProblem(pw); if (bad) throw new Error(bad);
  await q("INSERT INTO auth_user (id,password_hash) VALUES (1,$1)", [hashPassword(pw)]);
}
export async function setPassword(pw) {
  const bad = passwordProblem(pw); if (bad) throw new Error(bad);
  await q("UPDATE auth_user SET password_hash=$1 WHERE id=1", [hashPassword(pw)]);
  await q("DELETE FROM sessions"); // everyone signs in again
}

// ---------- rate limit ----------
export async function tooManyAttempts(ip) {
  const r = await q("SELECT count(*) FILTER (WHERE ip=$1)::int AS mine, count(*)::int AS total FROM login_attempts WHERE NOT ok AND at > now() - interval '15 minutes'", [ip]);
  return r.rows[0].mine >= 5 || r.rows[0].total >= 30;
}
export const noteAttempt = (ip, ok) => q("INSERT INTO login_attempts (ip,ok) VALUES ($1,$2)", [ip, ok]);

// ---------- sessions ----------
export async function startSession(ua = "", client = "") {
  const token = crypto.randomBytes(32).toString("base64url");
  await q("INSERT INTO sessions (token_hash,expires_at,user_agent,client,last_seen) VALUES ($1, now() + ($2 || ' days')::interval, $3, $4, now())", [sha(token), String(SESSION_DAYS), ua.slice(0, 200), String(client || "").slice(0, 40)]);
  await q("DELETE FROM sessions WHERE expires_at < now()");
  return token;
}
export async function sessionValid(token) {
  if (!token) return false;
  const ok = (await q("SELECT 1 FROM sessions WHERE token_hash=$1 AND expires_at > now()", [sha(token)])).rowCount > 0;
  if (ok) q("UPDATE sessions SET last_seen=now() WHERE token_hash=$1 AND (last_seen IS NULL OR last_seen < now() - interval '1 minute')", [sha(token)]).catch(() => {});
  return ok;
}

// What a sign-in is on, from what the app said about itself (X-MM-Client: "apk/0.12.8", "desktop/0.12.8", "pwa", "web") and the browser's own description.
export function deviceOf(client = "", ua = "") {
  const [kind, version] = String(client).split("/");
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iPod/i.test(ua) ? "iPhone / iPad" : /Windows/i.test(ua) ? "Windows" : /Macintosh|Mac OS X/i.test(ua) ? "Mac" : /Linux|X11/i.test(ua) ? "Linux" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  if (kind === "apk" || /; wv\)/.test(ua)) return { kind: "apk", os: "Android", version: version || "" };
  if (kind === "desktop" || /Electron\//.test(ua)) return { kind: "desktop", os, version: version || "" };
  return { kind: kind === "pwa" ? "pwa" : "web", os, browser };
}
export async function listSessions(token) {
  const mine = token ? sha(token) : "";
  const rows = (await q("SELECT token_hash,created_at,last_seen,user_agent,client FROM sessions WHERE expires_at > now() ORDER BY COALESCE(last_seen, created_at) DESC")).rows;
  return rows.map((r) => ({ id: r.token_hash.slice(0, 16), current: r.token_hash === mine, created: r.created_at, lastSeen: r.last_seen || r.created_at, ...deviceOf(r.client, r.user_agent) }));
}
export const endSessionById = (id) => /^[0-9a-f]{16}$/.test(id) ? q("DELETE FROM sessions WHERE token_hash LIKE $1", [id + "%"]) : null;
export const endSession = (token) => token && q("DELETE FROM sessions WHERE token_hash=$1", [sha(token)]);
export const cookieMaxAge = SESSION_DAYS * 86400;

export function readCookie(req, name = COOKIE) {
  const m = (req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith(name + "="));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : "";
}

// 2FA secret is stored encrypted
export const storeTotpSecret = (s) => q("UPDATE auth_user SET totp_secret=$1, totp_enabled=FALSE WHERE id=1", [encrypt(s)]);
export const readTotpSecret = (u) => (u?.totp_secret ? decrypt(u.totp_secret) : null);
export const enableTotp = () => q("UPDATE auth_user SET totp_enabled=TRUE WHERE id=1");
export const disableTotp = () => q("UPDATE auth_user SET totp_enabled=FALSE, totp_secret=NULL WHERE id=1");
