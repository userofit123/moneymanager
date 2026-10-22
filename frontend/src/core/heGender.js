// Hebrew speaks to a woman or a man differently. The app's Hebrew texts use the plural "you" (right for everyone);
// when the profile says "m" or "f", genderize() turns those words into the singular form for a man or a woman.
// Past tense is the same for both, so only its ending changes; commands and the future differ.
// Loaded only when the language is Hebrew (core/heText.js applies it to every Hebrew text).

// plural → [man, woman]
const FORMS = {};
const add = (list) => list.split(";").forEach((p) => { const [a, b, c] = p.trim().split(" "); if (a) FORMS[a] = [b, c]; });
// past tense ("you added"): the same word without the final ם, for both
"הוצאתם הזנתם קבעתם יצרתם קיבלתם שילמתם סימנתם חסכתם התחלתם ביקשתם בחרתם תייגתם קניתם השארתם הוספתם הכנסתם אמרתם עשיתם עדכנתם שיניתם שייכתם השתמשתם הקלדתם הפרשתם הייתם ניתקתם הגעתם חרגתם הפסקתם החזרתם דחיתם"
  .split(" ").forEach((w) => { FORMS[w] = [w.slice(0, -1), w.slice(0, -1)]; });
// "you", "to you", "for you"…
add("אתם אתה את;לכם לך לך;אתכם אותך אותך;עליכם עליך עליך;אליכם אליך אליך;עבורכם עבורך עבורך;לבכם לבך לבך;בשבילכם בשבילך בשבילך;ידכם ידך ידך;עצמכם עצמך עצמך;לרשותכם לרשותך לרשותך;לפניכם לפניך לפניך;אצלכם אצלך אצלך;איתכם איתך איתך;בעצמכם בעצמך בעצמך");
// commands ("choose", "open"…)
add("בחרו בחר בחרי;פתחו פתח פתחי;בדקו בדוק בדקי;ראו ראה ראי;נסו נסה נסי;צרו צור צרי;חברו חבר חברי;שמרו שמור שמרי;צרפו צרף צרפי;ספרו ספור ספרי;סמנו סמן סמני;בטלו בטל בטלי;עקבו עקוב עקבי;מחקו מחק מחקי;חפשו חפש חפשי;שלחו שלח שלחי;ערכו ערוך ערכי;סגרו סגור סגרי;העלו העלה העלי;בצעו בצע בצעי;אשרו אשר אשרי;לחצו לחץ לחצי;הוסיפו הוסף הוסיפי;הזינו הזן הזיני;הכניסו הכנס הכניסי;תנו תן תני;תקנו תקן תקני;תייגו תייג תייגי;עברו עבור עברי");
// future ("you will pay"…)
add("תשלמו תשלם תשלמי;תשכחו תשכח תשכחי;תראו תראה תראי;תנקו תנקה תנקי;תחצו תחצה תחצי;תוכלו תוכל תוכלי;תחזרו תחזור תחזרי;תפעלו תפעל תפעלי;תחברו תחבר תחברי;תבחרו תבחר תבחרי;תאשרו תאשר תאשרי;תנצלו תנצל תנצלי;תצטרכו תצטרך תצטרכי;תסיימו תסיים תסיימי;תוסיפו תוסיף תוסיפי;תפתחו תפתח תפתחי");
// a word with up to three one-letter prefixes (ו, ש, ל, ב, כ, מ, ה), longest words first
const WORD = new RegExp("(^|[^א-ת])([ושלבכמה]{0,3})(" + Object.keys(FORMS).sort((a, b) => b.length - a.length).join("|") + ")(?![א-ת])", "g");
// "עברו" also means "they passed", so it changes only in "עברו עם" (an instruction)
const PASS = /(^|[^א-ת])עברו עם(?![א-ת])/g, PASS_TO = ["$1עבור עם", "$1עברי עם"];
// "אתם [present verb]": the verb after "you" changes too
const PRESENT = {};
"משתמשים משתמש משתמשת;רואים רואה רואה;מכניסים מכניס מכניסה;מחזירים מחזיר מחזירה;רגילים רגיל רגילה;עוקבים עוקב עוקבת;משלמים משלם משלמת;מצפים מצפה מצפה;מנהלים מנהל מנהלת;מוציאים מוציא מוציאה;חייבים חייב חייבת;מעבירים מעביר מעבירה;מזיזים מזיז מזיזה;יכולים יכול יכולה;רוצים רוצה רוצה;מוכנים מוכן מוכנה"
  .split(";").forEach((p) => { const [a, b, c] = p.split(" "); PRESENT[a] = [b, c]; });
const YOU_DO = new RegExp("((?:^|[^א-ת])[שכו]{0,2})אתם (?:" + Object.keys(PRESENT).join("|") + ")(?![א-ת])", "g");

// genderize("בחרו קטגוריה", "f") → "בחרי קטגוריה". Any other gender (not set) leaves the text as it is.
export function genderize(s, gender) {
  const g = gender === "f" ? 1 : gender === "m" ? 0 : -1;
  if (g < 0 || typeof s !== "string" || !/[א-ת]/.test(s)) return s;
  s = s.replace(YOU_DO, (m, pre) => pre + (g ? "את " : "אתה ") + PRESENT[m.slice(pre.length + 4)][g]);
  return s.replace(WORD, (m, pre, pf, w) => (w === "עברו" ? m : pre + pf + FORMS[w][g])).replace(PASS, PASS_TO[g]);
}
