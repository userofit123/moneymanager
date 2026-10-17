/* ---------- jars and the payments made from them ---------- */
const JSTOP=new Set(["pay","back","the","for","and","fund","money","savings","save","new","jar","fill","from","with"]);
// which jar does this payment look like it came out of? a name or description word in the payment, or an amount equal to a full jar
// A payment probably belongs to a jar when payments like it were already put in that jar: the same store, or the same category
// when most of that category's payments went to the jar. Names and amounts are not used, they change.
let JSG=null;
function jarIndex(){const att=S.tx.reduce((n,t)=>n+(t.jar&&t.a<0?1:0),0),key=S.tx.length+"|"+att+"|"+S.jars.length;if(JSG&&JSG.key==key)return JSG;
 const store=new Map(),cat=new Map(),catAll=new Map();
 S.tx.forEach(t=>{if(t.a>=0||t.virtual||isXf(t))return;if(t.c)catAll.set(t.c,(catAll.get(t.c)||0)+1);if(!t.jar)return;const j=t.jar.id,s=rn(t.to||t.desc);
  if(s){const m=store.get(s)||new Map();m.set(j,(m.get(j)||0)+1);store.set(s,m)}
  if(t.c){const m=cat.get(t.c)||new Map();m.set(j,(m.get(j)||0)+1);cat.set(t.c,m)}});
 return JSG={key,store,cat,catAll}}
function jarSuggest(t){if(t.a>=0||t.jar||t.virtual||isXf(t)||isIgn(t)||(t.c&&catJars()[t.c]))return null;
 const X=jarIndex(),open=new Set(jarsS().map(j=>j.id)),sc=new Map(),add=(id,v)=>{if(open.has(id))sc.set(id,(sc.get(id)||0)+v)};
 const s=rn(t.to||t.desc);if(s){const m=X.store.get(s);if(m)m.forEach((n,id)=>add(id,3+Math.min(n,3)))}
 if(t.c){const m=X.cat.get(t.c),all=X.catAll.get(t.c)||0;if(m)m.forEach((n,id)=>{if(n>=2&&n/all>=.4)add(id,2)})}
 let best=null,bs=0;sc.forEach((v,id)=>{if(v>bs){bs=v;best=id}});return bs>=2?jarsS().find(j=>j.id==best)||null:null}
function jarInf(t){if(t.a>=0||t.virtual||isXf(t))return"";const aj=t.jar&&S.jars.find(j=>j.id==t.jar.id);
if(aj)return `<div class="inf"><div class="it"><b>Paid from a jar</b>${fm(t.jar.amt)} of this came out of <b>${esc(aj.n)}</b>${aj.done?" (done)":""}.</div><div class="ia"><button class="btn o s" data-a="jarAttach" data-id="${t.id}">Change</button><button class="btn o s" data-a="jarDetach" data-id="${t.id}" data-ask="Detach from the jar?|It will no longer count as paid from the jar.">Detach</button></div></div>`;
if(!jarsS().length)return"";const sg=jarSuggest(t);return `<div class="inf"><div class="it"><b>Paid from a jar?</b>${sg?`It looks like this came out of <b>${esc(sg.n)}</b>. Attach it to take the money out of the jar.`:"Was this paid from a jar? Attach it. The jar goes down and the payment shows in its history."}</div><div class="ia"><button class="btn ${sg?"":"o "}s" data-a="jarAttach" data-id="${t.id}" ${sg?`data-jar="${sg.id}"`:""}>Attach to a jar…</button></div></div>`}
let JAT=0;
function jarAttachOpen(id,pre){const t=byId(id);if(!t)return;const L=jarsS();if(!L.length){toast("There are no jars yet",{kind:"err"});return}const sg=pre||(t.jar&&t.jar.id)||(jarSuggest(t)||{}).id||L[0].id,amt=t.jar?t.jar.amt:Math.abs(t.a);
openSheet(`<h3>Attach to a jar</h3><div class="sm" style="margin-bottom:14px">${esc(dn(t))} · ${fm(Math.abs(t.a))} · ${dstr(t.d)}</div>
<div class="fld"><label>Paid from</label><select id="jaJ">${L.map(j=>`<option value="${j.id}" ${j.id==sg?"selected":""}>${esc(j.n)} · ${fm(j.bal)} saved</option>`).join("")}</select></div>
<div class="fld"><label>Amount paid from the jar (₪)</label><input id="jaA" type="number" inputmode="decimal" value="${amt}"></div><div class="jhint" id="jaH"></div>
<div class="flex" style="justify-content:flex-end;gap:10px"><button class="btn o" data-a="close">Cancel</button><button class="btn" data-a="jaSave" data-id="${id}">Attach</button></div>`);JAT=id;
$("sheet").oninput=$("sheet").onchange=jaHint;jaHint()}
function jaHint(){if(!$("jaJ"))return;const t=byId(JAT),j=S.jars.find(x=>x.id==$("jaJ").value);if(!t||!j)return;const a=Math.min(Math.abs(t.a),+$("jaA").value||0),own=t.jar&&t.jar.id==j.id?t.jar.amt:0,have=j.bal+own;$("jaH").innerHTML=a>0?(a>=have-0.5?`The jar holds ${fm(have)}, so it will be emptied${a>have?" (the rest of the payment came from elsewhere)":""}.`:`The jar goes from ${fm(have)} to <b>${fm(have-a)}</b>.`):"Enter how much of the payment came from the jar."}
function jarAttachSave(){const t=byId(JAT),j=S.jars.find(x=>x.id==$("jaJ").value);if(!t||!j)return;const amt=+(Math.min(Math.abs(t.a),+$("jaA").value||0)).toFixed(2);if(!(amt>0)){toast("Enter how much came from the jar",{kind:"err"});return}
if(!(j.bal+(t.jar&&t.jar.id==j.id?+t.jar.amt||0:0)>0)){toast("That jar is empty, so nothing can be taken from it",{kind:"err"});return}
if(t.jar){jarUnpay(S.jars.find(x=>x.id==t.jar.id),+t.jar.amt||0)}
const took=jarPay(j,t,amt);if(!(took>0)){toast("Nothing is set aside in this jar for that payment",{kind:"err"});return}t.jar={id:j.id,amt:took};delete t.jarNo;log("Attached to a jar",`${t.desc} ${fm(took)} → ${j.n}`);closeSheet();renderAll();
if(j.bal<1&&!j.done)setTimeout(()=>openSheet(`<h3>${esc(j.n)} is empty</h3><div class="sm" style="margin-bottom:14px;line-height:1.5">Is this jar finished? Marking it as done moves it to <b>Completed jars</b>. It keeps its history and the payment you attached, and stops taking new money.</div><div class="flex" style="justify-content:flex-end;gap:10px"><button class="btn o" data-a="close">Not yet</button><button class="btn" data-a="jdYes" data-id="${j.id}">Mark as done</button></div>`),260)}
function jarDetach(id){const t=byId(id);if(!t||!t.jar)return;const j=S.jars.find(x=>x.id==t.jar.id);jarUnpay(j,+t.jar.amt||0);log("Detached from a jar",t.desc+(j?" · "+j.n:""));delete t.jar;t.jarNo=t.c||"-";renderAll();openTx(id)}
function jarDone(id){const j=S.jars.find(x=>x.id==id);if(!j)return;openSheet(`<h3>Mark “${esc(j.n)}” as done?</h3><div class="sm" style="margin-bottom:14px;line-height:1.5">It moves to <b>Completed jars</b> with its history and any payments attached to it. It stops taking new money and leaves the priority list.${j.bal>0?` The ${fm(j.bal)} still in it goes back to your free money.`:""}</div><div class="flex" style="justify-content:flex-end;gap:10px"><button class="btn o" data-a="close">Cancel</button><button class="btn" data-a="jdYes" data-id="${id}">Mark as done</button></div>`)}
function jarDoneNow(id){const j=S.jars.find(x=>x.id==id);if(!j)return;const left=j.bal;jarOut(j,left,"Marked as done");j.done=TODAY;j.bal=0;j.balEdit=true;S.jars.filter(x=>!x.done).sort((a,b)=>a.p-b.p).forEach((x,i)=>x.p=i+1);log("Completed jar",j.n+(left>0?" · released "+fm(left):""));renderAll()}
function jarMoveTo(id,pos){const L=jarsS(),i=L.findIndex(j=>j.id==id);if(i<0||pos<1||pos>L.length||pos-1==i)return;const [j]=L.splice(i,1);L.splice(pos-1,0,j);L.forEach((x,k)=>x.p=k+1);log("Reordered jars",j.n+" is now priority "+pos);renderAll()}
let JEID=0,JNT="goal",JP={};
const JTYPES=[["goal","Savings","Put money aside for something"],["bill","Bills","Keep money aside to pay bills"],["payoff","Pay-off","Pay back a loan, step by step"]];
// one form for a new jar and for editing one
function jarShell(edit){return `<h3>${edit?"Edit jar":"New jar"}</h3>${edit?"":`<div class="sm" style="margin-bottom:14px">A jar is a pot of money inside this app. It does not move any money in your real accounts.</div>`}
<div class="fld"><label>Name</label><input id="njN" placeholder="e.g. Emergency fund" autocomplete="off"></div>
<div class="fld"><label>Description (optional)</label><input id="njDsc" maxlength="400" placeholder="What this money is for" autocomplete="off"></div>
<div class="fld"><label>What is it for?</label><div class="jtype" id="njTy"></div></div>
<div id="njF"></div>
<div class="fld" id="njK"></div>
<div class="sm" style="margin:2px 0 16px"><span>Each month the jars take free money in order, jar 1 first.</span>${edit?"":" <span>New jars go last in line.</span>"} <span>A jar with a goal but no monthly amount takes everything it can, up to its goal, before the jars after it get anything.</span> <span>A jar with no goal and no monthly amount takes nothing by itself.</span></div>
<div class="flex" style="justify-content:flex-end;gap:10px;${edit?"margin-top:6px":""}"><button class="btn o" data-a="close">Cancel</button><button class="btn" data-a="jarSave">${edit?"Save changes":"Create jar"}</button></div>`}
const sig2=a=>JSON.stringify([...a].sort());
function jarNewOpen(kind){JEID=0;JNT=kind||"goal";JP={};JCAT=[];JCQ="";JCO=false;openSheet(jarShell(false));jarForm()}
function jarEditOpen(id){const j=S.jars.find(x=>x.id==id);if(!j)return;JEID=id;JNT=j.kind=="payoff"?"payoff":j.bill?"bill":"goal";
JCAT=(j.cats||[]).map(x=>x.c);JCQ="";JCO=JCAT.length>0;JP={T:j.need||"",S:j.bal,D:j.due||"",C:JNT=="goal"?(j.auto||j.cap==null||!(j.cap>0)?"":j.cap):(j.cap||""),B:j.bill||"",Mo:j.months||12,O:(+j.out||0)>0};
openSheet(jarShell(true));$("njN").value=j.n;$("njDsc").value=j.desc||"";jarForm()}
// keep what has been typed when the kind changes
function jarCapture(){const g=id=>$(id)?$(id).value:undefined;for(const [k,id] of [["T","njT"],["S","njS"],["D","njD"],["C","njC"],["B","njB"],["Mo","njMo"]]){const v=g(id);if(v!==undefined)JP[k]=v}if($("njOut"))JP.O=$("njOut").checked}
let JCAT=[];
let JCQ="",JCO=false; // JCO: the "pays for these categories" section is open
function jarCatsList(){const el=$("njKL");if(!el)return;const CJ=catJars(),q=JCQ.trim().toLowerCase(),CK='<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
ks=Object.keys(S.cats).filter(k=>S.cats[k]!==99&&k!="Uncategorized").sort((x,y)=>x.localeCompare(y,undefined,{sensitivity:"base"})).filter(k=>!q||k.toLowerCase().includes(q)),oth=k=>CJ[k]&&CJ[k].j.id!=JEID;
const tile=k=>{const sel=JCAT.includes(k),o=oth(k);return `<button type="button" class="jct ${sel?"on":""} ${o&&!sel?"oth":""}" data-a="jcat" data-k="${esc(k)}" aria-pressed="${sel}"><span class="dot" style="background:${cc(k)}"></span><span class="jcn"><b>${esc(k)}</b><small>${sel?(o?`<span>Moves here from</span> ${esc(CJ[k].j.n)}`:"Pays for this"):o?`<span class="bd am2"><span>In jar</span> ${esc(CJ[k].j.n)}</span>`:"Not linked"}</small></span><span class="jck">${sel?CK:""}</span></button>`};
const grp=(t,L)=>L.length?`<div class="jcg"><h5>${t}</h5><div>${L.map(tile).join("")}</div></div>`:"";
el.innerHTML=grp("Selected",ks.filter(k=>JCAT.includes(k)))+grp("Available",ks.filter(k=>!JCAT.includes(k)&&!oth(k)))+grp("In another jar · choosing one moves it here",ks.filter(k=>!JCAT.includes(k)&&oth(k)))||`<div class="sm" style="padding:6px 2px">No category matches.</div>`}
// pick the categories this jar pays for. A category can only belong to one jar: choosing one that another jar has moves it here.
function jarCatsDraw(){const el=$("njK");if(!el)return;const CJ=catJars(),moved=JCAT.filter(k=>CJ[k]&&CJ[k].j.id!=JEID);
el.innerHTML=`<button type="button" class="jch jcht" data-a="jcToggle" aria-expanded="${JCO}"><span class="jcl2">Pays for these categories <span class="sm">(optional)</span></span><span class="bd ${JCAT.length?"bill":"fl"}">${JCAT.length} selected</span><svg class="jcv" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>${JCO?`<div class="sm" style="margin:8px 0 10px">Spending in them comes out of this jar. Example: choose “Shopping & home” and a ${fm(120)} lamp lowers the jar by ${fm(120)}.</div><input id="njKQ" class="jcq" type="search" placeholder="Search categories…" autocomplete="off" value="${esc(JCQ)}" aria-label="Search categories"><div class="jcl" id="njKL"></div>${JCAT.length?`<label class="chk" style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px"><input type="checkbox" id="njKM"> Also count what I have already spent this month</label>`:""}${moved.length?`<div class="sm" style="margin-top:8px">${moved.map(k=>esc(k)).join(", ")} will move from ${[...new Set(moved.map(k=>CJ[k].j.n))].map(esc).join(", ")} to this jar.</div>`:""}`:`<div class="sm" style="margin-top:6px">${JCAT.length?JCAT.map(esc).join(", ")+" · spending in these comes out of this jar.":"Optional: link categories so their spending comes out of this jar."}</div>`}`;jarCatsList()}
document.addEventListener("change",e=>{if(e.target.id=="acC"){const h=$("acCH"),c=e.target.value;if(h)h.style.display=c&&c!="ILS"&&!(S.currencies||[]).includes(c)?"":"none"}if(e.target.dataset&&e.target.dataset.upd=="auto"&&window.desktop){UP.auto=e.target.checked;window.desktop.setAuto(e.target.checked).then(s=>{upFromDesk(s);updUI()})}});
document.addEventListener("input",e=>{const k={glBlur:["gbl","px"],glSat:["gsat","%"],glOp:["gop","%"]}[e.target.id];if(!k)return;st[k[0]]=+e.target.value;glassVars();$(e.target.id+"Out").textContent=st[k[0]]+k[1];try{localStorage.setItem("moneyTheme",JSON.stringify(st))}catch(x){}});
document.addEventListener("input",e=>{if(e.target.id=="texScale"){st.tsc=+e.target.value;document.documentElement.style.setProperty("--tsc",String(st.tsc/100));$("texOut").textContent=st.tsc+"%";try{localStorage.setItem("moneyTheme",JSON.stringify(st))}catch(x){}}});
document.addEventListener("input",e=>{if(e.target.id=="njKQ"){JCQ=e.target.value;jarCatsList()}});
function jarForm(){$("njTy").innerHTML=JTYPES.map(([v,t,d])=>`<button type="button" class="jt ${JNT==v?"on":""}" data-a="jtype" data-v="${v}"><b>${t}</b><span>${d}</span></button>`).join("");
const sv=`<div class="fld"><label>${JNT=="payoff"?"Already paid back (₪)":JEID?"Saved so far (₪)":"Already saved (₪)"}</label><input id="njS" type="number" inputmode="numeric" min="0" value="${JP.S==null?0:JP.S}"></div>`;
jarCatsDraw();$("njF").innerHTML=JNT=="goal"?`<div class="two"><div class="fld"><label>Goal (optional) (₪)</label><input id="njT" type="number" inputmode="numeric" min="1" placeholder="e.g. 20000" value="${JP.T||""}"></div>${sv}</div>
<label class="chk" style="display:flex;gap:8px;align-items:flex-start;margin:-4px 0 12px;font-size:13px"><input type="checkbox" id="njOut" ${JP.O?"checked":""} style="margin-top:3px"><span>This money is not in my accounts here<br><span class="sm">Tick it if the amount you already saved is kept somewhere the app cannot see. It then does not reduce your free money.</span></span></label>
<div class="two"><div class="fld"><label>By when (optional)</label><input id="njD" type="date" value="${JP.D||""}"></div><div class="fld"><label>Per month (₪)</label><input id="njC" type="number" inputmode="numeric" min="0" placeholder="Worked out for you" value="${JP.C||""}"></div></div><div class="jhint" id="njH"></div>`
:JNT=="payoff"?`<div class="two"><div class="fld"><label>Total I owe (₪)</label><input id="njT" type="number" inputmode="numeric" min="1" placeholder="e.g. 100000" value="${JP.T||""}"></div>${sv}</div><div class="two"><div class="fld"><label>I pay back per month (₪)</label><input id="njC" type="number" inputmode="numeric" min="1" placeholder="e.g. 1000" value="${JP.C||""}"></div><div></div></div><div class="jhint" id="njH"></div>`
:`<div class="fld"><label>Bill</label><select id="njB"><option value="">Choose a bill…</option>${["*a","*","*i"].map(k=>`<option value="${k}" ${JP.B==k?"selected":""}>${ALLN[k]} · ${fm(allMo(k))} / month</option>`).join("")}${recBills().map(b=>`<option value="${esc(b.match)}" ${JP.B==b.match?"selected":""}>${esc(b.n)} · ${fm(b.mo)} / month</option>`).join("")}</select></div><div class="two"><div class="fld"><label>Months to keep covered</label><input id="njMo" type="number" inputmode="numeric" min="1" value="${JP.Mo||12}"></div>${sv}</div><div class="jhint" id="njH"></div>`;
$("njF").oninput=$("njF").onchange=jarHint;jarHint()}
function jarHint(){const h=$("njH");if(!h)return;const v=id=>$(id)?$(id).value:"",num=id=>+v(id)||0,sv=num("njS");let t="";const mon=k=>new Date(+MK.slice(0,4),+MK.slice(5,7)-1+k,1).toLocaleDateString("en-GB",{month:"long",year:"numeric"});
if(JNT=="payoff"){const T=num("njT"),C=num("njC"),left=Math.max(0,T-sv);t=!(T>0)?"Enter the total you owe.":left<=0?"It is already paid off.":C>0?`₪${f(C)} a month pays off the remaining ₪${f(left)} in ${Math.ceil(left/C)} month${Math.ceil(left/C)==1?"":"s"} (${mon(Math.ceil(left/C)-1)}). What you already paid back is not taken from your free money.`:"Enter how much you pay back each month."}
else if(JNT=="goal"&&!(num("njT")>0)){const C=num("njC");t=C>0?`₪${f(C)} goes in every month, with no end. After a year: ₪${f(sv+C*12)}.`:"Enter a goal, or how much to put aside each month."}
else if(JNT=="goal"){const T=num("njT"),D=v("njD"),C=v("njC"),left=Math.max(0,T-sv);
if(!(T>0))t="Enter the amount you want to reach.";else if(left<=0)t="The jar already has that much.";
else if(D&&D>=TODAY){const m=monthsTo(D);if(C==="")t=`<b>₪${f(Math.ceil(left/m))} a month</b> for ${m} month${m==1?"":"s"} reaches ₪${f(T)} by ${new Date(D).toLocaleDateString("en-GB",{month:"short",year:"numeric"})}. The amount updates each month.`;else{const c=+C,k=c>0?Math.ceil(left/c):0;t=c>0?(k<=m?`₪${f(c)} a month reaches ₪${f(T)} in ${k} month${k==1?"":"s"}: on time.`:`₪${f(c)} a month takes ${k} months, which is after your date. You would need ₪${f(Math.ceil(left/m))} a month.`):"Nothing is put in automatically."}}
else if(C!==""&&+C>0){const k=Math.ceil(left/+C);t=`₪${f(+C)} a month reaches ₪${f(T)} in ${k} month${k==1?"":"s"} (${mon(k-1)}).`}
else t="Add a date and we work out the monthly amount, or type an amount yourself. Leave both empty to add money by hand."}
else{const all=isAll(v("njB")),b=all?{n:ALLN[v("njB")].toLowerCase(),mo:allMo(v("njB"))}:BC.find(x=>x.match==v("njB")),m=num("njMo")||12;t=b?`Goal: <b>₪${f(Math.round(b.mo*m))}</b>, which is ${m} months of ${esc(b.n)}. The jar keeps that much set aside${all?" and the goal follows your bills":""}, so ${all?"these bills are":"this bill is"} not also held back from your free money.`:"Pick the bill this jar pays for."}
h.innerHTML=t}
// money taken out of a jar by hand lowers what it "received this month" too, so its status stays true
function jarOut(j,amt,note,paid){if(!(amt>0))return;j.balNote=j.balNote||note;if(paid){j.balPaid=true;j.paid=+((+j.paid||0)+amt).toFixed(2)}else j.got=Math.max(0,+((+j.got||0)-amt).toFixed(2));j.moves=[{amt:-amt,note,at:new Date().toISOString()},...(j.moves||[])];if(j.ledger!=null)j.ledger=+(j.ledger-amt).toFixed(2)}
// a payment out of a jar, and taking it back: spending never reopens the month's allowance, so both are marked as payments
function jarPay(j,t,amt){if(j.kind=="payoff"){const a=+Math.min(heldOf(j),amt).toFixed(2);if(!(a>0))return 0;j.out=+((+j.out||0)+a).toFixed(2);j.balEdit=true;return a} // a pay-off jar keeps counting up: the money that was set aside has left your accounts, nothing comes off the jar
const a=+Math.min(Math.max(0,j.bal),amt).toFixed(2);if(!(a>0))return 0;jarOut(j,a,"Paid: "+t.desc,true);j.bal=+(j.bal-a).toFixed(2);jarClamp(j);j.balEdit=true;return a}
function jarUnpay(j,amt,note){if(!j||!(amt>0))return;if(j.kind=="payoff"){j.out=Math.max(0,+((+j.out||0)-amt).toFixed(2));j.balEdit=true;return}note=note||"Payment taken back";j.bal=+(j.bal+amt).toFixed(2);j.balEdit=true;j.balUndo=true;j.balPaid=true;j.balNote=j.balNote||note;j.paid=Math.max(0,+((+j.paid||0)-amt).toFixed(2));j.moves=[{amt,note,at:new Date().toISOString()},...(j.moves||[])];if(j.ledger!=null)j.ledger=+(j.ledger+amt).toFixed(2)}
function jset(id,fld,v){const j=S.jars.find(x=>x.id==id);if(!j||j[fld]===v||(fld=="auto"&&!!j[fld]===!!v))return;const old=j[fld],L={n:"name",desc:"description",months:"months covered",auto:"monthly amount mode",cap:"monthly amount",need:"target",bal:"saved amount",due:"deadline",bill:"linked bill"},show=x=>fld=="n"||fld=="desc"?(x||"none"):fld=="months"?String(x||"none"):fld=="bill"?(isAll(x)?ALLN[x].toLowerCase():(x?((BC.find(b=>b.match==x)||{}).n||x):"none")):fld=="due"?(x?dstr(x):"none"):fld=="auto"?(x?"calculated from the deadline":"fixed"):fld=="cap"&&x==null?"refill to target":fm(x);j[fld]=v;if(fld=="bal"){j.balEdit=true;if(v<old)jarOut(j,+(old-v).toFixed(2),"Edited by you");jarClamp(j)}log("Changed jar "+L[fld],j.n+": "+show(old)+" → "+show(v),{type:"jar",id:j.id,f:fld,old});renderAll()}
function act(a,d,el){switch(a){
case"nav":FOCUS=null;nav(d.v);break;case"more":openMore();break;case"sync":openSync();break;case"close":closeSheet();break;case"add":openAdd();break;case"addSave":addSave();break;
case"theme":if($("pop").classList.contains("on"))popOff();else{$("pop").classList.remove("out");$("pop").classList.add("on")}break;case"theme2":closeSheet();$("pop").classList.remove("out");$("pop").classList.add("on");break;
case"weekf":WS=d.v=="mon"?"mon":"sun";try{localStorage.setItem("moneyWs",WS)}catch(e){}document.querySelectorAll("#segWs button").forEach(b=>b.classList.toggle("on",b.dataset.v==WS));renderAll();break;case"datef":DF=d.v=="mdy"?"mdy":"dmy";try{localStorage.setItem("moneyDf",DF)}catch(e){}document.querySelectorAll("#segDf button").forEach(b=>b.classList.toggle("on",b.dataset.v==DF));renderAll();break;
case"lang":try{localStorage.setItem("moneyLang",d.l)}catch(e){}location.reload();break;
case"opt":st[d.k]=d.v;themeSwap(applyTheme);break;
case"tpOpen":window._apt="sav";apTabs();setTimeout(()=>{const n=$("tpName");if(n)n.focus()},0);break;
case"tpSave":{const n=$("tpName"),nm=(n.value||"").trim();if(!nm){n.focus();break}if(THM.length>=25){toast("You can keep up to 25 looks. Delete one first.",{kind:"err"});break}THM.push({id:Date.now().toString(36),name:nm,v:tpSnap()});n.value="";tpPersist();tpRender();break}
case"tpApply":{const x=THM.find(y=>y.id==d.id);if(x){Object.assign(st,JSON.parse(JSON.stringify(x.v)));tpGo()}break}
case"tpUpd":{const x=THM.find(y=>y.id==d.id);if(x){x.v=tpSnap();tpPersist();tpRender();toast("Saved “"+x.name+"” with the current look")}break}
case"tpAssign":{THA[d.sc]=THA[d.sc]==d.id?null:d.id;tpPersist();tpRender();const x=THM.find(y=>y.id==THA[d.sc]);if(x&&(d.sc=="D")==isDark()){Object.assign(st,JSON.parse(JSON.stringify(x.v)));tpGo()}break}
case"tpDel":{THM=THM.filter(y=>y.id!=d.id);["L","D"].forEach(s=>{if(THA[s]==d.id)THA[s]=null});tpPersist();tpRender();break}
case"rcDay":{if(!RC)break;if(!RC.from||RC.to){RC.from=d.d;RC.to="";RC.hover=""}else{RC.to=d.d;if(RC.to<RC.from)[RC.from,RC.to]=[RC.to,RC.from]}RC.bad=false;rcInputs();rcRender();break}
case"rcNav":if(RC){RC.view=addM(RC.view,+d.k);rcRender()}break;
case"rcQuick":if(RC){const[a,b]=rangeOf({p:d.p}),n=addM(a.slice(0,7),0);RC.from=a;RC.to=b.endsWith("-31")?(()=>{const y=+b.slice(0,4),m=+b.slice(5,7);return iso(new Date(y,m,0))})():b;RC.bad=false;RC.view=RC.from.slice(0,7);rcInputs();rcRender()}break;
case"rcCancel":rcClose(true);break;
case"rcApply":rcApply();break;
case"apTab":window._apt=d.t;apTabs();break;case"custReset":st.cu={L:{},D:{}};st.cp={L:{},D:{}};st.cc=ST0.cc;themeSwap(()=>{applyTheme();renderAll()});break;
case"themeReset":st={...ST0,sym:st.sym,ls:st.ls};themeSwap(()=>{applyTheme();renderAll()});break;
case"shuffle":{const A=Object.keys(ATM).filter(x=>x!=st.atm),B=["glow","mesh","diagonal","spot","dots","stripes","flat"].filter(x=>x!=st.bg),pk=L=>L[Math.floor(Math.random()*L.length)];st.atm=pk(A);st.bg=pk(B);el.classList.remove("shake");void el.offsetWidth;el.classList.add("shake");setTimeout(()=>el.classList.remove("shake"),520);themeSwapFrom(el,applyTheme);break}
case"mode":st.mode=d.m;themeSwap(()=>{applyTheme();renderAll()});break;case"surf":st.surf=d.s;themeSwap(applyTheme);break;case"atm":st.atm=d.a2;themeSwap(()=>{applyTheme();renderAll()});break;
case"openTx":openTx(d.id);break;case"txTab":if(d.t=="exp"&&txTab!="exp"){EXON=false;EXFROM="activity"}txTab=d.t;renderTx();break;
case"grpTog":grpToggle(d.g);break;
case"focusClear":FOCUS=null;renderTx();break;
case"alOpen":{const al=alerts().find(x=>x.id==d.id);if(!al)break;if(al.attach){nav("tx");renderTx();openTx(al.attach);break}FOCUS=null;if(al.ids&&al.ids.length){FOCUS={label:al.title,ids:new Set(al.ids)};txTab="all"}else if(al.tab)txTab=al.tab;nav(al.go);if(al.go=="tx")renderTx();break}
case"clearF":FOCUS=null;RNG.tx={p:"all",from:"",to:""};saveRng();$("q").value="";$("fSrc").value="";$("fCat").value="";$("fTag").value="";$("fTy").value="";$("fSort").value="new";GMODE="month";$("fGroup").value="month";try{localStorage.setItem("moneyGroup","month")}catch(x){}renderTx();break;
case"goSrc":resetTx();nav("tx");$("fSrc").value=d.src;renderTx();break;
case"updOpen":nav("set");setTab="app";renderSet();break;
case"updCheck":if(window.desktop){UP.status="checking";updUI();window.desktop.check().then(s=>{upFromDesk(s);updUI()})}else upWeb(true);break;
case"updDownload":if(window.desktop)window.desktop.download().then(s=>{upFromDesk(s);updUI()});break;
case"updInstall":if(window.desktop){UP.status="installing";updUI();document.querySelectorAll("[data-a=updInstall],[data-a=updDownload],[data-a=updCheck]").forEach(b=>{b.disabled=true});setTimeout(()=>window.desktop.install(),150)}break;
case"updNotes":case"goChangelog":closeSheet();nav("set");setTab="rel";showPanes();loadRel();break;
case"goTagRules":nav("cats");catTab="tagrules";renderSet();break;
case"tagRename":{const g=d.tag;openSheet(`<h3>Rename tag</h3><div class="sm" style="margin-bottom:12px">Changes it on every transaction and in every tag rule. If a tag with the new name already exists, they become one.</div><div class="fld"><label>New name</label><input id="trnN" value="${esc(g)}" autocomplete="off"></div><div class="flex" style="justify-content:flex-end;gap:10px"><button class="btn o" data-a="close">Cancel</button><button class="btn" data-a="tagRenameGo" data-tag="${esc(g)}">Rename</button></div>`);setTimeout(()=>{const i=$("trnN");i&&(i.focus(),i.select())},60);break}
case"tagRenameGo":{const g=d.tag,n=normTag($("trnN").value||"");if(!n){toast("Type a name first",{kind:"err"});break}if(n==g){closeSheet();break}let c=0;S.tx.forEach(t=>{const i=(t.tags||[]).indexOf(g);if(i>=0){t.tags.splice(i,1);if(!t.tags.includes(n))t.tags.splice(i,0,n);c++}});S.tagRules.forEach(r=>{const L=ruleTags(r),i=L.indexOf(g);if(i>=0){L.splice(i,1,n);r.t=[...new Set(L)].join(",")}});log("Renamed tag",`#${g} → #${n} · ${c} transaction${c==1?"":"s"}`);closeSheet();renderAll();toast(`Renamed to #${n}`);break}
case"tagDel":{const g=d.tag,c=S.tx.filter(t=>(t.tags||[]).includes(g)).length;if(!confirm(`Delete the tag "${g}"? It is removed from ${c} transaction${c==1?"":"s"} and from tag rules. The transactions stay.`))break;S.tx.forEach(t=>{if(t.tags)t.tags=t.tags.filter(x=>x!=g)});S.tagRules.forEach(r=>{r.t=ruleTags(r).filter(x=>x!=g).join(",")});S.tagRules=S.tagRules.filter(r=>r.t);log("Deleted tag","#"+g);renderAll();break}
case"taOpen":{const i=d.id.indexOf("|"),id=+d.id.slice(0,i),tags=d.id.slice(i+1).split(",").filter(Boolean),t=byId(id);if(!t)break;TA={id,tags};
openSheet(`<h3>New tag rule</h3><div class="sm" style="margin-bottom:12px;line-height:1.5">You tagged <b>${esc(dn(t))}</b> with ${tags.map(g=>"<b>#"+esc(g)+"</b>").join(" ")}. A rule does this automatically for similar transactions from now on.</div><div class="fld"><label>If the description contains</label><input id="taK" value="${esc(guessKw(t))}" autocomplete="off"></div><label class="chk" style="display:flex;gap:8px;align-items:flex-start;font-size:13px;margin:4px 0 6px"><input type="checkbox" id="taA" checked style="margin-top:2px"><span id="taN"></span></label><div class="sm" id="taS" style="margin-bottom:12px"></div><div class="flex" style="justify-content:flex-end;gap:10px"><button class="btn o" data-a="close">Cancel</button><button class="btn" data-a="taSave">Create rule</button></div>`);taUpdate();break}
case"taSave":{const kw=($("taK").value||"").trim().toLowerCase();if(kw.length<2){toast("Type the text to match first",{kind:"err"});break}const L=tagSim(kw,TA.id,TA.tags),all=$("taA").checked;let ex=S.tagRules.find(r=>r.k.toLowerCase()==kw);if(ex)ex.t=[...new Set([...ruleTags(ex),...TA.tags])].join(",");else{ex={k:kw,t:TA.tags.join(",")};S.tagRules.push(ex)}
let n=0;if(all)L.forEach(x=>{TA.tags.forEach(g=>{if(!x.tags.includes(g)){x.tags.push(g);}});n++});log("Added tag rule",`"${kw}" → ${ex.t}${n?` · ${n} transaction${n==1?"":"s"} tagged`:""}`);closeSheet();renderAll();toast(n?`Rule created. ${n} transaction${n==1?"":"s"} tagged.`:"Rule created. It tags new transactions.");break}
case"goPeriod":if(document.documentElement.classList.contains("mob"))break;goActivity({from:d.from,to:d.to,cat:d.cat,ty:d.ty});break;
case"goCat":resetTx();nav("tx");$("fCat").value=d.cat;renderTx();break;
case"goMerch":resetTx();nav("tx");$("q").value=d.n;renderTx();break;
case"goTag":resetTx();nav("tx");$("fTag").value=d.tag;renderTx();break;
case"goSearch":nav("tx");txTab="all";$("q").value=d.q;$("fCat").value="";$("fSrc").value="";$("fTag").value="";$("fTy").value="";renderTx();break;
case"fxc":fxCur=d.cur;renderFx();break;
case"xfOk":{const x=S.xf.find(x=>x.o==d.o);x.st="ok";log("Transfer confirmed",byId(x.o).from+" → "+byId(x.i).to);renderAll();break}
case"xfNo":{const x=S.xf.find(x=>x.o==d.o);x.st="rej";log("Not a transfer",byId(x.o).desc+" and "+byId(x.i).desc+" are counted as normal transactions");closeSheet();renderAll();break}
case"dupDel":{const t=byId(d.id);if(t&&t.jar)jarUnpay(S.jars.find(x=>x.id==t.jar.id),+t.jar.amt||0);S.tx=S.tx.filter(x=>x.id!=d.id);log("Deleted duplicate",t.desc+" · "+fm(t.a)+" on "+dstr(t.d));closeSheet();renderAll();break}
case"dupKeep":S.dupOk[d.id]=1;log("Kept both transactions",byId(d.id).desc);closeSheet();renderAll();break;
case"gapAdd":{const g=recon().find(x=>x.id==+d.id);if(g)openAdd({acc:g.n,cur:g.cur,amt:g.diff,date:g.to.slice(0,10)});break}
case"gapRec":gapCall(d.id,"record","Recorded as an unrecorded charge");break;
case"gapRev":{const n=prompt("Why is this difference fine? Your note is saved in the log.");if(n)gapCall(d.id,"review","Marked as reviewed",{note:n});break}
case"authGo":authGo();break;
case"merchHide":{const n=String(d.n).toLowerCase();if(!(S.hiddenMerchants||[]).includes(n)){S.hiddenMerchants=[...(S.hiddenMerchants||[]),n];log("Hid a merchant",d.n+" is no longer shown as a merchant",{type:"merchant",name:n});renderAll()}break}
case"merchShow":S.hiddenMerchants=(S.hiddenMerchants||[]).filter(x=>x!=String(d.n).toLowerCase());log("Showed a merchant again",d.n);renderAll();break;
case"budAccept":{const k=d.k,el=document.querySelector(`[data-bp="${CSS.escape(k)}"]`),v=Math.round(+(el?el.value:0));if(!(v>0)){toast("Enter an amount first");break}S.budgets[k]=v;log("Accepted a suggested budget",k+": "+fm(v)+" / month",{type:"budget",k,old:null});renderAll();break}
case"budAcceptAll":{let n=0;document.querySelectorAll("[data-bp]").forEach(el=>{const k=el.dataset.bp,v=Math.round(+el.value);if(v>0&&!(k in S.budgets)){S.budgets[k]=v;n++}});if(n){log("Accepted suggested budgets",n+" budget"+(n==1?"":"s"));renderAll()}break}
case"budNo":S.budgetNo.push("new|"+d.k);renderAll();break;
case"budLater":S.budgetNo.push("rev|"+d.k+"|"+MK);renderAll();break;
case"budReset":S.budgetNo=[];renderAll();break;
case"budApply":{const k=d.k,old=S.budgets[k],v=+d.v;S.budgets[k]=v;log("Updated a budget (suggested)",k+": "+fm(old)+" → "+fm(v),{type:"budget",k,old});renderAll();break}
case"jarFill":api("/api/jars/fill",{method:"POST"}).then(r=>{applyJars(r.jars);renderAll();toast(r.applied?`${r.applied} jar${r.applied==1?"":"s"} received ₪${f(r.total)}`:"Nothing to fill: every jar already has its share this month, or there is no money available",{title:"Jars"})}).catch(e=>toast(e.message));break;
case"toastNo":break;
case"suggOpen":suggOpen();break;
case"updOk":{const e=$("updPop");if(e){updSeen(e.dataset.v);updClose()}setTimeout(profileAsk,350);break}
case"profSave":profSave("pf");break;
case"profClear":if(confirm("Clear your profile?")){S.cfg.profile={asked:1};log("Cleared profile","");renderAll()}break;
case"profPopSave":{profSave("pp");const e=$("profPop");if(e)e.remove();break}
case"profSkip":profSkip();break;
case"updLog":{const e=$("updPop");if(e){updSeen(e.dataset.v);updClose()}nav("set");setTimeout(()=>{const t=document.querySelector("[data-a=setTab][data-t=rel]");if(t)t.click()},60);break}
case"suggClear":SUGG=[];suggSave();closeSheet();break;
case"suggDismiss":break;
case"roOpen":{const i=d.id.indexOf("|"),id=+d.id.slice(0,i),cat=d.id.slice(i+1),t=byId(id);if(!t)break;RO_ID=id;openSheet(`<h3>New category rule</h3><div class="sm" style="margin-bottom:12px">You put <b>${esc(dn(t))}</b> in <b>${esc(cat)}</b>. A rule puts similar items in this category, now and in the future.</div>
<div class="fld"><label>If the description contains</label><input id="roK" value="${esc(guessKw(t))}" autocomplete="off"></div>
<div class="fld"><label>Category</label><select id="roC">${catNames().map(c=>`<option ${c==cat?"selected":""}>${esc(c)}</option>`).join("")}</select></div>
<div class="sm" id="roSim" style="margin:-2px 0 14px;line-height:1.5"></div>
<div class="flex" style="justify-content:flex-end;gap:10px"><button class="btn o" data-a="close">Cancel</button><button class="btn" data-a="roSave">Create rule</button></div>`);roUpdate();break}
case"roSave":{const kw=$("roK").value.trim().toLowerCase(),cat=$("roC").value;if(kw.length<2){toast("Type the text to match first");break}const ex=S.rules.find(r=>r.k.toLowerCase()==kw),sim=simList(kw,RO_ID,cat),n=sim.length;sim.forEach(x=>{x.c=cat});
if(ex){const old=ex.c;ex.c=cat;log("Changed rule",`"${kw}": ${old} → ${cat}`)}else{S.rules.push({k:kw,c:cat,t:""});log("Added rule",`"${kw}" → ${cat}${n?` · ${n} similar item${n==1?"":"s"} categorized`:""}`)}
closeSheet();renderAll();break}
case"cpCount":S.ccOverride[d.id]=1;log("Counted card payment as spending",byId(+d.id)?.desc||"");closeSheet();renderAll();break;
case"txHist":{const t=byId(+d.id)||ALL().find(x=>x.id==d.id);if(t){const b=billOf(t);if(b)payHist(b.n,billTx(b),"Regular bill");else payHist(dn(t),sameStore(t),"All payments")}break}
case"billOpen":{const b=S.bills[+d.i];if(!b)break;const last=billTx(b).slice(-1)[0];if(last)openTx(last.id);else payHist(b.n,billTx(b),"Bill",b.match);break}
case"billHist":{const b=S.bills[+d.i];if(b)payHist(b.n,billTx(b),b.mode=="once"?"One-off bill":"Bill",b.mode=="once"?b.n:b.match);break}
case"merchHist":{const L=S.tx.filter(t=>!t.virtual&&t.a<0&&t.to==d.n).sort(byDate),last=L[L.length-1];if(last)openTx(last.id);else payHist(d.n,L,"Merchant",d.n);break}
case"moOpen":{const t=byId(+d.id)||byId(d.id);if(!t)break;const own=String(t.d).slice(0,7),cur=rmOf(t)||own,mk=m=>MNAME(m)+" "+m.slice(0,4);
openSheet(`<h3>Count in another month</h3><div class="sm" style="margin-bottom:12px;line-height:1.55"><b>${esc(dn(t))}</b> · ${dstr(t.d)}<br><span>Choose the month this should be counted in, in reports and totals. The transaction itself does not change: its date, amount and details stay as they are.</span></div>
<div class="stk" style="gap:8px"><button class="btn o" data-a="moSet" data-id="${esc(String(t.id))}" data-m="${addM(cur,-1)}"><span>Previous month</span> · ${mk(addM(cur,-1))}</button><button class="btn o" data-a="moSet" data-id="${esc(String(t.id))}" data-m="${addM(cur,1)}"><span>Next month</span> · ${mk(addM(cur,1))}</button></div>
<div class="fld" style="margin-top:14px"><label>Or pick a month</label><div class="flex" style="gap:8px"><input type="month" id="moPick" value="${cur}" style="flex:1"><button class="btn s" data-a="moPickGo" data-id="${esc(String(t.id))}">Use this month</button></div></div>
<div class="flex" style="justify-content:space-between;margin-top:14px;gap:8px">${rmOf(t)?`<button class="btn o s" data-a="moReset" data-id="${esc(String(t.id))}">Count it in its own month (${mk(own)})</button>`:"<span></span>"}<button class="btn" data-a="close">Cancel</button></div>`);break}
case"moPickGo":{const v=($("moPick")||{}).value;if(!/^\d{4}-\d{2}$/.test(v||"")){toast("Pick a month first");break}d.m=v}
case"moSet":{const t=byId(+d.id)||byId(d.id);if(!t||!/^\d{4}-\d{2}$/.test(d.m||""))break;const old=t.rm,own=String(t.d).slice(0,7),v=d.m==own?undefined:d.m;if(v===old)break;t.rm=v;
log("Counted in another month",t.desc+": "+(v?MNAME(v)+" "+v.slice(0,4):"its own month"),{type:"tx",id:t.id,f:"rm",old});closeSheet();renderAll();toast(v?"Now counted in "+MNAME(v)+" "+v.slice(0,4):"Counted in its own month again");break}
case"moReset":{const t=byId(+d.id)||byId(d.id);if(!t||!t.rm)break;const old=t.rm;t.rm=undefined;log("Counted in another month",t.desc+": back to its own month",{type:"tx",id:t.id,f:"rm",old});closeSheet();renderAll();toast("Counted in its own month again");break}
case"ignOn":{S.txIgnore=S.txIgnore||{};S.txIgnore[d.id]=1;log("Left out of totals",(byId(+d.id)||byId(d.id)||{}).desc||"");closeSheet();renderAll();toast("Left out of all totals");break}
case"ignOff":{delete S.txIgnore[d.id];log("Counted again",(byId(+d.id)||byId(d.id)||{}).desc||"");closeSheet();renderAll();break}
case"billType":{const b=S.bills[+d.i];if(!b)break;const cur=b.rec=="irregular"||!b.every&&b.rec=="irregular"?"irregular":String(b.every||(BC.find(x=>x.idx==+d.i)||{}).every||1);
openSheet(`<h3>Change bill type</h3><div class="sm" style="margin-bottom:12px">${esc(b.n)}</div>
<div class="inf"><div class="it"><b>Recurring</b>Charged on a regular schedule. The app predicts the next payment and warns you if it is late or the price changes. It is held back from your free money.</div></div>
<div class="inf"><div class="it"><b>Irregular</b>Every payment to this business or person counts as a bill, but the timing varies. Good for things that come at different times.</div></div>
<div class="fld"><label>Type</label><select id="btT"><option value="1" ${cur=="1"?"selected":""}>Regular · every month</option><option value="2" ${cur=="2"?"selected":""}>Regular · every 2 months</option><option value="12" ${cur=="12"?"selected":""}>Regular · every year</option><option value="irregular" ${cur=="irregular"?"selected":""}>Irregular</option></select></div>
<div class="flex" style="justify-content:flex-end;gap:10px"><button class="btn o" data-a="close">Cancel</button><button class="btn" data-a="billTypeSave" data-i="${d.i}">Save</button></div>`);break}
case"billSugYes":{const b=S.bills[+d.i],bi=billsInfo().find(x=>x.idx==+d.i);if(!b||!bi||!bi.sug)break;const last=billTx(b).slice(-1)[0],ld=last?new Date(last.d):NOW;b.rec="recurring";b.every=bi.sug;b.anchor=ld.getMonth()+1;b.dom=Math.min(28,ld.getDate()||1);delete b.sugNo;log("Bill became regular",b.n+" → "+CAD[bi.sug].toLowerCase());renderAll();break}
case"billSugNo":{const b=S.bills[+d.i];if(!b)break;b.sugNo=billTx(b).length;renderAll();break}
case"billTypeSave":{const b=S.bills[+d.i];if(!b)break;const v=$("btT").value;if(v=="irregular"){b.rec="irregular";delete b.every;delete b.anchor;delete b.dom}else{const last=billTx(b).slice(-1)[0],ld=last?new Date(last.d):NOW;b.rec="recurring";b.every=+v;b.anchor=ld.getMonth()+1;b.dom=Math.min(28,ld.getDate()||1)}log("Changed bill type",b.n+" → "+(v=="irregular"?"irregular":"every "+v+" month"+(v==1?"":"s")));closeSheet();renderAll();break}
case"ruleApply":{const[i,old]=String(d.id).split("|"),r=S.rules[+i];if(!r)break;let n=0;S.tx.forEach(t=>{if(!t.virtual&&t.c==old&&ruleHit(t,r.k)){t.c=r.c;n++}});log("Updated past transactions",n+" · \""+r.k+"\" → "+r.c);renderAll();toast(n+" transactions moved to "+r.c);break}
case"availWhy":openAvail();break;
case"bufSet":S.jarsBuffer=+d.v;renderAll();break;
case"cpMark":{S.ccOverride[d.id]=2;const t0=byId(+d.id);log("Marked as a card payment",t0?.desc||"");closeSheet();renderAll();if(t0)cpOffer(t0);break}
case"cpRuleAdd":{const t0=byId(+d.id);if(!t0)break;const txt=normD(t0.desc);let n=0;S.tx.forEach(x=>{if(x.id!=t0.id&&x.a<0&&!x.virtual&&BANKN.has(x.from)&&!(S.ccOverride&&S.ccOverride[x.id])&&normD(x.desc)==txt&&!isCardPay(x))n++});if(!(S.cardRules||[]).map(normD).includes(txt)){S.cardRules=[...(S.cardRules||[]),txt];log("Card payment rule",'"'+txt+'" counts as a card payment')}renderAll();toast(n?`Rule added. ${n} more payment${n==1?" now counts":"s now count"} as a card payment.`:"Rule added. Future payments like this are recognised as card payments.");break}
case"ccRuleAdd":{const el=$("ccr"),txt=normD(el&&el.value);if(txt.length<2){toast("Type some text from the bank line, for example “ישראכרט חיוב”.");break}if((S.cardRules||[]).map(normD).includes(txt)){toast("That rule already exists.");break}S.cardRules=[...(S.cardRules||[]),txt];log("Card payment rule",'"'+txt+'" counts as a card payment');renderAll();toast("Rule added.");break}
case"ccRuleDel":{const i=+d.i;if(S.cardRules&&S.cardRules[i]!=null){log("Removed card payment rule",'"'+S.cardRules[i]+'"');S.cardRules.splice(i,1);renderAll()}break}
case"salRuleAdd":{const el=$("slr"),txt=normD(el&&el.value);if(txt.length<2){toast("Type text from the payer or the description, for example “wix”.");break}if((S.salaryRules||[]).map(normD).includes(txt)){toast("That rule already exists.");break}S.salaryRules=[...(S.salaryRules||[]),txt];let n=0;if(S.cats.Salary==null)S.cats.Salary=99;S.tx.forEach(x=>{if(x.virtual||x.a<=0||(x.c&&x.c!="Uncategorized")||isXf(x))return;if(normD(x.desc+" "+(x.from||"")).includes(txt)){x.c="Salary";n++}});log("Salary rule",'income containing "'+txt+'" is Salary'+(n?" ("+n+" existing)":""));renderAll();toast(n?`Rule added. ${n} existing income entr${n==1?"y is":"ies are"} now Salary.`:"Rule added. Future income like this is marked as Salary.");break}
case"salRuleDel":{const i=+d.i;if(S.salaryRules&&S.salaryRules[i]!=null){log("Removed salary rule",'"'+S.salaryRules[i]+'"');S.salaryRules.splice(i,1);renderAll()}break}
case"cpUncount":delete S.ccOverride[d.id];log("Treated as a card payment again",byId(+d.id)?.desc||"");closeSheet();renderAll();break;
case"errCopySys":copyText(errSysText(),"System information copied");break;
case"errCopy":{const x=ERRS.rows.find(r=>r.id==d.id);if(x)copyText(errSysText()+"\n\n"+"-".repeat(40)+"\n"+errText(x),"Error copied");break}
case"errCopyAll":copyText(errSysText()+"\n\n"+"-".repeat(40)+"\n"+ERRS.rows.map(errText).join("\n\n"+"-".repeat(40)+"\n"),ERRS.rows.length+" error"+(ERRS.rows.length==1?"":"s")+" copied");break;
case"errRefresh":loadErr();break;
case"errClear":fetch("/api/errors",{method:"DELETE"}).then(()=>{ERRS.rows=[];renderErr();toast("Error log cleared")});break;
case"txCopy":{const t=ALL().find(x=>x.id==d.id);if(!t)break;const L=[dn(t)+"  "+(t.a<0?"−":"+")+"₪"+f(t.a),dFull(t.d)+(t.from&&t.to?" · "+t.from+" → "+t.to:"")];
const el=$("txDet"),rows=el?[...el.querySelectorAll(".kv .kvr")].map(r=>r.querySelector(".k").textContent+": "+(r.querySelector(".v").dataset.tip||r.querySelector(".v").textContent)):[];
if(rows.length){L.push("");L.push(...rows)}
const raw=el?[...el.querySelectorAll(".kvd .kvr:not(.hd)")].map(r=>r.querySelector(".k").textContent+": "+(r.querySelector(".v").dataset.tip||r.querySelector(".v").textContent)):[];
if(raw.length){L.push("");L.push("All fields from the "+(t.src=="wise"?"Wise":"bank")+":");L.push(...raw)}
if(t.note)L.push("","Note: "+t.note);
const txt=L.join("\n"),done=()=>toast("Details copied");
if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(done,()=>{const a=document.createElement("textarea");a.value=txt;document.body.appendChild(a);a.select();try{document.execCommand("copy");done()}catch(e){}a.remove()});
else{const a=document.createElement("textarea");a.value=txt;document.body.appendChild(a);a.select();try{document.execCommand("copy");done()}catch(e){}a.remove()}break}
case"openDocs":openDocs(+d.id,d.i);break;
case"docClose":closeDocs();break;
case"docPick":if(DV){DV.i=+d.i;renderDocs()}break;
case"quick":openQuick();break;
case"toastUndo":{const i=S.audit.findIndex(x=>x._k==d.id||x.id==d.id);if(i>=0)act("undo",{i});break}
case"qaTx":openAdd();break;
case"qaPhoto":openAdd();setTimeout(()=>{const f=$("nFile");if(f)f.click()},80);break;
case"qaImport":closeSheet();FOCUS=null;nav("set");setTab="data";renderSet();break;
case"ruleNew":openSheet(`<h3>New category rule</h3><div class="sm" style="margin-bottom:12px">When a transaction's description contains this text, it gets this category. It never overrides a category you set by hand.</div><div class="fld"><label>If the description contains</label><input id="qrk" placeholder="e.g. Wolt"></div><div class="fld"><label>Category</label><select id="qrc">${catNames().map(c=>`<option>${esc(c)}</option>`).join("")}</select></div><div class="flex" style="justify-content:flex-end;gap:10px"><button class="btn o" data-a="close">Cancel</button><button class="btn" data-a="ruleSaveQ">Add rule</button></div>`);break;
case"ruleSaveQ":{const k=$("qrk").value.trim();if(!k){toast("Type the text to match first");break}S.rules.push({k,c:$("qrc").value,t:""});log("Added rule",`"${k}" → ${$("qrc").value}`);closeSheet();renderAll();break}
case"catNew":openSheet(`<h3>New category</h3><div class="fld"><label>Name</label><input id="qnc" placeholder="e.g. Hobbies"></div><div class="flex" style="justify-content:flex-end;gap:10px"><button class="btn o" data-a="close">Cancel</button><button class="btn" data-a="catSaveQ">Create</button></div>`);break;
case"catSaveQ":{const n=$("qnc").value.trim();if(!n){toast("Give the category a name first");break}if(S.cats[n]!=null){toast("That category already exists");break}S.cats[n]=Object.keys(S.cats).length%7;log("Added category",n);closeSheet();renderAll();break}
case"goalNew":jarNewOpen("goal");break;
case"pensionSet":{const a=S.accounts.find(x=>x.kind=="pension");if(!a){toast("There is no pension account");break}openSheet(`<h3>Update pension balance</h3><div class="sm" style="margin-bottom:12px">Updated by hand when you move money into it. It is kept out of net worth, reports and the forecast unless you switch it on in Reports.</div><div class="fld"><label>Current balance (₪)</label><input id="pnV" type="text" inputmode="decimal" value="${a.v||""}" placeholder="e.g. 412000"></div><div class="flex" style="justify-content:flex-end;gap:10px"><button class="btn o" data-a="close">Cancel</button><button class="btn" data-a="pensionSave">Save</button></div>`);setTimeout(()=>{const i=$("pnV");if(i){i.focus();i.select()}},60);break}
case"pensionSave":{const a=S.accounts.find(x=>x.kind=="pension"),v=parseFloat(String($("pnV").value).replace(/[,\s₪]/g,""));if(!a)break;if(!isFinite(v)||v<0){toast("Enter the balance as a number");break}if(v===a.v){closeSheet();toast("That is already the balance");break}log("Updated pension",fm(a.v)+" → "+fm(v));a.v=v;closeSheet();renderAll();break}
case"billMark":{const t=byId(d.id);if(!t)break;const store=t.to||t.desc;openSheet(`<h3>Mark as a bill</h3><div class="sm" style="margin-bottom:12px">${esc(dn(t))} · ${fm(t.a)} · ${dstr(t.d)}</div>
<label class="opt"><input type="radio" name="bmScope" value="once" checked><span><b>Only this payment</b><span class="sm">A one-off bill that does not repeat. Use it for something that will not come again.</span></span></label>
<label class="opt"><input type="radio" name="bmScope" value="rule"><span><b>Every payment to "${esc(store)}"</b><span class="sm">Each payment counts as a bill, even if the timing varies. Irregular ones still show in Bills.</span></span></label>
<div class="fld" id="bmRep" style="display:none;margin-top:10px"><label>How often does it repeat?</label><select id="bmEvery"><option value="auto">Work it out from the payments</option><option value="1">Monthly</option><option value="2">Every 2 months</option><option value="12">Yearly</option><option value="0">It does not repeat regularly</option></select></div>
<div class="flex" style="justify-content:flex-end;gap:10px;margin-top:8px"><button class="btn o" data-a="close">Cancel</button><button class="btn" data-a="billMarkSave" data-id="${t.id}">Mark as a bill</button></div>`);break}
case"billMarkSave":{const t=byId(d.id);if(!t)break;const scope=(document.querySelector('input[name="bmScope"]:checked')||{}).value||"once",store=t.to||t.desc;
if(scope=="once"){if(S.bills.some(b=>b.mode=="once"&&(b.ids||[]).includes(t.id))){toast("It is already a bill");break}S.bills.push({n:store,mode:"once",ids:[t.id],amt:Math.abs(t.a),src:t.from,cat:t.c||"",match:"#"+t.id,manual:true,every:0});log("Marked as a bill (one-off)",store+" · "+fm(t.a))}
else{const key=String(store).toLowerCase().trim(),v=$("bmEvery").value;if(S.bills.some(b=>b.mode!="once"&&b.match==key)){toast("Payments to this business or person are already bills");break}S.ignoredBills=S.ignoredBills.filter(x=>x!=key);
S.bills.push({n:store,mode:"rule",match:key,src:t.from,cat:t.c||"",amt:Math.abs(t.a),manual:true,rec:v=="auto"?"auto":v=="0"?"irregular":"recurring",...(+v>0?{every:+v,anchor:+t.d.slice(5,7),dom:Math.min(28,+t.d.slice(8,10))}:{})});log("Marked every payment as a bill",store)}
closeSheet();renderAll();break}
case"billUnmark":{const i=S.bills.findIndex(b=>b.mode=="once"&&(b.ids||[]).includes(+d.id));if(i>=0){const b=S.bills.splice(i,1)[0];log("Removed from bills",b.n)}closeSheet();renderAll();break}
case"jarNew":jarNewOpen();break;
case"jarHist":{const had=el.dataset.open=="1";document.querySelectorAll(".cmenu").forEach(m=>m.remove());document.querySelectorAll("[data-open]").forEach(x=>delete x.dataset.open);if(had)break;const j=S.jars.find(x=>x.id==d.id);if(!j)break;
const gap=+((+j.bal||0)-(+j.ledger||0)).toFixed(2),ev=[...(Math.abs(gap)>0.5&&j.ledger!=null?[{k:"0000-00-00",h:`<div class="hr"><span class="hd">Earlier</span><span class="hn">${gap>0?"Starting balance and changes you made":"Taken out earlier (not recorded)"}</span><b class="num ${gap<0?"neg":"pos"}">${gap<0?"−":"+"}₪${f(Math.abs(gap))}</b></div>`}]:[]),...(j.moves||[]).filter(m=>!(m.amt<0&&/^Paid/.test(m.note||""))).map(m=>({k:String(m.at).slice(0,10),h:`<div class="hr"><span class="hd">${dstr(m.at)}</span><span class="hn">${esc(m.note||"")}</span><b class="num ${m.amt<0?"neg":"pos"}">${m.amt<0?"−":"+"}₪${f(Math.abs(m.amt))}</b></div>`})),...S.tx.filter(t=>t.jar&&t.jar.id==j.id).map(t=>({k:t.d,h:`<div class="hr hs" data-a="openTx" data-id="${t.id}"><span class="hd">${dstr(t.d)}</span><span class="hn">${j.kind=="payoff"?"Paid back":"Paid"} · ${esc(dn(t))}</span><b class="num ${j.kind=="payoff"?"":"neg"}">${j.kind=="payoff"?"":"−"}₪${f(t.jar.amt)}</b></div>`}))].sort((x,y)=>y.k.localeCompare(x.k));
cmenu(el,`<div class="hh">History · ${esc(j.n)}</div>`+(ev.length?ev.map(x=>x.h).join(""):`<div class="he2">Nothing has been put into or paid out of this jar yet.</div>`),"hist");break}
case"jarMenu":{const had=el.dataset.open=="1";document.querySelectorAll(".cmenu").forEach(m=>m.remove());document.querySelectorAll("[data-open]").forEach(x=>delete x.dataset.open);if(had)break;cmenu(el,`<button role="menuitem" data-a="jarEdit" data-id="${d.id}"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/></svg>Edit jar</button><button role="menuitem" data-a="jarDone" data-id="${d.id}"><svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>Mark as done</button><button role="menuitem" class="dz" data-a="jarDel" data-id="${d.id}"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>Delete jar</button>`);break}
case"billMenu":{const had=el.dataset.open=="1";document.querySelectorAll(".cmenu").forEach(m=>m.remove());document.querySelectorAll("[data-open]").forEach(x=>delete x.dataset.open);if(had)break;const bb=S.bills[+d.i],ic=x=>`<svg viewBox="0 0 24 24">${x}</svg>`,I={h:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',t:'<path d="M7 4v16M7 4L4 7M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3"/>',f:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',c:'<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',k:'<path d="M5 12l5 5L20 7"/>',x:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'};const bi=BC.find(x=>x.idx==d.i)||{},rec=!bi.once&&!bi.irregular,it=[["billHist","h","History"]];if(rec||bi.irregular)it.push(["billType","t","Change type"]);if(rec){if(bi.flag){it.push(["billCanceled","c","Mark as canceled"],["billFlag","k","Keep this bill"])}else it.push(["billFlag","f","Mark to cancel"])}it.push(["billDel","x","Remove from bills",1]);cmenu(el,it.map(([a2,i2,l,z])=>`<button role="menuitem" ${z?'class="dz" ':""}data-a="${a2}" data-i="${d.i}">${ic(I[i2])}${l}</button>`).join(""));break}
case"jarRelease":{const F=jarFree(),over=+d.amt>0?+d.amt:F.over;if(!(over>0))break;if(!confirm(`Take ₪${f(Math.min(over,F.inJars))} back from the jars, starting with the lowest priority? Their saved amounts go down; nothing else changes.`))break;let need=over;[...jarsS()].reverse().forEach(j=>{if(need<=0||!(heldOf(j)>0))return;const t=Math.min(heldOf(j),Math.ceil(need));j.balNote="Released back to free money";jset(j.id,"bal",+(j.bal-t).toFixed(2));need-=t});toast("Released from the jars");break}
case"jarDone":document.querySelectorAll(".cmenu").forEach(m=>m.remove());jarDone(+d.id);break;
case"jarReopen":{const j=S.jars.find(x=>x.id==d.id);if(!j)break;j.done="";j.p=Math.max(0,...S.jars.filter(x=>!x.done).map(x=>x.p))+1;log("Reopened jar",j.n);renderAll();break}
case"jarAttach":jarAttachOpen(+d.id,d.jar?+d.jar:0);break;case"jaSave":jarAttachSave();break;case"jarDetach":jarDetach(+d.id);break;case"jdYes":closeSheet();jarDoneNow(+d.id);break;
case"jarEdit":document.querySelectorAll(".cmenu").forEach(m=>m.remove());jarEditOpen(+d.id);break;case"jtype":jarCapture();JNT=d.v;jarForm();break;
case"jarYear":{const j=S.jars.find(x=>x.id==+d.id),b=j&&BC.find(x=>x.match==j.bill);if(b)jset(j.id,"need",Math.round(b.mo*12));break}
case"jcat":{JCAT=JCAT.includes(d.k)?JCAT.filter(x=>x!=d.k):[...JCAT,d.k];const ck=$("njKM")&&$("njKM").checked;jarCatsDraw();if(ck&&$("njKM"))$("njKM").checked=true;break}
case"jarSave":{const n=$("njN").value.trim(),bad=m=>{toast(m,{kind:"err"})};if(!n){bad("Give the jar a name");$("njN").focus();break}
const sv=+$("njS").value||0;let need=0,cap=0,auto=false,due="",bill="",months=0;
if(JNT=="payoff"){need=+$("njT").value;if(!(need>0)){bad("Enter the total you owe");$("njT").focus();break}cap=Math.max(0,+$("njC").value||0);if(!(cap>0)){bad("Enter how much you pay back each month");$("njC").focus();break}}
else if(JNT=="goal"&&!(+$("njT").value>0)){cap=Math.max(0,+$("njC").value||0);if(!(cap>0)){bad("Enter a goal, or how much to put aside each month");$("njC").focus();break}}
else if(JNT=="goal"){need=+$("njT").value;due=$("njD")?$("njD").value:"";if(due&&due<TODAY&&!(JEID&&(S.jars.find(x=>x.id==JEID)||{}).due==due)){bad("The date is in the past");break}const c=$("njC").value;if(c!=="")cap=Math.max(0,+c);else if(due)auto=true}
else{const sel=$("njB").value,mo=+$("njMo").value||12;if(isAll(sel)){const tot=allMo(sel);if(!(tot>0)){bad("There are no "+(sel=="*i"?"irregular ":sel=="*"?"regular ":"")+"bills yet");break}need=Math.round(tot*mo);bill=sel;months=mo}else{const b=BC.find(x=>x.match==sel);if(!b){bad("Choose the bill to cover");break}need=Math.round(b.mo*mo);bill=b.match}cap=null}
const dsc=$("njDsc").value.trim();
const kSince=$("njKM")&&$("njKM").checked?MK+"-01":TODAY,oldCats=JEID?((S.jars.find(x=>x.id==JEID)||{}).cats||[]):[],newCats=JCAT.map(k=>oldCats.find(x=>x.c==k)||{c:k,since:kSince});
S.jars.forEach(o=>{if(o.id!=JEID&&o.cats&&o.cats.length&&JCAT.length)o.cats=o.cats.filter(x=>!JCAT.includes(x.c))});
const kind=JNT=="payoff"?"payoff":"",tick=!!($("njOut")&&$("njOut").checked);
if(JEID){const j=S.jars.find(x=>x.id==JEID);if(!j)break;const oldKind=j.kind||"";j.out=kind=="payoff"?(oldKind=="payoff"?Math.max(0,sv-heldOf(j)):sv):tick?((+j.out||0)>0?Math.min(+j.out,sv):sv):0;j.kind=kind;if(oldKind!=kind)log("Changed jar type",j.n+": "+(oldKind=="payoff"?"pay-off":"savings or bills")+" → "+(kind=="payoff"?"pay-off":"savings or bills"));if(sig2(oldCats.map(x=>x.c))!==sig2(JCAT)){j.cats=newCats;log("Changed jar categories",j.n+": "+(JCAT.length?JCAT.join(", "):"none"))}jset(j.id,"n",n);jset(j.id,"desc",dsc);jset(j.id,"need",need);jset(j.id,"bal",sv);jset(j.id,"auto",auto);jset(j.id,"cap",cap);jset(j.id,"due",due);jset(j.id,"bill",bill);jset(j.id,"months",months);closeSheet();renderAll();flushNow();break}
S.jars.push({id:Math.max(0,...S.jars.map(j=>j.id))+1,n,p:Math.max(0,...S.jars.map(j=>j.p))+1,need,cap,auto,bal:sv,out:kind=="payoff"||tick?sv:0,kind,due,bill,desc:dsc,months,cats:newCats});
log("Created jar",n+(kind=="payoff"?" · pay-off":"")+(need?(kind=="payoff"?" · owed ":" · goal ")+fm(need):" · no goal")+(cap==null?" · kept topped up":auto?" · monthly amount worked out from the deadline":cap?" · "+fm(cap)+" / month":" · no auto-fill")+(due?" · by "+due:""));closeSheet();renderAll();break}
case"jarDel":{const j=S.jars.find(x=>x.id==d.id);if(j&&confirm(`Delete the jar "${j.n}"?`)){S.tx.forEach(t=>{if(t.jar&&t.jar.id==j.id)delete t.jar});S.jars=S.jars.filter(x=>x.id!=j.id);log("Deleted jar",j.n);renderAll()}break}
case"jarNoDue":jset(+d.id,"due","");break;
case"curAdd":{const c=$("curSel").value;if(!c)break;S.currencies=[...new Set([...(S.currencies||["ILS"]),c])];log("Added currency",c);renderAll();(async()=>{try{await flushNow();await api("/api/fx/refresh",{method:"POST"});await loadFX();toast(c+" rates loaded")}catch(e){toast("Saved, but rates could not be fetched yet: "+e.message)}})();break}
case"curDel":S.currencies=(S.currencies||[]).filter(x=>x!=d.c);log("Removed currency",d.c);renderAll();flushNow().then(loadFX);break;
case"catSuggest":api("/api/categories/suggested",{method:"POST"}).then(async r=>{await load();renderAll();toast(r.categories||r.rules||r.applied?`Added ${r.categories} categories and ${r.rules} rules${r.applied?`, and sorted ${r.applied} uncategorized transaction${r.applied==1?"":"s"}`:""}`:"You already have them all")}).catch(e=>toast(e.message));break;
case"catRename":{const k=d.k;openSheet(`<h3>Rename category</h3><div class="sm" style="margin-bottom:12px;line-height:1.5">Changes it on every transaction, rule, budget, bill and jar. If a category with the new name already exists, the two become one.</div><div class="fld"><label>New name</label><input id="crnN" value="${esc(k)}" maxlength="60" autocomplete="off"></div><div class="flex" style="justify-content:flex-end;gap:10px"><button class="btn o" data-a="close">Cancel</button><button class="btn" data-a="catRenameGo" data-k="${esc(k)}">Rename</button></div>`);setTimeout(()=>{const i=$("crnN");i&&(i.focus(),i.select())},60);break}
case"catRenameGo":{const k=d.k,n=String($("crnN").value||"").trim().slice(0,60);if(!n){toast("Type a name first",{kind:"err"});break}if(n==k){closeSheet();break}if(n.toLowerCase()=="uncategorized"){toast("That name is reserved.",{kind:"err"});break}
const ex=Object.keys(S.cats).find(x=>x.toLowerCase()==n.toLowerCase()&&x!=k),tg=ex||n;if(ex&&!confirm(`"${ex}" already exists. Merge "${k}" into it?`))break;
if(S.cats[tg]==null)S.cats[tg]=S.cats[k];delete S.cats[k];let c=0;S.tx.forEach(t=>{if(t.c==k){t.c=tg;c++}});S.rules.forEach(r=>{if(r.c==k)r.c=tg});
if(k in S.budgets){if(!(tg in S.budgets))S.budgets[tg]=S.budgets[k];delete S.budgets[k]}
S.bills.forEach(b=>{if(b.cat==k)b.cat=tg});S.jars.forEach(j=>{if(j.cats){j.cats.forEach(x=>{if(x.c==k)x.c=tg});const seen=new Set();j.cats=j.cats.filter(x=>!seen.has(x.c)&&seen.add(x.c))}});
log("Renamed category",`${k} → ${tg} · ${c} transaction${c==1?"":"s"}`);closeSheet();renderAll();toast(`Renamed to ${tg}`);break}
case"catDel":{const k=d.k;if(!confirm(`Delete "${k}"? Its transactions become uncategorized, and its rules and budget are removed.`))break;delete S.cats[k];S.tx.forEach(t=>{if(t.c==k)t.c=""});S.rules=S.rules.filter(r=>r.c!=k);delete S.budgets[k];log("Deleted category",k);renderAll();break}
case"billCanceled":{const b=S.bills[+d.i];b.flag="canceled";b.canceledAt=TODAY;log("Marked bill as canceled",b.n);renderAll();break}
case"billRestore":{const b=S.bills[+d.i];b.flag="";delete b.canceledAt;log("Restored bill",b.n);renderAll();break}
case"txMore":TXN+=TXPAGE;renderTx();break;
case"flowMode":FLOWM=d.m;try{localStorage.setItem("moneyFlow",FLOWM)}catch(e){}renderFlowHome();document.querySelectorAll("#flowSeg button").forEach(b=>b.classList.toggle("on",b.dataset.m==FLOWM));break;
case"jcToggle":JCO=!JCO;jarCatsDraw();break;
case"connHist":{const days=+(document.querySelector(`[data-hist="${d.s}"]`)||{value:365}).value;runJob(d.s,"sync",()=>api(`/api/sync/${d.s}?days=${days}`,{method:"POST"})).then(async r=>{if(!r)return;await load();renderAll();await loadConn();toast(r.ok?(r.message?r.message.charAt(0).toUpperCase()+r.message.slice(1):`${r.added||0} new`):(r.error||"Failed"),{sticky:"hist",ms:12000})}).catch(e=>toast(e.message));break}
case"connAssist":assistStart(d.s);break;
case"assistStop":(async()=>{try{await api("/api/assist/stop",{method:"POST"});toast(d.cancel?"Closed":"Saved. Now press Test connection")}catch(e){toast(e.message)}assistClose()})();break;
case"assistType":{const t=$("assistTxt").value;if(t){assistPost("type",{text:t});$("assistTxt").value=""}break}
case"assistKey":assistPost("key",{key:d.k});break;
case"assistScroll":assistPost("scroll",{dy:+d.d});break;
case"assistCred":assistPost("credential",{field:d.f});break;
case"goConn":closeSheet();nav("set");setTab="conn";renderSet();loadConn();break;
case"syncNow":syncNow();break;case"syncLogRef":loadSyncLog();break;
case"connEdit":if(CONN_OPEN.has(d.s))CONN_OPEN.delete(d.s);else CONN_OPEN.add(d.s);renderConn();break;
case"connForm":CONN_FORM=!CONN_FORM;renderConn();break;
case"connAdd":{const v=$("connPick")&&$("connPick").value;if(!v)break;CONN_FORM=false;connStart(v);break}
case"connCancel":CONN_ADD=CONN_ADD.filter(x=>x!=d.s);renderConn();break;
case"connSave":{const src=d.s,c=CONN.find(c=>c.source==src)||CONN_PEND.find(c=>c.source==src)||{fields:[]},body={},ne=document.querySelector(`[data-cn="${src}"]`);c.fields.forEach(f=>{const el=document.querySelector(`[data-cf="${src}:${f.k}"]`);body[f.k]=el?el.value:""});if(ne)body.nickname=ne.value;if(c.configured&&c.fields.every(f=>!body[f.k])){connCall(src,"/nickname","PUT",{nickname:body.nickname||""},"Nickname saved");break}connCall(src,"","PUT",body,"Saved, encrypted");break}
case"connTest":runJob(d.s,"test",()=>connCall(d.s,"/test","POST",null)).then(r=>{if(r)showTest((CONN.find(c=>c.source==d.s)||{}).label||d.s,r,d.s)});break;
case"connShot":showShot(d.s,(CONN.find(c=>c.source==d.s)||{}).label||d.s);break;
case"connSync":runJob(d.s,"sync",()=>api(`/api/sync/${d.s}`,{method:"POST"})).then(async r=>{if(!r)return;await load();renderAll();await loadConn();toast(r.ok?"Synced · "+(r.added||0)+" new":(r.error||"Failed"))}).catch(e=>toast(e.message));break;
case"connUnlock":connCall(d.s,"/unlock","POST",null,"Unlocked");break;
case"connDel":if(confirm("Remove the saved credentials?"))connCall(d.s,"","DELETE",null,"Removed");break;
case"pwChange":secCall("/api/auth/password",{current:$("pwCur").value,next:$("pwNew").value},"Password changed").then(r=>{if(r)renderSec()});break;
case"tfaStart":secCall("/api/auth/2fa/start").then(r=>{if(r){sec.start=r;renderSec()}});break;
case"tfaEnable":secCall("/api/auth/2fa/enable",{code:$("tfaCode").value},"Two-factor is on").then(r=>{if(r){sec.start=null;renderSec()}});break;
case"tfaDisable":secCall("/api/auth/2fa/disable",{password:$("tfaPw").value},"Two-factor is off").then(r=>{if(r)renderSec()});break;
case"logout":case"logoutAll":fetch(a=="logout"?"/api/auth/logout":"/api/auth/logout-all",{method:"POST"}).then(()=>{try{caches.delete("money-data")}catch(e){}S=emptyState();loaded=false;renderAll();need2fa=false;showAuth("login")});break;
case"bankCsv":if(!$("bankAcc").value){toast("Choose an account first");break}$("bankCsvFile").click();break;
case"importCsv":$("csvFile").click();break;
case"tagRm":tagRemove(d.tk,d.ti,+d.i);break;
case"tagDel":{const t=byId(d.id),old=[...t.tags];t.tags.splice(+d.i,1);log("Removed tag",t.desc+": "+old[+d.i]);renderAll();openTx(d.id);break}
case"jarUp":case"jarDown":{const L=jarsS(),i=L.findIndex(j=>j.id==d.id),k=a=="jarUp"?i-1:i+1;if(k<0||k>=L.length)break;const p=L[i].p;L[i].p=L[k].p;L[k].p=p;log("Reordered jars",L[i].n+" moved "+(a=="jarUp"?"up":"down"));renderAll();break}
case"goalFix":{const j=S.jars.find(x=>x.id==d.id),req=(j.need-j.bal)/monthsTo(j.due);jset(j.id,"auto",false);jset(j.id,"cap",Math.ceil(req/10)*10);break}
case"billNew":billForm();break;
case"billSave":{const n=$("bN").value.trim(),am=+$("bA").value,ev=+$("bE").value;if(!n||!am)break;const match=($("bM").value||n).toLowerCase();S.ignoredBills=S.ignoredBills.filter(x=>x!=match);
S.bills.push({n,amt:am,mode:"rule",...(ev?{every:ev,rec:"recurring",anchor:NOW.getMonth()+1,dom:Math.min(28,+$("bD").value||1)}:{rec:"irregular"}),src:$("bS").value,match,cat:"Subscriptions",lastPaid:TODAY,manual:true});log("Added bill",n+" · "+fm(am)+(ev?"":" · irregular"));closeSheet();renderAll();break}
case"billFlag":{const b=S.bills[+d.i];b.flag=b.flag?"":"cancel";log(b.flag?"Marked to cancel":"Kept bill",b.n);renderAll();break}
case"billDel":{const b=S.bills[+d.i];S.bills.splice(+d.i,1);S.ignoredBills.push(b.match);log("Removed bill",b.n+" · it will not be detected again");renderAll();break}
case"budNew":budForm(d.k);break;
case"budSave":{const k=$("uK").value,v=+$("uA").value;if(!k||!v)break;S.budgets[k]=v;log("Set budget",k+": "+fm(v)+" / month",{type:"budget",k,old:null});closeSheet();renderAll();break}
case"budDel":{const old=S.budgets[d.k];delete S.budgets[d.k];log("Removed budget",d.k,{type:"budget",k:d.k,old});renderAll();break}
case"alDismiss":S.dismissed[d.id]=1;renderAll();break;case"alReset":S.dismissed={};renderAll();break;
case"pushOn":pushOn();break;
case"pushOff":pushOff();break;
case"pushTest":api("/api/push/test",{method:"POST"}).then(r=>toast(r.ok?"Sent":"No device is turned on yet")).catch(()=>toast("Could not reach the server"));break;
case"notifOn":if("Notification" in window)Notification.requestPermission().then(()=>{renderAlertSettings();toast("Permission: "+Notification.permission)});else toast("Not supported on this browser");break;
case"notifTest":notify("Money","Test alert: notifications work").then(ok=>toast(ok?"Sent":"Allow notifications first"));break;
case"nchSave":{const k=d.k,body=k=="telegram"?{token:$("nchTgT").value,chat:$("nchTgC").value}:{url:$("nchWhU").value};api("/api/notify/channels/"+k,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(body)}).then(()=>{toast("Saved, encrypted");return loadNch()}).catch(e=>toast(e.message,{kind:"err"}));break}
case"nchTest":api("/api/notify/channels/"+d.k+"/test",{method:"POST"}).then(r=>toast(r.ok?"Sent":"Not sent. Check the details.",{kind:r.ok?"ok":"err"})).catch(()=>toast("Could not reach the server"));break;
case"nchDel":if(confirm("Stop sending alerts there?"))api("/api/notify/channels/"+d.k,{method:"DELETE"}).then(()=>{toast("Removed");return loadNch()});break;
case"ntfyTest":api("/api/ntfy/test",{method:"POST"}).then(r=>r.ok?toast("Sent to ntfy"):openSheet(`<h3>Not sent</h3><div class="sm" style="margin-bottom:12px">${esc(r.reason||"")}</div><div class="flex" style="justify-content:flex-end"><button class="btn" data-a="close">Done</button></div>`)).catch(()=>toast("Could not reach the server"));break;
case"nwR":renderNW();break;case"nwP":S.nwPension=d.v=="1";save();renderNW();break;
case"fc":fc[d.k]=isNaN(+d.v)?d.v:+d.v;try{localStorage.setItem("moneyFc",JSON.stringify(fc))}catch(e){}JPC=null;renderFc();renderAlerts();break;
case"setTab":setTab=d.t;showPanes();if(HELPOPEN)helpRender();if(d.t=="sync"){loadSyncLog();loadConn()}if(d.t=="conn")loadConn();if(d.t=="backup")loadBackup();if(d.t=="sec")renderSec();if(d.t=="err")loadErr();if(d.t=="rel")loadRel();if(d.t=="alr"||d.t=="notify")loadNch().then(renderAlertSettings);break;
case"accGo":nav("acc");ACC_SEL=d.n;ACCN=50;ACC_Q="";renderAccounts();break;
case"accOpen":ACC_SEL=d.n;ACCN=50;ACC_Q="";renderAccounts();scrollTo(0,0);break;
case"accBack":ACC_SEL=null;renderAccounts();scrollTo(0,0);break;
case"accMore":ACCN+=50;accTxFill();break;
case"accNew":accChoose();break;
case"accManual":accFormOpen(null);break;
case"accConnect":accConnectList();break;
case"accConnectPick":accConnectGo(d.v);break;
case"accEdit":accFormOpen(S.accounts.find(x=>x.id==d.id));break;
case"accBal":accBalOpen(d.id);break;
case"accSave":{const id=d.id,body={name:$("acN").value,kind:$("acK").value,countNW:$("acNW").checked,countReports:$("acR").checked};if(!id){body.currency=$("acC").value;body.balance=$("acB").value}
// a balance in a currency the app does not follow yet needs its rate: the currency is added to Settings → Currencies, as if it had been added there
const cur=body.currency,newCur=!id&&cur&&cur!="ILS"&&!(S.currencies||[]).includes(cur);if(newCur){S.currencies=[...new Set([...(S.currencies||["ILS"]),cur])];log("Added currency",cur+" (with a new account)")}
api(id?"/api/accounts/"+id:"/api/accounts",{method:id?"PUT":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}).then(async r=>{await accAfter(id?"Saved":"Account added",id?undefined:body.name);if(newCur){try{await api("/api/fx/refresh",{method:"POST"});await loadFX();toast(cur+" added to your currencies and its rates loaded")}catch(e){toast(cur+" added to your currencies. Its rates could not be fetched yet: "+e.message)}}}).catch(e=>toast(e.message));break}
case"accBalSave":api("/api/accounts/"+d.id+"/balance",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({balance:$("abV").value,note:$("abN").value})}).then(()=>accAfter("Balance updated")).catch(e=>toast(e.message));break;
case"accDel":if(confirm("Remove this account? This cannot be undone."))api("/api/accounts/"+d.id,{method:"DELETE"}).then(()=>accAfter("Account removed",null)).catch(e=>toast(e.message));break;
case"accAddTx":openAdd({acc:d.n,cur:d.cur,amt:0,plain:true});break;
case"helpToggle":helpSet(!HELPOPEN);break;case"helpClose":helpSet(false);break;
case"helpAt":helpAt(d.k,d.b);break;
case"recapGo":if(window.recapGo)recapGo(d.k);break;
case"helpJump":{const e=$("hs"+d.i);if(e)e.scrollIntoView({behavior:"smooth",block:"start"});break}
case"alTab":alTab=d.t;renderAlerts();break;
case"alHistMore":loadAlertHistory(true);break;
case"alSettings":nav("set");setTab="alr";renderSet();loadNch().then(renderAlertSettings);break;
case"logMore":LOGN+=50;renderSet();break;
case"syncLogMore":SLOGN+=50;loadSyncLog();break;
case"catTab":catTab=d.t;showPanes();break;
case"nameRuleAdd":{const k=$("nrk").value.trim(),n=$("nrn").value.trim();if(!k||!n){toast("Type the text to match and the name",{kind:"err"});break}S.cfg.nameRules=S.cfg.nameRules||[];S.cfg.nameRules.push({k,n,f:$("nrf").value,m:$("nrm").value});log("Added name rule",'"'+k+'" → '+n);renderAll();toast("Name rule added");break}
case"nameRuleDel":{const r=(S.cfg.nameRules||[]).splice(+d.i,1)[0];if(r){log("Deleted name rule",'"'+r.k+'" → '+r.n);renderAll()}break}
case"nameRuleFrom":{const t=byId(d.id);if(!t)break;NRID=t.id;const f0=t.memo?"memo":"desc";openSheet(`<h3>Name rule</h3><div class="sm" style="margin-bottom:12px;line-height:1.5">Any entry that matches gets this display name. The entry's own details are not changed. A name you give one entry by hand always wins over a rule.</div>
<div class="fld"><label>Look in</label><select id="nrF" data-c="nrfill">${Object.entries(NFIELDS).map(([k,l])=>`<option value="${k}" ${k==f0?"selected":""}>${l}</option>`).join("")}</select></div>
<div class="fld"><label>Match</label><select id="nrM"><option value="in">Contains</option><option value="eq">Is exactly</option></select></div>
<div class="fld"><label>Text</label><input id="nrK" value="${esc(nameField(t,f0)||"")}"></div>
<div class="fld"><label>Call it</label><input id="nrN" maxlength="80" value="${esc((S.cfg.renames||{})[t.id]||"")}" placeholder="For example: Salary"></div>
<div class="flex" style="gap:8px;margin-top:14px"><button class="btn" data-a="nameRuleSave">Add rule</button><button class="btn o" data-a="close">Cancel</button></div>`);break}
case"nameRuleSave":{const k=$("nrK").value.trim(),n=$("nrN").value.trim();if(!k||!n){toast("Type the text to match and the name",{kind:"err"});break}S.cfg.nameRules=S.cfg.nameRules||[];S.cfg.nameRules.push({k,n,f:$("nrF").value,m:$("nrM").value});const fld=$("nrF").value,md=$("nrM").value,c=S.tx.filter(x=>!x.virtual&&nameHit(x,{k,f:fld,m:md})).length;log("Added name rule",'"'+k+'" → '+n);closeSheet();renderAll();toast(`If ${NFIELDS[fld].toLowerCase()} ${md=="eq"?"is exactly":"contains"} “${k}” → “${n}”. ${c} entr${c==1?"y":"ies"} renamed. See it in Categories → Name rules.`,{title:"Name rule added"});break}
case"ruleAdd":{const k=$("rk").value.trim();if(!k)break;if(S.rules.some(r=>r.k.toLowerCase()==k.toLowerCase())){toast("There is already a rule for that text",{kind:"err"});break}const r={k,c:$("rc").value,t:""};S.rules.push(r);const before=S.tx.filter(t=>!t.c).length;log("Added rule",'"'+k+'" → '+r.c);renderAll();const n=before-S.tx.filter(t=>!t.c).length;toast(n?`Rule added. ${n} uncategorized transaction${n==1?"":"s"} now in ${r.c}.`:"Rule added. It applies to new transactions.")}break;
case"trAdd":{const k=$("trk").value.trim();if(!k)break;const pend=document.querySelector('.tbox[data-tk="newrule"] .tin');if(pend&&pend.value.trim())pend.value.split(",").map(normTag).filter(Boolean).forEach(g=>{if(!NR_TAGS.includes(g))NR_TAGS.push(g)});if(!NR_TAGS.length){toast("Add at least one tag",{kind:"err"});break}
const r={k,t:NR_TAGS.join(",")};S.tagRules.push(r);log("Added tag rule",'"'+k+'" → '+r.t);NR_TAGS=[];renderAll();tagRuleAsk(S.tagRules.length-1,true);break}
case"trDel":{const r=S.tagRules.splice(+d.i,1)[0];if(r)log("Deleted tag rule",'"'+r.k+'" → '+r.t);renderAll();break}
case"trApply":{const r=S.tagRules[+d.i];if(!r)break;const n=applyRuleToExisting(r);log("Tagged past transactions",n+' · "'+r.k+'" → '+r.t);closeSheet();renderAll();toast(`Tagged ${n} transaction${n==1?"":"s"}`);break}
case"ruleDel":{const r=S.rules.splice(+d.i,1)[0];log("Deleted rule",'"'+r.k+'" → '+r.c);renderAll();break}
case"catAdd":{const n=$("nc").value.trim();if(n&&!S.cats[n]){S.cats[n]=Object.keys(S.cats).length%7;log("Added category",n);renderAll()}break}
case"undo":{const e=S.audit[+d.i],u=e&&e.undo;if(!u)break;if(u.type=="tx"){const t=byId(u.id);if(t)t[u.f]=u.old}else if(u.type=="budget"){if(u.old==null)delete S.budgets[u.k];else S.budgets[u.k]=u.old}else if(u.type=="merchant"){S.hiddenMerchants=(S.hiddenMerchants||[]).filter(x=>x!=u.name)}else if(u.type=="jar"){const j=S.jars.find(x=>x.id==u.id);if(j){const was=j[u.f];j[u.f]=u.old;if(u.f=="bal"){j.balEdit=true;if(u.old>was){j.balUndo=1;j.balNote="Undone";j.got=+((+j.got||0)+(u.old-was)).toFixed(2)}}}}e.undo=null;log("Undid a change",e.action+": "+e.detail);renderAll();break}
case"bkRun":bkRun();break;
case"bkFind":$("bkFile").click();break;
case"bkRestore":{const f=(BK.files||[]).find(x=>x.name==d.n);if(f&&f.encrypted)bkAskPw(d.n,"");else bkInspect(d.n);break}
case"bkAskGo":{const v=$("bkAskIn").value;if(!v){toast("Enter the password");break}bkInspect(d.n,v);break}
case"bkRestoreGo":bkRestoreGo(d.n,d.p);break;
case"bkDel":bkDel(d.n);break;
case"bkPw":{openSheet(`<h3>Backup password</h3><div class="sm" style="margin-bottom:12px;line-height:1.5"><span>New backups will need this password to be opened, here or on another device. If you forget it, those backups cannot be opened. Older backups keep the password they were made with. The app keeps the password on this device so the daily backup can use it.</span></div><div class="fld"><label>Password</label><input type="password" id="bkPw1" autocomplete="new-password"></div><div class="fld"><label>Repeat the password</label><input type="password" id="bkPw2" autocomplete="new-password"></div><div class="flex" style="justify-content:flex-end;gap:10px"><button class="btn o" data-a="close">Cancel</button><button class="btn" data-a="bkPwGo">Save</button></div>`);setTimeout(()=>{const i=$("bkPw1");i&&i.focus()},60);break}
case"bkPwGo":{const a=$("bkPw1").value,b2=$("bkPw2").value;if(a.length<6){toast("Use at least 6 characters");break}if(a!==b2){toast("The two passwords are not the same");break}closeSheet();bkPut({password:a});break}
case"bkPwOff":{if(!confirm("Turn off the password? New backups will not be protected."))break;bkPut({password:null});break}
case"bkDirDefault":bkPut({dir:""});break;
case"bkChoose":window.desktop.chooseFolder(BK.dir).then(r=>{if(r)bkPut({dir:r})});break;
case"bkOpen":window.desktop.openFolder(BK.dir);break;
case"exOpen":openExport(d.from);break;case"exGo":exGo();break;case"exReset":EXFROM="";buildExport();toast("Export options reset");break;case"exAccts":{EX.accts=d.v=="all"?null:new Set();$("exAccts").innerHTML=exAcctList();exSync();break}case"exColsAll":{EX.cols=d.v=="all"?EXCOLS.map(c=>c[0]):[];$("exColsL").querySelectorAll("input").forEach(i=>{i.checked=EX.cols.includes(i.value)});exSync();break}case"exCats":{EX.cats=d.v=="all"?null:new Set();$("exCats").innerHTML=exCatList();exSync();break}case"exportJson":{const b=new Blob([JSON.stringify(S,null,1)],{type:"application/json"}),l=document.createElement("a");l.href=URL.createObjectURL(b);l.download="money-export.json";l.click();toast("Downloaded money-export.json. Look in your Downloads folder.");break}
case"install":if(dip){dip.prompt();dip.userChoice.finally(()=>{dip=null;closeSheet();renderSet()})}break}}
document.addEventListener("click",e=>{if(!e.target.closest("[data-a=jarMenu],[data-a=billMenu],[data-a=jarHist],.cmenu.hist"))document.querySelectorAll(".cmenu").forEach(m=>m.remove());const el=e.target.closest("[data-a]");if(el){if(el.tagName=="BUTTON"&&el.disabled)return;if(el.classList.contains("tu")){const tt=el.closest(".toast");if(tt)tt.remove()}act(el.dataset.a,el.dataset,el)}else if(!$("pop").contains(e.target)&&!e.target.closest("#themeBtn,.ddm"))popOff()});
document.addEventListener("input",e=>{if(e.target.id=="roK")roUpdate()});
document.addEventListener("change",e=>{if(e.target.id=="roC")roUpdate()});
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("a[download]");if(a&&(a.getAttribute("href")||"").startsWith("/api/backup/file/"))toast("Downloading the backup. Look in your Downloads folder.")});
document.addEventListener("change",async e=>{if(e.target.id!="bkFile")return;const f=e.target.files[0];e.target.value="";if(!f)return;toast("Reading the file…");try{const j=await api("/api/backup/upload?name="+encodeURIComponent(f.name),{method:"POST",headers:{"content-type":"application/octet-stream"},body:f});BK=j;renderBackup();const x=(j.files||[]).find(y=>y.name==j.name);if(x&&x.encrypted)bkAskPw(j.name,"");else bkInspect(j.name)}catch(x){toast(x.message)}});
document.addEventListener("change",e=>{if(e.target.name=="bmScope"){const r=$("bmRep");if(r)r.style.display=e.target.value=="rule"?"":"none";return}
if(e.target.id=="bankCsvFile"){const fl=e.target.files[0];if(!fl)return;fl.text().then(t=>api(`/api/import/bank-csv?account=${encodeURIComponent($("bankAcc").value)}&positiveIsExpense=${$("bankPos").checked?1:0}`,{method:"POST",headers:{"content-type":"text/csv"},body:t})).then(async r=>{await load();renderAll();toast(`Read ${r.rows} rows · ${r.added} new, ${r.merged} merged`)}).catch(x=>toast("Import failed: "+x.message));e.target.value="";return}
if(e.target.id=="csvFile"){const fl=e.target.files[0];if(!fl)return;fl.text().then(t=>api("/api/import/wise-csv",{method:"POST",headers:{"content-type":"text/csv"},body:t})).then(async r=>{await load();renderAll();toast("Imported "+Object.values(r).reduce((s,x)=>s+x.added,0)+" new, merged "+Object.values(r).reduce((s,x)=>s+x.merged,0))}).catch(x=>toast("Import failed: "+x.message));e.target.value="";return}
if(e.target.dataset&&e.target.dataset.c=="ltype"){RN.lt=e.target.value;saveRng();reps();return}
const cm=e.target.closest('[data-c="cmp"],[data-c="rmon"]');if(cm){const id=cm.dataset.r;if(cm.dataset.c=="cmp")CMP[id]=cm.value;else RN[id]=+cm.value;saveRng();reps();return}
const rg=e.target.closest("[data-c^=rng]");if(rg){const id=rg.dataset.r,c=rg.dataset.c,r=RNG[id];
if(c=="rng"){if(rg.value=="custom"){openRangeCal(id,rg);return}r.p=rg.value}saveRng();if(id=="tx")renderTx();else reps();return}
const el=e.target.closest("[data-c]");if(!el)return;const c=el.dataset.c,id=el.dataset.id;
if(c=="bkset"){const k=el.dataset.k;bkPut({[k]:k=="on"||k=="withDocs"?el.checked:k=="keep"?+el.value:el.value});return}
if(c=="syncset"){if(!el.value)return;api("/api/sync/settings",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({[el.dataset.k]:el.dataset.k=="at"?el.value:+el.value,tz:(Intl.DateTimeFormat().resolvedOptions().timeZone||"")})}).then(j=>{SYNC_SET=j;renderConn();toast("Saved")}).catch(x=>toast(x.message));return}
if(c=="upcat"){const bi=+el.dataset.i,bb=S.bills[bi];if(bb){const v=el.value;bb.cat=v||"";const L=billTx(bb),lt=L[L.length-1];if(lt&&!lt.virtual&&lt.c!==v){lt.c=v}log("Changed bill category",bb.n+" → "+(v||"Uncategorized"));renderAll()}}else if(c=="txcat")setField(id,"c",el.value);else if(c=="txname")setName(+id==id?+id:id,el.value);else if(c=="nrfill"){const t=byId(NRID),v=t?nameField(t,el.value):"";if($("nrK")&&el.value!="any")$("nrK").value=v||""}else if(c=="nrk"||c=="nrn"||c=="nrf"||c=="nrm"){const r=(S.cfg.nameRules||[])[+el.dataset.i];if(r){const k={nrk:"k",nrn:"n",nrf:"f",nrm:"m"}[c];r[k]=k=="k"||k=="n"?el.value.trim():el.value;if(!r.k||!r.n){toast("A name rule needs text to match and a name",{kind:"err"})}log("Changed name rule",r.k+" → "+r.n);renderAll()}}else if(c=="note")setField(id,"note",el.value);
else if(c=="tagAdd"){const v=el.value.trim(),t=byId(id);if(v&&t&&!t.tags.includes(v)){t.tags.push(v);log("Added tag",t.desc+": "+v);renderAll();openTx(id)}}
else if(c=="txfile"){const t=byId(id);flushNow().then(()=>uploadDocs(id,[...el.files])).then(us=>{us.forEach(u=>{t.docs.push(u.filename);(t.docIds=t.docIds||[]).push(u.id);(t.docHas=t.docHas||[]).push(true)});log("Attached document",t.desc+": "+us.map(u=>u.filename).join(", "));renderAll();openTx(id)}).catch(()=>toast("The upload failed"))}
else if(c=="jarneed")jset(id,"need",+el.value);else if(c=="jarcap")jset(id,"cap",Math.max(0,+el.value||0));else if(c=="jarbal")jset(id,"bal",+el.value||0);else if(c=="jardue")jset(id,"due",el.value||"");else if(c=="jarpri"){jarMoveTo(id,+el.value)}else if(c=="jarmode"){const j=S.jars.find(x=>x.id==id);if(j){const m=el.value;if(m=="bill"){jset(id,"auto",false);jset(id,"cap",null)}else{jset(id,"auto",m=="auto");if(j.cap==null)jset(id,"cap",0)}}}else if(c=="jarbill")jset(id,"bill",el.value);
else if(c=="budget"){const k=el.dataset.k,old=S.budgets[k];S.budgets[k]=+el.value;log("Changed budget",k+": "+fm(old)+" → "+fm(+el.value),{type:"budget",k,old});renderAll()}
else if(c=="cfg"){S.cfg[el.dataset.k]=el.checked?1:0;renderAll()}else if(c=="cfgn"){S.cfg[el.dataset.k]=+el.value;renderAll()}
else if(c=="ntfy"){S.ntfy=el.value.trim();save()}});
$("jbuf").addEventListener("change",e=>{S.jarsBuffer=Math.max(0,+e.target.value||0);renderAll()});
["q","fSrc","fCat","fTag","fTy","fSort"].forEach(i=>$(i).addEventListener("input",renderTx));
$("fGroup").addEventListener("input",e=>{GMODE=e.target.value;try{localStorage.setItem("moneyGroup",GMODE)}catch(x){}renderTx()});
const tip=$("tip");let tipTimer=null,tipEl=null,tipHide=null;
function tipPlace(el){const r=el.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;let x=r.left+r.width/2-w/2,y=r.bottom+10;if(y+h>innerHeight-8)y=r.top-h-10;x=Math.max(10,Math.min(x,innerWidth-w-10));y=Math.max(10,y);tip.style.left=x+"px";tip.style.top=y+"px"}
function tipAt(x,y){const w=tip.offsetWidth,h=tip.offsetHeight;let px=x-w/2,py=y-h-14;if(py<8)py=y+18;px=Math.max(8,Math.min(px,innerWidth-w-8));tip.style.left=px+"px";tip.style.top=py+"px"}
// a tooltip written on several lines is laid out: first line a title, "label<TAB>value" lines as rows, "---" a divider, any other line a note
const TP=(title,rows,note)=>[title,...rows.map(r=>r==="---"?"---":r[0]+"\t"+r[1]),...(note?["---",note]:[])].join("\n");
function tipFill(t){const T=x=>window.HE&&HE.on?HE.T(x):x,TN=x=>{if(!(window.HE&&HE.on))return x;const w=HE.T(x);if(w!==x)return w;return x.split(/(?<=[.!?])\s+/).map(HE.T).join(" ")},L=String(t).split("\n");tip.textContent="";tip.classList.toggle("rich",L.length>1);if(L.length<2){tip.textContent=t;return}
L.forEach((ln,i)=>{const d=document.createElement("div");if(ln==="---")d.className="tdv";else if(i>0&&ln[0]==="!"){d.className="ta";d.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 20h20L12 3zM12 10v4M12 17.5v.01"/></svg>';const m=document.createElement("span");m.textContent=TN(ln.slice(1));d.appendChild(m)}else if(i==0){d.className="tt";d.textContent=T(ln)}else if(ln.includes("\t")){const[a,b]=ln.split("\t");d.className="tr";const x=document.createElement("span"),y=document.createElement("b");x.textContent=T(a);y.textContent=/[A-Za-z]{3}/.test(b)?T(b):b;d.append(x,y)}else{d.className="tn";const tt=TN(ln),k=tt.indexOf(":");if(k>1&&k<30&&/^[A-Z][A-Za-z ]{1,26}: /.test(ln)){const b=document.createElement("b");b.textContent=tt.slice(0,k+1);d.append(b,tt.slice(k+1))}else d.textContent=tt}tip.appendChild(d)})}
function tipCol(el){const r=el.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;let x=r.right+8;if(x+w>innerWidth-8)x=r.left-w-8;if(x<8)x=Math.max(8,Math.min(r.left+r.width/2-w/2,innerWidth-w-8));const y=Math.max(8,Math.min(r.top+34,innerHeight-h-8));tip.style.left=x+"px";tip.style.top=y+"px"}
function tipShow(el,e){tipFill(el.dataset.tip);tip.classList.add("on");if(el.matches(".wc"))tipCol(el);else if(e&&el.closest("svg"))tipAt(e.clientX,e.clientY);else if(e&&e.clientX!=null&&el.getBoundingClientRect().height>150)tipAt(e.clientX,e.clientY);else tipPlace(el);tipEl=el}
let tipPin=null;function tipOff(){clearTimeout(tipTimer);clearTimeout(tipHide);tipTimer=null;tip.classList.remove("on");tipEl=null;if(tipPin){tipPin.classList.remove("on");tipPin=null}}
// charts show their tooltip at once and follow the pointer; other hints appear after a short pause so they never flash while moving the mouse
document.addEventListener("mouseover",e=>{const t=e.target.closest&&e.target.closest("[data-tip]");if(!t){if(tipEl)tipOff();return}if(t===tipEl)return;
if(t.closest("svg")){clearTimeout(tipTimer);tipShow(t,e);return}tipOff();tipTimer=setTimeout(()=>tipShow(t,e),400)});
document.addEventListener("mousemove",e=>{if(tipEl&&tipEl.closest("svg")&&tip.classList.contains("on"))tipAt(e.clientX,e.clientY)});
document.addEventListener("mouseout",e=>{if(tipPin)return;const t=e.target.closest&&e.target.closest("[data-tip]");if(t&&!t.contains(e.relatedTarget)){const n=e.relatedTarget&&e.relatedTarget.closest&&e.relatedTarget.closest("[data-tip]");if(!(n&&n.closest("svg")&&t.closest("svg")))tipOff()}});
document.addEventListener("mousedown",tipOff);document.addEventListener("keydown",tipOff);addEventListener("scroll",tipOff,{passive:true,capture:true});
document.addEventListener("touchstart",e=>{const t=e.target.closest("[data-tip]");if(!t)return;tipOff();tipTimer=setTimeout(()=>{tipShow(t);tipHide=setTimeout(tipOff,4500)},450)},{passive:true});
document.addEventListener("touchend",()=>{clearTimeout(tipTimer)},{passive:true});
// Every explanatory tooltip gets a small (i) next to its label. Touching or clicking it opens the tooltip at once (there is no hover on a phone);
// hovering it, or the section it sits in, opens it too. The tooltip stays until you tap somewhere else.
const TI_NO="button:not(.jst),a,input,select,textarea,option,td,tr,th,i,svg,.jpm,.mh,.dchip,.v";
function tipIcons(){document.querySelectorAll("[data-tip]:not([data-ti])").forEach(el=>{el.dataset.ti="1";if(el.closest("svg")||el.matches(TI_NO)||el.querySelector(":scope > .tinfo"))return;
const host=el.querySelector(":scope > .lbl")||(el.firstElementChild&&el.firstElementChild.matches("span,b,div")&&el.children.length>1?el.firstElementChild:null)||el;
host.insertAdjacentHTML("beforeend",'<i class="tinfo" role="button" tabindex="0" aria-label="More info"></i>')})}
{let raf=0;new MutationObserver(ms=>{if(mmQuiet(ms))return;if(!raf)raf=requestAnimationFrame(()=>{raf=0;tipIcons()})}).observe(document.body,{childList:true,subtree:true});addEventListener("DOMContentLoaded",tipIcons);tipIcons()}
function tipPinOn(i){const host=i.closest("[data-tip]");if(!host)return;tipOff();tipFill(host.dataset.tip);tip.classList.add("on");tipPlace(i);tipEl=host;tipPin=i;i.classList.add("on")}
document.addEventListener("click",e=>{const i=e.target.closest&&e.target.closest(".tinfo");if(!i)return;e.preventDefault();e.stopPropagation();tipPinOn(i)},true);
document.addEventListener("keydown",e=>{if((e.key=="Enter"||e.key==" ")&&e.target.classList&&e.target.classList.contains("tinfo")){e.preventDefault();tipPinOn(e.target)}},true);
document.addEventListener("touchstart",e=>{if(tipPin&&!(e.target.closest&&e.target.closest(".tinfo")))tipOff()},{passive:true});document.addEventListener("touchmove",()=>{clearTimeout(tipTimer)},{passive:true});
matchMedia("(prefers-color-scheme:dark)").addEventListener("change",()=>{if(st.mode=="auto")themeSwap(()=>{applyTheme();renderAll()})});
addEventListener("beforeinstallprompt",e=>{e.preventDefault();dip=e;renderSet()});addEventListener("appinstalled",()=>{dip=null;renderSet()});
const net=()=>$("offline").classList.toggle("on",!navigator.onLine);addEventListener("online",net);addEventListener("offline",net);net();
if("serviceWorker" in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("/sw.js").then(()=>{swOk=true;renderSet()}).catch(()=>{});
addEventListener("DOMContentLoaded",()=>renderHead()); /* the scripts load one after the other: wait until all of them are in */
function syncLabel(){const real=SRC.filter(x=>x.k!="pension"),ok=real.filter(x=>x.state=="ok"&&x.t&&x.t!="never");$("sync").innerHTML=ok.length?"Synced<br><b style='color:var(--tx);font-size:12px'>"+esc(ok[0].t)+"</b>":real.some(x=>x.state=="bad")?"Sync failed<br><b style='color:var(--tx);font-size:12px'>see sources</b>":"Not synced<br><b style='color:var(--tx);font-size:12px'>yet</b>";
const d=document.querySelector("#syncb i.live");if(d){const st=real.some(x=>x.state=="bad")?"bad":ok.length?"ok":"warn";d.className="live "+st}}
let authMode="login",need2fa=false;
function showAuth(mode){if(mode)authMode=mode;const setup=authMode=="setup";$("auth").style.display="flex";$("authT").textContent=setup?"Welcome. Choose a password":"Sign in";$("authS").textContent=setup?"This protects your financial data. Use at least 10 characters. It is stored only as a hash on your server.":"Your data stays on your server.";$("authP2w").style.display=setup?"":"none";$("authCw").style.display=need2fa?"":"none";$("authP").autocomplete=setup?"new-password":"current-password";$("authB").textContent=setup?"Create password":"Sign in";setTimeout(()=>$("authP").focus(),50)}
function hideAuth(){$("auth").style.display="none";$("authP").value=$("authP2").value=$("authC").value="";$("authE").textContent=""}
async function authGo(){const setup=authMode=="setup",pw=$("authP").value;$("authE").textContent="";
if(setup&&pw!==$("authP2").value){$("authE").textContent="The two passwords are different.";return}
const r=await fetch(setup?"/api/auth/setup":"/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:pw,code:$("authC").value})}),j=await r.json().catch(()=>({}));
if(r.ok){need2fa=false;await afterLogin();return}
if(j.need2fa){need2fa=true;showAuth();$("authE").textContent=j.error||"";$("authC").focus();return}
if(j.setup){showAuth("setup");return}$("authE").textContent=j.error||"Could not sign in"}
document.addEventListener("keydown",e=>{if(e.key=="Enter"&&$("auth").style.display=="flex")authGo();if(DV){const t=byId(DV.id);if(e.key=="Escape")closeDocs();else if(t&&(e.key=="ArrowRight"||e.key=="ArrowLeft")){const n=t.docs.length,k=e.key=="ArrowRight"?1:-1;DV.i=DV.i==null?0:(DV.i+k+n)%n;renderDocs()}}});
// the server runs the automatic sync in the time zone of the device that last saved the schedule: keep it the same as this one
async function syncTz(){try{const z=Intl.DateTimeFormat().resolvedOptions().timeZone,j=await (await fetch("/api/sync/settings")).json();if(z&&j.tz!==z)await fetch("/api/sync/settings",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({tz:z})})}catch(e){}}
async function afterLogin(){hideAuth();if(await prefsRestore())return;syncTz();const verP=fetch("/api/version",{cache:"no-store"}).then(r=>r.json()).catch(()=>null);try{await load();await Promise.race([loadFX(),sleep(1500)]);renderAll();syncLabel();Promise.resolve(updCheck(verP)).then(()=>{if(!$("updPop"))setTimeout(profileAsk,500)})}catch(e){bootDone();fail();return}initUpdates();watchJobs();if(!window.__poll){const chk=()=>{if(dirty||saving||document.visibilityState!="visible")return;fetch("/api/rev",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>{if(!j||j.rev===S.rev||dirty||saving)return;return load().then(()=>{renderAll();syncLabel()})}).catch(()=>{})};window.__poll=setInterval(chk,60000);if(window.EventSource){const es=new EventSource("/api/events");es.addEventListener("rev",chk)};document.addEventListener("visibilitychange",chk);addEventListener("focus",chk)}const p=new URLSearchParams(location.search),hv=location.hash.slice(1),pv=viewFromPath();if(p.get("view")&&TITLES[p.get("view")])nav(p.get("view"));else if(TITLES[hv])nav(hv,true);else if(pv&&pv!="dash")nav(pv,true);if(p.get("add"))openAdd();if("Notification" in window&&Notification.permission=="granted"){alerts().filter(x=>x.sev=="high").slice(0,2).forEach(x=>notify("Money · "+x.title,x.text))}}
const fail=()=>document.querySelector("main").insertAdjacentHTML("afterbegin",'<div class="card warn" style="margin-bottom:16px"><b>Cannot reach the server</b><div class="sm">Your data lives on the server. Check that you are on the home network or Tailscale, then reload.</div></div>');
addEventListener("online",()=>{if(dirty)flush()});
const bootDone=()=>{const h=document.documentElement;if(!h.classList.contains("boot"))return;h.style.background="";h.classList.add("intro");h.classList.remove("boot");setTimeout(()=>h.classList.remove("intro"),700)}; // the entrance animation plays once, not on every redrawsetTimeout(bootDone,10000); // never leave the splash up if something goes wrong
async function boot(){applyTheme();let st;try{st=await (await fetch("/api/auth/status",{cache:"no-store"})).json()}catch(e){bootDone();fail();return}
if(!st.authed){need2fa=false;bootDone();showAuth(st.setup?"setup":"login");return}await afterLogin();bootDone()}
if(HELPOPEN)helpSet(true);
