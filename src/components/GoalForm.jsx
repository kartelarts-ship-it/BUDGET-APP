// KACORP BUDGET V5 - components/GoalForm.jsx
// Module-level - jamais imbrique dans un composant parent (garantie focus).

import { useState, useCallback } from "react";
import { C, G_ICONS, COLORS, GOAL_SUGGESTIONS, PRIORITIES } from "../constants.js";
import { Card, Lbl, Field, GoldBtn, SecondaryBtn, Chip, InfoBox } from "./UI.jsx";
import { buildTwoPlans, parseAmt, fmtPct, monthsUntil, formatDeadline } from "../utils/finance.js";

// PlanBlock - module-level
function PlanBlock({ plan, selected, onSelect }) {
  if (!plan) return null;
  const isAsked    = plan.type === "demandé";
  const infeasible = plan.feasible === false;
  return (
    <button
      onClick={() => !infeasible && onSelect(plan)}
      style={{ padding:"12px 14px", borderRadius:12,
        cursor: infeasible ? "default" : "pointer",
        fontFamily:"inherit", textAlign:"left", width:"100%",
        background: selected ? C.gold + "15" : infeasible ? C.neg + "08" : C.s2,
        border:"1.5px solid " + (
          selected ? C.gold : infeasible ? C.neg + "60" : C.border
        ),
        opacity: infeasible ? 0.8 : 1 }}>
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"center", marginBottom:5 }}>
        <span style={{ fontSize:13, fontWeight:700,
          color: selected ? C.gold : infeasible ? C.neg : C.text }}>
          {isAsked ? "📅 Plan selon ta date cible" : "⭐ Plan recommandé"}
        </span>
        <div style={{ display:"flex", gap:5 }}>
          {!isAsked && !infeasible && <Chip label="RECOMMANDÉ" color={C.gold}/>}
          {infeasible && <Chip label="HORS CAPACITÉ" color={C.neg}/>}
          {selected   && <Chip label="SÉLECTIONNÉ"   color={C.pos}/>}
        </div>
      </div>
      <div style={{ fontSize:13, color:C.label, lineHeight:1.65 }}>
        <strong style={{ color: infeasible ? C.neg : C.text, fontSize:16 }}>
          {plan.monthly} €
        </strong>
        <span style={{ fontSize:12 }}>/mois</span>
        {"  ·  "}
        <span style={{ color: infeasible ? C.label : C.gold }}>{plan.date}</span>
        {"  ·  "}{plan.months} mois
        {plan.pctInc != null && (
          <span style={{ color:C.muted, fontSize:11 }}>
            {"  ·  "}{fmtPct(plan.pctInc)} du revenu
          </span>
        )}
      </div>
      {plan.warning && plan.warningText && (
        <div style={{ marginTop:5, fontSize:11,
          color: infeasible ? C.neg : C.warn, lineHeight:1.5 }}>
          {infeasible ? "🔴" : "⚠️"} {plan.warningText}
        </div>
      )}
      {infeasible && (
        <div style={{ marginTop:4, fontSize:11, color:C.muted }}>
          Non sélectionnable — réduis les dépenses ou repousse la date cible.
        </div>
      )}
    </button>
  );
}

export function GoalForm({ data, onChange, onSubmit, onCancel, submitLabel, capaciteEpargne, inc, isEditing }) {
  const rem = Math.max(parseAmt(data.target) - parseAmt(data.current), 0);

  // Date passée = avant aujourd'hui en heure locale
  const isPast = (() => {
    if (!data.deadline) return false;
    const d = new Date(data.deadline + "T00:00:00");
    const today = new Date();
    return d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  })();

  const { planAsked, planRec, noReasonablePlan } = buildTwoPlans(data, capaciteEpargne, inc);

  const selectPlan = (plan) => {
    if (plan.feasible === false) return;
    onChange({ selectedPlan: plan });
  };

  // Invalider le plan quand les données changent
  const onTargetChange   = (e) => onChange({ target:   e.target.value, selectedPlan: null });
  const onCurrentChange  = (e) => onChange({ current:  e.target.value, selectedPlan: null });
  const onDeadlineChange = (e) => onChange({ deadline: e.target.value, selectedPlan: null });

  const hasContribs = isEditing && (data.contributions || []).length > 0;

  // Contexte numérique affiché sous les champs
  const moisCible = monthsUntil(data.deadline);
  const deadlineDisplay = formatDeadline(data.deadline);

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
              background: data.name === s.name ? s.color : "transparent",
              color:      data.name === s.name ? "#07110D" : C.label,
              border:"1px solid " + (data.name === s.name ? s.color : C.border) }}>
            {s.icon} {s.name}
          </button>
        ))}
      </div>

      <Field label="NOM DE L'OBJECTIF" value={data.name}
        onChange={e => onChange({ name: e.target.value })}
        placeholder="Ex : Voyage Japon, Fonds d'urgence..."
        style={{ marginBottom:12 }}/>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
        <Field label="MONTANT CIBLE (€)" type="number" value={data.target}
          onChange={onTargetChange} placeholder="5 000"/>

        {hasContribs ? (
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <Lbl>DÉJÀ ÉPARGNÉ (€)</Lbl>
            <div style={{ background:C.bg, border:"1px solid " + C.border,
              borderRadius:10, padding:"10px 12px", fontSize:14, color:C.label,
              fontVariantNumeric:"tabular-nums", minHeight:44, display:"flex",
              alignItems:"center", gap:6 }}>
              {data.current} €
              <span style={{ fontSize:10, color:C.muted }}>depuis les versements</span>
            </div>
          </div>
        ) : (
          <Field label="DÉJÀ ÉPARGNÉ (€)" type="number" value={data.current}
            onChange={onCurrentChange} placeholder="0"/>
        )}
      </div>

      <Field label="DATE CIBLE (optionnelle)" type="date" value={data.deadline || ""}
        onChange={onDeadlineChange}
        style={{ marginBottom:4, color: data.deadline ? C.text : C.label }}/>

      {/* Explication contextuelle des calculs */}
      {rem > 0 && (
        <div style={{ marginBottom:14, padding:"10px 12px",
          background:C.bg, border:"1px solid " + C.border, borderRadius:10,
          fontSize:12, color:C.label, lineHeight:1.7 }}>
          {parseAmt(data.target) > 0 && parseAmt(data.current) > 0 && (
            <div>
              Tu as accompli{" "}
              <strong style={{ color:C.text }}>
                {fmtPct(Math.min((parseAmt(data.current) / parseAmt(data.target)) * 100, 100))}
              </strong>{" "}
              de ton objectif. Il reste{" "}
              <strong style={{ color:C.text }}>{rem.toLocaleString("fr-FR")} €</strong>.
            </div>
          )}
          {moisCible != null && moisCible > 0 && rem > 0 && (
            <div>
              Pour respecter la date cible ({deadlineDisplay}), il faut environ{" "}
              <strong style={{ color:C.gold }}>
                {Math.ceil(rem / moisCible)} €/mois
              </strong>
              {" "}pendant {moisCible} mois.
            </div>
          )}
          {capaciteEpargne <= 0 && (
            <div style={{ color:C.neg, marginTop:4 }}>
              Ton budget ne libère aucune capacité après la marge de sécurité.
              Réduis une dépense, diminue la marge dans les Réglages, ou modifie la date cible.
            </div>
          )}
          {capaciteEpargne > 0 && moisCible != null && rem > 0 && (
            <div style={{ color: Math.ceil(rem/moisCible) <= capaciteEpargne ? C.pos : C.warn }}>
              {Math.ceil(rem/moisCible) <= capaciteEpargne
                ? "✓ Faisable avec ta capacité d'épargne (" + Math.round(capaciteEpargne) + " €)."
                : "Ta capacité d'épargne est de " + Math.round(capaciteEpargne) + " €. La date cible est ambitieuse."}
            </div>
          )}
        </div>
      )}

      {/* Priorite */}
      <div style={{ marginBottom:16 }}>
        <Lbl style={{ marginBottom:8 }}>PRIORITÉ</Lbl>
        <div style={{ display:"flex", gap:8 }}>
          {PRIORITIES.map(p => (
            <button key={p}
              onClick={() => onChange({ priority: p })}
              style={{ flex:1, padding:"9px 0", borderRadius:10, fontFamily:"inherit",
                fontSize:12, fontWeight:700, cursor:"pointer",
                background: data.priority === p ? C.gold : "transparent",
                color:      data.priority === p ? "#07110D" : C.label,
                border:"1px solid " + (data.priority === p ? C.gold : C.border) }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isPast && (
        <InfoBox color={C.neg} icon="⚠️" style={{ marginBottom:12 }}>
          La date cible est déjà passée. Choisis une nouvelle date.
        </InfoBox>
      )}

      {/* Plans */}
      {rem > 0 && (
        <div style={{ marginBottom:16 }}>
          <Lbl style={{ marginBottom:10 }}>CHOISIR UN PLAN</Lbl>

          {noReasonablePlan ? (
            <InfoBox color={C.neg} style={{ marginBottom:10 }}>
              <div style={{ fontWeight:700, color:C.neg, marginBottom:6 }}>
                Aucun plan raisonnable disponible.
              </div>
              <div style={{ fontSize:12, lineHeight:1.8 }}>
                Pour débloquer un plan :<br/>
                • Réduire une dépense pour dégager de la capacité<br/>
                • Réduire le montant cible<br/>
                • Repousser la date cible<br/>
                • Modifier la marge de sécurité dans les Réglages
              </div>
            </InfoBox>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <PlanBlock plan={planRec}   selected={data.selectedPlan?.type === "recommandé"} onSelect={selectPlan}/>
              <PlanBlock plan={planAsked} selected={data.selectedPlan?.type === "demandé"}    onSelect={selectPlan}/>
            </div>
          )}
        </div>
      )}

      {/* Icone + couleur */}
      <Lbl style={{ marginBottom:8 }}>ICÔNE</Lbl>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
        {G_ICONS.map(ic => (
          <button key={ic} onClick={() => onChange({ icon: ic })}
            style={{ fontSize:18, background: data.icon===ic ? C.s2 : "transparent",
              border:"1px solid " + (data.icon===ic ? C.gold : C.border),
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
              border:"3px solid " + (data.color===col ? C.text : "transparent"),
              cursor:"pointer" }}/>
        ))}
      </div>

      <div style={{ display:"flex", gap:10 }}>
        <GoldBtn onClick={onSubmit} style={{ flex:1 }}>{submitLabel}</GoldBtn>
        <SecondaryBtn onClick={onCancel} style={{ flex:1 }}>Annuler</SecondaryBtn>
      </div>
    </Card>
  );
}

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
      isEditing={true}
    />
  );
}