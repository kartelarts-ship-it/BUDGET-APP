// KACORP BUDGET V5 - views/Objectifs.jsx

import { useState, useCallback } from "react";
import { C } from "../constants.js";
import { Card, GoldBtn } from "../components/UI.jsx";
import { GoalForm, GoalEditWrapper } from "../components/GoalForm.jsx";
import { GoalCard } from "../components/GoalCard.jsx";
import { EMPTY_GOAL } from "../constants.js";
import { parseAmt, uid, syncCurrent, computeCapacity } from "../utils/finance.js";

export function Objectifs({ state, set, inc, f, showToast }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId,  setEditId]  = useState(null);
  const [ng,      setNg]      = useState(EMPTY_GOAL);

  const totalExp = state.categories.reduce(
    (s, c) => s + parseAmt(state.expenses[c.id] || 0), 0
  );
  const { capaciteEpargne } = computeCapacity(inc, totalExp, state.settings);

  const addGoal = useCallback(() => {
    if (!ng.name.trim()) { showToast("Nom requis", "err"); return; }
    if (!ng.target || parseAmt(ng.target) <= 0) { showToast("Montant cible requis", "err"); return; }
   const initialAmount = Math.min(
  parseAmt(ng.current),
  parseAmt(ng.target)
);

const now = new Date();
const localDate =
  now.getFullYear() +
  "-" +
  String(now.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(now.getDate()).padStart(2, "0");

const contributions =
  initialAmount > 0
    ? [
        {
          id: uid(),
          amount: String(initialAmount),
          date: localDate,
          note: "Solde initial",
          type: "initialBalance",
        },
      ]
    : [];

const base = {
  id: uid(),
  ...ng,
  current: String(initialAmount),
  contributions,
};

const synced = syncCurrent(base);

set({
  goals: [...state.goals, synced],
});
    setNg(EMPTY_GOAL());
    setShowAdd(false);
    showToast("Objectif créé ✓");
  }, [ng, state.goals, set, showToast]);

  const saveGoal = useCallback((updatedGoal) => {
    const goals = state.goals.map(g => g.id === updatedGoal.id ? updatedGoal : g);
    set({ goals });
  }, [state.goals, set]);

  const saveEditedGoal = useCallback((id, patch) => {
    const goals = state.goals.map(g => g.id === id ? { ...g, ...patch } : g);
    set({ goals });
    setEditId(null);
    showToast("Objectif mis à jour ✓");
  }, [state.goals, set, showToast]);

  const deleteGoal = useCallback((id) => {
    if (!window.confirm("Supprimer cet objectif ?")) return;
    set({ goals: state.goals.filter(g => g.id !== id) });
    showToast("Objectif supprimé", "warn");
  }, [state.goals, set, showToast]);

  const totalSaved  = state.goals.reduce((s, g) => s + parseAmt(g.current), 0);
  const totalTarget = state.goals.reduce((s, g) => s + parseAmt(g.target), 0);

  return (
    <div className="screen" style={{ padding:"18px 14px", display:"flex",
      flexDirection:"column", gap:12 }}>

      {/* Résumé */}
      {state.goals.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Card style={{ textAlign:"center" }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
              color:C.label, marginBottom:6 }}>TOTAL ÉPARGNÉ</div>
            <div style={{ fontSize:20, fontWeight:800, color:C.pos }}>{f(totalSaved)}</div>
          </Card>
          <Card style={{ textAlign:"center" }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
              color:C.label, marginBottom:6 }}>TOTAL CIBLÉ</div>
            <div style={{ fontSize:20, fontWeight:800, color:C.gold }}>{f(totalTarget)}</div>
          </Card>
        </div>
      )}

      {/* État vide */}
      {state.goals.length === 0 && !showAdd && (
        <Card style={{ textAlign:"center", padding:"40px 20px" }}>
          <div style={{ fontSize:40, marginBottom:14 }}>🎯</div>
          <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:8 }}>
            Aucun objectif
          </div>
          <div style={{ fontSize:13, color:C.label, lineHeight:1.6 }}>
            Définis tes projets financiers :<br/>
            voyage, achat, épargne d'urgence…
          </div>
        </Card>
      )}

      {/* Formulaire nouveau */}
      {showAdd && (
        <GoalForm
          data={ng}
          onChange={patch => setNg(p => ({ ...p, ...patch }))}
          onSubmit={addGoal}
          onCancel={() => { setShowAdd(false); setNg(EMPTY_GOAL()); }}
          submitLabel="Créer l'objectif"
          capaciteEpargne={capaciteEpargne}
          inc={inc}
        />
      )}

      {/* Liste objectifs */}
      {state.goals.map(goal => {
        if (editId === goal.id) return (
          <GoalEditWrapper
            key={goal.id}
            goal={goal}
            capaciteEpargne={capaciteEpargne}
            inc={inc}
            onSave={(patch) => saveEditedGoal(goal.id, patch)}
            onCancel={() => setEditId(null)}
          />
        );
        return (
          <GoalCard
            key={goal.id}
            goal={goal}
            f={f}
            onUpdate={saveGoal}
            onDelete={() => deleteGoal(goal.id)}
            onEdit={() => setEditId(goal.id)}
            capaciteEpargne={capaciteEpargne}
          />
        );
      })}

      {/* Bouton ajouter */}
      {!showAdd && (
        <button onClick={() => setShowAdd(true)}
          style={{ padding:"14px", borderRadius:16,
            border:"1px dashed " + C.muted, background:"transparent",
            color:C.label, fontSize:14, fontWeight:600,
            cursor:"pointer", fontFamily:"inherit", width:"100%" }}>
          + Nouvel objectif financier
        </button>
      )}
    </div>
  );
}