/* Hebrew rules: sentences with names, numbers, dates or gender inside, and the wording fixes applied on top of he-text.js.
   Order matters: later rules are tried first (P.unshift) or last (P.push), as in the original files. Loaded after he-text.js. */
/* ---- he-dict.js ---- */
/* generated from the translation parts: do not edit by hand */
(function(){const D=HE.D,P=HE.P;

// sentences with names or amounts inside: a pattern captures the variable parts (names are translated too when they are known categories)
const N=(s,T)=>T(s),Q=(a,b)=>[a,b];
P.push(
[/^(.+) looks overdue$/,(n,T)=>N(n,T)+" נראה באיחור"],
[/^(.+) is due today$/,(n,T)=>N(n,T)+" לתשלום היום"],
[/^(.+) is due in (\d+) days?$/,(n,d,T)=>N(n,T)+" לתשלום בעוד "+d+(d==1?" יום":" ימים")],
[/^(.+) costs (more|less) now$/,(n,w,T)=>N(n,T)+(w=="more"?" עולה יותר עכשיו":" עולה פחות עכשיו")],
[/^(.+) is over budget$/,(n,T)=>N(n,T)+" חרגה מהתקציב"],
[/^(.+) is at (\d+)% of its budget$/,(n,p,T)=>N(n,T)+" ב‑"+p+"% מהתקציב"],
[/^Only (.+) left for (\d+) days$/,(a,d)=>"נשארו רק "+a+" ל‑"+d+" ימים"],
[/^(.+) is on pace to go over$/,(n,T)=>N(n,T)+" בדרך לחריגה"],
[/^(.+) charge is (\d+)% higher than last month$/,(n,p,T)=>"חיוב "+N(n,T)+" גבוה ב‑"+p+"% מחודש שעבר"],
[/^(.+) upcoming vs (.+) last month$/,(a,b)=>a+" קרוב לעומת "+b+" בחודש שעבר"],
[/^Large (income|expense): (.+)$/,(k,d)=>(k=="income"?"הכנסה גדולה: ":"הוצאה גדולה: ")+d],
[/^(\d+) transfers? to review$/,(n)=>n+(n==1?" העברה":" העברות")+" לבדיקה"],
[/^Matched between your own accounts\. Check the cost counted\.$/,()=>"זוהו בין החשבונות שלכם. בדקו את העלות שנספרה."],
[/^(\d+) possible duplicates?$/,(n)=>n+(n==1?" כפילות אפשרית":" כפילויות אפשריות")],
[/^The same amount, store and day appears twice$/,()=>"אותו סכום, עסק ויום מופיעים פעמיים"],
[/^(.+): money (left|arrived) with no transaction \((.+)\)$/,(n,w,a,T)=>N(n,T)+": "+(w=="left"?"כסף יצא":"כסף נכנס")+" בלי תנועה ("+a+")"],
[/^The balance moved but no transaction explains it yet\. Add it or import the CSV\.$/,()=>"היתרה זזה אבל שום תנועה עדיין לא מסבירה זאת. הוסיפו אותה או ייבאו את ה‑CSV."],
[/^(.+) sync failed$/,(n,T)=>"הסנכרון של "+N(n,T)+" נכשל"],
[/^(.+) not updated for (\d+) days$/,(n,d,T)=>N(n,T)+" לא עודכן כבר "+d+" ימים"],
[/^(\d+) transactions? needs? a category$/,(n)=>n+(n==1?" תנועה צריכה קטגוריה":" תנועות צריכות קטגוריה")],
[/^Forecast: balance turns negative in (.+)$/,(m,T)=>"תחזית: היתרה נהיית שלילית ב"+T(m)],
[/^Based on the last (\d+) months$/,(n)=>"מבוסס על "+n+" החודשים האחרונים"],
[/^No document on income: (.+)$/,(d)=>"אין מסמך להכנסה: "+d],
[/^Part of the bill "(.*)"\. Found automatically: the same store charged you (\d+) times at a regular rhythm \((.+)\) for a similar amount \(about (.+)\), so it is treated as a recurring bill\.(?: Payments seen: (.+))?$/,(n,c,r,a,ps,T)=>"חלק מהחשבון \""+n+"\". זוהה אוטומטית: אותו עסק חייב אתכם "+c+" פעמים בקצב קבוע ("+T(r)+") בסכום דומה (בערך "+a+"), ולכן הוא נחשב לחשבון חוזר."+(ps?" תשלומים שנראו: "+ps:"")],
[/^Part of the bill "(.*)"\.\s*(.*)$/,(n,rest,T)=>"חלק מהחשבון \""+n+"\". "+T(rest)],
[/^You marked this payment as a bill \(a one-off, not recurring\)\.$/,()=>"סימנתם את התשלום הזה כחשבון (חד‑פעמי, לא חוזר)."],
[/^This looks like the same (.+) refund counted twice: on your card on (.+) and in your bank on (.+) \((.+)\)\. Count it once\.$/,(a,d1,d2,n)=>"נראה שזה אותו החזר של "+a+" שנספר פעמיים: בכרטיס ב‑"+d1+" ובבנק ב‑"+d2+" ("+n+"). ספרו אותו פעם אחת."],
[/^This looks like the same (.+) refund counted twice: in your bank on (.+) and on your card on (.+) \((.+)\)\. Count it once\.$/,(a,d1,d2,n)=>"נראה שזה אותו החזר של "+a+" שנספר פעמיים: בבנק ב‑"+d1+" ובכרטיס ב‑"+d2+" ("+n+"). ספרו אותו פעם אחת."],
[/^Payment of your (.+) bill from the bank\. Not counted as spending, because the purchases are already counted on the card\.$/,(n,T)=>"תשלום חיוב ה"+T(n)+" שלכם מהבנק. לא נספר כהוצאה, כי הרכישות כבר נספרו בכרטיס."],
[/^Transfer between your own accounts\. (Cost (.+) counted as an expense|No cost)\.$/,(a,c)=>"העברה בין החשבונות שלכם. "+(c?"עלות של "+c+" נספרה כהוצאה.":"ללא עלות.")],
[/^Upcoming, scheduled for (.+)\. (.+?) reported this ahead of time, for example a card purchase that will be debited on that date, an installment or a standing order\. It is not counted in your totals until that day\.$/,(d,b,T)=>"קרוב, מתוכנן ל‑"+d+". "+T(b)+" דיווח על זה מראש, למשל רכישה בכרטיס שתחויב בתאריך הזה, תשלום או הוראת קבע. זה לא נספר בסיכומים עד אותו יום."],
[/^Part of the bill\b/,()=>null],
[/^Delete (.+)$/,(n,T)=>"מחיקת "+T(n)],
[/^Remove (.+)$/,(n,T)=>"הסרת "+T(n)],
[/^Hide (.+) from merchants$/,(n,T)=>"הסתרת "+T(n)+" מרשימת העסקים"],
[/^(.+) · (.+) \/ month$/,(a,b,T)=>T(a)+" · "+b+" / חודש"],
[/^Delete "(.+)"\? Its transactions become uncategorized, and its rules and budget are removed\.$/,(k,T)=>"למחוק את \""+T(k)+"\"? התנועות שלה יהפכו ללא קטגוריה, והכללים והתקציב שלה יוסרו."],
[/^Delete the jar "(.+)"\?$/,(n)=>"למחוק את הקופה \""+n+"\"?"],
[/^Set up a rule for (.+)\?$/,(c,T)=>"להגדיר כלל עבור "+T(c)+"?"],
[/^(\d+) other uncategorized items? looks? like "(.+)"\.$/,(n,k)=>(n==1?"פריט אחד נוסף ללא קטגוריה נראה כמו":n+" פריטים נוספים ללא קטגוריה נראים כמו")+" \""+k+"\"."],
[/^No other uncategorized items look like "(.+)" yet, but a rule would catch future ones\.$/,(k)=>"עדיין אין פריטים נוספים ללא קטגוריה שנראים כמו \""+k+"\", אבל כלל יתפוס את העתידיים."],
[/^Saved (.+)$/,(n,T)=>"נשמר: "+T(n)],
[/^(\d+) changes saved$/,(n)=>n+" שינויים נשמרו"],
[/^(\d+) jars? received money$/,(n)=>n==1?"קופה אחת קיבלה כסף":n+" קופות קיבלו כסף"],
[/^(\d+) jars? received (₪[\d,]+)$/,(n,a)=>(n==1?"קופה אחת קיבלה ":n+" קופות קיבלו ")+a],
[/^Read (\d+) rows · (\d+) new, (\d+) merged$/,(r,a,m)=>"נקראו "+r+" שורות · "+a+" חדשות, "+m+" מוזגו"],
[/^Imported (\d+) new, merged (\d+)$/,(a,m)=>"יובאו "+a+" חדשות, מוזגו "+m],
[/^Import failed: (.+)$/,(m,T)=>"הייבוא נכשל: "+T(m)],
[/^(.+) rates loaded$/,(c)=>"שערי "+c+" נטענו"],
[/^Saved, but rates could not be fetched yet: (.+)$/,(m)=>"נשמר, אבל עדיין אי אפשר היה לשלוף שערים: "+m],
[/^(.+) failed\. See Settings → Connections$/,(n,T)=>N(n,T)+" נכשל. ראו הגדרות ← חיבורים"],
[/^Added (\d+) categories and (\d+) rules(?:, and sorted (\d+) uncategorized transactions?)?\.?$/,(c,r,s)=>"נוספו "+c+" קטגוריות ו‑"+r+" כללים"+(s?", ומוינו "+s+" תנועות ללא קטגוריה":"")],
[/^Last synced (.+)\.$/,(w,T)=>"סונכרן לאחרונה "+T(w)+"."],
[/^Last synced (.+), over 2 days ago\. Press Sync now\.$/,(w,T)=>"סונכרן לאחרונה "+T(w)+", לפני יותר מיומיים. לחצו על סנכרון עכשיו."],
[/^The login works \((.+)\)\. Press Sync now to import your data\.$/,(w,T)=>"ההתחברות תקינה ("+T(w)+"). לחצו על סנכרון עכשיו כדי לייבא את הנתונים."],
[/^Last automatic run: (.+)\.$/,(w,T)=>"ההרצה האוטומטית האחרונה: "+T(w)+"."],
[/^Device verified (.+)$/,(w,T)=>"המכשיר אומת "+T(w)],
[/^Synced (.+)$/,(w,T)=>"סונכרן "+T(w)],
[/^Last synced (.+)$/,(w,T)=>"סונכרן לאחרונה "+T(w)],
[/^Last synced (.+) \(over 2 days ago\)$/,(w,T)=>"סונכרן לאחרונה "+T(w)+" (לפני יותר מיומיים)"],
[/^(\d+) minutes? ago$/,(n)=>"לפני "+n+(n==1?" דקה":" דקות")],
[/^(\d+) hours? ago$/,(n)=>"לפני "+n+(n==1?" שעה":" שעות")],
[/^(\d+) days? ago$/,(n)=>"לפני "+n+(n==1?" יום":" ימים")],
[/^just now$/i,()=>"ממש עכשיו"],[/^never$/,()=>"אף פעם"],
[/^(Syncing|Testing|Verifying) (.+)… (\d+:\d+) · (.+)$/,(a,b,t,rest,T)=>({Syncing:"מסנכרן",Testing:"בודק",Verifying:"מאמת"})[a]+" "+T(b)+"… "+t+" · "+T(rest)],
[/^(\d+) tx$/,(n)=>n+" תנועות"],
[/^(.+) · (\d+) transactions?$/,(a,n,T)=>T(a)+" · "+n+" תנועות"]
);
const CUR={"BGN": "לב בולגרי", "BRL": "ריאל ברזילאי", "CAD": "דולר קנדי", "CHF": "פרנק שוויצרי", "CNY": "יואן סיני", "CZK": "קורונה צ'כית", "DKK": "כתר דני", "EUR": "יורו", "HKD": "דולר הונג קונג", "HUF": "פורינט הונגרי", "INR": "רופי הודי", "JPY": "ין יפני", "KRW": "וון דרום קוריאני", "MXN": "פסו מקסיקני", "NOK": "כתר נורווגי", "NZD": "דולר ניו זילנדי", "PLN": "זלוטי פולני", "RON": "לאו רומני", "SEK": "כתר שוודי", "SGD": "דולר סינגפורי", "THB": "באט תאילנדי", "TRY": "לירה טורקית", "ZAR": "ראנד דרום אפריקאי", "AUD": "דולר אוסטרלי", "GBP": "לירה שטרלינג", "USD": "דולר אמריקאי"};
P.push(
[/^([A-Z]{3}) · (.+)$/,(c,n)=>CUR[c]?c+" · "+CUR[c]:null],
[/^(.+) · (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec): (.+)$/,(n,m,a,T)=>T(n)+" · "+HE.mo(m)+": "+a],
[/^(.+): (₪[\d,]+) \((\d+%)\)$/,(n,a,p,T)=>T(n)+": "+a+" ("+p+")"],
[/^(.+): (₪[\d,]+) \((\d+%)\)$/,(n,a,p,T)=>T(n)+": "+a+" ("+p+")"]
);
P.push(
[/^Two-factor sign-in · (.+)$/,(s,T)=>"כניסה דו‑שלבית · "+T(s)],
[/^Every payment to "(.+)" counts as a bill even though it does not repeat regularly \((.+)\)\. (.*)$/,(n,a,rest,T)=>"כל תשלום ל\""+n+"\" נחשב לחשבון גם אם הוא לא חוזר באופן קבוע ("+a+"). "+T(rest)],
[/^Every payment to "(.+)" is a bill\.$/,(n)=>"כל תשלום ל\""+n+"\" הוא חשבון."],
[/^You told the app that every payment to "(.+)" is a bill\.$/,(n)=>"אמרתם לאפליקציה שכל תשלום ל\""+n+"\" הוא חשבון."],
[/^Received (₪[\d,]+) this month(?: of its (₪[\d,]+))?\.$/,(a,b)=>"התקבלו "+a+" החודש"+(b?" מתוך "+b:"")+"."],
[/^Received (₪[\d,]+) of (₪[\d,]+) this month\. (₪[\d,]+) more is due; it takes it as soon as money is available\.$/,(a,b,c)=>"התקבלו "+a+" מתוך "+b+" החודש. עוד "+c+" מגיעים לה; היא תקבל אותם ברגע שיהיה כסף פנוי."],
[/^Last charge (.+) on (.+)$/,(a,d)=>"חיוב אחרון "+a+" ב‑"+d],
[/^You've spent (\d+)% (more|less) than you did by this day last month\. By (.+) (\d+) you had spent (₪[\d,.]+)\.$/,(a,b,c,d,e,T)=>"הוצאת "+a+"% "+(b=="more"?"יותר":"פחות")+" מאשר עד אותו יום בחודש שעבר. עד ה-"+d+" ב"+T(c)+" הוצאת "+e+"."],
[/^You've spent the same as you did by this day last month\. By (.+) (\d+) you had spent (₪[\d,.]+)\.$/,(c,d,e,T)=>"הוצאת אותו סכום כמו עד אותו יום בחודש שעבר. עד ה-"+d+" ב"+T(c)+" הוצאת "+e+"."],
[/^You had spent nothing by this day last month \((.+) (\d+)\)\.$/,(c,d,T)=>"עד אותו יום בחודש שעבר (ה-"+d+" ב"+T(c)+") עדיין לא הוצאת כלום."],
[/^By (.+) (\d+) you had spent (₪[\d,.]+)\. That is (\d+)% of the (₪[\d,.]+) you spent in all of (.+)\.$/,(a,b,c,d,e,f,T)=>"עד ה-"+b+" ב"+T(a)+" הוצאת "+c+". זה "+d+"% מסך ההוצאות ב"+T(f)+" ("+e+")."],
[/^([^\n]+)\nNot enough history to compare to the previous period\.$/,(a,T)=>T(a)+"\n"+T("Not enough history to compare to the previous period.")],
[/^By (.+) (\d+) you had spent (₪[\d,.]+)\.$/,(a,b,c,T)=>"עד ה-"+b+" ב"+T(a)+" הוצאת "+c+"."],
[/^So this month is the same\.$/,()=>"כלומר החודש זהה"],
[/^(.+) same days$/,(m,T)=>T(m)+" עד אותו יום"],
[/^(.+) so far$/,(m,T)=>T(m)+" עד כה"],
[/^(\d+)% of what you spent in all of last month$/,(p)=>p+"% ממה שהוצאת בכל החודש שעבר"],
[/^(\d+)% of last month's total spent so far$/,(p)=>p+"% מסך ההוצאות של חודש שעבר עד כה"],
[/^(\d+) payments?, about (\d+) in the last 12 months · last (.+) on (.+)$/,(n,c,a,d)=>n+" תשלומים, בערך "+c+" ב‑12 החודשים האחרונים · אחרון "+a+" ב‑"+d],
[/^Found automatically: (.*)$/,(r,T)=>"זוהה אוטומטית: "+T(r)]
);
P.push(
[/^New transactions with "(.+)" now go to (.+)\.$/,(k,c,T)=>"תנועות חדשות עם \""+k+"\" יועברו מעכשיו ל"+T(c)+"."],
[/^Move (\d+) past transactions? too$/,(n)=>n==1?"להעביר גם תנועה קודמת אחת":"להעביר גם "+n+" תנועות קודמות"],
[/^(\d+) transactions moved to (.+)$/,(n,c,T)=>n+" תנועות הועברו ל"+T(c)]
);
P.push(
[/^Create “(.+)”$/,(t)=>"יצירת “"+t+"”"],
[/^Tagged (\d+) existing transactions? with (.+)$/,(n,t)=>(n==1?"תנועה קיימת אחת סומנה":n+" תנועות קיימות סומנו")+" ב‑"+t],
[/^Tag added to the rule: (.+)$/,(t)=>"התגית נוספה לכלל: "+t],
[/^(.+) \((\d+)\)$/,(t,n,T)=>{const r=T(t);return r===t?null:r+" ("+n+")"}]
);

P.push(
[/^Part of what is left is paid by the jar (.+), so only the rest is held back from your accounts\.$/,(n)=>"חלק ממה שנשאר משולם על ידי הקופה "+n+", ולכן רק השאר נשמר בצד מהחשבונות שלכם."],
[/^Covered by jar (.+)$/,(n)=>"מכוסה על ידי הקופה "+n],
[/^Priority (\d+) of (\d+)$/,(a,b)=>"עדיפות "+a+" מתוך "+b]
);

})();

(function(){const D=HE.D,N={
"Appearance": "מראה",
"Reset": "איפוס",
"Texture": "מרקם",
"Texture density": "צפיפות המרקם",
"None": "ללא",
"Grid": "רשת",
"Static": "סטטי",
"Background": "רקע",
"Dots": "נקודות",
"Stripes": "פסים",
"Category rules": "כללי קטגוריות",
"Tag rules": "כללי תגיות",
"Add rule": "הוספת כלל",
"If a new transaction's description contains the text, it gets that category. The first matching rule wins, and a category you set by hand is never changed.": "אם התיאור של תנועה חדשה מכיל את הטקסט, היא מקבלת את הקטגוריה הזו. הכלל הראשון שמתאים גובר, וקטגוריה שקבעתם ידנית לא משתנה לעולם.",
"If a new transaction's description contains the text, it gets these tags. Tags are added on top of the category, and a rule can add several. When you add a rule you can also tag the transactions you already have.": "אם התיאור של תנועה חדשה מכיל את הטקסט, היא מקבלת את התגיות האלה. התגיות מתווספות מעל הקטגוריה, וכלל יכול להוסיף כמה תגיות. כשמוסיפים כלל אפשר גם לתייג את התנועות שכבר קיימות.",
"No rules yet. Add one below, or add the suggested ones in the Categories tab.": "אין עדיין כללים. הוסיפו אחד למטה, או הוסיפו את המוצעים בלשונית הקטגוריות.",
"No tag rules yet. Add one below. Example: “netflix” adds the tag “streaming”.": "אין עדיין כללי תגיות. הוסיפו אחד למטה. לדוגמה: ״netflix״ מוסיף את התגית ״streaming״.",
"Tag your earlier transactions too?": "לתייג גם את התנועות הקודמות?",
"Only new ones": "רק חדשות",
"Tag {} existing": "תייגו {} קיימות",
"A tag rule needs at least one tag. Delete the rule instead.": "לכלל תגית צריכה להיות לפחות תגית אחת. מחקו את הכלל במקום.",
"Add at least one tag": "הוסיפו לפחות תגית אחת",
"About this chart": "על התרשים",
"Include pension": "כולל פנסיה",
"Bars": "עמודות",
"Line": "קו",
"Area": "שטח",
"Click to open in Activity": "לחצו לפתיחה בפעילות",
"Category trend": "מגמת קטגוריות",
"Compare with the previous {} months": "השוואה ל-{} החודשים הקודמים",
"Compare with the previous {} years": "השוואה ל-{} השנים הקודמות",
"Compare with the same time frame before": "השוואה לתקופה באותו אורך שלפני",
"One snapshot is saved each month, so past months do not change when exchange rates move.": "נשמר תצלום אחד בכל חודש, כך שחודשים קודמים לא משתנים כששערי החליפין זזים.",
"Months without a snapshot are worked out from your transactions: today's balance minus what moved since.": "חודשים בלי תצלום מחושבים מהתנועות שלכם: היתרה היום פחות מה שזז מאז.",
"You update the pension by hand, so it is left out unless you switch it on.": "את הפנסיה מעדכנים ידנית, ולכן היא לא נכללת אלא אם מפעילים אותה.",
"Month by month from your transactions.": "חודש אחר חודש, מהתנועות שלכם.",
"Not included: transfers between your own accounts, card bill payments, and anything you left out.": "לא נכללים: העברות בין החשבונות שלכם, תשלומי חשבון כרטיס, וכל מה שהוצאתם.",
"Add a connection": "הוספת חיבור",
"Choose the banks and cards you use. Only the ones you add are shown and synced.": "בחרו את הבנקים והכרטיסים שבהם אתם משתמשים. רק מה שתוסיפו מוצג ומסונכרן.",
"Choose a bank or card…": "בחרו בנק או כרטיס…",
"Banks": "בנקים",
"Credit cards": "כרטיסי אשראי",
"Wallets": "ארנקים",
"Add": "הוספה",
"Every supported bank and card is already added.": "כל הבנקים והכרטיסים הנתמכים כבר נוספו.",
"Something missing? Import a CSV export from your bank or card instead (Settings → App and data).": "חסר משהו? אפשר לייבא קובץ CSV מהבנק או מהכרטיס (הגדרות ← אפליקציה ונתונים).",
"These are not offered again. To disconnect one, press Remove on its own card.": "אלה לא מוצעים שוב. כדי לנתק אחד, לחצו על הסרה בכרטיס שלו.",
"Bank Leumi": "בנק לאומי",
"Discount Bank": "בנק דיסקונט",
"Mercantile Discount": "מרכנתיל דיסקונט",
"Mizrahi-Tefahot": "מזרחי-טפחות",
"Otsar Hahayal": "אוצר החייל",
"Union Bank": "בנק איגוד",
"First International Bank": "הבנק הבינלאומי",
"Bank Massad": "בנק מסד",
"Bank Yahav": "בנק יהב",
"Visa Cal": "ויזה כאל",
"American Express": "אמריקן אקספרס",
"Search categories…": "חיפוש קטגוריות…",
"{} selected": "{} נבחרו",
"Selected": "נבחרו",
"Available": "זמינות",
"In another jar · choosing one moves it here": "בקופה אחרת · בחירה בקטגוריה מעבירה אותה לכאן",
"Pays for this": "משלמת על זה",
"Not linked": "לא מקושרת",
"No category matches.": "אין קטגוריה מתאימה.",
"transaction": "תנועה",
"transactions": "תנועות",
"In": "נכנס",
"Out": "יוצא",
"Net": "נטו",
"{} upcoming not counted": "{} עתידיות לא נספרות",
"Lowest": "הנמוך ביותר",
"Highest": "הגבוה ביותר",
"More info": "מידע נוסף",
"Found automatically": "נמצא אוטומטית",
"Added by you": "נוסף על ידכם",
"Why is this a bill?": "למה זה חשבון?",
"Spending by category": "הוצאות לפי קטגוריה",
"Light": "בהיר",
"Dark": "כהה",
"Auto": "אוטומטי"
};})();

/* ---- he-fix.js ---- */
/* Hebrew polish. Loaded after he-dict.js: entries here replace the older ones with more natural, modern wording, and add text the app shows
   that had no translation. Terms used throughout: קופה (jar), יעד (goal), חשבון (bill), תנועה (transaction), סנכרון (sync), לבדיקה (needs review). */

(function(){const D=HE.D;

})();
(function(){const D=HE.D,P=HE.P;

const MONTHS=s=>String(s).replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\b/g,m=>HE.mo(m));
const DAYA={Sun:"יום א׳",Mon:"יום ב׳",Tue:"יום ג׳",Wed:"יום ד׳",Thu:"יום ה׳",Fri:"יום ו׳",Sat:"שבת"};
const tail=(t)=>String(t).split(/(?<=[.!?])\s+/).map(HE.T).join(" ");
P.unshift(
[/^Part of the bill "(.*)"\. Found automatically: this (?:store|business or person) charged you (\d+) times on a regular schedule \((.+)\) for a similar amount \(about (.+)\)\.(?: Payments seen: (.+))?$/,(n,c,r,a,ps,T)=>"חלק מהחשבון ״"+n+"״. זוהה אוטומטית: העסק או האדם חייבו אתכם "+c+" פעמים בקצב קבוע ("+T(r)+") בסכום דומה (בערך "+a+")."+(ps?" תשלומים שנראו: "+ps:"")],
[/^Part of the bill "(.*)"\. You told the app that every payment to this store is a bill\.$/,(n)=>"חלק מהחשבון ״"+n+"״. אמרתם לאפליקציה שכל תשלום לעסק הזה הוא חשבון."],
[/^(.+) · Left to spend(?: · est\.)?$/,(c,T)=>T(c)+" · נשאר להוצאה"],
[/^Paid from the jar (.+)$/,(j)=>"שולם מהקופה "+j],
[/^(.+) \(paid by (.+)\)$/,(c,j,T)=>T(c)+" (משולם מהקופה "+j+")"],
[/^income about (.+) a month and expenses about (.+) a month, from (\d+) complete months? \((.+)\)\. (\w+) so far is not included\. (.*)$/,(a,b,n,ms,m,rest)=>"הכנסות של בערך "+a+" בחודש והוצאות של בערך "+b+" בחודש, מתוך "+n+(n==1?" חודש מלא":" חודשים מלאים")+" ("+MONTHS(ms)+"). "+MONTHS(m)+" עד עכשיו לא נכלל. "+tail(rest)],
[/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (\d{1,2}) ([A-Za-z]+) (\d{4})$/,(d,n,mo,y)=>DAYA[d]+", "+n+" ב"+HE.mo(mo)+" "+y],
);
})();

(function(){const D=HE.D,P=HE.P;

P.unshift(
[/^Version (\S+) is available\.$/,(v)=>"גרסה "+v+" זמינה."],
[/^(.+) · (₪[\d,]+) saved$/,(j,a)=>j+" · "+a+" נחסכו"],
[/^Downloading version (\S+)… (\d+)%$/,(v,p)=>"מוריד את גרסה "+v+"… "+p+"%"],
[/^Version (\S+) is ready\. Restart the app to finish updating\. Your data stays as it is\.$/,(v)=>"גרסה "+v+" מוכנה. הפעילו מחדש את האפליקציה כדי לסיים את העדכון. הנתונים שלכם נשארים כמו שהם."]
);
})();
(function(){const D=HE.D,P=HE.P;

P.unshift(
[/^(\d+) other transactions? look like “(.+)”\.$/,(n,k)=>(n==1?"תנועה אחת נוספת דומה ל‑":n+" תנועות נוספות דומות ל‑")+"״"+k+"״."],
[/^You tagged (.+) with (.+)\. A rule does this automatically for similar transactions from now on\.$/,(d,t)=>"תייגתם את "+d+" ב‑"+t+". כלל יעשה זאת אוטומטית לתנועות דומות מעכשיו."],
[/^Rule created\. (\d+) transactions? tagged\.$/,(n)=>"הכלל נוצר. "+(n==1?"תנועה אחת תויגה.":n+" תנועות תויגו.")],
[/^Renamed to #(.+)$/,(t)=>"השם שונה ל‑#"+t],
[/^Delete the tag "(.+)"\? It is removed from (\d+) transactions? and from tag rules\. The transactions stay\.$/,(g,n)=>"למחוק את התגית ״"+g+"״? היא תוסר מ‑"+n+" תנועות ומכללי התגיות. התנועות נשארות."],
[/^Rename (.+)$/,(g)=>"שינוי שם "+g],
[/^Also tag the (\d+) similar transactions? I already have$/,(n)=>"לתייג גם "+(n==1?"את התנועה הדומה שכבר יש לי":"את "+n+" התנועות הדומות שכבר יש לי")]
);
})();
(function(){const D=HE.D;

})();

/* ---- spacing, history wording, several logins at one company ---- */
(function(){const D=HE.D,P=HE.P;

P.unshift(
[/^Connected: (.+?)\. Have two logins at one company \(two Wise accounts, two sets of cards\)\? Add it again and give each a nickname\. To disconnect one, press Remove on its own card\.$/,(a)=>"מחוברים: "+a+". יש לכם שתי התחברויות באותה חברה (שני חשבונות Wise, שני סטים של כרטיסים)? הוסיפו אותה שוב ותנו לכל אחת כינוי. כדי לנתק אחת, לחצו על הסרה בכרטיס שלה."],
[/^(.+) \(another login\)$/,(a)=>a+" (התחברות נוספת)"],
[/^(.+) · new login$/,(a)=>a+" · התחברות חדשה"]
);
})();

/* ---- he-new.js ---- */
/* Hebrew additions for the newest screens (Accounts, Alerts, Settings sections, flow home, jar forecast, page guide, Activity paging).
   Loaded after he-fix.js, same format: exact text in HE.D, text with names or counts in HE.P. Numbers and dates are lifted out by he-core, so {} stands for a number. */
(function(){const D=HE.D,P=HE.P;
const M=s=>String(s).replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\b/g,m=>HE.mo(m));
const T=s=>M(HE.T(s)),B=s=>"ב"+M(s);
const N=(n,one,many)=>+n==1?one:n+" "+many;

const PL=(n,a,b)=>+n==1?a:n+" "+b;

P.unshift(
/* flow, jars */
[/^Transfer cost · (.+)$/,a=>"עלות העברה · "+a],
[/^Jar · (.+)$/,a=>"קופה · "+a],
[/^balance ([+−-].+)$/,a=>"יתרה "+a],
[/^Net · (.+)$/,a=>"נטו · "+M(a)],
[/^(.+) · upcoming charge$/,a=>a+" · חיוב קרוב"],
[/^Payment (\d+) of (\d+), (\d+) left$/,(a,b,c)=>"תשלום "+a+" מתוך "+b+", נותרו "+c],
[/^Payment (\d+) of (\d+), the last one$/,(a,b)=>"תשלום "+a+" מתוך "+b+", האחרון"],
[/^(\d+) payments? left · (.+) still to pay · the last one is around (.+)$/,(n,b,c)=>(+n==1?"נותר תשלום אחד":"נותרו "+n+" תשלומים")+" · עוד "+b+" לתשלום · האחרון בערך "+B(c)],
[/^(\d+) payments? left$/,n=>+n==1?"נותר תשלום אחד":"נותרו "+n+" תשלומים"],
[/^Payment (\d+) of (\d+) · (\d+) left · last one around (.+)$/,(a,b,c,d)=>"תשלום "+a+" מתוך "+b+" · נותרו "+c+" · האחרון בערך "+B(d)],
[/^· last one around (.+)$/,a=>"· האחרון בערך "+B(a)],
[/^Also tag the (\d+) similar transactions? I already have$/,n=>"לתייג גם "+(+n==1?"תנועה דומה אחת":n+" תנועות דומות")+" שכבר יש לי"],
[/^(\d+) other transactions? look(?:s)? like “(.+)”\.$/,(n,k)=>(+n==1?"תנועה אחת נוספת דומה":n+" תנועות נוספות דומות")+" ל־“"+k+"”."],
[/^No other transactions look like “(.+)” yet, but a rule would tag future ones\.$/,k=>"אין עדיין תנועות אחרות הדומות ל־“"+k+"”, אבל כלל יתייג את העתידיות."],
[/^Rule added\. New transactions that contain “(.+)” get (.+)\.$/,(k,t)=>"הכלל נוסף. תנועות חדשות שמכילות “"+k+"” יקבלו "+t+"."],
[/^(?:The rule is saved\. )?From now on, new transactions that contain “(.+)” get$/,k=>"הכלל נשמר. מעכשיו תנועות חדשות שמכילות “"+k+"” יקבלו"],
[/^transactions? you already have match(?:es)?\.$/,s=>/^transaction /.test(s)?"תנועה שכבר יש לכם מתאימה.":"תנועות שכבר יש לכם מתאימות."],
[/^(\d+) transactions? you already have match(?:es)?\.$/,n=>+n==1?"תנועה אחת שכבר יש לכם מתאימה.":n+" תנועות שכבר יש לכם מתאימות."],
[/^Showing only (\d+) items?$/,n=>"מוצג"+(+n==1?" פריט אחד בלבד":"ים "+n+" פריטים בלבד")],
[/^(.+)\. Everything else is hidden until you clear this\.$/,a=>a+". כל השאר מוסתר עד שתנקו את זה."],
[/^Needs review \((\d+)\)$/,n=>"לבדיקה ("+n+")"],
[/^Show (\d+) more$/,n=>"עוד "+n],
[/^\((\d+) of (\d+) shown\)$/,(a,b)=>"(מוצגות "+a+" מתוך "+b+")"],
[/^(.+) · (.+) · the same amount, store and day appears twice$/,(a,b)=>a+" · "+b+" · אותו סכום, אותו בית עסק ואותו יום מופיעים פעמיים"],
[/^Your (.+) balance (dropped|rose) by (.+?)(?: \((.+?) originally, part of it already explained\))? between (.+?) and (.+?), the times of two syncs\. The balance itself is right\. What is missing is the transaction, so your (spending|income) in reports is too low until you add it\.$/,(n,dir,amt,orig,f,t,kind)=>"היתרה ב־"+n+" "+(dir=="dropped"?"ירדה":"עלתה")+" ב־"+amt+(orig?" (במקור "+orig+", חלק מזה כבר הוסבר)":"")+" בין "+f+" ל־"+t+", זמני שני סנכרונים. היתרה עצמה נכונה. מה שחסר הוא התנועה, ולכן "+(kind=="spending"?"ההוצאות":"ההכנסות")+" שלכם בדוחות נמוכות מדי עד שתוסיפו אותה."],
[/^(\(done\))?,? ?because$/,a=>(a?"(הושלמה)":"")+", כי"],
[/^is a category$/,()=>"היא קטגוריה שהקופה"],
[/^Compared with (.+)$/,a=>"בהשוואה ל"+T(a)],
[/^: total (.+?) vs (.+?)( .*)?$/,(a,b,c)=>": סך הכול "+a+" לעומת "+b+(c||"")],
[/^Balance ([A-Z]{3})$/,a=>"יתרה "+a],
[/^About (\S*\d\S*) · (.+)$/,(a,s)=>"בערך "+a+" · "+s],
[/^(.+) came out of$/,a=>"ירדו "+a+" מהקופה"],
[/^(.+) of this came out of$/,a=>"מזה ירדו "+a+" מהקופה"],
[/^is a category this jar pays for\.$/,()=>"היא קטגוריה שהקופה הזו משלמת עליה."],
[/^pays for, but nothing was taken from it for this payment \(you detached it, or the jar was empty\)\. It came from your own money\.$/,()=>"משלמת עליה, אבל לא ירד ממנה כלום בשביל התשלום הזה (ניתקתם אותו, או שהקופה הייתה ריקה). הוא יצא מהכסף שלכם."],
[/^You have (\d+) payments to this store\.$/,n=>"יש לכם "+n+" תשלומים לבית העסק הזה."],
[/^See all (\d+) payments$/,n=>"הצגת כל "+n+" התשלומים"],
[/^This looks like the same (.+) refund counted twice: (on your card|in your bank) on (.+) and (on your card|in your bank) on (.+) \((.+)\)\. Count it once\.$/,(a,w1,d1,w2,d2,n)=>"זה נראה כמו אותו זיכוי של "+a+" שנספר פעמיים: "+(w1=="on your card"?"בכרטיס":"בבנק")+" ב־"+d1+" ו"+(w2=="on your card"?"בכרטיס":"בבנק")+" ב־"+d2+" ("+n+"). ספרו אותו פעם אחת."],
[/^Payment of your (.+) bill from the bank\. Not counted as spending, because each purchase is already counted on the card\.$/,c=>"תשלום חשבון הכרטיס "+c+" מהבנק. לא נספר כהוצאה, כי כל רכישה כבר נספרה בכרטיס."],
[/^Transfer between your own accounts\. (?:Cost (.+) counted as an expense\.|No cost\.)$/,c=>"העברה בין החשבונות שלכם. "+(c?"עלות של "+c+" נספרה כהוצאה.":"בלי עלות.")],
[/^Cost (.+) · (.+)%$/,(a,b)=>"עלות "+a+" · "+b+"%"],
[/^Done (.+?)(?: · goal (.+?))?(?: · paid out (.+?) in (\d+) payments?)?$/,(d,g,p,n)=>"הושלמה ב־"+d+(g?" · יעד "+g:"")+(p?" · שולמו "+p+" ב־"+(+n==1?"תשלום אחד":n+" תשלומים"):"")],
[/^Deadline (.+) · (\d+) months? left · needs (.+) a month · you put in ([^·]+?)$/,(d,m,r,c)=>"תאריך יעד "+M(d)+" · "+(+m==1?"נותר חודש אחד":"נותרו "+m+" חודשים")+" · צריך "+r+" בחודש · אתם מכניסים "+c],
[/^Deadline (.+) · (\d+) months? left · needs (.+) a month · you put in (.+) · but the free money expected is not enough$/,(d,m,r,c)=>"תאריך יעד "+M(d)+" · "+(+m==1?"נותר חודש אחד":"נותרו "+m+" חודשים")+" · צריך "+r+" בחודש · אתם מכניסים "+c+" · אבל הכסף הפנוי הצפוי לא מספיק"],
[/^No deadline · (.+) a month · (?:full in (\d+) months? \((.+)\), if there is free money each month|not full within 5 years at the free money expected)$/,(c,k,w)=>"בלי תאריך יעד · "+c+" בחודש · "+(k?"תתמלא בעוד "+(+k==1?"חודש":k+" חודשים")+" ("+M(w)+"), אם יש כסף פנוי בכל חודש":"לא תתמלא תוך 5 שנים עם הכסף הפנוי הצפוי")],
[/^At this pace it is full in (.+), after your deadline \((.+)\)\. Put in (.+) a month to make it\.$/,(w,d,c)=>"בקצב הזה היא תתמלא "+B(w)+", אחרי תאריך היעד ("+M(d)+"). הכניסו "+c+" בחודש כדי להספיק."],
[/^At the free money expected, this jar will not be full by your deadline \((.+)\)\.$/,a=>"עם הכסף הפנוי הצפוי, הקופה הזו לא תתמלא עד תאריך היעד ("+M(a)+")."],
[/^Based on what you spent in (.+), plus about 5% extra room\. Categories that are mostly bills, like insurance, are left out: track those as bills\. Nothing is created until you accept, and you can change the amount first\.$/,a=>"לפי מה שהוצאתם ב"+M(a)+", ועוד כ‑5% מרווח. קטגוריות שהן בעיקר חשבונות, כמו ביטוח, לא נכללות: עקבו אחריהן כחשבונות. שום דבר לא נוצר עד שתאשרו, ואפשר לשנות את הסכום קודם."],
[/^Full ([A-Z][a-z]{2} \d{4}) · after the deadline$/,a=>"תתמלא "+B(a)+" · אחרי תאריך היעד"],
[/^Full ([A-Z][a-z]{2} \d{4})$/,a=>"תתמלא "+B(a)],
[/^(.+) is empty$/,a=>a+" ריקה"],
[/^Mark “(.+)” as done\?$/,a=>"לסמן את “"+a+"” כהושלמה?"],
[/^It moves to Completed jars with its history and any payments attached to it\. It stops taking new money and leaves the priority list\.(?: The (.+) still in it goes back to your free money\.)?$/,a=>"היא עוברת לקופות שהושלמו עם ההיסטוריה והתשלומים שמחוברים אליה. היא מפסיקה לקבל כסף חדש ויוצאת מרשימת העדיפויות."+(a?" "+a+" שנשארו בה חוזרים לכסף הפנוי שלכם.":"")],
[/^The jar holds (.+), so it will be emptied(?: \(the rest of the payment came from elsewhere\))?\.$/,a=>"בקופה יש "+a+", ולכן היא תתרוקן."],
[/^The jar goes from (.+) to$/,a=>"הקופה יורדת מ־"+a+" ל־"],
[/^(.+) · (.+) saved$/,(a,b)=>a+" · נחסכו "+b],
[/^(.+) will move from (.+) to this jar\.$/,(a,b)=>a+" יעברו מ־"+b+" לקופה הזו."],
[/^(.+) · spending in these comes out of this jar\.$/,a=>a+" · ההוצאות בהן יורדות מהקופה הזו."],
[/^for (\d+) months? reaches (.+) by (.+)\. The amount updates each month\.$/,(m,t,d)=>"במשך "+(+m==1?"חודש":m+" חודשים")+" מגיע ל־"+t+" עד "+M(d)+". הסכום מתעדכן בכל חודש."],
[/^(.+) a month reaches (.+) in (\d+) months?: on time\.$/,(c,t,k)=>c+" בחודש מגיע ל־"+t+" בעוד "+(+k==1?"חודש":k+" חודשים")+": בזמן."],
[/^(.+) a month takes (\d+) months, which is after your date\. You would need (.+) a month\.$/,(c,k,n)=>c+" בחודש לוקח "+k+" חודשים, וזה אחרי התאריך שלכם. תצטרכו "+n+" בחודש."],
[/^(.+) a month reaches (.+) in (\d+) months? \((.+)\)\.$/,(c,t,k,w)=>c+" בחודש מגיע ל־"+t+" בעוד "+(+k==1?"חודש":k+" חודשים")+" ("+M(w)+")."],
[/^(.+) goes in every month, with no end\. After a year: (.+)\.$/,(c,y)=>c+" נכנסים בכל חודש, בלי סוף. אחרי שנה: "+y+"."],
[/^, which is (\d+) months of (.+)\. The jar keeps that much set aside( and the goal follows your bills)?, so (these bills are|this bill is) not also held back from your free money\.$/,(m,b,all,w)=>", שהם "+m+" חודשים של "+b+". הקופה שומרת סכום כזה בצד"+(all?" והיעד עוקב אחרי החשבונות שלכם":"")+", ולכן "+(/these/.test(w)?"החשבונות האלה לא נשמרים":"החשבון הזה לא נשמר")+" גם מהכסף הפנוי שלכם."],
[/^(\d+) jars? received (.+)$/,(n,t)=>(+n==1?"קופה אחת קיבלה ":n+" קופות קיבלו ")+t],
[/^Paid · (.+)$/,a=>"שולם · "+a],
[/^History · (.+)$/,a=>"היסטוריה · "+a],
[/^⚠ Projected balance turns negative in (.+)$/,a=>"⚠ היתרה החזויה הופכת לשלילית "+B(a)],
[/^Worst case dips below zero around (.+)$/,a=>"במקרה הגרוע יורד מתחת לאפס בערך "+B(a)],
[/^Forecast: balance turns negative in (.+)$/,a=>"תחזית: היתרה הופכת לשלילית "+B(a)],
[/^Based on the last (\d+) months$/,n=>"לפי "+n+" החודשים האחרונים"],
[/^income about (.+?) a month and expenses about (.+?) a month, from (\d+) complete months? \((.*?)\)\. (.+?) so far is not included\. Positive amounts count as income and negative ones as expenses, whatever their category\. Income that arrives in two or more months counts as recurring\. It is estimated from the months it really arrived, including this month so far\. Income that arrived in only one month \(a one-off, like a refund or a single transfer\) is left out, because it would not repeat\.(?: (\d+) credit card bill payments? from the bank (?:is|are) left out, because the purchases are already counted on the card\.)?(?: Only (\d+) complete months? of history exist, so that is what is used\.)?$/,(i,e,n,ms,cur,cp,only)=>"הכנסה של כ־"+i+" בחודש והוצאות של כ־"+e+" בחודש, מתוך "+(+n==1?"חודש מלא אחד":n+" חודשים מלאים")+" ("+M(ms)+"). "+M(cur)+" עד עכשיו לא נכלל. סכומים חיוביים נספרים כהכנסה ושליליים כהוצאה, בלי קשר לקטגוריה. הכנסה שמגיעה בשני חודשים או יותר נחשבת קבועה, והיא מוערכת לפי החודשים שבהם היא באמת הגיעה, כולל החודש הנוכחי עד עכשיו. הכנסה שהגיעה בחודש אחד בלבד (חד‑פעמית, כמו זיכוי או העברה בודדת) לא נכללת, כי היא לא תחזור."+(cp?" "+(+cp==1?"תשלום חשבון כרטיס אשראי אחד מהבנק לא נכלל":cp+" תשלומי חשבון כרטיס אשראי מהבנק לא נכללים")+", כי הרכישות כבר נספרו בכרטיס.":"")+(only?" יש היסטוריה של "+(+only==1?"חודש מלא אחד":only+" חודשים מלאים")+" בלבד, ולכן זה מה שנעשה בו שימוש.":"")],
[/^since (.+)$/,a=>"מאז "+M(a)],
[/^(.+) a month on average$/,a=>a+" בחודש בממוצע"],
[/^(.+) is month to date\.$/,a=>M(a)+" הוא מתחילת החודש עד היום."],
[/^(No income|No spending) in these months yet\.$/,a=>(a=="No income"?"אין הכנסות":"אין הוצאות")+" בחודשים האלה עדיין."],
[/^Hidden from this list: (.+)$/,a=>"מוסתרים מהרשימה הזו: "+a],
[/^All time, (.+) to (.+)$/,(a,b)=>"כל הזמן, "+a+" עד "+b],
/* bills, budgets */
[/^Recurring bills spread per month(, plus irregular ones averaged over 12 months)? · (.+) a year$/,(x,y)=>"חשבונות קבועים מחולקים לחודש"+(x?", ועוד חשבונות לא קבועים בממוצע של 12 חודשים":"")+" · "+y+" בשנה"],
[/^(\d+) bills? · predicted amounts$/,n=>(+n==1?"חשבון אחד":n+" חשבונות")+" · סכומים חזויים"],
[/^(\d+) bills? changed · effect per year$/,n=>(+n==1?"חשבון אחד השתנה":n+" חשבונות השתנו")+" · ההשפעה בשנה"],
[/^Overdue since (.+)$/,a=>"באיחור מאז "+a],
[/^Due in (\d+) days?$/,n=>"בעוד "+(+n==1?"יום":n+" ימים")],
[/^Next (\d{1,2} [A-Za-z]+(?: \d{4})?)$/,a=>"הבא: "+a],
[/^Last charge (.+) on (.+)$/,(a,b)=>"חיוב אחרון "+a+" ב־"+b],
[/^last charge (.+) on (.+)$/,(a,b)=>"חיוב אחרון "+a+" ב־"+b],
[/^Canceled (.+) · last charge (.+) on (.+)\.$/,(d,a,b)=>"בוטל ב־"+d+" · חיוב אחרון "+a+" ב־"+b+". לא נספר בסכומים, בתחזיות או בהתראות."],
[/^Canceled (.+) · no charges seen\.$/,d=>"בוטל ב־"+d+" · לא נראו חיובים. לא נספר בסכומים, בתחזיות או בהתראות."],
[/^(?:last charge (.+) on (.+)|no charges seen)\. Not counted in totals, predictions or alerts\.$/,(a,b)=>(a?"חיוב אחרון "+a+" ב־"+b:"לא נראו חיובים")+". לא נספר בסכומים, בתחזיות או בהתראות."],
[/^Canceled · (\d+)$/,n=>"בוטלו · "+n],
[/^(\d+) payments?, about (\d+) in the last 12 months · last (.+) on (.+?)(?: · from (.+) to (.+))?$/,(n,c,a,d,lo,hi)=>(+n==1?"תשלום אחד":n+" תשלומים")+", כ־"+c+" ב־12 החודשים האחרונים · אחרון "+a+" ב־"+d+(lo?" · בין "+lo+" ל־"+hi:"")],
[/^(Irregular|One-off)(?: · (.*?))?(?: · (paid .+|no payment found))?$/,(k,src,tail)=>(k=="Irregular"?"לא קבוע":"חד‑פעמי")+(src?" · "+src:"")+(tail?" · "+(tail=="no payment found"?"לא נמצא תשלום":"שולם ב־"+tail.slice(5)):"")],
[/^Payment (\d+) of (\d+) ·$/,(a,b)=>"תשלום "+a+" מתוך "+b+" ·"],
[/^Across (\d+) categories$/,n=>"על פני "+n+" קטגוריות"],
[/^Where the month is now: today is day (\d+) of (\d+)\. If the colour reaches past this line, you are spending faster than the month is passing\.$/,(a,b)=>"איפה אנחנו בחודש: היום הוא יום "+a+" מתוך "+b+". אם הצבע עובר את הקו הזה, אתם מוציאים מהר יותר ממה שהחודש מתקדם."],
[/^(\d+)% of budget · (\d+)% of the month gone$/,(a,b)=>a+"% מהתקציב · "+b+"% מהחודש עבר"],
[/^About (.+) per day for the rest of the month$/,a=>"בערך "+a+" ליום עד סוף החודש"],
[/^(.+) left · (.+) per day$/,(a,b)=>"נשארו "+a+" · "+b+" ליום"],
[/^(.+) · at this pace you will spend (.+)$/,(a,b)=>a+" · בקצב הזה תוציאו "+b],
[/^Last months: (.+)$/,a=>"חודשים אחרונים: "+(a=="not enough history yet"?"אין עדיין מספיק היסטוריה":a)],
[/^Includes bills (.+): (.+)$/,(a,b)=>"כולל חשבונות "+a+": "+b],
[/^Includes bills: (.+)\.$/,a=>"כולל חשבונות: "+a+"."],
[/^(?:Budget: (.+) of (.+) spent|Typical month: (.+) of about (.+) spent)$/,(a,b,c,d)=>a?"תקציב: הוצאו "+a+" מתוך "+b:"חודש רגיל: הוצאו "+c+" מתוך כ־"+d],
[/^(▲|▼) (.+) (more|less) than the charge before$/,(a,b,c)=>a+" "+b+(c=="more"?" יותר":" פחות")+" מהחיוב הקודם"],
[/^(.+) than the charge before$/,a=>a+" מהחיוב הקודם"],
/* alerts */
[/^(.+) looks overdue$/,a=>a+" נראה באיחור"],
[/^Expected (.+) · about (.+) from (.+)$/,(d,a,s)=>"צפוי ב־"+d+" · בערך "+a+" מ־"+s],
[/^(.+) is due (today|in \d+ days?)$/,(a,w)=>a+" לתשלום "+(w=="today"?"היום":"בעוד "+(/^in 1 /.test(w)?"יום":w.replace(/\D/g,"")+" ימים"))],
[/^(.+) costs (more|less) now$/,(a,w)=>a+(w=="more"?" עולה יותר עכשיו":" עולה פחות עכשיו")],
[/^(.+) is over budget$/,a=>a+" חורג מהתקציב"],
[/^Spent (.+) of (.+)$/,(a,b)=>"הוצאו "+a+" מתוך "+b],
[/^(.+) is at (\d+)% of its budget$/,(a,p)=>a+" ב־"+p+"% מהתקציב"],
[/^Only (.+) left for (\d+) days?$/,(a,d)=>"נשארו רק "+a+" ל־"+(+d==1?"יום":d+" ימים")],
[/^(.+) is on track to go over$/,a=>a+" בדרך לחרוג"],
[/^At this pace: (.+) vs a (.+) budget$/,(a,b)=>"בקצב הזה: "+a+" לעומת תקציב של "+b],
[/^(.+) has run out$/,a=>"הקופה "+a+" התרוקנה"],
[/^Spending in (.+) now comes from your own money, not from the jar\.$/,a=>"ההוצאות ב־"+a+" יוצאות עכשיו מהכסף שלכם ולא מהקופה."],
[/^(.+) charge is (\d+)% higher than last month$/,(a,p)=>"החיוב ב־"+a+" גבוה ב־"+p+"% מהחודש שעבר"],
[/^(.+) upcoming vs (.+) last month$/,(a,b)=>a+" קרוב לעומת "+b+" בחודש שעבר"],
[/^(.+) sync failed$/,a=>"הסנכרון של "+a+" נכשל"],
[/^(.+) not updated for (\d+) days$/,(a,d)=>a+" לא עודכן "+d+" ימים"],
[/^(\d+) transactions? need a category$/,n=>(+n==1?"תנועה אחת צריכה":n+" תנועות צריכות")+" קטגוריה"],
[/^(\d+) transfers? to review$/,n=>(+n==1?"העברה אחת":n+" העברות")+" לבדיקה"],
[/^(.+): (money left|money arrived) with no transaction \((.+)\)$/,(a,w,c)=>a+": "+(w=="money left"?"כסף יצא":"כסף נכנס")+" בלי תנועה ("+c+")"],
[/^(.+) · (.+) looks like it came out of (.+)$/,(d,a,j)=>d+" · "+a+" נראה כאילו יצא מ־"+j],
[/^No document on income: (.+)$/,a=>"אין מסמך להכנסה: "+a],
[/^(.+) · attach the invoice or receipt$/,a=>a+" · צרפו את החשבונית או הקבלה"],
[/^Appeared (.+?) · still showing$/,a=>"הופיעה ב־"+T(a)+" · עדיין מוצגת"],
[/^Appeared (.+?) · gone (.+?) \((.+)\)$/,(a,b,c)=>"הופיעה ב־"+T(a)+" · נעלמה ב־"+T(b)+" ("+c.replace(/ min$/," דק׳").replace(/ h$/," שעות").replace(/ days$/," ימים")+")"],
[/^All alerts \((\d+)\)$/,n=>"כל ההתראות ("+n+")"],
/* accounts */
[/^(\d+) transactions?(?: · ending (.+))?$/,(n,t)=>(+n==1?"תנועה אחת":n+" תנועות")+(t?" · מסתיים ב־"+t:"")],
[/^charged this month(?: · last month (.+))?$/,a=>"חויב החודש"+(a?" · חודש שעבר "+a:"")],
[/^(.+) · synced (.+)$/,(a,b)=>T(a)+" · סונכרן "+b],
[/^ending (.+)$/,a=>"מסתיים ב־"+a],
[/^(.+) · now (.+)\. The old balance is kept in its history\.$/,(a,b)=>a+" · עכשיו "+b+". היתרה הישנה נשמרת בהיסטוריה."],
[/^New balance \((.+)\)$/,a=>"יתרה חדשה ("+a+")"],
[/^Nickname \(required, so you can tell the logins apart\)$/,()=>"כינוי (חובה, כדי שתוכלו להבדיל בין ההתחברויות)"],
[/^Nickname \(optional\)$/,()=>"כינוי (לא חובה)"],
/* connections */
[/^Type my (.+)$/,a=>"להקליד את ה"+a+" שלי"],
[/^The login works \((.+)\)\. Press Sync now to import your data\.$/,a=>"ההתחברות תקינה ("+a+"). לחצו על סנכרון עכשיו כדי לייבא את הנתונים."],
[/^Last synced (.+)\.$/,a=>"סונכרן לאחרונה ב־"+a+"."],
[/^Last synced (.+), over 2 days ago\. Press Sync now\.$/,a=>"סונכרן לאחרונה ב־"+a+", לפני יותר מיומיים. לחצו על סנכרון עכשיו."],
[/^(.+) is busy \((.+)\)\. Wait for it to finish before starting another\.$/,(a,b)=>a+" עסוק ("+T(b)+"). המתינו שיסתיים לפני שמתחילים עוד אחד."],
[/^(.+)\. Please wait, do not close this page\.$/,a=>T(a)+". נא להמתין ולא לסגור את הדף."],
[/^(.+) failed\. See Settings → Connections$/,a=>a+" נכשל. ראו הגדרות ← חיבורים"],
[/^(.+) · test$/,a=>a+" · בדיקה"],
[/^· (\d+) transactions in the last 30 days$/,n=>"· "+n+" תנועות ב־30 הימים האחרונים"],
[/^(\d+) transactions in the last 30 days$/,n=>n+" תנועות ב־30 הימים האחרונים"],
[/^Version (.+) is available\.$/,a=>"גרסה "+a+" זמינה."],
[/^Version (.+) is ready\. Restart the app to finish updating\. Your data stays as it is\.$/,a=>"גרסה "+a+" מוכנה. הפעילו מחדש את האפליקציה כדי לסיים את העדכון. הנתונים נשארים כפי שהם."],
[/^Downloading version (.+)… (\d+)%$/,(a,p)=>"מוריד גרסה "+a+"… "+p+"%"],
[/^(.+) rates loaded$/,a=>"שערי "+a+" נטענו"],
[/^Saved, but rates could not be fetched yet: (.+)$/,a=>"נשמר, אבל עדיין לא ניתן היה להביא שערים: "+a],
[/^Import failed: (.+)$/,a=>"הייבוא נכשל: "+a],
[/^Imported (\d+) new, merged (\d+)$/,(a,b)=>"יובאו "+a+" חדשות, מוזגו "+b],
[/^Read (\d+) rows · (\d+) new, (\d+) merged$/,(r,a,b)=>"נקראו "+r+" שורות · "+a+" חדשות, "+b+" מוזגו"],
[/^(\d+) transactions? will be exported$/,n=>(+n==1?"תנועה אחת תיוצא":n+" תנועות ייוצאו")],
[/^(\d+) rows? will be exported$/,n=>(+n==1?"שורה אחת תיוצא":n+" שורות ייוצאו")],
/* tags, rules, categories */
[/^Renamed to #(.+)$/,a=>"השם שונה ל־#"+a],
[/^Rule created\. (\d+) transactions? tagged\.$/,n=>"הכלל נוצר. "+(+n==1?"תנועה אחת תויגה":n+" תנועות תויגו")+"."],
[/^Tagged (\d+) transactions?$/,n=>"תויגו "+(+n==1?"תנועה אחת":n+" תנועות")],
[/^Rule added\. (\d+) uncategorized transactions? now in (.+)\.$/,(n,c)=>"הכלל נוסף. "+(+n==1?"תנועה אחת בלי קטגוריה נמצאת":n+" תנועות בלי קטגוריה נמצאות")+" עכשיו ב־"+c+"."],
[/^Move (\d+) past transactions? too$/,n=>"להעביר גם "+(+n==1?"תנועה קודמת אחת":n+" תנועות קודמות")],
[/^(\d+) transactions moved to (.+)$/,(n,c)=>n+" תנועות הועברו ל־"+c],
[/^New transactions with "(.+)" now go to (.+)\.$/,(k,c)=>"תנועות חדשות עם “"+k+"” עוברות עכשיו ל־"+c+"."],
[/^(\d+) other uncategorized items? look(?:s)? like "(.+)"\.$/,(n,k)=>(+n==1?"פריט אחד נוסף בלי קטגוריה דומה":n+" פריטים נוספים בלי קטגוריה דומים")+" ל־“"+k+"”."],
[/^No other uncategorized items look like "(.+)" yet, but a rule would catch future ones\.$/,k=>"אין עדיין פריטים אחרים בלי קטגוריה הדומים ל־“"+k+"”, אבל כלל יתפוס את העתידיים."],
[/^No other uncategorized items contain "(.+)"\. The rule will apply to future ones\.$/,k=>"אין פריטים אחרים בלי קטגוריה שמכילים “"+k+"”. הכלל יחול על העתידיים."],
[/^other uncategorized items? contain "(.+)" and will be put in$/,k=>"פריטים אחרים בלי קטגוריה שמכילים “"+k+"” יועברו אל"],
[/^Create “(.+)”$/,a=>"יצירת “"+a+"”"],
[/^Set up a rule for (.+)\?$/,a=>"ליצור כלל עבור "+a+"?"],
[/^with (.+)\. A rule does this automatically for similar transactions from now on\.$/,a=>"עם "+a+". כלל יעשה את זה אוטומטית לתנועות דומות מעכשיו."],
[/^Added (\d+) categories and (\d+) rules(?:, and sorted (\d+) uncategorized transactions?)?$/,(c,r,s)=>"נוספו "+c+" קטגוריות ו־"+r+" כללים"+(s?", ושויכו "+s+" תנועות בלי קטגוריה":"")],
[/^Every payment to "(.+)" counts as a bill, even though the timing varies\. (\d+) payments? so far, about (\d+) in the last 12 months\.$/,(m,n,c)=>"כל תשלום ל־“"+m+"” נחשב חשבון, גם אם העיתוי משתנה. עד עכשיו "+(+n==1?"תשלום אחד":n+" תשלומים")+", כ־"+c+" ב־12 החודשים האחרונים."],
[/^Scheduled for (.+)\. (.+) reported it ahead of time( as pending)?, for example a card purchase that will be charged on that date, an instalment or a standing order\. It is not counted in your totals until that day\.$/,(d,s,p)=>"מתוזמן ל־"+d+". "+T(s)+" דיווח עליו מראש"+(p?" כממתין":"")+", למשל רכישה בכרטיס שתחויב בתאריך הזה, תשלום או הוראת קבע. הוא לא נספר בסכומים עד אותו יום."],
[/^All files · (\d+)$/,n=>"כל הקבצים · "+n],
/* change log details */
[/^(.+) · (monthly|every 2 months|yearly) · about (.+)$/,(a,f,m)=>a+" · "+({"monthly":"חודשי","every 2 months":"כל חודשיים","yearly":"שנתי"})[f]+" · בערך "+m],
[/^(.+) · it will not be detected again$/,a=>a+" · לא יזוהה שוב"],
[/^(\d+) payments? · (.+)$/,(n,t)=>(+n==1?"תשלום אחד":n+" תשלומים")+" · "+t],
[/^(\d+) payments? no longer match a linked category$/,n=>(+n==1?"תשלום אחד כבר לא מתאים":n+" תשלומים כבר לא מתאימים")+" לקטגוריה מקושרת"],
[/^#(.+) → #(.+) · (\d+) transactions?$/,(a,b,c)=>"#"+a+" ← #"+b+" · "+(+c==1?"תנועה אחת":c+" תנועות")],
);
P.unshift(
[/^(.+): payment expected but not seen$/,a=>a+": התשלום הצפוי לא נראה"],
[/^Expected around (.+), about (.+) from (.+)\. Nothing like it has been paid since\. If it is only late, do nothing\. If you stopped it, open the bill and cancel it\.$/,(d,a,s)=>"צפוי בערך ב־"+d+", בערך "+a+" מ־"+s+". עדיין לא שולם משהו דומה. אם זה רק מתעכב, אין צורך לעשות דבר. אם הפסקתם אותו, פתחו את החשבון וסמנו אותו כמבוטל."],
[/^About (.+) from (.+)\. A prediction from your past payments, not a charge yet\.$/,(a,s)=>"בערך "+a+" מ־"+s+". זו הערכה לפי התשלומים הקודמים שלכם, עדיין לא חיוב."],
[/^Last payment (.+)$/,a=>"תשלום אחרון "+a],
[/^(\d+) payments$/,n=>n+" תשלומים"],[/^1 payment$/,()=>"תשלום אחד"],
[/^(.+) looks like it came out of (.+), because similar payments were attached to it\. Attach it to the jar to keep the jar balance right\.$/,(a,j)=>a+" נראה כאילו יצא מ"+j+", כי תשלומים דומים שויכו אליה. שייכו אותו לקופה כדי שהיתרה בקופה תהיה נכונה."],
[/^(.+) looks like it came out of (.+)\. Attach it to the jar to keep the jar balance right\.$/,(a,j)=>a+" נראה כאילו יצא מ"+j+". שייכו אותו לקופה כדי שהיתרה בקופה תהיה נכונה."],
[/^At this pace you would spend (.+) this month, over the (.+) budget\.$/,(a,b)=>"בקצב הזה תוציאו "+a+" החודש, מעל תקציב של "+b+"."],
[/^(.+) still to be charged this month, against (.+) charged last month\.$/,(a,b)=>"עוד "+a+" צפויים להיגבות החודש, לעומת "+b+" שנגבו בחודש שעבר."],
[/^(.+) · (.+)\. Above your large-amount limit of (.+) \(change it in Alert settings\)\.$/,(a,d,l)=>a+" · "+d+". מעל סף הסכום הגדול שלכם, "+l+" (אפשר לשנות בהגדרות ההתראות)."],
[/^(.+): balance (went down|went up) by (.+) with no matching transaction$/,(n,w,a)=>n+": היתרה "+(w=="went down"?"ירדה":"עלתה")+" ב־"+a+" בלי תנועה תואמת"],
[/^(.+)\. Income with no invoice or receipt attached\. Attach one if you need it for your books \(you can turn this alert off in Alert settings\)\.$/,a=>a+". הכנסה בלי חשבונית או קבלה מצורפת. צרפו אחת אם אתם צריכים אותה להנהלת חשבונות (אפשר לכבות את ההתראה הזו בהגדרות ההתראות)."],
);
/* ---- audit round 1: the remaining screens ---- */

const DSH={Sun:"א׳",Mon:"ב׳",Tue:"ג׳",Wed:"ד׳",Thu:"ה׳",Fri:"ו׳",Sat:"ש׳"};
P.push(
[/^Budget for (.+)$/,x=>"תקציב עבור "+T(x)],
[/^Recognised automatically, with no rule: ([A-Z][^.]*)$/,x=>"מזוהה אוטומטית, בלי כלל: "+x],
[/^Jars can only take money that is really free\. This starts with (\S+) free today and adds the surplus the forecast above expects each month \(about (\S+) a month, income minus expenses, from the last (\d+) months\), shared by priority\. Bill jars are assumed to stay full\. If your income or spending changes, so do these numbers\. The dashed line is the goal\.$/,(a,b,n)=>"קופות יכולות לקחת רק כסף שבאמת פנוי. זה מתחיל ב־"+a+" פנויים היום ומוסיף את העודף שהתחזית למעלה מצפה לו מדי חודש (בערך "+b+" בחודש, הכנסות פחות הוצאות, מ־"+n+" החודשים האחרונים), מחולק לפי עדיפות. מניחים שקופות חשבונות נשארות מלאות. אם ההכנסה או ההוצאות משתנות, גם המספרים האלה משתנים. הקו המקווקו הוא היעד."],
[/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat), (\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec), (\d{2}:\d{2})$/,(w,d,m,t)=>"יום "+DSH[w]+", "+d+" ב"+M(m)+", "+t],
);
/* ---- audit round 2: sheets, suggestions, jars ---- */

P.unshift(
[/^Yes, all (\d+)$/,n=>"כן, כל ה־"+n],
[/^Set up a rule for (.+)\?$/,c=>"להגדיר כלל עבור "+T(c)+"?"],
[/^Every payment to "(.+)"$/,s=>"כל תשלום אל \""+s+"\""],
[/^(\d+) other payments? to “(.+)” look the same\. A rule counts them all, and future ones, as card payments\.$/,(n,d)=>(+n==1?"תשלום אחד נוסף":n+" תשלומים נוספים")+" אל “"+d+"” נראים אותו דבר. כלל יספור את כולם, ואת העתידיים, כתשלומי כרטיס."],
[/^No other payments look like “(.+)” yet, but a rule would recognise future ones\.$/,d=>"עוד אין תשלומים נוספים שנראים כמו “"+d+"”, אבל כלל יזהה עתידיים."],
[/^(\d+) other uncategorized items? look like "(.+)"\. A rule gives them the category (.+), and future ones too\.$/,(n,k,c)=>(+n==1?"פריט אחד נוסף בלי קטגוריה":n+" פריטים נוספים בלי קטגוריה")+" נראים כמו \""+k+"\". כלל ייתן להם את הקטגוריה "+T(c)+", ואת העתידיים גם."],
[/^No other uncategorized items look like "(.+)" yet, but a rule would catch future ones\.$/,k=>"עוד אין פריטים נוספים בלי קטגוריה שנראים כמו \""+k+"\", אבל כלל יתפוס עתידיים."],
);
/* ---- audit round 3: messages (toasts, confirmations, errors) ---- */

P.unshift(
[/^"(.+)" already exists\. Merge "(.+)" into it\?$/,(a,b)=>"\""+a+"\" כבר קיימת. למזג את \""+b+"\" לתוכה?"],
[/^(\d+) jars? received money$/,n=>(+n==1?"קופה אחת קיבלה":n+" קופות קיבלו")+" כסף"],
[/^(\d+) jars? received (\S+)$/,(n,a)=>(+n==1?"קופה אחת קיבלה ":n+" קופות קיבלו ")+a],
[/^Renamed to (.+)$/,x=>"שונה ל־"+x],
[/^Tagged (\d+) transactions?$/,n=>"תויגו "+(+n==1?"תנועה אחת":n+" תנועות")],
[/^Saved (.+)$/,x=>"נשמר "+x],
[/^Imported (\d+) new, merged (\d+)$/,(a,b)=>"יובאו "+a+" חדשים, מוזגו "+b],
[/^Read (\d+) rows · (\d+) new, (\d+) merged$/,(r,a,m)=>"נקראו "+r+" שורות · "+a+" חדשות, "+m+" מוזגו"],
[/^(\d+) rates loaded$/,n=>n+" שערים נטענו"],
[/^(.+) failed\. See Settings → Connections$/,x=>x+" נכשל. ראו הגדרות ← חיבורים"],
[/^Synced · (\d+) new$/,n=>"סונכרן · "+n+" חדשים"],
[/^(\d+) new$/,n=>n+" חדשים"],
[/^(\d+) changes saved$/,n=>n+" שינויים נשמרו"],
[/^(\d+) transactions moved to (.+)$/,(n,c)=>n+" תנועות הועברו ל"+T(c)],
[/^New transactions with "(.+)" now go to (.+)\.$/,(k,t)=>"תנועות חדשות עם \""+k+"\" עכשיו הולכות ל"+T(t)+"."],
[/^Rule added\. New transactions that contain “(.+)” get (.+)\.$/,(k,t)=>"הכלל נוסף. תנועות חדשות שמכילות “"+k+"” מקבלות "+t+"."],
[/^Rule added\. (\d+) existing income entr(?:y is|ies are) now Salary\.$/,n=>"הכלל נוסף. "+(+n==1?"הכנסה קיימת אחת היא עכשיו משכורת":n+" הכנסות קיימות הן עכשיו משכורת")+"."],
[/^Rule added\. (\d+) more payments? now counts? as a card payment\.$/,n=>"הכלל נוסף. "+(+n==1?"תשלום נוסף אחד נספר":n+" תשלומים נוספים נספרים")+" עכשיו כתשלום כרטיס."],
[/^Rule added\. (\d+) uncategorized transactions? now in (.+)\.$/,(n,c)=>"הכלל נוסף. "+(+n==1?"תנועה אחת בלי קטגוריה נמצאת":n+" תנועות בלי קטגוריה נמצאות")+" עכשיו ב"+T(c)+"."],
[/^Rule created\. (\d+) transactions? tagged\.$/,n=>"הכלל נוצר. "+(+n==1?"תנועה אחת תויגה":n+" תנועות תויגו")+"."],
[/^Added (\d+) categories and (\d+) rules(?:, and sorted (\d+) uncategorized transactions?)?$/,(c,r,a)=>"נוספו "+c+" קטגוריות ו־"+r+" כללים"+(a?", ומוינו "+a+" תנועות בלי קטגוריה":"")],
[/^Take (\S+) back from the jars, starting with the lowest priority\? Their saved amounts go down; nothing else changes\.$/,a=>"לקחת "+a+" בחזרה מהקופות, החל מהעדיפות הנמוכה ביותר? הסכומים השמורים שלהן יורדים; שום דבר אחר לא משתנה."],
[/^Permission: (.+)$/,x=>"הרשאה: "+x],
[/^Import failed: (.+)$/,x=>"הייבוא נכשל: "+x],
[/^Saved, but rates could not be fetched yet: (.+)$/,x=>"נשמר, אבל עוד לא ניתן היה להביא שערים: "+x],
);
P.unshift(
[/^Payment of your (.+) bill from the bank\. Not counted as spending, because each purchase is already counted on the card\. Open it to count it anyway\.$/,c=>"תשלום חשבון "+(c=="card"?"הכרטיס":T(c))+" מהבנק. לא נספר כהוצאה, כי כל רכישה כבר נספרת בכרטיס. פתחו אותו כדי לספור אותו בכל זאת."],
);
// backup and restore

P.unshift([/^From ([\w.\- ()]+\.mmbackup)$/,x=>"מתוך "+x]);

P.unshift([/^Downloaded (.+)\. Look in your Downloads folder\.$/,x=>x+" הורד. חפשו בתיקיית ההורדות."]);
// server messages, change-history lines and the browser's own dialogs

P.unshift(
[/^GitHub answered HTTP (.+)$/,x=>"GitHub ענה HTTP "+x],
[/^The scraper could not open the bank page: (.*)$/,x=>"הדפדפן של האפליקציה לא הצליח לפתוח את דף הבנק: "+T(x)],
[/^Unrecognised date: (.*)$/,x=>"תאריך לא מזוהה: "+x],
[/^It has (\d+) transactions?\. Delete or move them first\.$/,n=>(n==1?"יש בו תנועה אחת":"יש בו "+n+" תנועות")+". מחקו או העבירו אותן קודם."],
[/^CSV is missing the "(.+)" column$/,c=>"העמודה \""+c+"\" חסרה בקובץ ה-CSV"],
[/^Wise (.+): HTTP (.+)$/,(a,b)=>"Wise "+a+": HTTP "+b],
[/^Test connection: (.+)$/,x=>"בדיקת חיבור: "+x],
[/^Auto-fill (.+)$/,x=>"מילוי אוטומטי "+x],
[/^(.+) · entered by you$/,x=>T(x)+" · הוזן על ידכם"],
[/^Money · (.+) sync failed$/,x=>"Money · סנכרון "+x+" נכשל"],
[/^(\d+) balance gaps? to explain in Activity → Needs review$/,n=>(n==1?"פער יתרה אחד":n+" פערי יתרה")+" להסבר בפעילות ← "+T("Needs review")],
[/^(.+): (money left|money arrived) (.+) with no transaction$/,(a,k,n)=>a+": "+(k=="money left"?"כסף יצא ":"כסף נכנס ")+n+" ללא תנועה"],
[/^(.+): it matches what the card charged on (.+), so it is not counted as spending$/,(d,dt)=>d+": זה תואם למה שהכרטיס חויב ב-"+dt+", ולכן לא נספר כהוצאה"],
[/^(\d+) income entr(?:y|ies) marked as Salary \(it says so, or the same payer pays a similar amount every month\)$/,n=>(n==1?"הכנסה אחת סומנה":n+" הכנסות סומנו")+" כמשכורת (כתוב כך, או שאותו משלם מעביר סכום דומה כל חודש)"],
[/^(.+) ([A-Z]{3}): money (out|in) (.+) with no transaction \(between snapshots\)$/,(a,c,k,n)=>a+" "+c+": "+(k=="out"?"כסף יצא ":"כסף נכנס ")+n+" ללא תנועה (בין צילומי יתרה)"],
[/^(.+) ([A-Z]{3}): (.+) recorded as an unrecorded charge$/,(a,c,n)=>a+" "+c+": "+n+" נרשם כחיוב שלא תועד"],
[/^(.+): browser profile saved for later automatic logins$/,x=>x+": פרופיל הדפדפן נשמר להתחברויות אוטומטיות בהמשך"],
[/^(.+): the bank now reports the real charge$/,x=>x+": הבנק מדווח עכשיו על החיוב האמיתי"],
[/^(.+): matched your hand-entered transaction$/,x=>x+": תואם לתנועה שהזנתם ידנית"],
[/^asked for the last (\d+) days, the bank returned no transactions$/,n=>"ביקשנו "+n+" ימים אחרונים, הבנק לא החזיר תנועות"],
[/^read (\d+) transactions back to (.+), (\d+) new(?:\. You asked for (\d+) days, but the bank only returned history back to (.+)\. Banks usually keep about 12 months online\. For older history, import their statement export \(Settings → App and data\))?$/,(n,d,nw,asked,back)=>"נקראו "+n+" תנועות אחורה עד "+d+", "+nw+" חדשות"+(asked?". ביקשתם "+asked+" ימים, אבל הבנק החזיר היסטוריה רק עד "+back+". בנקים בדרך כלל שומרים כ-12 חודשים באינטרנט. להיסטוריה ישנה יותר, ייבאו את ייצוא הדפים שלהם (הגדרות ← ייבוא וייצוא)":"")],
[/^(.+) is already running \((.+)\)\. Wait for it to finish\.$/,(a,b)=>T(a)+" כבר רץ ("+T(b)+"). המתינו לסיום."],
[/^(.+) is locked after failed attempts\. Check the credentials, then unlock it in Settings\.$/,x=>x+" ננעל אחרי ניסיונות כושלים. בדקו את פרטי ההתחברות ואז פתחו את הנעילה בהגדרות."],
[/^([\s\S]+)\nAutomatic attempts are paused\. Check the login, then unlock it in Settings\.$/,x=>T(x)+"\nהניסיונות האוטומטיים מושהים. בדקו את ההתחברות ואז פתחו את הנעילה בהגדרות."],
[/^no exchange rate for (.+) on (.+); run a rates refresh first$/,(c,d)=>"אין שער חליפין ל-"+c+" ב-"+d+"; הריצו קודם רענון שערים"],
[/^Activity list used \(statements are not available for personal tokens\): (\d+) items?(?:, (\d+) could not be read)?$/,(n,k)=>"נעשה שימוש ברשימת הפעילות (דפי חשבון אינם זמינים לאסימונים אישיים): "+n+" פריטים"+(k?", "+k+" לא ניתן היה לקרוא":"")],
[/^Balances only: statements and activities are not available for this token \((.+)\)$/,x=>"יתרות בלבד: דפי חשבון ופעילות אינם זמינים לאסימון הזה ("+x+")"],
[/^Delete "(.+)"\? Its transactions become uncategorized, and its rules and budget are removed\.$/,k=>"למחוק את \""+k+"\"? התנועות שלה יהפכו ללא קטגוריה, והכללים והתקציב שלה יוסרו."],
[/^Delete the tag "(.+)"\? It is removed from (\d+) transactions? and from tag rules\. The transactions stay\.$/,(g,n)=>"למחוק את התגית \""+g+"\"? היא תוסר מ-"+n+" תנועות ומכללי התגיות. התנועות נשארות."],
[/^Delete the jar "(.+)"\?$/,x=>"למחוק את הקופה \""+x+"\"?"],
[/^"(.+)" already exists\. Merge "(.+)" into it\?$/,(a,b)=>"\""+a+"\" כבר קיימת. למזג את \""+b+"\" לתוכה?"],
[/^Take ₪(.+) back from the jars, starting with the lowest priority\? Their saved amounts go down; nothing else changes\.$/,n=>"להחזיר ₪"+n+" מהקופות, החל מהעדיפות הנמוכה ביותר? הסכומים השמורים בהן יורדים; שום דבר אחר לא משתנה."],
[/^No other transactions look like “(.+)” yet, but a rule would tag future ones with (.+)\.$/,(k,t)=>"עוד אין תנועות אחרות שנראות כמו “"+k+"”, אבל כלל יתייג בעתיד את התנועות האלה ב-"+t+"."],
);
// jar types: Savings, Bills, Pay-off

P.unshift(
[/^₪(.+) a month pays off the remaining ₪(.+) in (\d+) months? \((.+)\)\. What you already paid back is not taken from your free money\.$/,(c,l,k,m)=>"₪"+c+" בחודש מסיימים את ה-₪"+l+" שנותרו תוך "+(k==1?"חודש":k+" חודשים")+" ("+T(m)+"). מה שכבר החזרתם לא נלקח מהכסף החופשי שלכם."],
[/^Paid back · (.+)$/,x=>"הוחזר · "+x],
);

P.unshift([/^(The bank accepted the login but sent back no data\..*) \(Step: ([A-Za-z_0-9]+)\)$/,(a,st)=>T(a)+" (שלב: "+st+")"]);

P.unshift([/^These payments now look regular: (.+)\.$/,w=>"התשלומים האלה נראים עכשיו קבועים: "+T(w.charAt(0).toUpperCase()+w.slice(1))+"."]);

P.unshift([/^\+(\d+) more$/,n=>"+"+n+" נוספים"],[/^Paid by the jar (.+)$/,j=>"שולם מהקופה "+j],[/^Balance not read yet: (.+)$/,a=>"היתרה עוד לא נקראה: "+a],
[/^You've spent (\d+)% (more|less) than you did by this day last month\.$/,(n,d)=>"הוצאתם "+n+"% "+(d=="more"?"יותר":"פחות")+" מבאותו יום בחודש שעבר."],
[/^You've spent the same as you did by this day last month\.$/,()=>"הוצאתם בדיוק כמו באותו יום בחודש שעבר."]);

P.unshift([/^(\d+) active$/,n=>n+" פעילים"],[/^(.+?) not counted$/,l=>{const o=[];for(const x of l.split(", ")){let m;if(m=x.match(/^(\d+) transfers?$/i))o.push(+m[1]==1?"העברה אחת":m[1]+" העברות");else if(m=x.match(/^(\d+) card payments?$/i))o.push(+m[1]==1?"תשלום כרטיס אחד":m[1]+" תשלומי כרטיס");else if(m=x.match(/^(\d+) upcoming$/i))o.push(+m[1]==1?"פריט עתידי אחד":m[1]+" פריטים עתידיים");else if(m=x.match(/^(\d+) balance updates?$/i))o.push(+m[1]==1?"עדכון יתרה אחד":m[1]+" עדכוני יתרה");else return null}return o.join(", ")+" לא נספרים"}]);

P.unshift([/^Totals for (\d+) transactions?(?: · (.+))?$/,(n,r)=>"סיכום של "+n+" תנועות"+(r?" · "+T(r):"")]);

P.unshift([/^(.+): (\d+) pending charges? \((.+)\)$/,(n,c,a)=>n+": "+(+c==1?"חיוב ממתין אחד":c+" חיובים ממתינים")+" ("+a+")"]);

P.unshift([/^(.+): (.+) left, probably (.+)$/,(a,m,n)=>a+": "+m+" יצאו, כנראה "+n],
[/^(.+) \(about (.+)\) was expected around (.+) and the bank has not listed it yet\. This closes by itself when the transaction appears\. If it does not, open it in Needs review\.$/,(n,m,d)=>n+" (בערך "+m+") היה צפוי בסביבות "+d+" והבנק עוד לא רשם אותו. ההתראה נסגרת מעצמה כשהתנועה מופיעה. אם זה לא קורה, פתחו אותה ב״לבדיקה״."],
[/^This looks like (.+) \(about (.+)\), expected around (.+)\. The bank has not listed it yet, so nothing is needed from you\. It closes by itself when the transaction appears\.$/,(n,m,d)=>"זה נראה כמו "+n+" (בערך "+m+"), צפוי בסביבות "+d+". הבנק עוד לא רשם אותו, ולכן אין צורך שתעשו משהו. זה נסגר מעצמו כשהתנועה מופיעה."]);
P.splice(0,P.length,...P.filter(p=>typeof p[1]=="function"));
})();

/* ---- he-more.js ---- */
/* Hebrew additions: messages that come from the server (sync, test connection, import, alerts), the activity log, and sentences with names or numbers inside.
   Loaded after he-new.js, same format: exact text in HE.D, text with names or counts in HE.P ({} stands for a number). */
(function(){const D=HE.D,P=HE.P;
const n1=(n,one,many)=>+n==1?one:many;

P.unshift(
[/^Expected (₪[\d,.]+|−?₪[\d,.]+)$/,a=>"צפוי "+a],
[/^(.+) added to your currencies and its rates loaded$/,a=>a+" נוסף לרשימת המטבעות והשערים נטענו"],
[/^ECB reference rates via Frankfurter, updated (\S+)\.$/,d=>"שערי הייחוס של הבנק המרכזי האירופי דרך Frankfurter, עודכנו ב‑"+d+"."],
[/^(.+) synced · (\d+) new transactions?$/,(a,n,T)=>T(a)+" סונכרן · "+n1(n,"תנועה חדשה אחת",n+" תנועות חדשות")],
[/^Money · (.+) sync failed$/,(a)=>"Money · הסנכרון של "+a+" נכשל"],
[/^(.+) sync failed$/,(a)=>"הסנכרון של "+a+" נכשל"],
[/^(.+) is locked after failed attempts\. Check the credentials, then unlock it in Settings\.$/,(a)=>a+" ננעל אחרי ניסיונות כושלים. בדקו את פרטי ההתחברות ואז בטלו את הנעילה בהגדרות."],
[/^(.+)\nAutomatic attempts are paused\. Check the login, then unlock it in Settings\.$/,(a,T)=>a+"\nהניסיונות האוטומטיים מושהים. בדקו את פרטי ההתחברות ואז בטלו את הנעילה בהגדרות."],
[/^(.+) is already running \((.+)\)\. Wait for it to finish\.$/,(a,b,T)=>"הפעולה ״"+T(a)+"״ כבר רצה ("+(b=="all sources"?"כל המקורות":b)+"). המתינו שתסתיים."],
[/^read (\d+) transactions? back to (\S+), (\d+) new(?:\. You asked for (\d+) days, but the bank only returned history back to (\S+)\. Banks usually keep about 12 months online\. For older history, import their statement export \(Settings → App and data\))?$/,(s,o,a,d,o2)=>"נקראו "+n1(s,"תנועה אחת",s+" תנועות")+" אחורה עד "+o+", "+n1(a,"אחת חדשה",a+" חדשות")+(d?". ביקשתם "+d+" ימים, אבל הבנק החזיר היסטוריה רק עד "+o2+". בנקים בדרך כלל שומרים כ‑12 חודשים באינטרנט. להיסטוריה ישנה יותר ייבאו את קובץ הדפים מהבנק (הגדרות ← אפליקציה ונתונים)":"")],
[/^(\d+) balance gaps? to explain in Activity → Needs review$/,n=>n1(n,"פער אחד ביתרה",n+" פערים ביתרה")+" להסבר בפעילות ← לבדיקה"],
[/^Activity list used \(statements are not available for personal tokens\): (\d+) items?(?:, (\d+) could not be read)?$/,(n,k)=>"נעשה שימוש ברשימת הפעילות (דפי חשבון לא זמינים בטוקן אישי): "+n1(n,"פריט אחד",n+" פריטים")+(k?", "+n1(k,"אחד לא נקרא",k+" לא נקראו"):"")],
[/^Balances only: statements and activities are not available for this token \((.+)\)$/,a=>"יתרות בלבד: דפי חשבון ופעילות לא זמינים בטוקן הזה ("+a+")"],
[/^Unrecognised date: (.+)$/,a=>"תאריך לא מוכר: "+a],
[/^CSV is missing the "(.+)" column$/,a=>"בקובץ ה‑CSV חסרה העמודה ״"+a+"״"],
[/^scraper HTTP (\d+)$/,a=>"שגיאת שרת הקריאה מהבנק ("+a+")"],
[/^GitHub answered HTTP (\d+)$/,a=>"GitHub החזיר שגיאה "+a],
[/^no exchange rate for (\w+) on (\S+); run a rates refresh first$/,(c,d)=>"אין שער חליפין ל‑"+c+" ב‑"+d+". רעננו קודם את השערים"],
[/^(.+): matched your hand-entered transaction$/,a=>a+": הותאם לתנועה שהזנתם ידנית"],
[/^(.+): browser profile saved for later automatic logins$/,a=>a+": פרופיל הדפדפן נשמר להתחברויות אוטומטיות בהמשך"],
[/^(\w+ ?\w*) (\w{3}): (-?[\d.,]+) recorded as an unrecorded charge$/,(a,c,m)=>a+" "+c+": "+m+" נרשם כחיוב לא רשום"],
[/^(\d+) jars? received ₪(\d+) for (\d{4}-\d{2})$/,(n,m,mo)=>n1(n,"קופה אחת קיבלה",n+" קופות קיבלו")+" ₪"+m+" עבור "+mo],
[/^(\d+) jars? received money$/,n=>n1(n,"קופה אחת קיבלה",n+" קופות קיבלו")+" כסף"],
[/^(\d+) sample transactions?$/,n=>n1(n,"תנועה אחת לדוגמה",n+" תנועות לדוגמה")],
[/^(\d+) other items? look like "(.+)"\.$/,(n,k)=>n1(n,"פריט אחר אחד נראה",n+" פריטים אחרים נראים")+" כמו ״"+k+"״."],
[/^No other items look like "(.+)" yet, but a rule would catch future ones\.$/,k=>"אין עדיין פריטים אחרים שנראים כמו ״"+k+"״, אבל כלל יתפוס את העתידיים."],
[/^Set up a rule for (.+)\?$/,(c,T)=>"ליצור כלל עבור "+T(c)+"?"],
[/^(\d+) other items? contain "(.+)" and will be put in (.+) now: (.+)$/,(n,k,c,l)=>n1(n,"פריט אחר אחד מכיל",n+" פריטים אחרים מכילים")+" ״"+k+"״ ויועבר עכשיו ל"+c+": "+l],
[/^No other items contain "(.+)"\. The rule will apply to future ones\.$/,k=>"אין פריטים אחרים שמכילים ״"+k+"״. הכלל יחול על עתידיים."],
[/^A rule puts similar items in this category, now and in the future\.$/,()=>"כלל מכניס פריטים דומים לקטגוריה הזאת, עכשיו ובעתיד."]
);

})();

/* ---- he-bills.js ---- */
/* Hebrew for the Bills page wording. Loaded last, same format as he-more.js: exact text in HE.D ({} is a number, {d} a date). */
(function(){const D=HE.D,P=HE.P;
const add=(k,v)=>{D[k]=v;if(k.includes("{d}"))D[k.replace(/\{d\}/g,"{}/{}/{}")]=v.replace(/\{d\}/g,"{}/{}/{}")};

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

/* In Hebrew the page is called "תשלומים קבועים", so a bill is "תשלום קבוע", not "חשבון" (that word stays for bank accounts and credit card statements). */
const FIX=v=>typeof v!="string"?v:v.replace(/(^|[^א-ת])([והלכמבש]{0,3})(חשבונות|חשבון)(?![א-ת])(?!\s+(?:מים|חשמל|גז|ארנונה|טלפון|אינטרנט))(\s+(?:לא\s+)?(?:קבוע|קבועים|סדיר|סדירים|חד))?/g,(m,pre,pf,w,nx)=>{const def=pf.endsWith("ה"),base=def?pf.slice(0,-1):pf,pl=w=="חשבונות",plain=!!nx;
 const noun=pl?"תשלומים":"תשלום",adj=plain?"":(pl?" קבועים":" קבוע");
 return pre+base+(def?"ה":"")+noun+(def&&!plain?" ה"+adj.trim():adj)+(nx||"")});
const SKIP=/from the bank|credit card|card bill|bank|statement|account/i;

for(const p of P){if(typeof p[1]=="function"&&/bills?\b/i.test(p[0].source)&&!SKIP.test(p[0].source)){const f=p[1];p[1]=(...a)=>{const o=f(...a);return typeof o=="string"?FIX(o):o}}}
})();

/* ---- he-gender.js (gender) ---- */
/* Hebrew speaks to a woman or a man differently. When the profile has a gender, the plural "you" forms (which are used when it is not known)
   become the singular ones. Past tense is the same for both, so only the ending changes; imperatives and the future differ. */
(function(){
const PAST="הוצאתם הזנתם קבעתם יצרתם קיבלתם שילמתם סימנתם חסכתם התחלתם ביקשתם בחרתם תייגתם קניתם השארתם הוספתם הכנסתם אמרתם עשיתם עדכנתם שיניתם שייכתם השתמשתם הקלדתם הפרשתם הייתם ניתקתם הגעתם חרגתם הפסקתם החזרתם דחיתם".split(" ");
const M={}; // plural -> [masculine, feminine]
PAST.forEach(w=>M[w]=[w.slice(0,-1),w.slice(0,-1)]);
const add=(s)=>s.split(";").forEach(p=>{const[a,b,c]=p.trim().split(" ");if(a)M[a]=[b,c]});
add("אתם אתה את;לכם לך לך;אתכם אותך אותך;עליכם עליך עליך;אליכם אליך אליך;עבורכם עבורך עבורך;לבכם לבך לבך;בשבילכם בשבילך בשבילך;ידכם ידך ידך;עצמכם עצמך עצמך;לרשותכם לרשותך לרשותך;לפניכם לפניך לפניך;אצלכם אצלך אצלך;איתכם איתך איתך;בעצמכם בעצמך בעצמך");
add("בחרו בחר בחרי;פתחו פתח פתחי;בדקו בדוק בדקי;ראו ראה ראי;נסו נסה נסי;צרו צור צרי;חברו חבר חברי;שמרו שמור שמרי;צרפו צרף צרפי;ספרו ספור ספרי;סמנו סמן סמני;בטלו בטל בטלי;עקבו עקוב עקבי;מחקו מחק מחקי;חפשו חפש חפשי;שלחו שלח שלחי;ערכו ערוך ערכי;סגרו סגור סגרי;העלו העלה העלי;בצעו בצע בצעי;אשרו אשר אשרי;לחצו לחץ לחצי;הוסיפו הוסף הוסיפי;הזינו הזן הזיני;הכניסו הכנס הכניסי;תנו תן תני;תקנו תקן תקני;תייגו תייג תייגי;עברו עבור עברי");
add("תשלמו תשלם תשלמי;תשכחו תשכח תשכחי;תראו תראה תראי;תנקו תנקה תנקי;תחצו תחצה תחצי;תוכלו תוכל תוכלי;תחזרו תחזור תחזרי;תפעלו תפעל תפעלי;תחברו תחבר תחברי;תבחרו תבחר תבחרי;תאשרו תאשר תאשרי;תנצלו תנצל תנצלי;תצטרכו תצטרך תצטרכי;תסיימו תסיים תסיימי;תוסיפו תוסיף תוסיפי;תפתחו תפתח תפתחי");
const keys=Object.keys(M).sort((a,b)=>b.length-a.length);
const RE=new RegExp("(^|[^א-ת])([ושלבכמה]{0,3})("+keys.join("|")+")(?![א-ת])","g");
const sex=()=>{let p={};try{p=(typeof S!="undefined"&&S.cfg&&S.cfg.profile)||{}}catch(e){}return p.gender=="f"?1:p.gender=="m"?0:-1};
// "עברו" also means "they passed", so it is only changed where it is an instruction
const SPECIAL=[[/(^|[^א-ת])עברו עם(?![א-ת])/g,["$1עבור עם","$1עברי עם"]]];
// "you [do something]" in the present: the word after "אתם" changes too
const PART={};"משתמשים משתמש משתמשת;רואים רואה רואה;מכניסים מכניס מכניסה;מחזירים מחזיר מחזירה;רגילים רגיל רגילה;עוקבים עוקב עוקבת;משלמים משלם משלמת;מצפים מצפה מצפה;מנהלים מנהל מנהלת;מוציאים מוציא מוציאה;חייבים חייב חייבת;מעבירים מעביר מעבירה;מזיזים מזיז מזיזה;יכולים יכול יכולה;רוצים רוצה רוצה;מוכנים מוכן מוכנה".split(";").forEach(p=>{const[a,b,c]=p.split(" ");PART[a]=[b,c]});
const PRE=new RegExp("((?:^|[^א-ת])[שכו]{0,2})אתם (?:"+Object.keys(PART).join("|")+")(?![א-ת])","g"),PW=new RegExp("("+Object.keys(PART).join("|")+")$");
HE.gen=function(s){const g=sex();if(g<0||typeof s!="string"||!/[א-ת]/.test(s))return s;
 s=s.replace(PRE,(m,pre)=>{const w=m.slice(pre.length+4);return pre+(g?"את ":"אתה ")+PART[w][g]});
 return s.replace(RE,(m,pre,pf,w)=>{if(w=="עברו")return m;return pre+pf+M[w][g]}).replace(SPECIAL[0][0],SPECIAL[0][1][g])};
HE.genKeys=keys;
const T0=HE.T;HE.T=function(){return HE.gen(T0.apply(this,arguments))};
})();

/* ---- he-activity.js ---- */
/* Hebrew additions for the Activity page: the totals line, the date range calendar, the entry window and the rewritten tooltips.
   Loaded after he-gender.js, same format: exact text in HE.D, text with names or counts in HE.P. */
(function(){const D=HE.D,P=HE.P,T=s=>HE.T(s);
const mo=s=>String(s).replace(/[A-Za-z]+/,x=>HE.mo(x));

const part=s=>{let m;if(m=/^(\d+) transfers?$/.exec(s))return +m[1]==1?"העברה אחת":m[1]+" העברות";if(m=/^(\d+) card payments?$/.exec(s))return +m[1]==1?"חיוב כרטיס אחד":m[1]+" חיובי כרטיס";if(m=/^(\d+) upcoming$/.exec(s))return +m[1]==1?"צפוי אחד":m[1]+" צפויים";if(m=/^(\d+) balance updates?$/.exec(s))return +m[1]==1?"עדכון יתרה אחד":m[1]+" עדכוני יתרה";if(m=/^(\d+) left out by you$/.exec(s))return m[1]+" הוצאו מהספירה על ידכם";return s};
P.unshift([/^(\d+) attachments?$/,n=>+n==1?"קובץ מצורף אחד":n+" קבצים מצורפים"]);
P.unshift([/^([−+-]?[₪$€£¥]\s?[\d,.]+) left (?!this account)(.+)$/,(a,n)=>a+" יצאו מ"+T(n)]);
P.unshift([/^([−+-]?[₪$€£¥]\s?[\d,.]+(?: \(.+?\))?) arrived in (.+)$/,(a,n)=>a+" נכנסו ל"+T(n)]);
P.unshift([/^Details ([a-z][a-z ]{2,30})$/,r=>"פרטים · "+T(r.charAt(0).toUpperCase()+r.slice(1))]);
P.unshift([/^Left out of In, Out and Net: (.+)$/,r=>"לא נכלל ב״נכנס״, ״יוצא״ ו״נטו״: "+r.split(", ").map(part).join(", ")]);
P.unshift([/^Payment (\d+) of (\d+)\. (\d+) more payments? to go\.$/,(a,b,c)=>"תשלום "+a+" מתוך "+b+". "+(+c==1?"נשאר תשלום אחד":"נשארו "+c+" תשלומים")+"."]);
P.unshift([/^Payment (\d+) of (\d+)\. This is the last one\.$/,(a,b)=>"תשלום "+a+" מתוך "+b+". זה האחרון."]);
P.unshift([/^The jar “(.+)” paid for this\. Open the entry to change or detach it\.$/,n=>"הקופה “"+n+"” שילמה על זה. פתחו את התנועה כדי לשנות או לנתק אותה."]);
P.unshift([/^Paid on (.+?) but counted in (.+?) in reports\. Open the entry to change the month\.$/,(d,m)=>"שולם ב־"+d+" אבל נספר ב"+mo(m)+" בדוחות. פתחו את התנועה כדי לשנות את החודש."]);
P.unshift([/^Paying your (.+) credit card bill from the bank\. It is not counted as spending, because each purchase is already counted on the card\. Open the entry to count it as spending anyway\.$/,n=>"תשלום חשבון כרטיס ה־"+n+" מהבנק. הוא לא נספר כהוצאה, כי כל קנייה כבר נספרת בכרטיס. פתחו את התנועה כדי לספור אותו כהוצאה בכל זאת."]);
P.unshift([/^(?:You told the app that every payment to "(.+?)" is a bill\. )?Every payment to "(.+?)" counts as a bill, even though the timing varies\. So far you have made (\d+) payments?, (\d+) of them in the last 12 months\.$/,(m0,m,n,k)=>(m0?"אמרתם לאפליקציה שכל תשלום ל־\""+m0+"\" הוא חשבון. ":"")+"כל תשלום ל־\""+m+"\" נספר כחשבון, גם כשהתזמון משתנה. עד כה שילמתם "+n+" פעמים, "+k+" מהם ב־12 החודשים האחרונים."]);
P.unshift([/^Part of the bill "(.+?)"\. The app found it by itself: you were charged (\d+) times?, (.+?), for a similar amount \(about (₪[\d,]+)\)\.( You marked it as canceled\.)?$/,(n,c,cad,a,x)=>"חלק מהחשבון \""+n+"\". האפליקציה מצאה אותו בעצמה: חויבתם "+c+" פעמים, "+T(cad)+", בסכום דומה (בערך "+a+")."+(x?" סימנתם אותו כמבוטל.":"")]);
})();
