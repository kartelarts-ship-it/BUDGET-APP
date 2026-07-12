// KACORP BUDGET V5 - components/ContributionForm.jsx
// Module-level pour stabilite du focus.
// type : "monthlyPlan" | "freeContribution" | "boost"

import { useState } from "react";
import { C } from "../constants.js";
import { Card, Lbl, Field, Textarea, GoldBtn, GhostBtn } from "./UI.jsx";
import { parseAmt, uid, todayDate, versedThisMonth } from "../utils/finance.js";

const isoToday = () => {
  const d = todayDate();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") +
         "-" + String(d.getDate()).padStart(2,"0");
};

export function ContributionForm({ goal, type, onAdd, onCancel }) {
  const planned   = goal.selectedPlan ? parseAmt(goal.selectedPlan.monthly) : 0;
  const remaining = Math.max(parseAmt(goal.target) - parseAmt(goal.current), 0);

  // Pour monthlyPlan : préremplir seulement ce qui reste a verser ce mois
  // (mensualite prevue - deja verse ce mois), pas la mensualite complete
  const alreadyVersedThisMonth = versedThisMonth(goal);
  const stillDueThisMonth      = Math.max(planned - alreadyVersedThisMonth, 0);

  const defaultAmount =
    type === "monthlyPlan"
      ? String(Math.min(stillDueThisMonth, remaining))
      : "";

  const [amount, setAmount] = useState(defaultAmount);
  const [date,   setDate]   = useState(isoToday());
  const [note,   setNote]   = useState("");

  const titleMap = {
    monthlyPlan:      "VERSEMENT DE LA MENSUALITÉ",
    freeContribution: "AUTRE MONTANT",
    boost:            "COUP DE BOOST",
  };
  const title = titleMap[type] || "AJOUTER UN VERSEMENT";

  const handleSubmit = () => {
    const amt = parseAmt(amount);
    if (amt <= 0) return;
    onAdd({
      id:     uid(),
      amount: Math.min(amt, remaining),
      date,
      note:   note.trim(),
      type:   type || "freeContribution",
    });
  };

  return (
    <Card style={{ border:"1px solid " + C.gold + "40" }}>
      <Lbl style={{ marginBottom:12 }}>{title}</Lbl>

      {/* Resume mensualite pour le mode monthlyPlan */}
      {type === "monthlyPlan" && planned > 0 && (
        <div style={{ padding:"10px 14px", borderRadius:10, marginBottom:12,
          background: C.gold + "10", border:"1px solid " + C.gold + "40",
          fontSize:13, lineHeight:1.6 }}>
          <div style={{ color:C.gold, fontWeight:600 }}>
            Mensualité officielle : {planned} €
          </div>
          {alreadyVersedThisMonth > 0 && (
            <div style={{ color:C.label, fontSize:12, marginTop:2 }}>
              Déjà versé ce mois : {alreadyVersedThisMonth} €
              {" · "}Reste à verser :{" "}
              <strong style={{ color: stillDueThisMonth > 0 ? C.warn : C.pos }}>
                {stillDueThisMonth} €
              </strong>
            </div>
          )}
          {alreadyVersedThisMonth === 0 && (
            <div style={{ color:C.label, fontSize:12, marginTop:2 }}>
              Aucun versement ce mois-ci.
            </div>
          )}
        </div>
      )}

      {/* Info boost */}
      {type === "boost" && (
        <div style={{ padding:"10px 14px", borderRadius:10, marginBottom:12,
          background: C.blue + "10", border:"1px solid " + C.blue + "40",
          fontSize:12, color:C.blue }}>
          Ce versement exceptionnel avancera la progression sans modifier ta mensualité officielle.
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <Field label="MONTANT (€)" type="number" value={amount}
          onChange={e => setAmount(e.target.value)} placeholder="0" min="0"/>
        <Field label="DATE" type="date" value={date}
          onChange={e => setDate(e.target.value)} style={{ color:C.text }}/>
      </div>

      <Textarea label="NOTE (optionnelle)" value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Ex : Virement du 1er du mois..."/>

      {remaining > 0 && parseAmt(amount) > remaining && (
        <div style={{ marginTop:8, fontSize:11, color:C.warn }}>
          ⚠️ Dépasse le montant restant ({Math.round(remaining)} €). Sera limité automatiquement.
        </div>
      )}

      <div style={{ display:"flex", gap:10, marginTop:14 }}>
        <GoldBtn onClick={handleSubmit} style={{ flex:1 }}>Enregistrer</GoldBtn>
        <GhostBtn onClick={onCancel} style={{ flex:1, padding:"12px 0" }}>Annuler</GhostBtn>
      </div>
    </Card>
  );
}