/* Recap: a calm, simple page that tells you how the current month is going. Few words, big numbers, one small picture for each part.
   Every part appears only when it is true for you right now, and the order depends on where you are in the month.
   Everything is worked out here from the data the app already has; nothing is sent anywhere. Texts are written in English and in Hebrew side by side. */
(function(){
const H=()=>!!(window.HE&&HE.on);
const L=(en,he)=>H()?he:en;
const P=()=>(S.cfg&&S.cfg.profile)||{};
const mn=n=>`<bdi class="rkc">${n<0?"−":""}<small>₪</small>${f(Math.abs(n))}</bdi>`;     // a big number
const mi=n=>`<bdi class="rkc">${n<0?"−":""}₪${f(Math.abs(n))}</bdi>`;                      // an amount inside a sentence
const nm=t=>`<bdi>${esc(t)}</bdi>`;
const loc=()=>H()?"he-IL":"en-GB";
const dlong=d=>new Date(String(d).slice(0,10)+"T12:00:00").toLocaleDateString(loc(),{day:"numeric",month:"long"});
const dshort=d=>new Date(String(d).slice(0,10)+"T12:00:00").toLocaleDateString(loc(),{day:"numeric",month:"short"});
const dday=d=>new Date(String(d).slice(0,10)+"T12:00:00").toLocaleDateString(loc(),{weekday:"short"});
const mname=k=>new Date(+k.slice(0,4),+k.slice(5,7)-1,1).toLocaleDateString(loc(),{month:"long"});
const pl=(n,en1,enN,he1,heN)=>H()?(n==1?he1:heN.replace("{}",n)):(n==1?en1:enN.replace("{}",n));
const ICON={
 in:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
 out:'<path d="M12 20V9M7 13l5-5 5 5M5 4h14"/>',
 ahead:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14.5h3"/>',
 pie:'<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6.4 4.6"/>',
 check:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16.5 9.5"/>',
 path:'<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
 up:'<path d="M6 15l6-6 6 6"/>',down:'<path d="M6 9l6 6 6-6"/>',flat:'<path d="M5 12h14"/>'
};
const tile=(ic,tone)=>`<div class="rki ${tone||""}"><svg viewBox="0 0 24 24">${ICON[ic]}</svg></div>`;
// one part of the page: a big icon, a small label (which opens the full page), a big number, a short line, and a picture
const part=(ic,tone,label,go,big,line,vis)=>`<section class="rk ${tone||""}">${tile(ic,tone)}<div class="rkb"><a class="rkl" data-a="nav" data-v="${go}">${label}<i>${H()?"←":"→"}</i></a><div class="rkn">${big}</div>${line?`<div class="rkp">${line}</div>`:""}${vis||""}</div></section>`;
const chip=(dir,txt,tone)=>`<div class="rkch ${tone||""}"><svg viewBox="0 0 24 24">${ICON[dir]}</svg><span>${txt}</span></div>`;

/* ---------- the numbers ---------- */
function model(){
 const day=DAYN,dim=DIM,pm=addM(MK,-1),nmk=addM(MK,1),F=jarFree(),R=F.R,cash=F.cash,BI=billsInfo();
 const inc=monthSum(MK,1),ex=monthSum(MK,-1);
 const cardsU=cardsD.reduce((s,c)=>s+c[1],0),cardsPrev=cardsD.reduce((s,c)=>s+c[2],0);
 const cardPaid=S.tx.filter(t=>!t.virtual&&isCardPay(t)&&String(t.d).startsWith(MK)&&String(t.d)<=TODAY).reduce((s,t)=>s-t.a,0);
 const cardLeft=Math.max(0,cardsPrev-cardPaid);
 const same=A().filter(t=>t.a<0&&rdOf(t).startsWith(pm)&&+rdOf(t).slice(8)<=day).reduce((s,t)=>s-t.a,0);
 const incs=A().filter(t=>t.a>0&&!t.pending&&rdOf(t).startsWith(MK)).sort((a,b)=>b.a-a.a);
 const sal=incs.find(t=>/salary|משכורת|שכר/i.test((t.c||"")+" "+t.desc))||incs[0]||null;
 const spendNow=Object.fromEntries(spend());
 const bills=[];R.rows.forEach(r=>(r.bills||[]).forEach(b=>{const bi=BI.find(x=>x.n==b.n);bills.push({n:b.n,amt:b.amt,nx:bi&&bi.nx?bi.nx:null,overdue:!!b.overdue})}));
 const billsTot=bills.reduce((s,b)=>s+b.amt,0),limitsLeft=R.rows.filter(r=>r.kind!="bill").reduce((s,r)=>s+r.amt,0);
 const jarCov=(R.jarCov||[]).reduce((s,x)=>s+x.cov,0);
 const end=cash-(R.total+jarCov)-cardLeft;
 const start=cash-inc+(ex-cardsU)+cardPaid;
 const bud=budgetInfo(),over=bud.filter(b=>b.st=="over"),risk=bud.filter(b=>b.st=="pace"||b.st=="warn"),okB=bud.filter(b=>b.st=="ok");
 const Mc=monthlyByCat(),idx=budMonths(),usual=k=>idx.length?idx.reduce((s,mm)=>s+((Mc[k]||{})[mm]||0),0)/idx.length:0;
 const skip=k=>["Income","Uncategorized","Fees & FX costs"].includes(k)||S.cats[k]===99;
 const above=Object.keys(spendNow).filter(k=>!skip(k)).map(k=>({k,s:spendNow[k],u:usual(k)})).filter(x=>x.u>=150&&x.s>x.u*1.05).sort((a,b)=>(b.s-b.u)-(a.s-a.u));
 const below=Object.keys(Mc).filter(k=>!skip(k)).map(k=>({k,s:spendNow[k]||0,u:usual(k),by:usual(k)*day/dim})).filter(x=>x.u>=250&&day>=7&&x.s<x.by*.5&&!(typeof billMo=="function"&&billMo(x.k)>0)).sort((a,b)=>(b.by-b.s)-(a.by-a.s));
 const dn=t=>Math.floor((new Date(TODAY+"T12:00:00")-new Date(rdOf(t)+"T12:00:00"))/864e5);
 const exp=A().filter(t=>t.a<0);
 const w1=exp.filter(t=>{const d=dn(t);return d>=0&&d<7}).reduce((s,t)=>s-t.a,0),w0=exp.filter(t=>{const d=dn(t);return d>=7&&d<14}).reduce((s,t)=>s-t.a,0);
 const perDay=Array.from({length:day},()=>0);exp.forEach(t=>{const r=rdOf(t);if(r.startsWith(MK)){const d=+r.slice(8);if(d>=1&&d<=day)perDay[d-1]-=t.a}});
 const jarGot=S.jars.filter(j=>!j.done).reduce((s,j)=>s+(+j.got||0),0);
 const nextBills=BI.filter(b=>!b.once&&!b.irregular&&b.flag!="canceled"&&b.nx&&b.nx.toISOString().slice(0,7)==nmk).reduce((s,b)=>s+b.pred,0);
 const nextUp=BI.filter(b=>!b.once&&!b.irregular&&b.flag!="canceled"&&b.nx&&b.nx>NOW).sort((a,b)=>a.nx-b.nx)[0]||null;
 const phase=day<=5?"start":dim-day<=6?"end":"mid";
 return{day,dim,pm,nmk,cash,inc,ex,cardsU,cardsPrev,cardPaid,cardLeft,same,incs,sal,bills,billsTot,limitsLeft,end,start,over,risk,okB,above,below,w1,w0,perDay,jarGot,nextBills,nextUp,phase,inJars:F.inJars}}

/* ---------- the small pictures ---------- */
// the month as a row of days: the days that are over, today, and the days still to come
function dayScale(m){let t="";for(let d=1;d<=m.dim;d++)t+=`<i class="${d<m.day?"p":d==m.day?"n":""}"></i>`;
 return `<div class="rkds"><div class="rkdt">${t}</div><div class="rkdl"><span>${L(`Day ${m.day} of ${m.dim}`,`יום ${m.day} מתוך ${m.dim}`)}</span><span>${m.dim-m.day>0?pl(m.dim-m.day,"1 day left","{} days left","נשאר יום אחד","נשארו {} ימים"):L("Last day of the month","היום האחרון בחודש")}</span></div></div>`}

// one bar for each day so far
function dayBars(m){const W=600,Hh=96,gap=4,n=m.dim,bw=(W-gap*(n-1))/n,sd=[...m.perDay].sort((a,b)=>b-a),mx=Math.max(1,sd[0]>sd[1]*2.2?sd[1]*1.3:sd[0]);let s="";
 for(let i=0;i<n;i++){const v=m.perDay[i]||0,x=i*(bw+gap);
  if(i<m.day){const h=Math.min(Hh,Math.max(v>0?5:2,v/mx*(Hh-6)));s+=`<rect x="${x}" y="${Hh-h}" width="${bw}" height="${h}" rx="${Math.min(4,bw/2)}" class="${i==m.day-1?"t":"b"}"/>`}
  else s+=`<rect x="${x}" y="${Hh-2}" width="${bw}" height="2" rx="1" class="f"/>`}
 return `<svg class="rkv bars" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" aria-hidden="true">${s}</svg>`}

// the three amounts that are still ahead, as one bar
function aheadBar(m){const it=[[L("Credit cards","כרטיסי אשראי"),m.cardLeft,"c1"],[L("Bills","חשבונות"),m.billsTot,"c2"],[L("Budgets","תקציבים"),m.limitsLeft,"c3"]].filter(x=>x[1]>=1),tot=it.reduce((s,x)=>s+x[1],0)||1;
 return `<div class="rkseg">${it.map(x=>`<i class="${x[2]}" style="flex:${x[1]/tot}"></i>`).join("")}</div><div class="rkleg">${it.map(x=>`<span><i class="${x[2]}"></i>${x[0]} <b>${mi(x[1])}</b></span>`).join("")}</div>`}

// a ring for a budget: how much of it is used
function ring(b){const r=27,c=2*Math.PI*r,p=Math.min(1,b.s/Math.max(1,b.lim));
 return `<div class="rkrg ${b.st=="over"?"o":"w"}"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" class="bg"/><circle cx="32" cy="32" r="${r}" class="fg" stroke-dasharray="${c*p} ${c}" transform="rotate(-90 32 32)"/></svg><b>${Math.round(b.s/Math.max(1,b.lim)*100)}%</b><span>${nm(b.k)}</span></div>`}

// the month's money: where it started, where it is, and where it could end
function pathChart(m){const W=600,Hh=110,px=18,top=14,bot=14,xs=[px,px+(W-2*px)*Math.min(1,Math.max(.05,m.day/m.dim)),W-px];
 const vals=[isFinite(m.start)?m.start:m.cash,m.cash,m.end],lo=Math.min(...vals),hi=Math.max(...vals),span=Math.max(1,hi-lo),Y=v=>Hh-bot-(v-lo)/span*(Hh-top-bot);
 const ys=vals.map(Y),a=`${xs[0]},${ys[0]} ${xs[1]},${ys[1]}`;
 return `<svg class="rkv path" viewBox="0 0 ${W} ${Hh}" aria-hidden="true"><defs><linearGradient id="rkg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".28"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs><line x1="${px}" x2="${W-px}" y1="${Hh-bot+8}" y2="${Hh-bot+8}" class="ax"/><polygon points="${xs[0]},${Hh-bot+8} ${a} ${xs[1]},${Hh-bot+8}" fill="url(#rkg)"/><polyline points="${a}" class="ln"/><polyline points="${xs[1]},${ys[1]} ${xs[2]},${ys[2]}" class="ln d"/><circle cx="${xs[0]}" cy="${ys[0]}" r="5" class="dt"/><circle cx="${xs[1]}" cy="${ys[1]}" r="7" class="dn"/><circle cx="${xs[2]}" cy="${ys[2]}" r="5" class="dt e"/></svg><div class="rkpl"><div><span>${L("Start","התחלה")}</span><b>${mi(vals[0])}</b></div><div><span>${L("Now","עכשיו")}</span><b>${mi(vals[1])}</b></div><div><span>${L("End","סוף")}</span><b>${mi(vals[2])}</b></div></div>`}

/* ---------- the parts of the page ---------- */
function hero(m){const name=(P().name||"").trim(),mon=mname(MK);
 const hi=name?L("Hi "+esc(name),"היי "+esc(name)):L("Hello","שלום");
 const lead={start:L(`Here is how ${mon} is beginning`,`כך ${mon} מתחיל`),mid:L(`Here is your ${mon} so far`,`הנה ${mon} שלכם עד עכשיו`),end:L(`${mon} is almost over`,`${mon} כמעט נגמר`)}[m.phase];
 return `<section class="rkh"><h2>${hi}</h2><p>${lead}</p>${dayScale(m)}</section>`}

function inPart(m){
 if(!m.sal)return part("in","tp",L("What came in","מה נכנס"),"tx",mn(0),L("Nothing has come in yet this month.","עוד לא נכנס כלום החודש."));
 const rest=m.inc-m.sal.a,n=m.incs.length-1;
 let line=L(`Paid in on ${dlong(rdOf(m.sal))} · ${nm(m.sal.desc)}`,`נכנס ב‑${dlong(rdOf(m.sal))} · ${nm(m.sal.desc)}`);
 if(n>0&&rest>=1)line+=`<br>${L(`and ${mi(rest)} more from ${pl(n,"1 other payment","{} other payments","","")}`,`ועוד ${mi(rest)} מ‑${pl(n,"","","תשלום נוסף אחד","{} תשלומים נוספים")}`)}`;
 return part("in","tp",L("What came in","מה נכנס"),"tx",mn(m.sal.a),line)}

function outPart(m){
 let line="",d=m.same-m.ex;
 if(m.same>=100&&m.ex>=100){
  if(Math.abs(d)<Math.max(100,m.same*.08))line=chip("flat",L("About the same as last month so far","בערך כמו בחודש שעבר עד עכשיו"));
  else if(d>0)line=chip("down",L(`${mi(d)} less than at this point last month`,`${mi(d)} פחות מאשר בנקודה הזאת בחודש שעבר`),"good");
  else line=chip("up",L(`${mi(-d)} more than at this point last month`,`${mi(-d)} יותר מאשר בנקודה הזאת בחודש שעבר`),"warn")}
 // one more thing worth saying, chosen by what stands out right now
 let pulse="";const tr=m.w1-m.w0;
 if(m.w0>=150&&Math.abs(tr)>=Math.max(100,m.w0*.25))pulse=tr<0?chip("down",L("The last 7 days were calmer than the 7 before","7 הימים האחרונים היו רגועים יותר מ‑7 הימים שלפניהם"),"good"):chip("up",L("The last 7 days were busier than the 7 before","7 הימים האחרונים היו עמוסים יותר מ‑7 הימים שלפניהם"),"warn");
 else if(m.below[0])pulse=chip("down",L(`${nm(m.below[0].k)} is well below its usual`,`${nm(m.below[0].k)} נמוך בהרבה מהרגיל`),"good");
 else if(m.above[0])pulse=chip("up",L(`${nm(m.above[0].k)} is already above a usual month`,`${nm(m.above[0].k)} כבר מעל חודש רגיל`),"warn");
 return part("out","tn",L("Spent so far","הוצאות עד עכשיו"),"tx",mn(m.ex),line+pulse,dayBars(m))}

function aheadPart(m){const tot=m.cardLeft+m.billsTot+m.limitsLeft;if(tot<1)return"";
 let line="";if(m.nextUp)line=L(`Next up: ${nm(m.nextUp.n)} ${mi(m.nextUp.pred)} · ${dday(m.nextUp.nx.toISOString())} ${dshort(m.nextUp.nx.toISOString())}`,`הבא בתור: ${nm(m.nextUp.n)} ${mi(m.nextUp.pred)} · ${dday(m.nextUp.nx.toISOString())} ${dshort(m.nextUp.nx.toISOString())}`);
 return part("ahead","",L("Still ahead this month","עוד לפניכם החודש"),"bills",mn(tot),line,aheadBar(m))}

function budgetsPart(m){const flag=[...m.over,...m.risk];
 if(!flag.length){if(!m.okB.length)return"";return part("check","tp",L("Budgets","תקציבים"),"budg",`<span class="rkw">${L("All on track","הכול בדרך הנכונה")}</span>`,L(`${pl(m.okB.length,"1 budget is within its limit","{} budgets are within their limits","","")}`,`${pl(m.okB.length,"","","תקציב אחד נמצא","{} תקציבים נמצאים")} במסגרת`))}
 return part("pie",m.over.length?"tn":"tw",L("Budgets","תקציבים"),"budg",`<span class="rkw">${L(`${pl(flag.length,"1 needs","{} need","","")} attention`,`${pl(flag.length,"","","אחד דורש","{} דורשים")} תשומת לב`)}</span>`,"",`<div class="rkrgs">${flag.slice(0,3).map(ring).join("")}</div>`)}

function endPart(m){
 const hasStart=isFinite(m.start)&&Math.abs(m.start)>=1,d=m.end-m.start;
 let line=L(`could be in your accounts at the end of ${mname(MK)}, if no more money comes in`,`יכול להיות בחשבונות בסוף ${mname(MK)}, אם לא ייכנס עוד כסף`);
 if(hasStart&&Math.abs(d)>=100)line+=`<br>${d>=0?L(`${mi(d)} more than you started with`,`${mi(d)} יותר ממה שהתחלתם איתו`):L(`${mi(-d)} less than you started with`,`${mi(-d)} פחות ממה שהתחלתם איתו`)}`;
 if(m.phase=="end")line+=`<br>${L(`${mname(m.nmk)} starts with about ${mi(m.nextBills+m.cardsU)} already on its way out`,`${mname(m.nmk)} מתחיל כשכבר ${mi(m.nextBills+m.cardsU)} בדרך החוצה`)}`;
 return part("path",m.end<0?"tn":"",L("Where this is heading","לאן זה הולך"),"fc",`<span class="rkw">≈</span> ${mn(m.end)}`,line,pathChart(m))}

window.renderRecap=function(){const el=$("recap");if(!el)return;
 if(!S.tx.length){el.innerHTML=`<div class="rkw0" data-nt><section class="rkh"><h2>${L("Nothing to recap yet","עוד אין מה לסכם")}</h2><p>${L("Once your accounts are connected or you add a few transactions, this page will tell you how your month is going.","אחרי שתחברו חשבונות או תוסיפו כמה תנועות, הדף הזה יספר לכם איך החודש מתקדם.")}</p></section></div>`;return}
 const m=model();
 const order=m.phase=="start"?[hero,inPart,aheadPart,outPart,budgetsPart,endPart]:m.phase=="end"?[hero,outPart,budgetsPart,aheadPart,inPart,endPart]:[hero,inPart,outPart,aheadPart,budgetsPart,endPart];
 el.innerHTML=`<div class="rkw0" data-nt>${order.map(fn=>{try{return fn(m)}catch(e){return""}}).join("")}</div>`};
})();
