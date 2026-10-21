<script setup>
// The entry window: one transaction, with its details, sections and actions.
// One for the whole app, opened with openTx(id) (core/txwin.js) from Activity, Home, Alerts, Bills, Accounts...
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../../stores/data.js";
import { home } from "../../core/derived.js";
import { now, dayOf } from "../../core/clock.js";
import { request } from "../../core/http.js";
import { toast } from "../../core/toast.js";
import { ask } from "../../core/ask.js";
import { tx as heTx } from "../../core/heText.js";
import { catNames, catColor, catLabel } from "../../core/cats.js";
import { goActivity } from "../../core/shell.js";
import { txOpenId, closeTx, openPop } from "../../core/txwin.js";
import { openDocs } from "../../core/docs.js";
import { run, setCategory, addTags as addTagsAct, cpMark as cpMarkAct, ignOn as ignOnAct } from "../../core/txact.js";
import * as A from "../../lib/txactions.js";
import { allRows, costRows, txChips, amtText, SYM, CHIP_ICON, whyBill, futureTip } from "../../lib/txrows.js";
import { kinds, displayName, duplicateIds, rmOf, instOf, cardOf, detailRows, flat, prettyKey } from "../../lib/activity.js";
import { catJarsOf } from "../../lib/jars.js";
import { fm, f0 } from "../../format.js";
import { dstr } from "../../dates.js";
import { go } from "../../router.js";
import BaseSheet from "../BaseSheet.vue";
import TagEditor from "../TagEditor.vue";

const { t, locale } = useI18n();
const tk = (key, ...a) => t(key, ...a);
const S = computed(() => data.state.value);
const today = computed(() => dayOf(now.value));
const K = computed(() => kinds(S.value || {}, today.value));
const BC = computed(() => home.value?.billsAll || []);
const dup = computed(() => duplicateIds(S.value));
const rows = computed(() => allRows(S.value, BC.value, now.value, today.value));
const cur = computed(() => (txOpenId.value == null ? null : rows.value.find((x) => x.id == txOpenId.value) || null));
const name = (x) => displayName(S.value, x);
const loc = () => (locale.value === "he" ? "he-IL" : "en-GB");
const mname = (m) => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(loc(), { month: "long" });
const mk = (m) => mname(m) + " " + m.slice(0, 4);
const monYr = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x.toLocaleDateString(loc(), { month: "short", year: "numeric" }); };
const nohtml = (s) => String(s ?? "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
const avStyle = (x) => ({ background: `color-mix(in srgb,${catColor(S.value, x.c || "Uncategorized")} 22%,transparent)`, color: catColor(S.value, x.c || "Uncategorized") });
const isXf = (x) => K.value.isXf(x);
const isPos = (x) => x.a > 0 && !isXf(x);
const chips = (x) => txChips(S.value, x, { K: K.value, dup: dup.value, BC: BC.value });
const kindOf = (x) => (isXf(x) ? "transfer" : K.value.isCp(x) ? "cardpay" : x.a > 0 ? "income" : "expense");
const kindCls = (x) => (isXf(x) ? "tf" : K.value.isCp(x) ? "cpm" : x.a > 0 ? "in" : "out");
const cats = computed(() => catNames(S.value).filter((k) => k != "Uncategorized"));
const close = () => closeTx();
// filters from the window start Activity over with only that filter (goCat/goTag)
const goCat = (c) => { close(); goActivity({ cat: c }); };
const goTag = (g) => { close(); goActivity({ tag: g }); };

// ---- what the bank sent (GET /api/transactions/:id/details), once per entry ----
const details = ref({});
watch(cur, (x) => {
  if (!x || details.value[x.id]) return;
  if (!x.hasDet) { details.value = { ...details.value, [x.id]: { details: null } }; return; }
  details.value = { ...details.value, [x.id]: "load" };
  request("/api/transactions/" + x.id + "/details", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((j) => { details.value = { ...details.value, [x.id]: j || { details: null } }; });
}, { immediate: true });
const det = computed(() => (cur.value ? details.value[cur.value.id] : null));
const facts = computed(() => (cur.value ? detailRows(S.value, cur.value, det.value === "load" ? null : det.value) : []));
const rawFields = computed(() => (det.value && det.value !== "load" ? flat(det.value.details || {}).filter(([k]) => k !== "account") : []));
const dateFmt = (d, o) => new Date(d + "T12:00:00").toLocaleDateString(loc(), o);
const factText = (v) => {
  if (v && typeof v === "object") {
    if (v.date) return dateFmt(v.date, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
    if (v.key) return tk("activity.d." + v.key);
    if (v.amtDir != null) return (v.amtDir < 0 ? "−" : "") + "₪" + f0(v.amtDir) + " " + (v.amtDir < 0 ? t("activity.d.amtOut") : t("activity.d.amtIn"));
    if (v.inst) return v.inst.total > v.inst.n ? t("activity.d.instRowLeft", { n: v.inst.n, total: v.inst.total, rest: v.inst.total - v.inst.n }) : t("activity.d.instRowLast", { n: v.inst.n, total: v.inst.total });
  }
  return v;
};

// ---- which sections are open (kept while the same entry stays open, like TXSTATE) ----
const sec = ref({});
watch(txOpenId, (a, b) => { if (a !== b) sec.value = {}; });
const toggleSec = (key, ev) => { sec.value = { ...sec.value, [key]: ev.target.open }; };

// ---- name, category, tags, note ----
const setName = (x, v) => run(A.setName, x.id, v);
const setCat = (x, v) => setCategory(x.id, v);
const setNote = (x, v) => run(A.setField, x.id, "note", v);
// the tags (TagEditor gives them already spelled like the tags in use); a tag rule is offered afterwards
const addTags = (x, list) => { const add = list.filter((g) => g && !(x.tags || []).includes(g)); if (add.length) addTagsAct(x.id, add); };
const removeTag = (x, g) => run(A.removeTag, x.id, g);

// ---- "How it's counted" and "Actions" (relH and tiles in openTx) ----
const TIC = { hist: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', bill: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>', rep: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5"/>', jar: '<path d="M8 3h8M9 3v3M15 3v3M6 6h12v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/>', card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>', off: '<path d="M3 3l18 18M10.6 6.2A9.5 9.5 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.7M6.3 6.3C3.8 8 2 12 2 12s4 6 10 6a9 9 0 0 0 3.5-.7"/>', swap: '<path d="M7 4v16M7 4L4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3"/>', warn: '<path d="M12 3l10 18H2zM12 10v5M12 18v.01"/>', cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', clip: '<path d="M20 11l-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7"/>', inst: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h4M7 14h2"/>', twin: '<path d="M4 7h16M4 12h10M4 17h7"/><path d="M17 14l3 3-3 3"/>' };
const sameStore = (x) => { const key = String(x.desc || "").trim().toLowerCase(); return key ? (S.value?.tx || []).filter((y) => !y.virtual && (y.a < 0) === (x.a < 0) && String(y.desc || "").trim().toLowerCase() === key) : []; };
const pairOf = (x) => (S.value?.xf || []).find((p) => p.st !== "rej" && (p.o === x.id || p.i === x.id));
const openJars = computed(() => (S.value?.jars || []).filter((j) => !j.done).sort((a, b) => a.p - b.p));
// a change that is asked about first (the "Are you sure?" box)
const confirmDo = (q, text, fn, o) => ask(q, text, fn, o);
const histOf = (x) => { const b = A.billOf(x, BC.value); if (b) openPop("hist", { title: b.n, rows: billRows(b), sub: t("txw.w.regBill"), q: b.n }); else openPop("hist", { title: name(x), rows: sameStore(x), sub: t("txw.w.allPay"), q: name(x) }); };
const billRows = (b) => (home.value?.rows || []).filter((y) => y.a < 0 && !y.virtual && (b.mode == "once" ? (b.ids || []).includes(y.id) : (y.desc + " " + y.to).toLowerCase().includes(b.match)));
const rels = computed(() => {
  const x = cur.value; if (!x) return [];
  const k = K.value, out = [], real = !x.virtual, xf = isXf(x), pair = xf ? pairOf(x) : null, b = A.billOf(x, BC.value), cp = k.isCp(x), ov = S.value.ccOverride?.[x.id], ign = k.isIgn(x), tw = !ign && real && !xf && A.refundTwin(S.value, x);
  const add = (ic, title, text, btns, cls) => out.push({ ic, title, text, btns, cls });
  const i = instOf(x);
  if (i && x.a < 0) { const left = i.total - i.n; add("inst", t("activity.w.instTitle", { n: i.n, total: i.total }), left > 0 ? t("activity.w.instLeft", { left, amt: fm(left * Math.abs(x.a)), when: monYr(x.d, left) }, left) : t("activity.w.instDone")); }
  { const aj = x.jar && S.value.jars.find((j) => j.id == x.jar.id), done = aj?.done ? t("txw.w.done") : "";
    if (aj) add("jar", x.jar.auto ? t("txw.w.jarAutoT") : t("txw.w.jarT"), x.jar.auto ? t("txw.w.jarAuto", { amt: fm(x.jar.amt), jar: aj.n, done, cat: catLabel(x.c) }) : t("txw.w.jarText", { amt: fm(x.jar.amt), jar: aj.n, done }), [{ label: t("txw.w.change"), run: () => openPop("jar", { id: x.id }) }, { label: t("txw.w.detach"), run: () => confirmDo(t("txw.w.detachQ"), t("txw.w.detachText"), () => run(A.jarDetach, x.id)) }]);
    else { const c = !x.jar && x.c && x.jarNo === x.c && catJarsOf(S.value)[x.c]; if (c) add("jar", t("txw.w.notJarT"), t("txw.w.notJar", { cat: catLabel(x.c), jar: c.j.n }), [{ label: t("txw.w.takeJar"), run: () => openPop("jar", { id: x.id, jar: c.j.id }) }]); } }
  if (b) add("rep", t("txw.w.billT"), whyBill(b), [{ label: t("txw.w.viewBills"), run: () => { close(); go("/bills"); } }, { label: t("txw.w.payHist"), run: () => histOf(x) }, ...(b.once ? [{ label: t("txw.w.unbill"), run: () => confirmDo(t("txw.w.unbillQ"), t("txw.w.unbillText"), () => { close(); run(A.billUnmark, x.id); }) }] : [])]);
  if (!b && real && !xf && sameStore(x).length > 1) add("hist", t("activity.w.before"), t("activity.w.beforeText", { n: sameStore(x).length }), [{ label: t("activity.w.beforeBtn", { n: sameStore(x).length }), run: () => histOf(x) }]);
  if (k.isFut(x)) add("cal", t("activity.upcoming"), futureTip(S.value, x));
  if (rmOf(x) && real) add("cal", t("activity.w.movedTitle"), t("activity.w.movedText", { d: dstr(x.d), m: mk(rmOf(x)) }), [{ label: t("activity.w.mChange"), run: () => openPop("month", { id: x.id }) }, { label: t("activity.w.mResetBtn"), run: () => confirmDo(t("activity.w.mResetQ"), t("activity.w.mResetText"), () => { close(); if (!run(A.moReset, x.id).err) toast(t("activity.w.mBack")); }) }], "amber");
  if (ign) add("off", t("activity.d.ignTitle"), t("activity.d.ignText"), [{ label: t("activity.d.ignOff"), run: () => confirmDo(t("activity.d.ignOffQ"), t("activity.d.ignOffText"), () => { close(); run(A.ignOff, x.id); }) }]);
  if (tw) { const card = S.value.accounts.find((a) => a.n == x.to)?.kind == "card", w1 = card ? t("txw.w.onCard") : t("txw.w.inBank"), w2 = card ? t("txw.w.inBank") : t("txw.w.onCard");
    add("twin", t("txw.w.twinT"), t("txw.w.twin", { amt: fm(x.a), w1, d1: dstr(x.d), w2, d2: dstr(tw.d), name: name(tw) }), [{ label: t("txw.w.ignCard"), cls: "f", run: () => confirmDo(t("txw.w.ignCardQ"), t("activity.d.ignOnText"), () => { close(); ignOnAct(card ? x.id : tw.id); }) }, { label: t("txw.w.ignBank"), run: () => confirmDo(t("txw.w.ignBankQ"), t("activity.d.ignOnText"), () => { close(); ignOnAct(card ? tw.id : x.id); }) }], "amber"); }
  if (cp) add("card", t("activity.type.cardpay"), cardOf(x, k.ci) ? t("activity.d.cpText", { card: cardOf(x, k.ci) }) : t("activity.d.cpTextAny"), [{ label: t("activity.d.cpCount"), run: () => confirmDo(t("activity.d.cpCountQ"), t("activity.d.cpCountText"), () => { close(); run(A.cpCount, x.id); }) }]);
  else if (ov) add("card", t("activity.d.counted1"), t("activity.d.counted1Text"), [{ label: t("activity.d.cpUncount"), run: () => confirmDo(t("activity.d.cpUncountQ"), t("activity.d.cpUncountText"), () => { close(); run(A.cpUncount, x.id); }) }]);
  if (pair) { const cx = costRows(S.value).find((r) => r.id == "v" + pair.o); add("swap", t("activity.type.transfer"), t("activity.w.xfText", { cost: cx ? t("activity.w.xfCost", { amt: fm(cx.cost) }) : t("activity.w.xfNoCost") }), [{ label: t("activity.r.notXf"), run: () => confirmDo(t("activity.d.xfNoQ"), t("activity.d.xfNoText"), () => { close(); run(A.xfNo, pair.o); }) }]); }
  if (dup.value.has(x.id)) add("warn", t("activity.d.dupTitle"), t("activity.d.dupText"), [{ label: t("activity.r.dupDel"), cls: "r", run: () => confirmDo(t("activity.d.dupDelQ"), t("activity.d.dupDelText"), () => { close(); run(A.dupDel, x.id); }, { danger: true }) }, { label: t("activity.r.dupKeep"), run: () => confirmDo(t("activity.d.dupKeepQ"), t("activity.d.dupKeepText"), () => { close(); run(A.dupKeep, x.id); }) }], "amber");
  return out;
});
const tiles = computed(() => {
  const x = cur.value; if (!x) return [];
  const k = K.value, real = !x.virtual, xf = isXf(x), cp = k.isCp(x), ign = k.isIgn(x), canMark = x.a < 0 && real && !xf && !cp, b = A.billOf(x, BC.value), tw = !ign && real && !xf && A.refundTwin(S.value, x), out = [];
  const sg = canMark && !x.jar && openJars.value.length ? A.jarSuggest(S.value, x, catJarsOf(S.value)) : null;
  if (canMark && !b) out.push({ ic: "bill", title: t("txw.w.billTile"), sub: t("txw.w.billTileS"), run: () => openPop("bill", { id: x.id }) });
  if (canMark && !x.jar && openJars.value.length) out.push({ ic: "jar", title: t("txw.w.jarTile"), sub: sg ? t("txw.w.jarLooks", { n: sg.n }) : t("txw.w.jarTileS"), hot: !!sg, run: () => openPop("jar", { id: x.id, jar: sg?.id || 0 }) });
  if (canMark) out.push({ ic: "card", title: t("activity.d.cpMark"), sub: t("activity.w.tCpSub"), run: () => confirmDo(t("activity.d.cpMarkQ"), t("activity.d.cpMarkText"), () => { close(); cpMarkAct(x.id); }) });
  if (real && !xf && !cp && !ign) out.push({ ic: "cal", title: t("activity.w.mTile"), sub: rmOf(x) ? t("activity.w.mTileIn", { m: mk(rmOf(x)) }) : t("activity.w.mTileSub"), run: () => openPop("month", { id: x.id }) });
  if (real && !xf && !cp && !ign && !tw) out.push({ ic: "off", title: t("activity.d.ignOn"), sub: t("activity.w.tIgnSub"), run: () => confirmDo(t("activity.d.ignOnQ"), t("activity.d.ignOnText"), () => { close(); ignOnAct(x.id); }) });
  return out;
});

// ---- documents ----
async function attach(e) {
  const x = cur.value, files = [...e.target.files]; e.target.value = "";
  if (!x || !files.length) return;
  try {
    const ups = [];
    for (const fl of files) ups.push(await data.api(`/api/transactions/${x.id}/documents`, { method: "POST", headers: { "x-filename": encodeURIComponent(fl.name), "content-type": fl.type || "application/octet-stream" }, body: fl }));
    data.change((S) => { const t2 = S.tx.find((y) => y.id == x.id); if (!t2) return false; t2.docs = [...(t2.docs || []), ...ups.map((u) => u.filename)]; t2.docIds = [...(t2.docIds || []), ...ups.map((u) => u.id)]; t2.docHas = [...(t2.docHas || []), ...ups.map(() => true)]; return [["Attached document", x.desc + ": " + ups.map((u) => u.filename).join(", ")]]; });
  } catch { toast(t("activity.w.uploadFail"), { kind: "err" }); }
}

// ---- change history (the last six that touched this entry) ----
const changes = computed(() => (cur.value ? (S.value?.audit || []).filter((a) => (a.undo && a.undo.id == cur.value.id) || (a.detail || "").startsWith(cur.value.desc)).slice(0, 6) : []));
const when = (x) => new Date(x).toLocaleString(loc(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// ---- Copy details ----
function copyDetails() {
  const x = cur.value; if (!x) return;
  const L = [name(x) + "  " + (x.a < 0 ? "−" : "+") + "₪" + f0(x.a), dateFmt(String(x.d).slice(0, 10), { weekday: "short", day: "numeric", month: "long", year: "numeric" }) + (x.from && x.to ? " · " + x.from + " → " + x.to : "")];
  const kv = facts.value.map((r) => tk("activity.d." + r.k) + ": " + factText(r.v)); if (kv.length) L.push("", ...kv);
  const raw = rawFields.value.map(([a, b]) => prettyKey(a) + ": " + b); if (raw.length) L.push("", x.src == "wise" ? t("txw.w.allWise") : t("txw.w.allBank"), ...raw);
  if (x.note) L.push("", t("txw.w.noteC", { n: x.note }));
  const txt = L.join("\n"), done = () => toast(t("activity.d.copied"));
  const fallback = () => { const a = document.createElement("textarea"); a.value = txt; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); done(); } catch { /* not allowed */ } a.remove(); };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
}
</script>

<template>
  <BaseSheet :open="!!cur" cls="txw" @close="close">
    <div class="txp">
      <div class="txgrid2">
        <div class="txmain">
          <div class="txh2"><span class="av" :style="avStyle(cur)">{{ (name(cur) || "?")[0] }}</span>
            <div class="tt"><h3>{{ name(cur) }}</h3><div class="sm">{{ dstr(cur.d) }}{{ cur.from && cur.to ? " · " + nohtml(cur.from) + " → " + nohtml(cur.to) : cur.from || cur.to ? " · " + nohtml(cur.from || cur.to) : "" }}</div></div>
            <div class="txam"><b class="num" :class="{ pos: isPos(cur) }" dir="ltr">{{ amtText(cur) }}</b><div v-if="cur.orig" class="sm" dir="ltr">{{ SYM[cur.orig.cur] || "" }}{{ f0(cur.orig.amt) }} {{ cur.orig.cur }}</div></div>
          </div>
          <div class="txchips"><span class="tb" :class="kindCls(cur)">{{ tk("activity.d.kind." + kindOf(cur)) }}</span>
            <span v-if="!cur.virtual && !isXf(cur) && cur.c" class="chip catl" @click="goCat(cur.c)"><span class="dot" :style="{ background: catColor(S, cur.c) }"></span>{{ catLabel(cur.c) }}</span>
            <template v-for="c in chips(cur)" :key="c.cls"><span class="bd pc" :class="c.cls" :data-tip="c.tip"><svg v-if="c.icon" class="pi" viewBox="0 0 24 24" v-html="CHIP_ICON[c.icon]"></svg>{{ c.label }}</span> </template>
            <span v-for="g in cur.tags || []" :key="g" class="tag catl" @click="goTag(g)">{{ g }}</span></div>
          <div id="txDet" class="kvc">
            <div class="kv"><div v-for="r in facts" :key="r.k" class="kvr"><span class="k">{{ tk("activity.d." + r.k) }}</span><span class="v" :class="{ mono: r.mono }" :data-tip="String(factText(r.v))">{{ factText(r.v) }}</span></div></div>
            <details v-if="rawFields.length" class="kvd"><summary><span>{{ t(cur.src === "wise" ? "activity.d.allWise" : "activity.d.allBank") }}</span><em>{{ rawFields.length }}</em></summary><div v-for="[a, b] in rawFields" :key="a" class="kvr"><span class="k">{{ prettyKey(a) }}</span><span class="v" :data-tip="String(b).slice(0, 600)">{{ b }}</span></div></details>
            <div v-if="det === 'load'" class="kvn"><i class="spinner"></i> {{ t("activity.d.loading") }}</div>
            <div v-else-if="!cur.virtual && (!det || (cur.src !== 'manual' && !det.details))" class="kvn">{{ cur.src === "manual" ? t("activity.d.manual") : t("activity.d.old") }}</div>
          </div>
        </div>
        <aside class="txside">
          <details v-if="!cur.virtual && !isXf(cur)" class="txs2" data-s="org" :open="!!sec.org" @toggle="toggleSec('org', $event)"><summary><span class="sct">{{ t("activity.d.organise") }}</span></summary><div class="sbd">
            <div class="fld"><label>{{ t("activity.d.displayName") }}</label><div style="display:flex;gap:6px"><input :value="S.cfg?.renames?.[cur.id] || ''" :placeholder="name(cur)" maxlength="80" style="flex:1;min-width:0" @change="setName(cur, $event.target.value)" /><button type="button" class="btn o s" @click="openPop('nameRule', { id: cur.id })">{{ t("activity.w.nrRule") }}</button></div></div>
            <div class="two"><div class="fld"><label>{{ t("activity.category") }}</label><select :value="cur.c && cur.c !== 'Uncategorized' ? cur.c : ''" @change="setCat(cur, $event.target.value)"><option value="">{{ t("activity.uncategorized") }}</option><option v-for="c in cats" :key="c" :value="c">{{ catLabel(c) }}</option></select></div>
              <div class="fld"><label>{{ t("activity.w.tags") }}</label><TagEditor :tags="cur.tags || []" @add="(L) => addTags(cur, L)" @remove="(i) => removeTag(cur, cur.tags[i])" @go="goTag" /></div></div>
          </div></details>
          <details v-if="!cur.virtual" class="txs2" data-s="note" :open="!!sec.note" @toggle="toggleSec('note', $event)"><summary><span class="sct">{{ t("activity.d.note") }}</span><em v-if="cur.note && !isXf(cur)">{{ t("activity.w.added") }}</em></summary><div class="sbd"><div class="fld"><label>{{ t("activity.d.note") }}</label><textarea rows="2" :placeholder="t('activity.d.notePh')" :value="cur.note || ''" @change="setNote(cur, $event.target.value)" /></div></div></details>
          <details v-if="rels.length" class="txs2" data-s="rel" :open="!!sec.rel" @toggle="toggleSec('rel', $event)"><summary><span class="sct">{{ t("activity.d.counted") }}</span><i v-if="rels.some((r) => r.cls === 'amber')" class="tfl" :data-tip="t('activity.w.needsLook')"></i><em>{{ rels.length }}</em></summary><div class="sbd"><div class="rels">
            <div v-for="r in rels" :key="r.title + r.ic" class="rel" :class="r.cls"><span class="ri"><svg viewBox="0 0 24 24" v-html="TIC[r.ic]"></svg></span><div class="rb"><b>{{ r.title }}</b><div v-if="r.text" class="sm">{{ r.text }}</div><div v-if="r.btns" class="ra"><button v-for="b in r.btns" :key="b.label" type="button" class="btn s" :class="b.cls === 'f' ? '' : b.cls || 'o'" @click="b.run()">{{ b.label }}</button></div></div></div>
          </div></div></details>
          <details v-if="tiles.length" class="txs2" data-s="act" :open="!!sec.act" @toggle="toggleSec('act', $event)"><summary><span class="sct">{{ t("activity.d.actions") }}</span><em>{{ tiles.length }}</em></summary><div class="sbd"><div class="tiles">
            <button v-for="x in tiles" :key="x.title" type="button" class="atile" :class="{ hot: x.hot }" @click="x.run()"><span class="ri"><svg viewBox="0 0 24 24" v-html="TIC[x.ic]"></svg></span><span class="at"><b>{{ x.title }}</b><small>{{ x.sub }}</small></span></button>
          </div></div></details>
          <details v-if="!cur.virtual && cur.docs && cur.docs.length" class="txs2" data-s="doc" :open="!!sec.doc" @toggle="toggleSec('doc', $event)"><summary><span class="sct">{{ t("activity.w.docs") }}</span><em>{{ cur.docs.length }}</em></summary><div class="sbd"><div class="docrow"><button v-for="(d, i) in cur.docs" :key="i" type="button" class="chip dchip" @click="openDocs(cur.id, i)"><svg viewBox="0 0 24 24" v-html="TIC.clip"></svg>{{ d }}</button></div></div></details>
          <details v-if="changes.length" class="txs2" data-s="hist" :open="!!sec.hist" @toggle="toggleSec('hist', $event)"><summary><span class="sct">{{ t("activity.d.history") }}</span><em>{{ changes.length }}</em></summary><div class="sbd"><div class="hlist"><div v-for="a in changes" :key="a.t + a.action + a.detail" class="hrow"><div class="hh"><b>{{ heTx(a.action) }}</b><span class="hw">{{ when(a.t) }}</span></div><div class="hdt">{{ heTx(nohtml(a.detail || "")) }}</div></div></div></div></details>
        </aside>
      </div>
      <div class="txfoot"><button type="button" class="btn o" @click="copyDetails">{{ t("activity.d.copy") }}</button>
        <label v-if="!cur.virtual" class="btn o upl" style="margin-inline-end:auto"><svg viewBox="0 0 24 24" v-html="TIC.clip"></svg> {{ t("activity.w.attach") }}<input type="file" accept="image/*,application/pdf" multiple hidden @change="attach($event)" /></label><span v-else style="margin-inline-end:auto"></span>
        <button type="button" class="btn" @click="close">{{ t("activity.d.done") }}</button></div>
    </div>
  </BaseSheet>
</template>
