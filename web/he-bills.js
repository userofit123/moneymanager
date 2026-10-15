/* Hebrew for the Bills page wording. Loaded last, same format as he-more.js: exact text in HE.D ({} is a number, {d} a date). */
(function(){const D=HE.D,P=HE.P;
const add=(k,v)=>{D[k]=v;if(k.includes("{d}"))D[k.replace(/\{d\}/g,"{}/{}/{}")]=v.replace(/\{d\}/g,"{}/{}/{}")};
add("Regular bills, plus the monthly average of irregular bills (last {} months)","חשבונות קבועים, ועוד הממוצע החודשי של חשבונות לא קבועים ({} החודשים האחרונים)");
add("Regular bills, plus the monthly average of irregular bills (last {} months), which adds up to {} a year","תשלומים במועד קבוע, ועוד הממוצע החודשי של תשלומים במועד משתנה ({} החודשים האחרונים), שמצטברים ל‑{} בשנה");
add("Regular bills, which add up to {} a year","תשלומים במועד קבוע, שמצטברים ל‑{} בשנה");
add("{} bills are due. Amounts are predicted.","{} חשבונות לתשלום. הסכומים חזויים.");
add("1 bill is due. The amount is predicted.","חשבון אחד לתשלום. הסכום חזוי.");
add("{} bills have changed price. The amount is the effect over a year.","המחיר של {} חשבונות השתנה. הסכום הוא ההשפעה על פני שנה.");
add("1 bill has changed price. The amount is the effect over a year.","המחיר של חשבון אחד השתנה. הסכום הוא ההשפעה על פני שנה.");
add("The same store charges you on a regular schedule. The next payment is predicted and tracked.","אותה חנות מחייבת אתכם בלוח זמנים קבוע. התשלום הבא נחזה ונמצא במעקב.");
add("Every payment to this store counts as a bill, but the timing varies.","כל תשלום לחנות הזו נחשב לחשבון, אבל מועד התשלום משתנה.");
add("a month, on average","בחודש, בממוצע");
add("{} a month, on average","{} בחודש, בממוצע");
add("Purchases you are paying off in instalments, with how many are left.","קניות שאתם משלמים בתשלומים, עם מספר התשלומים שנותרו.");
add("A single payment that you marked as a bill","תשלום בודד שהוספתם לרשימה");
add("Next charge on {d}","החיוב הבא ב‑{d}");
add("Last charge was {} on {d}","החיוב האחרון היה {} ב‑{d}");
add("No charge has been seen yet","עדיין לא נראה חיוב");
add("varies from {} to {}","משתנה בין {} ל‑{}");
add("average of the last 3 charges","ממוצע של שלושת החיובים האחרונים");
add("same as the last charge","זהה לחיוב האחרון");
add("Marked to cancel","סומן לביטול");
add("{} payments so far, about {} in the last {} months","{} תשלומים עד כה, בערך {} ב‑{} החודשים האחרונים");
add("{} payment so far, about {} in the last {} months","תשלום אחד עד כה, בערך {} ב‑{} החודשים האחרונים");
add("last payment was {} on {d}","התשלום האחרון היה {} ב‑{d}");
add("ranges from {} to {}","נע בין {} ל‑{}");
add("No payment has been seen yet","עדיין לא נראה תשלום");
add("Last payment was {}","התשלום האחרון היה {}");
add("paid on {d}","שולם ב‑{d}");
add("no payment found yet","עדיין לא נמצא תשלום");
add("the last one is around {m} {}","התשלום האחרון בערך ב{m} {}");
add("· the last one is around {m} {}","· התשלום האחרון בערך ב{m} {}");
add("{} left to pay","{} נשארו לתשלום");
add("Canceled on {d}","בוטל ב‑{d}");
add("No charges have been seen","עדיין לא נראו חיובים");
add("It is not counted in totals, predictions or alerts.","הוא לא נספר בסכומים, בתחזיות או בהתראות.");
add("You have no bills yet. A bill appears here when a business or person charges you again and again. You can also open a payment in Activity and press","עדיין אין לכם חשבונות. חשבון יופיע כאן כשעסק או אדם מחייבים אתכם שוב ושוב. אפשר גם לפתוח תשלום בפעילות וללחוץ על");
add("You have made {} payments so far, about {} in the last {} months.","שילמתם {} תשלומים עד כה, בערך {} ב‑{} החודשים האחרונים.");
add("You have made 1 payment so far, about {} in the last {} months.","שילמתם תשלום אחד עד כה, בערך {} ב‑{} החודשים האחרונים.");
add("Payments so far","תשלומים עד כה");
add("uses the name if left empty","אם לא ימולא, ייעשה שימוש בשם");
add(": the same business or person charges a similar amount every month, every 2 months or every year. The app finds these automatically. Example: Netflix.",": אותו עסק או אדם מחייבים סכום דומה כל חודש, כל חודשיים או כל שנה. האפליקציה מוצאת אותם אוטומטית. למשל: נטפליקס.");
add(": you decide that every payment to a business or person is a bill, even when the timing varies. Example: a water bill that someone else sometimes pays.",": אתם קובעים שכל תשלום לעסק או לאדם מסוים הוא חשבון, גם כשהמועד משתנה. למשל: חשבון מים ששילם לפעמים מישהו אחר.");
add(". Bills have a",". בפעילות יש לחשבונות תגית בשם");
add("tag in Activity.","");
add("Car insurance is a bill whatever its category. A yearly bill needs two years of history, or you can add it yourself. Press the","ביטוח רכב הוא חשבון בכל קטגוריה. חשבון שנתי דורש היסטוריה של שנתיים, או שאפשר להוסיף אותו בעצמכם. לחצו על");
add("to see the payments it is based on.","כדי לראות על אילו תשלומים הוא מבוסס.");
const iso=x=>"\u2066"+x+"\u2069";
P.unshift(
[/^(.+) · (Regular bill|Irregular bill|One-off bill)$/,(n,t,T)=>n+" · "+T(t)],
[/^(?:You told the app that every payment to "(.+?)" is a bill\. )?Every payment to "(.+?)" counts as a bill, even though the timing varies\. You have made (\d+) payments? so far, about (\d+) in the last (\d+) months\.$/,(a,b,c,d,e)=>(a?"ביקשתם מהאפליקציה לכלול כל תשלום ל״"+a+"״ ברשימה. ":"")+"כל תשלום ל״"+b+"״ נכלל ברשימה, גם כשהמועד משתנה. עד כה שילמתם "+(c=="1"?"תשלום אחד":c+" תשלומים")+", בערך "+d+" ב‑"+e+" החודשים האחרונים."],
[/^Last charge was (.+) on (.+)$/,(a,b)=>"החיוב האחרון היה "+a+" ב‑"+iso(b)],
[/^last payment was (.+) on (.+)$/,(a,b)=>"התשלום האחרון היה "+a+" ב‑"+iso(b)],
[/^Last payment was (.+)$/,a=>"התשלום האחרון היה "+a],
[/^Next charge on (.+)$/,a=>"החיוב הבא ב‑"+iso(a)],
[/^Canceled on (.+)$/,a=>"בוטל ב‑"+iso(a)],
[/^paid on (.+)$/,a=>"שולם ב‑"+iso(a)]);
add("The same business or person charges you on a regular schedule. Shows the last charge and the next expected one.","אותו עסק או אדם שמחייבים אתכם בלוח זמנים קבוע. מוצגים החיוב האחרון והחיוב הבא הצפוי.");
add("Every payment to this business or person counts as a bill, but the timing varies. Shows past payments only, with no next date.","אותו עסק או אדם שמחייבים אתכם בלוח זמנים לא קבוע. מוצגים תשלומי עבר בלבד, בלי מועד הבא.");
add("Every payment to this business or person counts as a bill, but the timing varies. Good for things that come at different times.","אותו עסק או אדם שמחייבים אתכם בלוח זמנים לא קבוע.");
add("Payments to this business or person are already bills","תשלומים לעסק או לאדם הזה כבר נחשבים לחשבונות");
add("Most bills are found automatically. Add one here if it has not been charged yet, or if its timing varies.","רוב התשלומים הקבועים נמצאים אוטומטית. אפשר להוסיף כאן תשלום שעוד לא חויב, או שהמועד שלו משתנה.");
add("How often sets the type: monthly, every 2 months or yearly makes it a regular bill. No fixed schedule makes it an irregular bill.","התדירות קובעת את הסוג: חודשי, כל חודשיים או שנתי – תשלום במועד קבוע. ללא לוח זמנים קבוע – תשלום במועד משתנה.");
add('Any transaction whose description contains the text in "Match transactions containing" counts as part of this bill.','כל תנועה שהתיאור שלה מכיל את הטקסט שבשדה ״התאמה לתנועות שמכילות״ נספרת כחלק מהתשלום הזה.');
add("Regular","במועד קבוע");
add("Regular bill","תשלום במועד קבוע");
add("Regular · every month","במועד קבוע · כל חודש");
add("Regular · every 2 months","במועד קבוע · כל חודשיים");
add("Regular · every year","במועד קבוע · כל שנה");
add("Regular, irregular and one-off bills the app tracks","תשלומים במועד קבוע, במועד משתנה וחד‑פעמיים שהאפליקציה עוקבת אחריהם");
add("Irregular","במועד משתנה");
add("Irregular bill","תשלום במועד משתנה");
add("One-off bill","תשלום חד‑פעמי");
add("Remove from bills","הסרה מהרשימה");
add("Why is this a bill?","למה זה מופיע כאן?");
add("why is this a bill? ⓘ","למה זה מופיע כאן? ⓘ");
add("Mark as a bill","הוספה לתשלומים הקבועים");
add("Mark as a bill…","הוספה לתשלומים הקבועים…");
add("Irregular · every payment counts as a bill ·","במועד משתנה · כל תשלום נכלל ברשימה ·");
add("Every payment to this business or person counts as a bill, but there is no fixed rhythm. Good for things that come at different times.","אותו עסק או אדם שמחייבים אתכם בלוח זמנים לא קבוע.");
add("No fixed schedule (irregular bill)","ללא לוח זמנים קבוע (במועד משתנה)");
/* In Hebrew the page is called "תשלומים קבועים", so a bill is "תשלום קבוע", not "חשבון" (that word stays for bank accounts and credit card statements). */
const FIX=v=>typeof v!="string"?v:v.replace(/(^|[^א-ת])([והלכמבש]{0,3})(חשבונות|חשבון)(?![א-ת])(?!\s+(?:מים|חשמל|גז|ארנונה|טלפון|אינטרנט))(\s+(?:לא\s+)?(?:קבוע|קבועים|סדיר|סדירים|חד))?/g,(m,pre,pf,w,nx)=>{const def=pf.endsWith("ה"),base=def?pf.slice(0,-1):pf,pl=w=="חשבונות",plain=!!nx;
 const noun=pl?"תשלומים":"תשלום",adj=plain?"":(pl?" קבועים":" קבוע");
 return pre+base+(def?"ה":"")+noun+(def&&!plain?" ה"+adj.trim():adj)+(nx||"")});
const SKIP=/from the bank|credit card|card bill|bank|statement|account/i;
for(const k of Object.keys(D)){if(/\bbills?\b/i.test(k)&&!SKIP.test(k))D[k]=FIX(D[k])}
for(const p of P){if(typeof p[1]=="function"&&/bills?\b/i.test(p[0].source)&&!SKIP.test(p[0].source)){const f=p[1];p[1]=(...a)=>{const o=f(...a);return typeof o=="string"?FIX(o):o}}}
})();
