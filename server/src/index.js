import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate, q } from "./db.js";
import { ensureDefaults, getState, putState, StaleError } from "./state.js";
import { ratesSummary, refreshRates, rateOn } from "./fx.js";
import { recordGap } from "./gaps.js";
import { syncSource, syncAll, SOURCE_NAMES, startScheduler, snapshotNetWorth } from "./sync.js";
import { saveDoc, readDoc } from "./docs.js";
import { ingest } from "./sources/ingest.js";
import { parseWiseCsv } from "./sources/csv.js";
import { seedDemo } from "./seed.js";

const WEB = process.env.WEB_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "web");
const app = express();
app.disable("x-powered-by");

const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => { console.error(req.method, req.path, e.message); res.status(500).json({ error: e.message }); });

app.get("/healthz", wrap(async (_req, res) => { await q("SELECT 1"); res.json({ ok: true }); }));

app.get("/api/state", wrap(async (_req, res) => { res.set("Cache-Control", "no-store"); res.json(await getState()); }));
app.put("/api/state", express.json({ limit: "20mb" }), wrap(async (req, res) => {
  try { res.json(await putState(req.body)); }
  catch (e) { if (e instanceof StaleError) return res.status(409).json({ error: "stale", state: await getState() }); throw e; }
}));

app.get("/api/fx/rate", wrap(async (req, res) => res.json({ rate: await rateOn(String(req.query.cur || "ILS"), String(req.query.date || new Date().toISOString().slice(0, 10))) })));
app.get("/api/fx", wrap(async (_req, res) => res.json(await ratesSummary(30))));
app.post("/api/fx/refresh", wrap(async (_req, res) => res.json({ rows: await refreshRates() })));

app.post("/api/sync", wrap(async (_req, res) => res.json(await syncAll())));
app.post("/api/sync/:source", wrap(async (req, res) => {
  if (!SOURCE_NAMES.includes(req.params.source)) return res.status(404).json({ error: "unknown source" });
  res.json(await syncSource(req.params.source));
}));

// Wise statement CSV: matched against open gaps and hand-entered rows
app.post("/api/import/wise-csv", express.text({ type: "*/*", limit: "10mb" }), wrap(async (req, res) => {
  const rows = parseWiseCsv(req.body);
  const byCur = {};
  rows.forEach((r) => (byCur[r.currency] ||= []).push(r));
  const out = {};
  for (const [cur, list] of Object.entries(byCur)) {
    await q("INSERT INTO accounts (name,currency,kind,source,subtitle,sort) VALUES ('Wise',$1,'wallet','wise',$2,50) ON CONFLICT (name,currency) DO NOTHING", [cur, `${cur} balance`]);
    out[cur] = await ingest({ name: "Wise", currency: cur, source: "wise" }, list, { mergeManual: true });
  }
  res.json(out);
}));

// Documents
app.post("/api/transactions/:id/documents", express.raw({ type: "*/*", limit: "25mb" }), wrap(async (req, res) => {
  const name = decodeURIComponent(req.get("x-filename") || "file");
  const d = await saveDoc(+req.params.id, name, req.get("content-type") || "application/octet-stream", req.body);
  res.json(d);
}));
app.get("/api/documents/:id", wrap(async (req, res) => {
  const d = await readDoc(+req.params.id);
  if (!d) return res.status(404).end();
  res.set("Content-Type", d.mime).set("Content-Disposition", `inline; filename="${encodeURIComponent(d.filename)}"`).sendFile(d.file);
}));

app.post("/api/gaps/:id/:action", express.json(), wrap(async (req, res) => {
  const r = await recordGap(+req.params.id, req.params.action, req.body || {});
  if (!r) return res.status(404).json({ error: "no such open gap" });
  res.json(r);
}));
app.post("/api/networth/snapshot", wrap(async (_req, res) => { await snapshotNetWorth(); res.json({ ok: true }); }));
if (process.env.ALLOW_DEMO_SEED === "1") app.post("/api/demo/seed", wrap(async (_req, res) => res.json(await seedDemo())));

// Front end: the page and service worker must never be cached
app.use((req, res, next) => {
  if (req.path === "/" || req.path.endsWith(".html") || req.path === "/sw.js") res.set("Cache-Control", req.path === "/sw.js" ? "no-store" : "no-cache");
  next();
});
app.use(express.static(WEB, { extensions: ["html"] }));

const port = +process.env.PORT || 8080;
migrate().then(ensureDefaults).then(() => {
  app.listen(port, () => console.log("money manager on :" + port));
  if (process.env.SCHEDULER !== "0") startScheduler();
  refreshRates().catch((e) => console.error("rates:", e.message));
}).catch((e) => { console.error("startup failed:", e); process.exit(1); });
