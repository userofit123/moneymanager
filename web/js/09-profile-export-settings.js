/* ---------- suggestions: things the app offers to do for you. They wait here until you act on them or clear them. ---------- */
let SUGG=[];try{SUGG=JSON.parse(localStorage.getItem("moneySugg")||"[]").filter(x=>x&&x.key&&x.title).slice(0,30)}catch(e){}
const suggSave=()=>{try{localStorage.setItem("moneySugg",JSON.stringify(SUGG))}catch(e){}suggUI()};
// a suggestion is saved in the lightbulb list and also shown right away, with its buttons, so it is never missed
function addSugg(x){SUGG=SUGG.filter(y=>y.key!==x.key);SUGG.unshift({...x,t:Date.now()});SUGG=SUGG.slice(0,30);suggSave();const b=$("suggBtn");if(b){b.classList.remove("pop2");void b.offsetWidth;b.classList.add("pop2")}
toast(x.text,{title:x.title,kind:"sugg",ms:16000,actions:[...x.actions.map(a=>({...a,sk:x.key})),{label:"Not now",a:"toastNo"}]})}
function suggUI(){let b=$("suggBtn");if(!b){b=document.createElement("button");b.id="suggBtn";b.className="sugb";b.dataset.a="suggOpen";b.setAttribute("aria-label","Suggestions");b.innerHTML='<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg><i></i>';const st=document.querySelector(".fabx");st?st.prepend(b):document.body.appendChild(b)}
b.style.display=SUGG.length?"grid":"none";b.querySelector("i").textContent=SUGG.length;b.dataset.tip="Suggestions: things the app can do for you"}
function suggOpen(){if(!SUGG.length){closeSheet();return}openSheet(`<h3>Suggestions</h3><div class="sm" style="margin-bottom:12px;line-height:1.5">Things the app noticed and can do for you. They stay here until you act on them or clear them.</div>${SUGG.map(x=>`<div class="sgi"><b>${esc(x.title)}</b><div class="sm" style="margin:3px 0 10px;line-height:1.5">${esc(x.text)}</div><div class="flex" style="gap:8px;flex-wrap:wrap">${x.actions.map(a=>`<button class="btn s" data-a="${a.a}" data-id="${esc(a.id||"")}" data-sk="${esc(x.key)}">${esc(a.label)}</button>`).join("")}<button class="btn o s" data-a="suggDismiss" data-sk="${esc(x.key)}">Dismiss</button></div></div>`).join("")}<div class="flex" style="justify-content:space-between;gap:10px;margin-top:14px"><button class="btn o" data-a="suggClear">Clear all</button><button class="btn" data-a="close">Close</button></div>`)}
document.addEventListener("click",e=>{const el=e.target.closest&&e.target.closest("[data-sk]");if(!el)return;const k=el.dataset.sk;if(el.dataset.a=="suggDismiss"){SUGG=SUGG.filter(x=>x.key!==k);suggSave();SUGG.length?suggOpen():closeSheet();return}setTimeout(()=>{SUGG=SUGG.filter(x=>x.key!==k);suggSave()},0)},true);
/* ---------- search and "add" bars above the lists on the Categories pages ---------- */
const RQ={},RS={setCats:["Search categories…","cat"],setRules:["Search rules by text or category…"],setTags:["Search tags…"],setTagrules:["Search rules by text or tag…"],setGen:["Search rules…"]};
function rsApply(){Object.keys(RS).forEach(id=>{const el=$(id);if(!el)return;let bar=el.querySelector(":scope>.rtool");
if(!bar){bar=document.createElement("div");bar.className="rtool";bar.innerHTML=`<input class="rsearch" type="search" data-rs="${id}" placeholder="${RS[id][0]}" aria-label="Search" autocomplete="off" value="${esc(RQ[id]||"")}">`+(RS[id][1]=="cat"?`<input id="nc" class="rnew" placeholder="New category name" maxlength="60" autocomplete="off"><button class="btn s" data-a="catAdd">+ Add category</button>`:"");el.prepend(bar)}
const q=(RQ[id]||"").trim().toLowerCase();let n=0,tot=0;el.querySelectorAll(".rule,.mrow").forEach(r=>{tot++;const hay=(r.textContent+" "+[...r.querySelectorAll("input,select")].map(i=>i.tagName=="SELECT"?(i.options[i.selectedIndex]?i.options[i.selectedIndex].text:""):i.value).join(" ")).toLowerCase(),hit=!q||hay.includes(q);r.hidden=!hit;if(hit)n++});
el.querySelectorAll(".rsnone").forEach(x=>x.remove());if(q&&tot&&!n){const m=document.createElement("div");m.className="rsnone sm";m.textContent="Nothing matches “"+(RQ[id]||"").trim()+"”.";bar.after(m)}})}
document.addEventListener("input",e=>{const t=e.target;if(t&&t.classList&&t.classList.contains("rsearch")){RQ[t.dataset.rs]=t.value;rsApply()}});
/* ---------- "Money Manager has been updated": shown once per version, with what changed ---------- */

/* ---------- profile: the name, age and gender behind the greeting on Home (all optional) ---------- */
const PROF=()=>(S.cfg&&S.cfg.profile)||{};
const profAge=()=>{const p=PROF(),a=parseInt(p.age,10);return a>0?a+Math.max(0,(+p.ageYear?new Date().getFullYear()-p.ageYear:0)):0};
let GREET_SEED=1;try{GREET_SEED=(parseInt(localStorage.getItem("moneyGreet"),10)||0)+1;localStorage.setItem("moneyGreet",String(GREET_SEED))}catch(e){}
// each part of the day has a list of greetings; every time the app opens it moves one step along the list
const GREET_EN={m:["Good morning, {n}","Rise and shine, {n}","Morning, {n}","Hope your day starts well, {n}"],a:["Good afternoon, {n}","Hello, {n}","Good to see you, {n}","Welcome back, {n}"],e:["Good evening, {n}","Evening, {n}","Welcome back, {n}","Hello, {n}"],n:["Good evening, {n}","Still up, {n}?","Evening check-in, {n}","A quiet night, {n}"],l:["Late night, {n}?","Burning the midnight oil, {n}?","Up late, {n}?","Can't sleep, {n}?"]};
const GREET_HE={m:["בוקר טוב, {n}","בוקר אור, {n}","{wel}, {n}","שיהיה לך בוקר מוצלח, {n}"],a:["צהריים טובים, {n}","שלום, {n}","{wel}, {n}","אחר צהריים טובים, {n}"],e:["ערב טוב, {n}","ערב נעים, {n}","{wel}, {n}","שלום, {n}"],n:["ערב טוב, {n}","ערב שקט, {n}","עדיין {up}, {n}?","לילה טוב, {n}"],l:["עדיין {up}, {n}?","מאוחר, {n}…","{up} עד מאוחר, {n}?","לילה טוב, {n}"]};
const HE_G={f:{wel:"ברוכה הבאה",up:"ערה"},m:{wel:"ברוך הבא",up:"ער"},o:{wel:"ברוכים הבאים",up:"ערים"}};
function greeting(){const p=PROF(),name=String(p.name||"").trim(),h=new Date().getHours(),band=h<1?"n":h<5?"l":h<12?"m":h<17?"a":h<21?"e":"n",he=!!(window.HE&&HE.on),L=(he?GREET_HE:GREET_EN)[band];
let t=L[GREET_SEED%L.length];if(he){const g=HE_G[p.gender=="f"||p.gender=="m"?p.gender:"o"];t=t.replace(/\{wel\}/g,g.wel).replace(/\{up\}/g,g.up)}
if(!name)t=t.replace(/,? ?\{n\}/,"");
return {text:t,name}}
function renderHead(v){v=v||curView||"dash";const h=$("title"),hd=document.querySelector("header");if(hd)hd.style.display=v=="recap"?"none":"";
delete h.dataset.g;h.textContent=TITLES[v]||""
const he=!!(window.HE&&HE.on);$("date").textContent=new Date().toLocaleDateString(he?"he-IL":"en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
const PF_GENDER=[["","Prefer not to say"],["f","Female"],["m","Male"]];
const PF_GOAL=[["","Not sure yet"],["save","Save more"],["debt","Pay off debt"],["spend","Understand my spending"],["retire","Plan for the future"]];
// the form is used twice, in Settings and in the first-run popup: only the prefix of the field ids differs
function profFields(px){const p=PROF(),o=(L,v)=>L.map(([k,t])=>`<option value="${k}" ${k==(v||"")?"selected":""}>${t}</option>`).join(""),age=profAge();
return `<div class="fld"><label for="${px}Name">Name</label><input id="${px}Name" value="${esc(p.name||"")}" maxlength="40" autocomplete="off" placeholder="What should we call you?"><div class="sm">We use it to greet you on the Recap page. It is only shown to you.</div></div>
<div class="two"><div class="fld"><label for="${px}Age">Age</label><input id="${px}Age" type="number" inputmode="numeric" min="10" max="110" value="${age||""}" placeholder="e.g. 34"><div class="sm">So you can set goals such as “reach ₪200,000 by age 40”. We keep it up to date as the years pass.</div></div>
<div class="fld"><label for="${px}Gender">Gender</label><select id="${px}Gender">${o(PF_GENDER,p.gender)}</select><div class="sm">In Hebrew, words change for women and men. This lets the app speak to you correctly.</div></div></div>
<div class="fld"><label for="${px}Goal">What matters most to you</label><select id="${px}Goal">${o(PF_GOAL,p.goal)}</select><div class="sm">Helps us decide what to point out first. Nothing changes without you.</div></div>`}
function profRead(px){const g=id=>$(px+id)?$(px+id).value:"",age=parseInt(g("Age"),10);
return {name:g("Name").trim().slice(0,40),...(age>=10&&age<=110?{age,ageYear:new Date().getFullYear()}:{}),gender:g("Gender"),goal:g("Goal"),asked:1}}
function renderProfile(){const el=$("setProf");if(!el)return;if(el.contains(document.activeElement)&&document.activeElement.matches("input,select"))return;
el.innerHTML=`<div class="card ss">${ssh("user","Profile","Everything here is optional. It stays in your own data and is never sent anywhere.")}<div class="ssb p">${profFields("pf")}<div class="flex" style="justify-content:flex-end;gap:10px"><button class="btn o" data-a="profClear">Clear profile</button><button class="btn" data-a="profSave">Save</button></div></div></div>`}
function profSave(px){const old=PROF(),n=profRead(px);S.cfg=S.cfg||{};S.cfg.profile=n;log("Updated profile",n.name?n.name:"no name");renderAll()}
// first run: offer the profile once. Dismissing it, or saving it, is remembered for good.
function profileAsk(){if(!loaded||(S.cfg&&S.cfg.profile)||$("profPop")||$("updPop")||document.querySelector(".sheet.on,.wnp"))return;
const d=document.createElement("div");d.id="profPop";d.className="wnp";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");
d.innerHTML=`<div class="wnc"><div class="wnh"><span class="wnu"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg></span><div><h3>Make it yours</h3><div class="sm">Tell us a little about you. Every field is optional.</div></div></div><div class="wnb">${profFields("pp")}</div><div class="wnf"><button class="btn o" data-a="profSkip">Not now</button><button class="btn" data-a="profPopSave">Save</button></div></div>`;
document.body.appendChild(d);const f=$("ppName");if(f)f.focus();
document.addEventListener("keydown",function k(e){if(!$("profPop")){document.removeEventListener("keydown",k);return}if(e.key=="Escape")profSkip()})}
function profSkip(){const e=$("profPop");if(e)e.remove();S.cfg=S.cfg||{};if(!S.cfg.profile)S.cfg.profile={asked:1};save();toast("You can add this later in Settings → Profile",{kind:"info"})}
function updSeen(v){try{localStorage.setItem("moneySeenV",v)}catch(e){}}
function updClose(){const e=$("updPop");if(e)e.remove()}
async function updCheck(p){let j;try{j=await (p||fetch("/api/version",{cache:"no-store"}).then(r=>r.json()))}catch(e){return}if(!j)return;
const cur=j&&j.version;if(!cur||$("updPop"))return;let seen="";try{seen=localStorage.getItem("moneySeenV")||""}catch(e){}
if(seen==cur)return;
if(!seen&&!(S&&S.tx&&S.tx.length)){updSeen(cur);return} // a brand-new install has nothing to be updated from
const secs=relPick(j).filter(r=>!seen||vNewer(r.v,seen)).filter(r=>!vNewer(r.v,cur));
if(!secs.length){updSeen(cur);return}
const body=secs.map(r=>`<div class="wnv">${secs.length>1?"<span>Version</span> ⁦"+esc(r.v)+"⁩":""}</div>${mdLite(r.body.replace(/^### .*\n/gm,""))}`).join("");
const d=document.createElement("div");d.id="updPop";d.className="wnp";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");
d.innerHTML=`<div class="wnc"><div class="wnh"><span class="wnu"><svg viewBox="0 0 24 24"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg></span><div><h3>Money Manager has been updated</h3><div class="sm"><span>Now on version</span> ⁦${esc(cur)}⁩</div></div></div><div class="wnb">${body}</div><div class="wnf"><button class="btn o" data-a="updLog">Full change log</button><button class="btn" data-a="updOk">Got it</button></div></div>`;
document.body.appendChild(d);d.dataset.v=cur;d.addEventListener("click",e=>{if(e.target===d){updSeen(cur);updClose();setTimeout(profileAsk,350)}});
document.addEventListener("keydown",function k(e){if(e.key=="Escape"&&$("updPop")){updSeen(cur);updClose();setTimeout(profileAsk,350)}if(!$("updPop"))document.removeEventListener("keydown",k)});
const b=d.querySelector('[data-a=updOk]');if(b)b.focus()}
/* ---------- the sidebar highlight glides from one item to the next, like the tab bars ---------- */
const NBP={el:null,cur:null,anim:null,at:null,D:300};
/* The highlight is one rounded box. A click stretches it towards the new item (the edge facing the item leaves first, the other edge follows, and it gets thinner while it travels), then it settles on the item.
   The whole move is worked out once and handed to the browser as one "transform" animation, so it runs smoothly even while the new page is being drawn, and position and size can never get out of step. */
function navPill(animate){const nv=document.querySelector("nav");if(!nv)return;let p=NBP.el;
const b=nv.querySelector(".nb.on[data-v]"),ic=b&&b.querySelector(".ic");
if(!b||!ic||!b.offsetWidth){if(p)p.style.display="none";nv.classList.remove("pl");NBP.cur=null;if(NBP.anim){NBP.anim.cancel();NBP.anim=null}return}
if(!p||!p.isConnected){p=NBP.el=document.createElement("i");p.className="nbi";p.style.transformOrigin="0 0";nv.prepend(p)}
const to={x:b.offsetLeft+ic.offsetLeft,y:b.offsetTop+ic.offsetTop,w:ic.offsetWidth,h:ic.offsetHeight};
let from=NBP.cur;if(NBP.anim){if(NBP.at)from=NBP.at(Math.min(1,(NBP.anim.currentTime||0)/NBP.D));NBP.anim.cancel();NBP.anim=null}
p.style.display="";p.style.width=to.w+"px";p.style.height=to.h+"px";p.style.borderRadius=getComputedStyle(ic).borderTopLeftRadius;nv.classList.add("pl");
const set=r=>`translate(${r.x}px,${r.y}px) scale(${r.w/to.w},${r.h/to.h})`;
p.style.transform=set(to);NBP.cur=to;
if(!animate||!from||(from.x===to.x&&from.y===to.y&&from.w===to.w&&from.h===to.h)||matchMedia("(prefers-reduced-motion:reduce)").matches)return;
const vert=!document.documentElement.classList.contains("mob"),clamp=u=>Math.max(0,Math.min(1,u)),ease=u=>u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;
const a0=vert?from.y:from.x,a1=vert?to.y:to.x,l0=vert?from.h:from.w,l1=vert?to.h:to.w,c0=vert?from.x:from.y,c1=vert?to.x:to.y,m=vert?to.w:to.h,b0=a0+l0,b1=a1+l1,fwd=(a1+b1)>=(a0+b0);
NBP.at=u=>{const lead=1-Math.pow(1-clamp(u/.65),3),trail=ease(clamp((u-.25)/.75)),A=a0+(a1-a0)*(fwd?trail:lead),B=b0+(b1-b0)*(fwd?lead:trail),
 nr=1-.55*Math.sin(Math.PI*u),c=c0+(c1-c0)*ease(u),len=Math.max(1,B-A),th=m*nr,cc=c+(m-th)/2;
 return vert?{x:cc,y:A,w:th,h:len}:{x:A,y:cc,w:len,h:th}};
const N=24,frames=[];for(let i=0;i<=N;i++){const u=i/N,r=i==N?to:NBP.at(u);frames.push({transform:set(r),offset:u})}
NBP.anim=p.animate(frames,{duration:NBP.D,easing:"linear"});NBP.anim.onfinish=()=>{NBP.anim=null}}
new ResizeObserver(()=>navPill(false)).observe(document.querySelector("nav"));new MutationObserver(()=>navPill(false)).observe(document.documentElement,{attributes:true,attributeFilter:["data-rad","data-nav","data-nsp","class"]});addEventListener("resize",()=>navPill(false));if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>navPill(false));
suggUI();boot();setTimeout(()=>navPill(false),50);
/* ---------- export: choose exactly what leaves the app (a file on this device, nothing is sent anywhere) ---------- */
const EXCOLS=[["date","Date",t=>t.d],["desc","Description",t=>nohtml(t.desc)],["from","From",t=>nohtml(t.from)],["to","To",t=>nohtml(t.to)],["amount","Amount (₪)",t=>t.a],["ocur","Original currency",t=>t.orig?t.orig.cur:""],["oamt","Original amount",t=>t.orig?t.orig.amt:""],["cat","Category",t=>t.c||(isXf(t)?"Transfer":"Uncategorized")],["tags","Tags",t=>(t.tags||[]).join(" ")],["note","Note",t=>t.note||""],["docs","Attachments",t=>(t.docs||[]).join("; ")],["src","Source",t=>t.src||""],["id","ID",t=>t.id]];
const EXWHAT=[["tx","Transactions","One row per transaction, with the columns you pick"],["cat","Totals by category","Each category, month by month, with a total"],["bills","Bills","Regular, irregular and one-off bills the app tracks"],["budgets","Budgets","Monthly limits per category"],["jars","Jars and goals","Targets, balances and monthly amounts"],["accounts","Accounts and balances","Every account with its current balance"],["audit","Activity log","The history of changes made in the app"],["all","Everything (JSON backup)","The full data of the app in one file"]];
let EX=null;
const exDef=()=>({what:"tx",p:"all",from:"",to:"",cats:null,accts:null,ty:"all",q:"",tag:"",xf:false,cp:false,fut:false,fmt:"csv",cols:["date","desc","from","to","amount","cat","tags","note"]});
const exCat=t=>t.c||"Uncategorized";
function exTx(){const[a,b]=rangeOf({p:EX.p,from:EX.from,to:EX.to}),q=EX.q.toLowerCase(),tg=EX.tag.toLowerCase().replace(/^#/,"");
return ALL().filter(t=>rdOf(t)>=a&&rdOf(t)<=b&&(EX.xf||(!isXf(t)&&!isIgn(t)))&&(EX.cp||!isCardPay(t))&&(EX.fut||!isFuture(t))&&(EX.ty=="all"||(EX.ty=="income")==(t.a>0))&&(!EX.cats||EX.cats.has(exCat(t)))&&(!EX.accts||EX.accts.has(t.from)||EX.accts.has(t.to))&&(!q||(t.desc+" "+t.from+" "+t.to+" "+(t.note||"")).toLowerCase().includes(q))&&(!tg||(t.tags||[]).some(x=>x.toLowerCase()==tg))).sort((x,y)=>y.d.localeCompare(x.d)||String(y.id).localeCompare(String(x.id)))}
function exData(){const w=EX.what;
if(w=="tx"){const cols=EXCOLS.filter(c=>EX.cols.includes(c[0])),L=exTx();return{head:cols.map(c=>c[1]),rows:L.map(t=>cols.map(c=>c[2](t))),n:L.length,L}}
if(w=="cat"){const L=exTx().filter(t=>!isXf(t)),ms=[...new Set(L.map(t=>rdOf(t).slice(0,7)))].sort(),M={};L.forEach(t=>{const k=(t.a>0?"Income":"Expense")+"|"+exCat(t),r=M[k]=M[k]||{};r[rdOf(t).slice(0,7)]=(r[rdOf(t).slice(0,7)]||0)+t.a});
const rows=Object.entries(M).map(([k,r])=>{const[ty,c]=k.split("|");return[c,ty,...ms.map(m=>+(r[m]||0).toFixed(2)),+ms.reduce((s,m)=>s+(r[m]||0),0).toFixed(2)]}).sort((x,y)=>x[1].localeCompare(y[1])||Math.abs(y[y.length-1])-Math.abs(x[x.length-1]));return{head:["Category","Type",...ms,"Total (₪)"],rows,n:rows.length}}
if(w=="bills"){const keys=[...new Set(S.bills.flatMap(b=>Object.keys(b).filter(k=>["string","number","boolean"].includes(typeof b[k]))))];return{head:keys,rows:S.bills.map(b=>keys.map(k=>b[k]==null?"":b[k])),n:S.bills.length}}
if(w=="budgets"){const rows=Object.entries(S.budgets).map(([k,v])=>[k,v]);return{head:["Category","Monthly limit (₪)"],rows,n:rows.length}}
if(w=="jars"){const rows=jarsS().map(j=>[j.n,j.need,j.bal,j.cap==null?"refill to target":j.cap,j.due||"",j.p]);return{head:["Jar","Target (₪)","Saved (₪)","Per month (₪)","Deadline","Priority"],rows,n:rows.length}}
if(w=="accounts"){const rows=S.accounts.map(a=>[a.n,a.cur,a.kind,a.v,a.at||""]);return{head:["Account","Currency","Kind","Balance","As of"],rows,n:rows.length}}
if(w=="audit"){const rows=S.audit.map(a=>[a.t,a.who||"",a.action,a.detail||""]);return{head:["When","Who","Action","Detail"],rows,n:rows.length}}
return{head:[],rows:[],n:1,all:true}}
const exCsv=(head,rows)=>{const cell=v=>{let s=v==null?"":String(v);if(typeof v=="string"&&/^[=+\-@\t\r]/.test(s))s="'"+s;return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};return"﻿"+[head,...rows].map(r=>r.map(cell).join(",")).join("\r\n")}; // BOM so Excel reads Hebrew; a leading ' stops spreadsheets from running text as a formula
function exPrev(){if(!EX||!$("exPrev"))return;const d=exData();let h="";
const st=(v,l,c)=>`<div><b${c?` class="${c}"`:""}>${v}</b><span>${l}</span></div>`;
if(d.all)h=`<div class="sm">Everything in the app as one file (JSON), the same as the backup.</div>`;
else if(EX.what=="tx"){const inc=d.L.filter(t=>t.a>0).reduce((s,t)=>s+t.a,0),out=d.L.filter(t=>t.a<0).reduce((s,t)=>s+t.a,0);h=`<div class="exst">${st(d.n,d.n==1?"Transaction":"Transactions")}${st(fm(inc),"In","pos")}${st(fm(-out),"Out")}</div>`}
else h=`<div class="exst">${st(d.n,d.n==1?"Row":"Rows")}</div>`;
let sm="";if(!d.all&&d.rows.length)sm=`<div class="exsamp"><table class="rt"><thead><tr>${d.head.map(x=>`<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${d.rows.slice(0,6).map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${d.rows.length>6?`<div class="sm" style="margin-top:6px">…and ${d.rows.length-6} more</div>`:""}`;
$("exSamp").innerHTML=sm||`<div class="sm">Nothing to show.</div>`;$("exSampD").style.display=d.all?"none":"";
$("exPrev").innerHTML=h;$("exGo").disabled=!d.all&&(!d.rows.length||(EX.what=="tx"&&!EX.cols.length))}
function exAcctList(){return S.accounts.map(a=>`<label class="exo" style="display:flex;margin:0"><input type="checkbox" data-ex="acct" value="${esc(a.n)}" ${!EX.accts||EX.accts.has(a.n)?"checked":""}> ${esc(a.n)} · ${esc(a.cur)}</label>`).join("")}
function exCatList(){const q=($("exCq")||{value:""}).value.toLowerCase();return catNames().filter(c=>c.toLowerCase().includes(q)).map(c=>`<label class="exo" style="display:flex;margin:0 0 4px"><input type="checkbox" data-ex="cat" value="${esc(c)}" ${!EX.cats||EX.cats.has(c)?"checked":""}><span class="dot" style="background:${cc(c)}"></span> ${esc(c)}</label>`).join("")||`<div class="sm">No category matches.</div>`}
let EXON=false,EXFROM="activity";
function openExport(from){EXFROM=from||"";EXON=false;txTab="exp";nav("tx");renderTx()}
function buildExport(){const from=EXFROM;EXON=true;EX=exDef();if(from=="activity"){const q=$("q").value,s=$("fSrc").value,c=$("fCat").value,ty=$("fTy").value,r=RNG.tx;EX.p=r.p;EX.from=r.from;EX.to=r.to;EX.q=q;if(s)EX.accts=new Set([s]);if(c)EX.cats=new Set([c]);if($("fTag").value)EX.tag=$("fTag").value;if(ty=="income"||ty=="expense")EX.ty=ty;if(ty=="transfer"||ty=="cardpay"){EX.xf=ty=="transfer";EX.cp=ty=="cardpay";}}
const sel=(k,o)=>o.map(([v,t])=>`<option value="${v}" ${EX[k]==v?"selected":""}>${t}</option>`).join(""),tg=(k,l,tip)=>`<label class="tg" ${tip?`data-tip="${tip}"`:""}><span>${l}</span><input type="checkbox" data-ex="${k}" ${EX[k]?"checked":""}></label>`;
$("txExp").innerHTML=`<div class="exp"><div class="exhead"><h3>Export</h3></div><div class="exlay"><div class="excol">
<div class="card exsec"><div class="exs"><div class="exh">What to export</div><div class="fld" style="margin:0"><select data-ex="what">${sel("what",EXWHAT.map(([v,t])=>[v,t]))}</select><div class="sm" id="exWhatD" style="margin-top:6px"></div></div></div></div>
<div id="exFilt" class="excol">
<div class="card exsec"><div class="exs"><div class="exh">Period and type</div><div class="two"><div class="fld"><label>Period</label><select data-ex="p">${sel("p",RANGES)}</select></div><div class="fld"><label>Type</label><select data-ex="ty">${sel("ty",[["all","Income and expenses"],["income","Income only"],["expense","Expenses only"]])}</select></div></div><div class="fld" id="exCust" style="display:none"><label>From → to</label><div class="flex" style="gap:6px"><input type="date" data-ex="from"><input type="date" data-ex="to"></div></div></div></div>
<div class="card exsec"><div class="exs"><div class="exh">Also include</div><div class="exbox exrows">${tg("xf","Transfers between my own accounts","Money moved between your accounts. Left out by default because it is neither income nor spending.")}${tg("cp","Credit card bill payments from the bank","The bank side of a card bill. Left out by default because the purchases are already listed on the card.")}${tg("fut","Upcoming payments and bills that have not happened yet","Items the bank listed ahead of time, or bills the app expects. They are not real transactions yet, so they are left out unless you switch this on.")}</div></div></div>
<details class="card exsec exd" id="exMoreF" open><summary><span>More filters</span><span class="sm" id="exMf"></span></summary><div class="exdb">
<div class="exgrp"><div class="two"><div class="fld"><label>Text contains</label><input data-ex="q" placeholder="Store, person or note" value="${esc(EX.q)}"></div><div class="fld"><label>Tag</label><input data-ex="tag" placeholder="e.g. vacation" value="${esc(EX.tag)}"></div></div></div>
<div class="exgrp"><div class="exgh"><span class="exh">Categories <span id="exCn"></span></span><span class="exgb"><button class="btn o s" data-a="exCats" data-v="all">All</button><button class="btn o s" data-a="exCats" data-v="none">None</button></span></div><input id="exCq" placeholder="Find a category…" data-ex="cq" class="exfind"><div id="exCats" class="exgrid exscroll">${exCatList()}</div></div>
<div class="exgrp"><div class="exgh"><span class="exh">Accounts <span id="exAn"></span></span><span class="exgb"><button class="btn o s" data-a="exAccts" data-v="all">All</button><button class="btn o s" data-a="exAccts" data-v="none">None</button></span></div><div class="exgrid" id="exAccts">${exAcctList()}</div></div></div></details>
<details class="card exsec exd" id="exColsF" open><summary><span>Columns</span><span class="sm" id="exColN"></span></summary><div class="exdb"><div class="exgrp"><div class="exgh"><span class="exh">Columns in the file</span><span class="exgb"><button class="btn o s" data-a="exColsAll" data-v="all">All</button><button class="btn o s" data-a="exColsAll" data-v="none">None</button></span></div><div class="exgrid" id="exColsL">${EXCOLS.map(c=>`<label class="exo" style="display:flex;margin:0"><input type="checkbox" data-ex="col" value="${c[0]}" ${EX.cols.includes(c[0])?"checked":""}> ${c[1]}</label>`).join("")}</div></div></div></details>
</div></div>
<aside class="exside card"><div class="exs"><div class="exh">Preview</div><div id="exPrev" class="exprev"></div></div>
<div class="exs" id="exSampD"><div class="exh">First rows</div><div id="exSamp"></div></div>
<div class="exs"><div class="exh">File</div><div class="two" style="margin:0"><div class="fld" style="margin:0"><label>File name</label><div class="exname"><input data-ex="name" id="exName" maxlength="80" autocomplete="off" aria-label="File name"><span class="sm" id="exExt">.csv</span></div></div><div class="fld" style="margin:0"><label>File type</label><select data-ex="fmt">${sel("fmt",[["csv","CSV (opens in Excel or Sheets)"],["json","JSON"]])}</select></div></div></div>
<div class="exfoot"><button class="btn o" data-a="exReset">Reset</button><button class="btn" id="exGo" data-a="exGo">Download</button></div></aside></div></div>`;exSync()}
function exSync(){const w=EX.what,tx=w=="tx",cat=w=="cat";$("exFilt").style.display=tx||cat?"":"none";$("exColsF").style.display=tx?"":"none";{$("exName").placeholder=exFile();$("exExt").textContent=exExt();const n=[EX.q,EX.tag,EX.cats,EX.accts].filter(Boolean).length;$("exMf").textContent=n?n+" active":"";$("exColN").textContent=EX.cols.length+" of "+EXCOLS.length}$("exCust").style.display=EX.p=="custom"?"":"none";$("exWhatD").textContent=(EXWHAT.find(x=>x[0]==w)||[])[2]||"";
$("exCn").textContent=EX.cats?"· "+EX.cats.size+" selected":"· all";$("exAn").textContent=EX.accts?"· "+EX.accts.size+" selected":"· all";exPrev()}
const exExt=()=>EX.what=="all"||EX.fmt=="json"?".json":".csv",exFile=()=>`money-${EX.what}-${TODAY}`;
function exGo(){const d=exData(),stamp=TODAY,tag=EX.what;let body,mime,name;const base=(EX.name||"").trim().replace(/[\\/:*?"<>|\x00-\x1f]/g,"-").replace(/\.(csv|json)$/i,"").slice(0,80)||exFile();
if(d.all||EX.fmt=="json"){const o=d.all?S:d.rows.map(r=>Object.fromEntries(d.head.map((h,i)=>[h,r[i]])));body=JSON.stringify(o,null,1);mime="application/json";name=base+".json"}
else{body=exCsv(d.head,d.rows);mime="text/csv;charset=utf-8";name=base+".csv"}
const l=document.createElement("a");l.href=URL.createObjectURL(new Blob([body],{type:mime}));l.download=name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(l.href),4000);
log("Exported data",`${tag} · ${d.all?"all data":d.n+" rows"} · ${name}`);toast(`Downloaded ${name}. Look in your Downloads folder.`)}
document.addEventListener("input",e=>{const el=e.target.closest&&e.target.closest("[data-ex]");if(!el||!EX)return;const k=el.dataset.ex;
if(k=="cq"){$("exCats").innerHTML=exCatList();return}
if(k=="name"){EX.name=el.value;return}
if(k=="q"||k=="tag"||k=="from"||k=="to"){EX[k]=el.value;exPrev()}});
document.addEventListener("change",e=>{const el=e.target.closest&&e.target.closest("[data-ex]");if(!el||!EX)return;const k=el.dataset.ex;
if(k=="cat"){const all=catNames();if(!EX.cats)EX.cats=new Set(all);el.checked?EX.cats.add(el.value):EX.cats.delete(el.value);if(EX.cats.size==all.length)EX.cats=null}
else if(k=="acct"){const all=S.accounts.map(a=>a.n);if(!EX.accts)EX.accts=new Set(all);el.checked?EX.accts.add(el.value):EX.accts.delete(el.value);if(EX.accts.size==all.length)EX.accts=null}
else if(k=="col"){EX.cols=EXCOLS.map(c=>c[0]).filter(c=>c==el.value?el.checked:EX.cols.includes(c))}
else if(["xf","cp","fut"].includes(k))EX[k]=el.checked;
else if(["what","p","ty","fmt"].includes(k))EX[k]=el.value;
else return;exSync()});
/* ---------- roomier " · " separators everywhere ---------- */
(()=>{const SKIP=/^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|SELECT|TITLE)$/;let q=0,busy=false;
function pass(){q=0;busy=true;const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.nodeValue.includes(" · ")&&n.parentElement&&!SKIP.test(n.parentElement.tagName)&&!n.parentElement.closest("svg,.dt,[contenteditable]")?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}),L=[];while(w.nextNode())L.push(w.currentNode);
L.forEach(n=>{const f=document.createDocumentFragment();n.nodeValue.split(" · ").forEach((t,i)=>{if(i){const d=document.createElement("span");d.className="dt";d.textContent="·";f.appendChild(d)}if(t)f.appendChild(document.createTextNode(t))});const w=document.createElement("span");w.appendChild(f);n.replaceWith(w)});busy=false}
const TSKIP=/^(SCRIPT|STYLE|TEXTAREA|INPUT|TITLE)$/;
// amounts and numbers stay left-to-right inside Hebrew sentences (the \u2066 ... \u2069 isolates)
function trPass(){if(!HE.on)return;const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>/[A-Za-z]/.test(n.nodeValue)&&n.parentElement&&!TSKIP.test(n.parentElement.tagName)&&(!n.parentElement.closest(".mt,.mer:not(td),[data-nt],[data-g]:not(.ghead)")||n.parentElement.closest(".mrow"))?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}),L=[];while(w.nextNode())L.push(w.currentNode);
L.forEach(n=>{const v=n.nodeValue,o=n.parentElement;if(o.tagName=="OPTION"&&!o.hasAttribute("value"))o.setAttribute("value",v.trim()); // an option without a value attribute uses its text as the value: keep the English one
let r=HE.T(v);if(r!==v){n.nodeValue=r.replace(/→/g,"←").replace(/›/g,"‹").replace(/[−+]?₪?\d[\d,]*(?:\.\d+)?%?/g,"\u2066$&\u2069")}});
{const w2=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>/[₪$€£¥]/.test(n.nodeValue)&&!/[A-Za-z\u2066]/.test(n.nodeValue)&&n.parentElement&&!TSKIP.test(n.parentElement.tagName)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}),L2=[];while(w2.nextNode())L2.push(w2.currentNode);
L2.forEach(n=>{n.nodeValue=n.nodeValue.replace(/[−+-]?\s?[₪$€£¥]\s?\d[\d,]*(?:\.\d+)?%?/g,"\u2066$&\u2069")})}
document.querySelectorAll("input[disabled][value]").forEach(e=>{const v=e.value;if(/[A-Za-z]/.test(v)){const r=HE.T(v);if(r!==v)e.value=r}});
document.querySelectorAll("[placeholder],[title],[aria-label],[data-tip]").forEach(e=>{["placeholder","title","aria-label","data-tip"].forEach(a=>{const v=e.getAttribute(a);if(v&&/[A-Za-z]/.test(v)){const r=HE.T(v);if(r!==v)e.setAttribute(a,r.replace(/→/g,"←"))}})})}
function titleCase(){document.querySelectorAll(".lbl").forEach(e=>{const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);while(w.nextNode()){const n=w.currentNode,v=n.nodeValue;if(!/[a-z]/.test(v))continue;const r=v.replace(/(^|[\s(\/·\-–])([a-z])/g,(m,a,b)=>a+b.toUpperCase());if(r!==v)n.nodeValue=r}})}
const CAPS=".bd,.chip:not(.t):not(.dchip),.lbl,.pl,.badge-l";function caps(){document.querySelectorAll(CAPS).forEach(e=>{let n=e.firstChild;while(n&&n.nodeType==3&&!n.nodeValue.trim())n=n.nextSibling;if(n&&n.nodeType==3){const v=n.nodeValue,m=v.match(/^(\s*)([a-z])/);if(m)n.nodeValue=m[1]+m[2].toUpperCase()+v.slice(m[0].length)}})}
// bold the names, dates and amounts a sentence is about (after translation, so Hebrew sentences stay whole): <el data-em='["Name","^lead"]'>
function emph(){document.querySelectorAll("[data-em]:not([data-emd])").forEach(el=>{el.dataset.emd="1";let names=[];try{names=JSON.parse(el.dataset.em)}catch(e){}
const lead=names.includes("^lead"),toks=[];names.filter(x=>x&&x!="^lead").forEach(n=>{toks.push(n);if(window.HE&&HE.on){const h=HE.T(n);if(h&&h!==n)toks.push(h)}});
const x=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),re=new RegExp("("+[...toks.sort((a,b)=>b.length-a.length).map(x),"[\u2066\u2069]*\\d{1,2}[\u2066\u2069]* (?:[A-Z][a-z]{2,8}|ב[\u0590-\u05FF׳״]+)(?:,? [\u2066\u2069]*\\d{1,2}[\u2066\u2069]*:[\u2066\u2069]*\\d{2}[\u2066\u2069]*)?(?: [\u2066\u2069]*\\d{4}[\u2066\u2069]*)?","\\d{1,2}\\/\\d{1,2}\\/\\d{4}","[−+-]?[₪$€£¥]\\s?\\d[\\d,]*(?:\\.\\d+)?"].join("|")+")","g");
const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),L=[];while(w.nextNode())L.push(w.currentNode);
L.forEach(n=>{if(n.parentElement.closest("b"))return;const v=n.nodeValue,f=document.createDocumentFragment();let last=0,m,any=false,start=0;
if(lead){const lm=/^(\s*[^:.\n]{3,30}:)(?=\s)/.exec(v);if(lm&&/(causes|נפוצות)/.test(lm[1])){const b=document.createElement("b");b.textContent=lm[1];f.appendChild(b);start=lm[1].length;last=start;any=true}}
re.lastIndex=start;while((m=re.exec(v))){if(m.index>=last){if(m.index>last)f.appendChild(document.createTextNode(v.slice(last,m.index)));const b=document.createElement("b");b.textContent=m[0];f.appendChild(b);last=m.index+m[0].length;any=true}if(m[0].length==0)re.lastIndex++}
if(any){if(last<v.length)f.appendChild(document.createTextNode(v.slice(last)));n.replaceWith(f)}})})}
new MutationObserver(ms=>{if(mmQuiet(ms))return;if(!busy&&!q)q=requestAnimationFrame(()=>{pass();trPass();caps();titleCase();emph()})}).observe(document.body,{childList:true,subtree:true,characterData:true});pass();trPass();caps();titleCase();emph()})();

(()=>{const sh=document.getElementById("sheet");let y0=null,dy=0,ok=false;
sh.addEventListener("touchstart",e=>{if(!document.documentElement.classList.contains("mob"))return;y0=e.touches[0].clientY;dy=0;ok=sh.scrollTop<=0||!!e.target.closest(".grab");sh.style.transition="none"},{passive:true});
sh.addEventListener("touchmove",e=>{if(y0==null||!ok)return;dy=e.touches[0].clientY-y0;if(dy>0){sh.style.transform="translateY("+dy+"px)";if(e.cancelable)e.preventDefault()}else if(dy<0&&sh.scrollTop<=0){dy=0}},{passive:false});
sh.addEventListener("touchend",()=>{if(y0==null)return;const d=dy;y0=null;dy=0;sh.style.transition="transform .2s";if(d>90){sh.style.transform="translateY(100%)";setTimeout(()=>{closeSheet();sh.style.transform="";sh.style.transition=""},180)}else{sh.style.transform="";setTimeout(()=>{sh.style.transition=""},220)}});
sh.addEventListener("touchcancel",()=>{y0=null;sh.style.transform="";sh.style.transition=""})})();

(()=>{const sc=document.getElementById("scrim"),H=document.documentElement;let y=0;
new MutationObserver(()=>{const on=sc.classList.contains("on");if(on===H.classList.contains("sl"))return;
if(on){y=scrollY;H.classList.add("sl");if(H.classList.contains("mob"))document.body.style.top="-"+y+"px"}else{H.classList.remove("sl");document.body.style.top="";if(H.classList.contains("mob"))scrollTo(0,y)}}).observe(sc,{attributes:true,attributeFilter:["class"]});
sc.addEventListener("touchmove",e=>e.preventDefault(),{passive:false})})();

/* ---------- back button: closes the open popup first, then goes to the previous screen; the address keeps the page across a refresh ---------- */
(()=>{const sc=document.getElementById("scrim"),dv=document.getElementById("docv"),as=document.getElementById("assist");
const open=()=>sc.classList.contains("on")||!!DV||as.style.display=="block";
try{history.scrollRestoration="manual"}catch(e){}
history.replaceState({v:location.hash.slice(1)||viewFromPath()||"dash"},"");
const sync=()=>{const o=open(),st=history.state||{};if(o&&!st.o)history.pushState({o:1,v:curView},"",location.href);else if(!o&&st.o)history.back()};
const mo=new MutationObserver(sync);mo.observe(sc,{attributes:true,attributeFilter:["class"]});mo.observe(as,{attributes:true,attributeFilter:["style"]});mo.observe(dv,{attributes:true,attributeFilter:["style","class"]});
addEventListener("popstate",e=>{const st=e.state||{};
if(open()){if(as.style.display=="block")assistClose();else if(DV)closeDocs();else closeSheet();if(open())history.pushState({o:1,v:curView},"",location.href);return}
const v=st.v||location.hash.slice(1)||viewFromPath()||"dash";if(TITLES[v]&&v!=curView)nav(v,true)})})();

(()=>{const box=document.getElementById("nwc");if(!box)return;
box.addEventListener("change",e=>{const t=e.target;if(t.dataset.t=="trM"){TR.m=t.value;saveTR();renderNW()}else if(t.dataset.t=="trC"){TR.c=t.checked;saveTR();renderNW()}else if(t.dataset.t=="trP"){S.nwPension=t.checked;save();renderNW()}});
box.addEventListener("click",e=>{const b=e.target.closest("[data-t]");if(!b)return;if(b.dataset.t=="trR"){TR.r=+b.dataset.v;saveTR();renderNW()}else if(b.dataset.t=="trV"){TR.v=b.dataset.v;saveTR();renderNW()}});
let rt=null;const chk=()=>{clearTimeout(rt);rt=setTimeout(()=>{const a=document.getElementById("nwA");if(a&&a.clientWidth&&Math.abs(a.clientWidth-(TR._w||0))>24)renderNW()},120)};
// the chart is drawn at the width of its space: redraw when that changes, including when the Reports page is first shown
if(window.ResizeObserver)new ResizeObserver(chk).observe(box);addEventListener("resize",chk)})();

(()=>{const box=document.getElementById("setTagrules");if(!box)return;
box.addEventListener("change",e=>{const t=e.target;if(!t.dataset||t.dataset.c!="trk"||!t.dataset.i)return;const r=S.tagRules[+t.dataset.i];if(!r)return;const v=t.value.trim();if(!v){t.value=r.k;return}if(v==r.k)return;log("Changed tag rule",'"'+r.k+'" → "'+v+'"');r.k=v;renderAll();tagRuleAsk(+t.dataset.i)})})();
(()=>{const box=document.getElementById("setRules");if(!box)return;
box.addEventListener("change",e=>{const t=e.target,c=t.dataset&&t.dataset.c;if(!c||!c.startsWith("rule")||c=="rulek"&&false)return;if(!["rulek","rulec","rulet"].includes(c))return;const r=S.rules[+t.dataset.i];if(!r)return;
if(c=="rulec"){const old=r.c;if(old==t.value)return;r.c=t.value;log("Changed rule",'"'+r.k+'" → '+t.value+" (was "+old+")");const n=S.tx.filter(x=>!x.virtual&&x.c==old&&ruleHit(x,r.k)).length;renderAll();
toast(n?`New transactions with "${r.k}" now go to ${t.value}.`:`New transactions with "${r.k}" now go to ${t.value}.`,{title:"Rule updated",kind:"ok",ms:14000,actions:n?[{label:`Move ${n} past transaction${n==1?"":"s"} too`,a:"ruleApply",id:t.dataset.i+"|"+old},{label:"Leave them",a:"toastNo"}]:[]})}
else if(c=="rulek"){const v=t.value.trim();if(!v){t.value=r.k;return}if(v==r.k)return;log("Changed rule",'"'+r.k+'" → "'+v+'"');r.k=v;renderAll()}
else{const v=t.value.trim();if(v==(r.t||""))return;r.t=v;log("Changed rule tag",'"'+r.k+'" tag: '+(v||"none"));renderAll()}})})();

// hovering a line, a slice or a list entry brings that one forward and fades the rest
(()=>{const link=(root,sel,key,on)=>{root.classList.toggle("hv",on);root.querySelectorAll(sel).forEach(e=>e.classList.toggle("on",on&&e.getAttribute(key.attr)===key.v))};
document.addEventListener("mouseover",e=>{const t=e.target.closest&&e.target.closest("[data-s],[data-k]");if(!t)return;
if(t.dataset.s!==undefined){const r=t.closest("#lines");if(r)link(r,"[data-s]",{attr:"data-s",v:t.dataset.s},true)}
else{const r=t.closest(".dnt");if(r)link(r,"[data-k]",{attr:"data-k",v:t.dataset.k},true)}});
document.addEventListener("mouseout",e=>{const t=e.target.closest&&e.target.closest("[data-s],[data-k]");if(!t)return;const to=e.relatedTarget&&e.relatedTarget.closest&&e.relatedTarget.closest("[data-s],[data-k]");
const r=t.closest("#lines,.dnt");if(!r)return;if(to&&r.contains(to)&&(to.dataset.s!==undefined)===(t.dataset.s!==undefined))return;link(r,"[data-s],[data-k]",{attr:"data-x",v:""},false)})})();

/* sliding tab pill: one element that glides under the selected tab. Its corners follow where it is: round on the outer side at either end of the
   row, a softer round everywhere else. While it moves it stretches a little and settles. */
(()=>{const st=new Map(),RM=matchMedia("(prefers-reduced-motion: reduce)"),waiting=new Set();let raf=0,todo=new Set();
const KC=new WeakMap(),keyOf=(sg)=>{if(sg.id)return sg.id;let c=KC.get(sg);if(c)return c;c=keyOf0(sg);KC.set(sg,c);return c},keyOf0=(sg)=>{const b=sg.querySelector("button"),k=b?(b.dataset.a||b.dataset.t||"x"):"x";let n=0;for(const o of document.querySelectorAll(".seg")){if(o==sg)break;const ob=o.querySelector("button");if(ob&&(ob.dataset.a||ob.dataset.t||"x")==k)n++}return k+"#"+n};
const ease=t=>t<=0?0:t>=1?1:t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const rad=(R,M,L,Rt)=>{const a=L?R:M,b=Rt?R:M;return a+"px "+b+"px "+b+"px "+a+"px"};
const put=(p,g,l,r,rd,sy)=>{const e=p.firstChild;e.style.width=(r-l)+"px";e.style.height=(g.b-g.t)+"px";e.style.transform="translate("+l+"px,"+g.t+"px) scaleY("+(sy||1)+")";e.style.borderRadius=rd};
function sync(sg){const bs=[...sg.querySelectorAll(":scope>button")],b=sg.querySelector(":scope>button.on");let pill=sg.querySelector(":scope>.segi");if(!b){if(pill)pill.style.display="none";return}if(!sg.offsetWidth){waiting.add(sg);return}waiting.delete(sg);
 if(!pill){pill=document.createElement("i");pill.className="segi";pill.innerHTML="<b></b>";sg.prepend(pill);sg.classList.add("sl")}pill.style.display="";
 const k=keyOf(sg),idx=bs.indexOf(b),g={l:b.offsetLeft,r:b.offsetLeft+b.offsetWidth,t:b.offsetTop,b:b.offsetTop+b.offsetHeight},h=g.b-g.t,R=Math.round(Math.max(1,Math.min(parseFloat(getComputedStyle(b).borderTopLeftRadius)||99,h/2))),M=Math.min(R,Math.max(3,Math.round(h*.3)));
 const lo=Math.min(...bs.map(x=>x.offsetLeft)),hi=Math.max(...bs.map(x=>x.offsetLeft+x.offsetWidth)),rd=bs.length<2?R+"px":rad(R,M,g.l<=lo+1,g.r>=hi-1);
 let s=st.get(k);const e=pill.firstChild;
 const rest=()=>{if(s.anim){s.anim.cancel();s.anim=null}put(pill,g,g.l,g.r,rd);s.cur={l:g.l,r:g.r,rd};s.g=g};
 if(!s){s={idx,anim:null};st.set(k,s);put(pill,g,g.l,g.r,rd);s.cur={l:g.l,r:g.r,rd};s.g=g;return}
 if(s.snap){s.snap=false;s.idx=idx;rest();return}
 if(s.idx===idx){if(!s.anim)put(pill,g,g.l,g.r,rd);s.cur=s.anim?s.cur:{l:g.l,r:g.r,rd};return}
 s.idx=idx;
 if(RM.matches||!s.cur){rest();return}
 const from={...s.cur};if(s.anim){s.anim.cancel();s.anim=null}
 const dist=Math.abs(g.l-from.l),dur=Math.round(Math.min(350,250+dist*.1)) /* ends together with the page fade-in (.35s) */,N=24,sq=Math.min(.14,.05+dist/3000),kf=[];
 const c0=(from.l+from.r)/2,c1=(g.l+g.r)/2,w0=from.r-from.l,w1=g.r-g.l,stretch=Math.min(dist*.2,44);
 put(pill,g,from.l,from.r,from.rd);
 for(let i=0;i<=N;i++){const t=i/N,x=ease(t),sn=Math.sin(Math.PI*t),sy=1-sn*sq,c=c0+(c1-c0)*x,w=w0+(w1-w0)*x+stretch*sn;
  kf.push({width:w+"px",transform:"translate("+(c-w/2)+"px,"+g.t+"px) scaleY("+sy+")",borderRadius:t<.5?from.rd:rd,offset:t})}
 kf[0].borderRadius=from.rd;kf[N].borderRadius=rd;
 s.anim=e.animate(kf,{duration:dur,easing:"linear",fill:"both"});s.anim.onfinish=()=>{if(!s.anim)return;s.anim.cancel();s.anim=null;put(pill,g,g.l,g.r,rd);s.cur={l:g.l,r:g.r,rd}};
 s.cur={l:g.l,r:g.r,rd};s.g=g;put(pill,g,g.l,g.r,rd)}
const flush=()=>{raf=0;const l=[...todo];todo.clear();l.forEach(sync)};
const q=(sg)=>{if(sg)todo.add(sg);if(!raf)raf=requestAnimationFrame(flush)};
const all=()=>{document.querySelectorAll(".seg").forEach(x=>todo.add(x));if(!raf)raf=requestAnimationFrame(flush)};
new MutationObserver(ms=>{for(const m of ms){if(m.type=="attributes"){if(m.target.closest&&m.target.closest(".segi"))continue;const p=m.target.parentElement;if(p&&p.classList.contains("seg"))q(p);if(waiting.size)waiting.forEach(q)}else{if(m.target.classList&&m.target.classList.contains("seg")&&![...m.addedNodes].every(n=>n.classList&&n.classList.contains("segi")))q(m.target);for(const n of m.addedNodes){if(n.nodeType!=1||n.classList&&n.classList.contains("segi"))continue;if(n.matches&&n.matches(".seg"))q(n);else if(n.querySelectorAll)n.querySelectorAll(".seg").forEach(q)}}}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class","style","hidden"]});
addEventListener("resize",()=>{st.forEach(s=>{s.snap=true});all()});addEventListener("DOMContentLoaded",all);all()})();
/* ---------- error log: what went wrong, when, and what led to it, in one place that can be copied and sent ---------- */
const ACTS=[],ERRS={rows:[],system:null,loaded:false};let ERR_SENT=0;const ERR_SEEN=new Set();
const pushAct=a=>{ACTS.push(new Date().toTimeString().slice(0,8)+" "+a);if(ACTS.length>15)ACTS.shift()};
document.addEventListener("click",e=>{const el=e.target.closest&&e.target.closest("[data-a]");if(!el)return;const d=el.dataset;pushAct(d.a+(d.t?":"+d.t:"")+(d.v&&d.a=="nav"?":"+d.v:"")+(d.m?":"+d.m:""))},true);
function reportErr(message,stack,action){try{if(!PREFS_ON||ERR_SENT>=25)return;const msg=String(message||"").slice(0,1000);if(!msg||/ResizeObserver|^Script error\.?$/.test(msg)||ERR_SEEN.has(msg))return;ERR_SEEN.add(msg);ERR_SENT++;
fetch("/api/errors",{method:"POST",keepalive:true,headers:{"content-type":"application/json"},body:JSON.stringify({message:msg,stack:String(stack||"").slice(0,8000),action:action||"Error in the page",view:curView||"",ua:navigator.userAgent,screen:innerWidth+"x"+innerHeight,lang:(HE&&HE.on)?"he":"en",actions:ACTS.slice()})}).catch(()=>{})}catch(e){}}
addEventListener("error",e=>reportErr(e.message,e.error&&e.error.stack,"Error in the page"+(e.filename?" ("+String(e.filename).split("/").pop()+":"+e.lineno+")":"")));
addEventListener("unhandledrejection",e=>{const r=e.reason;reportErr(r&&r.message||String(r),r&&r.stack,"Unhandled error in the page")});
const errTime=a=>new Date(a).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"});
function errSysText(){const y=ERRS.system||{},L=[];const c=y.data||{};
L.push("Money Manager error report","Generated: "+new Date().toISOString()+" (local "+new Date().toString().replace(/ GMT.*/,"")+")","");
L.push("App version: "+(y.app||"?")+" · "+(y.mode||"?"),"System: "+(y.os||"?")+" · "+(y.platform||"")+" "+(y.arch||"")+" · "+(y.cpus||"?")+" CPUs · memory "+(y.freeMB||"?")+"/"+(y.memoryMB||"?")+" MB free","Runtime: Node "+(y.node||"?")+(y.electron?" · Electron "+y.electron:"")+(y.chrome?" · bank browser "+y.chrome:""),"Time zone: "+(y.timezone||"?")+" ("+(y.utcOffset||"")+") · app running for "+(y.uptimeMin??"?")+" min");
L.push("Data: "+(c.accounts??"?")+" accounts, "+(c.transactions??"?")+" transactions"+(c.first_tx?" ("+c.first_tx+" to "+c.last_tx+")":""));
L.push("Window: "+navigator.userAgent,"Screen: "+innerWidth+"x"+innerHeight+" · language "+((HE&&HE.on)?"Hebrew":"English")+" · "+(navigator.onLine?"online":"offline")+(matchMedia("(display-mode: standalone)").matches?" · installed app":""));
if((y.lastSyncs||[]).length){L.push("","Last sync of each connection:");y.lastSyncs.forEach(r=>L.push("  "+r.source+": "+(r.ok?"ok":"FAILED")+" "+(r.at||"")+(r.message?" · "+r.message:"")))}
return L.join("\n")}
function errText(x){const c=x.context||{},L=[`#${x.id}  ${errTime(x.at)}  [${x.source}]`,"What was being done: "+(x.action||"—"),"Message: "+x.message];
const ctx=Object.fromEntries(Object.entries(c).filter(([k])=>!["recent","clientActions"].includes(k)));if(Object.keys(ctx).length)L.push("Context: "+JSON.stringify(ctx));
if((c.clientActions||[]).length)L.push("Your last clicks in the app:",...c.clientActions.map(a=>"  "+a));
if((c.recent||[]).length)L.push("Last changes asked of the app:",...c.recent.map(a=>"  "+a));
if(x.detail)L.push("Details:",x.detail.split("\n").map(l=>"  "+l).join("\n"));return L.join("\n")}
function renderErr(){const el=$("setErr");if(!el)return;const R=ERRS.rows,y=ERRS.system||{};
const kv=(k,v)=>v===""||v==null?"":`<div class="kvr"><span class="k">${esc(k)}</span><span class="v">${esc(String(v))}</span></div>`;
const sysH=`<div class="card ss">${ssh("log","System information","What helps when something goes wrong. It holds no passwords and no transaction details.")}<div class="ssb"><div class="kv">${kv("App version",y.app)}${kv("Runs as",y.mode)}${kv("System",(y.os||"")+" · "+(y.platform||"")+" "+(y.arch||""))}${kv("Memory",y.memoryMB?(y.freeMB+" of "+y.memoryMB+" MB free"):"")}${kv("Node / Electron",(y.node||"")+(y.electron?" / "+y.electron:""))}${kv("Time zone",(y.timezone||"")+" "+(y.utcOffset||""))}${kv("Data",y.data?(y.data.accounts+" accounts, "+y.data.transactions+" transactions"):"")}${kv("Window",navigator.userAgent)}</div><div class="flex" style="margin-top:12px"><button class="btn o s" data-a="errCopySys">Copy system information</button></div></div></div>`;
const rowsH=R.length?R.map(x=>`<div class="al" style="align-items:flex-start"><span class="sev ${x.source=="sync"||x.source=="test"?"med":"high"}"></span><div style="flex:1;min-width:0"><b style="font-size:14px">${esc(x.action||x.source)}</b><div class="sm" style="word-break:break-word;margin-top:2px">${esc(x.message)}</div><div class="sm" style="opacity:.7;margin-top:2px">${esc(errTime(x.at))} · ${esc(x.source)} · #${x.id}</div>${x.detail||(x.context&&((x.context.recent||[]).length||(x.context.clientActions||[]).length))?`<details class="kvd" style="margin-top:6px"><summary>Full details</summary><pre style="white-space:pre-wrap;word-break:break-word;font-size:12px;margin:8px 0 0">${esc(errText(x))}</pre></details>`:""}</div><button class="btn o s" data-a="errCopy" data-id="${x.id}">Copy</button></div>`).join(""):`<div class="sm" style="padding:14px 2px">No errors recorded. When something goes wrong it is recorded here, with the time and what was being done.</div>`;
el.innerHTML=sysH+`<div class="card ss">${ssh("log","Error log","Every error the app meets, newest first. Copy it and send it when something does not work.",R.length)}<div class="ssb"><div class="flex" style="gap:8px;flex-wrap:wrap;margin:10px 0 4px"><button class="btn s" data-a="errCopyAll" ${R.length?"":"disabled"}>Copy everything</button><button class="btn o s" data-a="errRefresh">Refresh</button><button class="btn r s" data-a="errClear" ${R.length?"":"disabled"}>Clear log</button></div>${rowsH}</div></div>`}
async function loadErr(){const el=$("setErr");if(el&&!ERRS.loaded)el.innerHTML='<div class="card sm">Loading…</div>';try{const j=await (await fetch("/api/errors?limit=500",{cache:"no-store"})).json();ERRS.rows=j.rows||[];ERRS.system=j.system;ERRS.loaded=true}catch(e){}renderErr()}
function copyText(t,msg){const done=()=>toast(msg||"Copied",{kind:"ok"});const fb=()=>{const a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();try{document.execCommand("copy");done()}catch(e){}a.remove()};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,fb);else fb()}
/* ---------- change log: every version and what changed, newest first ---------- */
const REL={sections:[],loaded:false};
const vNewer=(a,b)=>{const x=String(a).split(".").map(Number),y=String(b).split(".").map(Number);for(let i=0;i<3;i++)if((x[i]||0)!==(y[i]||0))return(x[i]||0)>(y[i]||0);return false};
function relPick(j){const en=relParse((j&&j.changelog)||"");if(!(window.HE&&HE.on)||!j||!j.changelogHe)return en;const he=Object.fromEntries(relParse(j.changelogHe).map(r=>[r.v,r.body]));return en.map(r=>he[r.v]?{...r,body:he[r.v]}:r)} // Hebrew release notes where they exist, English for older versions
function relParse(t){const out=[];String(t).split(/^(?=## \[)/m).forEach(b=>{const m=b.match(/^## \[?v?(\d+\.\d+\.\d+)\]?(?:\s*-\s*([^\n]*))?/);if(!m)return;out.push({v:m[1],date:(m[2]||"").trim(),body:b.slice(b.indexOf("\n")+1)})});return out}
function renderRel(){const el=$("setRel");if(!el)return;const cur=UP.cur||(REL.sections[0]&&REL.sections[0].v)||"",L=REL.sections;
const head=ssh("log","Change log","Everything that changed in each version, newest first."+(cur?" You are on version ⁦"+esc(cur)+"⁩.":""),L.length);
if(!L.length){el.innerHTML=`<div class="card ss">${head}<div class="ssb"><div class="sm" style="padding:14px 2px">${REL.loaded?"No change log is available.":"Loading…"}</div></div></div>`;return}
el.innerHTML=`<div class="card ss">${head}</div>`+L.map((r,i)=>{const isCur=r.v==cur,newer=cur&&vNewer(r.v,cur),dt=r.date?new Date(r.date+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"";
return `<details class="card ss relv" ${i<2||newer?"open":""}><summary class="ssh" style="cursor:pointer"><div style="flex:1;min-width:0"><b><span>Version</span> ⁦${esc(r.v)}⁩${isCur?` <span class="bd pc p-jar">Installed</span>`:newer?` <span class="bd pc p-bill">Newer</span>`:""}</b>${dt?`<div class="sm">${esc(dt)}</div>`:""}</div></summary><div class="ssb p">${mdLite(r.body.replace(/^### .*\n/gm,m=>m))}</div></details>`}).join("")}
async function loadRel(){if(!REL.loaded)renderRel();try{const j=await (await fetch("/api/version",{cache:"no-store"})).json();REL.sections=relPick(j);REL.loaded=true}catch(e){REL.loaded=true}renderRel()}
const fillLazy=e=>{const t=e.target;if(t&&t.matches&&t.matches("select[data-lazy]")&&!t.dataset.full){t.dataset.full=1;const v=t.value;t.innerHTML=catNames().map(c=>`<option ${c==v?"selected":""}>${esc(c)}</option>`).join("")}};["pointerdown","focusin"].forEach(n=>document.addEventListener(n,fillLazy,true));
