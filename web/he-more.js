/* Hebrew additions: messages that come from the server (sync, test connection, import, alerts), the activity log, and sentences with names or numbers inside.
   Loaded after he-new.js, same format: exact text in HE.D, text with names or counts in HE.P ({} stands for a number). */
(function(){const D=HE.D,P=HE.P;
const n1=(n,one,many)=>+n==1?one:many;
Object.assign(D,{
/* ---- connection status ---- */
"No credentials":"אין פרטי התחברות","Needs a code":"נדרש קוד","Locked":"נעול","Last attempt failed":"הניסיון האחרון נכשל","Out of date":"לא מעודכן","Connected":"מחובר","Tested · not synced":"נבדק · עוד לא סונכרן","Not tested":"לא נבדק",
"Test connection":"בדיקת חיבור","Sync now":"סנכרון עכשיו","Import history":"ייבוא היסטוריה","Verify this device":"אימות המכשיר",
"Statements are available":"דפי חשבון זמינים","Statements available":"דפי חשבון זמינים",
"Wise: no profile on this token":"Wise: אין פרופיל בטוקן הזה",
"Save the login first.":"קודם שמרו את פרטי ההתחברות.","No verification window is open.":"אין חלון אימות פתוח.","The verification window closed.":"חלון האימות נסגר.","No such saved field.":"אין שדה שמור כזה.","Not available for this source":"לא זמין למקור הזה",
"Locked after failed attempts. Unlock it first.":"נעול אחרי ניסיונות כושלים. יש לבטל קודם את הנעילה.",
"A verification window is open. Finish or cancel it first.":"חלון אימות פתוח. סיימו או בטלו אותו קודם.","A scrape is running":"קריאה מהבנק מתבצעת כרגע","another scrape is running":"קריאה אחרת מהבנק מתבצעת כרגע","no verification window is open":"אין חלון אימות פתוח","unknown company":"חברה לא מוכרת","unknown source":"מקור לא מוכר","not found":"לא נמצא","too large":"גדול מדי",
"OTP_REQUIRED: the bank asked for a one-time code. Use \"Verify this device\" once so the bank remembers this browser":"הבנק ביקש קוד חד‑פעמי. השתמשו ב״אימות המכשיר״ פעם אחת כדי שהבנק יזכור את הדפדפן הזה",
/* ---- sync messages ---- */
/* ---- profile ---- */
"About this section":"על האזור הזה",
"Profile":"פרופיל","Make it yours":"בואו נתאים את זה אליכם","Tell us a little about you. Every field is optional.":"ספרו לנו קצת על עצמכם. כל השדות אופציונליים.",
"Everything here is optional. It stays in your own data and is never sent anywhere.":"כל מה שכאן אופציונלי. זה נשמר בנתונים שלכם ולא נשלח לשום מקום.",
"Name":"שם","What should we call you?":"איך לקרוא לכם?","We use it to greet you on the Home page. It is only shown to you.":"אנחנו משתמשים בו כדי לברך אתכם בדף הבית. הוא מוצג רק לכם.",
"Age":"גיל","e.g. 34":"למשל 34","So you can set goals such as “reach {} by age {}”. We keep it up to date as the years pass.":"כדי שתוכלו להגדיר יעדים כמו ״להגיע ל‑{} עד גיל {}״. אנחנו מעדכנים אותו לאורך השנים.",
"Gender":"מגדר","In Hebrew, words change for women and men. This lets the app speak to you correctly.":"בעברית המילים משתנות לנשים ולגברים. כך האפליקציה תדבר אליכם נכון.",
"Prefer not to say":"מעדיפים לא לומר","Female":"אישה","Male":"גבר",
"What matters most to you":"מה הכי חשוב לכם","Helps us decide what to point out first. Nothing changes without you.":"עוזר לנו להחליט על מה להצביע קודם. שום דבר לא משתנה בלי אתכם.",
"Not sure yet":"עוד לא בטוחים","Save more":"לחסוך יותר","Pay off debt":"להחזיר חובות","Understand my spending":"להבין את ההוצאות שלי","Plan for the future":"לתכנן את העתיד",
"Who shares your money":"מי חולק איתכם את הכסף","So tips about budgets and bills fit a single person, a couple or a family.":"כדי שהטיפים על תקציבים וחשבונות יתאימו ליחיד, לזוג או למשפחה.",
"Just me":"רק אני","Two of us":"שניים מאיתנו","A family with kids":"משפחה עם ילדים",
"Not now":"לא עכשיו","Clear profile":"ניקוי הפרופיל","Clear your profile?":"לנקות את הפרופיל?","Updated profile":"הפרופיל עודכן","Cleared profile":"הפרופיל נוקה","no name":"ללא שם",
"You can add this later in Settings → Profile":"אפשר להוסיף את זה אחר כך בהגדרות ← פרופיל",

"This is what the app's bank browser saw when the last login failed. A captcha, a notice or a blank page here tells us why. Every picture taken during each failed login is saved in the app's data folder, in profiles \u2192 _failed-logins (one folder per attempt, the newest 15 per bank are kept).":"כך נראה דף הבנק בדפדפן של האפליקציה כשההתחברות האחרונה נכשלה. קאפצ׳ה, הודעה או דף ריק יסבירו לנו למה. כל התמונות שצולמו במהלך כל התחברות כושלת נשמרות בתיקיית הנתונים של האפליקציה, בתוך profiles ← _failed-logins (תיקייה לכל ניסיון, נשמרים 15 האחרונים לכל בנק).",
"No screenshot yet. Press Test connection once and let it fail, then open this again.":"עדיין אין צילום מסך. לחצו על בדיקת חיבור פעם אחת, תנו לה להיכשל, ואז פתחו שוב.","Changed jar type":"סוג הקופה שונה",

"The bank\u2019s website cut the connection after the login. Log in on the bank\u2019s website yourself to see if it asks for something, then try again. If it keeps happening, use the CSV export (Settings \u2192 Import and export).":"אתר הבנק ניתק את החיבור אחרי ההתחברות. היכנסו בעצמכם לאתר הבנק כדי לראות אם הוא מבקש משהו, ונסו שוב. אם זה חוזר, השתמשו בייצוא CSV (הגדרות ← ייבוא וייצוא).",
"Automatic attempts are paused. Check the login, then unlock it in Settings.":"הניסיונות האוטומטיים מושהים. בדקו את פרטי ההתחברות ואז בטלו את הנעילה בהגדרות.",
"Money · missing money":"Money · כסף חסר",
"Bank transfer":"העברה בנקאית",
"Something went wrong":"משהו השתבש","Already set up":"כבר הוגדר","Too many attempts. Try again in 15 minutes.":"יותר מדי ניסיונות. נסו שוב בעוד 15 דקות.","That code is not right.":"הקוד אינו נכון.",
"Two-factor sign-in is already on. Turn it off first (it asks for your password).":"אימות דו‑שלבי כבר פעיל. כבו אותו קודם (תתבקשו להזין סיסמה).",
"Save your ntfy address first.":"קודם שמרו את כתובת ה‑ntfy.","Test alert: background notifications work":"התראת בדיקה: ההתראות ברקע עובדות","Test alert: notifications work":"התראת בדיקה: ההתראות עובדות","The ntfy server did not accept it.":"שרת ה‑ntfy לא קיבל את ההודעה.","Sent to ntfy":"נשלח ל‑ntfy",
"Choose a bank or card account":"בחרו חשבון בנק או כרטיס","No such transaction":"אין תנועה כזאת","no such open gap":"אין פער פתוח כזה",
"is there a newer version?":"האם יש גרסה חדשה?","GitHub refused the request (too many checks, try again later)":"GitHub דחה את הבקשה (יותר מדי בדיקות, נסו שוב מאוחר יותר)",
"a note is required to mark a gap as reviewed":"כדי לסמן פער כנבדק צריך להוסיף הערה","only money that left can be recorded as a charge":"אפשר לרשום כחיוב רק כסף שיצא","Unrecorded charge (balance gap)":"חיוב לא רשום (פער ביתרה)","Recorded to make the books match the balance":"נרשם כדי שהספרים יתאימו ליתרה","Gap reviewed":"הפער נבדק","Gap recorded as charge":"הפער נרשם כחיוב","unknown action":"פעולה לא מוכרת",
"Give the account a name":"תנו שם לחשבון","An account with that name already exists":"כבר קיים חשבון בשם הזה","Account created":"החשבון נוצר","Account changed":"החשבון שונה","Only accounts you created can be edited here":"כאן אפשר לערוך רק חשבונות שיצרתם","Only hand-entered accounts have a balance you can set":"רק לחשבונות שהוזנו ידנית יש יתרה שאפשר לקבוע","Only accounts you created can be removed here":"כאן אפשר להסיר רק חשבונות שיצרתם",
" · entered by you":" · הוזן על ידכם",
/* ---- import (CSV) ---- */
"Could not find the header row. Expected columns like date, description and amount.":"לא נמצאה שורת הכותרות. מצפים לעמודות כמו תאריך, תיאור וסכום.","No description column found.":"לא נמצאה עמודת תיאור.",
"Merged with import":"אוחד עם הייבוא","Sample data loaded":"נטענו נתוני דוגמה","Jars filled":"קופות מולאו","Sync":"סנכרון","Created jar":"נוצרה קופה",
/* ---- misc interface ---- */
"no shekel balance":"אין יתרה בשקלים","not counted in net worth or reports":"לא נספר בשווי הנקי ובדוחות","smaller items":"פריטים קטנים יותר","after the deadline":"אחרי תאריך היעד","Sent":"נשלח",
"Spending, By Category, Up To The Same Day":"הוצאות לפי קטגוריה, עד אותו יום בחודש","spending, by category, up to the same day":"הוצאות לפי קטגוריה, עד אותו יום בחודש",
"USD + ILS":"דולר + שקל","USD → ILS":"דולר ← שקל",
"Last 6 months: a steady middle ground. Months before your first transaction are never counted.":"6 החודשים האחרונים: אמצע יציב. חודשים שלפני התנועה הראשונה שלכם לא נספרים אף פעם.",
"months":"חודשים","goal {}":"יעד {}","by {m} {}":"עד {m} {}","{} jars":"{} קופות","of {} budget":"מתוך תקציב של {}","of {} usual":"מתוך {} רגיל","Typically {} a month":"בדרך כלל {} בחודש","{} this month":"{} החודש",
"{} this month":"{} החודש","ECB reference rates via Frankfurter, updated {}-{}-{}.":"שערי הייחוס של הבנק המרכזי האירופי דרך Frankfurter, עודכנו ב‑{}-{}-{}.","{} sample transactions":"{} תנועות לדוגמה","ECB reference rates via Frankfurter, updated {}.":"שערי הייחוס של הבנק המרכזי האירופי דרך Frankfurter, עודכנו ב‑{}.",
"asked for the last {} days, the bank returned no transactions":"ביקשנו את {} הימים האחרונים והבנק לא החזיר אף תנועה",
"Wise: no transactions yet":"Wise: אין עדיין תנועות"
});
P.unshift(
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
