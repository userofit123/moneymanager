// Source credentials: stored encrypted, write-only from the browser (never returned), scrubbed from every message.
// Lock-out guard (spec section 9): two failed attempts in a row stop all further attempts until the user unlocks.
import { q } from "./db.js";
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
const LIMIT = (s) => (s === "wise" ? 3 : 2);

export async function getCreds(source) {
  const r = await q("SELECT data FROM credentials WHERE source=$1", [source]);
  if (r.rowCount) return JSON.parse(decrypt(r.rows[0].data));
  if (source === "wise" && process.env.WISE_TOKEN) return { token: process.env.WISE_TOKEN };
  return null;
}

export async function saveCreds(source, input) {
  if (!FIELDS[source]) throw new Error("unknown source");
  const data = {};
  for (const f of FIELDS[source]) {
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
  await q("DELETE FROM source_state WHERE source=$1", [source]);
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
  return Object.keys(FIELDS).map((s) => {
    const has = c.rows.find((r) => r.source === s) || (s === "wise" && process.env.WISE_TOKEN ? { updated_at: null } : null);
    const state = st.rows.find((r) => r.source === s);
    const info = {
      configured: !!has, locked: !!state?.locked, failures: state?.consecutive_failures || 0, lastError: state?.last_error || "",
      savedAt: has?.updated_at || null, testedAt: state?.tested_at || null, syncedAt: sy.rows.find((r) => r.source === s)?.at || null,
    };
    return {
      source: s, label: LABELS[s], kind: KINDS[s], fields: FIELDS[s], ...info, lastOk: state?.last_ok_at || null, assistedAt: state?.assisted_at || null, status: connectionStatus(info),
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
