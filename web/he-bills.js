/* Hebrew for the Bills page wording. Loaded last, same format as he-more.js: exact text in HE.D ({} is a number, {d} a date). */
(function(){const D=HE.D,P=HE.P;
const add=(k,v)=>{D[k]=v;if(k.includes("{d}"))D[k.replace(/\{d\}/g,"{}/{}/{}")]=v.replace(/\{d\}/g,"{}/{}/{}")};
add("Regular bills, plus the monthly average of irregular bills (last {} months)","חשבונות קבועים, ועוד הממוצע החודשי של חשבונות לא קבועים ({} החודשים האחרונים)");
add("Regular bills, plus the monthly average of irregular bills (last {} months), which adds up to {} a year","חשבונות קבועים, ועוד הממוצע החודשי של חשבונות לא קבועים ({} החודשים האחרונים), שמצטברים ל‑{} בשנה");
add("Regular bills, which add up to {} a year","חשבונות קבועים, שמצטברים ל‑{} בשנה");
add("{} bills are due. Amounts are predicted.","{} חשבונות לתשלום. הסכומים חזויים.");
add("1 bill is due. The amount is predicted.","חשבון אחד לתשלום. הסכום חזוי.");
add("{} bills have changed price. The amount is the effect over a year.","המחיר של {} חשבונות השתנה. הסכום הוא ההשפעה על פני שנה.");
add("1 bill has changed price. The amount is the effect over a year.","המחיר של חשבון אחד השתנה. הסכום הוא ההשפעה על פני שנה.");
add("The same store charges you on a regular schedule. The next payment is predicted and tracked.","אותה חנות מחייבת אתכם בלוח זמנים קבוע. התשלום הבא נחזה ונמצא במעקב.");
add("Every payment to this store counts as a bill, but the timing varies.","כל תשלום לחנות הזו נחשב לחשבון, אבל מועד התשלום משתנה.");
add("a month, on average","בחודש, בממוצע");
add("{} a month, on average","{} בחודש, בממוצע");
add("Purchases you are paying off in instalments, with how many are left.","קניות שאתם משלמים בתשלומים, עם מספר התשלומים שנותרו.");
add("A single payment that you marked as a bill","תשלום בודד שסימנתם כחשבון");
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
[/^(?:You told the app that every payment to "(.+?)" is a bill\. )?Every payment to "(.+?)" counts as a bill, even though the timing varies\. You have made (\d+) payments? so far, about (\d+) in the last (\d+) months\.$/,(a,b,c,d,e)=>(a?"ביקשתם מהאפליקציה להתייחס לכל תשלום ל״"+a+"״ כחשבון. ":"")+"כל תשלום ל״"+b+"״ נחשב לחשבון, גם כשהמועד משתנה. עד כה שילמתם "+(c=="1"?"תשלום אחד":c+" תשלומים")+", בערך "+d+" ב‑"+e+" החודשים האחרונים."],
[/^Last charge was (.+) on (.+)$/,(a,b)=>"החיוב האחרון היה "+a+" ב‑"+iso(b)],
[/^last payment was (.+) on (.+)$/,(a,b)=>"התשלום האחרון היה "+a+" ב‑"+iso(b)],
[/^Last payment was (.+)$/,a=>"התשלום האחרון היה "+a],
[/^Next charge on (.+)$/,a=>"החיוב הבא ב‑"+iso(a)],
[/^Canceled on (.+)$/,a=>"בוטל ב‑"+iso(a)],
[/^paid on (.+)$/,a=>"שולם ב‑"+iso(a)]);
add("The same business or person charges you on a regular schedule. The next payment is predicted and tracked.","אותו עסק או אדם מחייבים אתכם בלוח זמנים קבוע. התשלום הבא נחזה ונמצא במעקב.");
add("Every payment to this business or person counts as a bill, but the timing varies.","כל תשלום לעסק או לאדם הזה נחשב לחשבון, אבל מועד התשלום משתנה.");
add("Every payment to this business or person counts as a bill, but the timing varies. Good for things that come at different times.","כל תשלום לעסק או לאדם הזה נחשב לחשבון, אבל מועד התשלום משתנה. מתאים לדברים שמגיעים בזמנים שונים.");
add("Payments to this business or person are already bills","תשלומים לעסק או לאדם הזה כבר נחשבים לחשבונות");
add("Regular","קבועים");
add("Regular bill","חשבון קבוע");
add("Regular · every month","קבוע · כל חודש");
add("Regular · every 2 months","קבוע · כל חודשיים");
add("Regular · every year","קבוע · כל שנה");
add("Regular, irregular and one-off bills the app tracks","חשבונות קבועים, לא קבועים וחד‑פעמיים שהאפליקציה עוקבת אחריהם");
})();
