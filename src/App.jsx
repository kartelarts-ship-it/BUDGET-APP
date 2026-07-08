import { useState, useEffect, useRef } from "react";

// ─── PALETTE KACORP ─────────────────────────────────────────────────────────
const C = {
  bg:        "#080E0A",   // noir-vert profond
  surface:   "#0F1A12",   // carte principale
  surface2:  "#152019",   // carte secondaire
  border:    "#1E3024",   // bordure subtile
  gold:      "#D8B56D",   // or signature
  goldDim:   "#8B6E38",   // or atténué
  pos:       "#6EE7B7",   // vert positif
  neg:       "#F87171",   // rouge doux
  warn:      "#FBBF24",   // ambre
  text:      "#F0F4F1",   // blanc cassé
  label:     "#7A9A82",   // vert-gris label
  muted:     "#3D5A44",   // très atténué
  accent:    "#22C55E",   // vert vif accent
};

// ─── DONNÉES PAR DÉFAUT ──────────────────────────────────────────────────────
const DEFAULT_CATS = [
  { id: "housing",   label: "Logement",     icon: "🏠", color: "#D8B56D", budget: 0 },
  { id: "food",      label: "Alimentation", icon: "🛒", color: "#6EE7B7", budget: 0 },
  { id: "transport", label: "Transport",    icon: "🚗", color: "#60A5FA", budget: 0 },
  { id: "health",    label: "Santé",        icon: "❤️",  color: "#F87171", budget: 0 },
  { id: "leisure",   label: "Loisirs",      icon: "🎬", color: "#A78BFA", budget: 0 },
  { id: "savings",   label: "Épargne",      icon: "💰", color: "#34D399", budget: 0 },
  { id: "other",     label: "Autres",       icon: "📦", color: "#94A3B8", budget: 0 },
];

const DEFAULT_STATE = {
  income: "",
  categories: DEFAULT_CATS,
  expenses: {},
  goals: [],
  started: false,
};

const STORAGE_KEY = "kacorp_v2";
const ICONS = ["🏠","🛒","🚗","❤️","🎬","💰","📦","✈️","🏋️","📚","🎓","💻","👕","🍽️","🎁","⚡","📱","🏥","🐾","🎮"];
const CAT_COLORS = ["#D8B56D","#6EE7B7","#60A5FA","#F87171","#A78BFA","#34D399","#94A3B8","#FBBF24","#FB923C","#E879F9"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);

const fmtPct = (n) => `${Math.round(n || 0)}%`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const load = () => {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; }
  catch { return null; }
};
const save = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} };

// ─── MINI COMPONENTS ─────────────────────────────────────────────────────────

function Ring({ value, max, color, size = 96, strokeW = 7 }) {
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={strokeW} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={strokeW}
        strokeDasharray={`${pct * circ} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1)" }}
      />
    </svg>
  );
}

function ProgressBar({ value, max, color, height = 6 }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height, background: C.border, borderRadius: 99, overflow: "hidden", width: "100%" }}>
      <div style={{
        height: "100%", width: `${pct}%`, background: color,
        borderRadius: 99, transition: "width 0.6s cubic-bezier(.4,0,.2,1)"
      }} />
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
      color, border: `1px solid ${color}40`, borderRadius: 6,
      padding: "2px 7px", background: `${color}10`
    }}>{label}</span>
  );
}

// ─── SPLASH ──────────────────────────────────────────────────────────────────
function Splash({ onStart }) {
  return (
    <div style={{ minHeight: "100dvh", background: C.bg, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "0 28px", fontFamily: "Inter, sans-serif" }}>

      {/* Glow ambient */}
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: 260, height: 260, borderRadius: "50%",
        background: "radial-gradient(circle, #1a3d2280 0%, transparent 70%)",
        pointerEvents: "none", filter: "blur(40px)" }} />

      <div style={{ maxWidth: 340, width: "100%", textAlign: "center", position: "relative" }}>
        {/* Logo */}
        <div style={{ width: 88, height: 88, margin: "0 auto 32px",
          borderRadius: 24, border: `1px solid ${C.border}`,
          background: `linear-gradient(135deg, ${C.surface2}, ${C.surface})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 40px #1a3d2260` }}>
          <img src="/logo-kacorp.png" alt="KACORP" style={{ width: 64, height: 64, objectFit: "contain", borderRadius: 12 }}
            onError={e => { e.target.style.display="none"; e.target.parentNode.innerHTML='<span style="font-size:32px">💼</span>'; }} />
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4em", color: C.gold, marginBottom: 8 }}>KACORP</div>
        <div style={{ fontSize: 44, fontWeight: 800, color: C.text, letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 20 }}>
          BUDGET
        </div>

        <div style={{ width: 40, height: 1.5, background: C.gold, margin: "0 auto 28px", opacity: 0.5 }} />

        <p style={{ fontSize: 15, lineHeight: 1.75, color: C.label, marginBottom: 48, fontWeight: 400 }}>
          Maîtrisez vos finances.<br />Visualisez vos dépenses.<br />Avancez avec clarté.
        </p>

        <button onClick={onStart} style={{
          width: "100%", padding: "17px 0", borderRadius: 16, border: "none",
          background: `linear-gradient(135deg, ${C.gold}, #E8C878)`,
          color: "#080E0A", fontSize: 16, fontWeight: 800,
          fontFamily: "Inter, sans-serif", cursor: "pointer",
          letterSpacing: "0.05em", marginBottom: 20,
          boxShadow: `0 8px 32px ${C.gold}30`
        }}>
          Commencer
        </button>

        <p style={{ fontSize: 11, color: C.muted, letterSpacing: "0.07em" }}>
          Données stockées localement · Confidentialité garantie
        </p>
      </div>
    </div>
  );
}

// ─── NAV TABS ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "◈" },
  { id: "depenses",  label: "Dépenses",  icon: "◉" },
  { id: "objectifs", label: "Objectifs", icon: "◆" },
];

// ─── APP ROOT ────────────────────────────────────────────────────────────────
export default function KaCorpBudget() {
  const raw = load();
  const [state, setState] = useState(() => ({ ...DEFAULT_STATE, ...raw }));
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);

  useEffect(() => { if (state.started) save(state); }, [state]);

  const set = (patch) => setState(prev => ({ ...prev, ...patch }));

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  };

  const handleReset = () => {
    if (!confirm("Réinitialiser toutes les données KACORP BUDGET ?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setState({ ...DEFAULT_STATE, started: true });
    setTab("dashboard");
    showToast("Données réinitialisées", "warn");
  };

  const inc = parseFloat(state.income) || 0;
  const totalExp = state.categories.reduce((s, c) => s + (parseFloat(state.expenses[c.id]) || 0), 0);
  const balance = inc - totalExp;
  const savingsRate = inc > 0 ? ((balance / inc) * 100) : 0;
  const isOver = balance < 0;

  if (!state.started) return <Splash onStart={() => set({ started: true })} />;

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, fontFamily: "Inter, 'Helvetica Neue', sans-serif",
      color: C.text, maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column" }}>

      {/* Glow ambient */}
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 300, height: 200, pointerEvents: "none",
        background: "radial-gradient(ellipse, #1a3d2240 0%, transparent 70%)",
        filter: "blur(30px)", zIndex: 0 }} />

      {/* ── HEADER ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 50,
        background: `${C.bg}EE`, backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo-kacorp.png" alt="" style={{ width: 28, height: 28, objectFit: "contain",
            borderRadius: 8, background: C.surface2 }}
            onError={e => e.target.style.display="none"} />
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", color: C.gold, lineHeight: 1 }}>KACORP</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "0.08em" }}>BUDGET</div>
          </div>
        </div>
        <button onClick={handleReset} style={{
          background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
          color: C.label, padding: "7px 12px", fontSize: 12, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.04em"
        }}>↺ Reset</button>
      </header>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 1, paddingBottom: 80 }}>
        {tab === "dashboard" && (
          <Dashboard state={state} set={set} inc={inc} totalExp={totalExp}
            balance={balance} savingsRate={savingsRate} isOver={isOver} showToast={showToast} />
        )}
        {tab === "depenses" && (
          <Depenses state={state} set={set} inc={inc} showToast={showToast} />
        )}
        {tab === "objectifs" && (
          <Objectifs state={state} set={set} showToast={showToast} />
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: `${C.bg}F5`,
        backdropFilter: "blur(20px)", borderTop: `1px solid ${C.border}`,
        display: "flex", zIndex: 50, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "12px 0 10px", border: "none", background: "transparent",
            cursor: "pointer", fontFamily: "inherit", display: "flex",
            flexDirection: "column", alignItems: "center", gap: 4, transition: "opacity 0.15s"
          }}>
            <span style={{ fontSize: 18, opacity: tab === t.id ? 1 : 0.35 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
              color: tab === t.id ? C.gold : C.muted }}>{t.label}</span>
            {tab === t.id && (
              <div style={{ width: 20, height: 2, background: C.gold, borderRadius: 99, marginTop: 2 }} />
            )}
          </button>
        ))}
      </nav>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          zIndex: 999, padding: "11px 22px", borderRadius: 50, fontSize: 13, fontWeight: 700,
          letterSpacing: "0.03em", whiteSpace: "nowrap", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          background: toast.type === "warn" ? C.warn : toast.type === "err" ? C.neg : C.pos,
          color: "#080E0A", animation: "toastIn 0.3s ease" }}>
          {toast.msg}
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        ::-webkit-scrollbar { width: 0; }
        input, button, textarea, select { font-family: inherit; }
        @keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(-8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .screen { animation: fadeUp 0.3s cubic-bezier(.4,0,.2,1) both; }
      `}</style>
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ state, set, inc, totalExp, balance, savingsRate, isOver }) {
  const [editIncome, setEditIncome] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    if (editIncome) setTimeout(() => inputRef.current?.focus(), 100);
  }, [editIncome]);

  const topCats = [...state.categories]
    .filter(c => (parseFloat(state.expenses[c.id]) || 0) > 0)
    .sort((a, b) => (parseFloat(state.expenses[b.id]) || 0) - (parseFloat(state.expenses[a.id]) || 0))
    .slice(0, 4);

  return (
    <div className="screen" style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── REVENU CARD ── */}
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Label>REVENU NET MENSUEL</Label>
          <button onClick={() => setEditIncome(v => !v)} style={ghostBtn()}>
            {editIncome ? "✓ Ok" : "Modifier"}
          </button>
        </div>

        {editIncome ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 26, color: C.gold, fontWeight: 700 }}>€</span>
            <input ref={inputRef} type="number" inputMode="decimal"
              value={state.income}
              onChange={e => set({ income: e.target.value })}
              onBlur={() => setEditIncome(false)}
              placeholder="0"
              style={{ background: "transparent", border: "none", outline: "none",
                color: C.text, fontSize: 38, fontWeight: 800, width: "100%",
                fontVariantNumeric: "tabular-nums" }} />
          </div>
        ) : (
          <div style={{ fontSize: 42, fontWeight: 800, color: C.text,
            fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", marginBottom: 4 }}>
            {fmt(inc)}
          </div>
        )}
        <div style={{ fontSize: 12, color: C.label }}>Tapez pour modifier</div>
      </div>

      {/* ── KPI GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

        {/* Solde */}
        <div style={{ ...card(), display: "flex", flexDirection: "column", gap: 8 }}>
          <Label>{isOver ? "DÉPASSEMENT" : "SOLDE DISPO"}</Label>
          <div style={{ fontSize: 26, fontWeight: 800, color: isOver ? C.neg : C.pos,
            fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
            {isOver ? "−" : "+"}{fmt(Math.abs(balance))}
          </div>
          <ProgressBar value={isOver ? totalExp : balance} max={inc} color={isOver ? C.neg : C.pos} />
        </div>

        {/* Taux d'épargne */}
        <div style={{ ...card(), display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <Label>TAUX D'ÉPARGNE</Label>
          <div style={{ position: "relative", width: 80, height: 80 }}>
            <Ring value={Math.max(savingsRate, 0)} max={100}
              color={savingsRate < 0 ? C.neg : savingsRate < 10 ? C.warn : C.pos} size={80} strokeW={6} />
            <div style={{ position: "absolute", inset: 0, display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 17, fontWeight: 800,
                color: savingsRate < 0 ? C.neg : C.pos }}>{fmtPct(Math.max(savingsRate, 0))}</span>
            </div>
          </div>
          <Badge
            label={savingsRate >= 20 ? "EXCELLENT" : savingsRate >= 10 ? "BON" : savingsRate > 0 ? "À AMÉLIORER" : "DÉFICIT"}
            color={savingsRate >= 20 ? C.pos : savingsRate >= 10 ? C.accent : savingsRate > 0 ? C.warn : C.neg}
          />
        </div>

        {/* Total dépenses */}
        <div style={{ ...card(), display: "flex", flexDirection: "column", gap: 8 }}>
          <Label>DÉPENSES TOTALES</Label>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.text,
            fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
            {fmt(totalExp)}
          </div>
          <div style={{ fontSize: 11, color: C.label }}>
            {inc > 0 ? `${fmtPct((totalExp / inc) * 100)} du revenu` : "—"}
          </div>
        </div>

        {/* Objectifs actifs */}
        <div style={{ ...card(), display: "flex", flexDirection: "column", gap: 8 }}>
          <Label>OBJECTIFS</Label>
          <div style={{ fontSize: 26, fontWeight: 800, color: C.gold }}>
            {state.goals.length}
          </div>
          <div style={{ fontSize: 11, color: C.label }}>
            {state.goals.filter(g => parseFloat(g.current) >= parseFloat(g.target)).length} atteint{state.goals.filter(g => parseFloat(g.current) >= parseFloat(g.target)).length > 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* ── TOP DÉPENSES ── */}
      {topCats.length > 0 && (
        <div style={card()}>
          <Label style={{ marginBottom: 14 }}>TOP DÉPENSES</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {topCats.map(cat => {
              const val = parseFloat(state.expenses[cat.id]) || 0;
              return (
                <div key={cat.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: C.label, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{cat.icon}</span> {cat.label}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: cat.color, fontVariantNumeric: "tabular-nums" }}>
                      {fmt(val)}
                    </span>
                  </div>
                  <ProgressBar value={val} max={totalExp} color={cat.color} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CONSEIL RAPIDE ── */}
      {inc > 0 && (
        <div style={{ ...card(), background: C.surface2, border: `1px solid ${C.border}` }}>
          <Label>ANALYSE RAPIDE</Label>
          <p style={{ fontSize: 13, color: C.label, lineHeight: 1.65, marginTop: 10 }}>
            {savingsRate >= 20
              ? `✅ Excellent ! Vous épargnez ${fmtPct(savingsRate)} de votre revenu. Pensez à investir le surplus.`
              : savingsRate >= 10
              ? `👍 Bien. ${fmtPct(savingsRate)} d'épargne. Objectif recommandé : 20%. Il vous manque ${fmt((0.2 * inc) - balance)}.`
              : savingsRate > 0
              ? `⚠️ Taux d'épargne faible (${fmtPct(savingsRate)}). Réduisez vos dépenses de ${fmt((0.1 * inc) - balance)} pour atteindre 10%.`
              : `🔴 Budget dépassé de ${fmt(Math.abs(balance))}. Identifiez les dépenses à réduire dans l'onglet Dépenses.`
            }
          </p>
        </div>
      )}
    </div>
  );
}

// ─── DÉPENSES ────────────────────────────────────────────────────────────────
function Depenses({ state, set, inc, showToast }) {
  const [editCat, setEditCat] = useState(null); // id de catégorie en édition
  const [showAdd, setShowAdd] = useState(false);
  const [newCat, setNewCat] = useState({ label: "", icon: "📦", color: CAT_COLORS[0] });

  const updateExpense = (id, val) =>
    set({ expenses: { ...state.expenses, [id]: val } });

  const updateCatLabel = (id, label) =>
    set({ categories: state.categories.map(c => c.id === id ? { ...c, label } : c) });

  const updateCatBudget = (id, budget) =>
    set({ categories: state.categories.map(c => c.id === id ? { ...c, budget: parseFloat(budget) || 0 } : c) });

  const deleteCat = (id) => {
    set({
      categories: state.categories.filter(c => c.id !== id),
      expenses: Object.fromEntries(Object.entries(state.expenses).filter(([k]) => k !== id))
    });
    setEditCat(null);
    showToast("Catégorie supprimée", "warn");
  };

  const addCat = () => {
    if (!newCat.label.trim()) { showToast("Nom requis", "err"); return; }
    const id = uid();
    set({ categories: [...state.categories, { id, ...newCat, budget: 0 }] });
    setNewCat({ label: "", icon: "📦", color: CAT_COLORS[0] });
    setShowAdd(false);
    showToast("Catégorie ajoutée");
  };

  const totalExp = state.categories.reduce((s, c) => s + (parseFloat(state.expenses[c.id]) || 0), 0);

  return (
    <div className="screen" style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Synthèse rapide */}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ ...card(), flex: 1, textAlign: "center" }}>
          <Label>TOTAL</Label>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginTop: 6 }}>{fmt(totalExp)}</div>
        </div>
        {inc > 0 && (
          <div style={{ ...card(), flex: 1, textAlign: "center" }}>
            <Label>RESTANT</Label>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6,
              color: inc - totalExp >= 0 ? C.pos : C.neg }}>
              {fmt(Math.max(inc - totalExp, 0))}
            </div>
          </div>
        )}
      </div>

      {/* Liste catégories */}
      {state.categories.map((cat) => {
        const val = parseFloat(state.expenses[cat.id]) || 0;
        const pctOfInc = inc > 0 ? (val / inc) * 100 : 0;
        const hasBudget = cat.budget > 0;
        const overBudget = hasBudget && val > cat.budget;
        const isEditing = editCat === cat.id;

        return (
          <div key={cat.id} style={{ ...card(), border: `1px solid ${isEditing ? cat.color + "60" : C.border}`,
            transition: "border-color 0.2s" }}>

            {/* En-tête catégorie */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>{cat.icon}</span>
              {isEditing ? (
                <input value={cat.label}
                  onChange={e => updateCatLabel(cat.id, e.target.value)}
                  style={{ ...inlineInput(), flex: 1, fontSize: 14, fontWeight: 700 }}
                  placeholder="Nom de la catégorie" />
              ) : (
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.text }}>{cat.label}</span>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                {overBudget && !isEditing && <Badge label="DÉPASSÉ" color={C.neg} />}
                <button onClick={() => setEditCat(isEditing ? null : cat.id)}
                  style={ghostBtn()}>{isEditing ? "✓" : "✏️"}</button>
              </div>
            </div>

            {/* Barre de progression */}
            <div style={{ marginBottom: 12 }}>
              <ProgressBar value={val} max={hasBudget ? cat.budget : (inc || totalExp || 1)}
                color={overBudget ? C.neg : cat.color} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <span style={{ fontSize: 10, color: C.label }}>
                  {inc > 0 ? `${fmtPct(pctOfInc)} du revenu` : ""}
                </span>
                {hasBudget && (
                  <span style={{ fontSize: 10, color: overBudget ? C.neg : C.label }}>
                    Budget : {fmt(cat.budget)}
                  </span>
                )}
              </div>
            </div>

            {/* Input montant */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: isEditing ? 12 : 0 }}>
              <span style={{ fontSize: 16, color: C.gold, fontWeight: 700 }}>€</span>
              <input type="number" inputMode="decimal"
                value={state.expenses[cat.id] || ""}
                onChange={e => updateExpense(cat.id, e.target.value)}
                placeholder="0"
                style={{ background: "transparent", border: "none",
                  borderBottom: `1px solid ${C.border}`, outline: "none",
                  color: val > 0 ? cat.color : C.text, fontSize: 26, fontWeight: 800,
                  width: "100%", paddingBottom: 4, fontVariantNumeric: "tabular-nums" }} />
            </div>

            {/* Mode édition étendu */}
            {isEditing && (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <Label style={{ marginBottom: 8 }}>BUDGET LIMITE (optionnel)</Label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: C.goldDim }}>€</span>
                    <input type="number" inputMode="decimal"
                      value={cat.budget || ""}
                      onChange={e => updateCatBudget(cat.id, e.target.value)}
                      placeholder="Pas de limite"
                      style={inlineInput()} />
                  </div>
                </div>
                <div>
                  <Label style={{ marginBottom: 8 }}>ICÔNE</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ICONS.map(ic => (
                      <button key={ic} onClick={() =>
                        set({ categories: state.categories.map(c => c.id === cat.id ? { ...c, icon: ic } : c) })}
                        style={{ fontSize: 20, background: cat.icon === ic ? C.surface2 : "transparent",
                          border: `1px solid ${cat.icon === ic ? C.gold : C.border}`,
                          borderRadius: 8, padding: "4px 6px", cursor: "pointer" }}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label style={{ marginBottom: 8 }}>COULEUR</Label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {CAT_COLORS.map(col => (
                      <button key={col} onClick={() =>
                        set({ categories: state.categories.map(c => c.id === cat.id ? { ...c, color: col } : c) })}
                        style={{ width: 28, height: 28, borderRadius: "50%", background: col,
                          border: `3px solid ${cat.color === col ? C.text : "transparent"}`, cursor: "pointer" }} />
                    ))}
                  </div>
                </div>
                <button onClick={() => deleteCat(cat.id)}
                  style={{ padding: "10px", borderRadius: 12, border: `1px solid ${C.neg}30`,
                    background: `${C.neg}10`, color: C.neg, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.03em" }}>
                  Supprimer cette catégorie
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Ajouter catégorie */}
      {showAdd ? (
        <div style={card()}>
          <Label style={{ marginBottom: 12 }}>NOUVELLE CATÉGORIE</Label>
          <input value={newCat.label}
            onChange={e => setNewCat(n => ({ ...n, label: e.target.value }))}
            placeholder="Nom (ex: Streaming)"
            style={{ ...inlineInput(), marginBottom: 14, fontSize: 15 }} />
          <Label style={{ marginBottom: 8 }}>ICÔNE</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {ICONS.map(ic => (
              <button key={ic} onClick={() => setNewCat(n => ({ ...n, icon: ic }))}
                style={{ fontSize: 20, background: newCat.icon === ic ? C.surface2 : "transparent",
                  border: `1px solid ${newCat.icon === ic ? C.gold : C.border}`,
                  borderRadius: 8, padding: "4px 6px", cursor: "pointer" }}>
                {ic}
              </button>
            ))}
          </div>
          <Label style={{ marginBottom: 8 }}>COULEUR</Label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {CAT_COLORS.map(col => (
              <button key={col} onClick={() => setNewCat(n => ({ ...n, color: col }))}
                style={{ width: 28, height: 28, borderRadius: "50%", background: col,
                  border: `3px solid ${newCat.color === col ? C.text : "transparent"}`, cursor: "pointer" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={addCat} style={{ ...primaryBtn(), flex: 1 }}>Ajouter</button>
            <button onClick={() => setShowAdd(false)} style={{ ...ghostBtn(), flex: 1, padding: "12px 0" }}>Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          style={{ padding: "14px", borderRadius: 16,
            border: `1px dashed ${C.muted}`, background: "transparent",
            color: C.label, fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
          + Ajouter une catégorie
        </button>
      )}
    </div>
  );
}

// ─── OBJECTIFS ───────────────────────────────────────────────────────────────
function Objectifs({ state, set, showToast }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: "", target: "", current: "", icon: "🎯", color: C.gold });
  const [editId, setEditId] = useState(null);

  const addGoal = () => {
    if (!newGoal.name.trim()) { showToast("Nom requis", "err"); return; }
    if (!newGoal.target || parseFloat(newGoal.target) <= 0) { showToast("Montant cible requis", "err"); return; }
    set({ goals: [...state.goals, { id: uid(), ...newGoal, current: newGoal.current || "0" }] });
    setNewGoal({ name: "", target: "", current: "", icon: "🎯", color: C.gold });
    setShowAdd(false);
    showToast("Objectif ajouté !");
  };

  const updateGoal = (id, patch) =>
    set({ goals: state.goals.map(g => g.id === id ? { ...g, ...patch } : g) });

  const deleteGoal = (id) => {
    set({ goals: state.goals.filter(g => g.id !== id) });
    setEditId(null);
    showToast("Objectif supprimé", "warn");
  };

  const GOAL_ICONS = ["🎯","🏖️","🚀","🏠","🚗","✈️","💍","🎓","💻","🛡️","🌍","🏋️","💎","🎸","📸"];
  const GOAL_COLORS = [C.gold, C.pos, "#60A5FA", "#A78BFA", "#F87171", "#FBBF24", "#34D399", "#FB923C"];

  return (
    <div className="screen" style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Résumé */}
      {state.goals.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ ...card(), textAlign: "center" }}>
            <Label>TOTAL ÉPARGNÉ</Label>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.pos, marginTop: 6 }}>
              {fmt(state.goals.reduce((s, g) => s + (parseFloat(g.current) || 0), 0))}
            </div>
          </div>
          <div style={{ ...card(), textAlign: "center" }}>
            <Label>TOTAL CIBLÉ</Label>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.gold, marginTop: 6 }}>
              {fmt(state.goals.reduce((s, g) => s + (parseFloat(g.target) || 0), 0))}
            </div>
          </div>
        </div>
      )}

      {/* Liste objectifs */}
      {state.goals.length === 0 && !showAdd && (
        <div style={{ ...card(), textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🎯</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            Aucun objectif défini
          </div>
          <div style={{ fontSize: 13, color: C.label, lineHeight: 1.6 }}>
            Définissez vos projets financiers :<br />
            voyage, achat, épargne de sécurité…
          </div>
        </div>
      )}

      {state.goals.map(goal => {
        const current = parseFloat(goal.current) || 0;
        const target = parseFloat(goal.target) || 1;
        const pct = Math.min((current / target) * 100, 100);
        const done = current >= target;
        const remaining = Math.max(target - current, 0);
        const isEditing = editId === goal.id;

        return (
          <div key={goal.id} style={{ ...card(),
            border: `1px solid ${done ? goal.color + "60" : C.border}`,
            background: done ? `${goal.color}08` : C.surface }}>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: `${goal.color}18`, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 22 }}>
                {goal.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{goal.name}</div>
                  {done && <Badge label="ATTEINT ✓" color={goal.color} />}
                </div>
                <div style={{ fontSize: 12, color: C.label, marginTop: 2 }}>
                  Objectif : {fmt(target)}
                </div>
              </div>
              <button onClick={() => setEditId(isEditing ? null : goal.id)} style={ghostBtn()}>
                {isEditing ? "✓" : "✏️"}
              </button>
            </div>

            {/* Anneau + chiffres */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <Ring value={current} max={target} color={goal.color} size={72} strokeW={6} />
                <div style={{ position: "absolute", inset: 0, display: "flex",
                  alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: goal.color }}>
                    {Math.round(pct)}%
                  </span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: goal.color,
                  fontVariantNumeric: "tabular-nums", marginBottom: 2 }}>
                  {fmt(current)}
                </div>
                {!done && (
                  <div style={{ fontSize: 12, color: C.label }}>
                    Encore {fmt(remaining)} à atteindre
                  </div>
                )}
                {done && (
                  <div style={{ fontSize: 12, color: goal.color, fontWeight: 600 }}>
                    🎉 Félicitations !
                  </div>
                )}
              </div>
            </div>

            <ProgressBar value={current} max={target} color={goal.color} height={8} />

            {/* Édition */}
            {isEditing && (
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 14,
                display: "flex", flexDirection: "column", gap: 12 }}>

                <div>
                  <Label style={{ marginBottom: 6 }}>NOM DE L'OBJECTIF</Label>
                  <input value={goal.name}
                    onChange={e => updateGoal(goal.id, { name: e.target.value })}
                    style={inlineInput()} placeholder="Ex: Voyage Japon" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <Label style={{ marginBottom: 6 }}>MONTANT CIBLE (€)</Label>
                    <input type="number" inputMode="decimal"
                      value={goal.target}
                      onChange={e => updateGoal(goal.id, { target: e.target.value })}
                      style={inlineInput()} placeholder="5000" />
                  </div>
                  <div>
                    <Label style={{ marginBottom: 6 }}>ÉPARGNÉ (€)</Label>
                    <input type="number" inputMode="decimal"
                      value={goal.current}
                      onChange={e => updateGoal(goal.id, { current: e.target.value })}
                      style={inlineInput()} placeholder="0" />
                  </div>
                </div>

                <div>
                  <Label style={{ marginBottom: 8 }}>ICÔNE</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {GOAL_ICONS.map(ic => (
                      <button key={ic} onClick={() => updateGoal(goal.id, { icon: ic })}
                        style={{ fontSize: 18, background: goal.icon === ic ? C.surface2 : "transparent",
                          border: `1px solid ${goal.icon === ic ? C.gold : C.border}`,
                          borderRadius: 8, padding: "4px 6px", cursor: "pointer" }}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label style={{ marginBottom: 8 }}>COULEUR</Label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {GOAL_COLORS.map(col => (
                      <button key={col} onClick={() => updateGoal(goal.id, { color: col })}
                        style={{ width: 28, height: 28, borderRadius: "50%", background: col,
                          border: `3px solid ${goal.color === col ? C.text : "transparent"}`, cursor: "pointer" }} />
                    ))}
                  </div>
                </div>

                <button onClick={() => deleteGoal(goal.id)}
                  style={{ padding: "10px", borderRadius: 12,
                    border: `1px solid ${C.neg}30`, background: `${C.neg}10`,
                    color: C.neg, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit" }}>
                  Supprimer cet objectif
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Formulaire ajout */}
      {showAdd ? (
        <div style={card()}>
          <Label style={{ marginBottom: 14 }}>NOUVEL OBJECTIF</Label>
          <input value={newGoal.name}
            onChange={e => setNewGoal(n => ({ ...n, name: e.target.value }))}
            placeholder="Ex: Voyage Japon, Fonds d'urgence…"
            style={{ ...inlineInput(), marginBottom: 12, fontSize: 15 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <Label style={{ marginBottom: 6 }}>CIBLE (€)</Label>
              <input type="number" inputMode="decimal"
                value={newGoal.target}
                onChange={e => setNewGoal(n => ({ ...n, target: e.target.value }))}
                placeholder="5 000" style={inlineInput()} />
            </div>
            <div>
              <Label style={{ marginBottom: 6 }}>DÉJÀ ÉPARGNÉ (€)</Label>
              <input type="number" inputMode="decimal"
                value={newGoal.current}
                onChange={e => setNewGoal(n => ({ ...n, current: e.target.value }))}
                placeholder="0" style={inlineInput()} />
            </div>
          </div>
          <Label style={{ marginBottom: 8 }}>ICÔNE</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {["🎯","🏖️","🚀","🏠","🚗","✈️","💍","🎓","💻","🛡️","🌍","🏋️","💎"].map(ic => (
              <button key={ic} onClick={() => setNewGoal(n => ({ ...n, icon: ic }))}
                style={{ fontSize: 18, background: newGoal.icon === ic ? C.surface2 : "transparent",
                  border: `1px solid ${newGoal.icon === ic ? C.gold : C.border}`,
                  borderRadius: 8, padding: "4px 6px", cursor: "pointer" }}>
                {ic}
              </button>
            ))}
          </div>
          <Label style={{ marginBottom: 8 }}>COULEUR</Label>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {GOAL_COLORS.map(col => (
              <button key={col} onClick={() => setNewGoal(n => ({ ...n, color: col }))}
                style={{ width: 28, height: 28, borderRadius: "50%", background: col,
                  border: `3px solid ${newGoal.color === col ? C.text : "transparent"}`, cursor: "pointer" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={addGoal} style={{ ...primaryBtn(), flex: 1 }}>Créer l'objectif</button>
            <button onClick={() => setShowAdd(false)} style={{ ...ghostBtn(), flex: 1, padding: "12px 0" }}>Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)}
          style={{ padding: "15px", borderRadius: 16,
            border: `1px dashed ${C.muted}`, background: "transparent",
            color: C.label, fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
          + Nouvel objectif financier
        </button>
      )}
    </div>
  );
}

// ─── STYLE HELPERS ───────────────────────────────────────────────────────────
const card = () => ({
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 18,
  padding: "18px 16px",
});

const ghostBtn = () => ({
  background: C.surface2,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  color: C.label,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
  letterSpacing: "0.03em",
});

const primaryBtn = () => ({
  padding: "14px 0",
  borderRadius: 14,
  border: "none",
  background: `linear-gradient(135deg, ${C.gold}, #E8C878)`,
  color: "#080E0A",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "inherit",
  letterSpacing: "0.04em",
});

const inlineInput = () => ({
  width: "100%",
  background: C.surface2,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  color: C.text,
  outline: "none",
  fontFamily: "inherit",
  fontVariantNumeric: "tabular-nums",
});

function Label({ children, style }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em",
      color: C.label, marginBottom: 0, ...style }}>
      {children}
    </div>
  );
}