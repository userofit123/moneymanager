// Background alerts to the user's own ntfy server. Nothing leaves the home network unless the URL says so.
import { q } from "./db.js";
import { encrypt, decrypt } from "./secrets.js";
import webpush from "web-push";

export async function ntfyUrl() {
  const r = await q("SELECT value FROM settings WHERE key='ntfy'");
  const u = r.rows[0]?.value;
  return typeof u === "string" && /^https?:\/\//.test(u) ? u : "";
}

// Alerts mention account names and amounts, so they may only go to a server on your own network
// (localhost, private ranges, Tailscale, .local/.lan/.ts.net or a single-word hostname) unless you opt in with ALLOW_PUBLIC_NTFY=1.
export function ntfyProblem(url) {
  let h;
  try { h = new URL(url).hostname.toLowerCase().replace(/^\[|\]$/g, ""); } catch { return "That is not a valid address."; }
  if (process.env.ALLOW_PUBLIC_NTFY === "1") return null;
  const priv = h === "localhost" || /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(h) ||
    h === "::1" || /^f[cd]/.test(h) || !h.includes(".") || /\.(local|lan|internal|home\.arpa|ts\.net)$/.test(h);
  return priv ? null : "That address is on the public internet. Alerts contain account names and amounts, so only addresses on your own network or Tailscale are allowed (or set ALLOW_PUBLIC_NTFY=1).";
}

export async function sendNtfyOnly(title, body, priority = "default") {
  const url = await ntfyUrl();
  if (!url || ntfyProblem(url)) return false;
  try {
    const r = await fetch(url, { method: "POST", body, headers: { Title: title, Priority: priority }, signal: AbortSignal.timeout(8000) });
    return r.ok;
  } catch { return false; }
}

// ---------- more places to send alerts (all optional, off until you add them) ----------
// Telegram bot and webhook (Discord, Slack, Home Assistant, n8n...). Their secrets are stored encrypted and never sent back to the browser.
// These carry the alert text over the internet to that service, so they only exist when the user sets them up.
const CH_KEY = "notify_channels";
const getChannels = async () => { const v = (await q("SELECT value FROM settings WHERE key=$1", [CH_KEY])).rows[0]?.value; return v && typeof v === "object" ? v : {}; };
const putChannels = (c) => q("INSERT INTO settings (key,value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO UPDATE SET value=$2::jsonb", [CH_KEY, JSON.stringify(c)]);
export async function channelStatus() { const c = await getChannels(); return { telegram: !!c.telegram, telegramChat: c.telegram?.chat || "", webhook: !!c.webhook }; }
export async function saveChannel(kind, input) {
  const c = await getChannels();
  if (kind === "telegram") {
    const token = String(input?.token || "").trim(), chat = String(input?.chat || "").trim();
    if (!c.telegram && !/^\d+:[\w-]{20,}$/.test(token)) throw new Error("That does not look like a Telegram bot token (from @BotFather).");
    if (!/^-?\d{3,}$|^@\w{4,}$/.test(chat)) throw new Error("The chat id is a number (or @channelname).");
    c.telegram = { token: token ? encrypt(token) : c.telegram.token, chat };
  } else if (kind === "webhook") {
    const url = String(input?.url || "").trim();
    if (!/^https?:\/\/\S+$/.test(url)) throw new Error("Enter a full web address starting with https://");
    c.webhook = { url: encrypt(url) };
  } else throw new Error("unknown channel");
  await putChannels(c);
}
export async function removeChannel(kind) { const c = await getChannels(); delete c[kind]; await putChannels(c); }
const post = async (url, body) => { const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) }); return r.ok; };
export async function sendChannel(kind, title, body) {
  const c = await getChannels();
  try {
    if (kind === "telegram" && c.telegram) return await post(`https://api.telegram.org/bot${decrypt(c.telegram.token)}/sendMessage`, { chat_id: c.telegram.chat, text: `${title}\n${body}` });
    if (kind === "webhook" && c.webhook) return await post(decrypt(c.webhook.url), { title, body, text: `${title}\n${body}`, content: `**${title}**\n${body}` }); // text: Slack and generic, content: Discord
  } catch { /* an unreachable service never breaks a sync */ }
  return false;
}
// ---------- push to the phone / browser (PWA) ----------
// Standard Web Push: the phone\u2019s own push service (Google for Android) delivers it, even when the app is closed. Needs the app opened over https (or localhost).
const PUSH_KEYS = "push_vapid", PUSH_SUBS = "push_subs";
const getSet = async (k, d) => (await q("SELECT value FROM settings WHERE key=$1", [k])).rows[0]?.value ?? d;
const putSet = (k, v) => q("INSERT INTO settings (key,value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO UPDATE SET value=$2::jsonb", [k, JSON.stringify(v)]);
async function vapid() {
  let k = await getSet(PUSH_KEYS, null);
  if (!k) { const g = webpush.generateVAPIDKeys(); k = { pub: g.publicKey, priv: encrypt(g.privateKey) }; await putSet(PUSH_KEYS, k); }
  return { pub: k.pub, priv: decrypt(k.priv) };
}
export const pushKey = async () => (await vapid()).pub;
export async function pushSubscribe(sub, label) {
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth || !/^https:\/\//.test(sub.endpoint)) throw new Error("Not a valid push subscription.");
  const list = (await getSet(PUSH_SUBS, [])).filter((s) => s.endpoint !== sub.endpoint);
  list.push({ endpoint: sub.endpoint, keys: sub.keys, label: String(label || "").slice(0, 60), at: new Date().toISOString() });
  await putSet(PUSH_SUBS, list.slice(-10));
}
export async function pushUnsubscribe(endpoint) { await putSet(PUSH_SUBS, (await getSet(PUSH_SUBS, [])).filter((s) => s.endpoint !== endpoint)); }
export async function pushStatus(endpoint) { const l = await getSet(PUSH_SUBS, []); return { devices: l.length, here: !!endpoint && l.some((s) => s.endpoint === endpoint) }; }
export async function sendPush(title, body) {
  const list = await getSet(PUSH_SUBS, []);
  if (!list.length) return false;
  const k = await vapid(); let ok = false; const dead = new Set();
  await Promise.all(list.map(async (s) => {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title, body }), { vapidDetails: { subject: "mailto:money@localhost.invalid", publicKey: k.pub, privateKey: k.priv }, TTL: 86400, timeout: 8000 }); ok = true; }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) dead.add(s.endpoint); }
  }));
  if (dead.size) await putSet(PUSH_SUBS, list.filter((s) => !dead.has(s.endpoint)));
  return ok;
}

// ---------- the phone app's inbox ----------
// The Android app cannot receive web push, so it asks for what is new: every alert is also kept here (the last 50) and the app
// fetches the ones after the last number it saw, from time to time. It counts as a delivery only when an app asked in the last 3 days.
const INBOX = "app_inbox", INBOX_POLL = "app_inbox_poll", INBOX_KEEP = 50, INBOX_ALIVE_MS = 3 * 86400000;
export async function inboxAdd(title, body, priority = "default") {
  const box = await getSet(INBOX, { last: 0, items: [] });
  const id = box.last + 1;
  await putSet(INBOX, { last: id, items: [...box.items, { id, at: new Date().toISOString(), title, body, priority }].slice(-INBOX_KEEP) });
  return id;
}
// since: the last number the app saw, or "latest" to only learn the current number (the first time, so old alerts do not all arrive at once)
export async function inboxRead(since) {
  await putSet(INBOX_POLL, new Date().toISOString());
  const box = await getSet(INBOX, { last: 0, items: [] });
  if (since === "latest") return { last: box.last, items: [] };
  const n = parseInt(since, 10) || 0;
  return { last: box.last, items: box.items.filter((i) => i.id > n) };
}
export async function inboxAlive() {
  const at = await getSet(INBOX_POLL, null);
  return !!at && Date.now() - Date.parse(at) < INBOX_ALIVE_MS;
}

// every alert goes to ntfy and to each channel that is set up
export async function sendNtfy(title, body, priority = "default") {
  const alive = await inboxAlive();
  if (alive) await inboxAdd(title, body, priority);
  const res = await Promise.all([sendNtfyOnly(title, body, priority), sendChannel("telegram", title, body), sendChannel("webhook", title, body), sendPush(title, body)]);
  return alive || res.some(Boolean);
}

// Tell the user once per distinct problem, not at every sync.
export async function notifyOnce(key, title, body, priority) {
  const k = `notified:${key}`;
  if ((await q("SELECT 1 FROM settings WHERE key=$1", [k])).rowCount) return false;
  const ok = await sendNtfy(title, body, priority);
  if (ok) await q("INSERT INTO settings (key,value) VALUES ($1,'true')", [k]);
  return ok;
}
export const clearNotified = (key) => q("DELETE FROM settings WHERE key=$1", [`notified:${key}`]);

// Gaps older than the chosen number of days (default 3) raise a daily reminder.
export async function remindOldGaps() {
  const days = (await q("SELECT value FROM settings WHERE key='cfg'")).rows[0]?.value?.gapDays ?? 3;
  const r = await q(
    `SELECT a.name,a.currency,g.remaining FROM balance_gaps g JOIN accounts a ON a.id=g.account_id
     WHERE g.status='open' AND g.created_at < now() - ($1 || ' days')::interval`, [String(days)]);
  if (!r.rowCount) return 0;
  await sendNtfy("Money · missing money", r.rows.map((g) => `${g.name}: ${g.remaining < 0 ? "money left" : "money arrived"} ${Math.abs(g.remaining)} ${g.currency} with no transaction`).join("\n"), "high");
  return r.rowCount;
}
