// ─── KACORP BUDGET V5 · views/Depenses.jsx ──────────────────────

import { useState } from "react";
import { C, ICONS, COLORS } from "../constants.js";
import { Card, Lbl, Field, GoldBtn, GhostBtn, Chip, Bar } from "../components/UI.jsx";
import { DonutChart } from "../components/Charts.jsx";
import { parseAmt, fmtPct, uid } from "../utils/finance.js";

export function Depenses({ state, set, inc, totalExp, balance, f, showToast }) {
  const [editId,  setEditId]  = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newCat,  setNewCat]  = useState({ label:"", icon:"📦", color:COLORS[0] });

  const updateExp = (id, v) =>
    set({ expenses: { ...state.expenses, [id]: v } });

  const updateCat = (id, patch) =>
    set({ categories: state.categories.map(c => c.id === id ? { ...c, ...patch } : c) });

  const deleteCat = (id) => {
    const { [id]:_, ...rest } = state.expenses;
    set({ categories: state.categories.filter(c => c.id !== id), expenses: rest });
    setEditId(null);
    showToast("Catégorie supprimée", "warn");
  };

  const addCat = () => {
    if (!newCat.label.trim()) { showToast("Nom requis", "err"); return; }
    set({ categories: [...state.categories, { id: uid(), ...newCat, budget:0 }] });
    setNewCat({ label:"", icon:"📦", color:COLORS[0] });
    setShowAdd(false);
    showToast("Catégorie ajoutée ✓");
  };

  const donutData = state.categories
    .map(c => ({ label:c.label, value:parseAmt(state.expenses[c.id]||0), color:c.color }))
    .filter(d => d.value > 0);

  return (
    <div className="screen" style={{ padding:"18px 14px", display:"flex",
      flexDirection:"column", gap:12 }}>

      {/* Synthèse */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Card style={{ textAlign:"center" }}>
          <Lbl style={{ marginBottom:6 }}>TOTAL DÉPENSÉ</Lbl>
          <div style={{ fontSize:22, fontWeight:800, color:C.text }}>{f(totalExp)}</div>
        </Card>
        <Card style={{ textAlign:"center" }}>
          <Lbl style={{ marginBottom:6 }}>SOLDE DISPONIBLE</Lbl>
          <div style={{ fontSize:22, fontWeight:800,
            color: balance >= 0 ? C.pos : C.neg }}>
            {f(Math.max(balance, 0))}
          </div>
        </Card>
      </div>

      {/* Donut */}
      {donutData.length > 0 && (
        <Card>
          <Lbl style={{ marginBottom:12 }}>RÉPARTITION</Lbl>
          <div style={{ display:"flex", gap:14, alignItems:"center" }}>
            <DonutChart data={donutData} size={130}/>
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:7 }}>
              {donutData.slice(0, 5).map((d, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:7, height:7, borderRadius:2,
                    background:d.color, flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:C.label, flex:1,
                    overflow:"hidden", textOverflow:"ellipsis",
                    whiteSpace:"nowrap" }}>{d.label}</span>
                  <span style={{ fontSize:11, fontWeight:700, color:d.color,
                    fontVariantNumeric:"tabular-nums" }}>
                    {totalExp > 0 ? fmtPct((d.value / totalExp) * 100) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Catégories */}
      {state.categories.map(cat => {
        const val    = parseAmt(state.expenses[cat.id] || 0);
        const over   = cat.budget > 0 && val > cat.budget;
        const isEd   = editId === cat.id;
        return (
          <Card key={cat.id}
            style={{ borderColor: isEd ? `${cat.color}60` : C.border }}>
            <div style={{ display:"flex", alignItems:"center",
              gap:10, marginBottom:12 }}>
              <span style={{ fontSize:22 }}>{cat.icon}</span>
              <span style={{ flex:1, fontSize:14, fontWeight:700 }}>
                {cat.label}
              </span>
              {over && !isEd && <Chip label="DÉPASSÉ" color={C.neg}/>}
              <GhostBtn onClick={() => setEditId(isEd ? null : cat.id)}>
                {isEd ? "✓" : "✏️"}
              </GhostBtn>
            </div>

            <Bar value={val}
              max={cat.budget > 0 ? cat.budget : Math.max(totalExp, val, 1)}
              color={over ? C.neg : cat.color}/>
            <div style={{ display:"flex", justifyContent:"space-between",
              marginTop:5, marginBottom:12 }}>
              <span style={{ fontSize:10, color:C.label }}>
                {inc > 0 ? fmtPct((val/inc)*100) + " du revenu" : ""}
              </span>
              {cat.budget > 0 && (
                <span style={{ fontSize:10, color: over ? C.neg : C.label }}>
                  Limite : {f(cat.budget)}
                </span>
              )}
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:16, color:C.gold, fontWeight:700 }}>€</span>
              <input type="number" inputMode="decimal"
                value={state.expenses[cat.id] || ""}
                onChange={e => updateExp(cat.id, e.target.value)}
                placeholder="0"
                style={{ background:"transparent", border:"none",
                  borderBottom:`1px solid ${C.border}`, outline:"none",
                  color: val > 0 ? cat.color : C.text, fontSize:28,
                  fontWeight:800, width:"100%", paddingBottom:4,
                  fontVariantNumeric:"tabular-nums", fontFamily:"inherit" }}/>
            </div>

            {isEd && (
              <div style={{ borderTop:`1px solid ${C.border}`,
                paddingTop:14, marginTop:14, display:"flex",
                flexDirection:"column", gap:12 }}>
                <Field label="NOM" value={cat.label}
                  onChange={e => updateCat(cat.id, { label:e.target.value })}
                  placeholder="Nom"/>
                <Field label="BUDGET LIMITE (€)" type="number"
                  value={cat.budget || ""}
                  onChange={e => updateCat(cat.id, { budget:parseAmt(e.target.value) })}
                  placeholder="Pas de limite"/>
                <div>
                  <Lbl style={{ marginBottom:8 }}>ICÔNE</Lbl>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {ICONS.map(ic => (
                      <button key={ic}
                        onClick={() => updateCat(cat.id, { icon:ic })}
                        style={{ fontSize:18, cursor:"pointer",
                          background: cat.icon===ic ? C.s2 : "transparent",
                          border:`1px solid ${cat.icon===ic ? C.gold : C.border}`,
                          borderRadius:8, padding:"4px 6px" }}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Lbl style={{ marginBottom:8 }}>COULEUR</Lbl>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {COLORS.map(col => (
                      <button key={col}
                        onClick={() => updateCat(cat.id, { color:col })}
                        style={{ width:26, height:26, borderRadius:"50%",
                          background:col, cursor:"pointer",
                          border:`3px solid ${cat.color===col ? C.text : "transparent"}` }}/>
                    ))}
                  </div>
                </div>
                <button onClick={() => deleteCat(cat.id)}
                  style={{ padding:"10px", borderRadius:12,
                    border:`1px solid ${C.neg}30`, background:`${C.neg}10`,
                    color:C.neg, fontSize:13, fontWeight:700,
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
          <Lbl style={{ marginBottom:12 }}>NOUVELLE CATÉGORIE</Lbl>
          <Field value={newCat.label}
            onChange={e => setNewCat(n => ({ ...n, label:e.target.value }))}
            placeholder="Nom (ex : Streaming)"
            style={{ marginBottom:12 }}/>
          <Lbl style={{ marginBottom:8 }}>ICÔNE</Lbl>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
            {ICONS.map(ic => (
              <button key={ic}
                onClick={() => setNewCat(n => ({ ...n, icon:ic }))}
                style={{ fontSize:18, cursor:"pointer",
                  background: newCat.icon===ic ? C.s2 : "transparent",
                  border:`1px solid ${newCat.icon===ic ? C.gold : C.border}`,
                  borderRadius:8, padding:"4px 6px" }}>
                {ic}
              </button>
            ))}
          </div>
          <Lbl style={{ marginBottom:8 }}>COULEUR</Lbl>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
            {COLORS.map(col => (
              <button key={col}
                onClick={() => setNewCat(n => ({ ...n, color:col }))}
                style={{ width:26, height:26, borderRadius:"50%",
                  background:col, cursor:"pointer",
                  border:`3px solid ${newCat.color===col ? C.text : "transparent"}` }}/>
            ))}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <GoldBtn onClick={addCat} style={{ flex:1 }}>Ajouter</GoldBtn>
            <GhostBtn onClick={() => setShowAdd(false)}
              style={{ flex:1, padding:"12px 0" }}>Annuler</GhostBtn>
          </div>
        </Card>
      ) : (
        <button onClick={() => setShowAdd(true)}
          style={{ padding:"14px", borderRadius:16,
            border:`1px dashed ${C.muted}`, background:"transparent",
            color:C.label, fontSize:14, fontWeight:600,
            cursor:"pointer", fontFamily:"inherit", width:"100%" }}>
          + Ajouter une catégorie
        </button>
      )}
    </div>
  );
}