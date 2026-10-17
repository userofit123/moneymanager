/* ---------- state: lives on the server (Postgres) ---------- */
const T=(id,d,desc,from,to,a,c)=>({id,d,desc,from,to,a,c:c||"",tags:[],docs:[],note:""});
const DEF_CFG={jars:1,bills:1,price:1,budget:1,card:1,large:1,xfer:1,recon:1,pending:1,sync:1,uncat:1,forecast:1,docs:1,cardPct:10,largeAmt:5000,billDays:3,budgetPct:80,gapDays:3};
const emptyState=()=>({v:4,rev:0,hiddenMerchants:[],ccOverride:{},cardRules:[],salaryRules:[],txIgnore:{},budgetNo:[],jarsBuffer:0,jarsReserve:0,currencies:["ILS","USD"],fxCurrencies:[],connected:{},locked:{},connStatus:{},cats:{},rules:[],tagRules:[],tx:[],budgets:{},bills:[],ignoredBills:[],jars:[],audit:[],xf:[],dismissed:{},dupOk:{},adj:{},ntfy:"",jarsTotal:0,nwPension:false,cfg:{...DEF_CFG},accounts:[],sources:[],nwSnaps:[],gaps:[]});
let S=emptyState(),lastSig="",dirty=false,saving=false,saveT=null,saveErr=false;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sigOf=()=>JSON.stringify([S.cats,S.rules,S.tagRules,S.tx,S.budgets,S.bills,S.ignoredBills,S.jars,S.audit.map(a=>a.id||a.t),S.xf,S.dismissed,S.dupOk,S.adj,S.ntfy,S.jarsTotal,S.jarsBuffer,S.hiddenMerchants,S.ccOverride,S.cardRules,S.salaryRules,S.txIgnore,S.budgetNo,S.jarsReserve,S.nwPension,S.cfg,S.accounts.map(a=>a.manual?a.v:0)]);
function save(){if(!loaded)return;const g=sigOf();if(g===lastSig)return;dirty=true;clearTimeout(saveT);saveT=setTimeout(flush,400);setSaveState("pending")}
function setSaveState(x){}
async function flush(){if(saving||!dirty||!loaded)return;saving=true;dirty=false;const g=sigOf(),fresh=S.audit.filter(a=>!a.id),editedJars=S.jars.filter(x=>x.balEdit).map(x=>x.id);
try{const r=await fetch("/api/state",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(S)});
if(r.status==409){const j=await r.json();adopt(j.state);toast("Updated from a sync · please repeat your last change");renderAll();saving=false;return}
if(!r.ok)throw new Error("HTTP "+r.status);const j=await r.json();S.rev=j.rev;fresh.forEach((a,i)=>{a.id=j.auditIds[i]});S.jars.forEach(x=>{if(editedJars.includes(x.id)){delete x.balEdit;delete x.balNote;delete x.balUndo;delete x.balPaid}});if(j.jars){if(sigOf()===g)S.jars=j.jars;else applyJars(j.jars);if(j.filled)toast(`${j.filled} jar${j.filled==1?"":"s"} received money`,{title:"Jars"});setTimeout(renderAll,0)}lastSig=sigOf();saveErr=false;toastClear("savefail");setOffline(false);
}
catch(e){saveErr=true;dirty=true;if(!navigator.onLine||OFFLINE){setOffline(true)}else toast("Your last change is not saved yet. We will keep trying.",{kind:"err",title:"Not saved",sticky:"savefail"});setTimeout(flush,OFFLINE?4000:8000)}
saving=false;if(dirty&&!saveErr){clearTimeout(saveT);saveT=setTimeout(flush,200)}}
async function flushNow(){clearTimeout(saveT);while(saving)await sleep(40);if(dirty||sigOf()!==lastSig){dirty=true;await flush()}}
let loaded=false;
function applyJars(list){(list||[]).forEach(sj=>{const j=S.jars.find(x=>x.id==sj.id);if(!j)return;if(!j.balEdit)j.bal=sj.bal;j.got=sj.got;j.paid=sj.paid||0;j.moves=sj.moves;j.ledger=sj.ledger});if(!dirty&&!saving)lastSig=sigOf()}
function adopt(j){S=Object.assign(emptyState(),j);S.cfg=Object.assign({...DEF_CFG},S.cfg);loaded=true;lastSig=sigOf();dirty=false}
let OFFLINE=false;
function setOffline(v){if(v==OFFLINE)return;OFFLINE=v;if(v)toast("You are offline, so this is the data from your last visit. You cannot save changes until you are back online.",{kind:"info",title:"You are offline",sticky:"offline"});else toastClear("offline")}
async function load(){const r=await fetch("/api/state",{cache:"no-store"});if(!r.ok)throw new Error("HTTP "+r.status);const off=!!r.headers.get("x-offline-cache"),j=await r.json();if(off&&loaded&&S.rev>j.rev)return;adopt(j);setOffline(off)}
addEventListener("online",()=>{if(!loaded)return;load().then(()=>{renderAll();flush()}).catch(()=>{})});
addEventListener("offline",()=>{if(loaded)setOffline(true)});
async function api(path,opt){await flushNow();const r=await fetch(path,opt);const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"HTTP "+r.status);return j}
// an app left open past midnight (or into a new month) would keep showing the old day: reload it when it comes back to the front
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&new Date().toDateString()!==NOW.toDateString())Promise.resolve(flushNow()).catch(()=>{}).then(()=>location.reload())});
let LK=0,LQ=[],LT=0;
function log(action,detail,undo,who){const e={t:new Date().toISOString(),who:who||"You",action,detail,undo:undo||null};S.audit.unshift(e);S.audit=S.audit.slice(0,2000);save();
if(e.who!="System"){Object.defineProperty(e,"_k",{value:"k"+(++LK),enumerable:false});LQ.push(e);clearTimeout(LT);LT=setTimeout(()=>{const m=LQ;LQ=[];if(!m.length)return;const e1=m[0];toast(m.length>1?m.length+" changes saved":(e1.detail||"Saved"),{title:m.length>1?"Saved":e1.action,undo:m.length==1&&e1.undo?(e1.id||e1._k):0})},40)}}
const cc=n=>n=="Income"||S.cats[n]===99?"var(--pos)":`var(--c${(S.cats[n]==null?6:S.cats[n])%7})`;
const byId=id=>S.tx.find(t=>t.id==id);
let accts=[],SRC=[],hist={months:[],inc:[],exp:[],cat:{},incSrc:{}},FH={keys:[],months:[],last:12,first:0,inc:[],exp:[],cat:{},incSrc:{}},JPC=null,NR=new Set(),NW={months:[],hap:[],wise:[],pen:[]},cardsD=[];
let fx={ILS:1},fxSrc="none",fxCur="USD",fxSer={},fxAsOf=null,fxStale=false;
const accILS=a=>a.v*(fx[a.cur]||1),accCur=a=>a.n+(a.cur!="ILS"||accts.some(x=>x!==a&&(x.n==a.n||x.src&&x.src==a.src))?" ("+a.cur+")":""),cashAccts=()=>accts.filter(a=>a.inNW&&(a.kind=="bank"||a.kind=="wallet")); // the same accounts the server counts as cash for jars
async function loadFX(){try{const r=await fetch("/api/fx",{cache:"no-store"});if(!r.ok)throw 0;const j=await r.json();if(!Object.values(j.series).some(x=>x.length>=2))throw 0;fx=Object.assign({ILS:1},j.fx);fxSer=j.series;fxSrc="live";fxAsOf=j.asOf;fxStale=j.stale}catch(x){fxSrc="none"}renderAll()}
const SRCDEF=[["Bank Hapoalim","hapoalim"],["Max","max"],["Isracard","isracard"],["Wise","wise"]];
function derive(){acReset();NR=new Set(S.accounts.filter(a=>a.inR===false).map(a=>a.n));Object.entries(S.connStatus||{}).forEach(([k,c])=>{if(c&&c.label){SRCN[k]=c.label;SRCL[k]=c.label}});CC=S.accounts.filter(a=>a.kind=="card"&&S.tx.some(t=>t.from==a.n&&t.a<0)).map(a=>({n:a.n,re:ccRe(a.n)}));BANKN=new Set(S.accounts.filter(a=>a.kind!="card"&&a.kind!="pension").map(a=>a.n));

accts=S.accounts.filter(a=>a.kind!="card"&&!a.hide).map(a=>({id:a.id,n:a.n,v:a.v,cur:a.cur,s:a.s,manual:a.manual,inNW:a.inNW,kind:a.kind,src:a.src,ck:a.ck,at:a.at}));
SRC=(()=>{const L=Object.keys(S.connStatus||{}).filter(k=>S.connected[k]).map(k=>[S.connStatus[k].label||k,k]);return L.length?L:SRCDEF})().map(([n,k])=>{const c=S.connStatus[k]||{key:"none",label:"No credentials",tone:"gray"},when=c.since?fmtWhen(c.since):"never",
state=c.tone=="green"?"ok":c.tone=="red"?"bad":"warn",
msg={none:"Add it in Settings → Connections",untested:"Saved. Press Test connection to check the login",tested:"The login works. Press Sync now to import",connected:"Synced "+when,stale:"Last synced "+when+" (over 2 days ago)",failed:friendlyErr(c.error)||"Check the login",locked:"Paused after failed attempts. Check the login, then unlock",otp:friendlyErr(c.error)}[c.key]||"";
return{n,k,state,text:c.label,msg,t:when,failed:state=="bad",stale:c.key=="stale"?3:0,goConn:c.key!="connected"}}).concat(S.accounts.some(a=>a.kind=="pension"&&!a.hide&&+a.v>0)?[{n:"Pension",k:"pension",state:"ok",text:"Manual",t:"manual",msg:"Updated by you when you move money"}]:[]);
// monthly history from the transactions (transfers excluded, costs included)
const ms=[];for(let i=5;i>=0;i--)ms.push(addM(MK,-i));
const rows=A().filter(t=>!t.pending);const cats={},incS={};
hist={months:ms.map(MSHORT),inc:ms.map(()=>0),exp:ms.map(()=>0),cat:{},incSrc:{},keys:ms};
{ // the first complete month with data: months before it are "no history", not zeros
const first=S.tx.filter(t=>!isFuture(t)&&!t.virtual).reduce((m,t)=>t.d<m?t.d:m,"9999-99-99");let fi=first=="9999-99-99"?5:ms.indexOf(first.slice(0,7));if(fi<0)fi=first.slice(0,7)<ms[0]?0:5;if(first!="9999-99-99"&&+first.slice(8)>10&&fi<5)fi++;hist.first=Math.max(0,Math.min(5,fi))}
rows.forEach(t=>{const i=ms.indexOf(rdOf(t).slice(0,7));if(i<0)return;if(t.a>0){hist.inc[i]+=t.a;const k=incKey(t);(incS[k]=incS[k]||ms.map(()=>0))[i]+=t.a}else{hist.exp[i]-=t.a;const k=t.c||"Uncategorized";(cats[k]=cats[k]||ms.map(()=>0))[i]-=t.a}});
Object.entries(cats).sort((a,b)=>b[1].reduce((x,y)=>x+y,0)-a[1].reduce((x,y)=>x+y,0)).slice(0,5).forEach(([k,v])=>hist.cat[k]=v);
const topInc=Object.entries(incS).sort((a,b)=>b[1].reduce((x,y)=>x+y,0)-a[1].reduce((x,y)=>x+y,0));
topInc.slice(0,4).forEach(([k,v])=>hist.incSrc[k]=v);
if(topInc.length>4)hist.incSrc["Other income"]=ms.map((_,i)=>topInc.slice(4).reduce((s,[,v])=>s+v[i],0));
// a longer history (12 complete months and this one) for the forecast, built the same way
FH=(()=>{const N=13,ks=[];for(let i=N-1;i>=0;i--)ks.push(addM(MK,-i));const inc=ks.map(()=>0),exp=ks.map(()=>0),cats2={},incS2={},sumA=a=>a.reduce((x,y)=>x+y,0);
rows.forEach(t=>{const i=ks.indexOf(rdOf(t).slice(0,7));if(i<0)return;if(t.a>0){inc[i]+=t.a;const k=incKey(t);(incS2[k]=incS2[k]||ks.map(()=>0))[i]+=t.a}else{exp[i]-=t.a;const k=t.c||"Uncategorized";(cats2[k]=cats2[k]||ks.map(()=>0))[i]-=t.a}});
const f0=S.tx.filter(t=>!isFuture(t)&&!t.virtual).reduce((m,t)=>t.d<m?t.d:m,"9999-99-99");let fi=f0=="9999-99-99"?N-1:ks.indexOf(f0.slice(0,7));if(fi<0)fi=f0.slice(0,7)<ks[0]?0:N-1;if(f0!="9999-99-99"&&+f0.slice(8)>10&&fi<N-1)fi++;fi=Math.max(0,Math.min(N-1,fi));
const cat={},incSrc={},ct=Object.entries(cats2).sort((a,b)=>sumA(b[1])-sumA(a[1])),it=Object.entries(incS2).sort((a,b)=>sumA(b[1])-sumA(a[1]));ct.slice(0,8).forEach(([k,v])=>cat[k]=v);it.slice(0,6).forEach(([k,v])=>incSrc[k]=v);if(it.length>6)incSrc["Other income"]=ks.map((_,i)=>it.slice(6).reduce((s,[,v])=>s+v[i],0));
return{keys:ks,months:ks.map(MSHORT),last:N-1,first:fi,inc,exp,cat,incSrc}})();
// net worth by month: stored snapshots, with this month live
const NWN=60,nm=[];for(let i=NWN-1;i>=0;i--)nm.push(addM(MK,-i));
const snap=Object.fromEntries(S.nwSnaps.map(x=>[x.month,x])),sumK=(kind)=>S.accounts.filter(a=>a.kind==kind).reduce((s,a)=>s+a.v*(fx[a.cur]||1),0);
// months without a stored snapshot are rebuilt from the transactions: balance now minus everything that happened after that month
const kindOf=Object.fromEntries(S.accounts.map(a=>[a.n,a.kind])),nwD={bank:{},wallet:{}};let firstM="9999-99";
S.tx.forEach(t=>{if(t.pending||t.virtual||isFuture(t))return;const k=kindOf[t.a<0?t.from:t.to];if(!nwD[k])return;const m=t.d.slice(0,7);if(m<firstM)firstM=m;nwD[k][m]=(nwD[k][m]||0)+t.a});
const rec={};{let b=sumK("bank"),w=sumK("wallet");for(let i=NWN-1;i>=0;i--){rec[nm[i]]={bank:b,wise:w};b-=nwD.bank[nm[i]]||0;w-=nwD.wallet[nm[i]]||0}}
let last={bank:0,wise:0,pension:0,other:0};NW={months:nm.map(m=>MSHORT(m)+" "+m.slice(2,4)),hap:[],wise:[],pen:[],oth:[],keys:nm,first:Math.max(0,nm.findIndex(m=>m>=firstM)-1)};
const sumC=()=>S.accounts.filter(a=>a.kind=="custom"&&a.inNW).reduce((s,a)=>s+a.v*(fx[a.cur]||1),0);
nm.forEach((m,i)=>{const x=i==NWN-1?{bank:sumK("bank"),wise:sumK("wallet"),pension:sumK("pension"),other:sumC()}:snap[m]||(firstM!="9999-99"?{bank:rec[m].bank,wise:rec[m].wise,pension:sumK("pension"),other:sumC()}:last);if(x)last=x;NW.hap.push(Math.round(last.bank));NW.wise.push(Math.round(last.wise));NW.pen.push(Math.round(last.pension));NW.oth.push(Math.round(last.other||0))});
// cards: this month's charges against last month's total
cardsD=S.accounts.filter(a=>a.kind=="card").map(a=>{const mine=S.tx.filter(t=>t.a<0&&t.from==a.n&&!XS.has(t.id)),pm=addM(MK,-1);return[a.n,mine.filter(t=>t.d.startsWith(MK)).reduce((s,t)=>s-t.a,0),mine.filter(t=>t.d.startsWith(pm)).reduce((s,t)=>s-t.a,0)]});
// a Wise card appears by itself once there are payments made with it (they leave the Wise balance right away)
{const w=S.tx.filter(t=>t.wc&&t.a<0&&!XS.has(t.id)),pm=addM(MK,-1);if(w.length)cardsD.push(["Wise card",w.filter(t=>t.d.startsWith(MK)).reduce((s,t)=>s-t.a,0),w.filter(t=>t.d.startsWith(pm)).reduce((s,t)=>s-t.a,0),"wise"])}}
/* ---------- transfers, duplicates, effective transactions ---------- */
let XS=new Set(),DUPS=new Set();
function detect(){const own=[...new Set(["Bank Hapoalim","Wise",...S.accounts.filter(a=>a.kind=="bank"||a.kind=="wallet"||a.kind=="custom").map(a=>a.n)])];
S.tx.forEach(o=>{if(!(o.a<0&&own.includes(o.from)))return;S.tx.forEach(i=>{if(!(i.a>0&&own.includes(i.to)&&i.to!==o.from))return;if(S.xf.some(x=>x.o==o.id||x.i==i.id))return;
const dd=Math.abs((new Date(o.d)-new Date(i.d))/864e5),r=i.a/-o.a;if(dd<=3&&r>=.94&&r<=1.03){S.xf.push({o:o.id,i:i.id,st:"auto"});log("Transfer detected",o.from+" → "+i.to+" · "+fm(-o.a)+" out, "+fm(i.a)+" in",null,"System")}})});
XS=new Set();S.xf.filter(x=>x.st!="rej").forEach(x=>{XS.add(x.o);XS.add(x.i)});
const m={};DUPS=new Set();S.tx.forEach(t=>{const k=[t.d,t.desc,t.a,t.from].join("|");(m[k]=m[k]||[]).push(t)});
// Two identical charges on one day that the same bank or card listed separately are two real purchases (two coffees from the same stall). It is only a possible duplicate when they came from different places (for example typed by hand and also imported), or were both typed by hand.
Object.values(m).forEach(a=>{if(a.length<2||a.some(t=>S.dupOk[t.id]))return;const srcs=new Set(a.map(t=>t.src||"")),one=srcs.size==1?[...srcs][0]:null;if(one!==null&&!["manual","csv",""].includes(one))return;a.slice(1).forEach(t=>DUPS.add(t.id))})}
const isXf=t=>XS.has(t.id);
// "Ignored" = kept in Activity but left out of every total (income, spending, reports, forecast). For double counts such as a refund that shows on the card and again in the bank.
const isIgn=t=>!!(S.txIgnore&&S.txIgnore[t.id]);
// A refund often appears twice: as a credit on the card and as a deposit in the bank. Same amount, a few days apart, one on a card and one on a bank or wallet.
function refundTwin(t){if(!(t.a>0)||t.virtual||isIgn(t)||isXf(t))return null;const kind=n=>(S.accounts.find(a=>a.n==n)||{}).kind,mine=kind(t.to);if(!mine)return null;
return S.tx.find(x=>x.id!=t.id&&x.a>0&&!isIgn(x)&&!isXf(x)&&Math.abs(x.a-t.a)<=.5&&Math.abs((new Date(x.d)-new Date(t.d))/864e5)<=10&&((mine=="card")!=(kind(x.to)=="card"))&&kind(x.to)&&kind(x.to)!="pension")||null}
const ymd=d=>d.getFullYear()+"-"+p2(d.getMonth()+1)+"-"+p2(d.getDate());
// bills expected in the next 31 days, shown in Activity as predicted rows (never counted, never saved)
// each time a hand-entered balance (pension, your own accounts) was changed shows in Activity as a note, never counted as income or spending
function balRows(){return(S.balUpdates||[]).map(u=>({id:"bu"+u.id,balUpd:true,virtual:true,d:iso(new Date(u.at)),desc:(u.old==null?u.acc+" started at "+fm(u.nu):u.acc+" balance: "+fm(u.old)+" → "+fm(u.nu)),from:u.acc,to:u.acc,a:u.nu-(u.old||0),c:"Balance update",tags:[],docs:[],note:u.note||""}))}
function upBillRows(){const lim=new Date(NOW.getTime()+31*864e5),fut=S.tx.filter(t=>String(t.d)>TODAY&&t.a<0),row=(b,d,late)=>({id:"ub"+b.idx+(late?"l":""),upBill:b.idx,virtual:true,late:!!late,d,desc:b.n,from:b.src||"",to:b.n,a:-b.pred,c:b.cat||"",tags:[],docs:[],note:""}),ok=b=>!b.once&&!b.irregular&&b.flag!="canceled";
// a bill whose day has come but whose charge the bank has not listed yet stays in the list ("not seen yet") until the charge appears or it is clearly late
return BC.filter(b=>ok(b)&&b.nx&&b.nx>NOW&&b.nx<=lim&&!fut.some(t=>(t.desc+" "+t.to).toLowerCase().includes(b.match)&&Math.abs((new Date(t.d)-b.nx)/864e5)<=6)).map(b=>row(b,ymd(b.nx))).concat(BC.filter(b=>ok(b)&&b.status=="pending"&&b.pd).map(b=>row(b,ymd(b.pd),true)))}
function costRows(){return S.xf.filter(x=>x.st!="rej").map(x=>{const o=byId(x.o),i=byId(x.i);if(!o||!i)return null;const c=-o.a-i.a;return c>.5?{id:"v"+x.o,virtual:true,d:o.d,desc:"Transfer cost · "+o.from+" → "+i.to,from:o.from,to:"Transfer fees / FX spread",a:-c,c:"Fees & FX costs",tags:[],docs:[],note:"",cost:c}:null}).filter(Boolean)}
let AC=null;const ALL=()=>S.tx.concat(costRows()),noRep=t=>NR.size>0&&(NR.has(t.from)||NR.has(t.to)),BTC=new Map(),acReset=()=>{AC=null;BTC.clear()},A=()=>{if(!AC){AC=S.tx.filter(t=>!XS.has(t.id)&&!isIgn(t)&&!isFuture(t)&&!isCardPay(t)&&!noRep(t)).concat(costRows());setTimeout(acReset,0)}return AC};
const nmOf=x=>String(x||"").replace(/\s*··.*$/,"").trim();
// the expected bill (not yet seen) that a drop in an account's balance most likely is
function gapBill(r){if(!(r.diff<0))return null;const need=-r.diff,t0=new Date(r.from).getTime()-2*864e5,t1=new Date(r.to).getTime()+2*864e5;return BC.find(b=>!b.once&&!b.irregular&&b.flag!="canceled"&&b.pd&&b.status!="paid"&&nmOf(b.src)==nmOf(r.n)&&Math.abs(b.pred-need)<=Math.max(1,b.pred*.03)&&b.pd>=t0&&b.pd<=t1)||null}
// Do these amounts (a card's pending charges) add up to the gap? One charge, all of them together, or a group of them, give or take a shekel.
function amountsFit(L,need){const near=v=>Math.abs(v-need)<=1;if(L.some(near))return true;if(L.length>1&&near(L.reduce((x,v)=>x+v,0)))return true;let budget=200000;const go=(k,from,left)=>{if(budget--<=0)return false;if(k==0)return Math.abs(left)<=1;for(let i=from;i<=L.length-k;i++)if(go(k-1,i+1,left-L[i]))return true;return false};for(let k=2;k<L.length;k++)if(go(k,0,need))return true;return false}
// a gap that the pending charges in the app already explain: a card balance includes a pending charge, so there is nothing to review
function pendCover(r){const need=Math.abs(r.diff);if(!need)return false;const t0=new Date(r.from).getTime()-7*864e5,t1=new Date(r.to).getTime()+7*864e5,sg=Math.sign(r.diff);
const L=S.tx.filter(t=>t.pending&&!t.virtual&&Math.sign(t.a)==sg&&nmOf(t.a<0?t.from:t.to)==nmOf(r.n)).filter(t=>{const d=new Date(t.d).getTime();return d>=t0&&d<=t1}).map(t=>Math.abs(r.cur=="ILS"?t.a:t.orig&&t.orig.cur==r.cur?t.orig.amt:0)).filter(x=>x>0);return amountsFit(L.slice(0,40),need)}
const recon=()=>S.gaps.filter(g=>g.status=="open"&&g.remaining!=0).map(g=>({id:g.id,n:g.account,cur:g.currency,diff:g.remaining,amount:g.amount,from:g.window_from,to:g.window_to})).filter(r=>!pendCover(r));
// the gaps that really need a look: not explained by a pending charge, and not an expected bill the bank has not listed yet (that one is only an alert)
const reviewGaps=()=>recon().filter(r=>!gapBill(r));
// Rule text and transaction text are compared in the same plain form (lower case, numbers and punctuation turned into spaces), against the description and the store.
// Without that, a rule made from "SUPER-PHARM #123" ("super pharm") never matched the text it came from.
function rn(s){return String(s==null?"":s).toLowerCase().replace(/[0-9*#_\/\\\-.,:;()'"\u05f3\u05f4]+/g," ").replace(/\s+/g," ").trim()}
function ruleHit(t,k){const q=rn(k);return q.length>0&&rn(t.desc+" "+(t.to||"")+" "+(t.from||"")).includes(q)}
// display names: a name you give one entry, or a rule ("if the memo contains ..., call it ..."). Only what is shown changes; the bank's own text stays as it was.
const NFIELDS={any:"Anything",desc:"Description",memo:"Memo",from:"From",to:"To",note:"Note"};
const nameField=(t,f)=>f=="desc"?t.desc:f=="memo"?t.memo:f=="from"?t.from:f=="to"?t.to:f=="note"?t.note:[t.desc,t.memo,t.bd,t.from,t.to,t.note].filter(Boolean).join(" ");
function nameHit(t,r){const q=rn(r.k);if(!q)return false;const v=rn(nameField(t,r.f||"any"));return r.m=="eq"?v==q:v.includes(q)}
const nohtml=s=>String(s==null?"":s).replace(/<[^>]*>/g,"").replace(/&nbsp;/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,"&").trim();
function dn(t){const c=S.cfg||{},o=c.renames&&c.renames[t.id];if(o)return o;if(c.nameRules){const r=c.nameRules.find(x=>nameHit(t,x));if(r)return r.n}return nohtml(t.desc)}
function setName(id,v){const t=byId(id);if(!t)return;S.cfg.renames=S.cfg.renames||{};v=(v||"").trim().slice(0,80);const old=S.cfg.renames[id]||"";if(v==old)return;if(v)S.cfg.renames[id]=v;else delete S.cfg.renames[id];log("Renamed an entry",t.desc+": "+(old||"—")+" → "+(v||"—"));renderAll();const h=document.querySelector(".txh2 h3");if(h)h.textContent=dn(t);const i=document.querySelector("[data-c=txname]");if(i)i.placeholder=dn(t)}
function applyRules(){S.tx.forEach(t=>{if(!t.c&&!isXf(t)){const r=S.rules.find(r=>ruleHit(t,r.k));if(r)t.c=r.c}})}
function spend(){const m={};A().filter(t=>t.a<0&&rdOf(t).startsWith(MK)).forEach(t=>{const c=t.c||"Uncategorized";m[c]=(m[c]||0)+Math.abs(t.a)});return Object.entries(m).sort((a,b)=>b[1]-a[1])}
const monthSum=(k,sg)=>A().filter(t=>(sg>0?t.a>0:t.a<0)&&rdOf(t).startsWith(k)).reduce((s,t)=>s+Math.abs(t.a),0);
const heldOf=j=>Math.max(0,(+j.bal||0)-(+j.out||0)),jarClamp=j=>{j.out=Math.min(+j.out||0,Math.max(0,+j.bal||0))}, // heldOf: the part of a jar that sits in your accounts (the rest is saved elsewhere, or already paid back)
jarsS=()=>S.jars.filter(j=>!j.done).sort((a,b)=>a.p-b.p),jarsDone=()=>S.jars.filter(j=>j.done).sort((a,b)=>b.done.localeCompare(a.done));
const cashNow=()=>cashAccts().reduce((s,a)=>s+accILS(a),0),custNW=()=>accts.filter(a=>a.kind=="custom"&&a.inNW).reduce((s,a)=>s+accILS(a),0); // custom accounts you count in net worth are not cash for jars
// Money already spoken for this month: bills still to pay and the unspent part of each budget. Fixed charges (bills) and limits (budgets) never count twice:
// per category the bigger of the two is held back. A category with no budget falls back to its average of the last complete months. A jar tied to a bill holds that bill's money itself.
const RSKIP=k=>["Income","Uncategorized","Fees & FX costs"].includes(k)||S.cats[k]===99;
function reserveCalc(){const sp=Object.fromEntries(spend()),M=monthlyByCat(),idx=budMonths(),linked=new Set(jarsS().map(j=>j.bill).filter(Boolean)),allB=linked.has("*")||linked.has("*a"),useAvg=S.cfg.reserveAvg!==false;
const bills={},cov={};billsInfo().forEach(b=>{if(b.once||b.irregular||!b.nx)return;const m=k=>k.toISOString().slice(0,7),unpaid=(b.status=="overdue"||b.status=="pending")&&(NOW-b.pd)/864e5<=45,comes=m(b.nx)==MK;if(!unpaid&&!comes)return;const k=b.cat||"Other bills";if(allB||linked.has(b.match)){cov[k]=(cov[k]||0)+b.pred;return}(bills[k]=bills[k]||[]).push({n:b.n,amt:b.pred,overdue:b.status=="overdue"})});
const keys=new Set([...Object.keys(S.budgets),...Object.keys(bills)]);if(useAvg&&idx.length>=2)Object.keys(M).forEach(k=>{if(!RSKIP(k))keys.add(k)});
const cand=[],done=[];keys.forEach(k=>{const bl=(bills[k]||[]).reduce((s,x)=>s+x.amt,0),spent=sp[k]||0;let base=0,kind="";
if(k in S.budgets){base=S.budgets[k];kind="budget"}else if(useAvg&&idx.length>=2&&!RSKIP(k)){base=idx.reduce((s,m)=>s+((M[k]||{})[m]||0),0)/idx.length;kind="typical"}
const left=Math.max(0,base-spent-(cov[k]||0)),amt=Math.max(bl,left);if(amt<1){if(spent>=1&&base>0)done.push({k,base,spent,kind,over:spent>base+.5});return}cand.push({k,amt,kind:bl>=left&&bl>0?"bill":kind,bills:bills[k]||[],base,spent,bl,bcov:cov[k]||0})});
// a jar that pays for a category covers what is left in it, up to what the jar holds (its money is shared by all its categories, biggest first)
const rows=[],CJ=catJars(),pool={},jarCov=[];Object.values(CJ).forEach(x=>pool[x.j.id]=x.j.kind=="payoff"?heldOf(x.j):Math.max(0,+x.j.bal||0));
cand.sort((a,b)=>b.amt-a.amt).forEach(r=>{const c=CJ[r.k];let amt=r.amt;if(c){const take=Math.min(pool[c.j.id],amt);pool[c.j.id]-=take;amt-=take;if(take>=1)jarCov.push({k:r.k,jar:c.j.n,cov:take,of:r.amt})}if(amt<1)return;rows.push({...r,amt,jar:c?c.j.n:"",jarCov:c?r.amt-amt:0})});
rows.sort((a,b)=>b.amt-a.amt);const tot=rows.reduce((s,r)=>s+r.amt,0),b=rows.filter(r=>r.kind=="bill").reduce((s,r)=>s+r.amt,0);
return{total:tot,rows,bills:b,limits:tot-b,jarCov,done}}
const irrBills=()=>BC.filter(b=>!b.once&&b.irregular&&b.flag!="canceled"&&b.mo>0),ALLN={"*":"All regular bills","*i":"All irregular bills","*a":"All bills"},isAll=k=>k in ALLN,allBills=k=>k=="*i"?irrBills():k=="*a"?[...recBills(),...irrBills()]:recBills(),allMo=k=>allBills(k).reduce((t,b)=>t+b.mo,0),
recBills=()=>BC.filter(b=>!b.once&&!b.irregular&&b.flag!="canceled"&&b.mo>0),billMo=k=>recBills().filter(b=>b.cat==k).reduce((s,b)=>s+b.mo,0);
// the categories a jar pays for (one jar per category): { category: { j: the jar, since: first day that counts } }
const catJars=()=>{const m={};jarsS().forEach(j=>(j.cats||[]).forEach(x=>{if(!m[x.c])m[x.c]={j,since:x.since}}));return m};
const jarCovered=()=>jarsS().filter(j=>j.bill).map(j=>({jar:j.n,bills:isAll(j.bill)?allBills(j.bill):recBills().filter(b=>b.match==j.bill)})).filter(x=>x.bills.length);
function jarFree(){const cash=cashNow(),inJars=jarsS().reduce((s,j)=>s+heldOf(j),0),buffer=Math.max(0,+S.jarsBuffer||0),R=reserveCalc(),reserve=R.total;const raw=cash-inJars-buffer-reserve;return{cash,inJars,buffer,reserve,R,raw,over:-raw>=1?Math.round(-raw):0,free:Math.max(0,raw)}}
// jars fill from the money you actually have: balance minus what is already in jars minus what you keep untouched
function jarCalc(){const F=jarFree();let rem=F.free,gotT=0,stillT=0;const out=jarsS().map(j=>{const got=Math.min(+j.got||0,Math.max(0,+j.bal||0)+(+j.paid||0)),open=!(j.need>0),capE=capOf(j,got),need=open?0:Math.max(0,j.need-j.bal),want=capE==null?need:Math.max(0,Math.min(capE-got,open?1e12:need)),give=Math.max(0,Math.min(rem,want));rem-=give;gotT+=got;stillT+=want;return{...j,got,want,give,capE,open}});return{out,rem,gotT,stillT,...F}}
// Spending in a category a jar pays for comes out of that jar by itself. Only real expenses dated on or after the link count;
// one that was detached by hand, or that found the jar empty, is left alone for that category. Moving a payment to another category sends the money back.
function jarAuto(){const CJ=catJars();let n=0,tot=0,back=0;
S.tx.forEach(t=>{if(t.virtual)return;
if(t.jar&&t.jar.auto){const j=S.jars.find(x=>x.id==t.jar.id),c=CJ[t.c];if(!j||j.done||!c||c.j.id!=j.id){if(j&&!j.done)jarUnpay(j,+t.jar.amt||0,"Category no longer linked");delete t.jar;back++}return}
if(t.jar||!(t.a<0)||t.pending||!t.c||isXf(t)||isIgn(t)||isCardPay(t)||isFuture(t))return;const c=CJ[t.c];if(!c||t.d<c.since||t.jarNo===t.c)return;
const a=jarPay(c.j,t,Math.abs(t.a));if(a>0){t.jar={id:c.j.id,amt:a,auto:true};n++;tot+=a}else t.jarNo=t.c});
if(n)log("Paid from jars automatically",n+" payment"+(n>1?"s":"")+" · "+fm(tot),null,"System");if(back)log("Payments returned to jars",back+" payment"+(back>1?"s":"")+" no longer match a linked category",null,"System")}
const monthsTo=d=>Math.max(1,Math.ceil((new Date(d)-NOW)/(864e5*30.44)));
// A jar with no goal (target 0) just puts its monthly amount aside. With "auto" and a deadline it works out its own monthly amount.
const capOf=(j,got,off)=>j.cap==null?null:(j.auto&&j.due&&j.need>0)?Math.max(0,Math.ceil((j.need-(j.bal-(got||0)))/Math.max(1,monthsTo(j.due)-(off||0)))):j.cap;
