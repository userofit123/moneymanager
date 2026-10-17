// Money and percent formatting, the same as the current app: "₪1,250", a real minus sign "−₪80", no decimals unless asked.
const SYM = { ILS: "₪", USD: "$", EUR: "€", GBP: "£", JPY: "¥" };
export const currencySymbol = (cur = "ILS") => SYM[cur] || cur + " ";
export function formatMoney(n, { currency = "ILS", decimals = 0, sign = false } = {}) {
  const v = Number(n) || 0;
  const abs = Math.abs(v).toLocaleString("en-IL", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const pre = v < 0 && abs !== (0).toFixed(decimals) ? "−" : sign && v > 0 ? "+" : "";
  return pre + currencySymbol(currency) + abs;
}
export const clampPercent = (value, max) => (max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0);
