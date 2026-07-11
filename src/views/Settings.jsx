// ─── KACORP BUDGET V5 · views/Settings.jsx ──────────────────────

import { C, CURRENCY_SYMBOLS, SAFETY_MARGIN_OPTIONS, MONTH_FULL, STORAGE_KEY } from "../constants.js";
import { Card, Lbl, Field, GoldBtn } from "../components/UI.jsx";
import { parseAmt } from "../utils/finance.js";

export function Settings({ state, set, showToast, handleReset, saveMonthSnapshot }) {
  const upd = (patch) => set({ settings: { ...state.settings, ...patch } });

  const storageSize = (() => {
    try {
      return (new Blob([localStorage.getItem(STORAGE_KEY) || ""]).size / 1024).toFixed(1) + " Ko";
    } catch { return "—"; }
  })();

  const safetyIsCustom = state.settings.safetyMarginCustom != null &&
                         state.settings.safetyMarginCustom > 0;

  return (
    <div className="screen" style={{ padding:"18px 14px", display:"flex",
      flexDirection:"column", gap:12 }}>

      {/* Profil */}
      <Card>
        <Lbl style={{ marginBottom:12 }}>PROFIL</Lbl>
        <Field label="PRÉNOM" value={state.settings.name || ""}
          onChange={e => upd({ name: e.target.value })}
          placeholder="Ex : Steeve"/>
      </Card>

      {/* Devise */}
      <Card>
        <Lbl style={{ marginBottom:12 }}>DEVISE</Lbl>
        <div style={{ display:"flex", gap:8 }}>
          {Object.entries(CURRENCY_SYMBOLS).map(([code, sym]) => (
            <button key={code} onClick={() => upd({ currency: code })}
              style={{ flex:1, padding:"9px 0", borderRadius:10,
                fontFamily:"inherit", fontSize:13, fontWeight:700,
                cursor:"pointer",
                background: state.settings.currency===code ? C.gold : C.s2,
                color:      state.settings.currency===code ? "#080E0A" : C.label,
                border: `1px solid ${state.settings.currency===code ? C.gold : C.border}` }}>
              {sym} {code}
            </button>
          ))}
        </div>
      </Card>

      {/* Marge de sécurité */}
      <Card>
        <Lbl style={{ marginBottom:4 }}>MARGE DE SÉCURITÉ</Lbl>
        <div style={{ fontSize:11, color:C.muted, marginBottom:12 }}>
          Réservée avant de calculer ta capacité d'épargne.
        </div>

        {/* Boutons prédéfinis */}
        <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
          {SAFETY_MARGIN_OPTIONS.map(pct => {
            const active = !safetyIsCustom && state.settings.safetyMarginPct === pct;
            return (
              <button key={pct}
                onClick={() => upd({ safetyMarginPct: pct, safetyMarginCustom: null })}
                style={{ padding:"8px 14px", borderRadius:10,
                  fontFamily:"inherit", fontSize:13, fontWeight:700,
                  cursor:"pointer",
                  background: active ? C.gold : C.s2,
                  color:      active ? "#080E0A" : C.label,
                  border: `1px solid ${active ? C.gold : C.border}` }}>
                {pct}%
              </button>
            );
          })}
        </div>

        {/* Montant personnalisé */}
        <Field label="OU MONTANT FIXE PERSONNALISÉ (€)"
          type="number"
          value={state.settings.safetyMarginCustom || ""}
          onChange={e => {
            const v = parseAmt(e.target.value);
            upd({ safetyMarginCustom: v > 0 ? v : null });
          }}
          placeholder="Ex : 200"/>
        {safetyIsCustom && (
          <div style={{ marginTop:6, fontSize:11, color:C.gold }}>
            Marge fixe active : {state.settings.safetyMarginCustom} €
            <button onClick={() => upd({ safetyMarginCustom: null })}
              style={{ marginLeft:10, background:"none", border:"none",
                color:C.neg, cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>
              Annuler
            </button>
          </div>
        )}
      </Card>

      {/* Objectif d'épargne */}
      <Card>
        <Lbl style={{ marginBottom:8 }}>OBJECTIF D'ÉPARGNE</Lbl>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <input type="range" min={5} max={50} step={5}
            value={state.settings.savingsGoalPct || 20}
            onChange={e => upd({ savingsGoalPct: parseInt(e.target.value) })}
            style={{ flex:1, accentColor:C.gold }}/>
          <span style={{ fontSize:16, fontWeight:800, color:C.gold,
            minWidth:40, textAlign:"right" }}>
            {state.settings.savingsGoalPct || 20}%
          </span>
        </div>
        <div style={{ fontSize:11, color:C.muted, marginTop:6 }}>
          Taux cible affiché dans le Dashboard.
        </div>
      </Card>

      {/* Archivage mensuel */}
      <Card>
        <Lbl style={{ marginBottom:12 }}>HISTORIQUE MENSUEL</Lbl>
        <p style={{ fontSize:13, color:C.label, lineHeight:1.6, marginBottom:12 }}>
          Archive les données du mois en cours avant de commencer un nouveau mois.
          L'historique est conservé sur 24 mois.
        </p>
        <GoldBtn onClick={saveMonthSnapshot}>
          Archiver {MONTH_FULL[new Date().getMonth()]} {new Date().getFullYear()}
        </GoldBtn>
        {state.history.length > 0 && (
          <div style={{ marginTop:8, fontSize:12, color:C.label }}>
            {state.history.length} mois archivé(s)
          </div>
        )}
      </Card>

      {/* Stockage */}
      <Card>
        <Lbl style={{ marginBottom:8 }}>STOCKAGE LOCAL</Lbl>
        <div style={{ fontSize:13, color:C.label, marginBottom:4 }}>
          Espace utilisé : <span style={{ color:C.text, fontWeight:700 }}>{storageSize}</span>
        </div>
        <div style={{ fontSize:11, color:C.muted }}>
          Toutes les données restent sur cet appareil.
        </div>
      </Card>

      {/* Installer */}
      <Card>
        <Lbl style={{ marginBottom:10 }}>INSTALLER L'APPLICATION</Lbl>
        <p style={{ fontSize:13, color:C.label, lineHeight:1.6 }}>
          <span style={{ color:C.text, fontWeight:700 }}>iPhone :</span>
          {" "}Safari → Partager → "Sur l'écran d'accueil"<br/>
          <span style={{ color:C.text, fontWeight:700 }}>Android :</span>
          {" "}Chrome → ⋮ → "Installer l'application"
        </p>
      </Card>

      {/* Réinitialiser */}
      <button onClick={handleReset}
        style={{ padding:"14px", borderRadius:16,
          border:`1px solid ${C.neg}40`, background:`${C.neg}08`,
          color:C.neg, fontSize:14, fontWeight:700,
          cursor:"pointer", fontFamily:"inherit", width:"100%",
          letterSpacing:"0.04em" }}>
        ↺ Réinitialiser toutes les données
      </button>

      <div style={{ textAlign:"center", fontSize:11, color:C.muted }}>
        KACORP BUDGET V5 · Données locales uniquement
      </div>
    </div>
  );
}