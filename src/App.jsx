// ─── KACORP BUDGET V5 · App.jsx ─────────────────────────────────
// Shell principal : routing, état global, sauvegarde.

import { useState, useEffect, useCallback, useRef } from "react";
import { C, createDefaultState, NAV } from "./constants.js";
import { load, save, clearAll } from "./utils/storage.js";
import { parseAmt, fmt, currentMonth } from "./utils/finance.js";
import { Dashboard } from "./views/Dashboard.jsx";
import { Depenses }  from "./views/Depenses.jsx";
import { Objectifs } from "./views/Objectifs.jsx";
import { Stats  }    from "./views/Stats.jsx";
import { Settings }  from "./views/Settings.jsx";

// ── Police système — pas de requête réseau, fonctionne hors-ligne ─
// Inter est présente sur la plupart des systèmes récents.
// Fallback : Helvetica Neue → Arial → sans-serif générique.
const FONT_STACK = "Inter, 'Helvetica Neue', Arial, sans-serif";

// ── Écran d'accueil ───────────────────────────────────────────
function Splash({ onStart }) {
  return (
    <div style={{ minHeight:"100dvh", background:C.bg, display:"flex",
      flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"0 28px", position:"relative", overflow:"hidden",
      fontFamily:FONT_STACK }}>
      <div style={{ position:"absolute", top:"18%", left:"50%",
        transform:"translateX(-50%)", width:280, height:280,
        borderRadius:"50%", pointerEvents:"none",
        background:"radial-gradient(circle,#1a4d2840 0%,transparent 70%)",
        filter:"blur(40px)" }}/>
      <div style={{ maxWidth:340, width:"100%", textAlign:"center",
        position:"relative", zIndex:1 }}>
        <div style={{ width:88, height:88, margin:"0 auto 28px", borderRadius:24,
          border:`1px solid ${C.border}`,
          background:`linear-gradient(135deg,${C.s2},${C.s1})`,
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 0 48px #1a4d2840" }}>
          <img src="/logo-kacorp.png" alt="KACORP"
            style={{ width:64, height:64, objectFit:"contain", borderRadius:12 }}
            onError={e => {
              e.target.style.display = "none";
              e.target.parentNode.innerHTML = '<span style="font-size:36px">💼</span>';
            }}/>
        </div>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.4em",
          color:C.gold, marginBottom:6 }}>KACORP</div>
        <div style={{ fontSize:46, fontWeight:800, color:C.text,
          letterSpacing:"-0.03em", lineHeight:1, marginBottom:8 }}>BUDGET</div>
        <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.2em",
          color:C.label, marginBottom:28 }}>V5</div>
        <div style={{ width:36, height:1.5, background:C.gold,
          margin:"0 auto 28px", opacity:0.5 }}/>
        <p style={{ fontSize:15, lineHeight:1.8, color:C.label, marginBottom:16 }}>
          Maîtrisez vos finances.<br/>
          Transformez un objectif en plan d'action.
        </p>
        <p style={{ fontSize:12, color:C.muted, marginBottom:36 }}>
          L'application qui transforme un objectif financier en plan d'action simple.
        </p>
        <button onClick={onStart}
          style={{ border:"none",
            background:`linear-gradient(135deg,${C.gold},#E8C878)`,
            color:"#080E0A", fontSize:16, fontWeight:800, borderRadius:14,
            padding:"16px 0", cursor:"pointer", fontFamily:"inherit",
            letterSpacing:"0.04em", width:"100%",
            boxShadow:`0 6px 24px ${C.gold}30` }}>
          Commencer →
        </button>
        <p style={{ fontSize:11, color:C.muted, marginTop:20 }}>
          Données stockées localement · Confidentialité garantie
        </p>
      </div>
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────
export default function KaCorpBudget() {
  // load() est appelé UNE SEULE FOIS ici, dans l'initializer de useState.
  // Le résultat { data, migrated } est stocké directement dans l'état initial
  // pour éviter un deuxième appel dans un useEffect.
  const [state, setState] = useState(() => {
    const { data, migrated } = load();
    const base = data ?? createDefaultState();
    // On transporte le flag `migrated` dans l'état pour l'afficher
    // comme toast au premier render, sans rappeler load().
    return { ...base, _migrated: migrated };
  });

  const [tab,   setTab]  = useState("dashboard");
  const [toast, setToast] = useState(null);

  // Ref pour le timer toast — permet l'annulation et le cleanup
  const toastTimerRef = useRef(null);

  // showToast : annule le timer précédent avant d'en créer un nouveau
  const showToast = useCallback((msg, type = "ok") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ msg, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2800);
  }, []);

  // Cleanup du timer au démontage du composant
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Toast de migration — affiché une seule fois, sans rappeler load()
  useEffect(() => {
    if (state._migrated) {
      showToast("Données V4 migrées vers V5 ✓");
      // Sauvegarde immédiate sous la clé V5
      // (on retire _migrated du payload persisté)
      const { _migrated, ...toSave } = state;
      save(toSave);
      // Retire le flag du state pour ne plus le déclencher
      setState(s => ({ ...s, _migrated: false }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Dépendance vide intentionnelle : on veut ce toast exactement une fois
  // au premier montage. state._migrated est stable car issu de useState.

  // Sauvegarde automatique à chaque changement d'état
  useEffect(() => {
    if (state.started) {
      const { _migrated, ...toSave } = state;
      save(toSave);
    }
  }, [state]);

  const cur = state.settings?.currency || "EUR";
  const f   = useCallback((n) => fmt(n, cur), [cur]);

  // set : fusion partielle de state — ne jamais écraser _migrated depuis l'extérieur
  const set = useCallback((patch) => {
    setState(s => ({ ...s, ...patch }));
  }, []);

  const handleReset = useCallback(() => {
    if (!window.confirm(
      "Cette action supprimera toutes tes données enregistrées sur cet appareil.\n\nContinuer ?"
    )) return;
    clearAll();
    setState({ ...createDefaultState(), started: true, _migrated: false });
    setTab("dashboard");
    showToast("Données supprimées", "warn");
  }, [showToast]);

  const saveMonthSnapshot = useCallback(() => {
    const inc      = parseAmt(state.income);
    const month    = currentMonth();
    const existing = (state.history || []).filter(h => h.month !== month);
    set({
      history: [
        ...existing,
        { month, income: inc, expenses: { ...state.expenses } },
      ].slice(-24),
    });
    showToast("Mois archivé ✓");
  }, [state, set, showToast]);

  // ── Calculs globaux ──────────────────────────────────────────
  const inc      = parseAmt(state.income);
  const totalExp = (state.categories || []).reduce(
    (s, c) => s + parseAmt((state.expenses || {})[c.id] || 0), 0
  );
  const balance  = inc - totalExp;

  if (!state.started) return <Splash onStart={() => set({ started: true })}/>;

  const toastBg = toast?.type === "warn" ? C.warn
    : toast?.type === "err" ? C.neg : C.pos;

  return (
    <div style={{ minHeight:"100dvh", background:C.bg,
      fontFamily:FONT_STACK,
      color:C.text, maxWidth:480, margin:"0 auto",
      display:"flex", flexDirection:"column" }}>

      {/* Ambient glow */}
      <div style={{ position:"fixed", top:0, left:"50%",
        transform:"translateX(-50%)", width:320, height:200,
        pointerEvents:"none", zIndex:0,
        background:"radial-gradient(ellipse,#1a4d2828 0%,transparent 70%)",
        filter:"blur(30px)" }}/>

      {/* Header */}
      <header style={{ position:"sticky", top:0, zIndex:50,
        background:`${C.bg}EE`, backdropFilter:"blur(16px)",
        borderBottom:`1px solid ${C.border}`,
        padding:"13px 18px", display:"flex", alignItems:"center",
        justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src="/logo-kacorp.png" alt=""
            style={{ width:28, height:28, objectFit:"contain",
              borderRadius:8, background:C.s2 }}
            onError={e => { e.target.style.display = "none"; }}/>
          <div>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:"0.3em",
              color:C.gold, lineHeight:1 }}>KACORP</div>
            <div style={{ fontSize:13, fontWeight:700, color:C.text,
              letterSpacing:"0.1em" }}>BUDGET V5</div>
          </div>
        </div>
        {state.settings?.name && (
          <div style={{ fontSize:12, color:C.label }}>
            Bonjour, {state.settings.name} 👋
          </div>
        )}
      </header>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", position:"relative",
        zIndex:1, paddingBottom:84 }}>
        {tab === "dashboard" && (
          <Dashboard state={state} set={set} inc={inc}
            totalExp={totalExp} f={f}/>
        )}
        {tab === "depenses" && (
          <Depenses state={state} set={set} inc={inc}
            totalExp={totalExp} balance={balance} f={f}
            showToast={showToast}/>
        )}
        {tab === "objectifs" && (
          <Objectifs state={state} set={set} inc={inc}
            f={f} showToast={showToast}/>
        )}
        {tab === "stats" && (
          <Stats state={state} inc={inc} totalExp={totalExp}
            balance={balance} f={f}/>
        )}
        {tab === "settings" && (
          <Settings state={state} set={set} showToast={showToast}
            handleReset={handleReset}
            saveMonthSnapshot={saveMonthSnapshot}/>
        )}
      </div>

      {/* Bottom nav */}
      <nav style={{ position:"fixed", bottom:0, left:"50%",
        transform:"translateX(-50%)", width:"100%", maxWidth:480,
        background:`${C.bg}F5`, backdropFilter:"blur(20px)",
        borderTop:`1px solid ${C.border}`, display:"flex", zIndex:50,
        paddingBottom:"env(safe-area-inset-bottom,6px)" }}>
        {NAV.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex:1, padding:"10px 0 8px", border:"none",
              background:"transparent", cursor:"pointer",
              fontFamily:"inherit", display:"flex",
              flexDirection:"column", alignItems:"center", gap:3 }}>
            <span style={{ fontSize:16,
              opacity: tab === t.id ? 1 : 0.3,
              transition:"opacity 0.15s" }}>
              {t.icon}
            </span>
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:"0.04em",
              color: tab === t.id ? C.gold : C.muted,
              transition:"color 0.15s" }}>
              {t.label}
            </span>
            {tab === t.id && (
              <div style={{ width:16, height:1.5,
                background:C.gold, borderRadius:99 }}/>
            )}
          </button>
        ))}
      </nav>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:18, left:"50%",
          transform:"translateX(-50%)", zIndex:999,
          padding:"11px 22px", borderRadius:50, fontSize:13,
          fontWeight:700, whiteSpace:"nowrap",
          boxShadow:"0 8px 32px rgba(0,0,0,.5)",
          background:toastBg, color:"#080E0A",
          animation:"toastIn 0.3s ease" }}>
          {toast.msg}
        </div>
      )}

      {/* CSS global — sans import distant, fonctionne hors-ligne */}
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        input[type=number]{-moz-appearance:textfield}
        ::-webkit-scrollbar{width:0;height:0}
        input,button,textarea,select{font-family:inherit}
        @keyframes toastIn{
          from{opacity:0;transform:translateX(-50%) translateY(-8px)}
          to  {opacity:1;transform:translateX(-50%) translateY(0)}
        }
        @keyframes fadeUp{
          from{opacity:0;transform:translateY(12px)}
          to  {opacity:1;transform:translateY(0)}
        }
        .screen{animation:fadeUp 0.25s ease both}
      `}</style>
    </div>
  );
}