// ─── KACORP BUDGET V5 · components/GoalForm.jsx ─────────────────
// Formulaire de création / édition d'un objectif.
// Déclaré au niveau MODULE — jamais imbriqué dans un composant parent.
// C'est la garantie de stabilité du focus sur tous les champs.

import { useState, useCallback } from "react";
import { C, G_ICONS, COLORS, GOAL_SUGGESTIONS, PRIORITIES } from "../constants.js";
import { Card, Lbl, Field, GoldBtn, GhostBtn, Chip, InfoBox } from "./UI.jsx";
import {
  buildPlans, feasibilityCheck,
  parseAmt, fmtPct,
} from "../utils/finance.js";

// ── Formulaire principal ────────────────────────────────────────
export function GoalForm({ data, onChange, onSubmit, onCancel, submitLabel, capaciteEpargne, inc }) {
  const [customMonthly, setCustomMonthly] = useState("");

  const rem     = Math.max(parseAmt(data.target) - parseAmt(data.current), 0);
  const plans   = buildPlans(data, capaciteEpargne, inc, customMonthly ? parseAmt(customMonthly) : null);
  const feas    = data.deadline ? feasibilityCheck(data, capaciteEpargne) : { feasible: true };
  const isPast  = data.deadline && new Date(data.deadline) < new Date();

  const selectPlan = (plan) => onChange({ selectedPlan: plan });

  return (
    <Card>
      {/* Suggestions */}
      <Lbl style={{ marginBottom:10 }}>TYPE D'OBJECTIF</Lbl>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:16 }}>
        {GOAL_SUGGESTIONS.map(s => (
          <button key={s.name}
            onClick={() => onChange({ name:s.name, icon:s.icon, color:s.color })}
            style={{ padding:"6px 12px", borderRadius:20, fontSize:12, fontWeight:600,
              cursor:"pointer", fontFamily:"inherit",
              background:  data.name === s.name ? s.color : "transparent",
              color:       data.name === s.name ? "#080E0A" : C.label,
              border: `1px solid ${data.name === s.name ? s.color : C.border}` }}>
            {s.icon} {s.name}
          </button>
        ))}
      </div>

      <Field label="NOM DE L'OBJECTIF" value={data.name}
        onChange={e => onChange({ name: e.target.value })}
        placeholder="Ex : Voyage Japon, Fonds d'urgence…"
        style={{ marginBottom:12 }}/>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
        <Field label="MONTANT CIBLE (€)" type="number" value={data.target}
          onChange={e => onChange({ target: e.target.value })} placeholder="5 000"/>
        <Field label="DÉJÀ ÉPARGNÉ (€)" type="number" value={data.current}
          onChange={e => onChange({ current: e.target.value })} placeholder="0"/>
      </div>

      <Field label="DATE CIBLE (optionnelle)" type="date" value={data.deadline || ""}
        onChange={e => onChange({ deadline: e.target.value })}
        style={{ marginBottom:12, color: data.deadline ? C.text : C.label }}/>

      {/* Priorité */}
      <div style={{ marginBottom:16 }}>
        <Lbl style={{ marginBottom:8 }}>PRIORITÉ</Lbl>
        <div style={{ display:"flex", gap:8 }}>
          {PRIORITIES.map(p => (
            <button key={p}
              onClick={() => onChange({ priority: p })}
              style={{ flex:1, padding:"8px 0", borderRadius:10, fontFamily:"inherit",
                fontSize:12, fontWeight:700, cursor:"pointer",
                background: data.priority === p ? C.gold : "transparent",
                color:      data.priority === p ? "#080E0A" : C.label,
                border: `1px solid ${data.priority === p ? C.gold : C.border}` }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Alerte date passée */}
      {isPast && (
        <InfoBox color={C.neg} icon="⚠️" style={{ marginBottom:12 }}>
          La date cible est déjà passée. Choisis une nouvelle date.
        </InfoBox>
      )}

      {/* Faisabilité */}
      {data.deadline && !isPast && !feas.feasible && (
        <InfoBox color={C.warn} style={{ marginBottom:12 }}>
          <div style={{ fontWeight:700, color:C.warn, marginBottom:6 }}>
            ⚠️ Date trop ambitieuse
          </div>
          <div>
            La mensualité requise ({Math.round(feas.requiredMonthly)} €) dépasse
            ta capacité d'épargne ({Math.round(capaciteEpargne)} €).
          </div>
          {feas.realisticMonthly > 0 && (
            <div style={{ marginTop:6, color:C.text }}>
              Pour respecter ton budget, nous recommandons{" "}
              <strong style={{ color:C.gold }}>{feas.realisticMonthly} €</strong> par mois.
              Ton objectif serait atteint en{" "}
              <strong style={{ color:C.gold }}>{feas.realisticDate}</strong>.
            </div>
          )}
        </InfoBox>
      )}

      {/* Plans */}
      {rem > 0 && plans.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <Lbl style={{ marginBottom:10 }}>CHOISIR UN PLAN</Lbl>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {plans.map((plan, i) => {
              const selected = data.selectedPlan?.type === plan.type;
              return (
                <button key={i}
                  onClick={() => selectPlan(plan)}
                  style={{ padding:"12px 14px", borderRadius:12, cursor:"pointer",
                    fontFamily:"inherit", textAlign:"left", width:"100%",
                    background: selected ? `${C.gold}15` : C.s2,
                    border: `1.5px solid ${selected ? C.gold : C.border}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    alignItems:"center", marginBottom:4 }}>
                    <span style={{ fontSize:13, fontWeight:700,
                      color: selected ? C.gold : C.text }}>
                      {plan.type === "rapide"      && "⚡ Plan rapide"}
                      {plan.type === "équilibré"   && "⚖️ Plan équilibré"}
                      {plan.type === "confortable" && "🌿 Plan confortable"}
                      {plan.type === "personnalisé" && "✏️ Plan personnalisé"}
                    </span>
                    {plan.recommended && <Chip label="RECOMMANDÉ" color={C.gold}/>}
                    {selected && <Chip label="SÉLECTIONNÉ" color={C.pos}/>}
                  </div>
                  <div style={{ fontSize:12, color:C.label, lineHeight:1.6 }}>
                    <strong style={{ color:C.text }}>{plan.monthly} €</strong>/mois
                    {" · "}{plan.months} mois
                    {" · "}<span style={{ color:C.gold }}>{plan.date}</span>
                    {plan.pctInc != null && " · " + fmtPct(plan.pctInc) + " du revenu"}
                    {plan.impactMarge >= 0 &&
                      " · Marge restante : " + Math.round(plan.impactMarge) + " €"}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Plan personnalisé */}
          <div style={{ marginTop:8 }}>
            <Field label="MONTANT PERSONNALISÉ (€/mois)" type="number"
              value={customMonthly}
              onChange={e => setCustomMonthly(e.target.value)}
              placeholder="Ex : 150"/>
          </div>
        </div>
      )}

      {/* Icône + couleur */}
      <Lbl style={{ marginBottom:8 }}>ICÔNE</Lbl>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
        {G_ICONS.map(ic => (
          <button key={ic} onClick={() => onChange({ icon: ic })}
            style={{ fontSize:18, background: data.icon===ic ? C.s2 : "transparent",
              border:`1px solid ${data.icon===ic ? C.gold : C.border}`,
              borderRadius:8, padding:"4px 6px", cursor:"pointer" }}>
            {ic}
          </button>
        ))}
      </div>
      <Lbl style={{ marginBottom:8 }}>COULEUR</Lbl>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
        {COLORS.map(col => (
          <button key={col} onClick={() => onChange({ color: col })}
            style={{ width:26, height:26, borderRadius:"50%", background:col,
              border:`3px solid ${data.color===col ? C.text : "transparent"}`,
              cursor:"pointer" }}/>
        ))}
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <GoldBtn onClick={onSubmit} style={{ flex:1 }}>{submitLabel}</GoldBtn>
        <GhostBtn onClick={onCancel} style={{ flex:1, padding:"12px 0" }}>Annuler</GhostBtn>
      </div>
    </Card>
  );
}

// ── Wrapper d'édition avec state local (fix focus bug) ───────────
// Chaque GoalEditWrapper possède son propre draft — les frappes ne re-render pas le parent.
export function GoalEditWrapper({ goal, capaciteEpargne, inc, onSave, onCancel }) {
  const [draft, setDraft] = useState({ ...goal });
  const update = useCallback((patch) => setDraft(p => ({ ...p, ...patch })), []);
  return (
    <GoalForm
      data={draft}
      onChange={update}
      onSubmit={() => onSave(draft)}
      onCancel={onCancel}
      submitLabel="Enregistrer"
      capaciteEpargne={capaciteEpargne}
      inc={inc}
    />
  );
}