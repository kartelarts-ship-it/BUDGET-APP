import { useState, useEffect, useRef, useCallback } from "react";

// ─── PALETTE ────────────────────────────────────────────────────
const C = {
bg: "#080E0A",
s1: "#0F1A12",
s2: "#152019",
border: "#1E3024",
gold: "#D8B56D",
goldDim: "#7A5E2A",
pos: "#6EE7B7",
neg: "#F87171",
warn: "#FBBF24",
text: "#F0F4F1",
label: "#7A9A82",
muted: "#2E4434",
blue: "#60A5FA",
purple: "#A78BFA",
};

// ─── CONSTANTES ─────────────────────────────────────────────────
const STORAGE_KEY = "kacorp_v2";
const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const MONTH_FULL = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const ICONS = ["🏠","🛒","🚗","❤️","🎬","💰","📦","✈️","🏋️","📚","🎓","💻","👕","🍽️","🎁","⚡","📱","🏥","🐾","🎮"];
const GOAL_ICONS = ["🎯","🏖️","🚀","🏠","🚗","✈️","💍","🎓","💻","🛡️","🌍","🏋️","💎","🎸","📸","🏄","🎨","🐕"];
const COLORS = ["#D8B56D","#6EE7B7","#60A5FA","#F87171","#A78BFA","#34D399","#FBBF24","#FB923C","#E879F9","#94A3B8"];

const DEFAULT_CATS = [
{ id:"housing", label:"Logement", icon:"🏠", color:"#D8B56D", budget:0 },
{ id:"food", label:"Alimentation", icon:"🛒", color:"#6EE7B7", budget:0 },
{ id:"transport", label:"Transport", icon:"🚗", color:"#60A5FA", budget:0 },
{ id:"health", label:"Santé", icon:"❤️", color:"#F87171", budget:0 },
{ id:"leisure", label:"Loisirs", icon:"🎬", color:"#A78BFA", budget:0 },
{ id:"savings", label:"Épargne", icon:"💰", color:"#34D399", budget:0 },
{ id:"other", label:"Autres", icon:"📦", color:"#94A3B8", budget:0 },
];

const CURRENCY_SYMBOLS = { EUR:"€", USD:"$", GBP:"£", CHF:"Fr" };

const DEFAULT_STATE = {
income: "",
categories: DEFAULT_CATS,
expenses: {},
goals: [],
history: [], // [{ month:"2024-01", income, expenses:{} }]
settings: {
currency: "EUR",
name: "",
savingsGoalPct: 20,
theme: "dark",
},
started: false,
};

// ─── HELPERS ────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const now = () => new Date();
const currentMonth = () => { const d = now(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };
const parseAmt = (v) => Math.max(0, parseFloat(String(v).replace(",",".")) || 0);

const load = () => { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const save = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} };

const fmt = (n, cur = "EUR") => {
const sym = CURRENCY_SYMBOLS[cur] || "€";
const abs = Math.abs(n || 0);
const str = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(abs);
return `${str} ${sym}`;
};
const fmtSigned = (n, cur) => (n >= 0 ? "+" : "−") + fmt(n, cur);
const fmtPct = (n) => `${Math.round(Math.max(0, n || 0))}%`;
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// ─── MINI UI ────────────────────────────────────────────────────
function Ring({ value, max, color, size = 80, sw = 6, children }) {
const r = (size - sw * 2) / 2;
const circ = 2 * Math.PI * r;
const p = max > 0 ? clamp(value / max, 0, 1) : 0;
return (
<div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform:"rotate(-90deg)" }}>
<circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={sw}/>
<circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
strokeDasharray={`${p*circ} ${circ}`} strokeLinecap="round"
style={{ transition:"stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1)" }}/>
</svg>
<div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
alignItems:"center", justifyContent:"center", textAlign:"center" }}>
{children}
</div>
</div>
);
}

function Bar({ value, max, color, h = 6 }) {
const w = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
return (
<div style={{ height:h, background:C.border, borderRadius:99, overflow:"hidden", width:"100%" }}>
<div style={{ height:"100%", width:`${w}%`, background:color, borderRadius:99,
transition:"width 0.6s cubic-bezier(.4,0,.2,1)" }}/>
</div>
);
}

function Chip({ label, color }) {
return (
<span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", color,
border:`1px solid ${color}40`, borderRadius:6, padding:"2px 7px", background:`${color}10` }}>
{label}
</span>
);
}

function Card({ children, style }) {
return <div style={{ background:C.s1, border:`1px solid ${C.border}`, borderRadius:18,
padding:"18px 16px", ...style }}>{children}</div>;
}

function Label({ children, style }) {
return <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
color:C.label, ...style }}>{children}</div>;
}

function GoldBtn({ children, onClick, style }) {
return (
<button onClick={onClick} style={{ border:"none", background:`linear-gradient(135deg,${C.gold},#E8C878)`,
color:"#080E0A", fontSize:14, fontWeight:800, borderRadius:14,
padding:"14px 0", cursor:"pointer", fontFamily:"inherit",
letterSpacing:"0.04em", width:"100%", ...style }}>
{children}
</button>
);
}

function GhostBtn({ children, onClick, style }) {
return (
<button onClick={onClick} style={{ background:C.s2, border:`1px solid ${C.border}`,
borderRadius:10, color:C.label, padding:"7px 13px", fontSize:12, fontWeight:600,
cursor:"pointer", fontFamily:"inherit", letterSpacing:"0.03em",
whiteSpace:"nowrap", ...style }}>
{children}
</button>
);
}

function InlineInput({ value, onChange, placeholder, type = "text", style }) {
return (
<input type={type} value={value} onChange={onChange} placeholder={placeholder}
inputMode={type === "number" ? "decimal" : "text"}
style={{ width:"100%", background:C.s2, border:`1px solid ${C.border}`,
borderRadius:10, padding:"10px 12px", fontSize:14, color:C.text,
outline:"none", fontFamily:"inherit", fontVariantNumeric:"tabular-nums",
...style }} />
);
}

// ─── SVG DONUT CHART ────────────────────────────────────────────
function DonutChart({ data, size = 180 }) {
const total = data.reduce((s, d) => s + d.value, 0);
if (total === 0) return (
<div style={{ width:size, height:size, borderRadius:"50%", background:C.border,
display:"flex", alignItems:"center", justifyContent:"center" }}>
<span style={{ fontSize:12, color:C.label }}>Aucune dépense</span>
</div>
);

const cx = size / 2, cy = size / 2, r = size * 0.38, innerR = size * 0.23;
let cumAngle = -Math.PI / 2;
const slices = data.filter(d => d.value > 0).map(d => {
const angle = (d.value / total) * 2 * Math.PI;
const startA = cumAngle;
cumAngle += angle;
const endA = cumAngle;
const x1 = cx + r * Math.cos(startA), y1 = cy + r * Math.sin(startA);
const x2 = cx + r * Math.cos(endA), y2 = cy + r * Math.sin(endA);
const ix1 = cx + innerR * Math.cos(endA), iy1 = cy + innerR * Math.sin(endA);
const ix2 = cx + innerR * Math.cos(startA), iy2 = cy + innerR * Math.sin(startA);
const large = angle > Math.PI ? 1 : 0;
const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`;
return { ...d, path, pct: (d.value / total) * 100 };
});

return (
<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
{slices.map((s, i) => (
<path key={i} d={s.path} fill={s.color} opacity={0.9}
style={{ transition:"opacity 0.2s" }}>
<title>{s.label}: {Math.round(s.pct)}%</title>
</path>
))}
<circle cx={cx} cy={cy} r={innerR - 2} fill={C.s1}/>
</svg>
);
}

// ─── SVG BAR CHART (évolution épargne) ──────────────────────────
function BarChart({ data, color = C.pos, h = 120 }) {
if (!data.length) return <div style={{ height:h, display:"flex", alignItems:"center",
justifyContent:"center" }}><span style={{ color:C.label, fontSize:12 }}>Pas encore de données</span></div>;
const vals = data.map(d => d.value);
const maxV = Math.max(...vals, 1);
const barW = Math.min(28, Math.floor((320 - data.length * 4) / data.length));

return (
<svg viewBox={`0 0 ${Math.max(data.length * (barW + 8), 100)} ${h + 28}`}
style={{ width:"100%", height:h + 28, overflow:"visible" }}>
{data.map((d, i) => {
const bh = Math.max((d.value / maxV) * h, 2);
const x = i * (barW + 8);
const y = h - bh;
const col = d.value < 0 ? C.neg : color;
return (
<g key={i}>
<rect x={x} y={y} width={barW} height={bh} rx={4} fill={col} opacity={0.85}
style={{ transition:"height 0.5s cubic-bezier(.4,0,.2,1)" }}/>
<text x={x + barW/2} y={h + 18} textAnchor="middle"
fill={C.label} fontSize={9} fontFamily="Inter,sans-serif">{d.label}</text>
</g>
);
})}
</svg>
);
}

// ─── SPLASH ─────────────────────────────────────────────────────
function Splash({ onStart }) {
return (
<div style={{ minHeight:"100dvh", background:C.bg, display:"flex", flexDirection:"column",
alignItems:"center", justifyContent:"center", padding:"0 28px", fontFamily:"Inter,sans-serif",
position:"relative", overflow:"hidden" }}>
<div style={{ position:"absolute", top:"15%", left:"50%", transform:"translateX(-50%)",
width:300, height:300, borderRadius:"50%",
background:"radial-gradient(circle, #1a4d2840 0%, transparent 65%)",
filter:"blur(40px)", pointerEvents:"none" }}/>
<div style={{ maxWidth:340, width:"100%", textAlign:"center", position:"relative", zIndex:1 }}>
<div style={{ width:88, height:88, margin:"0 auto 28px", borderRadius:24,
border:`1px solid ${C.border}`, background:`linear-gradient(135deg,${C.s2},${C.s1})`,
display:"flex", alignItems:"center", justifyContent:"center",
boxShadow:`0 0 48px #1a4d2840` }}>
<img src="/logo-kacorp.png" alt="KACORP"
style={{ width:64, height:64, objectFit:"contain", borderRadius:12 }}
onError={e => { e.target.style.display="none"; e.target.parentNode.innerHTML='<span style="font-size:36px">💼</span>'; }}/>
</div>
<div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.4em", color:C.gold, marginBottom:6 }}>KACORP</div>
<div style={{ fontSize:46, fontWeight:800, color:C.text, letterSpacing:"-0.03em", lineHeight:1, marginBottom:8 }}>BUDGET</div>
<div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.2em", color:C.label, marginBottom:28 }}>V3</div>
<div style={{ width:36, height:1.5, background:C.gold, margin:"0 auto 28px", opacity:0.5 }}/>
<p style={{ fontSize:15, lineHeight:1.8, color:C.label, marginBottom:44, fontWeight:400 }}>
Maîtrisez vos finances.<br/>Visualisez vos dépenses.<br/>Avancez avec clarté.
</p>
<GoldBtn onClick={onStart}>Commencer →</GoldBtn>
<p style={{ fontSize:11, color:C.muted, letterSpacing:"0.06em", marginTop:20 }}>
Données stockées localement · Aucune donnée transmise
</p>
</div>
</div>
);
}

// ─── NAV ────────────────────────────────────────────────────────
const NAV = [
{ id:"dashboard", label:"Dashboard", icon:"◈" },
{ id:"depenses", label:"Dépenses", icon:"◉" },
{ id:"objectifs", label:"Objectifs", icon:"◆" },
{ id:"stats", label:"Stats", icon:"▲" },
{ id:"settings", label:"Réglages", icon:"⚙" },
];

// ═══════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════
export default function KaCorpBudget() {
const raw = load();
const [state, setState] = useState(() => {
const base = { ...DEFAULT_STATE };
if (raw) {
base.income = raw.income ?? "";
base.categories = raw.categories ?? DEFAULT_CATS;
base.expenses = raw.expenses ?? {};
base.goals = raw.goals ?? [];
base.history = raw.history ?? [];
base.settings = { ...DEFAULT_STATE.settings, ...(raw.settings ?? {}) };
base.started = raw.started ?? false;
}
return base;
});

const [tab, setTab] = useState("dashboard");
const [toast, setToast] = useState(null);

const cur = state.settings.currency || "EUR";
const sym = CURRENCY_SYMBOLS[cur] || "€";

const set = useCallback((patch) => setState(prev => ({ ...prev, ...patch })), []);

useEffect(() => { if (state.started) save(state); }, [state]);

const showToast = (msg, type = "ok") => {
setToast({ msg, type });
setTimeout(() => setToast(null), 2600);
};

const handleReset = () => {
if (!confirm("Réinitialiser toutes les données KACORP BUDGET V3 ?")) return;
localStorage.removeItem(STORAGE_KEY);
setState({ ...DEFAULT_STATE, started: true });
setTab("dashboard");
showToast("Réinitialisé", "warn");
};

// ── Calculs globaux ──
const inc = parseAmt(state.income);
const totalExp = state.categories.reduce((s, c) => s + parseAmt(state.expenses[c.id]), 0);
const balance = inc - totalExp;
const saveRate = inc > 0 ? (balance / inc) * 100 : 0;
const isOver = balance < 0;

// ── Snapshot mensuel (appelé manuellement dans Settings) ──
const saveMonthSnapshot = () => {
const month = currentMonth();
const existing = state.history.filter(h => h.month !== month);
const snap = { month, income: inc, expenses: { ...state.expenses } };
set({ history: [...existing, snap].slice(-24) });
showToast("Mois archivé ✓");
};

if (!state.started) return <Splash onStart={() => set({ started: true })} />;

const toastColor = toast?.type === "warn" ? C.warn : toast?.type === "err" ? C.neg : C.pos;

return (
<div style={{ minHeight:"100dvh", background:C.bg, fontFamily:"Inter,'Helvetica Neue',sans-serif",
color:C.text, maxWidth:480, margin:"0 auto", display:"flex", flexDirection:"column",
position:"relative" }}>

{/* Ambient glow */}
<div style={{ position:"fixed", top:0, left:"50%", transform:"translateX(-50%)",
width:320, height:220, pointerEvents:"none", zIndex:0,
background:"radial-gradient(ellipse, #1a4d2830 0%, transparent 70%)",
filter:"blur(32px)" }}/>

{/* HEADER */}
<header style={{ position:"sticky", top:0, zIndex:50,
background:`${C.bg}EE`, backdropFilter:"blur(16px)",
borderBottom:`1px solid ${C.border}`,
padding:"13px 18px", display:"flex", alignItems:"center",
justifyContent:"space-between" }}>
<div style={{ display:"flex", alignItems:"center", gap:10 }}>
<img src="/logo-kacorp.png" alt="" style={{ width:28, height:28,
objectFit:"contain", borderRadius:8, background:C.s2 }}
onError={e => e.target.style.display="none"}/>
<div>
<div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.3em", color:C.gold, lineHeight:1 }}>KACORP</div>
<div style={{ fontSize:13, fontWeight:700, color:C.text, letterSpacing:"0.1em" }}>BUDGET V3</div>
</div>
</div>
{state.settings.name && (
<div style={{ fontSize:12, color:C.label, fontWeight:500 }}>
Bonjour, {state.settings.name} 👋
</div>
)}
</header>

{/* CONTENT */}
<div style={{ flex:1, overflowY:"auto", position:"relative", zIndex:1, paddingBottom:84 }}>
{tab === "dashboard" && <Dashboard state={state} set={set} inc={inc}
totalExp={totalExp} balance={balance} saveRate={saveRate} isOver={isOver}
cur={cur} sym={sym} fmt={(n) => fmt(n, cur)} />}
{tab === "depenses" && <Depenses state={state} set={set} inc={inc}
totalExp={totalExp} cur={cur} fmt={(n) => fmt(n, cur)} showToast={showToast} />}
{tab === "objectifs" && <Objectifs state={state} set={set} cur={cur}
fmt={(n) => fmt(n, cur)} showToast={showToast} />}
{tab === "stats" && <Stats state={state} inc={inc} totalExp={totalExp}
balance={balance} saveRate={saveRate} cur={cur}
fmt={(n) => fmt(n, cur)} showToast={showToast} />}
{tab === "settings" && <Settings state={state} set={set} cur={cur}
showToast={showToast} handleReset={handleReset}
saveMonthSnapshot={saveMonthSnapshot} />}
</div>

{/* BOTTOM NAV */}
<nav style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
width:"100%", maxWidth:480, background:`${C.bg}F5`, backdropFilter:"blur(20px)",
borderTop:`1px solid ${C.border}`, display:"flex", zIndex:50,
paddingBottom:"env(safe-area-inset-bottom,8px)" }}>
{NAV.map(t => (
<button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:"10px 0 8px",
border:"none", background:"transparent", cursor:"pointer",
fontFamily:"inherit", display:"flex", flexDirection:"column",
alignItems:"center", gap:3 }}>
<span style={{ fontSize:16, opacity: tab === t.id ? 1 : 0.3,
transition:"opacity 0.2s" }}>{t.icon}</span>
<span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.04em",
color: tab === t.id ? C.gold : C.muted,
transition:"color 0.2s" }}>{t.label}</span>
{tab === t.id && <div style={{ width:16, height:1.5, background:C.gold, borderRadius:99 }}/>}
</button>
))}
</nav>

{/* TOAST */}
{toast && (
<div style={{ position:"fixed", top:18, left:"50%", transform:"translateX(-50%)",
zIndex:999, padding:"11px 22px", borderRadius:50, fontSize:13, fontWeight:700,
letterSpacing:"0.03em", whiteSpace:"nowrap",
boxShadow:"0 8px 32px rgba(0,0,0,.5)",
background:toastColor, color:"#080E0A",
animation:"toastIn 0.3s ease" }}>
{toast.msg}
</div>
)}

<style>{`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
input[type=number] { -moz-appearance:textfield; }
::-webkit-scrollbar { width:0; }
input, button, textarea, select { font-family:inherit; }
@keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(-8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
@keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
.screen { animation: fadeUp 0.28s cubic-bezier(.4,0,.2,1) both; }
`}</style>
</div>
);
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function Dashboard({ state, set, inc, totalExp, balance, saveRate, isOver, cur, fmt }) {
const [editIncome, setEditIncome] = useState(false);
const inputRef = useRef();
useEffect(() => { if (editIncome) setTimeout(() => inputRef.current?.focus(), 100); }, [editIncome]);

const badgeLabel = saveRate >= 20 ? "EXCELLENT" : saveRate >= 10 ? "BON" : saveRate > 0 ? "À AMÉLIORER" : "DÉFICIT";
const badgeColor = saveRate >= 20 ? C.pos : saveRate >= 10 ? "#34D399" : saveRate > 0 ? C.warn : C.neg;

const topCats = [...state.categories]
.map(c => ({ ...c, val: parseAmt(state.expenses[c.id]) }))
.filter(c => c.val > 0)
.sort((a,b) => b.val - a.val)
.slice(0, 4);

return (
<div className="screen" style={{ padding:"18px 14px", display:"flex", flexDirection:"column", gap:12 }}>

{/* Revenu */}
<Card>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
<Label>REVENU MENSUEL NET</Label>
<GhostBtn onClick={() => setEditIncome(v => !v)}>{editIncome ? "✓ Valider" : "Modifier"}</GhostBtn>
</div>
{editIncome ? (
<div style={{ display:"flex", alignItems:"center", gap:6 }}>
<span style={{ fontSize:26, color:C.gold, fontWeight:700 }}>€</span>
<input ref={inputRef} type="number" inputMode="decimal"
value={state.income} placeholder="0"
onChange={e => set({ income: e.target.value })}
onBlur={() => setEditIncome(false)}
style={{ background:"transparent", border:"none", outline:"none",
color:C.text, fontSize:40, fontWeight:800, width:"100%",
fontVariantNumeric:"tabular-nums" }}/>
</div>
) : (
<div onClick={() => setEditIncome(true)} style={{ cursor:"pointer" }}>
<div style={{ fontSize:44, fontWeight:800, color:C.text,
fontVariantNumeric:"tabular-nums", letterSpacing:"-0.025em", lineHeight:1 }}>
{fmt(inc)}
</div>
<div style={{ fontSize:11, color:C.label, marginTop:4 }}>Appuyer pour modifier</div>
</div>
)}
</Card>

{/* KPI 2×2 */}
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
{/* Solde */}
<Card style={{ display:"flex", flexDirection:"column", gap:8 }}>
<Label>{isOver ? "DÉPASSEMENT" : "SOLDE DISPO"}</Label>
<div style={{ fontSize:24, fontWeight:800, fontVariantNumeric:"tabular-nums",
letterSpacing:"-0.02em", color: isOver ? C.neg : C.pos }}>
{isOver ? "−" : "+"}{fmt(Math.abs(balance))}
</div>
<Bar value={isOver ? totalExp : balance} max={Math.max(inc, 1)} color={isOver ? C.neg : C.pos} />
<div style={{ fontSize:10, color:C.label }}>{inc > 0 ? fmtPct(Math.abs((balance/inc)*100)) + " du revenu" : "—"}</div>
</Card>

{/* Taux épargne */}
<Card style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
<Label>TAUX D'ÉPARGNE</Label>
<Ring value={Math.max(saveRate, 0)} max={100} color={badgeColor} size={78} sw={6}>
<span style={{ fontSize:15, fontWeight:800, color:badgeColor }}>{fmtPct(Math.max(saveRate,0))}</span>
</Ring>
<Chip label={badgeLabel} color={badgeColor}/>
</Card>

{/* Dépenses */}
<Card style={{ display:"flex", flexDirection:"column", gap:8 }}>
<Label>DÉPENSES TOTALES</Label>
<div style={{ fontSize:24, fontWeight:800, color:C.text, fontVariantNumeric:"tabular-nums", letterSpacing:"-0.02em" }}>
{fmt(totalExp)}
</div>
<div style={{ fontSize:10, color:C.label }}>
{inc > 0 ? fmtPct((totalExp/inc)*100) + " du revenu" : "—"}
</div>
</Card>

{/* Objectifs */}
<Card style={{ display:"flex", flexDirection:"column", gap:8 }}>
<Label>OBJECTIFS</Label>
<div style={{ fontSize:24, fontWeight:800, color:C.gold }}>{state.goals.length}</div>
<div style={{ fontSize:10, color:C.label }}>
{state.goals.filter(g => parseAmt(g.current) >= parseAmt(g.target)).length} atteint(s)
</div>
</Card>
</div>

{/* Top dépenses */}
{topCats.length > 0 && (
<Card>
<Label style={{ marginBottom:14 }}>TOP DÉPENSES DU MOIS</Label>
<div style={{ display:"flex", flexDirection:"column", gap:11 }}>
{topCats.map(cat => (
<div key={cat.id}>
<div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
<span style={{ fontSize:13, color:C.label }}>{cat.icon} {cat.label}</span>
<span style={{ fontSize:13, fontWeight:700, color:cat.color,
fontVariantNumeric:"tabular-nums" }}>{fmt(cat.val)}</span>
</div>
<Bar value={cat.val} max={totalExp} color={cat.color} />
</div>
))}
</div>
</Card>
)}

{/* Conseil */}
{inc > 0 && (
<Card style={{ background:C.s2, borderColor:C.border }}>
<Label style={{ marginBottom:10 }}>ANALYSE RAPIDE</Label>
<p style={{ fontSize:13, color:C.label, lineHeight:1.7 }}>
{saveRate >= 20
? `✅ Excellent ! Vous épargnez ${fmtPct(saveRate)} de votre revenu. Pensez à investir le surplus dans vos objectifs.`
: saveRate >= 10
? `👍 Bien. ${fmtPct(saveRate)} d'épargne. Pour atteindre 20%, réduisez vos dépenses de ${fmt((0.2*inc)-balance)}.`
: saveRate > 0
? `⚠️ Taux faible (${fmtPct(saveRate)}). Identifiez vos postes à réduire dans l'onglet Dépenses.`
: `🔴 Budget dépassé de ${fmt(Math.abs(balance))}. Action immédiate requise.`}
</p>
</Card>
)}
</div>
);
}

// ═══════════════════════════════════════════════════════════════
// DÉPENSES
// ═══════════════════════════════════════════════════════════════
function Depenses({ state, set, inc, totalExp, fmt, showToast }) {
const [editId, setEditId] = useState(null);
const [showAdd, setShowAdd] = useState(false);
const [newCat, setNewCat] = useState({ label:"", icon:"📦", color:COLORS[0] });

const updateExp = (id, v) => set({ expenses: { ...state.expenses, [id]: v } });
const updateCat = (id, patch) => set({ categories: state.categories.map(c => c.id === id ? { ...c, ...patch } : c) });
const deleteCat = (id) => {
const { [id]:_, ...rest } = state.expenses;
set({ categories: state.categories.filter(c => c.id !== id), expenses: rest });
setEditId(null);
showToast("Catégorie supprimée", "warn");
};
const addCat = () => {
if (!newCat.label.trim()) { showToast("Nom requis", "err"); return; }
set({ categories: [...state.categories, { id: uid(), ...newCat, budget: 0 }] });
setNewCat({ label:"", icon:"📦", color:COLORS[0] });
setShowAdd(false);
showToast("Catégorie ajoutée ✓");
};

// Donut data
const donutData = state.categories
.map(c => ({ label: c.label, value: parseAmt(state.expenses[c.id]), color: c.color }))
.filter(d => d.value > 0);

return (
<div className="screen" style={{ padding:"18px 14px", display:"flex", flexDirection:"column", gap:12 }}>

{/* Synthèse */}
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
<Card style={{ textAlign:"center" }}>
<Label style={{ marginBottom:6 }}>TOTAL DÉPENSÉ</Label>
<div style={{ fontSize:22, fontWeight:800, color:C.text }}>{fmt(totalExp)}</div>
</Card>
<Card style={{ textAlign:"center" }}>
<Label style={{ marginBottom:6 }}>RESTANT</Label>
<div style={{ fontSize:22, fontWeight:800, color: balance >= 0 ? C.pos : C.neg }}>
{fmt(Math.max(inc - totalExp, 0))}
</div>
</Card>
</div>

{/* Donut */}
{donutData.length > 0 && (
<Card>
<Label style={{ marginBottom:14 }}>RÉPARTITION DES DÉPENSES</Label>
<div style={{ display:"flex", gap:16, alignItems:"center" }}>
<DonutChart data={donutData} size={140}/>
<div style={{ flex:1, display:"flex", flexDirection:"column", gap:7 }}>
{donutData.slice(0,5).map((d,i) => (
<div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
<div style={{ width:8, height:8, borderRadius:2, background:d.color, flexShrink:0 }}/>
<span style={{ fontSize:11, color:C.label, flex:1, overflow:"hidden",
textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.label}</span>
<span style={{ fontSize:11, fontWeight:700, color:d.color,
fontVariantNumeric:"tabular-nums" }}>
{totalExp > 0 ? fmtPct((d.value/totalExp)*100) : "—"}
</span>
</div>
))}
</div>
</div>
</Card>
)}

{/* Catégories */}
{state.categories.map(cat => {
const val = parseAmt(state.expenses[cat.id]);
const hasBudget = cat.budget > 0;
const over = hasBudget && val > cat.budget;
const isEd = editId === cat.id;
return (
<Card key={cat.id} style={{ borderColor: isEd ? `${cat.color}60` : C.border }}>
<div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
<span style={{ fontSize:22 }}>{cat.icon}</span>
<span style={{ flex:1, fontSize:14, fontWeight:700 }}>{cat.label}</span>
{over && !isEd && <Chip label="DÉPASSÉ" color={C.neg}/>}
<GhostBtn onClick={() => setEditId(isEd ? null : cat.id)}>{isEd ? "✓" : "✏️"}</GhostBtn>
</div>

<Bar value={val} max={hasBudget ? cat.budget : Math.max(totalExp, val, 1)} color={over ? C.neg : cat.color} />
<div style={{ display:"flex", justifyContent:"space-between", marginTop:5, marginBottom:12 }}>
<span style={{ fontSize:10, color:C.label }}>
{inc > 0 ? fmtPct((val/inc)*100) + " du revenu" : ""}
</span>
{hasBudget && <span style={{ fontSize:10, color: over ? C.neg : C.label }}>Limite : {fmt(cat.budget)}</span>}
</div>

<div style={{ display:"flex", alignItems:"center", gap:6 }}>
<span style={{ fontSize:16, color:C.gold, fontWeight:700 }}>€</span>
<input type="number" inputMode="decimal"
value={state.expenses[cat.id] || ""}
onChange={e => updateExp(cat.id, e.target.value)}
placeholder="0"
style={{ background:"transparent", border:"none",
borderBottom:`1px solid ${C.border}`, outline:"none",
color: val > 0 ? cat.color : C.text, fontSize:28, fontWeight:800,
width:"100%", paddingBottom:4, fontVariantNumeric:"tabular-nums" }}/>
</div>

{isEd && (
<div style={{ borderTop:`1px solid ${C.border}`, paddingTop:14, marginTop:14,
display:"flex", flexDirection:"column", gap:12 }}>
<div>
<Label style={{ marginBottom:6 }}>NOM</Label>
<InlineInput value={cat.label} onChange={e => updateCat(cat.id, { label: e.target.value })} placeholder="Nom"/>
</div>
<div>
<Label style={{ marginBottom:6 }}>BUDGET LIMITE (€)</Label>
<InlineInput type="number" value={cat.budget || ""}
onChange={e => updateCat(cat.id, { budget: parseAmt(e.target.value) })}
placeholder="Pas de limite"/>
</div>
<div>
<Label style={{ marginBottom:8 }}>ICÔNE</Label>
<div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
{ICONS.map(ic => (
<button key={ic} onClick={() => updateCat(cat.id, { icon: ic })}
style={{ fontSize:18, background: cat.icon===ic ? C.s2 : "transparent",
border:`1px solid ${cat.icon===ic ? C.gold : C.border}`,
borderRadius:8, padding:"4px 6px", cursor:"pointer" }}>{ic}</button>
))}
</div>
</div>
<div>
<Label style={{ marginBottom:8 }}>COULEUR</Label>
<div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
{COLORS.map(col => (
<button key={col} onClick={() => updateCat(cat.id, { color: col })}
style={{ width:26, height:26, borderRadius:"50%", background:col,
border:`3px solid ${cat.color===col ? C.text : "transparent"}`, cursor:"pointer" }}/>
))}
</div>
</div>
<button onClick={() => deleteCat(cat.id)}
style={{ padding:"10px", borderRadius:12, border:`1px solid ${C.neg}30`,
background:`${C.neg}10`, color:C.neg, fontSize:13, fontWeight:700,
cursor:"pointer", fontFamily:"inherit" }}>
Supprimer cette catégorie
</button>
</div>
)}
</Card>
);
})}

{/* Ajouter */}
{showAdd ? (
<Card>
<Label style={{ marginBottom:12 }}>NOUVELLE CATÉGORIE</Label>
<InlineInput value={newCat.label} onChange={e => setNewCat(n => ({ ...n, label: e.target.value }))}
placeholder="Nom (ex : Streaming)" style={{ marginBottom:12 }}/>
<Label style={{ marginBottom:8 }}>ICÔNE</Label>
<div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
{ICONS.map(ic => (
<button key={ic} onClick={() => setNewCat(n => ({ ...n, icon: ic }))}
style={{ fontSize:18, background: newCat.icon===ic ? C.s2 : "transparent",
border:`1px solid ${newCat.icon===ic ? C.gold : C.border}`,
borderRadius:8, padding:"4px 6px", cursor:"pointer" }}>{ic}</button>
))}
</div>
<Label style={{ marginBottom:8 }}>COULEUR</Label>
<div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
{COLORS.map(col => (
<button key={col} onClick={() => setNewCat(n => ({ ...n, color: col }))}
style={{ width:26, height:26, borderRadius:"50%", background:col,
border:`3px solid ${newCat.color===col ? C.text : "transparent"}`, cursor:"pointer" }}/>
))}
</div>
<div style={{ display:"flex", gap:10 }}>
<GoldBtn onClick={addCat} style={{ flex:1 }}>Ajouter</GoldBtn>
<GhostBtn onClick={() => setShowAdd(false)} style={{ flex:1, padding:"12px 0" }}>Annuler</GhostBtn>
</div>
</Card>
) : (
<button onClick={() => setShowAdd(true)}
style={{ padding:"14px", borderRadius:16, border:`1px dashed ${C.muted}`,
background:"transparent", color:C.label, fontSize:14, fontWeight:600,
cursor:"pointer", fontFamily:"inherit", width:"100%" }}>
+ Ajouter une catégorie
</button>
)}
</div>
);
}

// ═══════════════════════════════════════════════════════════════
// OBJECTIFS
// ═══════════════════════════════════════════════════════════════
function Objectifs({ state, set, fmt, showToast }) {
const [showAdd, setShowAdd] = useState(false);
const [editId, setEditId] = useState(null);
const [ng, setNg] = useState({ name:"", target:"", current:"", icon:"🎯", color:C.gold, deadline:"" });

const addGoal = () => {
if (!ng.name.trim()) { showToast("Nom requis", "err"); return; }
if (!ng.target || parseAmt(ng.target) <= 0) { showToast("Montant cible requis", "err"); return; }
set({ goals: [...state.goals, { id: uid(), ...ng, current: ng.current || "0" }] });
setNg({ name:"", target:"", current:"", icon:"🎯", color:C.gold, deadline:"" });
setShowAdd(false);
showToast("Objectif créé ✓");
};

const updGoal = (id, patch) => set({ goals: state.goals.map(g => g.id === id ? { ...g, ...patch } : g) });
const delGoal = (id) => { set({ goals: state.goals.filter(g => g.id !== id) }); setEditId(null); showToast("Objectif supprimé","warn"); };

const totalSaved = state.goals.reduce((s, g) => s + parseAmt(g.current), 0);
const totalTarget = state.goals.reduce((s, g) => s + parseAmt(g.target), 0);

const GoalForm = ({ data, onChange, onSubmit, onCancel, label }) => (
<Card>
<Label style={{ marginBottom:12 }}>{label}</Label>
<InlineInput value={data.name} onChange={e => onChange({ name: e.target.value })}
placeholder="Ex : Voyage Japon, Fonds d'urgence…" style={{ marginBottom:10 }}/>
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
<div>
<Label style={{ marginBottom:6 }}>CIBLE (€)</Label>
<InlineInput type="number" value={data.target}
onChange={e => onChange({ target: e.target.value })} placeholder="5 000"/>
</div>
<div>
<Label style={{ marginBottom:6 }}>ÉPARGNÉ (€)</Label>
<InlineInput type="number" value={data.current}
onChange={e => onChange({ current: e.target.value })} placeholder="0"/>
</div>
</div>
<div style={{ marginBottom:10 }}>
<Label style={{ marginBottom:6 }}>ÉCHÉANCE (optionnel)</Label>
<InlineInput type="date" value={data.deadline || ""}
onChange={e => onChange({ deadline: e.target.value })}
style={{ color: data.deadline ? C.text : C.label }}/>
</div>
<Label style={{ marginBottom:8 }}>ICÔNE</Label>
<div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
{GOAL_ICONS.map(ic => (
<button key={ic} onClick={() => onChange({ icon: ic })}
style={{ fontSize:18, background: data.icon===ic ? C.s2 : "transparent",
border:`1px solid ${data.icon===ic ? C.gold : C.border}`,
borderRadius:8, padding:"4px 6px", cursor:"pointer" }}>{ic}</button>
))}
</div>
<Label style={{ marginBottom:8 }}>COULEUR</Label>
<div style={{ display:"flex", gap:8, marginBottom:16 }}>
{COLORS.map(col => (
<button key={col} onClick={() => onChange({ color: col })}
style={{ width:26, height:26, borderRadius:"50%", background:col,
border:`3px solid ${data.color===col ? C.text : "transparent"}`, cursor:"pointer" }}/>
))}
</div>
<div style={{ display:"flex", gap:10 }}>
<GoldBtn onClick={onSubmit} style={{ flex:1 }}>{label.includes("NOUVEL") ? "Créer" : "Enregistrer"}</GoldBtn>
<GhostBtn onClick={onCancel} style={{ flex:1, padding:"12px 0" }}>Annuler</GhostBtn>
</div>
</Card>
);

return (
<div className="screen" style={{ padding:"18px 14px", display:"flex", flexDirection:"column", gap:12 }}>

{state.goals.length > 0 && (
<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
<Card style={{ textAlign:"center" }}>
<Label style={{ marginBottom:6 }}>TOTAL ÉPARGNÉ</Label>
<div style={{ fontSize:20, fontWeight:800, color:C.pos }}>{fmt(totalSaved)}</div>
</Card>
<Card style={{ textAlign:"center" }}>
<Label style={{ marginBottom:6 }}>TOTAL CIBLÉ</Label>
<div style={{ fontSize:20, fontWeight:800, color:C.gold }}>{fmt(totalTarget)}</div>
</Card>
</div>
)}

{state.goals.length === 0 && !showAdd && (
<Card style={{ textAlign:"center", padding:"40px 20px" }}>
<div style={{ fontSize:40, marginBottom:14 }}>🎯</div>
<div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:8 }}>Aucun objectif</div>
<div style={{ fontSize:13, color:C.label, lineHeight:1.6 }}>
Définissez vos projets financiers :<br/>voyage, achat, épargne d'urgence…
</div>
</Card>
)}

{state.goals.map(goal => {
const cur = parseAmt(goal.current);
const tar = parseAmt(goal.target) || 1;
const pct = clamp((cur / tar) * 100, 0, 100);
const done = cur >= tar;
const isEd = editId === goal.id;
const rem = Math.max(tar - cur, 0);
const daysLeft = goal.deadline
? Math.ceil((new Date(goal.deadline) - new Date()) / 86400000)
: null;

if (isEd) return (
<GoalForm key={goal.id}
data={goal}
onChange={patch => updGoal(goal.id, patch)}
onSubmit={() => setEditId(null)}
onCancel={() => setEditId(null)}
label="MODIFIER L'OBJECTIF"/>
);

return (
<Card key={goal.id}
style={{ borderColor: done ? `${goal.color}60` : C.border,
background: done ? `${goal.color}06` : C.s1 }}>
<div style={{ display:"flex", gap:12, marginBottom:14, alignItems:"flex-start" }}>
<div style={{ width:44, height:44, borderRadius:12, flexShrink:0, fontSize:22,
background:`${goal.color}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
{goal.icon}
</div>
<div style={{ flex:1, minWidth:0 }}>
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
<div style={{ fontSize:15, fontWeight:700, color:C.text, overflow:"hidden",
textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"65%" }}>{goal.name}</div>
{done ? <Chip label="ATTEINT ✓" color={goal.color}/> :
daysLeft !== null && <Chip label={daysLeft >= 0 ? `${daysLeft}j` : "EXPIRÉ"} color={daysLeft >= 0 ? C.warn : C.neg}/>}
</div>
<div style={{ fontSize:11, color:C.label, marginTop:2 }}>Objectif : {fmt(tar)}</div>
</div>
<GhostBtn onClick={() => setEditId(goal.id)}>✏️</GhostBtn>
</div>

<div style={{ display:"flex", gap:14, alignItems:"center", marginBottom:14 }}>
<Ring value={cur} max={tar} color={goal.color} size={70} sw={5}>
<span style={{ fontSize:12, fontWeight:800, color:goal.color }}>{Math.round(pct)}%</span>
</Ring>
<div style={{ flex:1 }}>
<div style={{ fontSize:26, fontWeight:800, color:goal.color,
fontVariantNumeric:"tabular-nums", marginBottom:2 }}>{fmt(cur)}</div>
{done
? <div style={{ fontSize:12, color:goal.color, fontWeight:600 }}>🎉 Félicitations !</div>
: <div style={{ fontSize:11, color:C.label }}>Encore {fmt(rem)} à atteindre</div>}
</div>
</div>

<Bar value={cur} max={tar} color={goal.color} h={7}/>

<button onClick={() => delGoal(goal.id)}
style={{ marginTop:12, padding:"8px", width:"100%", borderRadius:10,
border:`1px solid ${C.neg}25`, background:`${C.neg}08`, color:C.neg,
fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
Supprimer
</button>
</Card>
);
})}

{showAdd
? <GoalForm data={ng} onChange={patch => setNg(p => ({ ...p, ...patch }))}
onSubmit={addGoal} onCancel={() => setShowAdd(false)} label="NOUVEL OBJECTIF"/>
: <button onClick={() => setShowAdd(true)}
style={{ padding:"14px", borderRadius:16, border:`1px dashed ${C.muted}`,
background:"transparent", color:C.label, fontSize:14, fontWeight:600,
cursor:"pointer", fontFamily:"inherit", width:"100%" }}>
+ Nouvel objectif financier
</button>
}
</div>
);
}

// ═══════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════
function Stats({ state, inc, totalExp, balance, saveRate, fmt, showToast }) {

// Données évolution épargne (historique)
const histData = [...state.history]
.sort((a, b) => a.month.localeCompare(b.month))
.slice(-6)
.map(h => {
const exp = Object.values(h.expenses || {}).reduce((s, v) => s + parseAmt(v), 0);
const bal = (parseAmt(h.income)) - exp;
const [y, m] = h.month.split("-");
return { label: MONTHS[parseInt(m) - 1], value: bal };
});

// Ajouter mois courant
histData.push({ label: MONTHS[new Date().getMonth()] + "*", value: balance });

// Stats mensuelles actuelles
const monthStats = state.categories.map(c => ({
...c, val: parseAmt(state.expenses[c.id])
})).filter(c => c.val > 0).sort((a, b) => b.val - a.val);

// Plus grosse dépense
const biggest = monthStats[0];

// Répartition vs revenu
const essentialIds = ["housing", "food", "health", "transport"];
const essential = state.categories
.filter(c => essentialIds.includes(c.id))
.reduce((s, c) => s + parseAmt(state.expenses[c.id]), 0);
const discretionary = totalExp - essential;

return (
<div className="screen" style={{ padding:"18px 14px", display:"flex", flexDirection:"column", gap:12 }}>

{/* Résumé du mois */}
<Card>
<Label style={{ marginBottom:12 }}>RÉSUMÉ DU MOIS EN COURS</Label>
<div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8 }}>
{[
{ label:"Revenus", val: fmt(inc), color: C.pos },
{ label:"Dépenses", val: fmt(totalExp), color: C.neg },
{ label:"Solde", val: fmt(balance), color: balance >= 0 ? C.pos : C.neg },
].map(({ label, val, color }) => (
<div key={label} style={{ textAlign:"center", padding:"10px 4px",
background:C.s2, borderRadius:12, border:`1px solid ${C.border}` }}>
<div style={{ fontSize:10, color:C.label, marginBottom:4, letterSpacing:"0.08em" }}>{label.toUpperCase()}</div>
<div style={{ fontSize:14, fontWeight:800, color, fontVariantNumeric:"tabular-nums" }}>{val}</div>
</div>
))}
</div>
</Card>

{/* Graphique donut */}
{monthStats.length > 0 && (
<Card>
<Label style={{ marginBottom:14 }}>GRAPHIQUE DE RÉPARTITION</Label>
<div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
<DonutChart data={monthStats.map(c => ({ label:c.label, value:c.val, color:c.color }))} size={180}/>
</div>
<div style={{ display:"flex", flexDirection:"column", gap:8 }}>
{monthStats.map(c => (
<div key={c.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
<div style={{ width:8, height:8, borderRadius:2, background:c.color, flexShrink:0 }}/>
<span style={{ flex:1, fontSize:12, color:C.label }}>{c.icon} {c.label}</span>
<span style={{ fontSize:12, fontWeight:700, color:c.color,
fontVariantNumeric:"tabular-nums" }}>
{fmt(c.val)} · {totalExp > 0 ? fmtPct((c.val/totalExp)*100) : "—"}
</span>
</div>
))}
</div>
</Card>
)}

{/* Évolution épargne */}
<Card>
<Label style={{ marginBottom:14 }}>ÉVOLUTION DU SOLDE (6 mois)</Label>
<BarChart data={histData} color={C.pos} h={100}/>
<div style={{ fontSize:10, color:C.muted, marginTop:6 }}>* Mois en cours</div>
</Card>

{/* Stats détaillées */}
<Card>
<Label style={{ marginBottom:14 }}>STATISTIQUES DU MOIS</Label>
<div style={{ display:"flex", flexDirection:"column", gap:10 }}>
<StatRow label="Taux d'épargne" value={fmtPct(Math.max(saveRate, 0))}
color={saveRate >= 20 ? C.pos : saveRate >= 10 ? C.warn : C.neg}/>
<StatRow label="Part dépenses / revenu"
value={inc > 0 ? fmtPct((totalExp/inc)*100) : "—"} color={C.label}/>
<StatRow label="Dépenses essentielles"
value={fmt(essential)} color={C.blue}/>
<StatRow label="Dépenses non-essentielles"
value={fmt(discretionary)} color={C.purple}/>
{biggest && (
<StatRow label={`Poste le + élevé (${biggest.label})`}
value={fmt(biggest.val)} color={biggest.color}/>
)}
<StatRow label="Objectifs actifs" value={`${state.goals.length}`} color={C.gold}/>
<StatRow label="Objectifs atteints"
value={`${state.goals.filter(g => parseAmt(g.current) >= parseAmt(g.target)).length}`}
color={C.pos}/>
</div>
</Card>

{/* Historique mensuel */}
{state.history.length > 0 && (
<Card>
<Label style={{ marginBottom:14 }}>HISTORIQUE MENSUEL ARCHIVÉ</Label>
<div style={{ display:"flex", flexDirection:"column", gap:0 }}>
{[...state.history].sort((a,b) => b.month.localeCompare(a.month)).map((h, i) => {
const exp = Object.values(h.expenses || {}).reduce((s, v) => s + parseAmt(v), 0);
const bal = parseAmt(h.income) - exp;
const [y, m] = h.month.split("-");
return (
<div key={h.month} style={{ display:"flex", alignItems:"center", gap:12,
padding:"11px 0",
borderBottom: i < state.history.length - 1 ? `1px solid ${C.border}` : "none" }}>
<div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
background: bal >= 0 ? `${C.pos}15` : `${C.neg}15`,
display:"flex", alignItems:"center", justifyContent:"center",
fontSize:11, fontWeight:700, color: bal >= 0 ? C.pos : C.neg }}>
{MONTHS[parseInt(m)-1]}
</div>
<div style={{ flex:1 }}>
<div style={{ fontSize:13, fontWeight:600 }}>{MONTH_FULL[parseInt(m)-1]} {y}</div>
<div style={{ fontSize:11, color:C.label }}>{fmt(parseAmt(h.income))} de revenus</div>
</div>
<div style={{ textAlign:"right" }}>
<div style={{ fontSize:14, fontWeight:800,
color: bal >= 0 ? C.pos : C.neg, fontVariantNumeric:"tabular-nums" }}>
{bal >= 0 ? "+" : "−"}{fmt(Math.abs(bal))}
</div>
<div style={{ fontSize:10, color:C.label }}>{fmt(exp)} dépensé</div>
</div>
</div>
);
})}
</div>
</Card>
)}

{/* Export PDF */}
<button onClick={() => exportPDF(state, { inc, totalExp, balance, saveRate, fmt })}
style={{ padding:"15px", borderRadius:16, border:`1px solid ${C.goldDim}`,
background:`${C.gold}10`, color:C.gold, fontSize:14, fontWeight:700,
cursor:"pointer", fontFamily:"inherit", width:"100%",
letterSpacing:"0.04em" }}>
📄 Exporter le rapport PDF
</button>
</div>
);
}

function StatRow({ label, value, color }) {
return (
<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
<span style={{ fontSize:13, color:C.label }}>{label}</span>
<span style={{ fontSize:13, fontWeight:700, color, fontVariantNumeric:"tabular-nums" }}>{value}</span>
</div>
);
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════
function Settings({ state, set, showToast, handleReset, saveMonthSnapshot }) {
const updSettings = (patch) => set({ settings: { ...state.settings, ...patch } });

const exportData = () => {
const blob = new Blob([JSON.stringify(state, null, 2)], { type:"application/json" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url; a.download = `kacorp-budget-${currentMonth()}.json`; a.click();
URL.revokeObjectURL(url);
showToast("Export JSON téléchargé ✓");
};

const importData = (e) => {
const file = e.target.files[0];
if (!file) return;
const reader = new FileReader();
reader.onload = (ev) => {
try {
const data = JSON.parse(ev.target.result);
if (data.categories && data.expenses !== undefined) {
set(data);
showToast("Données importées ✓");
} else { showToast("Fichier invalide","err"); }
} catch { showToast("Erreur de lecture","err"); }
};
reader.readAsText(file);
};

const storageSize = (() => {
try { return (new Blob([localStorage.getItem(STORAGE_KEY) || ""]).size / 1024).toFixed(1) + " Ko"; }
catch { return "—"; }
})();

return (
<div className="screen" style={{ padding:"18px 14px", display:"flex", flexDirection:"column", gap:12 }}>

{/* Profil */}
<Card>
<Label style={{ marginBottom:14 }}>PROFIL</Label>
<div style={{ marginBottom:12 }}>
<Label style={{ marginBottom:6 }}>PRÉNOM (affiché sur le dashboard)</Label>
<InlineInput value={state.settings.name || ""}
onChange={e => updSettings({ name: e.target.value })}
placeholder="Ex : Steeve"/>
</div>
</Card>

{/* Préférences */}
<Card>
<Label style={{ marginBottom:14 }}>PRÉFÉRENCES</Label>

<div style={{ marginBottom:14 }}>
<Label style={{ marginBottom:8 }}>DEVISE</Label>
<div style={{ display:"flex", gap:8 }}>
{Object.entries(CURRENCY_SYMBOLS).map(([code, sym]) => (
<button key={code} onClick={() => updSettings({ currency: code })}
style={{ flex:1, padding:"9px 0", borderRadius:10, fontFamily:"inherit",
fontSize:13, fontWeight:700, cursor:"pointer",
background: state.settings.currency === code ? C.gold : C.s2,
color: state.settings.currency === code ? "#080E0A" : C.label,
border:`1px solid ${state.settings.currency === code ? C.gold : C.border}` }}>
{sym} {code}
</button>
))}
</div>
</div>

<div>
<Label style={{ marginBottom:8 }}>OBJECTIF D'ÉPARGNE MENSUEL</Label>
<div style={{ display:"flex", alignItems:"center", gap:10 }}>
<input type="range" min={5} max={50} step={5}
value={state.settings.savingsGoalPct || 20}
onChange={e => updSettings({ savingsGoalPct: parseInt(e.target.value) })}
style={{ flex:1, accentColor:C.gold }}/>
<span style={{ fontSize:16, fontWeight:800, color:C.gold, minWidth:40, textAlign:"right" }}>
{state.settings.savingsGoalPct || 20}%
</span>
</div>
</div>
</Card>

{/* Historique */}
<Card>
<Label style={{ marginBottom:14 }}>HISTORIQUE MENSUEL</Label>
<p style={{ fontSize:13, color:C.label, lineHeight:1.6, marginBottom:12 }}>
Archivez les données du mois en cours avant de commencer un nouveau mois. L'historique est conservé sur 24 mois.
</p>
<GoldBtn onClick={saveMonthSnapshot}>
Archiver {MONTH_FULL[new Date().getMonth()]} {new Date().getFullYear()}
</GoldBtn>
{state.history.length > 0 && (
<div style={{ marginTop:10, fontSize:12, color:C.label }}>
{state.history.length} mois archivé(s)
</div>
)}
</Card>

{/* Export / Import */}
<Card>
<Label style={{ marginBottom:14 }}>DONNÉES</Label>
<div style={{ fontSize:11, color:C.label, marginBottom:14 }}>
Stockage utilisé : <b style={{ color:C.text }}>{storageSize}</b>
</div>

<div style={{ display:"flex", flexDirection:"column", gap:10 }}>
<GoldBtn onClick={exportData}>📥 Exporter mes données (JSON)</GoldBtn>

<label style={{ padding:"14px", borderRadius:14, border:`1px solid ${C.border}`,
background:C.s2, color:C.label, fontSize:14, fontWeight:700,
cursor:"pointer", textAlign:"center", letterSpacing:"0.04em", display:"block" }}>
📤 Importer des données (JSON)
<input type="file" accept=".json" onChange={importData} style={{ display:"none" }}/>
</label>

<button onClick={() => exportPDF(state, {
inc: parseAmt(state.income),
totalExp: state.categories.reduce((s, c) => s + parseAmt(state.expenses[c.id]), 0),
balance: parseAmt(state.income) - state.categories.reduce((s, c) => s + parseAmt(state.expenses[c.id]), 0),
saveRate: parseAmt(state.income) > 0
? ((parseAmt(state.income) - state.categories.reduce((s, c) => s + parseAmt(state.expenses[c.id]), 0)) / parseAmt(state.income)) * 100
: 0,
fmt: (n) => fmt(n, state.settings.currency),
})}
style={{ padding:"14px", borderRadius:14, border:`1px solid ${C.goldDim}`,
background:`${C.gold}10`, color:C.gold, fontSize:14, fontWeight:700,
cursor:"pointer", fontFamily:"inherit", width:"100%", letterSpacing:"0.04em" }}>
📄 Exporter rapport PDF
</button>
</div>
</Card>

{/* PWA */}
<Card>
<Label style={{ marginBottom:10 }}>INSTALLER L'APPLICATION</Label>
<p style={{ fontSize:13, color:C.label, lineHeight:1.6 }}>
<b style={{ color:C.text }}>iPhone :</b> Safari → Partager → "Sur l'écran d'accueil"<br/>
<b style={{ color:C.text }}>Android :</b> Chrome → ⋮ → "Installer l'application"
</p>
</Card>

{/* Reset */}
<button onClick={handleReset}
style={{ padding:"14px", borderRadius:16, border:`1px solid ${C.neg}40`,
background:`${C.neg}08`, color:C.neg, fontSize:14, fontWeight:700,
cursor:"pointer", fontFamily:"inherit", width:"100%", letterSpacing:"0.04em" }}>
↺ Réinitialiser toutes les données
</button>

<div style={{ textAlign:"center", fontSize:11, color:C.muted, paddingTop:4 }}>
KACORP BUDGET V3 · Données locales uniquement
</div>
</div>
);
}

// ═══════════════════════════════════════════════════════════════
// EXPORT PDF
// ═══════════════════════════════════════════════════════════════
function exportPDF(state, { inc, totalExp, balance, saveRate, fmt }) {
const d = new Date();
const monthLabel = `${MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`;
const cats = state.categories.map(c => ({
...c, val: parseAmt(state.expenses[c.id])
})).filter(c => c.val > 0).sort((a, b) => b.val - a.val);

const goals = state.goals.map(g => ({
...g, cur: parseAmt(g.current), tar: parseAmt(g.target),
pct: parseAmt(g.target) > 0 ? Math.round((parseAmt(g.current) / parseAmt(g.target)) * 100) : 0
}));

const isOver = balance < 0;

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>KACORP BUDGET - Rapport ${monthLabel}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:'Inter',sans-serif; background:#fff; color:#111; padding:40px; font-size:14px; }
.header { display:flex; align-items:center; justify-content:space-between; margin-bottom:32px;
padding-bottom:20px; border-bottom:2px solid #D8B56D; }
.brand { font-size:22px; font-weight:800; color:#080E0A; letter-spacing:-0.02em; }
.brand span { color:#D8B56D; }
.date { font-size:12px; color:#888; letter-spacing:0.1em; }
.section { margin-bottom:28px; }
.section-title { font-size:10px; font-weight:700; letter-spacing:0.2em; color:#888;
text-transform:uppercase; margin-bottom:14px; padding-bottom:6px; border-bottom:1px solid #eee; }
.kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
.kpi { background:#f8f9fa; border-radius:12px; padding:14px; text-align:center; border:1px solid #eee; }
.kpi-label { font-size:9px; font-weight:700; letter-spacing:0.15em; color:#888;
text-transform:uppercase; margin-bottom:6px; }
.kpi-val { font-size:18px; font-weight:800; }
.kpi-val.pos { color:#059669; }
.kpi-val.neg { color:#DC2626; }
.kpi-val.gold { color:#B8860B; }
.cat-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f0f0f0; }
.cat-icon { font-size:18px; width:28px; text-align:center; }
.cat-name { flex:1; font-size:13px; color:#333; }
.cat-bar-bg { width:120px; height:6px; background:#eee; border-radius:99px; overflow:hidden; }
.cat-bar-fill { height:100%; border-radius:99px; }
.cat-val { font-size:13px; font-weight:700; min-width:70px; text-align:right; }
.cat-pct { font-size:11px; color:#888; min-width:36px; text-align:right; }
.goal-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f0f0f0; }
.goal-icon { font-size:18px; width:28px; text-align:center; }
.goal-info { flex:1; }
.goal-name { font-size:13px; font-weight:600; color:#111; }
.goal-sub { font-size:11px; color:#888; margin-top:2px; }
.goal-bar-bg { width:100px; height:6px; background:#eee; border-radius:99px; overflow:hidden; }
.goal-bar-fill { height:100%; border-radius:99px; }
.goal-pct { font-size:13px; font-weight:700; min-width:36px; text-align:right; }
.alert { padding:14px 16px; border-radius:10px; font-size:13px; line-height:1.6; margin-bottom:4px; }
.alert.ok { background:#f0fdf4; border:1px solid #86efac; color:#166534; }
.alert.warn { background:#fffbeb; border:1px solid #fde68a; color:#92400e; }
.alert.err { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
.history-row { display:flex; justify-content:space-between; padding:8px 0;
border-bottom:1px solid #f0f0f0; font-size:13px; }
.footer { margin-top:36px; padding-top:16px; border-top:1px solid #eee;
font-size:10px; color:#aaa; text-align:center; letter-spacing:0.08em; }
</style>
</head>
<body>
<div class="header">
<div class="brand">KACORP <span>BUDGET</span> <span style="font-size:13px;color:#888;font-weight:600">V3</span></div>
<div class="date">Rapport mensuel · ${monthLabel}${state.settings.name ? ' · ' + state.settings.name : ''}</div>
</div>

<div class="section">
<div class="section-title">Tableau de bord</div>
<div class="kpi-grid">
<div class="kpi"><div class="kpi-label">Revenus</div><div class="kpi-val pos">${fmt(inc)}</div></div>
<div class="kpi"><div class="kpi-label">Dépenses</div><div class="kpi-val neg">${fmt(totalExp)}</div></div>
<div class="kpi"><div class="kpi-label">${isOver ? "Dépassement" : "Solde"}</div><div class="kpi-val ${isOver ? "neg" : "pos"}">${isOver ? "−" : "+"}${fmt(Math.abs(balance))}</div></div>
<div class="kpi"><div class="kpi-label">Épargne</div><div class="kpi-val gold">${fmtPct(Math.max(saveRate,0))}</div></div>
</div>
</div>

<div class="section">
<div class="section-title">Analyse</div>
<div class="alert ${saveRate >= 20 ? "ok" : saveRate >= 10 ? "warn" : "err"}">
${saveRate >= 20
? `✅ Excellent taux d'épargne (${fmtPct(saveRate)}). Votre gestion financière est exemplaire.`
: saveRate >= 10
? `👍 Taux d'épargne correct (${fmtPct(saveRate)}). Objectif recommandé : 20%.`
: saveRate > 0
? `⚠️ Taux d'épargne faible (${fmtPct(saveRate)}). Des ajustements sont nécessaires.`
: `🔴 Budget dépassé de ${fmt(Math.abs(balance))}. Action immédiate requise.`}
</div>
</div>

${cats.length > 0 ? `
<div class="section">
<div class="section-title">Dépenses par catégorie</div>
${cats.map(c => `
<div class="cat-row">
<div class="cat-icon">${c.icon}</div>
<div class="cat-name">${c.label}</div>
<div class="cat-bar-bg"><div class="cat-bar-fill" style="width:${totalExp > 0 ? clamp((c.val/totalExp)*100,0,100) : 0}%;background:${c.color}"></div></div>
<div class="cat-pct">${totalExp > 0 ? fmtPct((c.val/totalExp)*100) : "—"}</div>
<div class="cat-val" style="color:${c.color}">${fmt(c.val)}</div>
</div>`).join("")}
</div>` : ""}

${goals.length > 0 ? `
<div class="section">
<div class="section-title">Objectifs financiers</div>
${goals.map(g => `
<div class="goal-row">
<div class="goal-icon">${g.icon}</div>
<div class="goal-info">
<div class="goal-name">${g.name}</div>
<div class="goal-sub">${fmt(g.cur)} épargné sur ${fmt(g.tar)}${g.deadline ? ' · Échéance : ' + new Date(g.deadline).toLocaleDateString("fr-FR") : ""}</div>
</div>
<div class="goal-bar-bg"><div class="goal-bar-fill" style="width:${g.pct}%;background:${g.color}"></div></div>
<div class="goal-pct" style="color:${g.color}">${g.pct}%</div>
</div>`).join("")}
</div>` : ""}

${state.history.length > 0 ? `
<div class="section">
<div class="section-title">Historique mensuel</div>
${[...state.history].sort((a,b) => b.month.localeCompare(a.month)).slice(0,6).map(h => {
const exp = Object.values(h.expenses || {}).reduce((s, v) => s + parseAmt(v), 0);
const bal = parseAmt(h.income) - exp;
const [y, m] = h.month.split("-");
return `<div class="history-row">
<span>${MONTH_FULL[parseInt(m)-1]} ${y}</span>
<span>Revenus : ${fmt(parseAmt(h.income))}</span>
<span>Dépenses : ${fmt(exp)}</span>
<span style="color:${bal >= 0 ? '#059669' : '#DC2626'};font-weight:700">${bal >= 0 ? "+" : "−"}${fmt(Math.abs(bal))}</span>
</div>`;
}).join("")}
</div>` : ""}

<div class="footer">KACORP BUDGET V3 · Généré le ${d.toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" })} · Données personnelles et confidentielles</div>
</body>
</html>`;

const win = window.open("", "_blank");
if (!win) { alert("Autorisez les pop-ups pour générer le PDF."); return; }
win.document.write(html);
win.document.close();
setTimeout(() => { win.focus(); win.print(); }, 600);
}
