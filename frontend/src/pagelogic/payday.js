// The words for Free to use before payday (lib/payday.js), the same on every page and on the phone: the line with what it
// will likely be after payday, the calm note (or what would still be missing), and the tooltip.
// t: vue-i18n's t; P: the payday numbers (keyNums.payday, or recapModel's payday: the same amounts); he: Hebrew.
import { fm } from "../format.js";

const ORD = new Intl.PluralRules("en", { type: "ordinal" }), SUF = { one: "st", two: "nd", few: "rd", other: "th" };
// a day of the month: "3rd" in English, "3" in Hebrew (the sentence says ה־3)
const dayOf = (d, he) => (he ? String(d) : d + SUF[ORD.select(d)]);

export function paydayWords(t, P, he) {
  if (!P) return null;
  const inc = fm(P.inc), when = P.from == null ? "" : P.from == P.to ? t("num.payOn", { a: dayOf(P.from, he) }) : t("num.payBetween", { a: dayOf(P.from, he), b: dayOf(P.to, he) });
  return {
    covered: P.covered,
    after: t("num.afterPayAbout", { amount: fm(P.after) }),
    note: P.covered ? t("num.payNote", { inc }) : t("num.payPart", { inc, missing: fm(P.missing) }),
    tip: t("num.afterPayTip", { inc, when }).replace(/\n\n/g, "\n"),
  };
}
