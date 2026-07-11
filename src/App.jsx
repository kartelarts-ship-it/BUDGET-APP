import { useState, useEffect, useRef, useCallback } from "react";

const C = {
bg:"#080E0A",s1:"#0F1A12",s2:"#152019",border:"#1E3024",
gold:"#D8B56D",goldDim:"#7A5E2A",
pos:"#6EE7B7",neg:"#F87171",warn:"#FBBF24",
text:"#F0F4F1",label:"#7A9A82",muted:"#2E4434",
blue:"#60A5FA",purple:"#A78BFA",
};

const STORAGE_KEY="kacorp_v4";
const MONTHS=["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const MONTH_FULL=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const ICONS=["🏠","🛒","🚗","❤️","🎬","💰","📦","✈️","🏋️","📚","🎓","💻","👕","🍽️","🎁","⚡","📱","🏥","🐾","🎮"];
const G_ICONS=["🎯","🏖️","🚀","🏠","🚗","✈️","💍","🎓","💻","🛡️","🌍","🏋️","💎","🎸","📸","🏄","🎨","🐕","🏦","🌱"];
const COLORS=["#D8B56D","#6EE7B7","#60A5FA","#F87171","#A78BFA","#34D399","#FBBF24","#FB923C","#E879F9","#94A3B8"];
const PRIORITIES=["prioritaire","normale","secondaire"];
const PRIORITY_WEIGHTS={prioritaire:3,normale:2,secondaire:1};

const GOAL_SUGGESTIONS=[
{name:"Fonds d'urgence",icon:"🛡️",color:"#F87171"},
{name:"Vacances",icon:"🏖️",color:"#60A5FA"},
{name:"Voiture",icon:"🚗",color:"#FBBF24"},
{name:"Logement",icon:"🏠",color:"#D8B56D"},
{name:"Formation",icon:"🎓",color:"#A78BFA"},
{name:"Matériel professionnel",icon:"💻",color:"#6EE7B7"},
{name:"Remboursement de dette",icon:"🏦",color:"#FB923C"},
{name:"Projet personnel",icon:"🌱",color:"#34D399"},
{name:"Autre",icon:"🎯",color:"#D8B56D"},
];

const DEFAULT_CATS=[
{id:"housing",label:"Logement",icon:"🏠",color:"#D8B56D",budget:0},
{id:"food",label:"Alimentation",icon:"🛒",color:"#6EE7B7",budget:0},
{id:"transport",label:"Transport",icon:"🚗",color:"#60A5FA",budget:0},
{id:"health",label:"Santé",icon:"❤️",color:"#F87171",budget:0},
{id:"leisure",label:"Loisirs",icon:"🎬",color:"#A78BFA",budget:0},
{id:"savings",label:"Épargne",icon:"💰",color:"#34D399",budget:0},
{id:"other",label:"Autres",icon:"📦",color:"#94A3B8",budget:0},
];

const CURRENCY_SYMBOLS={EUR:"€",USD:"$",GBP:"£",CHF:"Fr"};
const EMPTY_GOAL=()=>({name:"",target:"",current:"",deadline:"",icon:"🎯",color:C.gold,priority:"normale"});
const DEFAULT_STATE={income:"",categories:DEFAULT_CATS,expenses:{},goals:[],history:[],
settings:{currency:"EUR",name:"",savingsGoalPct:20},started:false};

const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const parseAmt=(v)=>Math.max(0,parseFloat(String(v||0).replace(",","."))||0);
const clamp=(v,a,b)=>Math.min(Math.max(v,a),b);
const fmtPct=(n)=>`${Math.round(Math.max(0,n||0))}%`;
const todayDate=()=>new Date();
const currentMonth=()=>{const d=todayDate();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;};
const fmt=(n,cur="EUR")=>{
const sym=CURRENCY_SYMBOLS[cur]||"€";
const str=new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(Math.abs(n||0));
return `${str} ${sym}`;
};
const monthsUntil=(deadline)=>{
if(!deadline)return null;
const d=new Date(deadline),now=todayDate();
return Math.max(0,(d.getFullYear()-now.getFullYear())*12+(d.getMonth()-now.getMonth()));
};
const savingsPlan=(goal,inc)=>{
const rem=Math.max(parseAmt(goal.target)-parseAmt(goal.current),0);
const months=monthsUntil(goal.deadline);
if(!months||months===0)return null;
const monthly=rem/months,weekly=monthly/4.33,pctInc=inc>0?(monthly/inc)*100:null;
return{rem,months,monthly,weekly,pctInc};
};
const altPlans=(rem,balance)=>{
if(rem<=0||balance<=0)return null;
const fast=Math.min(balance*0.5,rem),bal=Math.min(balance*0.25,rem),comfort=Math.min(balance*0.1,rem);
const mths=(a)=>a>0?Math.ceil(rem/a):null;
const nd=(m)=>{if(!m)return"—";const d=new Date();d.setMonth(d.getMonth()+m);return `${MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`;};
return[
{label:"⚡ Plan rapide",monthly:fast,months:mths(fast),date:nd(mths(fast))},
{label:"⚖️ Plan équilibré",monthly:bal,months:mths(bal),date:nd(mths(bal)),recommended:true},
{label:"🌿 Plan confortable",monthly:comfort,months:mths(comfort),date:nd(mths(comfort))},
].filter(p=>p.monthly>0);
};
const distributeGoals=(goals,available)=>{
if(!goals.length||available<=0)return{};
const totalW=goals.reduce((s,g)=>s+(PRIORITY_WEIGHTS[g.priority]||2),0);
const result={};
goals.forEach(g=>{
const share=(PRIORITY_WEIGHTS[g.priority]||2)/totalW*available;
const rem=Math.max(parseAmt(g.target)-parseAmt(g.current),0);
result[g.id]=Math.min(share,rem);
});
return result;
};
const load=()=>{try{const r=localStorage.getItem(STORAGE_KEY);return r?JSON.parse(r):null;}catch{return null;}};
const save=(d)=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(d));}catch{}};

function Ring({value,max,color,size=80,sw=6,children}){
const r=(size-sw*2)/2,circ=2*Math.PI*r,p=max>0?clamp(value/max,0,1):0;
return(
<div style={{position:"relative",width:size,height:size,flexShrink:0}}>
<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:"rotate(-90deg)"}}>
<circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={sw}/>
<circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
strokeDasharray={`${p*circ} ${circ}`} strokeLinecap="round"
style={{transition:"stroke-dasharray 0.6s ease"}}/>
</svg>
<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
alignItems:"center",justifyContent:"center",textAlign:"center"}}>{children}</div>
</div>
);
}
function Bar({value,max,color,h=6}){
const w=max>0?clamp((value/max)*100,0,100):0;
return(
<div style={{height:h,background:C.border,borderRadius:99,overflow:"hidden",width:"100%"}}>
<div style={{height:"100%",width:`${w}%`,background:color,borderRadius:99,transition:"width 0.5s ease"}}/>
</div>
);
}
function Chip({label,color}){
return(
<span style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",color,
border:`1px solid ${color}40`,borderRadius:6,padding:"2px 7px",background:`${color}10`}}>
{label}
</span>
);
}
function Card({children,style}){
return <div style={{background:C.s1,border:`1px solid ${C.border}`,borderRadius:18,padding:"18px 16px",...style}}>{children}</div>;
}
function Lbl({children,style}){
return <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.18em",color:C.label,...style}}>{children}</div>;
}
function GoldBtn({children,onClick,style,disabled}){
return(
<button onClick={onClick} disabled={disabled}
style={{border:"none",background:`linear-gradient(135deg,${C.gold},#E8C878)`,
color:"#080E0A",fontSize:14,fontWeight:800,borderRadius:14,padding:"14px 0",
cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,
fontFamily:"inherit",letterSpacing:"0.04em",width:"100%",...style}}>
{children}
</button>
);
}
function GhostBtn({children,onClick,style}){
return(
<button onClick={onClick}
style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:10,color:C.label,
padding:"7px 13px",fontSize:12,fontWeight:600,cursor:"pointer",
fontFamily:"inherit",letterSpacing:"0.03em",whiteSpace:"nowrap",...style}}>
{children}
</button>
);
}
function Field({label,type="text",value,onChange,placeholder,style}){
return(
<div style={{display:"flex",flexDirection:"column",gap:6}}>
{label&&<Lbl>{label}</Lbl>}
<input type={type} value={value??""} onChange={onChange} placeholder={placeholder}
inputMode={type==="number"?"decimal":undefined}
style={{width:"100%",background:C.s2,border:`1px solid ${C.border}`,
borderRadius:10,padding:"10px 12px",fontSize:14,color:C.text,
outline:"none",fontFamily:"inherit",fontVariantNumeric:"tabular-nums",...style}}/>
</div>
);
}
function StatRow({label,value,color=C.label}){
return(
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
<span style={{fontSize:13,color:C.label}}>{label}</span>
<span style={{fontSize:13,fontWeight:700,color,fontVariantNumeric:"tabular-nums"}}>{value}</span>
</div>
);
}

function DonutChart({data,size=180}){
const total=data.reduce((s,d)=>s+d.value,0);
if(total===0)return(
<div style={{width:size,height:size,borderRadius:"50%",background:C.border,
display:"flex",alignItems:"center",justifyContent:"center"}}>
<span style={{fontSize:12,color:C.label}}>Aucune dépense</span>
</div>
);
const cx=size/2,cy=size/2,r=size*0.38,ir=size*0.23;
let cum=-Math.PI/2;
const slices=data.filter(d=>d.value>0).map(d=>{
const a=(d.value/total)*2*Math.PI,s=cum;cum+=a;const e=cum;
const x1=cx+r*Math.cos(s),y1=cy+r*Math.sin(s);
const x2=cx+r*Math.cos(e),y2=cy+r*Math.sin(e);
const ix1=cx+ir*Math.cos(e),iy1=cy+ir*Math.sin(e);
const ix2=cx+ir*Math.cos(s),iy2=cy+ir*Math.sin(s);
const lg=a>Math.PI?1:0;
return{...d,path:`M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${lg} 0 ${ix2} ${iy2} Z`,pct:(d.value/total)*100};
});
return(
<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
{slices.map((s,i)=>(
<path key={i} d={s.path} fill={s.color} opacity={0.9}><title>{s.label}: {Math.round(s.pct)}%</title></path>
))}
<circle cx={cx} cy={cy} r={ir-2} fill={C.s1}/>
</svg>
);
}
function BarChart({data,color=C.pos,h=110}){
if(!data.length)return(
<div style={{height:h,display:"flex",alignItems:"center",justifyContent:"center"}}>
<span style={{color:C.label,fontSize:12}}>Pas encore de données</span>
</div>
);
const maxAbs=Math.max(...data.map(d=>Math.abs(d.value)),1);
const bw=Math.min(28,Math.max(8,Math.floor((300-data.length*4)/data.length)));
const mid=h/2;
return(
<svg viewBox={`0 0 ${data.length*(bw+8)} ${h+28}`} style={{width:"100%",height:h+28,overflow:"visible"}}>
<line x1={0} y1={mid} x2={data.length*(bw+8)} y2={mid} stroke={C.border} strokeWidth={1} strokeDasharray="3 3"/>
{data.map((d,i)=>{
const ah=Math.max((Math.abs(d.value)/maxAbs)*(h/2),2),x=i*(bw+8),neg=d.value<0;
return(
<g key={i}>
<rect x={x} y={neg?mid:mid-ah} width={bw} height={ah} rx={3} fill={neg?C.neg:color} opacity={0.85}/>
<text x={x+bw/2} y={h+18} textAnchor="middle" fill={C.label} fontSize={9} fontFamily="Inter,sans-serif">{d.label}</text>
</g>
);
})}
</svg>
);
}

function Splash({onStart}){
return(
<div style={{minHeight:"100dvh",background:C.bg,display:"flex",flexDirection:"column",
alignItems:"center",justifyContent:"center",padding:"0 28px",position:"relative",overflow:"hidden"}}>
<div style={{position:"absolute",top:"18%",left:"50%",transform:"translateX(-50%)",
width:280,height:280,borderRadius:"50%",pointerEvents:"none",
background:"radial-gradient(circle,#1a4d2840 0%,transparent 70%)",filter:"blur(40px)"}}/>
<div style={{maxWidth:340,width:"100%",textAlign:"center",position:"relative",zIndex:1}}>
<div style={{width:88,height:88,margin:"0 auto 28px",borderRadius:24,
border:`1px solid ${C.border}`,background:`linear-gradient(135deg,${C.s2},${C.s1})`,
display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 48px #1a4d2840"}}>
<img src="/logo-kacorp.png" alt="KACORP"
style={{width:64,height:64,objectFit:"contain",borderRadius:12}}
onError={e=>{e.target.style.display="none";e.target.parentNode.innerHTML='<span style="font-size:36px">💼</span>';}}/>
</div>
<div style={{fontSize:11,fontWeight:700,letterSpacing:"0.4em",color:C.gold,marginBottom:6}}>KACORP</div>
<div style={{fontSize:46,fontWeight:800,color:C.text,letterSpacing:"-0.03em",lineHeight:1,marginBottom:8}}>BUDGET</div>
<div style={{fontSize:11,fontWeight:600,letterSpacing:"0.2em",color:C.label,marginBottom:28}}>V4</div>
<div style={{width:36,height:1.5,background:C.gold,margin:"0 auto 28px",opacity:0.5}}/>
<p style={{fontSize:15,lineHeight:1.8,color:C.label,marginBottom:44}}>
Maîtrisez vos finances.<br/>Visualisez vos dépenses.<br/>Avancez avec clarté.
</p>
<GoldBtn onClick={onStart}>Commencer →</GoldBtn>
<p style={{fontSize:11,color:C.muted,marginTop:20}}>Données stockées localement · Confidentialité garantie</p>
</div>
</div>
);
}

const NAV=[
{id:"dashboard",label:"Dashboard",icon:"◈"},
{id:"depenses",label:"Dépenses",icon:"◉"},
{id:"objectifs",label:"Objectifs",icon:"◆"},
{id:"stats",label:"Stats",icon:"▲"},
{id:"settings",label:"Réglages",icon:"⚙"},
];

export default function KaCorpBudget(){
const [state,setState]=useState(()=>{
const raw=load();
const base={...DEFAULT_STATE};
if(raw){
base.income=raw.income??"";
base.categories=Array.isArray(raw.categories)&&raw.categories.length?raw.categories:DEFAULT_CATS;
base.expenses=raw.expenses??{};
base.goals=Array.isArray(raw.goals)?raw.goals.map(g=>({priority:"normale",...g})):[];
base.history=Array.isArray(raw.history)?raw.history:[];
base.settings={...DEFAULT_STATE.settings,...(raw.settings??{})};
base.started=raw.started??false;
}
return base;
});
const [tab,setTab]=useState("dashboard");
const [toast,setToast]=useState(null);
const cur=state.settings.currency||"EUR";
const f=useCallback((n)=>fmt(n,cur),[cur]);
const set=useCallback((patch)=>setState(p=>({...p,...patch})),[]);
useEffect(()=>{if(state.started)save(state);},[state]);

const showToast=useCallback((msg,type="ok")=>{
setToast({msg,type});setTimeout(()=>setToast(null),2600);
},[]);

const handleReset=()=>{
if(!confirm("Cette action supprimera toutes tes données enregistrées sur cet appareil.\n\nContinuer ?"))return;
localStorage.removeItem(STORAGE_KEY);
setState({...DEFAULT_STATE,started:true});
setTab("dashboard");
showToast("Données supprimées","warn");
};

const inc=parseAmt(state.income);
const totalExp=state.categories.reduce((s,c)=>s+parseAmt(state.expenses[c.id]),0);
const balance=inc-totalExp;
const saveRate=inc>0?(balance/inc)*100:0;

const saveMonthSnapshot=useCallback(()=>{
const month=currentMonth();
const existing=state.history.filter(h=>h.month!==month);
set({history:[...existing,{month,income:inc,expenses:{...state.expenses}}].slice(-24)});
showToast("Mois archivé ✓");
},[state,inc,set,showToast]);

if(!state.started)return <Splash onStart={()=>set({started:true})}/>;
const toastBg=toast?.type==="warn"?C.warn:toast?.type==="err"?C.neg:C.pos;

return(
<div style={{minHeight:"100dvh",background:C.bg,fontFamily:"Inter,'Helvetica Neue',sans-serif",
color:C.text,maxWidth:480,margin:"0 auto",display:"flex",flexDirection:"column"}}>
<div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",
width:320,height:200,pointerEvents:"none",zIndex:0,
background:"radial-gradient(ellipse,#1a4d2828 0%,transparent 70%)",filter:"blur(30px)"}}/>
<header style={{position:"sticky",top:0,zIndex:50,background:`${C.bg}EE`,
backdropFilter:"blur(16px)",borderBottom:`1px solid ${C.border}`,
padding:"13px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<img src="/logo-kacorp.png" alt="" style={{width:28,height:28,objectFit:"contain",borderRadius:8,background:C.s2}}
onError={e=>e.target.style.display="none"}/>
<div>
<div style={{fontSize:9,fontWeight:700,letterSpacing:"0.3em",color:C.gold,lineHeight:1}}>KACORP</div>
<div style={{fontSize:13,fontWeight:700,color:C.text,letterSpacing:"0.1em"}}>BUDGET V4</div>
</div>
</div>
{state.settings.name&&<div style={{fontSize:12,color:C.label}}>Bonjour, {state.settings.name} 👋</div>}
</header>
<div style={{flex:1,overflowY:"auto",position:"relative",zIndex:1,paddingBottom:84}}>
{tab==="dashboard"&&<Dashboard state={state} set={set} inc={inc} totalExp={totalExp} balance={balance} saveRate={saveRate} f={f}/>}
{tab==="depenses" &&<Depenses state={state} set={set} inc={inc} totalExp={totalExp} balance={balance} f={f} showToast={showToast}/>}
{tab==="objectifs"&&<Objectifs state={state} set={set} inc={inc} balance={balance} f={f} showToast={showToast}/>}
{tab==="stats" &&<Stats state={state} inc={inc} totalExp={totalExp} balance={balance} saveRate={saveRate} f={f}/>}
{tab==="settings" &&<Settings state={state} set={set} showToast={showToast} handleReset={handleReset} saveMonthSnapshot={saveMonthSnapshot}/>}
</div>
<nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
width:"100%",maxWidth:480,background:`${C.bg}F5`,backdropFilter:"blur(20px)",
borderTop:`1px solid ${C.border}`,display:"flex",zIndex:50,
paddingBottom:"env(safe-area-inset-bottom,6px)"}}>
{NAV.map(t=>(
<button key={t.id} onClick={()=>setTab(t.id)}
style={{flex:1,padding:"10px 0 8px",border:"none",background:"transparent",
cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
<span style={{fontSize:16,opacity:tab===t.id?1:0.3,transition:"opacity 0.15s"}}>{t.icon}</span>
<span style={{fontSize:9,fontWeight:700,letterSpacing:"0.04em",
color:tab===t.id?C.gold:C.muted,transition:"color 0.15s"}}>{t.label}</span>
{tab===t.id&&<div style={{width:16,height:1.5,background:C.gold,borderRadius:99}}/>}
</button>
))}
</nav>
{toast&&(
<div style={{position:"fixed",top:18,left:"50%",transform:"translateX(-50%)",
zIndex:999,padding:"11px 22px",borderRadius:50,fontSize:13,fontWeight:700,
whiteSpace:"nowrap",boxShadow:"0 8px 32px rgba(0,0,0,.5)",
background:toastBg,color:"#080E0A",animation:"toastIn 0.3s ease"}}>
{toast.msg}
</div>
)}
<style>{`
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
input[type=number]{-moz-appearance:textfield}
::-webkit-scrollbar{width:0;height:0}
input,button,textarea,select{font-family:inherit}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.screen{animation:fadeUp 0.25s ease both}
`}</style>
</div>
);
}

function Dashboard({state,set,inc,totalExp,balance,saveRate,f}){
const [editIncome,setEditIncome]=useState(false);
const inputRef=useRef();
useEffect(()=>{if(editIncome)setTimeout(()=>inputRef.current?.focus(),80);},[editIncome]);

const goals=state.goals||[];
const activeGoals=goals.filter(g=>parseAmt(g.current)<parseAmt(g.target));
const totalNeeded=activeGoals.reduce((s,g)=>{const p=savingsPlan(g,inc);return s+(p?p.monthly:0);},0);
const allocation=distributeGoals(activeGoals,Math.max(balance,0));
const totalAlloc=Object.values(allocation).reduce((s,v)=>s+v,0);
const recRate=inc>0?(totalNeeded/inc)*100:0;
const badgeLabel=saveRate>=20?"EXCELLENT":saveRate>=10?"BON":saveRate>0?"À AMÉLIORER":"DÉFICIT";
const badgeColor=saveRate>=20?C.pos:saveRate>=10?"#34D399":saveRate>0?C.warn:C.neg;
const topCats=[...state.categories].map(c=>({...c,val:parseAmt(state.expenses[c.id])})).filter(c=>c.val>0).sort((a,b)=>b.val-a.val).slice(0,4);

const tips=[];
if(inc>0&&totalExp/inc>0.9)tips.push({icon:"🔴",txt:"Tes dépenses représentent "+fmtPct((totalExp/inc)*100)+" de tes revenus. Il reste peu de marge."});
if(balance>0&&totalNeeded>balance)tips.push({icon:"⚠️",txt:"L'épargne nécessaire pour tes objectifs ("+f(totalNeeded)+"/mois) dépasse ton solde disponible ("+f(balance)+")."});
if(!goals.some(g=>g.name&&(g.name.toLowerCase().includes("urgence")||g.name.toLowerCase().includes("fonds"))))
tips.push({icon:"💡",txt:"Pense à créer un fonds d'urgence (3 à 6 mois de dépenses)."});
activeGoals.forEach(g=>{const p=savingsPlan(g,inc);if(p&&p.months>0&&p.monthly<balance*0.05)tips.push({icon:"🚀",txt:"L'objectif \""+g.name+"\" pourrait être atteint bien plus tôt en y allouant plus."});});

const essential=state.categories.filter(c=>["housing","food","health","transport"].includes(c.id)).reduce((s,c)=>s+parseAmt(state.expenses[c.id]),0);
const variable=totalExp-essential;
const margin=balance-totalAlloc;
const planStatus=margin>inc*0.15?"confortable":margin>0?"équilibré":margin>-inc*0.1?"serré":"insuffisant";
const planColor=planStatus==="confortable"?C.pos:planStatus==="équilibré"?C.gold:planStatus==="serré"?C.warn:C.neg;

return(
<div className="screen" style={{padding:"18px 14px",display:"flex",flexDirection:"column",gap:12}}>
<Card>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
<Lbl>REVENU MENSUEL NET</Lbl>
<GhostBtn onClick={()=>setEditIncome(v=>!v)}>{editIncome?"✓ Valider":"Modifier"}</GhostBtn>
</div>
{editIncome?(
<div style={{display:"flex",alignItems:"center",gap:6}}>
<span style={{fontSize:26,color:C.gold,fontWeight:700}}>€</span>
<input ref={inputRef} type="number" inputMode="decimal"
value={state.income} placeholder="0"
onChange={e=>set({income:e.target.value})}
onBlur={()=>setEditIncome(false)}
style={{background:"transparent",border:"none",outline:"none",color:C.text,
fontSize:40,fontWeight:800,width:"100%",fontVariantNumeric:"tabular-nums"}}/>
</div>
):(
<div onClick={()=>setEditIncome(true)} style={{cursor:"pointer"}}>
<div style={{fontSize:44,fontWeight:800,color:C.text,fontVariantNumeric:"tabular-nums",letterSpacing:"-0.025em",lineHeight:1}}>{f(inc)}</div>
<div style={{fontSize:11,color:C.label,marginTop:4}}>Appuyer pour modifier</div>
</div>
)}
</Card>

<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
<Card style={{display:"flex",flexDirection:"column",gap:8}}>
<Lbl>{balance<0?"DÉPASSEMENT":"SOLDE DISPO"}</Lbl>
<div style={{fontSize:24,fontWeight:800,fontVariantNumeric:"tabular-nums",letterSpacing:"-0.02em",color:balance<0?C.neg:C.pos}}>
{balance<0?"−":"+"}{f(Math.abs(balance))}
</div>
<Bar value={balance<0?totalExp:balance} max={Math.max(inc,1)} color={balance<0?C.neg:C.pos}/>
<div style={{fontSize:10,color:C.label}}>{inc>0?fmtPct(Math.abs((balance/inc)*100))+" du revenu":"—"}</div>
</Card>
<Card style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
<Lbl>TAUX D'ÉPARGNE</Lbl>
<Ring value={Math.max(saveRate,0)} max={100} color={badgeColor} size={78} sw={6}>
<span style={{fontSize:15,fontWeight:800,color:badgeColor}}>{fmtPct(Math.max(saveRate,0))}</span>
</Ring>
<Chip label={badgeLabel} color={badgeColor}/>
</Card>
<Card style={{display:"flex",flexDirection:"column",gap:8}}>
<Lbl>DÉPENSES TOTALES</Lbl>
<div style={{fontSize:24,fontWeight:800,fontVariantNumeric:"tabular-nums",letterSpacing:"-0.02em",color:C.text}}>{f(totalExp)}</div>
<div style={{fontSize:10,color:C.label}}>{inc>0?fmtPct((totalExp/inc)*100)+" du revenu":"—"}</div>
</Card>
<Card style={{display:"flex",flexDirection:"column",gap:8}}>
<Lbl>ÉPARGNE RECOMMANDÉE</Lbl>
<div style={{fontSize:22,fontWeight:800,fontVariantNumeric:"tabular-nums",color:C.gold}}>{f(totalNeeded)}</div>
<div style={{fontSize:10,color:C.label}}>{inc>0?fmtPct(recRate)+" du revenu":"Ajoute des objectifs"}</div>
</Card>
</div>

<Card style={{background:C.s2,borderColor:C.border}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
<Lbl>MON PLAN DU MOIS</Lbl>
<Chip label={planStatus.toUpperCase()} color={planColor}/>
</div>
<div style={{display:"flex",flexDirection:"column",gap:7}}>
<StatRow label="Revenu prévu" value={f(inc)}/>
<StatRow label="Dépenses obligatoires" value={f(essential)} color={C.blue}/>
<StatRow label="Dépenses variables" value={f(variable)} color={C.purple}/>
<StatRow label="Épargne recommandée" value={f(totalAlloc)} color={C.gold}/>
<StatRow label="Marge de sécurité" value={f(Math.max(margin,0))} color={margin>0?C.pos:C.neg}/>
</div>
<div style={{marginTop:12,padding:"10px 12px",background:`${planColor}10`,
border:`1px solid ${planColor}30`,borderRadius:10,fontSize:13,color:C.label,lineHeight:1.6}}>
{planStatus==="confortable"&&"✅ Budget confortable. Tu disposes d'une bonne marge après tes dépenses et ton épargne."}
{planStatus==="équilibré" &&"⚖️ Budget équilibré. Continue à suivre tes dépenses pour rester dans cet équilibre."}
{planStatus==="serré" &&"⚠️ Budget serré. Surveille tes dépenses variables pour éviter le dépassement."}
{planStatus==="insuffisant"&&"🔴 Budget insuffisant. Tes objectifs et dépenses dépassent tes revenus. Ajuste ta stratégie."}
</div>
</Card>

{activeGoals.length>0&&(
<Card>
<Lbl style={{marginBottom:12}}>RÉPARTITION ÉPARGNE PAR OBJECTIF</Lbl>
<div style={{display:"flex",flexDirection:"column",gap:10}}>
{activeGoals.map(g=>(
<div key={g.id}>
<div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
<span style={{fontSize:13,color:C.label}}>{g.icon} {g.name}</span>
<span style={{fontSize:13,fontWeight:700,color:g.color,fontVariantNumeric:"tabular-nums"}}>{f(allocation[g.id]||0)} /mois</span>
</div>
<Bar value={allocation[g.id]||0} max={Math.max(totalAlloc,1)} color={g.color}/>
</div>
))}
</div>
<div style={{marginTop:10,fontSize:11,color:C.muted}}>Total alloué : {f(totalAlloc)} sur {f(Math.max(balance,0))} disponible</div>
</Card>
)}

{topCats.length>0&&(
<Card>
<Lbl style={{marginBottom:12}}>TOP DÉPENSES</Lbl>
<div style={{display:"flex",flexDirection:"column",gap:10}}>
{topCats.map(cat=>(
<div key={cat.id}>
<div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
<span style={{fontSize:13,color:C.label}}>{cat.icon} {cat.label}</span>
<span style={{fontSize:13,fontWeight:700,color:cat.color,fontVariantNumeric:"tabular-nums"}}>{f(cat.val)}</span>
</div>
<Bar value={cat.val} max={totalExp} color={cat.color}/>
</div>
))}
</div>
</Card>
)}

{tips.length>0&&(
<Card style={{background:C.s2}}>
<Lbl style={{marginBottom:10}}>CONSEILS PERSONNALISÉS</Lbl>
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{tips.map((t,i)=>(
<div key={i} style={{fontSize:13,color:C.label,lineHeight:1.6,
padding:"8px 10px",background:`${C.border}40`,borderRadius:10}}>
{t.icon} {t.txt}
</div>
))}
</div>
</Card>
)}
</div>
);
}

function Depenses({state,set,inc,totalExp,balance,f,showToast}){
const [editId,setEditId]=useState(null);
const [showAdd,setShowAdd]=useState(false);
const [newCat,setNewCat]=useState({label:"",icon:"📦",color:COLORS[0]});

const updateExp=(id,v)=>set({expenses:{...state.expenses,[id]:v}});
const updateCat=(id,p)=>set({categories:state.categories.map(c=>c.id===id?{...c,...p}:c)});
const deleteCat=(id)=>{
const{[id]:_,...rest}=state.expenses;
set({categories:state.categories.filter(c=>c.id!==id),expenses:rest});
setEditId(null);showToast("Catégorie supprimée","warn");
};
const addCat=()=>{
if(!newCat.label.trim()){showToast("Nom requis","err");return;}
set({categories:[...state.categories,{id:uid(),...newCat,budget:0}]});
setNewCat({label:"",icon:"📦",color:COLORS[0]});setShowAdd(false);showToast("Catégorie ajoutée ✓");
};
const donutData=state.categories.map(c=>({label:c.label,value:parseAmt(state.expenses[c.id]),color:c.color})).filter(d=>d.value>0);

return(
<div className="screen" style={{padding:"18px 14px",display:"flex",flexDirection:"column",gap:12}}>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
<Card style={{textAlign:"center"}}>
<Lbl style={{marginBottom:6}}>TOTAL DÉPENSÉ</Lbl>
<div style={{fontSize:22,fontWeight:800,color:C.text}}>{f(totalExp)}</div>
</Card>
<Card style={{textAlign:"center"}}>
<Lbl style={{marginBottom:6}}>RESTANT</Lbl>
<div style={{fontSize:22,fontWeight:800,color:balance>=0?C.pos:C.neg}}>{f(Math.max(balance,0))}</div>
</Card>
</div>
{donutData.length>0&&(
<Card>
<Lbl style={{marginBottom:12}}>RÉPARTITION</Lbl>
<div style={{display:"flex",gap:14,alignItems:"center"}}>
<DonutChart data={donutData} size={130}/>
<div style={{flex:1,display:"flex",flexDirection:"column",gap:7}}>
{donutData.slice(0,5).map((d,i)=>(
<div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
<div style={{width:7,height:7,borderRadius:2,background:d.color,flexShrink:0}}/>
<span style={{fontSize:11,color:C.label,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.label}</span>
<span style={{fontSize:11,fontWeight:700,color:d.color,fontVariantNumeric:"tabular-nums"}}>
{totalExp>0?fmtPct((d.value/totalExp)*100):"—"}
</span>
</div>
))}
</div>
</div>
</Card>
)}
{state.categories.map(cat=>{
const val=parseAmt(state.expenses[cat.id]);
const over=cat.budget>0&&val>cat.budget;
const isEd=editId===cat.id;
return(
<Card key={cat.id} style={{borderColor:isEd?`${cat.color}60`:C.border}}>
<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
<span style={{fontSize:22}}>{cat.icon}</span>
<span style={{flex:1,fontSize:14,fontWeight:700}}>{cat.label}</span>
{over&&!isEd&&<Chip label="DÉPASSÉ" color={C.neg}/>}
<GhostBtn onClick={()=>setEditId(isEd?null:cat.id)}>{isEd?"✓":"✏️"}</GhostBtn>
</div>
<Bar value={val} max={cat.budget>0?cat.budget:Math.max(totalExp,val,1)} color={over?C.neg:cat.color}/>
<div style={{display:"flex",justifyContent:"space-between",marginTop:5,marginBottom:12}}>
<span style={{fontSize:10,color:C.label}}>{inc>0?fmtPct((val/inc)*100)+" du revenu":""}</span>
{cat.budget>0&&<span style={{fontSize:10,color:over?C.neg:C.label}}>Limite : {f(cat.budget)}</span>}
</div>
<div style={{display:"flex",alignItems:"center",gap:6}}>
<span style={{fontSize:16,color:C.gold,fontWeight:700}}>€</span>
<input type="number" inputMode="decimal"
value={state.expenses[cat.id]||""}
onChange={e=>updateExp(cat.id,e.target.value)}
placeholder="0"
style={{background:"transparent",border:"none",borderBottom:`1px solid ${C.border}`,
outline:"none",color:val>0?cat.color:C.text,fontSize:28,fontWeight:800,
width:"100%",paddingBottom:4,fontVariantNumeric:"tabular-nums"}}/>
</div>
{isEd&&(
<div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginTop:14,display:"flex",flexDirection:"column",gap:12}}>
<Field label="NOM" value={cat.label} onChange={e=>updateCat(cat.id,{label:e.target.value})} placeholder="Nom"/>
<Field label="BUDGET LIMITE (€)" type="number" value={cat.budget||""} onChange={e=>updateCat(cat.id,{budget:parseAmt(e.target.value)})} placeholder="Pas de limite"/>
<div>
<Lbl style={{marginBottom:8}}>ICÔNE</Lbl>
<div style={{display:"flex",flexWrap:"wrap",gap:6}}>
{ICONS.map(ic=>(
<button key={ic} onClick={()=>updateCat(cat.id,{icon:ic})}
style={{fontSize:18,background:cat.icon===ic?C.s2:"transparent",
border:`1px solid ${cat.icon===ic?C.gold:C.border}`,borderRadius:8,padding:"4px 6px",cursor:"pointer"}}>{ic}</button>
))}
</div>
</div>
<div>
<Lbl style={{marginBottom:8}}>COULEUR</Lbl>
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
{COLORS.map(col=>(
<button key={col} onClick={()=>updateCat(cat.id,{color:col})}
style={{width:26,height:26,borderRadius:"50%",background:col,
border:`3px solid ${cat.color===col?C.text:"transparent"}`,cursor:"pointer"}}/>
))}
</div>
</div>
<button onClick={()=>deleteCat(cat.id)}
style={{padding:"10px",borderRadius:12,border:`1px solid ${C.neg}30`,
background:`${C.neg}10`,color:C.neg,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
Supprimer cette catégorie
</button>
</div>
)}
</Card>
);
})}
{showAdd?(
<Card>
<Lbl style={{marginBottom:12}}>NOUVELLE CATÉGORIE</Lbl>
<Field value={newCat.label} onChange={e=>setNewCat(n=>({...n,label:e.target.value}))} placeholder="Nom (ex : Streaming)" style={{marginBottom:12}}/>
<Lbl style={{marginBottom:8}}>ICÔNE</Lbl>
<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
{ICONS.map(ic=>(
<button key={ic} onClick={()=>setNewCat(n=>({...n,icon:ic}))}
style={{fontSize:18,background:newCat.icon===ic?C.s2:"transparent",
border:`1px solid ${newCat.icon===ic?C.gold:C.border}`,borderRadius:8,padding:"4px 6px",cursor:"pointer"}}>{ic}</button>
))}
</div>
<Lbl style={{marginBottom:8}}>COULEUR</Lbl>
<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
{COLORS.map(col=>(
<button key={col} onClick={()=>setNewCat(n=>({...n,color:col}))}
style={{width:26,height:26,borderRadius:"50%",background:col,
border:`3px solid ${newCat.color===col?C.text:"transparent"}`,cursor:"pointer"}}/>
))}
</div>
<div style={{display:"flex",gap:10}}>
<GoldBtn onClick={addCat} style={{flex:1}}>Ajouter</GoldBtn>
<GhostBtn onClick={()=>setShowAdd(false)} style={{flex:1,padding:"12px 0"}}>Annuler</GhostBtn>
</div>
</Card>
):(
<button onClick={()=>setShowAdd(true)}
style={{padding:"14px",borderRadius:16,border:`1px dashed ${C.muted}`,background:"transparent",
color:C.label,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",width:"100%"}}>
+ Ajouter une catégorie
</button>
)}
</div>
);
}

// GoalForm — declared at MODULE level, never inside another component (fixes focus bug)
function GoalForm({data,onChange,onSubmit,onCancel,submitLabel,inc,balance}){
const plan=data.deadline?savingsPlan(data,inc):null;
const isOver=plan&&balance>0&&plan.monthly>balance;
const alts=isOver?altPlans(plan.rem,balance):null;
const rem=Math.max(parseAmt(data.target)-parseAmt(data.current),0);
const isPast=data.deadline&&new Date(data.deadline)<new Date();
const dd=data.deadline
? new Date(data.deadline).toLocaleDateString("fr-FR",{month:"long",year:"numeric"})
: null;

return(
<Card>
<Lbl style={{marginBottom:10}}>CHOISIR UN TYPE</Lbl>
<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
{GOAL_SUGGESTIONS.map(s=>(
<button key={s.name} onClick={()=>onChange({name:s.name,icon:s.icon,color:s.color})}
style={{padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:600,
cursor:"pointer",fontFamily:"inherit",
background:data.name===s.name?s.color:"transparent",
color:data.name===s.name?"#080E0A":C.label,
border:`1px solid ${data.name===s.name?s.color:C.border}`}}>
{s.icon} {s.name}
</button>
))}
</div>
<Field label="NOM DE L'OBJECTIF" value={data.name}
onChange={e=>onChange({name:e.target.value})}
placeholder="Ex : Voyage Japon, Fonds d'urgence…"
style={{marginBottom:12}}/>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
<Field label="MONTANT CIBLE (€)" type="number" value={data.target}
onChange={e=>onChange({target:e.target.value})} placeholder="5 000"/>
<Field label="DÉJÀ ÉPARGNÉ (€)" type="number" value={data.current}
onChange={e=>onChange({current:e.target.value})} placeholder="0"/>
</div>
<Field label="DATE CIBLE" type="date" value={data.deadline||""}
onChange={e=>onChange({deadline:e.target.value})}
style={{marginBottom:12,color:data.deadline?C.text:C.label}}/>
<div style={{marginBottom:14}}>
<Lbl style={{marginBottom:8}}>PRIORITÉ</Lbl>
<div style={{display:"flex",gap:8}}>
{PRIORITIES.map(p=>(
<button key={p} onClick={()=>onChange({priority:p})}
style={{flex:1,padding:"8px 0",borderRadius:10,fontFamily:"inherit",
fontSize:12,fontWeight:700,cursor:"pointer",
background:data.priority===p?C.gold:"transparent",
color:data.priority===p?"#080E0A":C.label,
border:`1px solid ${data.priority===p?C.gold:C.border}`}}>
{p.charAt(0).toUpperCase()+p.slice(1)}
</button>
))}
</div>
</div>
<Lbl style={{marginBottom:8}}>ICÔNE</Lbl>
<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
{G_ICONS.map(ic=>(
<button key={ic} onClick={()=>onChange({icon:ic})}
style={{fontSize:18,background:data.icon===ic?C.s2:"transparent",
border:`1px solid ${data.icon===ic?C.gold:C.border}`,
borderRadius:8,padding:"4px 6px",cursor:"pointer"}}>{ic}</button>
))}
</div>
<Lbl style={{marginBottom:8}}>COULEUR</Lbl>
<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
{COLORS.map(col=>(
<button key={col} onClick={()=>onChange({color:col})}
style={{width:26,height:26,borderRadius:"50%",background:col,
border:`3px solid ${data.color===col?C.text:"transparent"}`,cursor:"pointer"}}/>
))}
</div>
{plan&&!isPast&&rem>0&&(
<div style={{padding:"12px 14px",background:`${C.gold}10`,
border:`1px solid ${C.gold}30`,borderRadius:12,marginBottom:12}}>
<div style={{fontSize:13,color:C.text,fontWeight:600,marginBottom:6}}>📅 Plan d'épargne</div>
<div style={{fontSize:13,color:C.label,lineHeight:1.7}}>
Pour atteindre cet objectif en{" "}
<span style={{color:C.text,fontWeight:700}}>{dd}</span>, mets environ{" "}
<span style={{color:C.gold,fontWeight:700}}>{Math.round(plan.monthly)} €</span> de côté par mois
({Math.round(plan.weekly)} €/semaine)
{inc>0?" · soit "+fmtPct(plan.pctInc)+" de ton revenu":""}.
<br/>
<span style={{fontSize:11,color:C.muted}}>
Montant restant : {Math.round(rem)} € sur {plan.months} mois.
</span>
</div>
</div>
)}
{isPast&&(
<div style={{padding:"10px 12px",background:`${C.neg}10`,border:`1px solid ${C.neg}30`,
borderRadius:10,marginBottom:12,fontSize:12,color:C.neg}}>
⚠️ La date cible est déjà passée. Choisis une nouvelle date.
</div>
)}
{isOver&&alts&&(
<div style={{marginBottom:14}}>
<div style={{fontSize:13,color:C.warn,fontWeight:600,marginBottom:8}}>
⚠️ L'épargne nécessaire ({Math.round(plan.monthly)} €) dépasse ton solde ({Math.round(balance)} €).
</div>
<div style={{fontSize:12,color:C.label,marginBottom:8}}>3 alternatives :</div>
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{alts.map((a,i)=>(
<div key={i} style={{padding:"10px 12px",
background:a.recommended?`${C.gold}12`:`${C.border}40`,
border:`1px solid ${a.recommended?C.gold:C.border}`,borderRadius:10}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
<span style={{fontSize:13,fontWeight:700,color:a.recommended?C.gold:C.text}}>{a.label}</span>
{a.recommended&&<Chip label="RECOMMANDÉ" color={C.gold}/>}
</div>
<div style={{fontSize:12,color:C.label}}>
{Math.round(a.monthly)} € /mois · {a.months} mois · Fin : {a.date}
</div>
</div>
))}
</div>
</div>
)}
<div style={{display:"flex",gap:10}}>
<GoldBtn onClick={onSubmit} style={{flex:1}}>{submitLabel}</GoldBtn>
<GhostBtn onClick={onCancel} style={{flex:1,padding:"12px 0"}}>Annuler</GhostBtn>
</div>
</Card>
);
}

// GoalEditWrapper — module-level, owns its own draft state (fixes focus bug for edit mode)
function GoalEditWrapper({goal,inc,balance,onSave,onCancel}){
const [draft,setDraft]=useState({...goal});
const update=useCallback((patch)=>setDraft(p=>({...p,...patch})),[]);
return(
<GoalForm data={draft} onChange={update}
onSubmit={()=>onSave(draft)} onCancel={onCancel}
submitLabel="Enregistrer" inc={inc} balance={balance}/>
);
}

function Objectifs({state,set,inc,balance,f,showToast}){
const [showAdd,setShowAdd]=useState(false);
const [editId,setEditId]=useState(null);
const [ng,setNg]=useState(EMPTY_GOAL);

const addGoal=useCallback(()=>{
if(!ng.name.trim()){showToast("Nom requis","err");return;}
if(!ng.target||parseAmt(ng.target)<=0){showToast("Montant cible requis","err");return;}
set({goals:[...state.goals,{id:uid(),...ng,current:ng.current||"0"}]});
setNg(EMPTY_GOAL());setShowAdd(false);showToast("Objectif créé ✓");
},[ng,state.goals,set,showToast]);

const updGoal=useCallback((id,patch)=>set({goals:state.goals.map(g=>g.id===id?{...g,...patch}:g)}),[state.goals,set]);
const delGoal=useCallback((id)=>{set({goals:state.goals.filter(g=>g.id!==id)});setEditId(null);showToast("Objectif supprimé","warn");},[state.goals,set,showToast]);

const totalSaved=state.goals.reduce((s,g)=>s+parseAmt(g.current),0);
const totalTarget=state.goals.reduce((s,g)=>s+parseAmt(g.target),0);

return(
<div className="screen" style={{padding:"18px 14px",display:"flex",flexDirection:"column",gap:12}}>
{state.goals.length>0&&(
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
<Card style={{textAlign:"center"}}>
<Lbl style={{marginBottom:6}}>TOTAL ÉPARGNÉ</Lbl>
<div style={{fontSize:20,fontWeight:800,color:C.pos}}>{f(totalSaved)}</div>
</Card>
<Card style={{textAlign:"center"}}>
<Lbl style={{marginBottom:6}}>TOTAL CIBLÉ</Lbl>
<div style={{fontSize:20,fontWeight:800,color:C.gold}}>{f(totalTarget)}</div>
</Card>
</div>
)}
{state.goals.length===0&&!showAdd&&(
<Card style={{textAlign:"center",padding:"40px 20px"}}>
<div style={{fontSize:40,marginBottom:14}}>🎯</div>
<div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:8}}>Aucun objectif</div>
<div style={{fontSize:13,color:C.label,lineHeight:1.6}}>
Définis tes projets financiers :<br/>voyage, achat, épargne d'urgence…
</div>
</Card>
)}
{showAdd&&(
<GoalForm data={ng} onChange={patch=>setNg(p=>({...p,...patch}))}
onSubmit={addGoal} onCancel={()=>{setShowAdd(false);setNg(EMPTY_GOAL());}}
submitLabel="Créer l'objectif" inc={inc} balance={balance}/>
)}
{state.goals.map(goal=>{
const cur=parseAmt(goal.current),tar=parseAmt(goal.target)||1;
const pct=clamp((cur/tar)*100,0,100),done=cur>=tar,rem=Math.max(tar-cur,0);
const dl=goal.deadline?Math.ceil((new Date(goal.deadline)-new Date())/86400000):null;
const plan=savingsPlan(goal,inc);
if(editId===goal.id)return(
<GoalEditWrapper key={goal.id} goal={goal} inc={inc} balance={balance}
onSave={(patch)=>{updGoal(goal.id,patch);setEditId(null);showToast("Objectif mis à jour ✓");}}
onCancel={()=>setEditId(null)}/>
);
return(
<Card key={goal.id} style={{borderColor:done?`${goal.color}60`:C.border,background:done?`${goal.color}06`:C.s1}}>
<div style={{display:"flex",gap:12,marginBottom:14,alignItems:"flex-start"}}>
<div style={{width:44,height:44,borderRadius:12,flexShrink:0,fontSize:22,
background:`${goal.color}18`,display:"flex",alignItems:"center",justifyContent:"center"}}>
{goal.icon}
</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
<div style={{fontSize:15,fontWeight:700,color:C.text,overflow:"hidden",
textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"60%"}}>{goal.name}</div>
<div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}>
{goal.priority&&goal.priority!=="normale"&&(
<Chip label={goal.priority==="prioritaire"?"🔴 PRIO":"🟢 SEC"}
color={goal.priority==="prioritaire"?C.neg:C.pos}/>
)}
{done?<Chip label="ATTEINT ✓" color={goal.color}/>:
dl!==null&&<Chip label={dl>=0?dl+"j":"EXPIRÉ"} color={dl>=0?C.warn:C.neg}/>}
</div>
</div>
<div style={{fontSize:11,color:C.label,marginTop:2}}>Objectif : {f(tar)}</div>
</div>
<GhostBtn onClick={()=>setEditId(goal.id)}>✏️</GhostBtn>
</div>
<div style={{display:"flex",gap:14,alignItems:"center",marginBottom:14}}>
<Ring value={cur} max={tar} color={goal.color} size={70} sw={5}>
<span style={{fontSize:12,fontWeight:800,color:goal.color}}>{Math.round(pct)}%</span>
</Ring>
<div style={{flex:1}}>
<div style={{fontSize:26,fontWeight:800,color:goal.color,fontVariantNumeric:"tabular-nums",marginBottom:2}}>{f(cur)}</div>
{done?<div style={{fontSize:12,color:goal.color,fontWeight:600}}>🎉 Félicitations !</div>
:<div style={{fontSize:11,color:C.label}}>Encore {f(rem)} à atteindre</div>}
</div>
</div>
<Bar value={cur} max={tar} color={goal.color} h={7}/>
{plan&&rem>0&&(
<div style={{marginTop:12,padding:"10px 12px",background:`${goal.color}10`,
border:`1px solid ${goal.color}25`,borderRadius:10,fontSize:12,color:C.label,lineHeight:1.6}}>
{"💰 "+Math.round(plan.monthly)+" €/mois pendant "+plan.months+" mois"
+(plan.pctInc?" · "+fmtPct(plan.pctInc)+" du revenu":"")}
</div>
)}
<button onClick={()=>delGoal(goal.id)}
style={{marginTop:10,padding:"8px",width:"100%",borderRadius:10,
border:`1px solid ${C.neg}25`,background:`${C.neg}08`,color:C.neg,
fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
Supprimer
</button>
</Card>
);
})}
{!showAdd&&(
<button onClick={()=>setShowAdd(true)}
style={{padding:"14px",borderRadius:16,border:`1px dashed ${C.muted}`,background:"transparent",
color:C.label,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit",width:"100%"}}>
+ Nouvel objectif financier
</button>
)}
</div>
);
}

function Stats({state,inc,totalExp,balance,saveRate,f}){
const histData=[...state.history]
.sort((a,b)=>a.month.localeCompare(b.month)).slice(-6)
.map(h=>{
const exp=Object.values(h.expenses||{}).reduce((s,v)=>s+parseAmt(v),0);
const[,m]=h.month.split("-");
return{label:MONTHS[parseInt(m)-1],value:parseAmt(h.income)-exp};
});
histData.push({label:MONTHS[new Date().getMonth()]+"*",value:balance});
const monthStats=state.categories.map(c=>({...c,val:parseAmt(state.expenses[c.id])})).filter(c=>c.val>0).sort((a,b)=>b.val-a.val);
const biggest=monthStats[0];
const essential=state.categories.filter(c=>["housing","food","health","transport"].includes(c.id)).reduce((s,c)=>s+parseAmt(state.expenses[c.id]),0);
const discretionary=totalExp-essential;

return(
<div className="screen" style={{padding:"18px 14px",display:"flex",flexDirection:"column",gap:12}}>
<Card>
<Lbl style={{marginBottom:12}}>RÉSUMÉ DU MOIS</Lbl>
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
{[
{label:"Revenus",val:f(inc),color:C.pos},
{label:"Dépenses",val:f(totalExp),color:C.neg},
{label:"Solde",val:f(balance),color:balance>=0?C.pos:C.neg}
].map(({label,val,color})=>(
<div key={label} style={{textAlign:"center",padding:"10px 4px",background:C.s2,borderRadius:12,border:`1px solid ${C.border}`}}>
<div style={{fontSize:10,color:C.label,marginBottom:4,letterSpacing:"0.08em"}}>{label.toUpperCase()}</div>
<div style={{fontSize:14,fontWeight:800,color,fontVariantNumeric:"tabular-nums"}}>{val}</div>
</div>
))}
</div>
</Card>
{monthStats.length>0&&(
<Card>
<Lbl style={{marginBottom:12}}>GRAPHIQUE DE RÉPARTITION</Lbl>
<div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
<DonutChart data={monthStats.map(c=>({label:c.label,value:c.val,color:c.color}))} size={170}/>
</div>
<div style={{display:"flex",flexDirection:"column",gap:7}}>
{monthStats.map(c=>(
<div key={c.id} style={{display:"flex",alignItems:"center",gap:8}}>
<div style={{width:8,height:8,borderRadius:2,background:c.color,flexShrink:0}}/>
<span style={{flex:1,fontSize:12,color:C.label}}>{c.icon} {c.label}</span>
<span style={{fontSize:12,fontWeight:700,color:c.color,fontVariantNumeric:"tabular-nums"}}>
{f(c.val)} · {totalExp>0?fmtPct((c.val/totalExp)*100):"—"}
</span>
</div>
))}
</div>
</Card>
)}
<Card>
<Lbl style={{marginBottom:12}}>ÉVOLUTION DU SOLDE (6 mois)</Lbl>
<BarChart data={histData} color={C.pos} h={100}/>
<div style={{fontSize:10,color:C.muted,marginTop:6}}>* Mois en cours</div>
</Card>
<Card>
<Lbl style={{marginBottom:12}}>STATISTIQUES</Lbl>
<div style={{display:"flex",flexDirection:"column",gap:0}}>
<StatRow label="Taux d'épargne" value={fmtPct(Math.max(saveRate,0))} color={saveRate>=20?C.pos:saveRate>=10?C.warn:C.neg}/>
<StatRow label="Dépenses / revenu" value={inc>0?fmtPct((totalExp/inc)*100):"—"}/>
<StatRow label="Dépenses essentielles" value={f(essential)} color={C.blue}/>
<StatRow label="Dépenses non-essentielles" value={f(discretionary)} color={C.purple}/>
{biggest&&<StatRow label={"Poste principal ("+biggest.label+")"} value={f(biggest.val)} color={biggest.color}/>}
<StatRow label="Objectifs actifs" value={""+state.goals.length} color={C.gold}/>
<StatRow label="Objectifs atteints" value={""+state.goals.filter(g=>parseAmt(g.current)>=parseAmt(g.target)).length} color={C.pos}/>
</div>
</Card>
{state.history.length>0&&(
<Card>
<Lbl style={{marginBottom:12}}>HISTORIQUE ARCHIVÉ</Lbl>
{[...state.history].sort((a,b)=>b.month.localeCompare(a.month)).map((h,i)=>{
const exp=Object.values(h.expenses||{}).reduce((s,v)=>s+parseAmt(v),0);
const bal=parseAmt(h.income)-exp;
const[y,m]=h.month.split("-");
return(
<div key={h.month} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",
borderBottom:i<state.history.length-1?`1px solid ${C.border}`:"none"}}>
<div style={{width:36,height:36,borderRadius:10,flexShrink:0,
background:bal>=0?`${C.pos}15`:`${C.neg}15`,
display:"flex",alignItems:"center",justifyContent:"center",
fontSize:11,fontWeight:700,color:bal>=0?C.pos:C.neg}}>{MONTHS[parseInt(m)-1]}</div>
<div style={{flex:1}}>
<div style={{fontSize:13,fontWeight:600}}>{MONTH_FULL[parseInt(m)-1]} {y}</div>
<div style={{fontSize:11,color:C.label}}>{f(parseAmt(h.income))} de revenus</div>
</div>
<div style={{textAlign:"right"}}>
<div style={{fontSize:14,fontWeight:800,color:bal>=0?C.pos:C.neg,fontVariantNumeric:"tabular-nums"}}>
{bal>=0?"+":"−"}{f(Math.abs(bal))}
</div>
<div style={{fontSize:10,color:C.label}}>{f(exp)} dépensé</div>
</div>
</div>
);
})}
</Card>
)}
<button onClick={()=>exportPDF(state,{inc,totalExp,balance,saveRate,f})}
style={{padding:"15px",borderRadius:16,border:`1px solid ${C.goldDim}`,
background:`${C.gold}10`,color:C.gold,fontSize:14,fontWeight:700,
cursor:"pointer",fontFamily:"inherit",width:"100%",letterSpacing:"0.04em"}}>
📄 Exporter le rapport PDF
</button>
</div>
);
}

function Settings({state,set,showToast,handleReset,saveMonthSnapshot}){
const upd=(patch)=>set({settings:{...state.settings,...patch}});
const storageSize=(()=>{
try{return(new Blob([localStorage.getItem(STORAGE_KEY)||""]).size/1024).toFixed(1)+" Ko";}
catch{return"—";}
})();

return(
<div className="screen" style={{padding:"18px 14px",display:"flex",flexDirection:"column",gap:12}}>
<Card>
<Lbl style={{marginBottom:12}}>PROFIL</Lbl>
<Field label="PRÉNOM" value={state.settings.name||""}
onChange={e=>upd({name:e.target.value})} placeholder="Ex : Steeve"/>
</Card>
<Card>
<Lbl style={{marginBottom:14}}>PRÉFÉRENCES</Lbl>
<div style={{marginBottom:14}}>
<Lbl style={{marginBottom:8}}>DEVISE</Lbl>
<div style={{display:"flex",gap:8}}>
{Object.entries(CURRENCY_SYMBOLS).map(([code,sym])=>(
<button key={code} onClick={()=>upd({currency:code})}
style={{flex:1,padding:"9px 0",borderRadius:10,fontFamily:"inherit",
fontSize:13,fontWeight:700,cursor:"pointer",
background:state.settings.currency===code?C.gold:C.s2,
color:state.settings.currency===code?"#080E0A":C.label,
border:`1px solid ${state.settings.currency===code?C.gold:C.border}`}}>
{sym} {code}
</button>
))}
</div>
</div>
<div>
<Lbl style={{marginBottom:8}}>OBJECTIF D'ÉPARGNE</Lbl>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<input type="range" min={5} max={50} step={5}
value={state.settings.savingsGoalPct||20}
onChange={e=>upd({savingsGoalPct:parseInt(e.target.value)})}
style={{flex:1,accentColor:C.gold}}/>
<span style={{fontSize:16,fontWeight:800,color:C.gold,minWidth:40,textAlign:"right"}}>
{state.settings.savingsGoalPct||20}%
</span>
</div>
</div>
</Card>
<Card>
<Lbl style={{marginBottom:12}}>HISTORIQUE MENSUEL</Lbl>
<p style={{fontSize:13,color:C.label,lineHeight:1.6,marginBottom:12}}>
Archive les données du mois en cours avant de commencer un nouveau mois.
</p>
<GoldBtn onClick={saveMonthSnapshot}>
Archiver {MONTH_FULL[new Date().getMonth()]} {new Date().getFullYear()}
</GoldBtn>
{state.history.length>0&&(
<div style={{marginTop:8,fontSize:12,color:C.label}}>{state.history.length} mois archivé(s)</div>
)}
</Card>
<Card>
<Lbl style={{marginBottom:8}}>STOCKAGE LOCAL</Lbl>
<div style={{fontSize:13,color:C.label,marginBottom:4}}>
Espace utilisé : <span style={{color:C.text,fontWeight:700}}>{storageSize}</span>
</div>
<div style={{fontSize:11,color:C.muted}}>Toutes tes données restent sur cet appareil.</div>
</Card>
<Card>
<Lbl style={{marginBottom:10}}>INSTALLER L'APPLICATION</Lbl>
<p style={{fontSize:13,color:C.label,lineHeight:1.6}}>
<span style={{color:C.text,fontWeight:700}}>iPhone :</span> Safari → Partager → "Sur l'écran d'accueil"
<br/>
<span style={{color:C.text,fontWeight:700}}>Android :</span> Chrome → ⋮ → "Installer l'application"
</p>
</Card>
<button onClick={handleReset}
style={{padding:"14px",borderRadius:16,border:`1px solid ${C.neg}40`,
background:`${C.neg}08`,color:C.neg,fontSize:14,fontWeight:700,
cursor:"pointer",fontFamily:"inherit",width:"100%",letterSpacing:"0.04em"}}>
↺ Réinitialiser toutes les données
</button>
<div style={{textAlign:"center",fontSize:11,color:C.muted}}>KACORP BUDGET V4 · Données locales uniquement</div>
</div>
);
}

function exportPDF(state,{inc,totalExp,balance,saveRate,f}){
const d=new Date();
const ml=MONTH_FULL[d.getMonth()]+" "+d.getFullYear();
const cats=state.categories.map(c=>({...c,val:parseAmt(state.expenses[c.id])})).filter(c=>c.val>0).sort((a,b)=>b.val-a.val);
const goals=state.goals.map(g=>{
const cur=parseAmt(g.current),tar=parseAmt(g.target);
const pct=tar>0?Math.round((cur/tar)*100):0;
const plan=savingsPlan(g,inc);
return{...g,cur,tar,pct,planStr:plan?Math.round(plan.monthly)+" €/mois":""};
});
const isOver=balance<0;

const catsHTML=cats.map(c=>{
const pctVal=totalExp>0?clamp((c.val/totalExp)*100,0,100):0;
return "<div class='row'>"
+"<span style='font-size:16px;width:24px;text-align:center'>"+c.icon+"</span>"
+"<span style='flex:1;font-size:13px;color:#333'>"+c.label+"</span>"
+"<div class='bar-bg'><div class='bar-f' style='width:"+pctVal+"%;background:"+c.color+"'></div></div>"
+"<span style='font-size:11px;color:#888;min-width:36px;text-align:right'>"+fmtPct(pctVal)+"</span>"
+"<span style='font-size:13px;font-weight:700;min-width:70px;text-align:right;color:"+c.color+"'>"+f(c.val)+"</span>"
+"</div>";
}).join("");

const goalsHTML=goals.map(g=>{
return "<div class='row'>"
+"<span style='font-size:16px;width:24px;text-align:center'>"+g.icon+"</span>"
+"<div style='flex:1'>"
+"<div style='font-size:13px;font-weight:600'>"+g.name+"</div>"
+"<div style='font-size:11px;color:#888;margin-top:2px'>"+f(g.cur)+" / "+f(g.tar)+(g.planStr?" · "+g.planStr:"")+"</div>"
+"</div>"
+"<div class='bar-bg'><div class='bar-f' style='width:"+g.pct+"%;background:"+g.color+"'></div></div>"
+"<span style='font-size:13px;font-weight:700;min-width:36px;text-align:right;color:"+g.color+"'>"+g.pct+"%</span>"
+"</div>";
}).join("");

const adviceClass=saveRate>=20?"ok":saveRate>=10?"warn":"err";
const adviceTxt=saveRate>=20
?"Excellent taux d'épargne ("+fmtPct(saveRate)+"). Gestion financière exemplaire."
:saveRate>=10
?"Taux d'épargne correct ("+fmtPct(saveRate)+"). Objectif recommandé : 20%."
:saveRate>0
?"Taux d'épargne faible ("+fmtPct(saveRate)+"). Des ajustements sont nécessaires."
:"Budget dépassé de "+f(Math.abs(balance))+". Action immédiate requise.";

const histHTML=state.history.length>0
? "<div class='sec'><div class='sec-t'>Historique mensuel</div>"
+[...state.history].sort((a,b)=>b.month.localeCompare(a.month)).slice(0,6).map(h=>{
const exp2=Object.values(h.expenses||{}).reduce((s,v)=>s+parseAmt(v),0);
const bal2=parseAmt(h.income)-exp2;
const[y2,m2]=h.month.split("-");
return "<div style='display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:13px'>"
+"<span>"+MONTH_FULL[parseInt(m2)-1]+" "+y2+"</span>"
+"<span>"+f(parseAmt(h.income))+"</span>"
+"<span>"+f(exp2)+"</span>"
+"<span style='color:"+(bal2>=0?"#059669":"#DC2626")+";font-weight:700'>"+(bal2>=0?"+":"−")+f(Math.abs(bal2))+"</span>"
+"</div>";
}).join("")
+"</div>"
:"";

const html="<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'/>"
+"<title>KACORP BUDGET V4 - "+ml+"</title>"
+"<style>"
+"*{box-sizing:border-box;margin:0;padding:0}"
+"body{font-family:Inter,sans-serif;background:#fff;color:#111;padding:40px;font-size:14px}"
+".hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding-bottom:18px;border-bottom:2px solid #D8B56D}"
+".brand{font-size:22px;font-weight:800;color:#080E0A}"
+".brand span{color:#D8B56D}"
+".sec{margin-bottom:24px}"
+".sec-t{font-size:10px;font-weight:700;letter-spacing:.2em;color:#888;text-transform:uppercase;margin-bottom:12px;padding-bottom:5px;border-bottom:1px solid #eee}"
+".grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}"
+".kpi{background:#f8f9fa;border-radius:10px;padding:12px;text-align:center;border:1px solid #eee}"
+".kpi-l{font-size:9px;font-weight:700;letter-spacing:.12em;color:#888;text-transform:uppercase;margin-bottom:5px}"
+".kpi-v{font-size:16px;font-weight:800}"
+".pos{color:#059669}.neg{color:#DC2626}.gold{color:#B8860B}"
+".row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f0f0f0}"
+".bar-bg{width:100px;height:5px;background:#eee;border-radius:99px;overflow:hidden}"
+".bar-f{height:100%;border-radius:99px}"
+".alert{padding:12px 14px;border-radius:10px;font-size:13px;line-height:1.6}"
+".ok{background:#f0fdf4;border:1px solid #86efac;color:#166534}"
+".warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e}"
+".err{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}"
+".ft{margin-top:32px;padding-top:14px;border-top:1px solid #eee;font-size:10px;color:#aaa;text-align:center}"
+"</style></head><body>"
+"<div class='hd'>"
+"<div class='brand'>KACORP <span>BUDGET</span> <span style='font-size:12px;color:#888'>V4</span></div>"
+"<div style='font-size:11px;color:#888'>"+ml+(state.settings.name?" · "+state.settings.name:"")+"</div>"
+"</div>"
+"<div class='sec'><div class='sec-t'>Tableau de bord</div>"
+"<div class='grid'>"
+"<div class='kpi'><div class='kpi-l'>Revenus</div><div class='kpi-v pos'>"+f(inc)+"</div></div>"
+"<div class='kpi'><div class='kpi-l'>Dépenses</div><div class='kpi-v neg'>"+f(totalExp)+"</div></div>"
+"<div class='kpi'><div class='kpi-l'>"+(isOver?"Dépassement":"Solde")+"</div><div class='kpi-v "+(isOver?"neg":"pos")+"'>"+(isOver?"−":"+")+f(Math.abs(balance))+"</div></div>"
+"<div class='kpi'><div class='kpi-l'>Épargne</div><div class='kpi-v gold'>"+fmtPct(Math.max(saveRate,0))+"</div></div>"
+"</div>"
+"</div>"
+"<div class='sec'><div class='sec-t'>Analyse</div>"
+"<div class='alert "+adviceClass+"'>"+adviceTxt+"</div>"
+"</div>"
+(cats.length>0?"<div class='sec'><div class='sec-t'>Dépenses par catégorie</div>"+catsHTML+"</div>":"")
+(goals.length>0?"<div class='sec'><div class='sec-t'>Objectifs financiers</div>"+goalsHTML+"</div>":"")
+histHTML
+"<div class='ft'>KACORP BUDGET V4 · Généré le "
+d.toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})
+" · Données personnelles et confidentielles"
+"</div>"
+"</body></html>";

const win=window.open("","_blank");
if(!win){alert("Autorisez les pop-ups pour générer le PDF.");return;}
win.document.write(html);win.document.close();
setTimeout(()=>{win.focus();win.print();},600);
}
