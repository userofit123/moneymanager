// Suggested categories and starter rules (English and Hebrew merchant names). Adding is idempotent: nothing that
// already exists is changed, so your own categories and rules are never overwritten.
import { q } from "./db.js";

// [name, colour index]; 99 = income (green)
export const SUGGESTED_CATEGORIES = [
  ["Groceries", 0], ["Eating out", 2], ["Bills & utilities", 4], ["Phone & internet", 3], ["Rent & housing", 1], ["Mortgage", 1],
  ["Insurance", 5], ["Health & pharmacy", 3], ["Kids & education", 4], ["Clothing & shoes", 5], ["Shopping & home", 6],
  ["Entertainment & leisure", 2], ["Subscriptions", 3], ["Travel & vacations", 0], ["Transport", 4], ["Car & fuel", 1],
  ["Gifts & donations", 5], ["Personal care", 2], ["Pets", 6], ["Taxes & government", 1], ["Loans & credit payments", 6],
  ["Cash withdrawals", 4], ["Cash deposits", 99], ["Savings & investments", 3], ["Software & hosting", 0], ["Books & hobbies", 2], ["Business expenses", 0], ["Fees & FX costs", 5], ["Other", 6],
  ["Income", 99], ["Salary", 99], ["Freelance & business income", 99], ["Refunds & reimbursements", 99], ["Interest & investments", 99], ["Other income", 99],
  ["Uncategorized", 6],
];

const R = (category, words) => words.map((k) => [k, category]);
export const SUGGESTED_RULES = [
  // Specific names first: the first rule that matches wins, so these must come before the broad ones below.
  ...R("Other income", ["זיכוי מלאומי", "מענק ללקוח", "bit העברת", "העברה-נייד"]),
  ...R("Interest & investments", ["ני\"ע-דיבידנד", "דיבידנד", "dividend"]),
  ...R("Savings & investments", ["ני\"ע-קניה", "ני\"ע-מכירה", "to savings"]),
  ...R("Cash deposits", ["הפק מזומן", "הפקדת מזומן", "העברה/הפקדה"]),
  ...R("Cash withdrawals", ["משיכה מבנקט", "משיכה מכספומט"]),
  ...R("Fees & FX costs", ["ע.מפעולות", "עמ.הע.זה", "דמי כרטיס", "השלמה למינ", "רבית", "עמלת", "דמי ניהול"]),
  ...R("Taxes & government", ["ביטוח לאומי", "מס הכנסה", "משרד הרישוי"]),
  ...R("Car & fuel", ["פז/", "פז yellow", "yellow", "פז ", "דלק מנטה", "דלק עינת", "פנגו", "מ. התחבורה", "רישוי רכב", "ספרינט מוטורס", "לה אוטו", "חניון", "אי. פי. אי חניה", "אחוזות החוף", "סונול", "sonol", "טסט", "מוסך"]),
  ...R("Software & hosting", ["godaddy", "namecheap", "name-cheap", "inmotionhosting", "github", "openrouter", "חשבונית ירוקה", "cloudflare", "digitalocean", "hetzner", "vercel", "notion"]),
  ...R("Subscriptions", ["anthropic", "claude", "spotify", "netflix", "youtube", "apple.com/bill", "itunes", "disney", "hbo", "amazon prime", "icloud", "google one", "chatgpt", "openai", "microsoft 365", "dropbox", "adobe"]),
  ...R("Health & pharmacy", ["קרן מכבי", "מכבידנט", "סופרפארם", "סופר פארם", "super-pharm", "super pharm", "iherb", "בי פארם", "be pharm", "מכבי", "כללית", "מאוחדת", "clalit", "maccabi", "meuhedet", "רופא", "מרפאה", "דנטל"]),
  ...R("Insurance", ["רכב חובה", "הפניקס", "הראל", "מגדל", "כלל ביטוח", "מנורה", "איילון", "harel", "migdal", "phoenix", "menora", "ayalon", "ביטוח"]),
  ...R("Groceries", ["ויקטורי", "קרפור", "carrefour", "רמי לוי", "שופרסל", "שאולי מרקט", "ניצת הדובדבן", "קולינאריק", "פניני טבע", "אביב ואביעד", "יינות ביתן", "יוחננוף", "אושר עד", "טיב טעם", "חצי חינם", "shufersal", "rami levy", "victory", "yochananof", "osher ad", "tiv taam", "hazi hinam", "am:pm", "ampm", "יוניברס", "שוק העיר"]),
  ...R("Eating out", ["חומוס", "פאפא גונס", "דלי קרים", "סושי", "ארומה", "לג'נדה", "רוסטרס", "פינוקים", "קפה", "wolt", "וולט", "10bis", "תן ביס", "mcdonald", "מקדונלד", "burger", "בורגר", "aroma", "cofix", "קופיקס", "landwer", "לנדוור", "pizza", "פיצה", "dominos", "דומינו", "restaurant", "מסעדה", "cafe", "שווארמה"]),
  ...R("Bills & utilities", ["דור אנרגיה", "מי מודיעין", "חברת החשמל", "israel electric", "חשמל", "עיריית", "עירית", "supergas", "סופרגז", "אמישראגז", "מי אביבים", "תאגיד מים", "מקורות", "ועד בית"]),
  ...R("Phone & internet", ["פרטנר", "הוט מובייל", "partner", "cellcom", "סלקום", "pelephone", "פלאפון", "hot mobile", "bezeq", "בזק", "golan telecom", "גולן טלקום"]),
  ...R("Clothing & shoes", ["אורבניקה", "urbanica", "קסטרו", "castro", "רנואר", "renuar", "h&m", "zara", "shein", "terminal x", "טרמינל", "fox ", "פוקס"]),
  ...R("Books & hobbies", ["צומת ספרים", "סטימצקי", "ארט דיפו", "הובי", "steimatzky"]),
  ...R("Entertainment & leisure", ["פרופיט", "קיר טיפוס", "רשות הטבע והגנים", "cinema", "סינמה", "yes planet", "יס פלאנט", "ticketmaster", "eventim", "holmes place", "הולמס פלייס", "gym", "חדר כושר"]),
  ...R("Shopping & home", ["ksp", "מחסני חשמל", "הום סנטר", "home center", "איקאה", "ikea", "aliexpress", "אלי אקספרס", "amazon", "shenduqrwea", "אייס", "משתלת", "יגור חקלאות", "ivory", "איוורי", "zap"]),
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
  ...R("Salary", ["משכורת", "salary", "payroll", "זיכוי"]),
];

export async function addSuggested(c = null) {
  const run = (t, p) => (c || { query: q }).query(t, p);
  let cats = 0, rules = 0;
  for (const [name, color] of SUGGESTED_CATEGORIES) cats += (await run("INSERT INTO categories (name,color) VALUES ($1,$2) ON CONFLICT (name) DO NOTHING", [name, color])).rowCount;
  const have = new Set((await run("SELECT lower(keyword) AS k FROM rules")).rows.map((r) => r.k));
  const fresh = SUGGESTED_RULES.filter(([k]) => { const l = k.toLowerCase(); if (have.has(l)) return false; have.add(l); return true; });
  // New rules go in front of the old ones: the specific names must win over broad words like "ביטוח" that an earlier version added.
  const first = (await run("SELECT COALESCE(min(position),1) AS p FROM rules")).rows[0].p - fresh.length;
  for (const [i, [k, cat]] of fresh.entries()) {
    await run("INSERT INTO rules (keyword,category,tag,position) VALUES ($1,$2,'',$3)", [k, cat, first + i]);
    rules++;
  }
  return { categories: cats, rules };
}
