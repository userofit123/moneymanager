<script setup>
// Recap: a calm page that tells you how the month is going, step by step:
// parts that change with the time of the month, with pictures, links, day tooltips and a scroll animation.
// What each part holds comes from pagelogic/recap.js (its numbers from lib/recap.js). The page is drawn as one piece of
// markup, so its scroll code can work on it as a whole; every word comes from the language files
// (locales/pages/recap.*.json). The page has no title band.
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import { f0, fm } from "../format.js";
import { dayBarHeights } from "../lib/recap.js";
import { useRecap, ICON, SUMI } from "../pagelogic/recap.js";
import BaseDialog from "../components/BaseDialog.vue";
import "../styles/pages/recap.css"; // this page's own styles

const { t, locale, S, M, H, L, esc, mi, nm, dshort, dday, dfull, p2, parts, recapGo, billOpen, rel, relAmt, doRelease, dayTip } = useRecap();
const mn = (n) => `<bdi class="rkc">${n < 0 ? "−" : ""}<small>₪</small><span class="cnt" data-v="${Math.round(Math.abs(n))}">${f0(n)}</span></bdi>`;

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
// a sum as a stack of small cards: what you had on top, a card for each change (a gradient block with its icon, its name in
// that colour with a short line under it, the amount with its sign, and what it is made of), and the result as the last card.
// sumBox(had, groups, end): had and end are [label, amount, link]; a group is { k: "out" | "in" | "card", label, amt, link, subs, note }.
// A "card" group (spent by credit card) is shown but not counted: no sign, a quiet amount and a "leaves later" tag by its
// name, whose tooltip explains it.
const SUMK = { out: ["var(--neg)", "var(--c2)", "−"], in: ["var(--pos)", "var(--c3)", "+"], card: ["var(--acc2)", "var(--acc)", ""], end: ["var(--acc)", "var(--acc2)", ""] };
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
const dayScale = (m) => { let s = ""; for (let d = 1; d <= m.dim; d++) s += `<i class="${d < m.day ? "p" : d == m.day ? "n" : ""}" data-d="${d}" role="button" tabindex="0" aria-label="${esc(dfull(m.MK + "-" + p2(d)))}" style="--i:${d}"></i>`;
  return `<div class="rkds"><div class="rkdt">${s}</div><div class="rkdl"><span>${L("dayOf", { d: m.day, n: m.dim })}</span><span>${m.dim - m.day > 0 ? L("daysLeft", { n: m.dim - m.day }, m.dim - m.day) : L("lastDay")}</span></div><div class="rktip" hidden></div></div>`; };
// one bar per day; days run left to right in Hebrew too, like every chart over time
function dayBars(m) {
  const W = 600, Hh = 96, gap = 4, n = m.dim, bw = (W - gap * (n - 1)) / n, hs = dayBarHeights(m, Hh); let s = "";
  for (let i = 0; i < n; i++) { const x = i * (bw + gap); s += hs[i] != null ? `<rect x="${x}" y="${Hh - hs[i]}" width="${bw}" height="${hs[i]}" rx="${Math.min(4, bw / 2)}" class="${i == m.day - 1 ? "t" : "b"} gr" style="--i:${i}"/>` : `<rect x="${x}" y="${Hh - 2}" width="${bw}" height="2" rx="1" class="f"/>`; }
  return `<div class="rkbw"><svg class="rkv bars" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" role="img" aria-label="${esc(L("barsAria"))}">${s}</svg><div class="rktip" hidden></div></div>`;
}
function pathChart(vals) {
  const m = M.value, W = 600, Hh = 110, px = 18, top = 14, bot = 14, xs = [px, px + (W - 2 * px) * Math.min(1, Math.max(0.05, m.day / m.dim)), W - px];
  const lo = Math.min(...vals), hi = Math.max(...vals), span = Math.max(1, hi - lo), Y = (v) => Hh - bot - ((v - lo) / span) * (Hh - top - bot);
  const ys = vals.map(Y), a = `${xs[0]},${ys[0]} ${xs[1]},${ys[1]}`;
  return `<div class="rkpw" style="--x:${((xs[1] / W) * 100).toFixed(2)}%;--f:${(xs[1] / W).toFixed(4)};--y:${((ys[1] / Hh) * 100).toFixed(2)}%"><svg class="rkv path" viewBox="0 0 ${W} ${Hh}" aria-hidden="true"><defs><linearGradient id="rkg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".28"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs><line x1="${px}" x2="${W - px}" y1="${Hh - bot + 8}" y2="${Hh - bot + 8}" class="ax"/><polygon points="${xs[0]},${Hh - bot + 8} ${a} ${xs[1]},${Hh - bot + 8}" fill="url(#rkg)" class="ar"/><polyline points="${a}" class="ln" pathLength="1"/><polyline points="${xs[1]},${ys[1]} ${xs[2]},${ys[2]}" class="ln d"/><circle cx="${xs[0]}" cy="${ys[0]}" r="5" class="dt"/><circle cx="${xs[1]}" cy="${ys[1]}" r="7" class="dn"/><circle cx="${xs[2]}" cy="${ys[2]}" r="5" class="dt e"/></svg><div class="rkpt"><span>${L("pToday")}</span><b>${mi(vals[1])}</b></div><i class="rkpa"></i></div><div class="rkpl"><div><span>${L("pStart")}</span><b>${mi(vals[0])}</b></div><div><span>${L("pEnd")}</span><b>${mi(vals[2])}</b></div></div>`;
}
// the jars chip's follow-up: the same kind of chip, but it acts (opens the take-back window)
const relBtn = (r) => note("a", `warn" data-a="jarRelease" role="button" tabindex="0" data-tip="${esc(r.tip)}"`, "warn", r.lab, r.txt);
// the payments still due this month, by date (the first 3), each opening its bill or payment
function upList(it) {
  if (!it.length) return "";
  return `<div class="rkup"><div class="t">${L("upcoming")}</div>${it.slice(0, 3).map((x) => `<div class="rkuc" ${x[3] != null ? `data-a="billOpen" data-i="${x[3]}" role="button" tabindex="0"` : x[4] != null ? `data-a="recapGo" data-k="tx:${x[4]}" role="button" tabindex="0"` : ""}><span class="ub"><b>${+x[0].slice(8)}</b><span>${dshort(x[0]).replace(/[0-9\s]/g, "")}</span></span><span class="ux"><span>${nm(x[1])}</span><small>${dday(x[0])}</small></span><b class="ua">${mi(x[2])}</b></div>`).join("")}</div>`;
}
// one card in "Needs your attention": a title, a short tag, a budget's bar, why, and where it opens (tone o: red, w: amber)
const attnCard = (o) => `<a class="rkbr ${o.tone}" ${o.go ? `data-a="recapGo" data-k="${esc(o.go)}"` : ""}><div class="h"><b>${o.name}</b><span>${o.tag}</span></div>${o.bar ? `<div class="bar"><i style="width:${o.bar.u.toFixed(1)}%"></i>${o.bar.pace != null ? `<em style="inset-inline-start:${o.bar.pace.toFixed(1)}%"></em>` : ""}</div>` : ""}<p>${o.why}</p></a>`;

// ---- drawing the parts (pagelogic/recap.js says what each holds) ----
const chipH = (c) => chip(c.txt, c.tone, c.go, c.lab);
const lineH = (L0) => L0.map((x) => (x.pills ? pills(x.pills) : x.chip ? (x.br ? "<br>" : "") + chipH(x.chip) : x.rel ? relBtn(x.rel) : x.html)).join("");
const visH = (m, V) => V.map((v) => (v.sum ? sumBox(v.sum.had, v.sum.groups, v.sum.end) : v.chip ? `<div class="rkp">${chipH(v.chip)}</div>` : v.bars ? dayBars(m) : v.cap ? `<p class="rkcap">${v.cap}</p>` : v.seg ? segBar(v.seg) : v.up ? upList(v.up) : v.attn ? `<div class="rkbl">${v.attn.map(attnCard).join("")}</div>` : "")).join("");
const bigH = (b) => (b.word != null ? `<span class="rkw">${b.word}</span>` : mn(b.amt));
const arrow = () => `<i>${H() ? "←" : "→"}</i>`;
const DRAW = {
  hero: (m, s) => `<section class="rkh rr"><h2>${s.greet}</h2><p>${s.lead}</p>${dayScale(m)}</section>`,
  end: (m, s) => {
    const two = `<div class="rkst">${s.two.map((x) => `<a data-a="recapGo" data-k="${x[2]}"><span>${x[0]}</span><b>${mi(x[1])}</b></a>`).join("")}</div>`;
    return `<section class="rk rr${s.tone ? " " + s.tone : ""}">${tile("path", s.tone)}<a class="rkl" data-a="recapGo" data-k="${s.go}">${s.label}${arrow()}</a>${two}<div class="rkrl">${s.rl}</div><div class="rkn">${bigH(s.big)}</div><div class="rkp">${s.line}</div>${pathChart(s.path)}</section>`;
  },
  next: (m, s) => `<section class="rk rr rknext${s.tone ? " " + s.tone : ""}"><a class="rkl" data-a="recapGo" data-k="${s.go}">${s.label}${arrow()}</a><div class="rkn">${bigH(s.big)}</div><div class="rkp">${s.line}</div>${sumBox(s.sum.had, s.sum.groups, s.sum.end)}</section>`,
};
const draw = (m, s, zz) => (DRAW[s.kind] ? DRAW[s.kind](m, s) : part(zz, s.ic, s.tone, s.label, s.go, bigH(s.big), lineH(s.line), visH(m, s.vis), s.last));
const html = computed(() => {
  locale.value; // the words follow the language (and the gender, through gen())
  if (!S.value) return "";
  if (!S.value.tx.length) return `<div class="rkw0"><section class="rkh rr"><h2>${L("empty")}</h2><p>${L("emptyX")}</p></section></div>`;
  const m = M.value, P = parts.value, out = []; let zc = 0;
  if (!m) return "";
  // the first two parts are plain, the last one ends the chain, the ones in between zig-zag
  // "next" (a look at next month) stands on its own under the end of the path
  const ns = P.find((s) => s.p == "next"), nx = ns && !ns.none ? draw(m, ns) : "", path = P.filter((s) => s.p != "next");
  path.forEach((s, i) => { const zz = i < 2 || i == path.length - 1 ? 0 : zc + 1; const h = draw(m, s, zz); if (zz && h) zc++; out.push(h); });
  // between the end of the path and next month, a small arrow down shows there is more: a look at next month (it scrolls there)
  const cue = nx ? `<a class="rkdn" data-a="recapNext" role="button" tabindex="0"><span>${L("nextCue")}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></a>` : "";
  const endH = out[out.length - 1].replace('class="rk rr', 'class="rk rr zend'), chain = out.slice(2, -1).join("") + endH;
  return `<div class="rkw0">${out[0]}${out[1] || ""}${chain ? `<div class="rkz">${chain}</div>` : ""}${cue}${nx}</div>`;
});

const box = ref(null);
function onClick(e) {
  const a = e.target.closest("[data-a]"); if (!a || !box.value.contains(a)) return;
  if (a.dataset.a == "recapGo") recapGo(a.dataset.k); else if (a.dataset.a == "billOpen") billOpen(+a.dataset.i); else if (a.dataset.a == "jarRelease") rel.value = true;
  else if (a.dataset.a == "recapNext") box.value.querySelector(".rknext")?.scrollIntoView({ behavior: REDUCE() ? "auto" : "smooth", block: "start" });
}
function onKey(e) { if ((e.key == "Enter" || e.key == " ") && e.target.matches?.('[data-a="billOpen"],[data-a="recapNext"]')) { e.preventDefault(); onClick(e); } }

// ---- the day tooltips (wireDays, wireBars) ----
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
  const idx = (e) => { const r = svg.getBoundingClientRect(); return Math.max(1, Math.min(n, Math.floor(((e.clientX - r.left) / r.width) * n) + 1)); };
  const show = (i) => { const D = m.days[i - 1]; if (!D) return; svg.querySelectorAll("rect").forEach((x, k) => x.classList.toggle("hv", k == i - 1));
    tip.innerHTML = dayTip(D, i > m.day, i == m.day); tip.hidden = false; cur = i;
    const a = w.getBoundingClientRect(), r = svg.getBoundingClientRect(), fr = i - 0.5, cx = r.left + (fr / n) * r.width - a.left, tw = tip.offsetWidth;
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
  // a part shows once 30% of it is well inside the window; a look at next month (tall, and last on the page, so it could only
  // show at the very end) starts to show as soon as its top comes into view
  const io = (o) => { const ob = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; showIn(e.target, true); ob.unobserve(e.target); }), o); return ob; };
  const main = io({ threshold: 0.3, rootMargin: "0px 0px -18% 0px" }), early = io({ threshold: 0, rootMargin: "0px 0px -4% 0px" });
  IO = { disconnect: () => { main.disconnect(); early.disconnect(); } };
  items.forEach((x) => (x.classList.contains("rknext") ? early : main).observe(x));
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
