/* Recap: a calm, polished page that tells you how the current month is going. Few words, big numbers, one small picture for each part.
   Every part fades in as you scroll to it and its picture animates to where it stands. Every part appears only when it is true for you right now,
   and the order depends on where you are in the month. Everything is worked out here from the data the app already has; nothing is sent anywhere.
   Texts are written in English and in Hebrew side by side. */
(function(){
const H=()=>!!(window.HE&&HE.on);
const L=(en,he)=>H()?he:en;
const P=()=>(S.cfg&&S.cfg.profile)||{};
const REDUCE=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
// a big number that counts up when it comes into view
const mn=n=>`<bdi class="rkc">${n<0?"−":""}<small>₪</small><span class="cnt" data-v="${Math.round(Math.abs(n))}">${f(Math.abs(n))}</span></bdi>`;
const mi=n=>`<bdi class="rkc">${n<0?"−":""}₪${f(Math.abs(n))}</bdi>`;
const nm=t=>`<bdi>${esc(t)}</bdi>`;
const loc=()=>H()?"he-IL":"en-GB";
const dobj=d=>new Date(String(d).slice(0,10)+"T12:00:00");
const dlong=d=>dobj(d).toLocaleDateString(loc(),{day:"numeric",month:"long"});
const dshort=d=>dobj(d).toLocaleDateString(loc(),{day:"numeric",month:"short"});
const dday=d=>dobj(d).toLocaleDateString(loc(),{weekday:"short"});
const dfull=d=>dobj(d).toLocaleDateString(loc(),{weekday:"long",day:"numeric",month:"long"});
const mname=k=>new Date(+k.slice(0,4),+k.slice(5,7)-1,1).toLocaleDateString(loc(),{month:"long"});
const pl=(n,en1,enN,he1,heN)=>H()?(n==1?he1:heN.replace("{}",n)):(n==1?en1:enN.replace("{}",n));
const ICON={
 flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
 in:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
 out:'<path d="M12 20V9M7 13l5-5 5 5M5 4h14"/>',
 wallet:'<path d="M3 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2.5-3H16M16 13.5h2.5"/>',
 ahead:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14.5h3"/>',
 pie:'<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6.4 4.6"/>',
 check:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16.5 9.5"/>',
 path:'<path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
 up:'<path d="M6 15l6-6 6 6"/>',down:'<path d="M6 9l6 6 6-6"/>',flat:'<path d="M5 12h14"/>'
};
const tile=(ic,tone)=>`<div class="rki ${tone||""}"><svg viewBox="0 0 24 24">${ICON[ic]}</svg></div>`;
// one part of the page, in the middle of the page: a big icon, a small label (which opens the full page, filtered), a big number, a short line, and a picture
let ZZ=0;
const hue=i=>(i*43)%300,hc=i=>`hsl(${hue(i)} 82% 56%)`;
const part=(ic,tone,label,go,big,line,vis)=>{const lab=go?`<a class="rkl" data-a="recapGo" data-k="${go}">${label}<i>${H()?"←":"→"}</i></a>`:`<span class="rkl">${label}</span>`;
 if(ZZ){const a=ZZ%2,c0=hc(ZZ-1),c1=hc(ZZ),gid="rkg"+ZZ,x0=a?52:128,x1=a?128:52;
  return `<section class="rk rr z ${a?"za":"zb"}" style="--c0:${c0};--c1:${c1}"><div class="rkni"><div class="rkcir">${tile(ic,tone)}</div><svg class="rkcn cs" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs><path d="M${x0} 0C${x0} 60 ${x1} 40 ${x1} 100" pathLength="1" stroke="url(#${gid})"/></svg><svg class="rkcn cm" viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true"><path d="M5 0V100" pathLength="1" stroke="${c0}"/></svg></div><div class="rkb"><div class="rkx">${lab}<div class="rkn">${big}</div>${line?`<div class="rkp">${line}</div>`:""}</div>${vis?`<div class="rkvv">${vis}</div>`:""}</div></section>`}
 return `<section class="rk rr ${tone||""}">${tile(ic,tone)}${lab}<div class="rkn">${big}</div>${line?`<div class="rkp">${line}</div>`:""}${vis||""}</section>`};
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
 // what happened on each day of the month (and what is planned for the days to come)
 const days=Array.from({length:dim},(_,i)=>({d:MK+"-"+p2(i+1),spent:0,inc:0,ex:[],inn:[],up:[]}));
 A().forEach(t=>{const r=rdOf(t);if(!r.startsWith(MK))return;const i=+r.slice(8)-1;if(i<0||i>=dim)return;const D=days[i];if(t.a<0){D.spent-=t.a;D.ex.push([t.desc,-t.a])}else if(!t.pending){D.inc+=t.a;D.inn.push([t.desc,t.a])}});
 BI.filter(b=>!b.once&&!b.irregular&&b.flag!="canceled"&&b.nx&&b.nx.toISOString().slice(0,7)==MK&&b.nx.toISOString().slice(0,10)>=TODAY).forEach(b=>{const i=b.nx.getDate()-1;if(days[i])days[i].up.push([b.n,b.pred])});
 const nextBills=BI.filter(b=>!b.once&&!b.irregular&&b.flag!="canceled"&&b.nx&&b.nx.toISOString().slice(0,7)==nmk).reduce((s,b)=>s+b.pred,0);
 const nextUp=BI.filter(b=>!b.once&&!b.irregular&&b.flag!="canceled"&&b.nx&&b.nx>NOW).sort((a,b)=>a.nx-b.nx)[0]||null;
 const phase=day<=5?"start":dim-day<=6?"end":"mid";
 return{day,dim,pm,nmk,cash,inc,ex,cardsU,cardsPrev,cardPaid,cardLeft,same,incs,sal,bills,billsTot,limitsLeft,end,start,over,risk,okB,above,below,w1,w0,days,nextBills,nextUp,phase,inJars:F.inJars,buffer:F.buffer}}

/* ---------- the small pictures ---------- */
// the month as a row of days. Hover a day to see what happened, click it to open that day in Activity.
function dayScale(m){let t="";for(let d=1;d<=m.dim;d++)t+=`<i class="${d<m.day?"p":d==m.day?"n":""}" data-d="${d}" role="button" tabindex="0" aria-label="${dfull(MK+"-"+p2(d))}" style="--i:${d}"></i>`;
 return `<div class="rkds"><div class="rkdt">${t}</div><div class="rkdl"><span>${L(`Day ${m.day} of ${m.dim}`,`יום ${m.day} מתוך ${m.dim}`)}</span><span>${m.dim-m.day>0?pl(m.dim-m.day,"1 day left","{} days left","נשאר יום אחד","נשארו {} ימים"):L("Last day of the month","היום האחרון בחודש")}</span></div><div class="rktip" hidden></div></div>`}

// one bar for each day so far
function dayBars(m){const W=600,Hh=96,gap=4,n=m.dim,bw=(W-gap*(n-1))/n,v0=m.days.slice(0,m.day).map(d=>d.spent),sd=[...v0].sort((a,b)=>b-a),mx=Math.max(1,sd[0]>sd[1]*2.2?sd[1]*1.3:sd[0]||1);let s="";
 for(let i=0;i<n;i++){const x=i*(bw+gap);
  if(i<m.day){const v=v0[i]||0,h=Math.min(Hh,Math.max(v>0?5:2,v/mx*(Hh-6)));s+=`<rect x="${x}" y="${Hh-h}" width="${bw}" height="${h}" rx="${Math.min(4,bw/2)}" class="${i==m.day-1?"t":"b"} gr" style="--i:${i}"/>`}
  else s+=`<rect x="${x}" y="${Hh-2}" width="${bw}" height="2" rx="1" class="f"/>`}
 return `<div class="rkbw"><svg class="rkv bars" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" role="img" aria-label="${L("Spending for each day of the month","ההוצאות בכל יום בחודש")}">${s}</svg><div class="rktip" hidden></div></div>`}

// amounts as one bar with a legend
const segBar=it=>{it=it.filter(x=>x[1]>=1);const tot=it.reduce((s,x)=>s+x[1],0)||1;
 return `<div class="rkseg">${it.map((x,i)=>`<i class="${x[2]}" style="flex:${x[1]/tot};--i:${i}"></i>`).join("")}</div><div class="rkleg">${it.map(x=>`<span><i class="${x[2]}"></i>${x[0]} <b>${mi(x[1])}</b></span>`).join("")}</div>`};
const nowBar=m=>{const set=Math.min(m.cash,m.inJars+m.buffer),free=Math.max(0,m.cash-set);return segBar([[L("Set aside in jars","שמור בקופות"),set,"c4"],[L("Free to use","פנוי לשימוש"),free,"c5"]])};
const aheadBar=m=>segBar([[L("Credit cards","כרטיסי אשראי"),m.cardLeft,"c1"],[L("Bills","חשבונות"),m.billsTot,"c2"],[L("Budgets","תקציבים"),m.limitsLeft,"c3"]]);

// a ring for a budget: how much of it is used
function ring(b,i){const r=27,c=2*Math.PI*r,p=Math.min(1,b.s/Math.max(1,b.lim));
 return `<div class="rkrg ${b.st=="over"?"o":"w"}" style="--i:${i}"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" class="bg"/><circle cx="32" cy="32" r="${r}" class="fg" style="--d:${(c*p).toFixed(1)};--c:${c.toFixed(1)}" transform="rotate(-90 32 32)"/></svg><b>${Math.round(b.s/Math.max(1,b.lim)*100)}%</b><span>${nm(b.k)}</span></div>`}

// the month's money: where it started, where it is, and where it could end
function pathChart(m){const W=600,Hh=110,px=18,top=14,bot=14,xs=[px,px+(W-2*px)*Math.min(1,Math.max(.05,m.day/m.dim)),W-px];
 const vals=[isFinite(m.start)?m.start:m.cash,m.cash,m.end],lo=Math.min(...vals),hi=Math.max(...vals),span=Math.max(1,hi-lo),Y=v=>Hh-bot-(v-lo)/span*(Hh-top-bot);
 const ys=vals.map(Y),a=`${xs[0]},${ys[0]} ${xs[1]},${ys[1]}`;
 return `<svg class="rkv path" viewBox="0 0 ${W} ${Hh}" aria-hidden="true"><defs><linearGradient id="rkg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".28"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs><line x1="${px}" x2="${W-px}" y1="${Hh-bot+8}" y2="${Hh-bot+8}" class="ax"/><polygon points="${xs[0]},${Hh-bot+8} ${a} ${xs[1]},${Hh-bot+8}" fill="url(#rkg)" class="ar"/><polyline points="${a}" class="ln" pathLength="1"/><polyline points="${xs[1]},${ys[1]} ${xs[2]},${ys[2]}" class="ln d"/><circle cx="${xs[0]}" cy="${ys[0]}" r="5" class="dt"/><circle cx="${xs[1]}" cy="${ys[1]}" r="7" class="dn"/><circle cx="${xs[2]}" cy="${ys[2]}" r="5" class="dt e"/></svg><div class="rkpl"><div><span>${L("Start","התחלה")}</span><b>${mi(vals[0])}</b></div><div><span>${L("Now","עכשיו")}</span><b>${mi(vals[1])}</b></div><div><span>${L("End","סוף")}</span><b>${mi(vals[2])}</b></div></div>`}

/* ---------- the parts of the page ---------- */
function hero(m){const name=(P().name||"").trim(),mon=mname(MK);
 let hi;try{const g=greeting();hi=esc(g.text).replace("{n}","<bdi>"+esc(g.name)+"</bdi>")}catch(e){hi=name?L("Hi "+esc(name),"היי "+esc(name)):L("Hello","שלום")}
 const lead={start:L(`Here is how ${mon} is beginning, step by step`,`כך ${mon} מתחיל, צעד אחרי צעד`),mid:L(`Here is how ${mon} has gone so far, step by step`,`כך ${mon} עבר עליכם עד עכשיו, צעד אחרי צעד`),end:L(`${mon} is almost over. Here is how it went`,`${mon} כמעט נגמר. כך הוא עבר עליכם`)}[m.phase];
 return `<section class="rkh rr"><h2>${hi}</h2><p>${lead}</p>${dayScale(m)}</section>`}

// three amounts side by side: where it was, what was added, where it got to
const eq=(a,b,c)=>`<div class="rkeq">${[a,"+",b,"=",c].map(x=>typeof x=="string"?`<i>${x}</i>`:`<div><span>${x[0]}</span><b>${mi(x[1])}</b></div>`).join("")}</div>`;

function startPart(m){if(!(isFinite(m.start)&&Math.abs(m.start)>=1))return"";const d=m.cash-m.start,mon=mname(MK);
 const line=Math.abs(d)>=100?chip(d>=0?"up":"down",d>=0?L(`Today you have ${mi(d)} more than that`,`היום יש לכם ${mi(d)} יותר מזה`):L(`Today you have ${mi(-d)} less than that`,`היום יש לכם ${mi(-d)} פחות מזה`),d>=0?"good":"warn"):"";
 return part("flag","",L(`You began ${mon} with`,`התחלתם את ${mon} עם`),"",`<span class="rkw">≈</span>${mn(m.start)}`,L(`That is roughly what was in your accounts on ${dlong(MK+"-01")}.`,`זה בערך מה שהיה בחשבונות ב‑${dlong(MK+"-01")}.`)+(line?`<br>${line}`:""))}

function inPart(m){
 if(!m.sal)return part("in","tp",L("So far, you received","עד עכשיו קיבלתם"),"in",mn(0),L("Nothing has come in yet this month.","עוד לא נכנס כסף החודש."));
 const rest=m.inc-m.sal.a,n=m.incs.length-1,ok=isFinite(m.start)&&Math.abs(m.start)>=1;
 let line=n>0&&rest>=1
  ?L(`The biggest payment was ${mi(m.sal.a)} from ${nm(m.sal.desc)}, on ${dlong(rdOf(m.sal))}. ${pl(n,"1 other payment","{} other payments","","")} added another ${mi(rest)}.`,`התשלום הגדול היה ${mi(m.sal.a)} מ‑${nm(m.sal.desc)}, ב‑${dlong(rdOf(m.sal))}. ${pl(n,"","","תשלום נוסף אחד","{} תשלומים נוספים")} הוסיפו עוד ${mi(rest)}.`)
  :L(`You were paid by ${nm(m.sal.desc)} on ${dlong(rdOf(m.sal))}.`,`קיבלתם תשלום מ‑${nm(m.sal.desc)} ב‑${dlong(rdOf(m.sal))}.`);
 if(ok)line+=`<br>${L(`That took your accounts up to about ${mi(m.start+m.inc)}.`,`זה העלה את החשבונות לכ‑${mi(m.start+m.inc)}.`)}`;
 return part("in","tp",L("Then, you received","אחר כך קיבלתם"),"in",mn(m.inc),line,ok?eq([L("Started with","התחלתם עם"),m.start],[L("Came in","נכנס"),m.inc],[L("Brought it to","הגיע ל‑"),m.start+m.inc]):"")}

function outPart(m){
 let line="",d=m.same-m.ex;
 if(m.same>=100&&m.ex>=100){
  if(Math.abs(d)<Math.max(100,m.same*.08))line=chip("flat",L("You have spent about the same as you had by this day last month","הוצאתם בערך כמו שהוצאתם עד היום הזה בחודש שעבר"));
  else if(d>0)line=chip("down",L(`You have spent ${mi(d)} less than you had by this day last month`,`הוצאתם ${mi(d)} פחות מאשר עד היום הזה בחודש שעבר`),"good");
  else line=chip("up",L(`You have spent ${mi(-d)} more than you had by this day last month`,`הוצאתם ${mi(-d)} יותר מאשר עד היום הזה בחודש שעבר`),"warn")}
 let pulse="";const tr=m.w1-m.w0;
 if(m.w0>=150&&Math.abs(tr)>=Math.max(100,m.w0*.25))pulse=tr<0?chip("down",L("The last 7 days were calmer than the 7 before","7 הימים האחרונים היו רגועים יותר מ‑7 הימים שלפניהם"),"good"):chip("up",L("The last 7 days were busier than the 7 before","7 הימים האחרונים היו עמוסים יותר מ‑7 הימים שלפניהם"),"warn");
 else if(m.below[0])pulse=chip("down",L(`${nm(m.below[0].k)} is well below its usual`,`${nm(m.below[0].k)} נמוך בהרבה מהרגיל`),"good");
 else if(m.above[0])pulse=chip("up",L(`${nm(m.above[0].k)} is already above a usual month`,`${nm(m.above[0].k)} כבר מעל חודש רגיל`),"warn");
 const lead=L(`Each bar below is one day. Hover over a bar to see what you spent, and click it to open that day.`,`כל עמודה למטה היא יום אחד. עברו עם העכבר על עמודה כדי לראות מה הוצאתם, ולחצו כדי לפתוח את היום.`);
 return part("out","tn",L("Since then, you have spent","מאז הוצאתם"),"out",mn(m.ex),lead+line+pulse,dayBars(m))}

function nowPart(m){const set=Math.min(m.cash,m.inJars+m.buffer),free=Math.max(0,m.cash-set);
 return part("wallet","",L("After all that, you have","אחרי כל זה יש לכם"),"now",mn(m.cash),L("in your bank and wallet accounts today.","בחשבונות הבנק והארנקים היום."),nowBar(m))}

// the next payments, each with its date
function upList(m){const it=[];m.days.forEach(D=>D.up.forEach(x=>{if(D.d>=TODAY)it.push([D.d,x[0],x[1]])}));
 if(!it.length)return"";return `<div class="rkup"><div class="t">${L("Coming up next","הבא בתור")}</div>${it.slice(0,3).map(x=>`<div class="r"><div class="dt"><b>${+x[0].slice(8)}</b><span>${dshort(x[0]).replace(/[0-9\s]/g,"")}</span></div><div class="n">${nm(x[1])}<small>${dday(x[0])}</small></div><b class="a">${mi(x[2])}</b></div>`).join("")}</div>`}
function aheadPart(m){const tot=m.cardLeft+m.billsTot+m.limitsLeft;if(tot<1)return"";
 const left=m.cash-tot,rest=left>=0?chip("up",L(`You would have about ${mi(left)} left once you have paid these`,`יישארו לכם בערך ${mi(left)} אחרי ששילמתם אותם`),"good"):chip("down",L(`That is ${mi(-left)} more than you have in your accounts today`,`זה ${mi(-left)} יותר ממה שיש לכם היום בחשבונות`),"warn");
 return part("ahead","",L("You still have to pay","עוד תצטרכו לשלם"),"ahead",mn(tot),L("That is your credit card charges, your bills and the rest of your budgets.","אלה חיובי האשראי, החשבונות והחלק שנשאר מהתקציבים שלכם.")+rest,aheadBar(m)+upList(m))}

// why a budget needs attention, with a bar showing how much is used (and where it is heading)
function budRow(b){const lim=Math.max(1,b.lim),u=Math.min(100,b.s/lim*100),pc=Math.min(100,b.pace/lim*100);
 const why=b.st=="over"?L(`Over its limit by ${mi(b.s-b.lim)}: ${mi(b.s)} spent of ${mi(b.lim)}.`,`חרג מהמסגרת ב‑${mi(b.s-b.lim)}: הוצאתם ${mi(b.s)} מתוך ${mi(b.lim)}.`)
  :b.st=="warn"?L(`${Math.round(b.pc)}% used: ${mi(b.s)} of ${mi(b.lim)}, with ${mi(Math.max(0,b.lim-b.s))} left.`,`נוצלו ${Math.round(b.pc)}%: ${mi(b.s)} מתוך ${mi(b.lim)}, נשארו ${mi(Math.max(0,b.lim-b.s))}.`)
  :L(`At this pace it will reach about ${mi(b.pace)}, which is ${mi(b.pace-b.lim)} over its ${mi(b.lim)} limit.`,`בקצב הזה יגיע לכ‑${mi(b.pace)}, כלומר ${mi(b.pace-b.lim)} מעל המסגרת של ${mi(b.lim)}.`);
 return `<div class="rkbr ${b.st=="over"?"o":"w"}"><div class="h"><b>${nm(b.k)}</b><span>${b.st=="over"?L("Over","חריגה"):b.st=="warn"?L("Almost full","כמעט מלא"):L("Heading over","בדרך לחריגה")}</span></div><div class="bar"><i style="width:${u.toFixed(1)}%"></i>${b.st=="pace"?`<em style="inset-inline-start:${pc.toFixed(1)}%"></em>`:""}</div><p>${why}</p></div>`}
function budgetsPart(m){const flag=[...m.over,...m.risk];
 if(!flag.length){if(!m.okB.length)return"";return part("check","tp",L("Your budgets are","התקציבים שלכם"),"budg",`<span class="rkw">${L("On track","בדרך הנכונה")}</span>`,L(`${pl(m.okB.length,"Your 1 budget is within its limit.","All {} budgets are within their limits.","","")}`,`${pl(m.okB.length,"","","התקציב שלכם נמצא במסגרת.","כל {} התקציבים נמצאים במסגרת.")}`))}
 return part("pie",m.over.length?"tn":"tw",L("Your budgets","התקציבים שלכם"),"budg",`<span class="rkw">${L(`${pl(flag.length,"1 needs","{} need","","")} attention`,`${pl(flag.length,"","","אחד דורש","{} דורשים")} תשומת לב`)}</span>`,L("Here is why:","הנה הסיבה:"),`<div class="rkbl">${flag.slice(0,4).map(budRow).join("")}</div>`)}

function endPart(m){
 const hasStart=isFinite(m.start)&&Math.abs(m.start)>=1,d=m.end-m.start,mon=mname(MK);
 let line=L(`This is what you would be left with if you pay everything that is still due (bills and credit card charges) and spend the rest of your budgets in full.`,`זה מה שיישאר לכם אם תשלמו את כל מה שעוד צפוי (חשבונות וחיובי אשראי) ותנצלו במלואו את מה שנשאר מהתקציבים.`);
 if(hasStart&&Math.abs(d)>=100)line+=chip(d>=0?"up":"down",d>=0?L(`${mi(d)} more than you started with`,`${mi(d)} יותר ממה שהתחלתם איתו`):L(`${mi(-d)} less than you started with`,`${mi(-d)} פחות ממה שהתחלתם איתו`),d>=0?"good":"warn");
 if(m.phase=="end")line+=chip("flat",L(`${mname(m.nmk)} will begin with about ${mi(m.nextBills+m.cardsU)} already on its way out`,`${mname(m.nmk)} יתחיל כשכבר כ‑${mi(m.nextBills+m.cardsU)} בדרך החוצה`));
 return part("path",m.end<0?"tn":"",L(`Predicted end of ${mon}`,`סיום חזוי של ${mon}`),"end",`<span class="rkw">≈</span>${mn(m.end)}`,line,pathChart(m))}

/* ---------- opening the matching page, filtered ---------- */
window.recapGo=function(k){const last=MK+"-"+p2(DIM);
 if(k=="in")goActivity({from:MK+"-01",to:last,ty:"income"});
 else if(k=="out")goActivity({from:MK+"-01",to:last,ty:"expense"});
 else if(k=="ahead")goActivity({from:TODAY,to:last});
 else if(k=="now")nav("acc");
 else if(k=="budg")nav("budg");
 else if(k=="end")nav("fc");
 else if(/^\d{4}-\d{2}-\d{2}$/.test(k))goActivity({from:k,to:k})};

/* ---------- the tooltip of a day ---------- */
function dayTip(D,future,today){const row=(a,b)=>`<div class="r"><span>${nm(a)}</span><b>${mi(b)}</b></div>`,top=L0=>[...L0].sort((x,y)=>y[1]-x[1]).slice(0,3).map(x=>row(x[0],x[1])).join("");
 let b=`<div class="h">${dfull(D.d)}${today?` · ${L("today","היום")}`:""}</div>`;
 if(D.inc>0)b+=`<div class="s pos">${L("Came in","נכנס")} <b>${mi(D.inc)}</b></div>`+top(D.inn);
 if(D.spent>0)b+=`<div class="s neg">${L("Spent","הוצאות")} <b>${mi(D.spent)}</b></div>`+top(D.ex)+(D.ex.length>3?`<div class="m">${L(`and ${D.ex.length-3} more`,`ועוד ${D.ex.length-3}`)}</div>`:"");
 if(D.up.length)b+=`<div class="s">${L("Expected","צפוי")}</div>`+D.up.map(x=>row(x[0],x[1])).join("");
 if(D.inc<=0&&D.spent<=0&&!D.up.length)b+=`<div class="m">${future?L("Nothing planned","אין תוכנית"):L("Nothing happened","לא קרה כלום")}</div>`;
 return b+`<div class="m o">${L("Click to open this day","לחצו לפתיחת היום")}</div>`}
function wireDays(el,m){const sc=el.querySelector(".rkds"),tip=sc&&sc.querySelector(".rktip");if(!tip)return;let cur=0;
 const show=i=>{const D=m.days[i-1],t=sc.querySelector(`.rkdt i[data-d="${i}"]`);if(!D||!t)return;const a=sc.getBoundingClientRect(),r=t.getBoundingClientRect();
  tip.innerHTML=dayTip(D,i>m.day,i==m.day);tip.hidden=false;cur=i;
  const w=tip.offsetWidth,x=r.left+r.width/2-a.left;tip.style.left=Math.max(0,Math.min(a.width-w,x-w/2))+"px";tip.style.bottom=(a.bottom-r.top+14)+"px"};
 const hide=()=>{tip.hidden=true;cur=0};
 sc.querySelectorAll(".rkdt i").forEach(t=>{const i=+t.dataset.d;
  t.addEventListener("mouseenter",()=>show(i));t.addEventListener("focus",()=>show(i));t.addEventListener("blur",hide);
  t.addEventListener("click",e=>{if(e.pointerType==="touch"&&cur!==i){show(i);return}window.recapGo(MK+"-"+p2(i))});
  t.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();window.recapGo(MK+"-"+p2(i))}})});
 sc.addEventListener("mouseleave",hide);
 document.addEventListener("pointerdown",function g(e){if(!document.body.contains(sc)){document.removeEventListener("pointerdown",g);return}if(!sc.contains(e.target))hide()})}

function wireBars(el,m){const w=el.querySelector(".rkbw");if(!w)return;const svg=w.querySelector("svg"),tip=w.querySelector(".rktip"),n=m.dim;let cur=0;
 const idx=e=>{const r=svg.getBoundingClientRect();return Math.max(1,Math.min(n,Math.floor((H()?1-(e.clientX-r.left)/r.width:(e.clientX-r.left)/r.width)*n)+1))};
 const show=i=>{const D=m.days[i-1];if(!D)return;svg.querySelectorAll("rect").forEach((x,k)=>x.classList.toggle("hv",k==i-1));
  tip.innerHTML=dayTip(D,i>m.day,i==m.day);tip.hidden=false;cur=i;
  const a=w.getBoundingClientRect(),r=svg.getBoundingClientRect(),fr=H()?n-i+.5:i-.5,cx=r.left+fr/n*r.width-a.left,tw=tip.offsetWidth;
  tip.style.left=Math.max(0,Math.min(a.width-tw,cx-tw/2))+"px";tip.style.bottom=(a.bottom-r.top+10)+"px"};
 const hide=()=>{tip.hidden=true;cur=0;svg.querySelectorAll("rect.hv").forEach(x=>x.classList.remove("hv"))};
 svg.addEventListener("mousemove",e=>show(idx(e)));svg.addEventListener("mouseleave",hide);
 svg.addEventListener("click",e=>{const i=idx(e);if(e.pointerType==="touch"&&cur!==i){show(i);return}window.recapGo(MK+"-"+p2(i))});
 document.addEventListener("pointerdown",function g(e){if(!document.body.contains(w)){document.removeEventListener("pointerdown",g);return}if(!w.contains(e.target))hide()})}

/* ---------- fading in and animating as it comes into view ---------- */
let IO=null,CUR=null,RO=null,BOUND=false;
function countUp(el){const to=+el.dataset.v||0;if(!to||REDUCE())return;const t0=performance.now(),D=1100;el.textContent="0";
 (function step(now){const k=Math.min(1,(now-t0)/D),e=1-Math.pow(1-k,3);el.textContent=f(Math.round(to*e));if(k<1&&document.body.contains(el))requestAnimationFrame(step);else el.textContent=f(to)})(t0)}
const showIn=(x,animate)=>{if(x.classList.contains("in"))return;x.classList.add("in");if(!animate){x.classList.add("st");return}setTimeout(()=>x.querySelectorAll(".cnt").forEach(countUp),450)};
// the title and the first part fade in as they come into view
function reveal(box,animate){if(IO){IO.disconnect();IO=null}
 const items=[...box.querySelectorAll(".rr:not(.z):not(.zend)")];
 if(!animate||REDUCE()||!("IntersectionObserver" in window)){items.forEach(x=>showIn(x,false));return}
 IO=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;showIn(e.target,true);IO.unobserve(e.target)}),{threshold:.3,rootMargin:"0px 0px -18% 0px"});
 items.forEach(x=>IO.observe(x))}

// the path is drawn as you scroll: its tip stays near the bottom of the screen, and each part fades in when the path reaches it.
// Parts that scroll away off the top shrink a little.
const SVGNS="http://www.w3.org/2000/svg";
function frame(){const s=CUR;if(!s||!s.el.isConnected||!s.el.getClientRects().length)return;const el=s.el,vh=innerHeight,head=scrollY+vh*.86,anim=s.animate&&!REDUCE();
 const z=el.querySelector(".rkz");
 if(z){const zTop=z.getBoundingClientRect().top+scrollY,rows=[...z.querySelectorAll(".rk.z")],end=z.querySelector(".zend");
  const cy=r=>{const n=r.querySelector(".rkni"),c=r.querySelector(".rkcir");return r.offsetTop+n.offsetTop+c.offsetTop+c.offsetHeight/2};
  const pts=rows.map(cy),endY=end&&end.querySelector(".rki")?end.offsetTop+end.querySelector(".rki").offsetTop:null;
  const draw=(svg,w,d,x0,x1,from)=>{if(!svg)return;const hh=Math.max(1,d),p=Math.max(0,Math.min(1,(head-(zTop+from))/hh));
   svg.setAttribute("viewBox",`0 0 ${w} ${hh}`);svg.style.height=d+"px";const pa=svg.querySelector("path");
   pa.setAttribute("d",x0==x1?`M${x0} 0V${hh}`:`M${x0} 0C${x0} ${hh*.5} ${x1} ${hh*.5} ${x1} ${hh}`);pa.style.strokeDashoffset=anim?String(1-p):"0"};
  rows.forEach((r,i)=>{const a=pts[i],b=i+1<rows.length?pts[i+1]:endY;
   const x0=r.classList.contains("za")?52:128,x1=i+1<rows.length?(rows[i+1].classList.contains("za")?52:128):90;
   r.classList.toggle("tozend",i+1==rows.length&&b!=null);
   if(b!=null){draw(r.querySelector(".rkcn.cs"),180,b-a,x0,x1,a);draw(r.querySelector(".rkcn.cm"),10,b-a,5,5,a)}
   if(head>=zTop+a)showIn(r,anim)});
  if(end&&endY!=null&&head>=zTop+endY)showIn(end,anim);
  // the start of the path comes down from the first part
  const st=el.querySelector(".rkw0>.rk:not(.z)"),ti=st&&st.querySelector(".rki");
  if(rows.length&&ti){let ld=z.querySelector(".rklead");if(!ld){ld=document.createElementNS(SVGNS,"svg");ld.setAttribute("class","rkcn rklead cs");ld.setAttribute("aria-hidden","true");ld.innerHTML='<path/>';z.insertBefore(ld,z.firstChild)}
   const tb=ti.getBoundingClientRect().bottom+scrollY-8,from=tb-zTop,a=pts[0],d=a-from,x1=rows[0].classList.contains("za")?52:128;
   ld.style.top=from+"px";ld.style.height=Math.max(0,d)+"px";ld.setAttribute("viewBox",`0 0 180 ${Math.max(1,d)}`);const pa=ld.querySelector("path");pa.setAttribute("d",`M90 0C90 ${d*.5} ${x1} ${d*.5} ${x1} ${d}`);
   const p=Math.max(0,Math.min(1,(head-tb)/Math.max(1,d)));pa.style.strokeDashoffset=anim?String(1-p):"0"}}
 if(!REDUCE()){const t0=vh*.4,sp=vh*.7;el.querySelectorAll(".rkh.rr,.rkw0>.rk.rr,.rk.z,.zend").forEach(x=>{const r=x.getBoundingClientRect(),c=(r.top+r.bottom)/2,t=Math.max(0,Math.min(1,(t0-c)/sp));x.style.setProperty("--sx",(1-.2*t).toFixed(3))})}}
let TICK=0;const kick=()=>{if(TICK)return;TICK=requestAnimationFrame(()=>{TICK=0;frame()})};
function wireLinks(el,animate){CUR={el,animate};if(RO){RO.disconnect();RO=null}
 if("ResizeObserver" in window){RO=new ResizeObserver(kick);RO.observe(el)}
 if(!BOUND){BOUND=true;addEventListener("scroll",kick,{passive:true});addEventListener("resize",kick)}
 frame();setTimeout(kick,300);setTimeout(kick,1200)}
let LASTSIG="",LASTAT=0;
window.renderRecap=function(){const el=$("recap");if(!el)return;
 let html,m=null;
 if(!S.tx.length){html=`<div class="rkw0" data-nt><section class="rkh rr"><h2>${L("Nothing to recap yet","עוד אין מה לסכם")}</h2><p>${L("Once your accounts are connected or you add a few transactions, this page will tell you how your month is going.","אחרי שתחברו חשבונות או תוסיפו כמה תנועות, הדף הזה יספר לכם איך החודש מתקדם.")}</p></section></div>`}
 else{m=model();
  const order=m.phase=="start"?[hero,startPart,inPart,nowPart,aheadPart,outPart,budgetsPart,endPart]:m.phase=="end"?[hero,startPart,inPart,outPart,budgetsPart,aheadPart,nowPart,endPart]:[hero,startPart,inPart,outPart,nowPart,aheadPart,budgetsPart,endPart];
  let zc=0,out=order.map((fn,i)=>{ZZ=i<2||i==order.length-1?0:zc+1;let h="";try{h=fn(m)}catch(e){}const zi=ZZ;ZZ=0;if(zi&&h)zc++;return h});
  const endH=out[out.length-1].replace('class="rk rr','class="rk rr zend'),chain=out.slice(2,-1).filter(Boolean).join("")+endH;
  html=`<div class="rkw0" data-nt>${out[0]}${out[1]}${chain?`<div class="rkz">${chain}</div>`:""}</div>`}
 // the same page again: leave it alone. A change while you are looking: update it quietly. Coming back to it later: play it again.
 if(html===LASTSIG&&el.firstChild){if(CUR&&CUR.el===el){setTimeout(kick,50);setTimeout(kick,400)}return}
 const fresh=Date.now()-LASTAT>2500||!el.firstChild;LASTSIG=html;LASTAT=Date.now();
 const y=scrollY;el.innerHTML=html;
 reveal(el,fresh);wireLinks(el,fresh);if(m){wireDays(el,m);wireBars(el,m)}if(!fresh)scrollTo(0,y)};
})();
