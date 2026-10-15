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
