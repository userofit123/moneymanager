/* Recap: a calm, polished page that tells you how the current month is going. Few words, big numbers, one small picture for each part.
   Every part fades in as you scroll to it and its picture animates to where it stands. Every part appears only when it is true for you right now,
   and the order depends on where you are in the month. Everything is worked out here from the data the app already has; nothing is sent anywhere.
   Texts are written in English and in Hebrew side by side. */
(function(){
const H=()=>!!(window.HE&&HE.on);
const L=(en,he)=>H()?(window.HE&&HE.gen?HE.gen(he):he):en;
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
flag:'<path d="M4 22V15"/><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>',
 in:'<path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 16 6 6"/><circle cx="16" cy="9" r="2.9"/><circle cx="6" cy="5" r="3"/>',
 out:'<path d="M16 10a4 4 0 0 1-8 0"/><path d="M3.1 6h17.8"/><path d="M3.4 5.5a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.7a2 2 0 0 0-.4-1.2l-2-2.7A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/>',
 wallet:'<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
 ahead:'<path d="M16 14v2.2l1.6 1"/><path d="M16 2v4"/><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M3 10h5"/><path d="M8 2v4"/><circle cx="16" cy="16" r="6"/>',
 pie:'<path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"/><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>',
 check:'<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
 path:'<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
 good:'<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
 warn:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
 up:'<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',down:'<path d="M16 17h6v-6"/><path d="m22 17-8.5-8.5-5 5L2 7"/>',flat:'<path d="M5 12h14"/>'
};
const tile=(ic,tone)=>`<div class="rki ${tone||""}"><svg viewBox="0 0 24 24">${ICON[ic]}</svg></div>`;
// one part of the page, in the middle of the page: a big icon, a small label (which opens the full page, filtered), a big number, a short line, and a picture
let ZZ=0;
// the colours come from the chosen appearance (its chart palette, a little of the accent mixed in), so the page sits in the same atmosphere
const PCI={flag:0,in:4,out:1,wallet:3,ahead:2,pie:5,check:4,path:0};let PREV=0;
const pc=z=>z%2?"var(--acc2)":"var(--acc)";

const part=(ic,tone,label,go,big,line,vis)=>{const lab=go?`<a class="rkl" data-a="recapGo" data-k="${go}">${label}<i>${H()?"←":"→"}</i></a>`:`<span class="rkl">${label}</span>`;
 if(ZZ){const a=ZZ%2,c0=pc(ZZ-1),c1=pc(ZZ),gid="rkg"+ZZ,x0=a?52:128,x1=a?128:52;
  return `<section class="rk rr z ${a?"za":"zb"}" style="--pa:${c0};--pb:${c1}"><div class="rkni"><div class="rkcir">${tile(ic,tone)}</div><svg class="rkcn cs" viewBox="0 0 200 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--pa)"/><stop offset="1" style="stop-color:var(--pb)"/></linearGradient></defs><path d="M${x0} 0C${x0} 60 ${x1} 40 ${x1} 100" pathLength="1" stroke="url(#${gid})"/></svg><svg class="rkcn cm" viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden="true"><path d="M5 0V100" pathLength="1" style="stroke:var(--pa)"/></svg></div><div class="rkb"><div class="rkx">${lab}<div class="rkn">${big}</div>${line?`<div class="rkp">${line}</div>`:""}</div>${vis?`<div class="rkvv">${vis}</div>`:""}</div></section>`}
 return `<section class="rk rr ${tone||""}">${tile(ic,tone)}${lab}<div class="rkn">${big}</div>${line?`<div class="rkp">${line}</div>`:""}${vis||""}</section>`};
const chip=(dir,txt,tone,go)=>`<${go?"a":"div"} class="rkch ${tone||""}" ${go?`data-a="recapGo" data-k="${esc(go)}"`:""}><i class="cp"><svg viewBox="0 0 24 24">${ICON[tone=="good"?"good":tone=="warn"?"warn":"info"]}</svg></i><span>${txt}</span></${go?"a":"div"}>`;
const lk=(k,txt)=>`<a class="rklk" data-a="recapGo" data-k="${esc(k)}">${txt}</a>`;
const ck=c=>"cat:"+encodeURIComponent(c);

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
 A().forEach(t=>{const r=rdOf(t);if(!r.startsWith(MK))return;const i=+r.slice(8)-1;if(i<0||i>=dim)return;const D=days[i];if(t.a<0){D.spent-=t.a;D.ex.push([dn(t),-t.a])}else if(!t.pending){D.inc+=t.a;D.inn.push([dn(t),t.a])}});
 BI.filter(b=>!b.once&&!b.irregular&&b.flag!="canceled"&&b.nx&&b.nx.toISOString().slice(0,7)==MK&&b.nx.toISOString().slice(0,10)>=TODAY).forEach(b=>{const i=b.nx.getDate()-1;if(days[i])days[i].up.push([b.n,b.pred,b.idx])});
 const nextBills=BI.filter(b=>!b.once&&!b.irregular&&b.flag!="canceled"&&b.nx&&b.nx.toISOString().slice(0,7)==nmk).reduce((s,b)=>s+b.pred,0);
 const nextUp=BI.filter(b=>!b.once&&!b.irregular&&b.flag!="canceled"&&b.nx&&b.nx>NOW).sort((a,b)=>a.nx-b.nx)[0]||null;
 const phase=day<=5?"start":dim-day<=6?"end":"mid";
 return{jarCov,day,dim,pm,nmk,cash,inc,ex,cardsU,cardsPrev,cardPaid,cardLeft,same,incs,sal,bills,billsTot,limitsLeft,end,start,over,risk,okB,above,below,w1,w0,days,nextBills,nextUp,phase,inJars:F.inJars,buffer:F.buffer}}

/* ---------- the small pictures ---------- */
// the month as a row of days. Hover a day to see what happened, click it to open that day in Activity.
function dayScale(m){let t="";for(let d=1;d<=m.dim;d++)t+=`<i class="${d<m.day?"p":d==m.day?"n":""}" data-d="${d}" role="button" tabindex="0" aria-label="${dfull(MK+"-"+p2(d))}" style="--i:${d}"></i>`;
 return `<div class="rkds"><div class="rkdt">${t}</div><div class="rkdl"><span>${L(`Day ${m.day} of ${m.dim}`,`יום ${m.day} מתוך ${m.dim}`)}</span><span>${m.dim-m.day>0?pl(m.dim-m.day,"1 day left","{} days left","נשאר יום אחד","נשארו {} ימים"):L("Last day of the month","היום האחרון בחודש")}</span></div><div class="rktip" hidden></div></div>`}

// one bar for each day so far
function dayBars(m){const W=600,Hh=96,gap=4,n=m.dim,bw=(W-gap*(n-1))/n,v0=m.days.slice(0,m.day).map(d=>d.spent),sd=[...v0].sort((a,b)=>b-a),mx=Math.max(1,sd[0]>sd[1]*2.2?sd[1]*1.3:sd[0]||1);let s="";
 for(let i=0;i<n;i++){const x=H()?W-bw-i*(bw+gap):i*(bw+gap);
  if(i<m.day){const v=v0[i]||0,h=Math.min(Hh,Math.max(v>0?5:2,v/mx*(Hh-6)));s+=`<rect x="${x}" y="${Hh-h}" width="${bw}" height="${h}" rx="${Math.min(4,bw/2)}" class="${i==m.day-1?"t":"b"} gr" style="--i:${i}"/>`}
  else s+=`<rect x="${x}" y="${Hh-2}" width="${bw}" height="2" rx="1" class="f"/>`}
 return `<div class="rkbw"><svg class="rkv bars" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" role="img" aria-label="${L("Spending for each day of the month","ההוצאות בכל יום בחודש")}">${s}</svg><div class="rktip" hidden></div></div>`}

// amounts as one bar with a legend
const segBar=it=>{it=it.filter(x=>x[1]>=1);const tot=it.reduce((s,x)=>s+x[1],0)||1;
 return `<div class="rkhl"><div class="rkseg">${it.map((x,i)=>`<i class="${x[2]}" data-h="${i}" style="flex:${x[1]/tot};--i:${i}"></i>`).join("")}</div><div class="rkleg">${it.map((x,i)=>`<${x[3]?"a":"span"} data-h="${i}" ${x[3]?`data-a="recapGo" data-k="${x[3]}"`:""}><i class="${x[2]}"></i>${x[0]} <b>${mi(x[1])}</b></${x[3]?"a":"span"}>`).join("")}</div></div>`};
// hovering a bar segment or its name lights up both, like the category graphs in Reports
(()=>{const set=(r,h)=>{r.classList.toggle("hv",h!=null);r.querySelectorAll("[data-h]").forEach(x=>x.classList.toggle("on",h!=null&&x.dataset.h===h))};
document.addEventListener("mouseover",e=>{const t=e.target.closest&&e.target.closest(".rkhl [data-h]");if(t)set(t.closest(".rkhl"),t.dataset.h)});
document.addEventListener("mouseout",e=>{const t=e.target.closest&&e.target.closest(".rkhl [data-h]");if(!t)return;const to=e.relatedTarget&&e.relatedTarget.closest&&e.relatedTarget.closest(".rkhl [data-h]");const r=t.closest(".rkhl");if(to&&r.contains(to))return;set(r,null)})})();
const nowBar=m=>{const set=Math.min(m.cash,m.inJars+m.buffer),free=Math.max(0,m.cash-set);return segBar([[L("Set aside in jars","שמור בקופות"),set,"c3","jars"],[L("Free to use","פנוי לשימוש"),free,"c1","now"]])};
const aheadBar=m=>segBar([[L("Credit cards","כרטיסי אשראי"),m.cardLeft,"c1","now"],[L("Bills","תשלומים קבועים"),m.billsTot,"c2","bills"],[L("Budgets","תקציבים"),m.limitsLeft,"c3","budg"],[L("Paid from jars","מהקופות"),m.jarCov,"c4","jars"]]);

// a ring for a budget: how much of it is used
function ring(b,i){const r=27,c=2*Math.PI*r,p=Math.min(1,b.s/Math.max(1,b.lim));
 return `<div class="rkrg ${b.st=="over"?"o":"w"}" style="--i:${i}"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" class="bg"/><circle cx="32" cy="32" r="${r}" class="fg" style="--d:${(c*p).toFixed(1)};--c:${c.toFixed(1)}" transform="rotate(-90 32 32)"/></svg><b>${Math.round(b.s/Math.max(1,b.lim)*100)}%</b><span>${nm(b.k)}</span></div>`}

// the month's money: where it started, where it is, and where it could end
function pathChart(m){const W=600,Hh=110,px=18,top=14,bot=14,xs=[px,px+(W-2*px)*Math.min(1,Math.max(.05,m.day/m.dim)),W-px];
 const vals=[isFinite(m.start)?m.start:m.cash,m.cash,m.end],lo=Math.min(...vals),hi=Math.max(...vals),span=Math.max(1,hi-lo),Y=v=>Hh-bot-(v-lo)/span*(Hh-top-bot);
 const ys=vals.map(Y),a=`${xs[0]},${ys[0]} ${xs[1]},${ys[1]}`;
 return `<svg class="rkv path" viewBox="0 0 ${W} ${Hh}" aria-hidden="true"><defs><linearGradient id="rkg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".28"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs><line x1="${px}" x2="${W-px}" y1="${Hh-bot+8}" y2="${Hh-bot+8}" class="ax"/><polygon points="${xs[0]},${Hh-bot+8} ${a} ${xs[1]},${Hh-bot+8}" fill="url(#rkg)" class="ar"/><polyline points="${a}" class="ln" pathLength="1"/><polyline points="${xs[1]},${ys[1]} ${xs[2]},${ys[2]}" class="ln d"/><circle cx="${xs[0]}" cy="${ys[0]}" r="5" class="dt"/><circle cx="${xs[1]}" cy="${ys[1]}" r="7" class="dn"/><circle cx="${xs[2]}" cy="${ys[2]}" r="5" class="dt e"/></svg><div class="rkpl"><div><span>${L("Start of month","תחילת החודש")}</span><b>${mi(vals[0])}</b></div><div><span>${L("Today","היום")}</span><b>${mi(vals[1])}</b></div><div><span>${L("Expected end","צפי לסוף החודש")}</span><b>${mi(vals[2])}</b></div></div>`}

/* ---------- the parts of the page ---------- */
function hero(m){const name=(P().name||"").trim(),mon=mname(MK);
 let hi;try{const g=greeting();hi=esc(g.text).replace("{n}","<bdi>"+esc(g.name)+"</bdi>")}catch(e){hi=name?L("Hi "+esc(name),"היי "+esc(name)):L("Hello","שלום")}
 const lead={start:L(`Here is how ${mon} is beginning, step by step`,`כך ${mon} מתחיל, צעד אחרי צעד`),mid:L(`Here is how ${mon} has gone so far, step by step`,`כך ${mon} עבר עליכם עד עכשיו, צעד אחרי צעד`),end:L(`${mon} is almost over. Here is how it went`,`${mon} כמעט נגמר. כך הוא עבר עליכם`)}[m.phase];
 return `<section class="rkh rr"><h2>${hi}</h2><p>${lead}</p>${dayScale(m)}</section>`}

// three amounts side by side: where it was, what was added, where it got to
const eq=(a,b,c)=>`<div class="rkeq">${[a,"+",b,"=",c].map(x=>typeof x=="string"?`<i>${x}</i>`:`<${x[2]?"a":"div"} ${x[2]?`data-a="recapGo" data-k="${x[2]}"`:""}><span>${x[0]}</span><b>${mi(x[1])}</b></${x[2]?"a":"div"}>`).join("")}</div>`;

function startPart(m){if(!(isFinite(m.start)&&Math.abs(m.start)>=1))return"";const d=m.cash-m.start,mon=mname(MK);
 const line=Math.abs(d)>=100?chip(d>=0?"up":"down",d>=0?L(`Today you have ${mi(d)} more than that`,`היום יש לכם ${mi(d)} יותר מזה`):L(`Today you have ${mi(-d)} less than that`,`היום יש לכם ${mi(-d)} פחות מזה`),d>=0?"good":"warn","now"):"";
 return part("flag","",L(`You began ${mon} with`,`התחלתם את ${mon} עם`),"",`<span class="rkw">≈</span>${mn(m.start)}`,L(`That is roughly what was in your accounts on ${dlong(MK+"-01")}.`,`זה בערך מה שהיה בחשבונות שלכם ב‑${dlong(MK+"-01")}.`)+(line?`<br>${line}`:""))}

function inPart(m){
 if(!m.sal)return part("in","tp",L("So far, you received","עד עכשיו קיבלתם"),"in",mn(0),L("Nothing has come in yet this month.","עוד לא נכנס כסף החודש."));
 const rest=m.inc-m.sal.a,n=m.incs.length-1,ok=isFinite(m.start)&&Math.abs(m.start)>=1;
 let line=n>0&&rest>=1
  ?L(`The biggest payment was ${mi(m.sal.a)} from ${lk("tx:"+m.sal.id,nm(dn(m.sal)))}, on ${dlong(rdOf(m.sal))}. ${pl(n,"1 other payment","{} other payments","","")} added another ${mi(rest)}.`,`התשלום הגדול היה ${mi(m.sal.a)} מ‑${lk("tx:"+m.sal.id,nm(dn(m.sal)))}, ב‑${dlong(rdOf(m.sal))}. ${pl(n,"","","תשלום נוסף אחד","{} תשלומים נוספים")} הוסיפו עוד ${mi(rest)}.`)
  :L(`You were paid by ${lk("tx:"+m.sal.id,nm(dn(m.sal)))} on ${dlong(rdOf(m.sal))}.`,`קיבלתם תשלום מ‑${lk("tx:"+m.sal.id,nm(dn(m.sal)))} ב‑${dlong(rdOf(m.sal))}.`);
 if(ok)line+=`<br>${L(`That took your accounts up to about ${mi(m.start+m.inc)}.`,`זה העלה את החשבונות לכ‑${mi(m.start+m.inc)}.`)}`;
 return part("in","tp",L("Then, you received","אחר כך קיבלתם"),"in",mn(m.inc),line,ok?eq([L("Started with","התחלתם עם"),m.start,"now"],[L("Came in","נכנס"),m.inc,"in"],[L("Brought it to","הגיע ל‑"),m.start+m.inc,"now"]):"")}

function outPart(m){
 let line="",d=m.same-m.ex;
 if(m.same>=100&&m.ex>=100){
  if(Math.abs(d)<Math.max(100,m.same*.08))line=chip("flat",L("You have spent about the same as you did by this day last month","הוצאתם בערך אותו סכום כמו עד אותו יום בחודש שעבר"),"","out");
  else if(d>0)line=chip("down",L(`You have spent ${mi(d)} less than you did by this day last month`,`הוצאתם ${mi(d)} פחות מאשר עד אותו יום בחודש שעבר`),"good","out");
  else line=chip("up",L(`You have spent ${mi(-d)} more than you did by this day last month`,`הוצאתם ${mi(-d)} יותר מאשר עד אותו יום בחודש שעבר`),"warn","out")}
 let pulse="";const tr=m.w1-m.w0;
 if(m.w0>=150&&Math.abs(tr)>=Math.max(100,m.w0*.25))pulse=tr<0?chip("down",L("The last 7 days were calmer than the 7 before","7 הימים האחרונים היו רגועים יותר מ‑7 הימים שלפניהם"),"good","d7"):chip("up",L("The last 7 days were busier than the 7 before","7 הימים האחרונים היו עמוסים יותר מ‑7 הימים שלפניהם"),"warn","d7");
 else if(m.below[0])pulse=chip("down",L(`${nm(m.below[0].k)} is well below its usual`,`${nm(m.below[0].k)} נמוך בהרבה מהרגיל`),"good",ck(m.below[0].k));
 else if(m.above[0])pulse=chip("up",L(`${nm(m.above[0].k)} is already above a usual month`,`${nm(m.above[0].k)} כבר מעל חודש רגיל`),"warn",ck(m.above[0].k));
 const lead=L(`Each bar below is one day. Hover over a bar to see what you spent, and click it to open that day.`,`כל עמודה למטה היא יום אחד. עברו עם העכבר על עמודה כדי לראות מה הוצאתם, ולחצו כדי לפתוח את אותו היום.`);
 return part("out","tn",L("Since then, you have spent","מאז הוצאתם"),"out",mn(m.ex),lead+line+pulse,dayBars(m))}

function nowPart(m){const set=Math.min(m.cash,m.inJars+m.buffer),free=Math.max(0,m.cash-set);
 return part("wallet","",L("After all that, you are left with","אחרי כל זה נשארו לכם"),"now",mn(m.cash),L("in your bank and wallet accounts today.","בחשבונות הבנק והארנקים היום."),nowBar(m))}

// the next payments, each with its date
function upList(m){const it=[];m.days.forEach(D=>D.up.forEach(x=>{if(D.d>=TODAY)it.push([D.d,x[0],x[1],x[2]])}));
 if(!it.length)return"";return `<div class="rkup"><div class="t">${L("Upcoming payments","תשלומים קרובים")}</div>${it.slice(0,3).map(x=>`<div class="r" ${x[3]!=null?`data-a="billOpen" data-i="${x[3]}" role="button" tabindex="0"`:""}><div class="dt"><b>${+x[0].slice(8)}</b><span>${dshort(x[0]).replace(/[0-9\s]/g,"")}</span></div><div class="n">${nm(x[1])}<small>${dday(x[0])}</small></div><b class="a">${mi(x[2])}</b></div>`).join("")}</div>`}
function aheadPart(m){const tot=m.cash-m.end;if(tot<1)return"";const bm={...m,billsTot:Math.max(0,tot-m.cardLeft-m.limitsLeft-m.jarCov)};
 const left=m.cash-tot,held=m.inJars+m.buffer,free=left-held;
 const rest=left>=0?chip("up",L(`You will have about ${mi(left)} left after you pay these`,`יישארו לכם בערך ${mi(left)} אחרי שתשלמו את כל אלה`),"good","fc"):chip("down",L(`That is ${mi(-left)} more than you have in your accounts today`,`זה ${mi(-left)} יותר ממה שיש לכם היום בחשבונות`),"warn","now");
 const jr=held>=1&&left>=0?(free>=0?chip("flat",L(`${mi(held)} of that is in your jars, so about ${mi(free)} is yours to spend`,`${mi(held)} מזה בקופות, כך שבערך ${mi(free)} נשארים לכם להוצאות`),"","jars"):chip("down",L(`Your jars hold ${mi(held)}, so after these payments they will be about ${mi(-free)} short`,`בקופות יש ${mi(held)}, אז אחרי התשלומים יחסרו להן בערך ${mi(-free)}`),"warn","jars")+relBtn()):"";
 return part("ahead","",L("You still have to pay","עוד תצטרכו לשלם"),"ahead",mn(tot),L("That is your credit card charges, your bills, the rest of your budgets and what your jars pay for.","אלה חיובי האשראי, התשלומים הקבועים, מה שנשאר מהתקציבים ומה שהקופות משלמות.")+rest+jr,aheadBar(bm)+upList(m))}

// the same release the Jars page offers: when jars and cushion hold more than the accounts can cover after upcoming bills and budgets
const relBtn=()=>{const o=jarFree().over;return o>0?`<div class="rkfix"><button class="btn" data-a="jarRelease">${L(`Take ${mi(Math.min(o,jarFree().inJars))} back from the jars`,`החזירו ${mi(Math.min(o,jarFree().inJars))} מהקופות`)}</button></div>`:""};
// why a budget needs attention, with a bar showing how much is used (and where it is heading)
function budRow(b){const lim=Math.max(1,b.lim),u=Math.min(100,b.s/lim*100),pc=Math.min(100,b.pace/lim*100);
 const why=b.st=="over"?L(`Over its limit by ${mi(b.s-b.lim)}: ${mi(b.s)} spent of ${mi(b.lim)}.`,`חרג מהמסגרת ב‑${mi(b.s-b.lim)}: הוצאתם ${mi(b.s)} מתוך ${mi(b.lim)}.`)
  :b.st=="warn"?L(`${Math.round(b.pc)}% used: ${mi(b.s)} of ${mi(b.lim)}, with ${mi(Math.max(0,b.lim-b.s))} left.`,`נוצלו ${Math.round(b.pc)}%: ${mi(b.s)} מתוך ${mi(b.lim)}, נשארו ${mi(Math.max(0,b.lim-b.s))}.`)
  :L(`At this pace it will reach about ${mi(b.pace)}, which is ${mi(b.pace-b.lim)} over its ${mi(b.lim)} limit.`,`בקצב הזה יגיע לכ‑${mi(b.pace)}, כלומר ${mi(b.pace-b.lim)} מעל המסגרת של ${mi(b.lim)}.`);
 return `<a class="rkbr ${b.st=="over"?"o":"w"}" data-a="recapGo" data-k="${esc(ck(b.k))}"><div class="h"><b>${nm(b.k)}</b><span>${b.st=="over"?L("Over","חריגה"):b.st=="warn"?L("Almost full","כמעט מלא"):L("Heading over","בדרך לחריגה")}</span></div><div class="bar"><i style="width:${u.toFixed(1)}%"></i>${b.st=="pace"?`<em style="inset-inline-start:${pc.toFixed(1)}%"></em>`:""}</div><p>${why}</p></a>`}
function budgetsPart(m){const flag=[...m.over,...m.risk];
 if(!flag.length){if(!m.okB.length)return"";return part("check","tp",L("Your budgets are","התקציבים שלכם"),"budg",`<span class="rkw">${L("On track","בדרך הנכונה")}</span>`,L(`${pl(m.okB.length,"Your 1 budget is within its limit.","All {} budgets are within their limits.","","")}`,`${pl(m.okB.length,"","","התקציב שלכם נמצא במסגרת.","כל {} התקציבים נמצאים במסגרת.")}`))}
 return part("pie",m.over.length?"tn":"tw",L("Your budgets","התקציבים שלכם"),"budg",`<span class="rkw">${L(`${pl(flag.length,"1 needs","{} need","","")} attention`,`${pl(flag.length,"","","אחד דורש","{} דורשים")} תשומת לב`)}</span>`,L("Here is why:","הנה הסיבה:"),`<div class="rkbl">${flag.slice(0,4).map(budRow).join("")}</div>`)}

function endPart(m){
 const hasStart=isFinite(m.start)&&Math.abs(m.start)>=1,d=m.end-m.start,mon=mname(MK);
 let line=L(`This is what should be left if you pay everything that is still due (bills and credit card charges) and use up the rest of your budgets.`,`זה מה שאמור להישאר אם תשלמו את כל מה שעוד צפוי (תשלומים קבועים וחיובי אשראי) ותנצלו את מה שנשאר מהתקציבים.`);
 if(hasStart&&Math.abs(d)>=100)line+=chip(d>=0?"up":"down",d>=0?L(`${mi(d)} more than you started with`,`${mi(d)} יותר ממה שהתחלתם איתו את החודש`):L(`${mi(-d)} less than you started with`,`${mi(-d)} פחות ממה שהתחלתם איתו את החודש`),d>=0?"good":"warn","fc");
 {const held=m.inJars+m.buffer,free=m.end-held;
  if(held>=1&&m.end>0)line+=free>=0?chip("flat",L(`${mi(held)} of that is in your jars, so about ${mi(free)} is yours to spend`,`${mi(held)} מזה בקופות, כך שבערך ${mi(free)} נשארים לכם להוצאות`),"","jars"):chip("down",L(`Your jars hold ${mi(held)}, but you will probably end the month with ${mi(m.end)}, so they would be about ${mi(-free)} short`,`בקופות יש ${mi(held)}, אבל סביר שתסיימו את החודש עם ${mi(m.end)}, אז יחסרו להן בערך ${mi(-free)}`),"warn","jars")+relBtn()}
 if(m.phase=="end")line+=chip("flat",L(`${mname(m.nmk)} will begin with about ${mi(m.nextBills+m.cardsU)} already on its way out`,`${mname(m.nmk)} יתחיל כשכבר כ‑${mi(m.nextBills+m.cardsU)} בדרך החוצה`),"","fc");
 return part("path",m.end<0?"tn":"",L(`Predicted end of ${mon}`,`צפי לסוף ${mon}`),"end",`<span class="rkw">≈</span>${mn(m.end)}`,line,pathChart(m))}

/* ---------- opening the matching page, filtered ---------- */
window.recapGo=function(k){const last=MK+"-"+p2(DIM);
 if(k=="in")goActivity({from:MK+"-01",to:last,ty:"income"});
 else if(k=="out")goActivity({from:MK+"-01",to:last,ty:"expense"});
 else if(k=="ahead")goActivity({from:TODAY,to:last});
 else if(k=="now")nav("acc");
 else if(k=="budg")nav("budg");
 else if(k=="end"||k=="fc")nav("fc");
 else if(k=="jars")nav("jars");else if(k=="bills")nav("bills");
 else if(k=="d7"){const d=new Date(TODAY+"T12:00:00");d.setDate(d.getDate()-6);goActivity({from:d.toISOString().slice(0,10),to:TODAY,ty:"expense"})}
 else if(k.startsWith("cat:"))goActivity({cat:decodeURIComponent(k.slice(4)),from:MK+"-01",to:last,ty:"expense"})
 else if(k.startsWith("tx:"))openTx(+k.slice(3))
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
function countUp(el){const to=+el.dataset.v||0;if(!to||REDUCE())return;const t0=performance.now(),D=1100;el.setAttribute("data-cu","1");el.textContent="0";
 (function step(now){const k=Math.min(1,(now-t0)/D),e=1-Math.pow(1-k,3);el.textContent=f(Math.round(to*e));if(k<1&&document.body.contains(el))requestAnimationFrame(step);else{el.removeAttribute("data-cu");el.textContent=f(to)}})(t0)}
const showIn=(x,animate)=>{if(x.classList.contains("in"))return;x.classList.add("in");if(!animate){x.classList.add("st");return}x.querySelectorAll(".cnt").forEach(countUp)};
// the title and the first part fade in as they come into view
function reveal(box,animate){if(IO){IO.disconnect();IO=null}
 if(animate&&!REDUCE())box.querySelectorAll(".cnt").forEach(n=>{if(+n.dataset.v)n.textContent="0"});
 const items=[...box.querySelectorAll(".rr:not(.z):not(.zend)")];
 if(!animate||REDUCE()||!("IntersectionObserver" in window)){items.forEach(x=>showIn(x,false));return}
 IO=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;showIn(e.target,true);IO.unobserve(e.target)}),{threshold:.3,rootMargin:"0px 0px -18% 0px"});
 items.forEach(x=>IO.observe(x))}

// the path is drawn as you scroll: its tip stays near the bottom of the screen, and each part fades in when the path reaches it.
// Parts that scroll away off the top shrink a little.
const SVGNS="http://www.w3.org/2000/svg";
const cl01=x=>x<0?0:x>1?1:x,q3=x=>Math.round(x*1000)/1000;
// Layout is measured once (and again when the page is resized or changes); a scroll frame is then only arithmetic and a few direct style writes,
// so the browser has almost nothing to recalculate while you scroll.
const mx=v=>H()?180-v:v; // the connector pictures are drawn left to right: mirror them in Hebrew
const plain=(x,f)=>{const t=x.style.transform,sc=x.style.scale,tr=x.style.transition;x.style.transition="none";x.style.transform="none";x.style.scale="1";const v=f();x.style.transform=t;x.style.scale=sc;x.style.transition=tr;return v};
function measure(s){const el=s.el,z=el.querySelector(".rkz"),G={zTop:0,rows:[],shr:[],lead:null,end:null};s.geo=G;s.dirty=false;
 // parts that shrink as they leave: the title and first part, the last part
 el.querySelectorAll(".rkh.rr,.rkw0>.rk.rr,.zend").forEach(x=>{const r=plain(x,()=>x.getBoundingClientRect());G.shr.push({x,cy:(r.top+r.bottom)/2+scrollY,k:-1})});
 if(!z)return;
 G.zTop=z.getBoundingClientRect().top+scrollY;const rows=[...z.querySelectorAll(".rk.z")],end=z.querySelector(".zend"),eT=end&&end.querySelector(".rki");
 const cy=r=>{const n=r.querySelector(".rkni"),c=r.querySelector(".rkcir");return r.offsetTop+n.offsetTop+c.offsetTop+c.offsetHeight/2};
 const pts=rows.map(cy),endY=eT?end.offsetTop+eT.offsetTop+eT.offsetHeight/2:null,rad=r=>r.querySelector(".rkcir").offsetHeight/2,endR=eT?eT.offsetHeight/2:0;
 // a connector runs from the lower edge of one circle to the upper edge of the next, so nothing is ever drawn behind a circle
 const geo=(svg,w,top,d,x0,x1)=>{if(!svg)return null;const hh=Math.max(1,d),pa=svg.querySelector("path");
  svg.setAttribute("viewBox",`0 0 ${w} ${hh}`);svg.style.top=top+"px";svg.style.height=d+"px";pa.setAttribute("d",x0==x1?`M${x0} 0V${hh}`:`M${x0} 0C${x0} ${hh*.5} ${x1} ${hh*.5} ${x1} ${hh}`);return{pa,hh,o:-1}};
 rows.forEach((r,i)=>{const a=pts[i],R0=rad(r),last=i+1==rows.length,b=!last?pts[i+1]:endY,Rn=!last?rad(rows[i+1]):endR,x0=mx(r.classList.contains("za")?52:128),x1=!last?mx(rows[i+1].classList.contains("za")?52:128):90;
  r.classList.toggle("tozend",last&&b!=null);const ni=r.querySelector(".rkni"),c0=r.querySelector(".rkcir"),top=c0.offsetTop+c0.offsetHeight,len=b!=null?b-a-R0-Rn:0;
  const bd=r.querySelector(".rkb"),R={r,a,R0,bt:r.offsetTop+bd.offsetTop,body:bd,circ:c0,mid:r.offsetTop+r.offsetHeight/2,kb:-1,kc:-1,cons:[],hit:r.classList.contains("hit")};
  if(b!=null){R.cons=[geo(r.querySelector(".rkcn.cs"),180,top,len,x0,x1),geo(r.querySelector(".rkcn.cm"),10,top,len,5,5)].filter(Boolean);R.cons.forEach(o=>o.from=G.zTop+a+R0)}G.rows.push(R)});
 if(end&&endY!=null)G.end={el:end,y:endY,t:end.offsetTop};
 // the start of the path comes down from the first part to the first circle
 const st=el.querySelector(".rkw0>.rk:not(.z)");
 if(rows.length&&st&&st.querySelector(".rki")){let ld=z.querySelector(".rklead");if(!ld){ld=document.createElementNS(SVGNS,"svg");ld.setAttribute("class","rkcn rklead cs");ld.setAttribute("aria-hidden","true");ld.innerHTML='<path pathLength="1"/>';z.insertBefore(ld,z.firstChild)}
  const tb=plain(st,()=>st.getBoundingClientRect().bottom)+scrollY-26,from=tb-G.zTop,a=pts[0]-rad(rows[0]),d=a-from,x1=mx(rows[0].classList.contains("za")?52:128);
  ld.style.top=from+"px";ld.style.height=Math.max(0,d)+"px";ld.setAttribute("viewBox",`0 0 180 ${Math.max(1,d)}`);const pa=ld.querySelector("path");pa.setAttribute("d",`M90 0C90 ${d*.5} ${x1} ${d*.5} ${x1} ${d}`);
  G.lead={pa,from:tb,hh:Math.max(1,d),o:-1}}}
function frame(){const s=CUR;if(!s||!s.el.isConnected)return;if(!s.el.getClientRects().length){s.away=true;return}
 if(s.away){s.away=false;s.animate=true;s.dirty=true;s.el.querySelectorAll(".rr").forEach(x=>x.classList.remove("in","st","hit"));reveal(s.el,true)}
 if(s.dirty||!s.geo)measure(s);
 const G=s.geo,y=scrollY,vh=innerHeight,head=y+vh*.86,anim=s.animate&&!REDUCE(),move=!REDUCE(),t0=vh*.4,sp=vh*.7;
 const kOf=c=>q3(1-.3*cl01((t0-(c-y))/sp)); // 1 in the middle of the screen, a little smaller once a part is on its way out at the top
 // the path is drawn as far as the bottom of the screen
 const dash=(o,top)=>{let v=anim?q3(1-cl01((head-top)/o.hh)):0;if(o.m!==undefined&&v>o.m)v=o.m;o.m=v;if(v===o.o)return;o.o=v;o.pa.style.strokeDashoffset=v};
 if(G.lead)dash(G.lead,G.lead.from);
 G.rows.forEach(R=>{const top=G.zTop+R.a;
  R.cons.forEach(o=>dash(o,o.from));
  if(!R.hit&&(!anim||head>=top-R.R0)){R.hit=true;R.r.classList.add("hit")}
  if(!R.r.classList.contains("in")&&y+vh*.8>=G.zTop+R.bt)showIn(R.r,anim); // by the top of the part, so tall and short parts start appearing at the same point of the scroll
  if(move){const kb=kOf(G.zTop+R.mid),kc=kOf(top);
   if(kb!==R.kb){R.kb=kb;R.body.style.scale=kb}
   if(kc!==R.kc){R.kc=kc;R.circ.style.scale=kc;const w=5*kc;R.cons.forEach(o=>o.pa.style.strokeWidth=w)}}});
 if(G.end&&!G.end.el.classList.contains("in")&&y+vh*.8>=G.zTop+G.end.t)showIn(G.end.el,anim);
 if(move)G.shr.forEach(it=>{const k=kOf(it.cy);if(k!==it.k){it.k=k;it.x.style.scale=k}})}
let TICK=0;const kick=()=>{if(TICK)return;TICK=requestAnimationFrame(()=>{TICK=0;frame()})};
const relayout=()=>{if(CUR)CUR.dirty=true;kick()};
function wireLinks(el,animate){CUR={el,animate,dirty:true};if(RO){RO.disconnect();RO=null}
 if("ResizeObserver" in window){RO=new ResizeObserver(relayout);RO.observe(el)}
 if(!BOUND){BOUND=true;addEventListener("scroll",kick,{passive:true});addEventListener("resize",relayout);try{document.fonts&&document.fonts.ready.then(relayout)}catch(e){}}
 frame();setTimeout(relayout,300);setTimeout(relayout,1200)}
let LASTSIG="",LASTAT=0;
window.renderRecap=function(){const el=$("recap");if(!el)return;
 let html,m=null;
 if(!S.tx.length){html=`<div class="rkw0" data-nt><section class="rkh rr"><h2>${L("Nothing to recap yet","עוד אין מה לסכם")}</h2><p>${L("Once your accounts are connected or you add a few transactions, this page will tell you how your month is going.","אחרי שתחברו חשבונות או תוסיפו כמה תנועות, הדף הזה יספר לכם איך החודש מתקדם.")}</p></section></div>`}
 else{m=model();
  const order=m.phase=="start"?[hero,startPart,inPart,nowPart,aheadPart,outPart,budgetsPart,endPart]:m.phase=="end"?[hero,startPart,inPart,outPart,budgetsPart,aheadPart,nowPart,endPart]:[hero,startPart,inPart,outPart,nowPart,aheadPart,budgetsPart,endPart];
  PREV=0;let zc=0,out=order.map((fn,i)=>{ZZ=i<2||i==order.length-1?0:zc+1;let h="";try{h=fn(m)}catch(e){}const zi=ZZ;ZZ=0;if(zi&&h)zc++;return h});
  const endH=out[out.length-1].replace('class="rk rr','class="rk rr zend'),chain=out.slice(2,-1).filter(Boolean).join("")+endH;
  html=`<div class="rkw0" data-nt>${out[0]}${out[1]}${chain?`<div class="rkz">${chain}</div>`:""}</div>`}
 // the same page again: leave it alone. A change while you are looking: update it quietly. Coming back to it later: play it again.
 if(html===LASTSIG&&el.firstChild){if(CUR&&CUR.el===el){setTimeout(kick,50);setTimeout(kick,400)}return}
 const fresh=Date.now()-LASTAT>2500||!el.firstChild;LASTSIG=html;LASTAT=Date.now();
 const y=scrollY;el.innerHTML=html;
 reveal(el,fresh);wireLinks(el,fresh);if(m){wireDays(el,m);wireBars(el,m)}if(!fresh)scrollTo(0,y)};
})();
