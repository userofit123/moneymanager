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
import { readPref, writePref, readJson } from "../core/prefs.js";
import { catLabel } from "../core/cats.js";
import { tx } from "../core/heText.js";
import { gen } from "../core/heText.js";
import { go } from "../router.js";
import { f0, fm } from "../format.js";
import { billTx0 } from "../lib/bills.js";
import { jarCtx, releaseJars } from "../lib/jars.js";
import { recapModel, recapParts, roundParts, dayBarHeights, hasStart } from "../lib/recap.js";
import { forecastModel, fcChoices } from "../lib/forecast.js";
import BaseDialog from "../components/BaseDialog.vue";
import "../styles/pages/recap.css"; // this page's own styles

const { t, locale } = useI18n();
const S = computed(() => data.state.value);
onMounted(() => { data.start(); });

// The greeting moves one step along its list every time the app opens (kept in this browser as "moneyGreet").
const SEED = (() => { let n = 1; try { n = (parseInt(readPref("moneyGreet"), 10) || 0) + 1; writePref("moneyGreet", String(n)); } catch { /* not kept */ } return n; })();

// Hebrew follows the profile's gender (gen() in core/heText.js; its rules are loaded only for Hebrew).
const H = () => locale.value === "he";
const G = (s) => (H() ? gen(s) : s);
const L = (k, p, n) => G(n == null ? t("recap." + k, p || {}) : t("recap." + k, p || {}, n));
// the name of one of the app's key numbers (lib/keyNumbers.js), the same on every page
const N = (k, p) => G(t("num." + k, p || {}));

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const mn = (n) => `<bdi class="rkc">${n < 0 ? "−" : ""}<small>₪</small><span class="cnt" data-v="${Math.round(Math.abs(n))}">${f0(n)}</span></bdi>`;
const mi = (n) => `<bdi class="rkc">${n < 0 ? "−" : ""}₪${f0(n)}</bdi>`;
const nm = (x) => `<bdi>${esc(x)}</bdi>`;
const loc = () => (H() ? "he-IL" : "en-GB");
// a day with a month name: "October 1" in English; in Hebrew the day comes first, with ל before the month: "1 לאוקטובר"
const dmon = (d, o) => { const x = dobj(d); return H() ? x.getDate() + " ל" + x.toLocaleDateString("he-IL", { month: o.month }) : x.toLocaleDateString("en-US", o); };
const dobj = (d) => new Date(String(d).slice(0, 10) + "T12:00:00");
const dlong = (d) => dmon(d, { day: "numeric", month: "long" });
const dshort = (d) => dmon(d, { day: "numeric", month: "short" });
const dday = (d) => dobj(d).toLocaleDateString(loc(), { weekday: "short" });
const dfull = (d) => dobj(d).toLocaleDateString(H() ? "he-IL" : "en-US", { weekday: "long" }) + ", " + dmon(d, { day: "numeric", month: "long" });
const mname = (k) => new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, 1).toLocaleDateString(loc(), { month: "long" });
const catN = (c) => catLabel(c);
const p2 = (n) => String(n).padStart(2, "0");
const ICON = {
  start: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  in: '<path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 16 6 6"/><circle cx="16" cy="9" r="2.9"/><circle cx="6" cy="5" r="3"/>',
  out: '<path d="M16 10a4 4 0 0 1-8 0"/><path d="M3.1 6h17.8"/><path d="M3.4 5.5a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.7a2 2 0 0 0-.4-1.2l-2-2.7A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  ahead: '<path d="M16 14v2.2l1.6 1"/><path d="M16 2v4"/><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M3 10h5"/><path d="M8 2v4"/><circle cx="16" cy="16" r="6"/>',
  pie: '<path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>',
  card: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  path: '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
  good: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  warn: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
};

// ---- the pieces of markup (tiles, chips, links, sums, bars …) ----
const tile = (ic, tone) => `<div class="rki ${tone || ""}"><svg viewBox="0 0 24 24">${ICON[ic]}</svg></div>`;
const pc = (z) => (z % 2 ? "var(--acc2)" : "var(--acc)");
// zz: the part's place in the zig-zag chain (0: a plain part at the top). last: the icon goes under a plain part (where the route starts)
function part(zz, ic, tone, label, goK, big, line, vis, last) {
  const lab = goK ? `<a class="rkl" data-a="recapGo" data-k="${goK}">${label}<i>${H() ? "←" : "→"}</i></a>` : `<span class="rkl">${label}</span>`;
  if (zz) {
    const a = zz % 2;
    return `<section class="rk rr z ${a ? "za" : "zb"}" style="--pb:${pc(zz)}"><div class="rkni"><div class="rkcir">${tile(ic, tone)}</div></div><div class="rkb"><div class="rkx">${lab}<div class="rkn">${big}</div>${line ? `<div class="rkp">${line}</div>` : ""}</div>${vis ? `<div class="rkvv">${vis}</div>` : ""}</div></section>`;
  }
  const t = tile(ic, tone + (last ? " rkstart" : ""));
  return `<section class="rk rr ${tone || ""}">${last ? "" : t}${lab}<div class="rkn">${big}</div>${line ? `<div class="rkp">${line}</div>` : ""}${vis || ""}${last ? t : ""}</section>`;
}
// a note: an icon tile, then a small label (lab) over the sentence
const note = (tag, attrs, ic, lab, txt) => `<${tag} class="rkch ${attrs}><i class="cp"><svg viewBox="0 0 24 24">${ICON[ic]}</svg></i><span class="tx">${lab ? `<small class="lb">${lab}</small>` : ""}<span class="m">${txt}</span></span></${tag}>`;
const chip = (txt, tone, goK, lab) => note(goK ? "a" : "div", `${tone || ""}" ${goK ? `data-a="recapGo" data-k="${esc(goK)}"` : ""}`, tone == "good" ? "good" : tone == "warn" ? "warn" : "info", lab, txt);
const lk = (k, txt) => `<a class="rklk" data-a="recapGo" data-k="${esc(k)}">${txt}</a>`;
const ck = (c) => "cat:" + encodeURIComponent(c);
// a sum as a stack of small cards: what you had on top, a card for each change (a gradient block with its icon, its name in
// that colour with a short line under it, the amount with its sign, and what it is made of), and the result as the last card.
// sumBox(had, groups, end): had and end are [label, amount, link]; a group is { k: "out" | "in" | "card", label, amt, link, subs, note }.
// A "card" group (spent by credit card) is shown but not counted: no sign, a quiet amount and a "leaves later" tag by its
// name, whose tooltip explains it.
const SUMK = { out: ["var(--neg)", "var(--c2)", "−"], in: ["var(--pos)", "var(--c3)", "+"], card: ["var(--acc2)", "var(--acc)", ""], end: ["var(--acc)", "var(--acc2)", ""] };
const SUMI = { out: '<path d="M7 17 17 7M9 7h8v8"/>', in: '<path d="M17 7 7 17M15 17H7V9"/>', card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>', end: '<path d="M6 9.5h12M6 14.5h12"/>' };
const lnk = (link, cls, inner) => (link ? `<a class="${cls}" data-a="recapGo" data-k="${esc(link)}">${inner}</a>` : `<div class="${cls}">${inner}</div>`);
// end[3]: [label, amount], a smaller line under the result (the balance once the card bills come)
const sumBox = (had, groups, end) => {
  const card = (k, g) => {
    const [g1, g2, sg] = SUMK[k], subs = (g.subs || []).map((x) => lnk(x[2], "qs", `<span>${x[0]}</span><b>${mi(x[1])}</b>`)).join("");
    return `<div class="sq q${k}" style="--g1:${g1};--g2:${g2}"><span class="qb"><svg viewBox="0 0 24 24">${SUMI[k]}</svg></span><span class="qd">${lnk(g.link, "qt", `<span${g.tip ? ` data-tip="${esc(g.tip)}"` : ""}>${g.label}${k == "card" ? ` <span class="qx" data-tip="${esc(L("laterTip"))}">${L("notSum")}</span>` : ""}</span><b><bdi dir="ltr">${sg}${mi(g.amt)}</bdi></b>`)}<span class="ql"></span>${g.after ? `<span class="qf"><span>${g.after[0]}</span><b>${mi(g.after[1])}</b></span>` : ""}${g.note && k != "card" ? `<span class="qn">${g.note}</span>` : ""}${subs ? `<span class="qp">${subs}</span>` : ""}</span></div>`;
  };
  return `<div class="rkeq">${had ? lnk(had[2], "qh", `<span>${had[0]}</span><b>${mi(had[1])}</b>`) : ""}${groups.map((g) => card(g.k, g)).join("")}${end ? card("end", { label: end[0], amt: end[1], link: end[2], after: end[3], note: end[4] }) : ""}</div>`;
};
// name-and-amount pills, each opening its own list: [name, amount, link]
const pills = (it) => (it.length ? `<div class="rkpis">${it.map((x) => `<a class="rkpi" data-a="recapGo" data-k="${esc(x[2])}"><span>${nm(x[0])}</span><b>${mi(x[1])}</b></a>`).join("")}</div>` : "");
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
const nowBar = (m) => { const P = m.freeParts; return segBar([[N("cardsUnpaid"), P.cards, "c4", "now"], [N("upcomingS"), P.up, "c5", "ahead"], [N("leftBudgets"), P.toCome, "c2", "budg"], [N("putAside"), P.aside, "c3", "jars"], [N("free"), Math.max(0, P.free), "c1", "now"]]); };
const aheadBar = (m) => segBar([[L("cards"), m.cardsThis, "c1", "now"], [N("upcomingS"), m.billsTot, "c2", "bills"]]);
function pathChart(m) {
  const W = 600, Hh = 110, px = 18, top = 14, bot = 14, xs = [px, px + (W - 2 * px) * Math.min(1, Math.max(0.05, m.day / m.dim)), W - px];
  const vals = [isFinite(m.start) ? m.start : m.cash, m.cash, m.endMonth], lo = Math.min(...vals), hi = Math.max(...vals), span = Math.max(1, hi - lo), Y = (v) => Hh - bot - ((v - lo) / span) * (Hh - top - bot);
  const ys = vals.map(Y), a = `${xs[0]},${ys[0]} ${xs[1]},${ys[1]}`;
  return `<div class="rkpw" style="--x:${((xs[1] / W) * 100).toFixed(2)}%;--y:${((ys[1] / Hh) * 100).toFixed(2)}%"><svg class="rkv path" viewBox="0 0 ${W} ${Hh}" aria-hidden="true"><defs><linearGradient id="rkg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".28"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs><line x1="${px}" x2="${W - px}" y1="${Hh - bot + 8}" y2="${Hh - bot + 8}" class="ax"/><polygon points="${xs[0]},${Hh - bot + 8} ${a} ${xs[1]},${Hh - bot + 8}" fill="url(#rkg)" class="ar"/><polyline points="${a}" class="ln" pathLength="1"/><polyline points="${xs[1]},${ys[1]} ${xs[2]},${ys[2]}" class="ln d"/><circle cx="${xs[0]}" cy="${ys[0]}" r="5" class="dt"/><circle cx="${xs[1]}" cy="${ys[1]}" r="7" class="dn"/><circle cx="${xs[2]}" cy="${ys[2]}" r="5" class="dt e"/></svg><div class="rkpt"><span>${L("pToday")}</span><b>${mi(vals[1])}</b></div><i class="rkpa"></i></div><div class="rkpl"><div><span>${L("pStart")}</span><b>${mi(vals[0])}</b></div><div><span>${L("pEnd")}</span><b>${mi(vals[2])}</b></div></div>`;
}
// The jars chip's follow-up: the same kind of chip, but it acts (opens the take-back window)
const relBtn = (m) => { const o = m.over0; return o > 0 ? note("a", `warn" data-a="jarRelease" role="button" tabindex="0" data-tip="${esc(L("relX"))}"`, "warn", L("jarsH"), L("relBtn", { a: mi(Math.min(o, m.inJars)) })) : ""; };
// the payments still due this month: each card's bill and each bill or listed payment, with its day (yyyy-mm-dd)
const ymd = (d) => (d instanceof Date ? `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` : d || null);
const aheadRows = (m) => [...m.cardsNow.map((c) => ({ card: true, n: c.n, a: c.a, d: c.d })), ...m.bills.map((b) => ({ n: b.n, a: b.amt, d: ymd(b.nx), idx: b.idx, id: b.id, cov: b.cov || 0 }))];
// rows for a sum: each payment with its day, in whole shekels that add up to their line (tot)
const byDay = (a, b) => ((a.d || "9") < (b.d || "9") ? -1 : 1);
const payRows = (L0, tot, link) => { const r = roundParts(L0.map((x) => x.a), tot); return L0.map((x, i) => [x.d ? `${nm(x.n)} · ${dshort(x.d)}` : nm(x.n), r[i], x.id != null ? "tx:" + x.id : link, "s"]); };
function upList(m) {
  // the same payments as the sum above it, by date: card bills still due this month and every bill or payment listed for later
  const it = aheadRows(m).filter((x) => x.d).map((x) => [x.d, x.n, x.a, x.idx, x.id]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  if (!it.length) return "";
  return `<div class="rkup"><div class="t">${L("upcoming")}</div>${it.slice(0, 3).map((x) => `<div class="rkuc" ${x[3] != null ? `data-a="billOpen" data-i="${x[3]}" role="button" tabindex="0"` : x[4] != null ? `data-a="recapGo" data-k="tx:${x[4]}" role="button" tabindex="0"` : ""}><span class="ub"><b>${+x[0].slice(8)}</b><span>${dshort(x[0]).replace(/[0-9\s]/g, "")}</span></span><span class="ux"><span>${nm(x[1])}</span><small>${dday(x[0])}</small></span><b class="ua">${mi(x[2])}</b></div>`).join("")}</div>`;
}
function budRow(b) {
  const lim = Math.max(1, b.lim), u = Math.min(100, (b.s / lim) * 100), pcv = Math.min(100, (b.pace / lim) * 100);
  const why = b.st == "over" ? L("bOver", { a: mi(b.s - b.lim), s: mi(b.s), l: mi(b.lim) }) : b.st == "warn" ? L("bWarn", { pc: Math.round(b.pc), s: mi(b.s), l: mi(b.lim), left: mi(Math.max(0, b.lim - b.s)) }) : L("bPace", { p: mi(b.pace), a: mi(b.pace - b.lim), l: mi(b.lim) });
  return `<a class="rkbr ${b.st == "over" ? "o" : "w"}" data-a="recapGo" data-k="${esc(ck(b.k))}"><div class="h"><b>${nm(catN(b.k))}</b><span>${L(b.st == "over" ? "over" : b.st == "warn" ? "almost" : "heading")}</span></div><div class="bar"><i style="width:${u.toFixed(1)}%"></i>${b.st == "pace" ? `<em style="inset-inline-start:${pcv.toFixed(1)}%"></em>` : ""}</div><p>${why}</p></a>`;
}

// one card in "Needs your attention": a title, a short tag, why, and where it opens (tone o: red, w: amber)
const attnCard = (tone, name, tag, why, goK, extra) => `<a class="rkbr ${tone}" ${goK ? `data-a="recapGo" data-k="${esc(goK)}"` : ""}><div class="h"><b>${name}</b><span>${tag}</span></div><p>${why}</p>${extra || ""}</a>`;
// what needs a look, each with its kind (b: a budget, j: the jars, c: a category above usual), at most 4
function attnList(m) {
  const out = [...m.over, ...m.risk].map((b) => ({ kind: "b", html: budRow(b) })), short = m.heldEnd - m.endMonth;
  if (m.heldEnd >= 1 && short >= 1) out.push({ kind: "j", html: attnCard("w", L("jarsH"), L("short"), L("jarsShort", { a: mi(m.heldEnd), b: mi(short) }), "jars") });
  const a = m.above.find((x) => !m.over.concat(m.risk).some((b) => b.k == x.k));
  if (a) out.push({ kind: "c", k: a.k, html: attnCard("w", nm(catN(a.k)), L("aboveTag"), L("aboveX", { s: mi(a.s), u: mi(a.u) }), ck(a.k)) });
  return out.slice(0, 4);
}
// the heading, the big line, the line under it and the link say what is in the list: only budgets, only the jars,
// only spending above usual, or a mix (then the line names each kind)
function attnWords(it) {
  const n = (x) => it.filter((o) => o.kind == x).length, nb = n("b"), nj = n("j"), nc = n("c"), kinds = [nb, nj, nc].filter((x) => x).length;
  if (kinds == 1 && nb) return { head: L("attnB"), big: L("needB", { n: nb }, nb), line: "", link: "budg" };
  if (kinds == 1 && nj) return { head: L("attnJ"), big: L("needJ"), line: "", link: "jars" };
  if (kinds == 1) return { head: L("attnC"), big: L("needC"), line: "", link: ck(it[0].k) };
  const parts = [...(nb ? [L("aB", { n: nb }, nb)] : []), ...(nc ? [L("aC", { n: nc }, nc)] : []), ...(nj ? [L("aJ")] : [])];
  return { head: L("attn"), big: L("need", { n: it.length }, it.length), line: new Intl.ListFormat(H() ? "he" : "en", { type: "conjunction" }).format(parts) + ".", link: nb ? "budg" : "jars" };
}

// ---- the parts ----
const PARTS = {
  hero: (m) => `<section class="rkh rr"><h2>${greeting()}</h2><p>${L({ start: "leadStart", mid: "leadMid", end: "leadEnd" }[m.phase], { mon: mname(m.MK) })}</p>${dayScale(m)}</section>`,
  start: (m, zz) => {
    const d = m.cash - m.start, line = Math.abs(d) >= 100 ? chip(d >= 0 ? L("moreToday", { a: mi(d) }) : L("lessToday", { a: mi(-d) }), d >= 0 ? "good" : "warn", "now", L("lbToday", { a: mi(m.cash) })) : "";
    return part(zz, "start", "", L("began", { mon: mname(m.MK) }), "now", mn(m.start), L("beganX", { date: dlong(m.MK + "-01") }) + (line ? `<br>${line}` : ""), "", true);
  },
  // one step of the month (lib/recap.js monthSteps): money in, a credit card bill, or the spending in between
  step: (m, zz, i) => {
    const x = m.steps[i], had = hasStart(m), last = i == m.steps.length - 1, rg = `${x.from}@${x.to}`;
    // why "after card bills" is lower, in brackets after its name: what is due on each day (the first 3)
    const owedWhy = (x) => (x.due.length ? `${L("afterCards")} <span class="qd2">(${x.due.slice(0, 3).map((o) => L("dueOn", { a: mi(o.a), date: dshort(o.d) })).join(", ")}${x.due.length > 3 ? ", …" : ""})</span>` : L("afterCards"));
    const ends = () => [last ? N("inAccounts") : L("stillIn"), x.b1, "", x.owed >= 1 ? [owedWhy(x), x.b1 - x.owed] : null];
    // who paid (or which cards): one line each under the total when there are several, at most 5
    const parts = (L0, k) => {
      if (L0.length < 2) return [];
      const top = L0.slice(0, 5), r = roundParts([...top.map((w) => w[1]), L0.slice(5).reduce((s, w) => s + w[1], 0)], x.a), more = r.pop();
      return [...top.map((w, j) => [nm(w[0]), r[j], "tx:" + w[2], "s"]), ...(L0.length > 5 ? [[k ? lk(k, L("andMore", { n: L0.length - 5 })) : L("andMore", { n: L0.length - 5 }), more, "", "s"]] : [])];
    };
    if (x.kind == "in") {
      const one = x.who.length == 1 ? nm(x.who[0][0]) : L("cameIn"), k = "rng:" + rg + "@income";
      const sum = had ? sumBox([L("hadThen"), x.b0], [{ k: "in", label: one, amt: x.a, link: x.who.length == 1 ? "tx:" + x.who[0][2] : k, subs: parts(x.who, k) }], ends()) : "";
      return part(zz, "in", "tp", L("stepIn", { date: dlong(x.from) }), k, mn(x.a), had ? "" : pills(x.who.slice(0, 3).map((w) => [w[0], w[1], "tx:" + w[2]])), sum);
    }
    if (x.kind == "card") {
      // what the bill paid for: the purchases it was matched to (when they add up to it), else a general line
      const b = x.buys, fit = b && b.n >= 1 && Math.abs(b.a - x.a) <= Math.max(5, x.a * 0.03);
      const why = !fit ? L("stepCardX", {}, x.who.length) : b.n == 1 ? L("payOne", { a: dlong(b.first) }) : b.first == b.last ? L("payDay", { n: b.n, a: dlong(b.first) }) : L("payRange", { n: b.n, a: dlong(b.first), b: dlong(b.last) });
      const subs = fit && x.who.length == 1 ? parts(b.list, "") : parts(x.who, "");
      const sum = had ? sumBox([L("hadThen"), x.b0], [{ k: "out", label: x.who.length == 1 ? nm(x.who[0][0]) : L("cardBill", {}, 2), amt: x.a, link: x.who.length == 1 ? "tx:" + x.who[0][2] : "", subs }], ends()) : "";
      return part(zz, "card", "", L("stepCard", { date: dlong(x.from) }, x.who.length), x.who.length == 1 ? "tx:" + x.who[0][2] : x.from, mn(x.a), why + (had ? "" : pills(x.who.map((w) => [w[0], w[1], "tx:" + w[2]]))), sum);
    }
    const lab = x.from == x.to ? L("stepOn", { date: dlong(x.from) }) : x.to == m.today ? L("stepSince", { a: dlong(x.from) }) : L("stepRange", { a: dlong(x.from), b: dlong(x.to) });
    // what left the accounts, by category; then what was spent by credit card, shown but not counted: it comes out when the card bill is due
    const cats = (top, tot, ty) => {
      if (!top.length) return [];
      const r = roundParts([...top.map((c) => c[1]), Math.max(0, tot - top.reduce((s, c) => s + c[1], 0))], tot), rest = r.pop();
      return [...top.map(([c], j) => [catN(c), r[j], ck(c) + "@" + rg, "s"]), ...(rest >= 1 ? [[L("otherCats"), rest, "rng:" + rg + "@" + ty, "s"]] : [])];
    };
    // the sum: what left the accounts, small amounts in, card bills, and what went on credit cards (shown, not counted)
    const groups = [
      ...(x.bank >= 1 ? [{ k: "out", label: L("paidAcc"), amt: x.bank, link: "rng:" + rg + "@expense", subs: cats(x.topBank, x.bank, "expense") }] : []),
      ...(x.small >= 1 ? [{ k: "in", label: L("smallIn"), amt: x.small, link: "rng:" + rg + "@income" }] : []),
      ...(x.cps >= 1 ? [{ k: "out", label: L("cardBill", {}, 2), amt: x.cps }] : []),
      ...(x.card >= 1 ? [{ k: "card", label: L("cardLater"), amt: x.card, link: "now", subs: cats(x.topCard, x.card, "expense") }] : []),
    ];
    const sum = sumBox(had ? [L("hadThen"), x.b0] : null, groups, had ? ends() : null);
    return part(zz, "out", "tn", lab, "rng:" + rg + "@expense", mn(x.a), "", sum);
  },
  now: (m, zz) => {
    // what you have today, and what is yours once the card spending still to come leaves the accounts
    const P = m.freeParts, cash = Math.round(m.cash), sum = P.cards >= 1 ? sumBox([N("inAccounts"), cash, "now"], [{ k: "out", label: N("cardsUnpaid"), amt: P.cards, link: "now", note: L("cardsLeaveX") }], [L("yoursAfter"), cash - P.cards]) : "";
    // this month so far, compared with the same day last month (or the last 7 days with the 7 before), then each day's spending
    const d = m.same - m.ex, sp = mi(m.ex); let tone = "", txt = L("monthOnly", { a: sp });
    if (m.same >= 100 && m.ex >= 100) { if (Math.abs(d) < Math.max(100, m.same * 0.08)) txt = L("monthSame", { a: sp }); else if (d > 0) (txt = L("monthLess", { a: sp, b: mi(d) })), (tone = "good"); else (txt = L("monthMore", { a: sp, b: mi(-d) })), (tone = "warn"); }
    else { const tr = m.w1 - m.w0; if (m.w0 >= 150 && Math.abs(tr) >= Math.max(100, m.w0 * 0.25)) (txt += " " + L(tr < 0 ? "calmer" : "busier") + "."), (tone = tr < 0 ? "good" : "warn"); }
    return part(zz, "wallet", "", L(m.steps.length ? "left" : "leftToday"), "now", mn(m.cash), L("leftX"), sum + `<div class="rkp">${chip(txt, tone, "out", L("lbMonth"))}</div>` + dayBars(m) + `<p class="rkcap">${L("barsLead")}</p>`);
  },
  // how today's money is split, the same way as on the Jars page: your jars, the cushion, what is planned for the rest of this
  // month (bills and budgets), and what is free. Card purchases not paid yet are taken off too: the card bill will take that money.
  split: (m, zz) => {
    // what is still to come this month, biggest first: what is left in each budget, or a usual month's spending (top 4 and the rest)
    const P = m.freeParts, R0 = Math.round, free = P.free; // whole shekels (homeModel's Free to use), so the lines add up
    const likely = () => {
      const L0 = P.toComeRows, top = L0.slice(0, 4), r = roundParts([...top.map((x) => x.amt), L0.slice(4).reduce((s, x) => s + x.amt, 0)], P.toCome), rest = r.pop();
      return [...top.map((x, i) => [`${catN(x.k)} · ${L("pk." + x.kind)}`, r[i], ck(x.k)]), ...(rest >= 1 ? [[L("otherCats"), rest, "budg"]] : [])];
    };
    // the payments still due this month, by day (their whole amount: a jar that pays one is not counted again under Put aside)
    const ups = m.bills.map((b) => ({ n: b.n, a: b.amt, d: ymd(b.nx), id: b.id })).sort(byDay);
    // put aside: what the jars hold (less what they pay of the payments above) and the safety cushion
    const cush = R0(m.buffer), aside = [...(P.aside - cush >= 1 ? [[t("home.inJars"), P.aside - cush, "jars"]] : []), ...(cush >= 1 ? [[L("cushion"), cush, "jars"]] : [])];
    // the same parts, in the same order, as Home's money flow: card purchases not paid yet, the payments still due, what is
    // left in your budgets, then what is put aside
    const groups = [
      ...(P.cards >= 1 ? [{ k: "out", label: N("cardsUnpaid"), amt: P.cards, link: "now" }] : []),
      ...(P.up >= 1 ? [{ k: "out", label: N("upcoming"), amt: P.up, link: "ahead", subs: payRows(ups, P.up, "bills") }] : []),
      ...(P.toCome >= 1 ? [{ k: "out", label: N("leftBudgets"), amt: P.toCome, link: "budg", tip: L("plannedX"), subs: likely() }] : []),
      ...(P.aside >= 1 ? [{ k: "out", label: N("putAside"), amt: P.aside, link: "jars", subs: aside.length > 1 ? aside : [] }] : []),
    ];
    return part(zz, "pie", free < 0 ? "tn" : "", N("free"), "jars", mn(free), L(free < 0 ? "splitShort" : "splitX"), nowBar(m) + sumBox([N("inAccounts"), R0(m.cash), "now"], groups, [N("free"), free]));
  },
  ahead: (m, zz) => {
    // only what leaves the accounts this month: card charges due this month and the bills still due
    // the line says only what is there: card bills, other bills, or both, and the sum shows each
    const cards = m.cardsThis >= 1, bills = m.billsTot >= 1, ba = m.freeParts.up, ca = m.sure - ba; // the upcoming payments: the same number as everywhere
    const AR = aheadRows(m), cardSubs = payRows(AR.filter((x) => x.card).sort(byDay), ca, "ahead"), billSubs = payRows(AR.filter((x) => !x.card).sort(byDay), ba, "bills");
    // the part a jar pays for, so it is clear why "Free to use" does not take it off again
    const jarLine = m.sureJar >= 1 ? " " + L(m.jarsUsed.length == 1 ? "fromJar" : "fromJars", { a: mi(m.sureJar), jar: nm(m.jarsUsed[0]) }) : "";
    const groups = [...(cards ? [{ k: "out", label: L("cardBill", {}, 2), amt: ca, link: "ahead", subs: cardSubs }] : []), ...(bills ? [{ k: "out", label: N("upcomingS"), amt: ba, link: "bills", subs: billSubs }] : [])];
    return part(zz, "ahead", "", L("stillPay"), "ahead", mn(m.sure), L(cards && bills ? "stillPayX" : cards ? "stillPayC" : "stillPayB") + jarLine,
      aheadBar(m) + sumBox([N("inAccounts"), m.cash, "now"], groups.length ? groups : [{ k: "out", label: L("toPay"), amt: m.sure, link: "ahead" }], [L("willLeft"), m.afterSure]) + upList(m));
  },
  // the card purchases that leave the accounts next month, by card, with the day each card's bill comes
  nextcard: (m, zz) => {
    const first = m.nextCards.reduce((d, c) => (c.d < d ? c.d : d), m.nextCards[0].d), amts = roundParts(m.nextCards.map((c) => c.a), m.cardsNext);
    const subs = m.nextCards.map((c, i) => [`${nm(c.n)} · ${dshort(c.d)}`, amts[i], "now"]);
    // your balance now, the card bills, and what is really yours once they are paid
    const one = m.nextCards.length == 1, sameDay = m.nextCards.every((c) => c.d == first);
    const sum = sumBox([N("inAccounts"), m.cash, "now"], [{ k: "out", label: one ? nm(m.nextCards[0].n) : L("cardBill", {}, 2), amt: m.cardsNext, link: "now", subs: one ? [] : subs }], [L("yoursAfter"), Math.round(m.cash) - Math.round(m.cardsNext), "", null, L("reallyX", { date: dlong(first) })]);
    return part(zz, "card", "", L("nextT"), "now", mn(m.cardsNext), one || !sameDay ? L("nextX", { date: dlong(first) }, m.nextCards.length) : L("nextXs", { date: dlong(first) }), sum);
  },
  attn: (m, zz) => {
    const it = attnList(m);
    if (!it.length) return part(zz, "check", "tp", L("attn"), "budg", `<span class="rkw">${L("allGood")}</span>`, L("allGoodX"));
    const jarBtn = m.heldEnd - m.endMonth >= 1 ? relBtn(m) : "", w = attnWords(it);
    return part(zz, "warn", it.length && m.over.length ? "tn" : "tw", w.head, w.link, `<span class="rkw">${w.big}</span>`, w.line + jarBtn, `<div class="rkbl">${it.map((o) => o.html).join("")}</div>`);
  },
  end: (m) => {
    // the summary of the page: what is in your accounts today and what is expected at the end of the month, small, side by side;
    // then the money you really have, big: today's balance less the card purchases already made and the payments already due
    const really = m.reallyNow;
    const two = `<div class="rkst"><a data-a="recapGo" data-k="now"><span>${N("inAccounts")}</span><b>${mi(m.cash)}</b></a><a data-a="recapGo" data-k="ahead"><span>${N("endMonth", { month: mname(m.MK) })}</span><b>${mi(m.endMonth)}</b></a></div>`;
    return `<section class="rk rr${really < 0 ? " tn" : ""}">${tile("path", really < 0 ? "tn" : "")}<a class="rkl" data-a="recapGo" data-k="now">${L("statusT")}<i>${H() ? "←" : "→"}</i></a>${two}<div class="rkrl">${N("afterKnown")}</div><div class="rkn">${mn(really)}</div><div class="rkp">${L("stReallyX")}</div>${pathChart(m)}</section>`;
  },
  next: (m) => {
    // a prediction for next month, exactly the Forecast page's first month (forecastModel's d.month1): what is really yours
    // on the last day of this month (the balance predicted then, less this month's card purchases not paid yet), plus next
    // month's predicted income, less its predicted spending (card purchases counted in the month bought). An income that did
    // not come every month counts only that share of it.
    const F = FC.value; if (!F) return "";
    // the amounts are the Forecast's own shown numbers (d.shown.next, whole shekels rounded once in forecast.js): each line is
    // the table's "Expected" amount, the totals and the end are the strip's, and they add up exactly
    const m1 = F.d.shown.next, mon = mname(m.nmk), dim1 = new Date(+m.nmk.slice(0, 4), +m.nmk.slice(5, 7), 0).getDate();
    const inc = m1.inc, ex = m1.out, end = m1.end, iT = m1.incT, eT = m1.outT;
    const ia = inc.map((x) => x.a), eTop = ex.slice(0, 4), ea = eTop.map((x) => x.a), eRest = eT - ea.reduce((s, x) => s + x, 0);
    // the same income names as the Forecast page (the name you gave it, or its category), shown in Hebrew through tx()
    const srcN = (k) => (k === "Other income" ? t("forecast.otherInc") : esc(tx(catN(k))));
    const how = (x) => (x.came >= x.of ? L("incSteady") : L("incCame", { came: x.came, of: x.of }));
    const groups = [
      ...(iT >= 1 ? [{ k: "in", label: L("incIn", { mon }), amt: iT, link: "fc", subs: inc.map((x, i) => [`${srcN(x.k)} · ${how(x)}`, ia[i], "fc", "s"]) }] : []),
      ...(eT >= 1 ? [{ k: "out", label: L("spendIn", { mon }), amt: eT, link: "fc", subs: [...eTop.map((x, i) => [catN(x.k), ea[i], "fc", "s"]), ...(eRest >= 1 ? [[L("otherCats"), eRest, "fc", "s"]] : [])] }] : []),
    ];
    const endD = dlong(`${m.nmk}-${p2(dim1)}`);
    return `<section class="rk rr rknext${end < 0 ? " tn" : ""}"><a class="rkl" data-a="recapGo" data-k="fc">${L("nextMonT", { mon })}<i>${H() ? "←" : "→"}</i></a><div class="rkn">${mn(end)}</div><div class="rkp">${L("nextMonX", { mon, date: endD })}</div>${sumBox([N("endMonth", { month: mname(m.MK) }), m1.really, "ahead"], groups, [N("endMonth", { month: mon }), end])}</section>`;
  },






};

// the Forecast page's saved choice of months to learn from
const fcSaved = () => { let z = null; try { z = readJson("moneyFc", null); } catch { /* none saved */ } return fcChoices(z); };
const M = computed(() => (S.value?.tx?.length && home.value ? recapModel(home.value, now.value) : null));
// the Forecast page's numbers, with its saved choices, so "A look at …" shows the same next month
const FC = computed(() => { if (!S.value?.tx?.length || !home.value) return null; return forecastModel(S.value, now.value, data.fx.value.fx, fcSaved(), home.value); });
const html = computed(() => {
  locale.value; // the words follow the language (and the gender, through gen())
  if (!S.value) return "";
  if (!S.value.tx.length) return `<div class="rkw0"><section class="rkh rr"><h2>${L("empty")}</h2><p>${L("emptyX")}</p></section></div>`;
  const m = M.value, order = recapParts(m), out = []; let zc = 0;
  const draw = (p, zz) => (p.startsWith("step:") ? PARTS.step(m, zz, +p.slice(5)) : PARTS[p](m, zz));
  // the first two parts are plain, the last one ends the chain, the ones in between zig-zag
  // "next" (a look at next month) stands on its own under the end of the path
  const nx = order.includes("next") ? PARTS.next(m) : "", path = order.filter((p) => p != "next");
  path.forEach((p, i) => { const zz = i < 2 || i == path.length - 1 ? 0 : zc + 1; const h = draw(p, zz); if (zz && h) zc++; out.push(h); });
  // between the end of the path and next month, a small arrow down shows there is more: a look at next month (it scrolls there)
  const cue = nx ? `<a class="rkdn" data-a="recapNext" role="button" tabindex="0"><span>${L("nextCue")}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></a>` : "";
  const endH = out[out.length - 1].replace('class="rk rr', 'class="rk rr zend'), chain = out.slice(2, -1).join("") + endH;
  return `<div class="rkw0">${out[0]}${out[1] || ""}${chain ? `<div class="rkz">${chain}</div>` : ""}${cue}${nx}</div>`;
});

// ---- opening the matching page, filtered (recapGo) ----
function recapGo(k) {
  const m = M.value; if (!m) return; const last = m.MK + "-" + p2(m.dim);
  if (k == "in") goActivity({ from: m.MK + "-01", to: last, ty: "income" });
  else if (k == "out") goActivity({ from: m.MK + "-01", to: last, ty: "expense" });
  else if (k == "ahead") goActivity({ from: m.today, to: last });
  else if (k == "now") go("/accounts");
  else if (k == "budg") go("/budgets");
  else if (k == "jars") go("/jars");
  else if (k == "bills") go("/bills");
  else if (k == "fc") go("/forecast");
  else if (k == "d7") { const d = new Date(m.today + "T12:00:00"); d.setDate(d.getDate() - 6); goActivity({ from: d.toISOString().slice(0, 10), to: m.today, ty: "expense" }); }
  else if (k.startsWith("cat:")) { const [c, a, b] = k.slice(4).split("@"); goActivity({ cat: decodeURIComponent(c), from: a || m.MK + "-01", to: b || last, ty: "expense" }); }
  else if (k.startsWith("rng:")) { const [a, b, ty] = k.slice(4).split("@"); goActivity({ from: a, to: b, ty }); }
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
  else if (a.dataset.a == "recapNext") box.value.querySelector(".rknext")?.scrollIntoView({ behavior: REDUCE() ? "auto" : "smooth", block: "start" });
}
function onKey(e) { if ((e.key == "Enter" || e.key == " ") && e.target.matches?.('[data-a="billOpen"],[data-a="recapNext"]')) { e.preventDefault(); onClick(e); } }

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
const plain = (x, f) => { const tr0 = x.style.transform, sc = x.style.scale, tn = x.style.transition; x.style.transition = "none"; x.style.transform = "none"; x.style.scale = "1"; const v = f(); x.style.transform = tr0; x.style.scale = sc; x.style.transition = tn; return v; };
function measure(s) {
  const el = s.el, z = el.querySelector(".rkz"), Gm = { zTop: 0, rows: [], shr: [], route: null, end: null }; s.geo = Gm; s.dirty = false;
  el.querySelectorAll(".rkh.rr,.rkw0>.rk.rr,.zend").forEach((x) => { const r = plain(x, () => x.getBoundingClientRect()); Gm.shr.push({ x, cy: (r.top + r.bottom) / 2 + scrollY, k: -1 }); });
  if (!z) return;
  Gm.zTop = z.getBoundingClientRect().top + scrollY; const rows = [...z.querySelectorAll(".rk.z")], end = z.querySelector(".zend"), eT = end && end.querySelector(".rki");
  const cy = (r) => { const n = r.querySelector(".rkni"), c = r.querySelector(".rkcir"); return r.offsetTop + n.offsetTop + c.offsetTop + c.offsetHeight / 2; };
  const pts = rows.map(cy), endY = eT ? end.offsetTop + eT.offsetTop + eT.offsetHeight / 2 : null, rad = (r) => r.querySelector(".rkcir").offsetHeight / 2;
  const zl = z.getBoundingClientRect().left, cx = (host, c) => plain(host, () => { const q = c.getBoundingClientRect(); return (q.left + q.right) / 2; }) - zl;
  // one route from the start icon under the first part, through every circle, to the last circle: [x, y, colour] each, y from the top of .rkz
  const nodes = [], st = el.querySelector(".rkw0>.rk:not(.z)"), sT = st && st.querySelector(".rki");
  // when the circles stand in one column (a phone), the start icon moves onto that column so the line runs straight down
  if (sT) { sT.style.translate = ""; const xs = rows.map((r) => cx(r, r.querySelector(".rkcir"))), one = xs.length > 1 && Math.max(...xs) - Math.min(...xs) < 2; if (one) sT.style.translate = `${xs[0] - cx(st, sT)}px 0`; }
  if (rows.length && sT) nodes.push([cx(st, sT), plain(st, () => { const q = sT.getBoundingClientRect(); return (q.top + q.bottom) / 2; }) + scrollY - Gm.zTop, "var(--acc)"]);
  rows.forEach((r, i) => {
    const c0 = r.querySelector(".rkcir"), bd = r.querySelector(".rkb");
    Gm.rows.push({ r, a: pts[i], R0: rad(r), bt: r.offsetTop + bd.offsetTop, body: bd, circ: c0, mid: r.offsetTop + r.offsetHeight / 2, kb: -1, kc: -1, hit: r.classList.contains("hit") });
    nodes.push([cx(r, c0), pts[i], r.style.getPropertyValue("--pb") || "var(--acc)"]);
  });
  if (end && endY != null) { Gm.end = { el: end, y: endY, t: end.offsetTop }; if (rows.length) nodes.push([cx(end, eT), endY, "var(--acc)"]); }
  route(z, Gm, nodes);
}
// draws the route: a dotted trail for the whole way, a solid line that fills it as you scroll, and a dot at its tip
function route(z, Gm, nodes) {
  let svg = z.querySelector(".rkroute");
  if (nodes.length < 2) { svg?.remove(); return; }
  if (!svg) {
    svg = document.createElementNS(SVGNS, "svg"); svg.setAttribute("class", "rkroute"); svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = '<defs><linearGradient id="rkrg" gradientUnits="userSpaceOnUse" x1="0" x2="0"></linearGradient><filter id="rkgf" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="5"/></filter></defs><path class="tr"/><path class="rkgl" stroke="url(#rkrg)" filter="url(#rkgf)"/><path class="ln" stroke="url(#rkrg)"/><g class="rkhd"><circle class="h" r="12" fill="url(#rkrg)"/><circle class="c" r="6" stroke="url(#rkrg)"/></g>';
    z.insertBefore(svg, z.firstChild);
  }
  const y0 = nodes[0][1], y1 = nodes[nodes.length - 1][1], hh = Math.max(1, y1 - y0), w = z.clientWidth;
  let d = `M${nodes[0][0]} ${y0}`;
  for (let i = 1; i < nodes.length; i++) { const [xa, ya] = nodes[i - 1], [xb, yb] = nodes[i], k = (yb - ya) * 0.5; d += Math.abs(xa - xb) < 1 ? `V${yb}` : `C${xa} ${ya + k} ${xb} ${yb - k} ${xb} ${yb}`; }
  svg.setAttribute("viewBox", `0 ${y0} ${w} ${hh}`); svg.style.top = y0 + "px"; svg.style.width = w + "px"; svg.style.height = hh + "px";
  // the glow's blur reaches past the line, so it gets the whole drawing as its room
  const f = svg.querySelector("filter"); [["x", -20], ["y", y0 - 20], ["width", w + 40], ["height", hh + 40]].forEach(([a, v]) => f.setAttribute(a, v));
  const g = svg.querySelector("linearGradient"); g.setAttribute("y1", y0); g.setAttribute("y2", y1);
  g.innerHTML = nodes.map(([, y, c]) => `<stop offset="${q3((y - y0) / hh)}" style="stop-color:${c}"/>`).join("");
  const [tr, gl, ln] = svg.querySelectorAll("path"); [tr, gl, ln].forEach((x) => x.setAttribute("d", d));
  // points along the line, so a height on the page can be turned into how far the line has come
  const len = ln.getTotalLength(), n = Math.max(2, Math.ceil(len / 6)), xs = [], ys = [], ls = [];
  for (let i = 0; i <= n; i++) { const l = (len * i) / n, p = ln.getPointAtLength(l); ls.push(l); xs.push(p.x); ys.push(p.y); }
  ln.style.strokeDasharray = gl.style.strokeDasharray = len;
  Gm.route = { svg, ln, gl, tip: svg.querySelector(".rkhd"), len, xs, ys, ls, o: -1 };
}
function frame() {
  const s = CUR; if (!s || !s.el.isConnected) return; if (!s.el.getClientRects().length) { s.away = true; return; }
  if (s.away) { s.away = false; s.animate = true; s.dirty = true; s.el.querySelectorAll(".rr").forEach((x) => x.classList.remove("in", "st", "hit")); s.el.querySelector(".rkroute")?.remove(); reveal(s.el, true); }
  if (s.dirty || !s.geo) measure(s);
  const Gm = s.geo, y = scrollY, vh = innerHeight, head = y + vh * 0.86, anim = s.animate && !REDUCE(), move = !REDUCE(), t0 = vh * 0.4, sp = vh * 0.7;
  const kOf = (c) => q3(1 - 0.3 * cl01((t0 - (c - y)) / sp));
  if (Gm.route) drawTo(Gm.route, anim ? head - Gm.zTop : Infinity);
  Gm.rows.forEach((R) => { const top = Gm.zTop + R.a;
    if (!R.hit && (!anim || head >= top - R.R0)) { R.hit = true; R.r.classList.add("hit"); }
    if (!R.r.classList.contains("in") && y + vh * 0.8 >= Gm.zTop + R.bt) showIn(R.r, anim);
    if (move) { const kb = kOf(Gm.zTop + R.mid), kc = kOf(top); if (kb !== R.kb) { R.kb = kb; R.body.style.scale = kb; } if (kc !== R.kc) { R.kc = kc; R.circ.style.scale = kc; } } });
  if (Gm.end && !Gm.end.el.classList.contains("in") && y + vh * 0.8 >= Gm.zTop + Gm.end.t) showIn(Gm.end.el, anim);
  if (move) Gm.shr.forEach((it) => { const k = kOf(it.cy); if (k !== it.k) { it.k = k; it.x.style.scale = k; } });
}
// the line grows down to the height h (never back up), with its dot at the tip; the dot hides at the start and the end
function drawTo(o, h) {
  if (o.svg.rkY > h) h = o.svg.rkY; o.svg.rkY = h; // kept on the element, so a new size keeps how far it had come
  const { ys, ls, xs } = o; let i = 0, j = ys.length - 1, l, x, y;
  if (h >= ys[j]) { l = o.len; x = xs[j]; y = ys[j]; } else if (h <= ys[0]) { l = 0; x = xs[0]; y = ys[0]; } else {
    while (j - i > 1) { const m = (i + j) >> 1; if (ys[m] <= h) i = m; else j = m; }
    const f = ys[j] > ys[i] ? (h - ys[i]) / (ys[j] - ys[i]) : 0; l = ls[i] + f * (ls[j] - ls[i]); x = xs[i] + f * (xs[j] - xs[i]); y = h;
  }
  const v = Math.round(o.len - l); if (v === o.o) return; o.o = v;
  o.ln.style.strokeDashoffset = o.gl.style.strokeDashoffset = v; o.tip.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`); o.tip.classList.toggle("on", v > 2 && l > 2);
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
