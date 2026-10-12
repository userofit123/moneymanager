// Source credentials: stored encrypted, write-only from the browser (never returned), scrubbed from every message.
// Lock-out guard (spec section 9): two failed attempts in a row stop all further attempts until the user unlocks.
import { q, tx } from "./db.js";
import { encrypt, decrypt, scrub } from "./secrets.js";

// Every source the app can connect to. kind: what the account is (bank, card, wallet). `url` is the login page used by "Verify this device".
const F = {
  userCode: { k: "userCode", label: "User code" }, username: { k: "username", label: "Username" }, password: { k: "password", label: "Password" },
  id: { k: "id", label: "ID number" }, num: { k: "num", label: "Account code (מספר סימון)" }, nationalID: { k: "nationalID", label: "ID number" },
  card6: { k: "card6Digits", label: "Last 6 digits of the card" },
};
export const PROVIDERS = {
  wise: { label: "Wise", kind: "wallet", fields: [{ k: "token", label: "Personal API token" }] },
  hapoalim: { label: "Bank Hapoalim", kind: "bank", fields: [F.userCode, F.password] },
  leumi: { label: "Bank Leumi", kind: "bank", fields: [F.username, F.password] },
  discount: { label: "Discount Bank", kind: "bank", fields: [F.id, F.password, F.num] },
  mercantile: { label: "Mercantile Discount", kind: "bank", fields: [F.id, F.password, F.num] },
  mizrahi: { label: "Mizrahi-Tefahot", kind: "bank", fields: [F.username, F.password] },
  otsarHahayal: { label: "Otsar Hahayal", kind: "bank", fields: [F.username, F.password] },
  union: { label: "Union Bank", kind: "bank", fields: [F.username, F.password] },
  beinleumi: { label: "First International Bank", kind: "bank", fields: [F.username, F.password] },
  massad: { label: "Bank Massad", kind: "bank", fields: [F.username, F.password] },
  yahav: { label: "Bank Yahav", kind: "bank", fields: [F.username, F.nationalID, F.password] },
  max: { label: "Max", kind: "card", fields: [F.username, F.password] },
  isracard: { label: "Isracard", kind: "card", fields: [F.id, F.card6, F.password] },
  visaCal: { label: "Visa Cal", kind: "card", fields: [F.username, F.password] },
  amex: { label: "American Express", kind: "card", fields: [F.username, F.card6, F.password] },
};
export const FIELDS = Object.fromEntries(Object.entries(PROVIDERS).map(([k, p]) => [k, p.fields]));
export const LABELS = Object.fromEntries(Object.entries(PROVIDERS).map(([k, p]) => [k, p.label]));
export const KINDS = Object.fromEntries(Object.entries(PROVIDERS).map(([k, p]) => [k, p.kind]));
// A connection id is the provider ("wise") for the first login and "wise~2", "wise~3"... for more logins at the same company.
export const baseOf = (id) => String(id).split("~")[0];
export const validId = (id) => /^[a-z][A-Za-z0-9]*(~\d{1,3})?$/.test(String(id)) && !!PROVIDERS[baseOf(id)] && (!String(id).includes("~") || +String(id).split("~")[1] >= 2);
const LIMIT = (s) => (baseOf(s) === "wise" ? 3 : 2);
const cleanNick = (n) => String(n || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 30);
export async function nicknameOf(id) { return (await q("SELECT nickname FROM source_state WHERE source=$1", [id])).rows[0]?.nickname || ""; }
/** What the app calls this connection's account: "Wise" or "Wise · Business" */
export const connLabel = (id, nick) => PROVIDERS[baseOf(id)].label + (nick ? ` · ${nick}` : "");
export const connName = async (id) => connLabel(id, await nicknameOf(id));

export async function getCreds(source) {
  const r = await q("SELECT data FROM credentials WHERE source=$1", [source]);
  if (r.rowCount) return JSON.parse(decrypt(r.rows[0].data));
  if (source === "wise" && process.env.WISE_TOKEN) return { token: process.env.WISE_TOKEN };
  return null;
}

// A new name for a connection: its accounts (and their transactions) are renamed with it, so nothing is lost.
async function renameAccounts(c, source, from, to) {
  if (from === to) return;
  const like = from.replace(/[\\%_]/g, "\\$&") + " ··%";
  const names = (await c.query("SELECT name FROM accounts WHERE source=$1 AND (name=$2 OR name LIKE $3)", [source, from, like])).rows.map((r) => r.name);
  for (const old of names) {
    const nu = to + old.slice(from.length);
    await c.query("UPDATE accounts SET name=$2 WHERE source=$1 AND name=$3", [source, nu, old]);
    await c.query("UPDATE transactions SET from_name=$2 WHERE from_name=$1", [old, nu]);
    await c.query("UPDATE transactions SET to_name=$2 WHERE to_name=$1", [old, nu]);
    await c.query("UPDATE reconciliation_adjustments SET account=$2 WHERE account=$1", [old, nu]);
  }
}
export async function setNickname(source, nick) {
  if (!validId(source)) throw new Error("unknown source");
  nick = cleanNick(nick);
  if (source.includes("~") && !nick) throw new Error("Give this extra login a nickname so you can tell them apart");
  const old = await connName(source);
  await tx(async (c) => {
    await c.query("INSERT INTO source_state (source,nickname) VALUES ($1,$2) ON CONFLICT (source) DO UPDATE SET nickname=$2", [source, nick]);
    await renameAccounts(c, source, old, connLabel(source, nick));
  });
}

export async function saveCreds(source, input) {
  if (!validId(source)) throw new Error("unknown source");
  if (input && "nickname" in input) await setNickname(source, input.nickname);
  else if (source.includes("~") && !(await nicknameOf(source))) throw new Error("Give this extra login a nickname so you can tell them apart");
  const data = {};
  for (const f of FIELDS[baseOf(source)]) {
    const v = input?.[f.k];
    if (typeof v !== "string" || !v.trim()) throw new Error(`${f.label} is required`);
    data[f.k] = v.trim();
  }
  await q(
    "INSERT INTO credentials (source,data) VALUES ($1,$2) ON CONFLICT (source) DO UPDATE SET data=$2, updated_at=now()",
    [source, encrypt(JSON.stringify(data))]);
  await q("INSERT INTO source_state (source) VALUES ($1) ON CONFLICT (source) DO UPDATE SET consecutive_failures=0, locked=FALSE, last_error='', tested_at=NULL", [source]);
}

export async function removeCreds(source) {
  await q("DELETE FROM credentials WHERE source=$1", [source]);
  // keep the nickname (and so the accounts' names) if this login is added again
  await q("UPDATE source_state SET consecutive_failures=0, locked=FALSE, last_error='', tested_at=NULL, assisted_at=NULL, last_ok_at=NULL WHERE source=$1", [source]);
}

/** The id for one more login at a provider: the first free "provider~N", never one that already has accounts or history */
export async function nextId(provider) {
  if (!PROVIDERS[provider]) throw new Error("unknown source");
  const used = new Set([
    ...(await q("SELECT source FROM credentials")).rows.map((r) => r.source),
    ...(await q("SELECT DISTINCT source FROM accounts")).rows.map((r) => r.source),
    ...(await q("SELECT DISTINCT source FROM transactions")).rows.map((r) => r.source),
  ]);
  for (let n = 2; ; n++) if (!used.has(`${provider}~${n}`)) return `${provider}~${n}`;
}

export async function markAssisted(source) {
  await q("INSERT INTO source_state (source,assisted_at) VALUES ($1,now()) ON CONFLICT (source) DO UPDATE SET assisted_at=now()", [source]);
}

export async function markTested(source) {
  await q("INSERT INTO source_state (source,tested_at) VALUES ($1,now()) ON CONFLICT (source) DO UPDATE SET tested_at=now()", [source]);
}

const DAY = 864e5;
/** One place that decides what to tell the user about a source. tone: gray | yellow | green | red */
export function connectionStatus({ configured, locked, failures, lastError, savedAt, testedAt, syncedAt }, now = Date.now()) {
  const after = (t) => t && (!savedAt || new Date(t) >= new Date(savedAt)); // anything older than the saved credentials does not count
  if (!configured) return { key: "none", label: "No credentials", tone: "gray" };
  if (locked && /^OTP_REQUIRED/.test(lastError || "")) return { key: "otp", label: "Needs a code", tone: "red" };
  if (locked) return { key: "locked", label: "Locked", tone: "red" };
  if (failures > 0) return { key: "failed", label: "Last attempt failed", tone: "red" };
  if (after(syncedAt)) {
    return now - new Date(syncedAt).getTime() > 2 * DAY
      ? { key: "stale", label: "Out of date", tone: "yellow", since: syncedAt }
      : { key: "connected", label: "Connected", tone: "green", since: syncedAt };
  }
  if (after(testedAt)) return { key: "tested", label: "Tested · not synced", tone: "yellow", since: testedAt };
  return { key: "untested", label: "Not tested", tone: "yellow" };
}

export async function listConnections() {
  const [c, st, sy] = await Promise.all([
    q("SELECT source,updated_at FROM credentials"), q("SELECT * FROM source_state"),
    q("SELECT source, max(finished_at) AS at FROM sync_runs WHERE ok GROUP BY source"),
  ]);
  // every provider once (so it can be added), plus each extra login that has saved credentials
  const extras = c.rows.map((r) => r.source).filter((x) => x.includes("~") && validId(x)).sort((a, b) => baseOf(a).localeCompare(baseOf(b)) || +a.split("~")[1] - +b.split("~")[1]);
  const ids = Object.keys(FIELDS).flatMap((p) => [p, ...extras.filter((x) => baseOf(x) === p)]);
  return ids.map((s) => {
    const b = baseOf(s);
    const has = c.rows.find((r) => r.source === s) || (s === "wise" && process.env.WISE_TOKEN ? { updated_at: null } : null);
    const state = st.rows.find((r) => r.source === s);
    const info = {
      configured: !!has, locked: !!state?.locked, failures: state?.consecutive_failures || 0, lastError: state?.last_error || "",
      savedAt: has?.updated_at || null, testedAt: state?.tested_at || null, syncedAt: sy.rows.find((r) => r.source === s)?.at || null,
    };
    return {
      source: s, provider: b, nickname: state?.nickname || "", extra: s.includes("~"), label: connLabel(s, state?.nickname || ""), providerLabel: LABELS[b], kind: KINDS[b], fields: FIELDS[b], ...info, lastOk: state?.last_ok_at || null, assistedAt: state?.assisted_at || null, status: connectionStatus(info),
    };
  });
}

export async function isLocked(source) {
  return (await q("SELECT locked FROM source_state WHERE source=$1", [source])).rows[0]?.locked === true;
}
export async function unlock(source) {
  await q("INSERT INTO source_state (source) VALUES ($1) ON CONFLICT (source) DO UPDATE SET consecutive_failures=0, locked=FALSE", [source]);
}

export async function recordResult(source, ok, error, creds) {
  if (ok) {
    await q("INSERT INTO source_state (source,last_ok_at) VALUES ($1,now()) ON CONFLICT (source) DO UPDATE SET consecutive_failures=0, locked=FALSE, last_ok_at=now(), last_error=''", [source]);
    return false;
  }
  const msg = scrub(error, Object.values(creds || {}));
  const r = await q(
    `INSERT INTO source_state (source,consecutive_failures,last_error) VALUES ($1,1,$2)
     ON CONFLICT (source) DO UPDATE SET consecutive_failures=source_state.consecutive_failures+1, last_error=$2
     RETURNING consecutive_failures`, [source, msg]);
  // a bank asking for a one-time code can never succeed unattended: lock at once so no more codes are sent to your phone
  const locked = /^OTP_REQUIRED/.test(msg) || r.rows[0].consecutive_failures >= LIMIT(source);
  if (locked) await q("UPDATE source_state SET locked=TRUE WHERE source=$1", [source]);
  return locked;
}
