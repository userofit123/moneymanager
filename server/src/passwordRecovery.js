// "Forgot password?": getting back into the app without email, in one of two ways.
// 1. The recovery key: a one-time key shown when the password is set (and made again in Settings → Security). Only its slow hash is kept.
// 2. A 6-digit code sent to the phone through an alert channel that reaches only the person (ntfy, Telegram, web push, the phone app).
//    It works for 10 minutes, once, with at most 5 tries; only its slow hash is kept; a new code or a new password ends it.
// With two-step sign-in on, the new password also needs the authenticator code. Repeated failures lock resets for 15 minutes.
import crypto from "node:crypto";
import { q, audit } from "./db.js";
import { getUser, hashPassword, checkPassword, setPassword, passwordProblem, totpOk, readTotpSecret } from "./auth.js";
import { hasPrivateChannel, sendPrivate, sendNtfy } from "./notify.js";
import { personLang } from "./syncFailNotice.js";

const CODE_MINUTES = 10, CODE_TRIES = 5;
const LOCK_MINUTES = 15;

// ---------- the recovery key ----------
// 5 groups of 4 from 31 easy characters (no 0/O, 1/I/L): about 99 bits.
const KEY_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const KEY_LEN = 20;
export function newRecoveryKey() {
  let s = "";
  for (let i = 0; i < KEY_LEN; i++) s += KEY_CHARS[crypto.randomInt(KEY_CHARS.length)];
  return s.match(/.{4}/g).join("-");
}
// What was typed, without spaces, dashes or case
export const plainKey = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function makeRecoveryKey() {
  const key = newRecoveryKey();
  await q("UPDATE auth_user SET recovery_hash=$1, recovery_at=now() WHERE id=1", [hashPassword(plainKey(key))]);
  await audit(null, "Recovery key made", "", "You");
  return key;
}
export async function recoveryKeyStatus() {
  const u = await getUser();
  return { has: !!u?.recovery_hash, at: u?.recovery_at || null };
}

// ---------- texts sent to the phone (plain, in the app's language) ----------
const T = {
  en: {
    codeT: "Money · password reset code",
    code: (c) => `Code to reset your Money password: ${c}. It works for ${CODE_MINUTES} minutes. If you didn't ask for it, ignore this.`,
    doneT: "Money · password changed",
    done: "Your Money password was changed, and every device was signed out. If this was not you, change the password now.",
  },
  he: {
    codeT: "Money · קוד לאיפוס הסיסמה",
    code: (c) => `קוד לאיפוס הסיסמה של Money: ${c}. הוא תקף ${CODE_MINUTES} דקות. אם הבקשה לא הייתה שלכם, אפשר להתעלם מההודעה.`,
    doneT: "Money · הסיסמה שונתה",
    done: "הסיסמה של Money שונתה, וכל המכשירים נותקו. אם זה לא נעשה על ידך, כדאי לשנות את הסיסמה עכשיו.",
  },
};
const texts = async () => T[await personLang()];

// ---------- errors the sign-in screen shows (generic: they never say whether a key exists) ----------
export class ResetError extends Error { constructor(m, status = 400, extra = {}) { super(m); this.status = status; Object.assign(this, extra); } }
const MSG = {
  locked: "Too many tries. Try again in 15 minutes.",
  key: "That recovery key does not work.",
  code: "That code does not work. It may be wrong or too old: ask for a new one.",
  noPhone: "No phone is set up for alerts.",
  wait: "Wait a minute before asking for another code.",
  waitHour: "Too many codes were asked for. Try again in an hour.",
  notSent: "The code could not be sent. Try again in a minute, or use the recovery key.",
  need2fa: "Enter the code from your authenticator app.",
  bad2fa: "That code is not right.",
};

// ---------- the log of attempts, the rate limits and the lock ----------
const note = async (ip, kind, ok) => {
  await q("INSERT INTO reset_attempts (ip,kind,ok) VALUES ($1,$2,$3)", [String(ip || "").slice(0, 60), kind, ok]);
  console.log(`password reset: ${kind} ${ok ? "ok" : "failed"} (from ${ip || "?"})`);
};
// Locked after 5 failed tries from one address, or 20 from anywhere, in the last 15 minutes.
async function resetLocked(ip) {
  await q("DELETE FROM reset_attempts WHERE at < now() - interval '30 days'");
  const r = (await q(`SELECT count(*) FILTER (WHERE ip=$1)::int AS mine, count(*)::int AS total FROM reset_attempts
    WHERE NOT ok AND kind <> 'send' AND at > now() - interval '${LOCK_MINUTES} minutes'`, [String(ip || "").slice(0, 60)])).rows[0];
  return r.mine >= 5 || r.total >= 20;
}
// One code a minute, at most 5 an hour.
async function sendLimit() {
  const r = (await q("SELECT count(*) FILTER (WHERE at > now() - interval '1 minute')::int AS m1, count(*)::int AS h1 FROM reset_attempts WHERE kind='send' AND at > now() - interval '1 hour'")).rows[0];
  return r.m1 >= 1 ? MSG.wait : r.h1 >= 5 ? MSG.waitHour : null;
}

// ---------- what the signed-out screen may know: only whether a code can be sent ----------
export async function resetOptions() { return { phone: await hasPrivateChannel() }; }

// ---------- the code to the phone ----------
export async function sendCode({ ip }) {
  if (await resetLocked(ip)) throw new ResetError(MSG.locked, 429);
  if (!(await hasPrivateChannel())) throw new ResetError(MSG.noPhone);
  const wait = await sendLimit(); if (wait) throw new ResetError(wait, 429);
  const code = String(crypto.randomInt(1000000)).padStart(6, "0");
  await q(`UPDATE auth_user SET reset_code_hash=$1, reset_code_expires=now() + interval '${CODE_MINUTES} minutes', reset_code_tries=0 WHERE id=1`, [hashPassword(code)]);
  const L = await texts();
  const sent = await sendPrivate(L.codeT, L.code(code)).catch(() => false);
  await note(ip, "send", sent);
  if (!sent) { await q("UPDATE auth_user SET reset_code_hash=NULL, reset_code_expires=NULL WHERE id=1"); throw new ResetError(MSG.notSent, 502); }
}

// ---------- checking the key or the code ----------
let dummy; // checked when there is no key or code, so a missing one takes as long as a wrong one
const slowCheck = (s, h) => checkPassword(s, h || (dummy ||= hashPassword(crypto.randomBytes(16).toString("hex"))));
async function userNow() { return (await q("SELECT *, (reset_code_expires > now()) AS code_live FROM auth_user WHERE id=1")).rows[0] || null; }

// Gives the hash that matched (so it can be taken once), or throws a generic error and counts the failure.
async function match(ip, way, secret) {
  if (way !== "key" && way !== "code") throw new ResetError("bad request");
  if (await resetLocked(ip)) throw new ResetError(MSG.locked, 429);
  const u = await userNow();
  if (way === "key") {
    const k = plainKey(secret), ok = slowCheck(k, u?.recovery_hash) && k.length === KEY_LEN && !!u?.recovery_hash;
    if (ok) return { u, hash: u.recovery_hash };
    await note(ip, "key", false); throw new ResetError(MSG.key, 400, { wrong: true });
  }
  const c = String(secret || "").replace(/\D/g, ""), live = !!u?.reset_code_hash && u.code_live;
  const ok = slowCheck(c, live ? u.reset_code_hash : null) && c.length === 6 && live;
  if (ok) return { u, hash: u.reset_code_hash };
  await note(ip, "code", false);
  // after 5 wrong tries the code is gone
  if (live) await q(`UPDATE auth_user SET reset_code_tries=reset_code_tries+1, reset_code_hash=CASE WHEN reset_code_tries+1 >= ${CODE_TRIES} THEN NULL ELSE reset_code_hash END WHERE id=1`);
  throw new ResetError(MSG.code, 400, { wrong: true });
}

// Before asking for the new password: whether the key or code works (a wrong one counts as a try).
export async function checkSecret({ ip, way, secret }) {
  const { u } = await match(ip, way, secret);
  return { ok: true, need2fa: !!u.totp_enabled };
}

// Sets the new password. Gives { newKey } when the recovery key was used (it is used up, so a new one is made at once).
export async function finishReset({ ip, way, secret, password, code }) {
  const { u, hash } = await match(ip, way, secret);
  const bad = passwordProblem(password); if (bad) throw new ResetError(bad);
  if (u.totp_enabled) {
    if (!String(code || "").trim()) throw new ResetError(MSG.need2fa, 400, { need2fa: true });
    if (!totpOk(readTotpSecret(u), code)) { await note(ip, "2fa", false); throw new ResetError(MSG.bad2fa, 400, { need2fa: true }); }
  }
  // take the key or code (only one request can), then set the password: that ends every session and any code
  const took = way === "key"
    ? await q("UPDATE auth_user SET recovery_hash=NULL WHERE id=1 AND recovery_hash=$1", [hash])
    : await q("UPDATE auth_user SET reset_code_hash=NULL WHERE id=1 AND reset_code_hash=$1 AND reset_code_expires > now()", [hash]);
  if (!took.rowCount) throw new ResetError(way === "key" ? MSG.key : MSG.code, 400, { wrong: true });
  await setPassword(password);
  await note(ip, way, true);
  const byKey = way === "key";
  await audit(null, byKey ? "Password reset with the recovery key" : "Password reset with a phone code", "", "You");
  const newKey = byKey ? await makeRecoveryKey() : null;
  const L = await texts();
  sendNtfy(L.doneT, L.done, "high").catch(() => {});
  return { newKey };
}
