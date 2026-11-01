// What to tell the person when a sync fails: a short, plain alert in their language, never the bank's raw error.
// The raw error stays in the sync log and the error log. The app says the same words (frontend/src/lib/syncFail.js and the sync.f* texts).
import { q } from "./db.js";
import { PROVIDERS, baseOf } from "./connections.js";

// The kind of problem behind a raw error. The scraper sends "<errorType>: <details>" (israeli-bank-scrapers errorType values).
export function failKind(msg) {
  const m = String(msg || "");
  if (/^(OTP_REQUIRED|TWO_FACTOR_RETRIEVER_MISSING)\b/.test(m)) return "otp";
  if (/^INVALID_PASSWORD\b/.test(m) || /^Wise .*HTTP 40[13]\b/.test(m)) return "login";
  if (/^(CHANGE_PASSWORD|ACCOUNT_BLOCKED)\b/.test(m)) return "bank";
  return "site"; // GENERIC, TIMEOUT, GENERAL_ERROR, network trouble, the scraper not answering: nothing to do, it tries again
}

const T = {
  en: {
    title: (n) => `Money · ${n} was not updated`,
    site: "The bank's website had a problem during the sync. It will try again on its own.",
    login: "The bank did not accept the login. Check the login details in Settings → Connections.",
    bank: "The bank wants a new password or has blocked the account. Sort it out on the bank's website, then update the login in Settings → Connections.",
    otp: "The bank asked for a one-time code by SMS, so automatic sync is paused. Press Verify login once (Settings → Connections). Log in in the live window, enter the code, and tick “remember this device”. After that the bank knows this app, so it usually does not ask again. (Or use a CSV export: Settings → Import and export.)",
    locked: "Automatic attempts are paused after failed attempts. Check the login, then unlock it in Settings → Connections.",
    paused: "Automatic attempts are paused until it is unlocked in Settings → Connections.",
  },
  he: {
    title: (n) => `Money · ${n} לא עודכן`,
    site: "באתר של הבנק הייתה תקלה בזמן הסנכרון. ניסיון נוסף יתבצע אוטומטית.",
    login: "הבנק לא קיבל את פרטי ההתחברות. בדקו אותם בהגדרות ← חיבורים.",
    bank: "הבנק מבקש סיסמה חדשה או שחסם את החשבון. סדרו את זה באתר הבנק, ואז עדכנו את פרטי ההתחברות בהגדרות ← חיבורים.",
    otp: "הבנק ביקש קוד חד־פעמי ב־SMS, ולכן הסנכרון האוטומטי מושהה. לחצו פעם אחת על ״אימות כניסה״ (הגדרות ← חיבורים). התחברו בחלון החי, הזינו את הקוד וסמנו ״זכור את המכשיר הזה״. אחר כך הבנק מכיר את האפליקציה, ולכן בדרך כלל לא מבקש שוב. (או השתמשו בייצוא CSV: הגדרות ← ייבוא וייצוא.)",
    locked: "הניסיונות האוטומטיים הושהו אחרי ניסיונות כושלים. בדקו את פרטי ההתחברות ואז בטלו את הנעילה בהגדרות ← חיבורים.",
    paused: "הניסיונות האוטומטיים מושהים עד לביטול הנעילה בהגדרות ← חיבורים.",
  },
};
// the bank names as the app shows them in Hebrew (settings/conn.he.json "prov")
const HE_NAME = {
  hapoalim: "בנק הפועלים", leumi: "בנק לאומי", discount: "בנק דיסקונט", mercantile: "מרכנתיל דיסקונט", mizrahi: "מזרחי טפחות", otsarHahayal: "אוצר החייל",
  union: "בנק איגוד", beinleumi: "הבנק הבינלאומי", massad: "בנק מסד", yahav: "בנק יהב", max: "מקס", isracard: "ישראכרט", visaCal: "ויזה כאל", amex: "אמריקן אקספרס",
};

// The alert for one failed sync. source: the connection id ("isracard", "max~2"); label: its name in English ("Isracard · Joint").
export function failNotice({ source, label, msg, locked, lang }) {
  const L = T[lang === "he" ? "he" : "en"], kind = failKind(msg), b = baseOf(source || "");
  const en = PROVIDERS[b]?.label;
  const name = lang === "he" && HE_NAME[b] && en && String(label).startsWith(en) ? HE_NAME[b] + String(label).slice(en.length) : label;
  const body = !locked || kind === "otp" ? L[kind] : kind === "site" ? L.locked : `${L[kind]}\n${L.paused}`;
  return { kind, title: L.title(name), body };
}

// The language the person chose in the app (saved with the other view choices).
export async function personLang() {
  let v = (await q("SELECT value FROM settings WHERE key='ui_prefs'")).rows[0]?.value;
  if (typeof v === "string") try { v = JSON.parse(v); } catch { v = null; }
  return v && typeof v === "object" && v.moneyLang === "he" ? "he" : "en";
}
