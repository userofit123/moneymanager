<script setup>
// Recap: a calm page that tells you how the month is going, step by step:
// parts that change with the time of the month, with pictures, links, day tooltips and a scroll animation.
// The numbers come from lib/recap.js. The page is drawn as one piece of markup, so its scroll code can work on it as a whole;
// every word comes from the language files (locales/pages/recap.*.json). The page has no title band.
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { data } from "../stores/data.js";
import { home, jars as jarsM } from "../core/derived.js";
import { now } from "../core/clock.js";
import { goActivity } from "../core/shell.js";
import { openTx } from "../core/txwin.js";
import { toast } from "../core/toast.js";
import { readPref, writePref } from "../core/prefs.js";
import { i18n } from "../i18n.js";
import { gen } from "../core/heText.js";
import { go } from "../router.js";
import { f0, fm } from "../format.js";
import { nameOf, rdOf } from "../lib/home.js";
import { billTx0 } from "../lib/bills.js";
import { jarCtx, releaseJars } from "../lib/jars.js";
import { recapModel, recapParts, dayBarHeights, hasStart } from "../lib/recap.js";
import BaseDialog from "../components/BaseDialog.vue";

const { t, locale } = useI18n();
const S = computed(() => data.state.value);
onMounted(() => { data.start(); });

// The greeting moves one step along its list every time the app opens (kept in this browser as "moneyGreet").
const SEED = (() => { let n = 1; try { n = (parseInt(readPref("moneyGreet"), 10) || 0) + 1; writePref("moneyGreet", String(n)); } catch { /* not kept */ } return n; })();

// Hebrew follows the profile's gender (gen() in core/heText.js; its rules are loaded only for Hebrew).
const H = () => locale.value === "he";
const G = (s) => (H() ? gen(s) : s);
const L = (k, p, n) => G(n == null ? t("recap." + k, p || {}) : t("recap." + k, p || {}, n));

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const mn = (n) => `<bdi class="rkc">${n < 0 ? "−" : ""}<small>₪</small><span class="cnt" data-v="${Math.round(Math.abs(n))}">${f0(n)}</span></bdi>`;
const mi = (n) => `<bdi class="rkc">${n < 0 ? "−" : ""}₪${f0(n)}</bdi>`;
const nm = (x) => `<bdi>${esc(x)}</bdi>`;
const loc = () => (H() ? "he-IL" : "en-GB");
const dobj = (d) => new Date(String(d).slice(0, 10) + "T12:00:00");
const dlong = (d) => dobj(d).toLocaleDateString(loc(), { day: "numeric", month: "long" });
const dshort = (d) => dobj(d).toLocaleDateString(loc(), { day: "numeric", month: "short" });
const dday = (d) => dobj(d).toLocaleDateString(loc(), { weekday: "short" });
const dfull = (d) => dobj(d).toLocaleDateString(loc(), { weekday: "long", day: "numeric", month: "long" });
const mname = (k) => new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1).toLocaleDateString(loc(), { month: "long" });
const catN = (c) => { const x = i18n.global.t("catn." + c); return x === "catn." + c ? c : x; };
const p2 = (n) => String(n).padStart(2, "0");
const ICON = {
  flag: '<path d="M4 22V15"/><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>',
  in: '<path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 16 6 6"/><circle cx="16" cy="9" r="2.9"/><circle cx="6" cy="5" r="3"/>',
  out: '<path d="M16 10a4 4 0 0 1-8 0"/><path d="M3.1 6h17.8"/><path d="M3.4 5.5a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.7a2 2 0 0 0-.4-1.2l-2-2.7A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  ahead: '<path d="M16 14v2.2l1.6 1"/><path d="M16 2v4"/><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M3 10h5"/><path d="M8 2v4"/><circle cx="16" cy="16" r="6"/>',
  pie: '<path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  path: '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
  good: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  warn: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
};

// ---- the pieces of markup (tiles, chips, links, sums, bars …) ----
const tile = (ic, tone) => `<div class="rki ${tone || ""}"><svg viewBox="0 0 24 24">${ICON[ic]}</svg></div>`;
const pc = (z) => (z % 2 ? "var(--acc2)" : "var(--acc)");
// zz: the part's place in the zig-zag chain (0: a plain part at the top)
function part(zz, ic, tone, label, goK, big, line, vis) {
  const lab = goK ? `<a class="rkl" data-a="recapGo" data-k="${goK}">${label}<i>${H() ? "←" : "→"}</i></a>` : `<span class="rkl">${label}</span>`;
  if (zz) {
    const a = zz % 2, gid = "rkg" + zz, x0 = a ? 52 : 128, x1 = a ? 128 : 52;
    return `<section class="rk rr z ${a ? "za" : "zb"}" style="--pa:${pc(zz - 1)};--pb:${pc(zz)}"><div class="rkni"><div class="rkcir">${tile(ic, tone)}</div><svg class="rkcn cs" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--pa)"/><stop offset="1" style="stop-color:var(--pb)"/></linearGradient></defs><path d="M${x0} 0C${x0} 60 ${x1} 40 ${x1} 100" pathLength="1" stroke="url(#${gid})"/></svg><svg class="rkcn cm" viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true"><path d="M5 0V100" pathLength="1" style="stroke:var(--pa)"/></svg></div><div class="rkb"><div class="rkx">${lab}<div class="rkn">${big}</div>${line ? `<div class="rkp">${line}</div>` : ""}</div>${vis ? `<div class="rkvv">${vis}</div>` : ""}</div></section>`;
  }
  return `<section class="rk rr ${tone || ""}">${tile(ic, tone)}${lab}<div class="rkn">${big}</div>${line ? `<div class="rkp">${line}</div>` : ""}${vis || ""}</section>`;
}
const chip = (txt, tone, goK) => `<${goK ? "a" : "div"} class="rkch ${tone || ""}" ${goK ? `data-a="recapGo" data-k="${esc(goK)}"` : ""}><i class="cp"><svg viewBox="0 0 24 24">${ICON[tone == "good" ? "good" : tone == "warn" ? "warn" : "info"]}</svg></i><span>${txt}</span></${goK ? "a" : "div"}>`;
const lk = (k, txt) => `<a class="rklk" data-a="recapGo" data-k="${esc(k)}">${txt}</a>`;
const ck = (c) => "cat:" + encodeURIComponent(c);
const eq = (a, b, c) => `<div class="rkeq">${[a, "+", b, "=", c].map((x) => (typeof x == "string" ? `<i>${x}</i>` : `<${x[2] ? "a" : "div"} ${x[2] ? `data-a="recapGo" data-k="${x[2]}"` : ""}><span>${x[0]}</span><b>${mi(x[1])}</b></${x[2] ? "a" : "div"}>`)).join("")}</div>`;
const segBar = (it) => { it = it.filter((x) => x[1] >= 1); const tot = it.reduce((s, x) => s + x[1], 0) || 1; return `<div class="rkhl"><div class="rkseg">${it.map((x, i) => `<i class="${x[2]}" data-h="${i}" style="flex:${x[1] / tot};--i:${i}"></i>`).join("")}</div><div class="rkleg">${it.map((x, i) => `<${x[3] ? "a" : "span"} data-h="${i}" ${x[3] ? `data-a="recapGo" data-k="${x[3]}"` : ""}><i class="${x[2]}"></i>${x[0]} <b>${mi(x[1])}</b></${x[3] ? "a" : "span"}>`).join("")}</div></div>`; };

function greeting() {
  const p = S.value?.cfg?.profile || {}, name = String(p.name || "").trim(), h = now.value.getHours(), band = h < 1 ? "n" : h < 5 ? "l" : h < 12 ? "m" : h < 17 ? "a" : h < 21 ? "e" : "n";
  const g = p.gender == "f" || p.gender == "m" ? p.gender : "o";
  let s = t("recap.greet." + g + "." + band + "." + (SEED % 4), { n: "\u0001" });
  if (!name) s = s.replace(/,? ?\u0001/, ""); // eslint-disable-line no-control-regex -- \u0001 marks where the name goes
  return esc(s).replace("\u0001", "<bdi>" + esc(name) + "</bdi>");
}
const dayScale = (m) => { let s = ""; for (let d = 1; d <= m.dim; d++) s += `<i class="${d < m.day ? "p" : d == m.day ? "n" : ""}" data-d="${d}" role="button" tabindex="0" aria-label="${esc(dfull(m.MK + "-" + p2(d)))}" style="--i:${d}"></i>`;
  return `<div class="rkds"><div class="rkdt">${s}</div><div class="rkdl"><span>${L("dayOf", { d: m.day, n: m.dim })}</span><span>${m.dim - m.day > 0 ? L("daysLeft", { n: m.dim - m.day }, m.dim - m.day) : L("lastDay")}</span></div><div class="rktip" hidden></div></div>`; };
function dayBars(m) {
  const W = 600, Hh = 96, gap = 4, n = m.dim, bw = (W - gap * (n - 1)) / n, hs = dayBarHeights(m, Hh); let s = "";
  for (let i = 0; i < n; i++) { const x = H() ? W - bw - i * (bw + gap) : i * (bw + gap); s += hs[i] != null ? `<rect x="${x}" y="${Hh - hs[i]}" width="${bw}" height="${hs[i]}" rx="${Math.min(4, bw / 2)}" class="${i == m.day - 1 ? "t" : "b"} gr" style="--i:${i}"/>` : `<rect x="${x}" y="${Hh - 2}" width="${bw}" height="2" rx="1" class="f"/>`; }
  return `<div class="rkbw"><svg class="rkv bars" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" role="img" aria-label="${esc(L("barsAria"))}">${s}</svg><div class="rktip" hidden></div></div>`;
}
const nowBar = (m) => { const set = Math.min(m.cash, m.inJars + m.buffer), free = Math.max(0, m.cash - set); return segBar([[L("jarsSet"), set, "c3", "jars"], [L("free"), free, "c1", "now"]]); };
const aheadBar = (m) => segBar([[L("cards"), m.cardLeft, "c1", "now"], [L("bills"), m.billsTot, "c2", "bills"], [L("budgets"), m.limitsLeft, "c3", "budg"], [L("fromJars"), m.jarCov, "c4", "jars"]]);
function pathChart(m) {
  const W = 600, Hh = 110, px = 18, top = 14, bot = 14, xs = [px, px + (W - 2 * px) * Math.min(1, Math.max(0.05, m.day / m.dim)), W - px];
  const vals = [isFinite(m.start) ? m.start : m.cash, m.cash, m.end], lo = Math.min(...vals), hi = Math.max(...vals), span = Math.max(1, hi - lo), Y = (v) => Hh - bot - ((v - lo) / span) * (Hh - top - bot);
  const ys = vals.map(Y), a = `${xs[0]},${ys[0]} ${xs[1]},${ys[1]}`;
  return `<svg class="rkv path" viewBox="0 0 ${W} ${Hh}" aria-hidden="true"><defs><linearGradient id="rkg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".28"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs><line x1="${px}" x2="${W - px}" y1="${Hh - bot + 8}" y2="${Hh - bot + 8}" class="ax"/><polygon points="${xs[0]},${Hh - bot + 8} ${a} ${xs[1]},${Hh - bot + 8}" fill="url(#rkg)" class="ar"/><polyline points="${a}" class="ln" pathLength="1"/><polyline points="${xs[1]},${ys[1]} ${xs[2]},${ys[2]}" class="ln d"/><circle cx="${xs[0]}" cy="${ys[0]}" r="5" class="dt"/><circle cx="${xs[1]}" cy="${ys[1]}" r="7" class="dn"/><circle cx="${xs[2]}" cy="${ys[2]}" r="5" class="dt e"/></svg><div class="rkpl"><div><span>${L("pStart")}</span><b>${mi(vals[0])}</b></div><div><span>${L("pToday")}</span><b>${mi(vals[1])}</b></div><div><span>${L("pEnd")}</span><b>${mi(vals[2])}</b></div></div>`;
}
const relBtn = (m) => { const o = m.over0; return o > 0 ? `<div class="rkfix"><p>${L("relX")}</p><button class="btn" data-a="jarRelease">${L("relBtn", { a: mi(Math.min(o, m.inJars)) })}</button></div>` : ""; };
function upList(m) {
  const it = []; m.days.forEach((D) => D.up.forEach((x) => { if (D.d >= m.today) it.push([D.d, x[0], x[1], x[2]]); }));
  if (!it.length) return "";
  return `<div class="rkup"><div class="t">${L("upcoming")}</div>${it.slice(0, 3).map((x) => `<div class="r" ${x[3] != null ? `data-a="billOpen" data-i="${x[3]}" role="button" tabindex="0"` : ""}><div class="dt"><b>${+x[0].slice(8)}</b><span>${dshort(x[0]).replace(/[0-9\s]/g, "")}</span></div><div class="n">${nm(x[1])}<small>${dday(x[0])}</small></div><b class="a">${mi(x[2])}</b></div>`).join("")}</div>`;
}
function budRow(b) {
  const lim = Math.max(1, b.lim), u = Math.min(100, (b.s / lim) * 100), pcv = Math.min(100, (b.pace / lim) * 100);
  const why = b.st == "over" ? L("bOver", { a: mi(b.s - b.lim), s: mi(b.s), l: mi(b.lim) }) : b.st == "warn" ? L("bWarn", { pc: Math.round(b.pc), s: mi(b.s), l: mi(b.lim), left: mi(Math.max(0, b.lim - b.s)) }) : L("bPace", { p: mi(b.pace), a: mi(b.pace - b.lim), l: mi(b.lim) });
  return `<a class="rkbr ${b.st == "over" ? "o" : "w"}" data-a="recapGo" data-k="${esc(ck(b.k))}"><div class="h"><b>${nm(catN(b.k))}</b><span>${L(b.st == "over" ? "over" : b.st == "warn" ? "almost" : "heading")}</span></div><div class="bar"><i style="width:${u.toFixed(1)}%"></i>${b.st == "pace" ? `<em style="inset-inline-start:${pcv.toFixed(1)}%"></em>` : ""}</div><p>${why}</p></a>`;
}

// ---- the parts ----
const PARTS = {
  hero: (m) => `<section class="rkh rr"><h2>${greeting()}</h2><p>${L({ start: "leadStart", mid: "leadMid", end: "leadEnd" }[m.phase], { mon: mname(m.MK) })}</p>${dayScale(m)}</section>`,
  start: (m, zz) => {
    const d = m.cash - m.start, line = Math.abs(d) >= 100 ? chip(d >= 0 ? L("moreToday", { a: mi(d) }) : L("lessToday", { a: mi(-d) }), d >= 0 ? "good" : "warn", "now") : "";
    return part(zz, "flag", "", L("began", { mon: mname(m.MK) }), "", `<span class="rkw">≈</span>${mn(m.start)}`, L("beganX", { date: dlong(m.MK + "-01") }) + (line ? `<br>${line}` : ""));
  },
  in: (m, zz) => {
    if (!m.sal) return part(zz, "in", "tp", L("soFar"), "in", mn(0), L("nothingIn"));
    const rest = m.inc - m.sal.a, n = m.incs.length - 1, ok = hasStart(m), who = lk("tx:" + m.sal.id, nm(nameOf(S.value, m.sal)));
    let line = n > 0 && rest >= 1 ? L("biggest", { a: mi(m.sal.a), who, date: dlong(rdOf(m.sal)), others: t("recap.others", { n }, n), b: mi(rest) }) : L("paidBy", { who, date: dlong(rdOf(m.sal)) });
    if (ok) line += `<br>${L("tookUp", { a: mi(m.start + m.inc) })}`;
    return part(zz, "in", "tp", L("then"), "in", mn(m.inc), line, ok ? eq([L("startedWith"), m.start, "now"], [L("cameIn"), m.inc, "in"], [L("broughtTo"), m.start + m.inc, "now"]) : "");
  },
  out: (m, zz) => {
    let line = ""; const d = m.same - m.ex;
    if (m.same >= 100 && m.ex >= 100) line = Math.abs(d) < Math.max(100, m.same * 0.08) ? chip(L("sameAs"), "", "out") : d > 0 ? chip(L("lessThan", { a: mi(d) }), "good", "out") : chip(L("moreThan", { a: mi(-d) }), "warn", "out");
    let pulse = ""; const tr = m.w1 - m.w0;
    if (m.w0 >= 150 && Math.abs(tr) >= Math.max(100, m.w0 * 0.25)) pulse = tr < 0 ? chip(L("calmer"), "good", "d7") : chip(L("busier"), "warn", "d7");
    else if (m.below[0]) pulse = chip(L("below", { c: nm(catN(m.below[0].k)) }), "good", ck(m.below[0].k));
    else if (m.above[0]) pulse = chip(L("above", { c: nm(catN(m.above[0].k)) }), "warn", ck(m.above[0].k));
    return part(zz, "out", "tn", L("since"), "out", mn(m.ex), L("barsLead") + line + pulse, dayBars(m));
  },
  now: (m, zz) => part(zz, "wallet", "", L("left"), "now", mn(m.cash), L("leftX"), nowBar(m)),
  ahead: (m, zz) => {
    const tot = m.cash - m.end, bm = { ...m, billsTot: Math.max(0, tot - m.cardLeft - m.limitsLeft - m.jarCov) }, left = m.cash - tot, held = m.inJars + m.buffer, free = left - held;
    const rest = left >= 0 ? chip(L("willHave", { a: mi(left) }), "good", "fc") : chip(L("moreThanHave", { a: mi(-left) }), "warn", "now");
    const jr = held >= 1 && left >= 0 ? (free >= 0 ? chip(L("inJars", { a: mi(held), b: mi(free) }), "", "jars") : chip(L("jarsShort", { a: mi(held), b: mi(-free) }), "warn", "jars") + relBtn(m)) : "";
    return part(zz, "ahead", "", L("stillPay"), "ahead", mn(tot), L("stillPayX") + rest + jr, aheadBar(bm) + upList(m));
  },
  budgets: (m, zz) => {
    const flag = [...m.over, ...m.risk];
    if (!flag.length) return part(zz, "check", "tp", L("budAre"), "budg", `<span class="rkw">${L("onTrack")}</span>`, L("allOk", { n: m.okB.length }, m.okB.length));
    return part(zz, "pie", m.over.length ? "tn" : "tw", L("budgets2"), "budg", `<span class="rkw">${L("need", { n: flag.length }, flag.length)}</span>`, L("why"), `<div class="rkbl">${flag.slice(0, 4).map(budRow).join("")}</div>`);
  },
  end: (m, zz) => {
    const d = m.end - m.start; let line = L("endX");
    if (hasStart(m) && Math.abs(d) >= 100) line += chip(d >= 0 ? L("moreStart", { a: mi(d) }) : L("lessStart", { a: mi(-d) }), d >= 0 ? "good" : "warn", "fc");
    { const held = m.inJars + m.buffer, free = m.end - held; if (held >= 1 && m.end > 0) line += free >= 0 ? chip(L("inJars", { a: mi(held), b: mi(free) }), "", "jars") : chip(L("endShort", { a: mi(held), e: mi(m.end), b: mi(-free) }), "warn", "jars") + relBtn(m); }
    if (m.phase == "end") line += chip(L("nextBegin", { mon: mname(m.nmk), a: mi(m.nextBills + m.cardsU) }), "", "fc");
    return part(zz, "path", m.end < 0 ? "tn" : "", L("predicted", { mon: mname(m.MK) }), "end", `<span class="rkw">≈</span>${mn(m.end)}`, line, pathChart(m));
  },
};

const M = computed(() => (S.value?.tx?.length && home.value ? recapModel(home.value, now.value) : null));
const html = computed(() => {
  locale.value; // the words follow the language (and the gender, through gen())
  if (!S.value) return "";
  if (!S.value.tx.length) return `<div class="rkw0"><section class="rkh rr"><h2>${L("empty")}</h2><p>${L("emptyX")}</p></section></div>`;
  const m = M.value, order = recapParts(m), out = []; let zc = 0;
  // the first two parts are plain, the last one ends the chain, the ones in between zig-zag
  order.forEach((p, i) => { const zz = i < 2 || i == order.length - 1 ? 0 : zc + 1; const h = PARTS[p](m, zz); if (zz && h) zc++; out.push(h); });
  const endH = out[out.length - 1].replace('class="rk rr', 'class="rk rr zend'), chain = out.slice(2, -1).join("") + endH;
  return `<div class="rkw0">${out[0]}${out[1] || ""}${chain ? `<div class="rkz">${chain}</div>` : ""}</div>`;
});

// ---- opening the matching page, filtered (recapGo) ----
function recapGo(k) {
  const m = M.value; if (!m) return; const last = m.MK + "-" + p2(m.dim);
  if (k == "in") goActivity({ from: m.MK + "-01", to: last, ty: "income" });
  else if (k == "out") goActivity({ from: m.MK + "-01", to: last, ty: "expense" });
  else if (k == "ahead") goActivity({ from: m.today, to: last });
  else if (k == "now") go("/accounts");
  else if (k == "budg") go("/budgets");
  else if (k == "end" || k == "fc") go("/forecast");
  else if (k == "jars") go("/jars");
  else if (k == "bills") go("/bills");
  else if (k == "d7") { const d = new Date(m.today + "T12:00:00"); d.setDate(d.getDate() - 6); goActivity({ from: d.toISOString().slice(0, 10), to: m.today, ty: "expense" }); }
  else if (k.startsWith("cat:")) goActivity({ cat: decodeURIComponent(k.slice(4)), from: m.MK + "-01", to: last, ty: "expense" });
  else if (k.startsWith("tx:")) openTx(+k.slice(3));
  else if (/^\d{4}-\d{2}-\d{2}$/.test(k)) goActivity({ from: k, to: k });
}
// a bill in "Upcoming payments": its last payment, or the Bills page when it has none yet (billOpen)
function billOpen(i) {
  const H0 = home.value, b = H0.billsAll.find((x) => x.idx == i); if (!b) return;
  const L0 = billTx0(b, H0.rows, S.value.tx), lastP = L0[L0.length - 1];
  if (lastP) openTx(lastP.id); else go("/bills");
}
// "Take back from the jars" (jarRelease, the same as the Jars page)
const rel = ref(false);
const relAmt = computed(() => (M.value ? Math.min(M.value.over0, M.value.inJars) : 0));
function doRelease() {
  rel.value = false; const over = M.value?.over0; if (!(over > 0)) return;
  data.change((n) => { const l = releaseJars(n, over, jarCtx(jarsM.value, fm)); return l.length ? l : false; });
  toast(t("jars.rel.done"));
}
const box = ref(null);
function onClick(e) {
  const a = e.target.closest("[data-a]"); if (!a || !box.value.contains(a)) return;
  if (a.dataset.a == "recapGo") recapGo(a.dataset.k); else if (a.dataset.a == "billOpen") billOpen(+a.dataset.i); else if (a.dataset.a == "jarRelease") rel.value = true;
}
function onKey(e) { if ((e.key == "Enter" || e.key == " ") && e.target.matches?.('[data-a="billOpen"]')) { e.preventDefault(); billOpen(+e.target.dataset.i); } }

// ---- the day tooltips (dayTip, wireDays, wireBars) ----
function dayTip(D, future, today) {
  const row = (a, b) => `<div class="r"><span>${nm(a)}</span><b>${mi(b)}</b></div>`, top = (L0) => [...L0].sort((x, y) => y[1] - x[1]).slice(0, 3).map((x) => row(x[0], x[1])).join("");
  let b = `<div class="h">${dfull(D.d)}${today ? ` · ${L("today")}` : ""}</div>`;
  if (D.inc > 0) b += `<div class="s pos">${L("tCameIn")} <b>${mi(D.inc)}</b></div>` + top(D.inn);
  if (D.spent > 0) b += `<div class="s neg">${L("tSpent")} <b>${mi(D.spent)}</b></div>` + top(D.ex) + (D.ex.length > 3 ? `<div class="m">${L("andMore", { n: D.ex.length - 3 })}</div>` : "");
  if (D.up.length) b += `<div class="s">${L("expected")}</div>` + D.up.map((x) => row(x[0], x[1])).join("");
  if (D.inc <= 0 && D.spent <= 0 && !D.up.length) b += `<div class="m">${future ? L("nothingPlanned") : L("nothingHappened")}</div>`;
  return b + `<div class="m o">${L("clickDay")}</div>`;
}
const offs = [];
const onDoc = (type, f) => { document.addEventListener(type, f); offs.push(() => document.removeEventListener(type, f)); };
function wireDays(el, m) {
  const sc = el.querySelector(".rkds"), tip = sc && sc.querySelector(".rktip"); if (!tip) return; let cur = 0;
  const show = (i) => { const D = m.days[i - 1], tt = sc.querySelector(`.rkdt i[data-d="${i}"]`); if (!D || !tt) return; const a = sc.getBoundingClientRect(), r = tt.getBoundingClientRect();
    tip.innerHTML = dayTip(D, i > m.day, i == m.day); tip.hidden = false; cur = i;
    const w = tip.offsetWidth, x = r.left + r.width / 2 - a.left; tip.style.left = Math.max(0, Math.min(a.width - w, x - w / 2)) + "px"; tip.style.bottom = a.bottom - r.top + 14 + "px"; };
  const hide = () => { tip.hidden = true; cur = 0; };
  sc.querySelectorAll(".rkdt i").forEach((tt) => { const i = +tt.dataset.d;
    tt.addEventListener("mouseenter", () => show(i)); tt.addEventListener("focus", () => show(i)); tt.addEventListener("blur", hide);
    tt.addEventListener("click", (e) => { if (e.pointerType === "touch" && cur !== i) { show(i); return; } recapGo(m.MK + "-" + p2(i)); });
    tt.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); recapGo(m.MK + "-" + p2(i)); } }); });
  sc.addEventListener("mouseleave", hide);
  onDoc("pointerdown", (e) => { if (!sc.contains(e.target)) hide(); });
}
function wireBars(el, m) {
  const w = el.querySelector(".rkbw"); if (!w) return; const svg = w.querySelector("svg"), tip = w.querySelector(".rktip"), n = m.dim; let cur = 0;
  const idx = (e) => { const r = svg.getBoundingClientRect(); return Math.max(1, Math.min(n, Math.floor((H() ? 1 - (e.clientX - r.left) / r.width : (e.clientX - r.left) / r.width) * n) + 1)); };
  const show = (i) => { const D = m.days[i - 1]; if (!D) return; svg.querySelectorAll("rect").forEach((x, k) => x.classList.toggle("hv", k == i - 1));
    tip.innerHTML = dayTip(D, i > m.day, i == m.day); tip.hidden = false; cur = i;
    const a = w.getBoundingClientRect(), r = svg.getBoundingClientRect(), fr = H() ? n - i + 0.5 : i - 0.5, cx = r.left + (fr / n) * r.width - a.left, tw = tip.offsetWidth;
    tip.style.left = Math.max(0, Math.min(a.width - tw, cx - tw / 2)) + "px"; tip.style.bottom = a.bottom - r.top + 10 + "px"; };
  const hide = () => { tip.hidden = true; cur = 0; svg.querySelectorAll("rect.hv").forEach((x) => x.classList.remove("hv")); };
  svg.addEventListener("mousemove", (e) => show(idx(e))); svg.addEventListener("mouseleave", hide);
  svg.addEventListener("click", (e) => { const i = idx(e); if (e.pointerType === "touch" && cur !== i) { show(i); return; } recapGo(m.MK + "-" + p2(i)); });
  onDoc("pointerdown", (e) => { if (!w.contains(e.target)) hide(); });
}
// hovering a bar segment or its name lights up both
function hlSet(r, h) { r.classList.toggle("hv", h != null); r.querySelectorAll("[data-h]").forEach((x) => x.classList.toggle("on", h != null && x.dataset.h === h)); }
function onOver(e) { const x = e.target.closest?.(".rkhl [data-h]"); if (x) hlSet(x.closest(".rkhl"), x.dataset.h); }
function onOut(e) { const x = e.target.closest?.(".rkhl [data-h]"); if (!x) return; const to = e.relatedTarget?.closest?.(".rkhl [data-h]"), r = x.closest(".rkhl"); if (to && r.contains(to)) return; hlSet(r, null); }

// ---- fading in and drawing the path as you scroll (reveal, measure, frame) ----
const REDUCE = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
let IO = null, CUR = null, RO = null, TICK = 0, LASTSIG = "", LASTAT = 0;
function countUp(el) {
  const to = +el.dataset.v || 0; if (!to || REDUCE()) return; const t0 = performance.now(), Dd = 1100; el.setAttribute("data-cu", "1"); el.textContent = "0";
  (function step(nw) { const k = Math.min(1, (nw - t0) / Dd), e = 1 - Math.pow(1 - k, 3); el.textContent = f0(Math.round(to * e)); if (k < 1 && document.body.contains(el)) requestAnimationFrame(step); else { el.removeAttribute("data-cu"); el.textContent = f0(to); } })(t0);
}
const showIn = (x, animate) => { if (x.classList.contains("in")) return; x.classList.add("in"); if (!animate) { x.classList.add("st"); return; } x.querySelectorAll(".cnt").forEach(countUp); };
function reveal(el, animate) {
  if (IO) { IO.disconnect(); IO = null; }
  if (animate && !REDUCE()) el.querySelectorAll(".cnt").forEach((n) => { if (+n.dataset.v) n.textContent = "0"; });
  const items = [...el.querySelectorAll(".rr:not(.z):not(.zend)")];
  if (!animate || REDUCE() || !("IntersectionObserver" in window)) { items.forEach((x) => showIn(x, false)); return; }
  IO = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; showIn(e.target, true); IO.unobserve(e.target); }), { threshold: 0.3, rootMargin: "0px 0px -18% 0px" });
  items.forEach((x) => IO.observe(x));
}
const SVGNS = "http://www.w3.org/2000/svg";
const cl01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x), q3 = (x) => Math.round(x * 1000) / 1000;
const mx = (v) => (H() ? 180 - v : v); // the connectors are drawn left to right: mirrored in Hebrew
const plain = (x, f) => { const tr0 = x.style.transform, sc = x.style.scale, tn = x.style.transition; x.style.transition = "none"; x.style.transform = "none"; x.style.scale = "1"; const v = f(); x.style.transform = tr0; x.style.scale = sc; x.style.transition = tn; return v; };
function measure(s) {
  const el = s.el, z = el.querySelector(".rkz"), Gm = { zTop: 0, rows: [], shr: [], lead: null, end: null }; s.geo = Gm; s.dirty = false;
  el.querySelectorAll(".rkh.rr,.rkw0>.rk.rr,.zend").forEach((x) => { const r = plain(x, () => x.getBoundingClientRect()); Gm.shr.push({ x, cy: (r.top + r.bottom) / 2 + scrollY, k: -1 }); });
  if (!z) return;
  Gm.zTop = z.getBoundingClientRect().top + scrollY; const rows = [...z.querySelectorAll(".rk.z")], end = z.querySelector(".zend"), eT = end && end.querySelector(".rki");
  const cy = (r) => { const n = r.querySelector(".rkni"), c = r.querySelector(".rkcir"); return r.offsetTop + n.offsetTop + c.offsetTop + c.offsetHeight / 2; };
  const pts = rows.map(cy), endY = eT ? end.offsetTop + eT.offsetTop + eT.offsetHeight / 2 : null, rad = (r) => r.querySelector(".rkcir").offsetHeight / 2, endR = eT ? eT.offsetHeight / 2 : 0;
  const geo = (svg, w, top, d, x0, x1) => { if (!svg) return null; const hh = Math.max(1, d), pa = svg.querySelector("path"); svg.setAttribute("viewBox", `0 0 ${w} ${hh}`); svg.style.top = top + "px"; svg.style.height = d + "px"; pa.setAttribute("d", x0 == x1 ? `M${x0} 0V${hh}` : `M${x0} 0C${x0} ${hh * 0.5} ${x1} ${hh * 0.5} ${x1} ${hh}`); return { pa, hh, o: -1 }; };
  rows.forEach((r, i) => {
    const a = pts[i], R0 = rad(r), last = i + 1 == rows.length, b = !last ? pts[i + 1] : endY, Rn = !last ? rad(rows[i + 1]) : endR, x0 = mx(r.classList.contains("za") ? 52 : 128), x1 = !last ? mx(rows[i + 1].classList.contains("za") ? 52 : 128) : 90;
    r.classList.toggle("tozend", last && b != null); const c0 = r.querySelector(".rkcir"), top = c0.offsetTop + c0.offsetHeight, len = b != null ? b - a - R0 - Rn : 0;
    const bd = r.querySelector(".rkb"), R = { r, a, R0, bt: r.offsetTop + bd.offsetTop, body: bd, circ: c0, mid: r.offsetTop + r.offsetHeight / 2, kb: -1, kc: -1, cons: [], hit: r.classList.contains("hit") };
    if (b != null) { R.cons = [geo(r.querySelector(".rkcn.cs"), 180, top, len, x0, x1), geo(r.querySelector(".rkcn.cm"), 10, top, len, 5, 5)].filter(Boolean); R.cons.forEach((o) => (o.from = Gm.zTop + a + R0)); }
    Gm.rows.push(R);
  });
  if (end && endY != null) Gm.end = { el: end, y: endY, t: end.offsetTop };
  // the path starts below the first part and comes down to the first circle
  const st = el.querySelector(".rkw0>.rk:not(.z)");
  if (rows.length && st && st.querySelector(".rki")) {
    let ld = z.querySelector(".rklead"); if (!ld) { ld = document.createElementNS(SVGNS, "svg"); ld.setAttribute("class", "rkcn rklead cs"); ld.setAttribute("aria-hidden", "true"); ld.innerHTML = '<path pathLength="1"/>'; z.insertBefore(ld, z.firstChild); }
    const tb = plain(st, () => st.getBoundingClientRect().bottom) + scrollY - 26, from = tb - Gm.zTop, a = pts[0] - rad(rows[0]), d = a - from, x1 = mx(rows[0].classList.contains("za") ? 52 : 128);
    ld.style.top = from + "px"; ld.style.height = Math.max(0, d) + "px"; ld.setAttribute("viewBox", `0 0 180 ${Math.max(1, d)}`); ld.querySelector("path").setAttribute("d", `M90 0C90 ${d * 0.5} ${x1} ${d * 0.5} ${x1} ${d}`);
    Gm.lead = { pa: ld.querySelector("path"), from: tb, hh: Math.max(1, d), o: -1 };
  }
}
function frame() {
  const s = CUR; if (!s || !s.el.isConnected) return; if (!s.el.getClientRects().length) { s.away = true; return; }
  if (s.away) { s.away = false; s.animate = true; s.dirty = true; s.el.querySelectorAll(".rr").forEach((x) => x.classList.remove("in", "st", "hit")); reveal(s.el, true); }
  if (s.dirty || !s.geo) measure(s);
  const Gm = s.geo, y = scrollY, vh = innerHeight, head = y + vh * 0.86, anim = s.animate && !REDUCE(), move = !REDUCE(), t0 = vh * 0.4, sp = vh * 0.7;
  const kOf = (c) => q3(1 - 0.3 * cl01((t0 - (c - y)) / sp));
  const dash = (o, top) => { let v = anim ? q3(1 - cl01((head - top) / o.hh)) : 0; if (o.m !== undefined && v > o.m) v = o.m; o.m = v; if (v === o.o) return; o.o = v; o.pa.style.strokeDashoffset = v; };
  if (Gm.lead) dash(Gm.lead, Gm.lead.from);
  Gm.rows.forEach((R) => { const top = Gm.zTop + R.a;
    R.cons.forEach((o) => dash(o, o.from));
    if (!R.hit && (!anim || head >= top - R.R0)) { R.hit = true; R.r.classList.add("hit"); }
    if (!R.r.classList.contains("in") && y + vh * 0.8 >= Gm.zTop + R.bt) showIn(R.r, anim);
    if (move) { const kb = kOf(Gm.zTop + R.mid), kc = kOf(top); if (kb !== R.kb) { R.kb = kb; R.body.style.scale = kb; } if (kc !== R.kc) { R.kc = kc; R.circ.style.scale = kc; const w = 5 * kc; R.cons.forEach((o) => (o.pa.style.strokeWidth = w)); } } });
  if (Gm.end && !Gm.end.el.classList.contains("in") && y + vh * 0.8 >= Gm.zTop + Gm.end.t) showIn(Gm.end.el, anim);
  if (move) Gm.shr.forEach((it) => { const k = kOf(it.cy); if (k !== it.k) { it.k = k; it.x.style.scale = k; } });
}
const kick = () => { if (TICK) return; TICK = requestAnimationFrame(() => { TICK = 0; frame(); }); };
const relayout = () => { if (CUR) CUR.dirty = true; kick(); };
function wireLinks(el, animate) {
  CUR = { el, animate, dirty: true }; if (RO) { RO.disconnect(); RO = null; }
  if ("ResizeObserver" in window) { RO = new ResizeObserver(relayout); RO.observe(el); }
  frame(); setTimeout(relayout, 300); setTimeout(relayout, 1200);
}
// the same page again: leave it alone. A change while you are looking: update it quietly. Coming back to it later: play it again.
async function paint(h) {
  await nextTick();
  const el = box.value; if (!el) return;
  if (h === LASTSIG) { setTimeout(kick, 50); setTimeout(kick, 400); return; }
  const fresh = Date.now() - LASTAT > 2500 || !LASTSIG; LASTSIG = h; LASTAT = Date.now();
  offs.splice(0).forEach((f) => f());
  reveal(el, fresh); wireLinks(el, fresh); if (M.value) { wireDays(el, M.value); wireBars(el, M.value); }
}
const shown = ref("");
let y0 = 0;
watch(html, (h) => { if (h === shown.value) return paint(h); y0 = scrollY; shown.value = h; paint(h).then(() => { if (Date.now() - LASTAT > 50) return; if (y0) scrollTo(0, y0); }); }, { immediate: true });
onMounted(() => { addEventListener("scroll", kick, { passive: true }); addEventListener("resize", relayout); try { document.fonts?.ready.then(relayout); } catch { /* fonts */ } document.addEventListener("mouseover", onOver); document.addEventListener("mouseout", onOut); paint(shown.value); });
onBeforeUnmount(() => { removeEventListener("scroll", kick); removeEventListener("resize", relayout); document.removeEventListener("mouseover", onOver); document.removeEventListener("mouseout", onOut); offs.splice(0).forEach((f) => f()); IO?.disconnect(); RO?.disconnect(); CUR = null; LASTSIG = ""; });
</script>

<template>
  <section id="recap" ref="box" class="view on" @click="onClick" @keydown="onKey" v-html="shown" />
  <BaseDialog :open="rel" :title="t('jars.takeBack', { amount: fm(relAmt) })" @update:open="rel = false">
    <div class="sm" style="line-height:1.5">{{ t("jars.rel.text", { amount: fm(relAmt) }) }}</div>
    <template #actions><button type="button" class="btn o" @click="rel = false">{{ t("jars.cancel") }}</button><button type="button" class="btn" @click="doRelease">{{ t("jars.rel.yes") }}</button></template>
  </BaseDialog>
</template>
