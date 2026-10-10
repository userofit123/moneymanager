/* Hebrew translation layer. English stays the source text in the app; when the language is Hebrew every piece of text shown is translated here,
   just before it is displayed. Exact sentences come from the dictionary, numbers, amounts and dates are lifted out first so one entry covers
   "5 days", "12 days" and so on, and patterns handle sentences with names inside. Anything not found stays in English. */
(function(){
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],MONF=["January","February","March","April","May","June","July","August","September","October","November","December"];
const HM=["ינו׳","פבר׳","מרץ","אפר׳","מאי","יוני","יולי","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳"],HMF=["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const DAYS={Sunday:"יום ראשון",Monday:"יום שני",Tuesday:"יום שלישי",Wednesday:"יום רביעי",Thursday:"יום חמישי",Friday:"יום שישי",Saturday:"שבת"};
const HE={on:false,D:{},P:[]};
const mi=s=>{const a=s.slice(0,3);return MON.indexOf(a)};
const DATE=/\b(\d{1,2}) ((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*)(?: (\d{4}))?\b/g;
const NUM=/[−+-]?₪?\d[\d,]*(?:\.\d+)?%?/g;
const hDate=(d,mo,y,full)=>{const i=mi(mo);return d+" ב"+(full?HMF:HM)[i]+(y?" "+y:"")};
const MONTH=/\b(January|February|March|April|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\b/g;
const cache=new Map();
function look(core){const D=HE.D;let r=D[core];if(r===undefined){const lf=core.charAt(0).toLowerCase()+core.slice(1),uf=core.charAt(0).toUpperCase()+core.slice(1);r=D[lf];if(r===undefined)r=D[uf]}return r}
function tr(core){
let r=look(core);if(r!==undefined)return r;
for(const[re,fn]of HE.P){const m=core.match(re);if(m){const out=fn(...m.slice(1).map(x=>x),HE.T);if(out!=null)return out.replace(DATE,(x,d,mo,y)=>hDate(d,mo,y,mo.length>4))}}
// dates and numbers become placeholders; the dictionary entry is written with {} in their place
const ds=[],ns=[],ms=[];let key=core.replace(DATE,(m,d,mo,y)=>{ds.push(hDate(d,mo,y,mo.length>4));return "\u0001"});
key=key.replace(MONTH,m=>{ms.push((m.length>4?HMF:HM)[mi(m)]);return "\u0003"});
key=key.replace(NUM,m=>{ns.push(m);return "\u0002"});
if(ds.length||ns.length||ms.length){const k2=key.replace(/\u0001/g,"{d}").replace(/\u0002/g,"{}").replace(/\u0003/g,"{m}");let t=look(k2);
 if(t!==undefined){let di=0,ni=0,mj=0;return t.replace(/\{d\}|\{\}|\{m\}/g,x=>x=="{d}"?(ds[di++]||""):x=="{m}"?(ms[mj++]||""):(ns[ni++]||""))}}
return undefined}
HE.T=function(s){if(!HE.on||typeof s!="string")return s;const m=s.match(/^(\s*)([\s\S]*?)(\s*)$/),core=m[2];if(!core||!/[A-Za-z]/.test(core))return s;
let r=cache.get(core);if(r===undefined){r=tr(core);cache.set(core,r===undefined?null:r)}
if(r===null||r===undefined)return s;return m[1]+r+m[3]};
HE.mo=m=>(m.length>4?HMF:HM)[mi(m)];HE.mon=MON;HE.monf=MONF;HE.hm=HM;HE.hmf=HMF;HE.days=DAYS;
window.HE=HE})();
