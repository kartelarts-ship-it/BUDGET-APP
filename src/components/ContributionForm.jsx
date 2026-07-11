// ─── KACORP BUDGET V5 · components/ContributionForm.jsx ─────────
// Formulaire d'ajout de versement. Module-level pour stabilité du focus.

import { useState } from "react";
import { C } from "../constants.js";
import { Card, Lbl, Field, Textarea, GoldBtn, GhostBtn } from "./UI.jsx";
import { parseAmt, uid, todayDate } from "../utils/finance.js";

// today ISO string
const isoToday = () => {
  const d = todayDate();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") +
         "-" + String(d.getDate()).padStart(2,"0");
};

export function ContributionForm({ goal, onAdd, onCancel }) {
  const [amount, setAmount] = useState(
    goal.selectedPlan ? String(goal.selectedPlan.monthly) : ""
  );
  const [date,   setDate]   = useState(isoToday());
  const [note,   setNote]   = useState("");

  const planned   = goal.selectedPlan ? parseAmt(goal.selectedPlan.monthly) : 0;
  const remaining = Math.max(parseAmt(goal.target) - parseAmt(goal.current), 0);

  const handleQuick = () => {
    if (planned > 0) setAmount(String(Math.min(planned, remaining)));
  };

  const handleSubmit = () => {
    const amt = parseAmt(amount);
    if (amt <= 0) return;
    onAdd({ id: uid(), amount: Math.min(amt, remaining), date, note: note.trim() });
  };

  return (
    <Card style={{ border:`1px solid ${C.gold}40` }}>
      <Lbl style={{ marginBottom:12 }}>AJOUTER UN VERSEMENT</Lbl>

      {/* Bouton rapide */}
      {planned > 0 && (
        <button onClick={handleQuick}
          style={{ width:"100%", padding:"12px", borderRadius:12, marginBottom:12,
            background:`${C.gold}15`, border:`1.5px solid ${C.gold}50`,
            color:C.gold, fontSize:14, fontWeight:700, cursor:"pointer",
            fontFamily:"inherit", textAlign:"left" }}>
          ⚡ J'ai versé {planned} € (mensualité prévue)
        </button>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <Field label="MONTANT (€)" type="number" value={amount}
          onChange={e => setAmount(e.target.value)} placeholder="0"
          min="0"/>
        <Field label="DATE" type="date" value={date}
          onChange={e => setDate(e.target.value)}
          style={{ color:C.text }}/>
      </div>

      <Textarea label="NOTE (optionnelle)" value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Ex : Virement du 1er du mois…"/>

      {remaining > 0 && parseAmt(amount) > remaining && (
        <div style={{ marginTop:8, fontSize:11, color:C.warn }}>
          ⚠️ Ce versement dépasserait le montant restant ({Math.round(remaining)} €).
          Il sera automatiquement limité.
        </div>
      )}

      <div style={{ display:"flex", gap:10, marginTop:14 }}>
        <GoldBtn onClick={handleSubmit} style={{ flex:1 }}>Enregistrer</GoldBtn>
        <GhostBtn onClick={onCancel} style={{ flex:1, padding:"12px 0" }}>Annuler</GhostBtn>
      </div>
    </Card>
  );
}