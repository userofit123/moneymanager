// Runs the changes of lib/txactions.js on the shared data, with what the current app shows after them:
// toasts, and the suggestions it makes ("Set up a rule for this category?", "Tag more like this?", "Always count these as card payments?").
import { i18n } from "../i18n.js";
import { data } from "../stores/data.js";
import { toast } from "./toast.js";
import { addSuggestion, setSuggestionRunner } from "./suggest.js";
import { openPop } from "./txwin.js";
import * as A from "../lib/txactions.js";
import { guessKw, tagSimilar, ruleTags, cardInfo, transferIds, displayName, normD } from "../lib/activity.js";

const t = (...a) => i18n.global.t(...a);
const S = () => data.state.value;
const byId = (id) => (S()?.tx || []).find((x) => x.id == id);

// run(fn, ...args): runs fn(S, ...args) as one change. Returns fn's result ({ err } when nothing changed).
export function run(fn, ...args) {
  let res = { err: "none" };
  data.change((S) => { res = fn(S, ...args); return res.err ? false : res.lines; });
  return res;
}

// ---- category, with "Set up a rule?" afterwards (setField + ruleOffer) ----
export function setCategory(id, c) {
  const r = run(A.setField, id, "c", c);
  const x = byId(id);
  if (!r.err && c && c != "Uncategorized" && x && !transferIds(S()).has(x.id)) ruleOffer(x, c);
  return r;
}
function ruleOffer(x, cat) {
  const kw = guessKw(x, cardInfo(S()));
  if (kw.length < 3 || S().rules.some((r) => r.k.toLowerCase() == kw && r.c == cat)) return;
  const n = A.simList(S(), kw, x.id, cat).length, catN = cat;
  addSuggestion({ key: "rule|" + kw, title: t("txw.ruleOfferT", { cat: catN }), text: n ? t("txw.ruleOfferN", { n, kw, cat: catN }, n) : t("txw.ruleOffer0", { kw }), actions: [{ label: t("txw.createRule"), kind: "ruleOffer", arg: { id: x.id, cat } }] });
}
// ---- tags, with "Tag more like this?" afterwards (tagCommit + tagOffer) ----
export function addTags(id, list) {
  const r = run(A.addTags, id, list);
  const x = byId(id);
  if (!r.err && x) tagOffer(x, r.add);
  return r;
}
function tagOffer(x, tags) {
  const kw = guessKw(x, cardInfo(S()));
  if (kw.length < 3 || !tags.length) return;
  const ex = (S().tagRules || []).find((r) => r.k.toLowerCase() == kw);
  if (ex && tags.every((g) => ruleTags(ex).includes(g))) return;
  const n = tagSimilar(S(), kw, x.id, tags).length, tg = tags.map((g) => "#" + g).join(" ");
  addSuggestion({ key: "tag|" + kw, title: t("activity.offer.title"), text: n ? t("activity.offer.text", { n, kw, tags: tg }, n) : t("activity.offer.none", { kw, tags: tg }), actions: [{ label: t("txw.createRule"), kind: "tagRule", arg: { id: x.id, tags } }] });
}
// ---- card payment, with "Always count these as card payments?" afterwards (cpMark + cpOffer) ----
export function cpMark(id) {
  const r = run(A.cpMark, id), x = byId(id);
  if (!r.err && x) {
    const n = A.cpSimilar(S(), x).length, txt = normD(x.desc);
    if (txt.length >= 2 && !(S().cardRules || []).map(normD).includes(txt))
      addSuggestion({ key: "card|" + txt, title: t("txw.cpOfferT"), text: n ? t("txw.cpOfferN", { n, desc: x.desc }, n) : t("txw.cpOffer0", { desc: x.desc }), actions: [{ label: n ? t("txw.cpYesAll", { n: n + 1 }) : t("txw.cpCreate"), kind: "cpRule", arg: { id: x.id } }] });
  }
  return r;
}
export function ignOn(id) { const r = run(A.ignOn, id); if (!r.err) toast(t("txw.leftOut")); return r; }

// What the suggestions' buttons do.
setSuggestionRunner((a) => {
  if (a.kind == "ruleOffer") openPop("ruleOffer", a.arg);
  else if (a.kind == "tagRule") openPop("tagRule", a.arg);
  else if (a.kind == "cpRule") { const r = run(A.cpRuleAdd, a.arg.id); if (!r.err) toast(r.n ? t("txw.cpDone", { n: r.n }, r.n) : t("txw.cpDone0")); }
});
export const nameOf = (x) => displayName(S(), x);
