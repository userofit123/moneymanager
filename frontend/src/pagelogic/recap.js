// What the Recap knows and does, without the screen: the month's story as a list of parts (the order and numbers from
// lib/recap.js), each part's words, amounts, sums and lists; where each link goes (recapGo), a bill's last payment
// (billOpen), "Take back from the jars" and what a day held (dayTip). Used by the computer's Recap page (views/Recap.vue),
// which draws the parts as one piece of markup, and by the phone's Recap screen, so both show the same numbers.
// Words with an amount inside come as markup (amounts in <bdi class="rkc">), the same on both.
import { ref, computed, onMounted } from "vue";
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
import { recapModel, recapParts, roundParts, hasStart } from "../lib/recap.js";
import { forecastModel, fcChoices } from "../lib/forecast.js";

// The greeting moves one step along its list every time the app opens (kept in this browser as "moneyGreet").
const SEED = (() => { let n = 1; try { n = (parseInt(readPref("moneyGreet"), 10) || 0) + 1; writePref("moneyGreet", String(n)); } catch { /* not kept */ } return n; })();

// each part's picture, and the signs in a sum (money out, in, spent by card, the result)
export const ICON = {
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
export const SUMI = { out: '<path d="M7 17 17 7M9 7h8v8"/>', in: '<path d="M17 7 7 17M15 17H7V9"/>', card: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>', end: '<path d="M6 9.5h12M6 14.5h12"/>' };

export function useRecap() {
  const { t, locale } = useI18n();
  const S = computed(() => data.state.value);
  onMounted(() => { data.start(); });

  // Hebrew follows the profile's gender (gen() in core/heText.js; its rules are loaded only for Hebrew).
  const H = () => locale.value === "he";
  const G = (s) => (H() ? gen(s) : s);
  const L = (k, p, n) => G(n == null ? t("recap." + k, p || {}) : t("recap." + k, p || {}, n));
  // the name of one of the app's key numbers (lib/keyNumbers.js), the same on every page
  const N = (k, p) => G(t("num." + k, p || {}));

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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
  const lk = (k, txt) => `<a class="rklk" data-a="recapGo" data-k="${esc(k)}">${txt}</a>`;
  const ck = (c) => "cat:" + encodeURIComponent(c);

  function greeting() {
    const p = S.value?.cfg?.profile || {}, name = String(p.name || "").trim(), h = now.value.getHours(), band = h < 1 ? "n" : h < 5 ? "l" : h < 12 ? "m" : h < 17 ? "a" : h < 21 ? "e" : "n";
    const g = p.gender == "f" || p.gender == "m" ? p.gender : "o";
    let s = t("recap.greet." + g + "." + band + "." + (SEED % 4), { n: "\u0001" });
    if (!name) s = s.replace(/,? ?\u0001/, ""); // eslint-disable-line no-control-regex -- \u0001 marks where the name goes
    return esc(s).replace("\u0001", "<bdi>" + esc(name) + "</bdi>");
  }

  // ---- what each part holds ----
  // A part: { ic, tone, label, go, big, line, vis, last } where big is { amt } or { word }, line a list of
  // { html } | { pills } | { chip, br } | { rel }, and vis a list of { sum } | { chip } | { bars } | { cap } | { seg } | { up } | { attn }.
  // A sum: { had, groups, end }: had and end are [label, amount, link]; a group is { k: "out" | "in" | "card", label, amt, link, subs, note }.
  // A "card" group (spent by credit card) is shown but not counted. end[3]: [label, amount], a smaller line under the result.
  const chipOf = (txt, tone, goK, lab) => ({ txt, tone, go: goK, lab });
  // the jars chip's follow-up: the same kind of chip, but it acts (opens the take-back window)
  const relOf = (m) => (m.over0 > 0 ? { lab: L("jarsH"), txt: L("relBtn", { a: mi(Math.min(m.over0, m.inJars)) }), tip: L("relX") } : null);
  const nowBar = (m) => { const P = m.freeParts; return [[N("cardsUnpaid"), P.cards, "c4", "now"], [N("upcomingS"), P.up, "c5", "ahead"], [N("leftBudgets"), P.toCome, "c2", "budg"], [N("putAside"), P.aside, "c3", "jars"], [N("free"), Math.max(0, P.free), "c1", "now"]]; };
  const aheadBar = (m) => [[N("cardBillsS"), m.freeParts.cardBills, "c1", "now"], [N("upcomingS"), m.freeParts.up, "c2", "bills"]];
  // the payments still due this month: each card's bill and each bill or listed payment, with its day (yyyy-mm-dd)
  const ymd = (d) => (d instanceof Date ? `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` : d || null);
  const aheadRows = (m) => [...m.cardsNow.map((c) => ({ card: true, n: c.n, a: c.a, d: c.d })), ...m.bills.map((b) => ({ n: b.n, a: b.amt, d: ymd(b.nx), idx: b.idx, id: b.id, cov: b.cov || 0 }))];
  // rows for a sum: each payment with its day, in whole shekels that add up to their line (tot)
  const byDay = (a, b) => ((a.d || "9") < (b.d || "9") ? -1 : 1);
  const payRows = (L0, tot, link) => { const r = roundParts(L0.map((x) => x.a), tot); return L0.map((x, i) => [x.d ? `${nm(x.n)} · ${dshort(x.d)}` : nm(x.n), r[i], x.id != null ? "tx:" + x.id : link, "s"]); };
  // the same payments as the sum above it, by date: card bills still due this month and every bill or payment listed for later
  // (each [day, name, amount, bill index, transaction id])
  const upItems = (m) => aheadRows(m).filter((x) => x.d).map((x) => [x.d, x.n, x.a, x.idx, x.id]).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  // a budget in "Needs your attention": its name, a short tag, why, how full it is (u) and where the usual pace is (pace)
  function budItem(b) {
    const lim = Math.max(1, b.lim), u = Math.min(100, (b.s / lim) * 100), pcv = Math.min(100, (b.pace / lim) * 100);
    const why = b.st == "over" ? L("bOver", { a: mi(b.s - b.lim), s: mi(b.s), l: mi(b.lim) }) : b.st == "warn" ? L("bWarn", { pc: Math.round(b.pc), s: mi(b.s), l: mi(b.lim), left: mi(Math.max(0, b.lim - b.s)) }) : L("bPace", { p: mi(b.pace), a: mi(b.pace - b.lim), l: mi(b.lim) });
    return { kind: "b", tone: b.st == "over" ? "o" : "w", name: nm(catN(b.k)), tag: L(b.st == "over" ? "over" : b.st == "warn" ? "almost" : "heading"), why, go: ck(b.k), bar: { u, pace: b.st == "pace" ? pcv : null } };
  }
  // what needs a look, each with its kind (b: a budget, j: the jars, c: a category above usual), at most 4
  function attnList(m) {
    const out = [...m.over, ...m.risk].map(budItem), short = m.heldEnd - m.endMonth;
    if (m.heldEnd >= 1 && short >= 1) out.push({ kind: "j", tone: "w", name: L("jarsH"), tag: L("short"), why: L("jarsShort", { a: mi(m.heldEnd), b: mi(short) }), go: "jars" });
    const a = m.above.find((x) => !m.over.concat(m.risk).some((b) => b.k == x.k));
    if (a) out.push({ kind: "c", k: a.k, tone: "w", name: nm(catN(a.k)), tag: L("aboveTag"), why: L("aboveX", { s: mi(a.s), u: mi(a.u) }), go: ck(a.k) });
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
  // the path in "Where you stand": the start of the month, today and the end of the month
  const pathVals = (m) => [isFinite(m.start) ? m.start : m.cash, m.cash, m.endMonth];

  // ---- the parts ----
  const PARTS = {
    hero: (m) => ({ kind: "hero", greet: greeting(), lead: L({ start: "leadStart", mid: "leadMid", end: "leadEnd" }[m.phase], { mon: mname(m.MK) }) }),
    start: (m) => {
      const d = Math.round(m.cash) - m.start, chip = Math.abs(d) >= 100 ? chipOf(d >= 0 ? L("moreToday", { a: mi(d) }) : L("lessToday", { a: mi(-d) }), d >= 0 ? "good" : "warn", "now", L("lbToday", { a: mi(m.cash) })) : null;
      return { ic: "start", tone: "", label: L("began", { mon: mname(m.MK) }), go: "now", big: { amt: m.start }, line: [{ html: m.startReal ? L("beganSaved", { date: dlong(m.startOn) }) : L("beganX", { date: dlong(m.MK + "-01") }) }, ...(chip ? [{ chip, br: true }] : [])], vis: [], last: true };
    },
    // one step of the month (lib/recap.js monthSteps): money in, a credit card bill, or the spending in between
    step: (m, i) => {
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
        const sum = had ? [{ sum: { had: [L("hadThen"), x.b0], groups: [{ k: "in", label: one, amt: x.a, link: x.who.length == 1 ? "tx:" + x.who[0][2] : k, subs: parts(x.who, k) }], end: ends() } }] : [];
        return { step: "in", ic: "in", tone: "tp", label: L(x.sal ? "stepSal" : "stepIn", { date: dlong(x.from) }), go: k, big: { amt: x.a }, line: had ? [] : [{ pills: x.who.slice(0, 3).map((w) => [w[0], w[1], "tx:" + w[2]]) }], vis: sum };
      }
      if (x.kind == "card") {
        // what the bill paid for: the purchases it was matched to (when they add up to it), else a general line
        const b = x.buys, fit = b && b.n >= 1 && Math.abs(b.a - x.a) <= Math.max(5, x.a * 0.03);
        const why = !fit ? L("stepCardX", {}, x.who.length) : b.n == 1 ? L("payOne", { a: dlong(b.first) }) : b.first == b.last ? L("payDay", { n: b.n, a: dlong(b.first) }) : L("payRange", { n: b.n, a: dlong(b.first), b: dlong(b.last) });
        const subs = fit && x.who.length == 1 ? parts(b.list, "") : parts(x.who, "");
        const sum = had ? [{ sum: { had: [L("hadThen"), x.b0], groups: [{ k: "out", label: x.who.length == 1 ? nm(x.who[0][0]) : L("cardBill", {}, 2), amt: x.a, link: x.who.length == 1 ? "tx:" + x.who[0][2] : "", subs }], end: ends() } }] : [];
        return { step: "card", ic: "card", tone: "", label: L("stepCard", { date: dlong(x.from) }, x.who.length), go: x.who.length == 1 ? "tx:" + x.who[0][2] : x.from, big: { amt: x.a }, line: [{ html: why }, ...(had ? [] : [{ pills: x.who.map((w) => [w[0], w[1], "tx:" + w[2]]) }])], vis: sum };
      }
      // what the steps above do not show (only with a saved start): it keeps the steps adding up to today's balance
      if (x.kind == "other") {
        const sum = had ? [{ sum: { had: [L("hadThen"), x.b0], groups: [{ k: x.up ? "in" : "out", label: L("otherCh"), amt: x.a }], end: ends() } }] : [];
        return { step: "other", ic: "info", tone: "", label: L(x.up ? "stepOtherUp" : "stepOtherDown"), go: "", big: { amt: x.a }, line: [{ html: L("stepOtherX") }], vis: sum };
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
        ...(x.backBank >= 1 ? [{ k: "in", label: L("backIn"), amt: x.backBank, link: "rng:" + rg + "@back" }] : []),
        ...(x.cps >= 1 ? [{ k: "out", label: L("cardBill", {}, 2), amt: x.cps }] : []),
        ...(x.card >= 1 ? [{ k: "card", label: L("cardLater"), amt: x.card, link: "now", subs: cats(x.topCard, x.card, "expense") }] : []),
      ];
      // what came in during it, said plainly next to what was spent (money back on the cards too)
      const came = x.back >= 1 || x.small >= 1 ? [L("lnSpent", { a: mi(x.a) }), ...(x.back >= 1 ? [L("lnBack", { a: mi(x.back) })] : []), ...(x.small >= 1 ? [L("lnIn", { a: mi(x.small) })] : [])].join(" · ") : "";
      return { step: "out", ic: "out", tone: "tn", label: lab, go: "rng:" + rg + "@expense", big: { amt: x.a }, line: came ? [{ html: came }] : [], vis: [{ sum: { had: had ? [L("hadThen"), x.b0] : null, groups, end: had ? ends() : null } }] };
    },
    now: (m) => {
      // card purchases not paid yet: with both parts there, the card bills still due this month and the purchases charged after it
      const cardsGroup = (P) => ({ k: "out", label: N("cardsUnpaid"), amt: P.cards, link: "now", ...(P.cardBills >= 1 && P.later >= 1 ? { subs: [[N("cardBills"), P.cardBills, "ahead", "s"], [N("cardsLater"), P.later, "now", "s"]] } : { note: L("cardsLeaveX") }) });
      // what you have today, and what is yours once the card spending still to come leaves the accounts
      const P = m.freeParts, cash = Math.round(m.cash), sum = P.cards >= 1 ? [{ sum: { had: [N("inAccounts"), cash, "now"], groups: [cardsGroup(P)], end: [L("yoursAfter"), cash - P.cards] } }] : [];
      // this month so far, compared with the same day last month (or the last 7 days with the 7 before), then each day's spending
      const d = m.same - m.ex, sp = mi(m.ex); let tone = "", txt = L("monthOnly", { a: sp });
      if (m.same >= 100 && m.ex >= 100) { if (Math.abs(d) < Math.max(100, m.same * 0.08)) txt = L("monthSame", { a: sp }); else if (d > 0) (txt = L("monthLess", { a: sp, b: mi(d) })), (tone = "good"); else (txt = L("monthMore", { a: sp, b: mi(-d) })), (tone = "warn"); }
      else { const tr = m.w1 - m.w0; if (m.w0 >= 150 && Math.abs(tr) >= Math.max(100, m.w0 * 0.25)) (txt += " " + L(tr < 0 ? "calmer" : "busier") + "."), (tone = tr < 0 ? "good" : "warn"); }
      return { ic: "wallet", tone: "", label: L(m.steps.length ? "left" : "leftToday"), go: "now", big: { amt: m.cash }, line: [{ html: L("leftX") }], vis: [...sum, { chip: chipOf(txt, tone, "out", L("lbMonth")) }, { bars: true }, { cap: L("barsLead") }] };
    },
    // how today's money is split, the same way as on the Jars page: your jars, the cushion, what is planned for the rest of this
    // month (bills and budgets), and what is free. Card purchases not paid yet are taken off too: the card bill will take that money.
    split: (m) => {
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
      return { ic: "pie", tone: free < 0 ? "tn" : "", label: N("free"), go: "jars", big: { amt: free }, line: [{ html: L(free < 0 ? "splitShort" : "splitX") }], vis: [{ seg: nowBar(m) }, { sum: { had: [N("inAccounts"), R0(m.cash), "now"], groups, end: [N("free"), free] } }] };
    },
    ahead: (m) => {
      // only what leaves the accounts this month: card charges due this month and the bills still due
      // the line says only what is there: card bills, other bills, or both, and the sum shows each
      const ba = m.freeParts.up, ca = m.freeParts.cardBills, cards = ca >= 1, bills = ba >= 1; // the key numbers' amounts: the same everywhere
      const AR = aheadRows(m), cardSubs = payRows(AR.filter((x) => x.card).sort(byDay), ca, "ahead"), billSubs = payRows(AR.filter((x) => !x.card).sort(byDay), ba, "bills");
      // the part a jar pays for, so it is clear why "Free to use" does not take it off again
      const jarLine = m.sureJar >= 1 ? " " + L(m.jarsUsed.length == 1 ? "fromJar" : "fromJars", { a: mi(m.sureJar), jar: nm(m.jarsUsed[0]) }) : "";
      const groups = [...(cards ? [{ k: "out", label: N("cardBills"), amt: ca, link: "ahead", subs: cardSubs }] : []), ...(bills ? [{ k: "out", label: N("upcomingS"), amt: ba, link: "bills", subs: billSubs }] : [])];
      return { ic: "ahead", tone: "", label: L("stillPay"), go: "ahead", big: { amt: m.sure }, line: [{ html: L(cards && bills ? "stillPayX" : cards ? "stillPayC" : "stillPayB") + jarLine }],
        vis: [{ seg: aheadBar(m) }, { sum: { had: [N("inAccounts"), m.cash, "now"], groups: groups.length ? groups : [{ k: "out", label: L("toPay"), amt: m.sure, link: "ahead" }], end: [L("willLeft"), m.afterSure] } }, { up: upItems(m) }] };
    },
    // the card purchases charged after this month, by card, with the day each card's bill comes (the key numbers' "charged after
    // this month": early in the month, a card bill is often still due this month, so this is not always the next bill)
    nextcard: (m) => {
      const later = m.freeParts.later, first = m.nextCards.reduce((d, c) => (c.d < d ? c.d : d), m.nextCards[0].d), amts = roundParts(m.nextCards.map((c) => c.a), later);
      const subs = m.nextCards.map((c, i) => [`${nm(c.n)} · ${dshort(c.d)}`, amts[i], "now"]);
      // what is left after the payments of this month (the part before), these card bills, and your money after known payments
      // once they are paid: the same number as Where you stand now
      const one = m.nextCards.length == 1, sameDay = m.nextCards.every((c) => c.d == first), had = m.sure >= 1 ? [L("willLeft"), m.afterSure, "ahead"] : [N("inAccounts"), Math.round(m.cash), "now"];
      const sum = { had, groups: [{ k: "out", label: one ? nm(m.nextCards[0].n) : L("cardBill", {}, 2), amt: later, link: "now", subs: one ? [] : subs }], end: [N("afterKnown"), had[1] - later, "", null, L("reallyX", { date: dlong(first) })] };
      return { ic: "card", tone: "", label: N("cardsLater"), go: "now", big: { amt: later }, line: [{ html: one || !sameDay ? L("nextX", { date: dlong(first) }, m.nextCards.length) : L("nextXs", { date: dlong(first) }) }], vis: [{ sum }] };
    },
    attn: (m) => {
      const it = attnList(m);
      if (!it.length) return { ic: "check", tone: "tp", label: L("attn"), go: "budg", big: { word: L("allGood") }, line: [{ html: L("allGoodX") }], vis: [] };
      const rel = m.heldEnd - m.endMonth >= 1 ? relOf(m) : null, w = attnWords(it);
      return { ic: "warn", tone: it.length && m.over.length ? "tn" : "tw", label: w.head, go: w.link, big: { word: w.big }, line: [{ html: w.line }, ...(rel ? [{ rel }] : [])], vis: [{ attn: it }] };
    },
    // the summary of the page: what is in your accounts today and what is expected at the end of the month, small, side by side;
    // then the money you really have, big: today's balance less the card purchases already made and the payments already due
    end: (m) => ({ kind: "end", tone: m.reallyNow < 0 ? "tn" : "", label: L("statusT"), go: "now", two: [[N("inAccounts"), m.cash, "now"], [N("endMonth", { month: mname(m.MK) }), m.endMonth, "ahead"]], rl: N("afterKnown"), big: { amt: m.reallyNow }, line: L("stReallyX") + " " + L("stEndX", { mon: mname(m.MK), inc: mi(m.incLeft), out: mi(m.likely), end: mi(m.endMonth) }), path: pathVals(m), pathL: [L("pStart"), L("pToday"), L("pEnd")] }),
    next: (m) => {
      // a prediction for next month, exactly the Forecast page's first month (forecastModel's d.month1): what is really yours
      // on the last day of this month (the balance predicted then, less this month's card purchases not paid yet), plus next
      // month's predicted income, less its predicted spending (card purchases counted in the month bought). An income that did
      // not come every month counts only that share of it.
      const F = FC.value; if (!F) return null;
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
      return { kind: "next", tone: end < 0 ? "tn" : "", label: L("nextMonT", { mon }), go: "fc", big: { amt: end }, line: L("nextMonX", { mon, date: endD }), sum: { had: [N("endMonth", { month: mname(m.MK) }), m1.really, "ahead"], groups, end: [N("endMonth", { month: mon }), end] } };
    },
  };

  // the Forecast page's saved choice of months to learn from
  const fcSaved = () => { let z = null; try { z = readJson("moneyFc", null); } catch { /* none saved */ } return fcChoices(z); };
  const M = computed(() => (S.value?.tx?.length && home.value ? recapModel(home.value, now.value) : null));
  // the Forecast page's numbers, with its saved choices, so "A look at …" shows the same next month
  const FC = computed(() => { if (!S.value?.tx?.length || !home.value) return null; return forecastModel(S.value, now.value, data.fx.value.fx, fcSaved(), home.value); });
  // the parts in their order (lib/recap.js recapParts): [{ p: name, ...what it holds }]; "next" is null without a forecast
  const parts = computed(() => {
    locale.value; // the words follow the language (and the gender, through gen())
    const m = M.value; if (!m) return [];
    return recapParts(m).map((p) => ({ p, ...(p.startsWith("step:") ? PARTS.step(m, +p.slice(5)) : PARTS[p](m) || { none: true }) }));
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

  // ---- what a day held (dayTip): money in, spent (the biggest 3 each) and what is expected ----
  function dayTip(D, future, today, hint = true) {
    const row = (a, b) => `<div class="r"><span>${nm(a)}</span><b>${mi(b)}</b></div>`, top = (L0) => [...L0].sort((x, y) => y[1] - x[1]).slice(0, 3).map((x) => row(x[0], x[1])).join("");
    let b = `<div class="h">${dfull(D.d)}${today ? ` · ${L("today")}` : ""}</div>`;
    if (D.inc > 0) b += `<div class="s pos">${L("tCameIn")} <b>${mi(D.inc)}</b></div>` + top(D.inn);
    if (D.spent > 0) b += `<div class="s neg">${L("tSpent")} <b>${mi(D.spent)}</b></div>` + top(D.ex) + (D.ex.length > 3 ? `<div class="m">${L("andMore", { n: D.ex.length - 3 })}</div>` : "");
    if (D.up.length) b += `<div class="s">${L("expected")}</div>` + D.up.map((x) => row(x[0], x[1])).join("");
    if (D.inc <= 0 && D.spent <= 0 && !D.up.length) b += `<div class="m">${future ? L("nothingPlanned") : L("nothingHappened")}</div>`;
    return hint ? b + `<div class="m o">${L("clickDay")}</div>` : b;
  }

  return { t, locale, S, M, FC, H, G, L, N, esc, mi, nm, dlong, dshort, dday, dfull, mname, p2, parts, recapGo, billOpen, rel, relAmt, doRelease, dayTip };
}
