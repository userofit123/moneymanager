/* Recap: a page that tells you, in plain words, how the current month is going. Every sentence appears only when it is true for you right now,
   and what the page leads with depends on where you are in the month (start, middle, last days) and on how spending is trending.
   Everything is worked out here from the data the app already has; nothing is sent anywhere. Texts are written in English and in Hebrew side by side. */
(function(){
const H=()=>!!(window.HE&&HE.on);
const L=(en,he)=>H()?he:en;
const P=()=>(S.cfg&&S.cfg.profile)||{};
const R0=n=>Math.round(n);
const mny=n=>`<bdi class="rcn">${n<0?"−":""}₪${f(Math.abs(n))}</bdi>`;
const B=t=>`<b>${t}</b>`;
const nm=t=>`<bdi>${esc(t)}</bdi>`;
const loc=()=>H()?"he-IL":"en-GB";
const dlong=d=>new Date(String(d).slice(0,10)+"T12:00:00").toLocaleDateString(loc(),{day:"numeric",month:"long"});
const dshort=d=>new Date(String(d).slice(0,10)+"T12:00:00").toLocaleDateString(loc(),{day:"numeric",month:"short"});
const dday=d=>new Date(String(d).slice(0,10)+"T12:00:00").toLocaleDateString(loc(),{weekday:"long"});
const mname=k=>new Date(+k.slice(0,4),+k.slice(5,7)-1,1).toLocaleDateString(loc(),{month:"long"});
// pl(n, English one, English many, Hebrew one, Hebrew many): "{}" stands for the number
const pl=(n,en1,enN,he1,heN)=>H()?(n==1?he1:heN.replace("{}",n)):(n==1?en1:enN.replace("{}",n));
const ico={
 in:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
 out:'<path d="M12 20V9M7 13l5-5 5 5M5 4h14"/>',
 cal:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
 card:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>',
 pie:'<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 4"/>',
 path:'<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>'
};
const sec=(ic,tone,title,body,go)=>`<section class="rcs ${tone||""}"><div class="rch"><span class="rci"><svg viewBox="0 0 24 24">${ico[ic]}</svg></span><h3>${title}</h3>${go?`<a class="rcg" data-a="nav" data-v="${go}">${L("Open","פתיחה")} ${H()?"←":"→"}</a>`:""}</div><div class="rcb">${body}</div></section>`;
const pp=t=>`<p>${t}</p>`;
const bar=(pct,cls)=>`<div class="rcbar ${cls||""}"><i style="width:${Math.max(0,Math.min(100,pct))}%"></i></div>`;
const SEP=()=>", ";

function model(){
 const day=DAYN,dim=DIM,pm=addM(MK,-1),nm=addM(MK,1),F=jarFree(),R=F.R,cash=F.cash,BI=billsInfo();
 const inc=monthSum(MK,1),ex=monthSum(MK,-1);
 const cardsU=cardsD.reduce((s,c)=>s+c[1],0),cardsPrev=cardsD.reduce((s,c)=>s+c[2],0);
 const cardPaid=S.tx.filter(t=>!t.virtual&&isCardPay(t)&&String(t.d).startsWith(MK)&&String(t.d)<=TODAY).reduce((s,t)=>s-t.a,0);
 const cardLeft=Math.max(0,cardsPrev-cardPaid);
 const same=A().filter(t=>t.a<0&&rdOf(t).startsWith(pm)&&+rdOf(t).slice(8)<=day).reduce((s,t)=>s-t.a,0);
 const incs=A().filter(t=>t.a>0&&!t.pending&&rdOf(t).startsWith(MK)).sort((a,b)=>b.a-a.a);
 const sal=incs.find(t=>/salary|משכורת|שכר/i.test((t.c||"")+" "+t.desc))||incs[0]||null;
 const spendNow=Object.fromEntries(spend());
 const bills=[];R.rows.forEach(r=>(r.bills||[]).forEach(b=>{const bi=BI.find(x=>x.n==b.n);bills.push({n:b.n,amt:b.amt,nx:bi&&bi.nx?bi.nx:null,overdue:!!b.overdue})}));
 bills.sort((a,b)=>(a.nx||0)-(b.nx||0));
 const billsTot=bills.reduce((s,b)=>s+b.amt,0),limitsLeft=R.rows.filter(r=>r.kind!="bill").reduce((s,r)=>s+r.amt,0);
 const jarCov=(R.jarCov||[]).reduce((s,x)=>s+x.cov,0);
 const outToCome=R.total+jarCov;
 const end=cash-outToCome-cardLeft;
 const start=cash-inc+(ex-cardsU)+cardPaid;
 const bud=budgetInfo(),over=bud.filter(b=>b.st=="over"),risk=bud.filter(b=>b.st=="pace"||b.st=="warn"),okB=bud.filter(b=>b.st=="ok");
 // categories against their usual month (the average of the last full months)
 const Mc=monthlyByCat(),idx=budMonths(),usual=k=>idx.length?idx.reduce((s,mm)=>s+((Mc[k]||{})[mm]||0),0)/idx.length:0;
 const skip=k=>["Income","Uncategorized","Fees & FX costs"].includes(k)||S.cats[k]===99;
 const above=Object.keys(spendNow).filter(k=>!skip(k)).map(k=>({k,s:spendNow[k],u:usual(k)})).filter(x=>x.u>=150&&x.s>x.u*1.05).sort((a,b)=>(b.s-b.u)-(a.s-a.u)).slice(0,3);
 const below=Object.keys(Mc).filter(k=>!skip(k)).map(k=>({k,s:spendNow[k]||0,u:usual(k),by:usual(k)*day/dim})).filter(x=>x.u>=250&&day>=7&&x.s<x.by*.5&&!(typeof billMo=="function"&&billMo(x.k)>0)).sort((a,b)=>(b.by-b.s)-(a.by-a.s)).slice(0,3);
 // the last 7 days against the 7 before
 const dn=t=>Math.floor((new Date(TODAY+"T12:00:00")-new Date(rdOf(t)+"T12:00:00"))/864e5);
 const exp=A().filter(t=>t.a<0);
 const w1=exp.filter(t=>{const d=dn(t);return d>=0&&d<7}).reduce((s,t)=>s-t.a,0),w0=exp.filter(t=>{const d=dn(t);return d>=7&&d<14}).reduce((s,t)=>s-t.a,0);
 const yest=exp.filter(t=>dn(t)==1).reduce((s,t)=>s-t.a,0),today=exp.filter(t=>dn(t)==0).reduce((s,t)=>s-t.a,0);
 const big=exp.filter(t=>rdOf(t).startsWith(MK)).sort((a,b)=>a.a-b.a)[0]||null;
 const jarGot=S.jars.filter(j=>!j.done).reduce((s,j)=>s+(+j.got||0),0);
 const nextBills=BI.filter(b=>!b.once&&!b.irregular&&b.flag!="canceled"&&b.nx&&b.nx.toISOString().slice(0,7)==nm).reduce((s,b)=>s+b.pred,0);
 const comingSoon=BI.filter(b=>!b.once&&!b.irregular&&b.flag!="canceled"&&b.nx&&b.nx>NOW&&(b.nx-NOW)/864e5<=7).sort((a,b)=>a.nx-b.nx);
 const phase=day<=5?"start":dim-day<=6?"end":"mid";
 return{day,dim,pm,nm,cash,inc,ex,cardsU,cardsPrev,cardPaid,cardLeft,same,incs,sal,bills,billsTot,limitsLeft,jarCov,outToCome,end,start,over,risk,okB,above,below,w1,w0,yest,today,big,jarGot,nextBills,comingSoon,phase,inJars:F.inJars}}

function hero(m){const nm=(P().name||"").trim(),mon=mname(MK);
 const hi=nm?L("Hi "+esc(nm),"היי "+esc(nm)):L("Hello","שלום");
 const lead={start:L(`here is how ${mon} is beginning`,`כך ${mon} מתחיל`),mid:L(`here is your ${mon} so far`,`הנה ${mon} שלכם עד עכשיו`),end:L(`${mon} is almost over. Here is how it is closing and how ${mname(m.nm)} will start`,`${mon} כמעט נגמר. כך הוא נסגר וכך ${mname(m.nm)} יתחיל`)}[m.phase];
 // the one-line mood: how spending compares with the same point last month, and the budgets
 let mood="";const diff=m.same-m.ex;
 if(m.same>=100&&m.ex>=100){
  if(diff>=Math.max(100,m.same*.1))mood=L(`Spending is calm: you have spent ${mny(diff)} less than at this point last month.`,`ההוצאות רגועות: הוצאתם ${mny(diff)} פחות מאשר בנקודה הזאת בחודש שעבר.`);
  else if(-diff>=Math.max(100,m.same*.1))mood=L(`Spending is running higher than last month: ${mny(-diff)} more than at this point.`,`ההוצאות גבוהות מחודש שעבר: ${mny(-diff)} יותר מאשר בנקודה הזאת.`);
  else mood=L("Spending is close to last month's pace.","ההוצאות קרובות לקצב של חודש שעבר.");
 }else if(m.ex<100)mood=L("Very little has gone out so far.","עד עכשיו כמעט לא יצא כסף.");
 if(m.over.length)mood+=" "+L(`${pl(m.over.length,"One budget is","{} budgets are","","")} over its limit.`,`${pl(m.over.length,"","","תקציב אחד חרג","{} תקציבים חרגו")} מהמסגרת.`);
 return `<section class="rcs hero"><div class="rcdt">${L(`Day ${m.day} of ${m.dim}`,`יום ${m.day} מתוך ${m.dim}`)}</div>${bar(m.day/m.dim*100,"day")}<h2>${hi}, ${lead}.</h2>${mood?`<p class="rcmood">${mood}</p>`:""}</section>`}

function money(m){let b="";
 const hasStart=isFinite(m.start)&&Math.abs(m.start)>=1;
 if(hasStart)b+=pp(L(`You started ${mname(MK)} with about ${mny(m.start)} in your accounts.`,`התחלתם את ${mname(MK)} עם בערך ${mny(m.start)} בחשבונות.`));
 if(m.sal){const rest=m.inc-m.sal.a,n=m.incs.length-1;
  b+=pp(L(`You got paid ${B(mny(m.sal.a))} on ${dlong(rdOf(m.sal))} (${nm(m.sal.desc)}).`,`קיבלתם ${B(mny(m.sal.a))} ב‑${dlong(rdOf(m.sal))} (${nm(m.sal.desc)}).`));
  if(n>0&&rest>=1)b+=pp(L(`${pl(n,"One more payment","{} more payments","","")} came in, ${mny(rest)} in total. ${B("Income so far: "+mny(m.inc))}.`,`${pl(n,"","","נכנס תשלום נוסף","נכנסו {} תשלומים נוספים")}, ${mny(rest)} בסך הכול. ${B("סך ההכנסות עד עכשיו: "+mny(m.inc))}.`));
 }else b+=pp(L("No income has arrived yet this month.","עוד לא נכנסה הכנסה החודש."));
 const arr=H()?"←":"→";
 b+=`<div class="rcrow"><div><span>${L("Started","התחלה")}</span><b>${hasStart?"≈ "+mny(m.start):"–"}</b></div><i>${arr}</i><div><span>${L("Now","עכשיו")}</span><b>${mny(m.cash)}</b></div><i>${arr}</i><div class="${m.end<0?"neg":"pos"}"><span>${L("Could end at","יכול להסתיים ב")}</span><b>≈ ${mny(m.end)}</b></div></div>`;
 return sec("in","tp",L("What came in","מה נכנס"),b,"tx")}

function committed(m){let b="";
 if(m.cardLeft>=1)b+=pp(L(`You still have ${B(mny(m.cardLeft))} of credit card payments from last month's purchases to be paid this month (${mny(m.cardsPrev)} was billed, ${mny(m.cardPaid)} has already gone).`,`נשארו לכם ${B(mny(m.cardLeft))} של תשלומי כרטיס אשראי על קניות מהחודש שעבר שיירדו החודש (חויבו ${mny(m.cardsPrev)}, כבר ירדו ${mny(m.cardPaid)}).`));
 else if(m.cardsPrev>=1)b+=pp(L(`Last month's credit card bill (${mny(m.cardsPrev)}) has been paid.`,`חיוב כרטיס האשראי של החודש שעבר (${mny(m.cardsPrev)}) כבר שולם.`));
 if(m.bills.length){const top=m.bills.slice(0,3).map(x=>`${nm(x.n)} ${mny(x.amt)}${x.nx?" · "+dshort(x.nx.toISOString()):x.overdue?" · "+L("overdue","באיחור"):""}`).join(SEP());
  b+=pp(L(`${pl(m.bills.length,"One bill is","{} bills are","","")} still due this month, ${B(mny(m.billsTot))} in total: ${top}${m.bills.length>3?" and more":""}.`,`${pl(m.bills.length,"","","חשבון אחד עוד","{} חשבונות עוד")} לתשלום החודש, ${B(mny(m.billsTot))} בסך הכול: ${top}${m.bills.length>3?", ועוד":""}.`))}
 if(m.limitsLeft>=1)b+=pp(L(`Your budgets and usual spending still have about ${B(mny(m.limitsLeft))} left to spend this month.`,`בתקציבים ובהוצאות הרגילות נשארו בערך ${B(mny(m.limitsLeft))} להוצאה החודש.`));
 if(m.cardsU>=1)b+=pp(L(`${mny(m.cardsU)} of this month's purchases are on your credit cards. They are billed to your bank next month.`,`${mny(m.cardsU)} מהקניות של החודש נמצאות בכרטיסי האשראי. הן יחויבו בחשבון הבנק בחודש הבא.`));
 if(!b)return"";return sec("card","",L("What is still ahead","מה עוד לפניכם"),b,"bills")}

function spent(m){let b=pp(L(`You have spent ${B(mny(m.ex))} so far this month.`,`הוצאתם ${B(mny(m.ex))} עד עכשיו החודש.`));
 if(m.same>=100){const mx=Math.max(m.ex,m.same,1);b+=`<div class="rccmp"><div><span>${mname(MK)}</span>${bar(m.ex/mx*100,"cur")}<b>${mny(m.ex)}</b></div><div><span>${mname(m.pm)} ${L("at this point","באותה נקודה")}</span>${bar(m.same/mx*100,"prev")}<b>${mny(m.same)}</b></div></div>`}
 if(m.w1>=1||m.w0>=1){const d=m.w1-m.w0;
  if(m.w0>=100&&Math.abs(d)>=Math.max(80,m.w0*.2))b+=pp(d<0?L(`Over the last 7 days you spent ${mny(m.w1)}, which is ${mny(-d)} less than the 7 days before. The trend is going down.`,`ב‑7 הימים האחרונים הוצאתם ${mny(m.w1)}, כלומר ${mny(-d)} פחות מ‑7 הימים שלפניהם. המגמה יורדת.`):L(`Over the last 7 days you spent ${mny(m.w1)}, which is ${mny(d)} more than the 7 days before. The trend is going up.`,`ב‑7 הימים האחרונים הוצאתם ${mny(m.w1)}, כלומר ${mny(d)} יותר מ‑7 הימים שלפניהם. המגמה עולה.`));
  else b+=pp(L(`Over the last 7 days you spent ${mny(m.w1)}.`,`ב‑7 הימים האחרונים הוצאתם ${mny(m.w1)}.`))}
 if(m.today>=1)b+=pp(L(`Today so far: ${mny(m.today)}.`,`היום עד עכשיו: ${mny(m.today)}.`));
 else if(m.yest>=1)b+=pp(L(`Yesterday you spent ${mny(m.yest)}.`,`אתמול הוצאתם ${mny(m.yest)}.`));
 else if(m.day>1)b+=pp(L("Nothing was spent yesterday.","אתמול לא הוצאתם כלום."));
 if(m.big&&-m.big.a>=Math.max(300,m.ex*.15))b+=pp(L(`The biggest single expense is ${B(nm(m.big.desc))}, ${mny(-m.big.a)}, on ${dlong(rdOf(m.big))}.`,`ההוצאה הבודדת הגדולה ביותר היא ${B(nm(m.big.desc))}, ${mny(-m.big.a)}, ב‑${dlong(rdOf(m.big))}.`));
 return sec("out","tn",L("Spending","הוצאות"),b,"tx")}

function budgets(m){let b="";
 m.over.slice(0,4).forEach(x=>{b+=`<div class="rcbd over"><div><b>${nm(x.k)}</b> <span>${L("over by","חרג ב")} ${mny(x.s-x.lim)}</span></div>${bar(100,"neg")}<small>${mny(x.s)} ${L("of","מתוך")} ${mny(x.lim)}</small></div>`});
 m.risk.slice(0,4).forEach(x=>{b+=`<div class="rcbd"><div><b>${nm(x.k)}</b> <span>${x.pace>x.lim?L(`on pace to reach ${mny(x.pace)}`,`בקצב להגיע ל‑${mny(x.pace)}`):L("close to its limit","קרוב למסגרת")}</span></div>${bar(x.pc,"warn")}<small>${mny(x.s)} ${L("of","מתוך")} ${mny(x.lim)}</small></div>`});
 if(m.okB.length)b+=pp(L(`${pl(m.okB.length,"One other budget is","{} other budgets are","","")} on track.`,`${pl(m.okB.length,"","","תקציב אחד נוסף בדרך","{} תקציבים נוספים בדרך")} הנכונה.`));
 if(m.above.length)b+=pp(L("Already above a usual month: ","כבר מעל חודש רגיל: ")+m.above.map(x=>`${B(nm(x.k))} ${mny(x.s)} (${L("usual","רגיל")} ≈ ${mny(R0(x.u))})`).join(SEP())+".");
 if(m.below.length)b+=pp(L("Spending less than usual: ","מוציאים פחות מהרגיל: ")+m.below.map(x=>`${B(nm(x.k))} ${mny(x.s)} ${L("so far","עד עכשיו")} (${L("usually about","בדרך כלל בערך")} ${mny(R0(x.by))} ${L("by now","עד עכשיו")})`).join(SEP())+".");
 if(!b)return"";return sec("pie","",L("Budgets and categories","תקציבים וקטגוריות"),b,"budg")}

function landing(m){let b="";const dlt=m.end-m.start,hasStart=isFinite(m.start)&&Math.abs(m.start)>=1;
 b+=pp(L(`If things continue as planned and no more income arrives, your accounts could end ${mname(MK)} at about ${B(mny(m.end))}.`,`אם הכול ימשיך כמתוכנן ולא תיכנס עוד הכנסה, החשבונות יכולים לסיים את ${mname(MK)} עם בערך ${B(mny(m.end))}.`));
 if(hasStart&&Math.abs(dlt)>=100)b+=pp(dlt>=0?L(`That is ${mny(dlt)} more than you started with.`,`זה ${mny(dlt)} יותר ממה שהתחלתם איתו.`):L(`That is ${mny(-dlt)} less than you started with.`,`זה ${mny(-dlt)} פחות ממה שהתחלתם איתו.`));
 if(m.inJars>=1)b+=pp(L(`${mny(m.inJars)} of your money is set aside in jars${m.jarGot>=1?`, and jars received ${mny(m.jarGot)} this month`:""}.`,`${mny(m.inJars)} מהכסף שלכם שמור בקופות${m.jarGot>=1?`, והקופות קיבלו ${mny(m.jarGot)} החודש`:""}.`));
 if(m.phase=="end"){const known=m.nextBills+m.cardsU;
  b+=pp(L(`${mname(m.nm)} will start with about ${mny(known)} already on its way out: ${mny(m.nextBills)} of recurring bills and ${mny(m.cardsU)} of credit card purchases from this month.`,`${mname(m.nm)} יתחיל כשכבר ${mny(known)} בדרך החוצה: ${mny(m.nextBills)} של חשבונות קבועים ו‑${mny(m.cardsU)} של קניות בכרטיסי אשראי מהחודש הזה.`))}
 return sec("path",m.end<0?"tn":"",L("Where this is heading","לאן זה הולך"),b,"fc")}

function comingUp(m){if(!m.comingSoon.length)return"";const t=m.comingSoon.slice(0,4).map(b=>`<div class="rcsn"><span>${dday(b.nx.toISOString())} · ${dshort(b.nx.toISOString())}</span><b>${nm(b.n)}</b><em>${mny(b.pred)}</em></div>`).join("");
 return sec("cal","",L("Coming up this week","בשבוע הקרוב"),t,"bills")}

window.renderRecap=function(){const el=$("recap");if(!el)return;
 if(!S.tx.length){el.innerHTML=`<div class="rcw" data-nt><section class="rcs hero"><h2>${L("Nothing to recap yet","עוד אין מה לסכם")}</h2><p class="rcmood">${L("Once your accounts are connected or you add a few transactions, this page will tell you how your month is going.","אחרי שתחברו חשבונות או תוסיפו כמה תנועות, הדף הזה יספר לכם איך החודש מתקדם.")}</p></section></div>`;return}
 const m=model();
 const order=m.phase=="start"?[hero,money,committed,spent,budgets,comingUp,landing]:m.phase=="end"?[hero,spent,budgets,money,committed,landing,comingUp]:[hero,money,committed,spent,budgets,landing,comingUp];
 el.innerHTML=`<div class="rcw" data-nt>${order.map(fn=>{try{return fn(m)}catch(e){return""}}).join("")}</div>`};
})();
