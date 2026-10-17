["confirm","alert","prompt"].forEach(k=>{const o=window[k].bind(window);window[k]=(m,...a)=>o(HE.T(String(m)),...a)});
{const _c=window.confirm.bind(window),_p=window.prompt.bind(window),_a=window.alert.bind(window),tt=m=>{m=String(m);try{return window.HE&&HE.on?HE.T(m):m}catch(e){return m}};window.confirm=m=>_c(tt(m));window.prompt=(m,d)=>_p(tt(m),d);window.alert=m=>_a(tt(m))} // the browser's own dialogs are not on the page, so they are translated here
const _fetch=window.fetch.bind(window);window.fetch=async(u,o={})=>{o={...o,credentials:"same-origin"};if(o.method&&o.method!="GET")o.headers=Object.assign({},o.headers,{"x-requested-with":"money"});const r=await _fetch(u,o);if(r.status==401&&String(u).startsWith("/api/")&&!String(u).startsWith("/api/auth/")){need2fa=false;showAuth("login")}return r};
/* appearance, language and other view choices are also kept on the server, so a new window address or a reinstall does not lose them */
const PREF_KEYS=["moneySugg","moneyTheme","moneyThemes","moneyThemeAs","moneyLang","moneyBoot","moneyFc","moneyFlow","moneyGroup","moneyDf","moneyWs","moneyHelp","moneyRanges","moneyTrend"];let PREFS_ON=false;
const prefsAll=()=>{const o={};PREF_KEYS.concat("moneyPrefsAt").forEach(k=>{try{const v=localStorage.getItem(k);if(v!=null)o[k]=v}catch(e){}});return o};
const prefsPush=()=>{if(!PREFS_ON)return;fetch("/api/prefs",{method:"PUT",keepalive:true,headers:{"content-type":"application/json"},body:JSON.stringify(prefsAll())}).catch(()=>{})};
// every change made by the user is stamped with the time it was made, so the newest copy (here or on the server) is the one that wins
try{const _si=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){_si.call(this,k,v);if(this===localStorage&&PREF_KEYS.includes(k)&&PREFS_ON){_si.call(this,"moneyPrefsAt",String(Date.now()));prefsPush()}}}catch(e){}
// The server keeps a copy of the appearance and other preferences. Each window address (and each device) has its own browser storage, so at every start the newer
// of the two copies wins: a change made in one place shows everywhere, an update that opens the app at a new address keeps your settings, and an older copy never overwrites a newer one.
async function prefsRestore(){try{const r=await fetch("/api/prefs",{cache:"no-store"});if(!r.ok)return false;const sv=await r.json()||{};
const svAt=+sv.moneyPrefsAt||0,lcAt=+(localStorage.getItem("moneyPrefsAt")||0),hasSv=PREF_KEYS.some(k=>typeof sv[k]=="string"),used=!!localStorage.getItem("moneyPrefsSeen");
// the server wins when it is newer, or when this window has never been used with saved preferences; otherwise what is here wins
const useServer=hasSv&&(svAt>lcAt||(svAt==0&&lcAt==0&&!used));let diff=0;
if(useServer){const was=PREFS_ON;PREFS_ON=false;PREF_KEYS.forEach(k=>{if(typeof sv[k]=="string"&&localStorage.getItem(k)!==sv[k]){try{localStorage.setItem(k,sv[k]);diff++}catch(e){}}});if(svAt)try{localStorage.setItem("moneyPrefsAt",String(svAt))}catch(e){}PREFS_ON=was}
else if(!lcAt)try{localStorage.setItem("moneyPrefsAt",String(Date.now()))}catch(e){}
let loop=false;try{loop=sessionStorage.getItem("moneyPrefsRl")==="1";sessionStorage.setItem("moneyPrefsRl","1")}catch(e){}
try{localStorage.setItem("moneyPrefsSeen","1")}catch(e){}
PREFS_ON=true;
if(diff&&!loop){location.reload();return true}
if(!useServer||diff===0&&svAt!==+(localStorage.getItem("moneyPrefsAt")||0))prefsPush()}catch(e){}return false}
const $=id=>document.getElementById(id),f=n=>Math.abs(n).toLocaleString("en-IL",{maximumFractionDigits:0}),fm=n=>(n<0?"−":"")+"₪"+f(n),esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
/* every drop-down opens the app's own animated menu instead of the browser's; the select underneath keeps the value and fires change as usual */
(()=>{let M=null,cur=null,idx=-1;const vd=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value"),CK='<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>';
const close=()=>{if(!M)return;const m=M;M=null;if(cur)cur.classList.remove("ddo");cur=null;m.classList.remove("in");setTimeout(()=>m.remove(),170)};
const items=()=>M?[...M.querySelectorAll(".ddo2:not(.dis)")]:[];
const pick=o=>{if(!cur||!o)return;const sel=cur,v=o.dataset.v;close();if(sel.value!==v||sel.dataset.always){vd.set.call(sel,v);sel.dispatchEvent(new Event("input",{bubbles:true}));sel.dispatchEvent(new Event("change",{bubbles:true}))}try{sel.focus({preventScroll:true})}catch(e){}};
const hi=i=>{const L=items();if(!L.length)return;idx=(i+L.length)%L.length;L.forEach((x,k)=>x.classList.toggle("hi",k==idx));L[idx].scrollIntoView({block:"nearest"})};
function open(sel){if(M&&cur===sel){close();return}close();if(sel.disabled)return;cur=sel;sel.classList.add("ddo");const m=document.createElement("div");m.className="ddm";m.setAttribute("role","listbox");
const add=(o,par)=>`<div class="ddo2 ${o.value===sel.value&&!o.disabled?"sel":""} ${o.disabled?"dis":""}" role="option" data-v="${String(o.value).replace(/"/g,"&quot;")}"><span>${(o.textContent||"").replace(/[&<]/g,c=>c=="&"?"&amp;":"&lt;")||"&nbsp;"}</span>${CK}</div>`;
m.innerHTML=[...sel.children].map(c=>c.tagName=="OPTGROUP"?`<div class="ddg">${(c.label||"").replace(/[&<]/g,"")}</div>`+[...c.children].map(o=>add(o)).join(""):add(c)).join("");document.body.appendChild(m);M=m;
const an=sel.closest("[data-ddanchor]")||sel,r=an.getBoundingClientRect(),w=Math.max(r.width,an!==sel?200:170),vw=innerWidth,vh=innerHeight;m.style.minWidth=Math.min(w,vw-16)+"px";m.style.width="max-content";m.style.maxWidth=(vw-16)+"px";const full=m.scrollHeight,below=vh-r.bottom-12,above=r.top-12,up=below<Math.min(full,220)&&above>below,h=Math.min(full+2,Math.max(120,up?above:below),340);
m.style.maxHeight=h+"px";const mw=m.offsetWidth;let left=r.width<mw?r.left+r.width/2-mw/2:(document.documentElement.classList.contains("he")?r.right-mw:r.left);left=Math.max(8,Math.min(left,vw-mw-8));m.style.left=left+"px";m.style[up?"bottom":"top"]=(up?vh-r.top+6:r.bottom+6)+"px";if(up)m.classList.add("up");
requestAnimationFrame(()=>m.classList.add("in"));const s=m.querySelector(".sel");if(s)s.scrollIntoView({block:"center"});idx=items().indexOf(s);if(idx>=0)s.classList.add("hi")}
document.addEventListener("pointerdown",e=>{const sel=e.target.closest&&e.target.closest("select:not([multiple]):not([data-native])");if(sel){e.preventDefault();return}},true);
document.addEventListener("mousedown",e=>{const sel=e.target.closest&&e.target.closest("select:not([multiple]):not([data-native])");if(sel){e.preventDefault();sel.focus({preventScroll:true})}},true);
document.addEventListener("click",e=>{const sel=e.target.closest&&e.target.closest("select:not([multiple]):not([data-native])");if(sel){e.preventDefault();e.stopPropagation();open(sel);return}const o=e.target.closest&&e.target.closest(".ddo2");if(o&&M&&M.contains(o)){if(!o.classList.contains("dis"))pick(o);return}if(M&&!(e.target.closest&&e.target.closest(".ddm")))close()},true);
document.addEventListener("keydown",e=>{const t=e.target;if(M){if(e.key=="Escape"){e.preventDefault();close();return}if(e.key=="ArrowDown"){e.preventDefault();hi(idx+1)}else if(e.key=="ArrowUp"){e.preventDefault();hi(idx-1)}else if(e.key=="Enter"||e.key==" "){e.preventDefault();pick(items()[idx])}else if(e.key=="Tab")close();return}
if(t&&t.matches&&t.matches("select:not([multiple]):not([data-native])")&&(e.key=="Enter"||e.key==" "||(e.altKey&&e.key=="ArrowDown"))){e.preventDefault();open(t)}},true);
addEventListener("resize",close);addEventListener("scroll",e=>{if(M&&!(e.target.closest&&e.target.closest(".ddm")))close()},{passive:true,capture:true});window.closeDD=close})();
/* amounts typed into the app show thousands separators (6,000); code reads them as plain numbers */
(()=>{const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value"),grp=v=>{const m=String(v).match(/^(-?)(\d*)(\.\d*)?$/);return m?m[1]+m[2].replace(/\B(?=(\d{3})+(?!\d))/g,",")+(m[3]||""):String(v)};
Object.defineProperty(HTMLInputElement.prototype,"value",{configurable:true,get(){const v=d.get.call(this);return this.dataset&&this.dataset.money?String(v).replace(/,/g,""):v},set(v){d.set.call(this,this.dataset&&this.dataset.money?grp(v):v)}});
const SEL='#jbuf,#nAmt,#bA,[data-bp],[data-c=budget],#uA,#njS,#njT,#njC,#jaA,[data-k=largeAmt]',mk=el=>{if(el.dataset.money)return;const v=d.get.call(el);el.type="text";if(!el.getAttribute("inputmode"))el.inputMode="numeric";el.dataset.money="1";d.set.call(el,grp(v))};
const scan=r=>{if(r.nodeType!=1)return;if(r.matches&&r.matches(SEL))mk(r);r.querySelectorAll&&r.querySelectorAll(SEL).forEach(mk)};
window.mmQuiet=ms=>ms.every(m=>{const t=m.target,e=t.nodeType==1?t:t.parentElement;return !!(e&&e.closest&&e.closest("[data-cu]"))});
new MutationObserver(m=>{if(mmQuiet(m))return;m.forEach(x=>x.addedNodes.forEach(scan))}).observe(document.documentElement,{childList:true,subtree:true});scan(document.body||document.documentElement);
addEventListener("input",e=>{const el=e.target;if(!el.dataset||!el.dataset.money)return;const raw=d.get.call(el),pos=el.selectionStart,before=raw.slice(0,pos).replace(/[^\d.]/g,"").length,out=grp(raw.replace(/[^\d.\-]/g,""));if(out!==raw){d.set.call(el,out);let n=0,i=0;for(;i<out.length&&n<before;i++)if(/[\d.]/.test(out[i]))n++;try{el.setSelectionRange(i,i)}catch(x){}}},true)})();
const NOW=new Date(),p2=n=>String(n).padStart(2,"0"),MK=NOW.getFullYear()+"-"+p2(NOW.getMonth()+1),TODAY=MK+"-"+p2(NOW.getDate()),DAYN=NOW.getDate(),DIM=new Date(NOW.getFullYear(),NOW.getMonth()+1,0).getDate(),SYM=new Proxy({ILS:"₪",USD:"$",EUR:"€",GBP:"£",JPY:"¥"},{get:(t,k)=>k in t?t[k]:typeof k=="string"?k+" ":undefined});
const MNAME=m=>new Date(+m.slice(0,4),+m.slice(5,7)-1,1).toLocaleDateString("en-GB",{month:"long"}),MSHORT=m=>new Date(+m.slice(0,4),+m.slice(5,7)-1,1).toLocaleDateString("en-GB",{month:"short"}),addM=(m,k)=>{const d=new Date(+m.slice(0,4),+m.slice(5,7)-1+k,1);return d.getFullYear()+"-"+p2(d.getMonth()+1)};
let WS="sun";try{WS=localStorage.getItem("moneyWs")=="mon"?"mon":"sun"}catch(e){}const wsOff=d=>(d.getDay()-(WS=="mon"?1:0)+7)%7; // the first day of the week is a setting
let DF="dmy";try{DF=localStorage.getItem("moneyDf")=="mdy"?"mdy":"dmy"}catch(e){}
// "Count in another month": a transaction can belong to a different month in reports. Its own date never changes; rdOf is the date reports use.
const penEmpty=a=>a.kind=="pension"&&!(+a.v>0); // the pension shows up everywhere only once you have entered an amount
const rmOf=t=>t.rm&&t.rm!==String(t.d).slice(0,7)?t.rm:"";
const rdOf=t=>{const m=rmOf(t);if(!m)return t.d;const last=new Date(+m.slice(0,4),+m.slice(5,7),0).getDate();return m+"-"+String(Math.min(+String(t.d).slice(8,10)||1,last)).padStart(2,"0")};
const dnum=(y,m,d)=>{const p=n=>String(n).padStart(2,"0");return DF=="mdy"?p(m)+"/"+p(d)+"/"+y:p(d)+"/"+p(m)+"/"+y}; // always with the year, in the order the user chose
const dcell=d=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));return m?dnum(m[1],m[2],m[3]):String(d)};
const dstr=d=>{if(/^\d{4}-\d{2}-\d{2}/.test(String(d)))return dcell(d);const x=new Date(d);return isNaN(x)?String(d):dnum(x.getFullYear(),x.getMonth()+1,x.getDate())};
const ATM={Indigo:{L:["#4355b9","#dee0ff","#0b1550","#fbf8fd","#7b4fb8","#fff"],D:["#b9c3ff","#2d3f9e","#dee0ff","#111218","#c7a6ff","#0b1550"]},
Ocean:{L:["#006b7d","#b3ebff","#001f26","#f4fafc","#2d7dd2","#fff"],D:["#4fd8eb","#004e5c","#b3ebff","#0a1417","#5aa9ff","#00363f"]},
Forest:{L:["#2e6b3a","#b4f1b8","#002106","#f6faf4","#8a7a1f","#fff"],D:["#98d49f","#135025","#b4f1b8","#0e1410","#d6c46b","#00390f"]},
Sunset:{L:["#a8431e","#ffdbcf","#380d00","#fff8f5","#c2185b","#fff"],D:["#ffb59a","#7f2a05","#ffdbcf","#17100d","#ff8fb1","#5b1a00"]},
Aurora:{L:["#6d4bc4","#e9ddff","#23005c","#faf7ff","#0a9aa6","#fff"],D:["#c8b3ff","#4b2d9a","#e9ddff","#0b0a16","#4fe0cf","#2a0c70"]},
Mono:{L:["#3b3b3b","#e4e4e4","#1b1b1b","#fafafa","#777","#fff"],D:["#e0e0e0","#3a3a3a","#f0f0f0","#101010","#9a9a9a","#1a1a1a"]},
Rose:{L:["#952345","#ffd6e2","#470015","#fdf7f9","#a54027","#ffffff"],D:["#f896b3","#6f2038","#fecddc","#170d10","#f4937b","#440417"]},
Ember:{L:["#954523","#ffe2d6","#471500","#fdf9f7","#a52746","#ffffff"],D:["#f8b396","#6f3820","#fedccd","#17100d","#f47b99","#441704"]},
Gold:{L:["#927526","#fef4d7","#463402","#fdfbf7","#a2562a","#ffffff"],D:["#f6dd98","#6d5922","#fdf0ce","#17140d","#f1a87e","#423205"]},
Meadow:{L:["#4b8f29","#e4fdd8","#194404","#f9fcf7","#9f9f2d","#ffffff"],D:["#b8f39a","#3c6b24","#defbd0","#10160d","#eeee81","#1a4107"]},
Lagoon:{L:["#298f8c","#d8fdfc","#044442","#f7fcfc","#2d6f9f","#ffffff"],D:["#9af3f0","#246b68","#d0fbfa","#0d1616","#81c1ee","#07413f"]},
Sky:{L:["#236595","#d6eeff","#002a47","#f7fafd","#4627a5","#ffffff"],D:["#96cff8","#204e6f","#cdeafe","#0d1317","#997bf4","#042944"]},
Slate:{L:["#455873","#e2e9f3","#152132","#f9fafb","#4d777f","#ffffff"],D:["#b3c4db","#384557","#dce4ef","#101214","#9fc8d0","#172231"]},
Plum:{L:["#8c2b8c","#fcd9fc","#420542","#fcf8fc","#9c3066","#ffffff"],D:["#f19df1","#692669","#fad1fa","#160e16","#eb84b8","#3f083f"]},
Mocha:{L:["#7b5a3c","#f6eadf","#372210","#fbfaf8","#897743","#ffffff"],D:["#e2c5ac","#5d4632","#f3e5d8","#15120f","#d9c896","#352312"]},
Mint:{L:["#2e895c","#dafbeb","#074024","#f8fcfa","#339990","#ffffff"],D:["#9feec7","#286747","#d2f9e6","#0e1612","#87e8e0","#0a3d24"]},
Midnight:{L:["#233a95","#d6deff","#000e47","#f7f8fd","#2790a5","#ffffff"],D:["#96a9f8","#20306f","#cdd7fe","#0d0f17","#7be0f4","#041044"]},
Candy:{L:["#95235c","#ffd6eb","#470024","#fdf7fa","#2790a5","#ffffff"],D:["#f896c7","#6f2047","#fecde6","#170d12","#7be0f4","#440424"]}};
const FONTS={sans:'Inter,"Segoe UI",Roboto,system-ui,sans-serif',serif:'"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif',round:'ui-rounded,"SF Pro Rounded",Nunito,"Varela Round","Segoe UI",system-ui,sans-serif',mono:'ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,monospace'};
const CP={L:["#4355b9","#c2185b","#e68a00","#00897b","#7cb342","#8e24aa","#546e7a"],D:["#9fb0ff","#f48fb1","#ffcc80","#80cbc4","#c5e1a5","#ce93d8","#b0bec5"]};
const ST0={mode:"auto",atm:"Indigo",cc:"#4355b9",cu:{L:{},D:{}},cp:{L:{},D:{}},gi:100,sym:"₪",surf:"solid",bg:"glow",tex:"none",tsc:100,gbl:18,gsat:160,gop:45,rad:"round",den:"cozy",spc:"standard",nsp:"standard",fnt:"sans",nav:"full"};let st={...ST0};try{st=Object.assign(st,JSON.parse(localStorage.getItem("moneyTheme")||"{}"))}catch(e){}if(st.surf=="static")st.surf="solid";
if(st.bg=="dots"||st.bg=="stripes"){st.tex=st.bg;st.bg="glow"} // textures used to be backgrounds
function isDark(){return st.mode=="dark"||(st.mode=="auto"&&matchMedia("(prefers-color-scheme:dark)").matches)}
function themeSwap(fn){const go=()=>{const h=document.documentElement;h.classList.add("nt");fn();requestAnimationFrame(()=>requestAnimationFrame(()=>h.classList.remove("nt")))};if(document.startViewTransition&&!matchMedia("(prefers-reduced-motion:reduce)").matches)document.startViewTransition(go);else go()}
// the new look spreads out in a circle from the element that was clicked
function themeSwapFrom(el,fn,after){const h=document.documentElement;if(!document.startViewTransition||matchMedia("(prefers-reduced-motion:reduce)").matches){fn();if(after)after();return}
const b=el.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2,R=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));const F=Math.round(Math.min(260,Math.max(140,R*.22))); // width of the soft edge, so old and new blend instead of meeting at a sharp line
h.style.setProperty("--vt-x",x+"px");h.style.setProperty("--vt-y",y+"px");h.style.setProperty("--vt-f",F+"px");h.style.setProperty("--vt-r","0px");h.classList.add("vt-r");
const t=document.startViewTransition(()=>{fn()});
t.ready.then(()=>h.animate({"--vt-r":["0px",(R+F)+"px"]},{duration:600,easing:"cubic-bezier(.35,.15,.65,.85)",fill:"forwards",pseudoElement:"::view-transition-new(root)"})).catch(()=>{});
t.finished.finally(()=>{h.classList.remove("vt-r");["--vt-x","--vt-y","--vt-f","--vt-r"].forEach(k=>h.style.removeProperty(k));if(after)after()})}
// a palette made from one colour: the same six values every built-in atmosphere has
function customAtm(hex){const m=/^#?([0-9a-f]{6})$/i.exec(hex||"");const n=parseInt(m?m[1]:"4355b9",16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,sat=0;const l=(mx+mn)/2;if(mx!=mn){const d=mx-mn;sat=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx==r?(g-b)/d+(g<b?6:0):mx==g?(b-r)/d+2:(r-g)/d+4;h*=60}
const S=Math.round(Math.min(90,Math.max(30,sat*100))),H=Math.round(h),c=(hh,ss,ll)=>`hsl(${(hh+360)%360} ${ss}% ${ll}%)`,hex2=x=>{const e=document.createElement("canvas").getContext("2d");e.fillStyle=x;return e.fillStyle};
const L=[c(H,S,42),c(H,S,92),c(H,S,14),c(H,28,98),c(H+40,Math.round(S*.8),42),"#ffffff"],D=[c(H,S,78),c(H,Math.round(S*.7),28),c(H,S,90),c(H,16,8),c(H+40,S,76),c(H,S,14)];return{L:L.map(hex2),D:D.map(hex2)}}
const AKEYS=["acc","accc","onc","bg","acc2","on"],XDEF={L:{tx:"#1b1b22",pos:"#1b7f4b",neg:"#c0392b"},D:{tx:"#e6e4ea",pos:"#6fd69b",neg:"#ff9c8f"}};
const CUST=[["acc","Accent"],["acc2","Gradient colour"],["bg","Background"],["tx","Text"],["accc","Accent tint"],["onc","Text on tint"],["on","Text on accent"],["pos","Positive"],["neg","Negative"]];
const cuOf=k=>(st.atm=="Custom"&&st.cu&&st.cu[k])||{};
const atmOf=n=>{if(n!="Custom")return ATM[n]||ATM.Indigo;const b=customAtm(st.cc);["L","D"].forEach(k=>{const o=cuOf(k);AKEYS.forEach((x,i)=>{if(o[x])b[k][i]=o[x]})});return b};
const cpOf=k=>CP[k].map((c,i)=>(st.atm=="Custom"&&st.cp&&st.cp[k]&&st.cp[k][i])||c);
const custVal=(n,k)=>{const o=cuOf(k);if(o[n])return o[n];const i=AKEYS.indexOf(n);return i>=0?atmOf("Custom")[k][i]:XDEF[k][n]};
function applyTheme(){const d=isDark(),k=d?"D":"L";if(st.ls!==k){st.ls=k;const x=THM.find(y=>y.id==THA[k]);if(x)Object.assign(st,JSON.parse(JSON.stringify(x.v)))}const a=atmOf(st.atm)[k],ex=cuOf(k),r=document.documentElement.style;r.colorScheme=d?"dark":"light";
document.documentElement.dataset.mode=d?"dark":"light";["bg","tex","rad","den","spc","nsp","fnt","nav"].forEach(k=>document.documentElement.dataset[k]=st[k]);r.setProperty("--tsc",String((+st.tsc||100)/100));r.setProperty("--gi",String((st.gi==null?100:+st.gi)/100));glassVars();texUI();r.setProperty("--font",FONTS[st.fnt]||FONTS.sans);
[["--acc",a[0]],["--accc",a[1]],["--onc",a[2]],["--bg",a[3]],["--acc2",a[4]],["--on",a[5]],["--tx",ex.tx||XDEF[k].tx],["--tx2",ex.tx?"color-mix(in srgb,var(--tx) 68%,var(--bg))":d?"#a9a7b3":"#5a5865"],["--pos",ex.pos||XDEF[k].pos],["--neg",ex.neg||XDEF[k].neg],
["--s1","color-mix(in srgb,var(--tx) "+(d?"5":"3")+"%,var(--bg))"],["--s2","color-mix(in srgb,var(--tx) "+(d?"10":"7")+"%,var(--bg))"],["--ol","color-mix(in srgb,var(--tx) "+(d?"13":"11")+"%,transparent)"]].forEach(([n,v])=>r.setProperty(n,v));
cpOf(k).forEach((c,i)=>r.setProperty("--c"+i,c));$("themeMeta").content=a[3];
["glass","outline","raised"].forEach(c=>document.body.classList.toggle(c,st.surf==c));document.querySelectorAll("#pop [data-a=opt]").forEach(b=>b.classList.toggle("on",st[b.dataset.k]==b.dataset.v));
document.querySelectorAll("#segMode button").forEach(b=>b.classList.toggle("on",b.dataset.m==st.mode));
document.querySelectorAll("#pop [data-a=surf]").forEach(b=>b.classList.toggle("on",b.dataset.s==st.surf));document.querySelectorAll("#segDf button").forEach(b=>b.classList.toggle("on",b.dataset.v==DF));document.querySelectorAll("#segWs button").forEach(b=>b.classList.toggle("on",b.dataset.v==WS));document.querySelectorAll("#segLang button").forEach(b=>b.classList.toggle("on",b.dataset.l==(HE.on?"he":"en")));
swatches();symApply(a);apTabs();
try{localStorage.setItem("moneyTheme",JSON.stringify(st));localStorage.setItem("moneyBoot",JSON.stringify({bg:a[3],d,a1:a[0],a2:a[4],on:a[5],sym:st.sym}))}catch(e){}}
// the app's symbol (the sidebar logo, the loading screen, the browser tab icon) follows the chosen currency symbol
function symApply(a){const sym=st.sym||"₪",coin=sym=="coin";document.querySelectorAll(".logo,#splash i").forEach(e=>{e.innerHTML=coin?window.COIN_SVG:(window.SYM_SVG[sym]||window.SYM_SVG["₪"]);e.dataset.sym=sym});
document.querySelectorAll("[data-a=opt][data-k=sym]").forEach(b=>{b.classList.toggle("on",b.dataset.v==sym);const t=b.querySelector("[data-ss]");if(t&&!t.firstChild)t.innerHTML=window.SYM_SVG[t.dataset.ss]});
try{const c=document.createElement("canvas");c.width=c.height=128;const x=c.getContext("2d"),g=x.createLinearGradient(0,0,128,128);g.addColorStop(0,a[0]);g.addColorStop(1,a[4]);x.fillStyle=g;x.beginPath();x.roundRect(0,0,128,128,30);x.fill();x.fillStyle=a[5];x.textAlign="center";x.textBaseline="middle";
if(coin){x.strokeStyle=a[5];x.lineWidth=11;x.lineCap="round";x.beginPath();x.arc(64,64,17,0,7);x.moveTo(50,50);x.lineTo(34,34);x.moveTo(78,50);x.lineTo(94,34);x.moveTo(50,78);x.lineTo(34,94);x.moveTo(78,78);x.lineTo(94,94);x.stroke()}else{x.font="700 78px system-ui,sans-serif";x.fillText(sym,64,70)}
const u=c.toDataURL("image/png");["icon","apple-touch-icon"].forEach(r=>{const l=document.querySelector(`link[rel="${r}"]`);if(l)l.href=u})}catch(e){}}
function glassVars(){const r=document.documentElement.style,n=(v,d,lo,hi)=>Math.min(hi,Math.max(lo,Number.isFinite(+v)&&v!=null?+v:d));r.setProperty("--gblur",n(st.gbl,18,0,40)+"px");r.setProperty("--gsat",n(st.gsat,160,100,250)+"%");r.setProperty("--gop",n(st.gop,45,0,100)+"%")}
function texUI(){const g=st.surf=="glass";["glassRow","glassRow2","glassRow3"].forEach(i=>$(i)&&$(i).classList.toggle("hid",!g));if($("glBlur")){const v=(id,val,u)=>{$(id).value=val;$(id+"Out").textContent=Math.round(val)+u};v("glBlur",st.gbl,"px");v("glSat",st.gsat,"%");v("glOp",st.gop,"%")}
const gi=$("gi");if(gi){gi.value=st.gi==null?100:+st.gi;$("giOut").textContent=Math.round(gi.value)+"%";$("giRow").classList.toggle("off",st.bg=="flat")}const i=$("texScale");if(!i)return;i.value=+st.tsc||100;$("texOut").textContent=Math.round(+st.tsc||100)+"%";$("texRow").classList.toggle("hid",st.tex=="none")}
function swatches(){const k=isDark()?"D":"L";$("sw").innerHTML=Object.entries(ATM).map(([n,v])=>{const c=v[k];return `<button data-a="atm" data-a2="${n}" class="${st.atm==n?"on":""}" aria-label="${n}" title="${n}"><span class="swd" style="background:linear-gradient(135deg,${c[0]} 0 52%,${c[4]} 52% 100%)"></span><span class="swn">${n}</span></button>`}).join("")
+`<button data-a="atm" data-a2="Custom" class="${st.atm=="Custom"?"on":""}" aria-label="Custom colour" title="Custom colour"><span class="swd" style="background:${st.atm=="Custom"?`linear-gradient(135deg,${atmOf("Custom")[k][0]} 0 52%,${atmOf("Custom")[k][4]} 52% 100%)`:"conic-gradient(#f55,#fb3,#9d4,#3cb,#49f,#a6e,#f55)"}"></span><span class="swn">Custom</span></button>`;
custUI()}
function custUI(){const c=$("cust");if(!c)return;c.classList.toggle("hid",st.atm!="Custom");if(st.atm!="Custom")return;const k=isDark()?"D":"L";
if(!c.firstChild)c.innerHTML=`<div class="apr"><span>Start from</span><select id="custFrom"><option value="">Choose a preset…</option>${Object.keys(ATM).map(n=>`<option value="${n}">${n}</option>`).join("")}</select></div>
<div class="apr"><span>Base colour</span><input type="color" id="atmCustom" aria-label="Base colour"><output id="atmCustomOut"></output></div>
<div class="cuh"><b id="custMode"></b><button class="btn o s" data-a="custReset">Reset</button></div>
<div class="cgrid">${CUST.map(([n,l])=>`<label class="crow"><input type="color" data-cn="${n}" aria-label="${l}"><span>${l}</span></label>`).join("")}</div>
<details class="cch"><summary>Chart colours</summary><div class="cgrid">${CP.L.map((_,i)=>`<label class="crow"><input type="color" data-cc="${i}" aria-label="Chart colour ${i+1}"><span>Colour ${i+1}</span></label>`).join("")}</div></details>`;
const ae=document.activeElement,sv=(i,v)=>{if(i&&i!==ae)i.value=v};sv($("atmCustom"),st.cc||"#4355b9");$("atmCustomOut").textContent=(st.cc||"").toUpperCase();
$("custMode").textContent=(k=="D"?"Dark":"Light")+" colours";c.querySelectorAll("[data-cn]").forEach(i=>sv(i,custVal(i.dataset.cn,k)));c.querySelectorAll("[data-cc]").forEach(i=>sv(i,cpOf(k)[+i.dataset.cc]))}
const PKEYS=["atm","cc","cu","cp","gi","surf","bg","tex","tsc","gbl","gsat","gop","rad","den","spc","nsp","fnt","nav"],jl=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
let THM=jl("moneyThemes",[]),THA=jl("moneyThemeAs",{});
const tpPersist=()=>{try{localStorage.setItem("moneyThemes",JSON.stringify(THM));localStorage.setItem("moneyThemeAs",JSON.stringify(THA))}catch(e){}};
const tpSnap=()=>JSON.parse(JSON.stringify(Object.fromEntries(PKEYS.map(k=>[k,st[k]]))));
const tpPal=(v,k)=>{const b=v.atm=="Custom"?customAtm(v.cc)[k]:(ATM[v.atm]||ATM.Indigo)[k],o=v.atm=="Custom"&&v.cu&&v.cu[k]||{};return b.map((c,i)=>o[AKEYS[i]]||c)};
function tpRender(){const l=$("tpList");if(!l)return;const k=isDark()?"D":"L";l.innerHTML=THM.length?THM.map(x=>{const c=tpPal(x.v,k);return `<div class="tpr"><span class="tpd" style="background:linear-gradient(135deg,${c[0]} 0 50%,${c[4]} 50% 100%);box-shadow:0 0 0 3px ${c[3]},0 0 0 4px var(--ol)"></span><b>${esc(x.name)}</b><span class="tpa"><button class="btn o s" data-a="tpApply" data-id="${x.id}">Use</button><button class="btn o s ${THA.L==x.id?"on":""}" data-a="tpAssign" data-id="${x.id}" data-sc="L" title="Use in light mode" aria-label="Use in light mode">Light</button><button class="btn o s ${THA.D==x.id?"on":""}" data-a="tpAssign" data-id="${x.id}" data-sc="D" title="Use in dark mode" aria-label="Use in dark mode">Dark</button><button class="btn o s" data-a="tpUpd" data-id="${x.id}" title="Replace with the current look">Update</button><button class="btn o s" data-a="tpDel" data-id="${x.id}" aria-label="Delete">×</button></span></div>`}).join(""):`<div class="sm">Nothing saved yet.</div>`}
const tpGo=()=>themeSwap(()=>{applyTheme();renderAll()});
function apTabs(){const t=window._apt||"col";document.querySelectorAll("#apTabs button").forEach(b=>b.classList.toggle("on",b.dataset.t==t));document.querySelectorAll("#pop .apbt").forEach(d=>d.classList.toggle("on",d.dataset.pt==t));if(t=="sav")tpRender()}
swatches();
document.addEventListener("input",e=>{const i=e.target,k=isDark()?"D":"L",go=()=>{cancelAnimationFrame(window._cc);window._cc=requestAnimationFrame(()=>{applyTheme();renderAll()})};
if(i.id=="atmCustom"){st.cc=i.value;st.atm="Custom";st.cu={L:{},D:{}};st.cp={L:{},D:{}};go()}
else if(i.dataset&&i.dataset.cn){st.cu=st.cu||{L:{},D:{}};(st.cu[k]=st.cu[k]||{})[i.dataset.cn]=i.value;st.atm="Custom";go()}
else if(i.dataset&&i.dataset.cc!=null&&i.closest("#cust")){st.cp=st.cp||{L:{},D:{}};(st.cp[k]=st.cp[k]||{})[i.dataset.cc]=i.value;go()}
else if(i.id=="gi"){st.gi=+i.value;applyTheme()}});
document.addEventListener("change",e=>{if(e.target.id=="custFrom"&&ATM[e.target.value]){const a=ATM[e.target.value];st.cc=a.L[0];st.cu={L:{},D:{}};["L","D"].forEach(k=>AKEYS.forEach((x,j)=>{st.cu[k][x]=a[k][j]}));st.cp={L:{},D:{}};st.atm="Custom";e.target.value="";themeSwap(()=>{applyTheme();renderAll()})}});

