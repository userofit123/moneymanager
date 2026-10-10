// Suggested categories and starter rules (English and Hebrew merchant names). Adding is idempotent: nothing that
// already exists is changed, so your own categories and rules are never overwritten.
import { q } from "./db.js";

// [name, colour index]; 99 = income (green)
export const SUGGESTED_CATEGORIES = [
  ["Groceries", 0], ["Eating out", 2], ["Bills & utilities", 4], ["Phone & internet", 3], ["Rent & housing", 1], ["Mortgage", 1],
  ["Insurance", 5], ["Health & pharmacy", 3], ["Kids & education", 4], ["Clothing & shoes", 5], ["Shopping & home", 6],
  ["Entertainment & leisure", 2], ["Subscriptions", 3], ["Travel & vacations", 0], ["Transport", 4], ["Car & fuel", 1],
  ["Gifts & donations", 5], ["Personal care", 2], ["Pets", 6], ["Taxes & government", 1], ["Loans & credit payments", 6],
  ["Cash withdrawals", 4], ["Savings & investments", 3], ["Business expenses", 0], ["Fees & FX costs", 5], ["Other", 6],
  ["Income", 99], ["Salary", 99], ["Freelance & business income", 99], ["Refunds & reimbursements", 99], ["Interest & investments", 99], ["Other income", 99],
  ["Uncategorized", 6],
];

const R = (category, words) => words.map((k) => [k, category]);
export const SUGGESTED_RULES = [
  ...R("Groceries", ["shufersal", "שופרסל", "rami levy", "רמי לוי", "victory", "ויקטורי", "yochananof", "יוחננוף", "osher ad", "אושר עד", "tiv taam", "טיב טעם", "carrefour", "קרפור", "hazi hinam", "חצי חינם", "am:pm", "ampm", "יינות ביתן", "יוניברס", "שוק העיר"]),
  ...R("Eating out", ["wolt", "וולט", "10bis", "תן ביס", "mcdonald", "מקדונלד", "burger", "בורגר", "aroma", "ארומה", "cofix", "קופיקס", "landwer", "לנדוור", "pizza", "פיצה", "dominos", "דומינו", "restaurant", "מסעדה", "cafe", "קפה", "שווארמה", "סושי"]),
  ...R("Subscriptions", ["netflix", "spotify", "youtube", "apple.com/bill", "itunes", "disney", "hbo", "amazon prime", "icloud", "google one", "chatgpt", "openai", "microsoft 365", "dropbox", "adobe"]),
  ...R("Phone & internet", ["partner", "פרטנר", "cellcom", "סלקום", "pelephone", "פלאפון", "hot mobile", "הוט", "bezeq", "בזק", "012", "golan telecom", "גולן טלקום", "yes "]),
  ...R("Bills & utilities", ["israel electric", "חברת החשמל", "חשמל", "arnona", "ארנונה", "עיריית", "עירית", "supergas", "סופרגז", "אמישראגז", "מי אביבים", "תאגיד מים", "מקורות", "ועד בית"]),
  ...R("Car & fuel", ["paz ", "פז ", "sonol", "סונול", "delek", "דלק", "pango", "פנגו", "cellopark", "סלופארק", "אחוזות החוף", "כביש 6", "kvish 6", "טסט", "מוסך"]),
  ...R("Transport", ["rav-kav", "rav kav", "רב-קו", "רב קו", "gett", "moovit", "israel railways", "רכבת ישראל", "egged", "אגד", "uber", "bolt"]),
  ...R("Health & pharmacy", ["super-pharm", "super pharm", "סופר-פארם", "סופר פארם", "clalit", "כללית", "maccabi", "מכבי", "meuhedet", "מאוחדת", "leumit", "לאומית", "be pharm", "בי פארם", "רופא", "מרפאה", "דנטל"]),
  ...R("Insurance", ["harel", "הראל", "migdal", "מגדל", "clal ", "כלל ביטוח", "phoenix", "הפניקס", "menora", "מנורה", "ayalon", "איילון", "ביטוח"]),
  ...R("Shopping & home", ["ikea", "איקאה", "ksp", "ivory", "איוורי", "zap", "amazon", "aliexpress", "אלי אקספרס", "home center", "הום סנטר", "ace ", "איס "]),
  ...R("Clothing & shoes", ["h&m", "zara", "castro", "קסטרו", "fox ", "פוקס", "golf ", "renuar", "רנואר", "shein", "terminal x", "טרמינל"]),
  ...R("Entertainment & leisure", ["cinema", "סינמה", "yes planet", "יס פלאנט", "ticketmaster", "eventim", "לאן", "holmes place", "הולמס פלייס", "gym", "חדר כושר"]),
  ...R("Cash withdrawals", ["atm", "כספומט", "משיכת מזומן"]),
  ...R("Taxes & government", ["מס הכנסה", "רשות המסים", "רשות המיסים", "משרד הפנים", "gov.il"]),
  ...R("Loans & credit payments", ["הלוואה", "loan"]),
  ...R("Fees & FX costs", ["עמלה", "commission"]),
  ...R("Salary", ["משכורת", "salary", "payroll"]),
];

export async function addSuggested(c = null) {
  const run = (t, p) => (c || { query: q }).query(t, p);
  let cats = 0, rules = 0;
  for (const [name, color] of SUGGESTED_CATEGORIES) cats += (await run("INSERT INTO categories (name,color) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING", [name, color])).rowCount;
  const have = new Set((await run("SELECT lower(keyword) AS k FROM rules")).rows.map((r) => r.k));
  const pos = (await run("SELECT COALESCE(max(position),0)+1 AS p FROM rules")).rows[0].p;
  let i = 0;
  for (const [k, cat] of SUGGESTED_RULES) {
    if (have.has(k.toLowerCase())) continue;
    have.add(k.toLowerCase());
    await run("INSERT INTO rules (keyword,category,tag,position) VALUES ($1,$2,'',$3)", [k, cat, pos + i++]);
    rules++;
  }
  return { categories: cats, rules };
}
