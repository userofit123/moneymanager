// Category helpers every page shares: the names in the order lists show them (catNames: as typed, ignoring case),
// a category's colour (cc), and the name shown in the page's language.
import { i18n } from "../i18n.js";
import { categoryName } from "../catnames.js";
const CNC = new Intl.Collator(undefined, { sensitivity: "base" });
export const catNames = (S) => Object.keys(S?.cats || {}).sort(CNC.compare);
export const catColor = (S, n) => (n == "Income" || S?.cats?.[n] === 99 ? "var(--pos)" : `var(--c${(S?.cats?.[n] == null ? 6 : S.cats[n]) % 7})`);
export const catLabel = (c) => (!c || c === "Uncategorized" ? i18n.global.t("activity.uncategorized") : categoryName(c, i18n.global.locale.value));
