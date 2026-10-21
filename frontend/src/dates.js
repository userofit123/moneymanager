// Dates as the app writes them: day/month/year, or month/day/year when that is chosen in Settings.
import { dateFormat } from "./core/prefs.js";
const p2 = (n) => String(n).padStart(2, "0");
export const dnum = (y, m, d) => (dateFormat.value == "mdy" ? p2(m) + "/" + p2(d) + "/" + y : p2(d) + "/" + p2(m) + "/" + y);
// "05/10" without the year, in the chosen order
export const dshort = (d) => (dateFormat.value === "mdy" ? String(d).slice(5, 7) + "/" + String(d).slice(8, 10) : String(d).slice(8, 10) + "/" + String(d).slice(5, 7));
export const dcell = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d)); return m ? dnum(m[1], m[2], m[3]) : String(d); };
export const dstr = (d) => { if (/^\d{4}-\d{2}-\d{2}/.test(String(d))) return dcell(d); const x = new Date(d); return isNaN(x) ? String(d) : dnum(x.getFullYear(), x.getMonth() + 1, x.getDate()); };
// The labels at the top of cards start every word with a capital letter in English. Hebrew has no capitals.
export const titleCase = (v) => String(v).replace(/(^|[\s(/·\-–])([a-z])/g, (m, a, b) => a + b.toUpperCase());
