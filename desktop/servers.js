// The servers this app can open: "This computer" (its own database inside the app) and any number of Money Manager servers elsewhere.
// Kept in servers.json in the app's data folder. Nothing here touches a server's data: the list only says which one the window shows.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const LOCAL = "local";
const file = (dir) => path.join(dir, "servers.json");

// "money.home", "192.168.1.5:8080" or "https://money.example.com/" → "https://money.home" (just the address; https unless told otherwise)
function normalizeUrl(input) {
  let s = String(input || "").trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = "https://" + s;
  let u; try { u = new URL(s); } catch { return null; }
  if (!/^https?:$/.test(u.protocol) || !u.hostname) return null;
  return u.origin;
}

const empty = () => ({ v: 1, active: null, list: [] });

function load(dir) {
  try {
    const j = JSON.parse(fs.readFileSync(file(dir), "utf8"));
    const list = (Array.isArray(j.list) ? j.list : []).filter((x) => x && x.id && normalizeUrl(x.url)).map((x) => ({ id: String(x.id), name: String(x.name || x.url).slice(0, 60), url: normalizeUrl(x.url), trust: typeof x.trust === "string" ? x.trust : "" }));
    const active = j.active === LOCAL || list.some((x) => x.id === j.active) ? j.active : null;
    return { v: 1, active, list };
  } catch { return empty(); }
}

function save(dir, state) {
  fs.mkdirSync(dir, { recursive: true });
  const tmp = file(dir) + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file(dir));
}

// Each function gives back a new state (or throws a short message the window shows).
function add(state, { name, url }) {
  const u = normalizeUrl(url);
  if (!u) throw new Error("badAddress");
  if (state.list.some((x) => x.url === u)) throw new Error("already");
  const host = new URL(u).host;
  return { ...state, list: [...state.list, { id: "s" + crypto.randomBytes(4).toString("hex"), name: String(name || "").trim().slice(0, 60) || host, url: u, trust: "" }] };
}
function remove(state, id) {
  const list = state.list.filter((x) => x.id !== id);
  return { ...state, list, active: state.active === id ? null : state.active };
}
function use(state, id) {
  if (id !== LOCAL && !state.list.some((x) => x.id === id)) throw new Error("unknown");
  return { ...state, active: id };
}
function trust(state, id, fingerprint) {
  return { ...state, list: state.list.map((x) => (x.id === id ? { ...x, trust: String(fingerprint || "") } : x)) };
}
const current = (state) => (state.active && state.active !== LOCAL ? state.list.find((x) => x.id === state.active) || null : null);

module.exports = { LOCAL, normalizeUrl, load, save, add, remove, use, trust, current };
