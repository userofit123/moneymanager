// Currencies of Settings: the ones that can be added, their symbols, adding and removing one.
export const CURS = ["EUR", "GBP", "CHF", "CAD", "AUD", "JPY", "CNY", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "TRY", "INR", "BRL", "MXN", "ZAR", "SGD", "HKD", "NZD", "KRW", "THB", "USD"];
const SYMS = { ILS: "₪", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
// The sign written before a currency's code in its chip: ₪ $ € £ ¥, and nothing for the others.
export const symOf = (c) => SYMS[c] || "";
export const listOf = (S) => S.currencies || ["ILS"];
export const isUsed = (S, c) => c === "ILS" || S.accounts.some((a) => a.cur === c);
export const addable = (S) => CURS.filter((c) => !(S.currencies || []).includes(c));
export const withAdded = (S, c) => [...new Set([...(S.currencies || ["ILS"]), c])];
export const withRemoved = (S, c) => (S.currencies || []).filter((x) => x !== c);
