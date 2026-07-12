// KACORP BUDGET V5.1 - components/GoalCard.jsx
// selectedPlan.monthly n'est JAMAIS modifié par un boost ou une simulation.
// Cas A : pas de plan → "À CONFIGURER" + bouton "Configurer mon plan"
// Cas B : plan actif  → flux normal (mensualité, boost, dates)
// Cas C : plan obsolète → "PLAN À REVOIR" + bouton "Mettre à jour mon plan"

import { useState, useCallback } from "react";
import { C } from "../constants.js";
import { Card, Lbl, Ring, Bar, Chip, GoldBtn, SecondaryBtn, DiscreetBtn, DangerBtn } from "./UI.jsx";
import { ContributionForm } from "./ContributionForm.jsx";
import {
  parseAmt, clamp, computeGoalStatus, STATUS_COLORS,
  versedThisMonth, simulateBoost, syncCurrent, daysRemainingInMonth,
  estimatedEndDate, deadlineGapMonths, computePlanStatus,
  boostNeededForDeadline, formatDeadline, fmtPct,
} from "../utils/finance.js";

const BOOST_OPTIONS = [50, 100, 200];

const contribTypeLabel = (type) => {
  if (type === "monthlyPlan")      return "Plan mensuel";
  if (type === "boost")            return "⚡ Boost";
  if (type === "initialBalance")   return "Solde initial";
  if (type === "freeContribution") return "Libre";
  return "";
};

export function GoalCard({ goal, f, onUpdate, onDelete, capaciteEpargne, onEdit }) {
  const [contribMode, setContribMode] = useState(null);
  const [showBoost,   setShowBoost]   = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [boostCustom, setBoostCustom] = useState("");

  const cur    = parseAmt(goal.current);
  const tar    = parseAmt(goal.target) || 1;
  const pct    = clamp((cur / tar) * 100, 0, 100);
  const done   = cur >= tar;
  const rem    = Math.max(tar - cur, 0);
  const status = computeGoalStatus(goal);
  const sColor = STATUS_COLORS[status] || C.label;

  const hasPlan = !!(goal.selectedPlan && parseAmt(goal.selectedPlan.monthly) > 0);
  const planned  = hasPlan ? parseAmt(goal.selectedPlan.monthly) : 0;
  const versed   = versedThisMonth(goal);
  const toVerse  = hasPlan ? Math.max(planned - versed, 0) : 0;
  const daysRem  = daysRemainingInMonth();

  const lastDayOfMonth = new Date(
    new Date().getFullYear(), new Date().getMonth() + 1, 0
  ).getDate();

  const deadlineLabel = formatDeadline(goal.deadline);
  const { months: estMonths, label: estLabel } = estimatedEndDate(goal);
  const gap       = deadlineGapMonths(goal);
  const planCheck = hasPlan ? computePlanStatus(goal, capaciteEpargne) : { obsolete: false };
  const boostForDeadline = hasPlan ? boostNeededForDeadline(goal) : null;

  // ── Handlers ──────────────────────────────────────────────
  const handleAddContrib = useCallback((contrib) => {
    const contributions = [...(goal.contributions || []), contrib];
    const updated = syncCurrent({ ...goal, contributions });
    updated.status = computeGoalStatus(updated);
    onUpdate(updated);
    setContribMode(null);
  }, [goal, onUpdate]);

  const handleBoost = useCallback((amount) => {
    const sim = simulateBoost(goal, amount);
    if (!sim) return;
    const contrib = {
      id:     Date.now().toString(36),
      amount: sim.boostAmount,
      date:   new Date().toISOString().slice(0, 10),
      note:   "Coup de boost",
      type:   "boost",
    };
    const contributions = [...(goal.contributions || []), contrib];
    const updated = syncCurrent({ ...goal, contributions });
    updated.status = computeGoalStatus(updated);
    onUpdate(updated);
    setShowBoost(false);
    setBoostCustom("");
  }, [goal, onUpdate]);

  const handleDeleteContrib = useCallback((id) => {
    const contributions = (goal.contributions || []).filter(c => c.id !== id);
    const updated = syncCurrent({ ...goal, contributions });
    updated.status = computeGoalStatus(updated);
    onUpdate(updated);
  }, [goal, onUpdate]);

  const toggleSuspend = useCallback(() => {
    onUpdate({ ...goal, status: goal.status === "suspendu" ? "à faire" : "suspendu" });
  }, [goal, onUpdate]);

  // ── Rendu ─────────────────────────────────────────────────
  const borderColor = done            ? C.pos + "40"
    : planCheck.obsolete              ? C.warn + "60"
    : status === "à configurer"       ? C.label + "40"
    : C.border;

  return (
    <Card style={{ borderColor }}>

      {/* ── En-tête ── */}
      <div style={{ display:"flex", gap:12, marginBottom:14, alignItems:"flex-start" }}>
        <div style={{ width:46, height:46, borderRadius:13, flexShrink:0, fontSize:22,
          background: goal.color + "20", display:"flex", alignItems:"center",
          justifyContent:"center", border:"1px solid " + goal.color + "30" }}>
          {goal.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:4,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {goal.name}
          </div>
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", alignItems:"center" }}>
            {done ? (
              <Chip label="ATTEINT ✓" color={C.pos}/>
            ) : planCheck.obsolete ? (
              <Chip label="PLAN À REVOIR" color={C.warn}/>
            ) : (
              <Chip label={status.toUpperCase()} color={sColor}/>
            )}
            {goal.priority !== "normale" && (
              <Chip
                label={goal.priority === "prioritaire" ? "PRIO" : "SEC"}
                color={goal.priority === "prioritaire" ? C.neg : C.muted}/>
            )}
          </div>
        </div>
      </div>

      {/* ── Progression ── */}
      <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:12 }}>
        <Ring value={cur} max={tar} color={done ? C.pos : goal.color} size={66} sw={5}>
          <span style={{ fontSize:13, fontWeight:800,
            color: done ? C.pos : goal.color }}>
            {Math.round(pct)}%
          </span>
        </Ring>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:28, fontWeight:800,
            color: done ? C.pos : C.text,
            fontVariantNumeric:"tabular-nums", lineHeight:1, marginBottom:4 }}>
            {f(cur)}
          </div>
          <div style={{ fontSize:12, color:C.label }}>
            sur {f(tar)}
            {!done && rem > 0 && <> · encore <strong style={{ color:C.text }}>{f(rem)}</strong></>}
          </div>
        </div>
      </div>
      <Bar value={cur} max={tar} color={done ? C.pos : goal.color} h={5}
        style={{ marginBottom:14 }}/>

      {/* ════════════════════════════════════════════════
          CAS A — PAS DE PLAN
      ════════════════════════════════════════════════ */}
      {!done && !hasPlan && (
        <>
          {/* Date cible visible même sans plan */}
          {deadlineLabel && (
            <div style={{ padding:"10px 12px", background:C.s2,
              border:"1px solid " + C.border, borderRadius:10, marginBottom:12 }}>
              <div style={{ fontSize:10, color:C.label, fontWeight:700,
                letterSpacing:"0.1em", marginBottom:2 }}>DATE CIBLE</div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{deadlineLabel}</div>
            </div>
          )}

          {/* Message principal */}
          <div style={{ padding:"12px 14px", background:C.s2,
            border:"1px solid " + C.border, borderRadius:12, marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em",
              color:C.label, marginBottom:6 }}>PROCHAINE ACTION</div>
            <div style={{ fontSize:13, color:C.label, lineHeight:1.6 }}>
              Choisis un plan pour transformer cet objectif en action mensuelle.
            </div>
          </div>

          {/* Bouton principal */}
          <GoldBtn onClick={onEdit} style={{ minHeight:48, marginBottom:8 }}>
            Configurer mon plan
          </GoldBtn>
        </>
      )}

      {/* ════════════════════════════════════════════════
          CAS C — PLAN OBSOLÈTE
      ════════════════════════════════════════════════ */}
      {!done && hasPlan && planCheck.obsolete && (
        <>
          {/* Explication du problème */}
          <div style={{ padding:"10px 12px", background:C.warn + "10",
            border:"1px solid " + C.warn + "50", borderRadius:10, marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.warn, marginBottom:4 }}>
              ⚠️ Plan à revoir
            </div>
            <div style={{ fontSize:12, color:C.label, lineHeight:1.6 }}>
              {planCheck.reason}
              {planCheck.requiredMonthly && (
                <div style={{ marginTop:4 }}>
                  Besoin : <strong style={{ color:C.text }}>{planCheck.requiredMonthly} €/mois</strong>
                  {" · "}Plan actuel :{" "}
                  <strong style={{ color:C.warn }}>{planCheck.currentMonthly} €/mois</strong>
                </div>
              )}
            </div>
          </div>

          {/* Bouton principal */}
          <GoldBtn onClick={onEdit} style={{ minHeight:48, marginBottom:8 }}>
            Mettre à jour mon plan
          </GoldBtn>
        </>
      )}

      {/* ════════════════════════════════════════════════
          CAS B — PLAN ACTIF ET À JOUR
      ════════════════════════════════════════════════ */}
      {!done && hasPlan && !planCheck.obsolete && (
        <>
          {/* Explication des calculs */}
          <div style={{ padding:"10px 12px", background:C.bg, borderRadius:10,
            border:"1px solid " + C.border, marginBottom:12 }}>
            <div style={{ fontSize:13, color:C.label, lineHeight:1.65 }}>
              Tu as accompli{" "}
              <strong style={{ color:C.text }}>{fmtPct(pct)}</strong>{" "}
              de ton objectif. Il reste{" "}
              <strong style={{ color:C.text }}>{f(rem)}</strong>.
              {goal.deadline && (
                <>
                  {" "}Pour respecter la date cible, il faut environ{" "}
                  <strong style={{ color:C.gold }}>{planned} €/mois</strong>.
                </>
              )}
              {capaciteEpargne <= 0 && (
                <div style={{ marginTop:6, color:C.neg, fontSize:12 }}>
                  Ton budget ne libère aucune capacité après la marge de sécurité.
                </div>
              )}
            </div>
          </div>

          {/* Dates : cible vs estimée */}
          {(deadlineLabel || estLabel !== "—") && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
              {deadlineLabel && (
                <div style={{ padding:"10px 12px", background:C.s2,
                  border:"1px solid " + C.border, borderRadius:10 }}>
                  <div style={{ fontSize:10, color:C.label, fontWeight:700,
                    letterSpacing:"0.1em", marginBottom:3 }}>DATE CIBLE</div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{deadlineLabel}</div>
                </div>
              )}
              {estLabel !== "—" && (
                <div style={{ padding:"10px 12px", background:C.s2,
                  border:"1px solid " + (gap != null && gap > 0 ? C.warn + "60" : C.pos + "40"),
                  borderRadius:10 }}>
                  <div style={{ fontSize:10, color:C.label, fontWeight:700,
                    letterSpacing:"0.1em", marginBottom:3 }}>DATE ESTIMÉE</div>
                  <div style={{ fontSize:13, fontWeight:700,
                    color: gap != null && gap > 0 ? C.warn : C.pos }}>{estLabel}</div>
                  {gap != null && (
                    <div style={{ fontSize:10, marginTop:2,
                      color: gap > 0 ? C.warn : C.pos }}>
                      {gap > 0 ? "≈ " + gap + " mois de retard"
                        : gap < 0 ? "≈ " + Math.abs(gap) + " mois d'avance"
                        : "Dans les délais"}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Prochaine action */}
          <div style={{ padding:"12px 14px", borderRadius:12, marginBottom:14,
            background: toVerse <= 0 ? C.pos + "10" : C.s2,
            border:"1px solid " + (toVerse <= 0 ? C.pos + "40" : C.border) }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em",
              color:C.label, marginBottom:5 }}>PROCHAINE ACTION</div>
            {toVerse <= 0 ? (
              <div style={{ fontSize:14, fontWeight:700, color:C.pos }}>
                ✅ Mensualité du mois validée
                {status === "en avance" && (
                  <span style={{ fontSize:12, fontWeight:400, color:C.pos }}> · En avance !</span>
                )}
              </div>
            ) : versed > 0 ? (
              <div style={{ fontSize:14, color:C.text, fontWeight:600 }}>
                Il reste <span style={{ color:C.gold }}>{f(toVerse)}</span> avant le {lastDayOfMonth}
                <div style={{ fontSize:11, color:C.label, marginTop:3 }}>
                  Versé : {f(versed)} · Prévu : {f(planned)} · {daysRem}j restants
                </div>
              </div>
            ) : (
              <div style={{ fontSize:14, color:C.text, fontWeight:600 }}>
                Verser <span style={{ color:C.gold }}>{f(planned)}</span> avant le {lastDayOfMonth}
                <div style={{ fontSize:11, color:C.label, marginTop:3 }}>
                  {daysRem}j restants dans le mois
                </div>
              </div>
            )}
          </div>

          {/* Bouton principal + secondaires */}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <GoldBtn
              onClick={() => setContribMode(contribMode === "monthlyPlan" ? null : "monthlyPlan")}
              style={{ minHeight:48 }}>
              {toVerse <= 0 ? "Mensualité du mois validée ✓" : "J'ai versé la mensualité"}
            </GoldBtn>
            <div style={{ display:"flex", gap:8 }}>
              <SecondaryBtn
                onClick={() => setContribMode(contribMode === "freeContribution" ? null : "freeContribution")}
                style={{ flex:1 }}>
                Autre montant
              </SecondaryBtn>
              <SecondaryBtn
                onClick={() => { setShowBoost(!showBoost); setContribMode(null); }}
                style={{ flex:1,
                  color:  showBoost ? C.blue : C.text,
                  border: "1px solid " + (showBoost ? C.blue + "60" : "#537563") }}>
                ⚡ Boost
              </SecondaryBtn>
            </div>
          </div>

          {/* Formulaire versement */}
          {contribMode && (
            <div style={{ marginTop:12 }}>
              <ContributionForm goal={goal} type={contribMode}
                onAdd={handleAddContrib} onCancel={() => setContribMode(null)}/>
            </div>
          )}

          {/* Section Boost */}
          {showBoost && (
            <div style={{ marginTop:12, padding:"14px", background:C.bg,
              border:"1px solid " + C.blue + "40", borderRadius:14 }}>
              <Lbl style={{ marginBottom:6, color:C.blue }}>⚡ COUP DE BOOST</Lbl>
              <div style={{ fontSize:12, color:C.label, marginBottom:12, lineHeight:1.6 }}>
                Versement ponctuel sans modifier ton plan mensuel ({planned} €/mois).
              </div>

              {/* Proposition boost pour respecter la date cible */}
              {boostForDeadline != null && boostForDeadline > 0 && deadlineLabel && (
                <div style={{ padding:"10px 12px", background:C.blue + "10",
                  border:"1px solid " + C.blue + "30", borderRadius:10, marginBottom:12 }}>
                  <div style={{ fontSize:12, color:C.blue, fontWeight:600, marginBottom:3 }}>
                    Pour tenir le {deadlineLabel}
                  </div>
                  <div style={{ fontSize:12, color:C.label }}>
                    Il faut un boost d'environ{" "}
                    <strong style={{ color:C.blue }}>{f(boostForDeadline)}</strong> aujourd'hui.
                  </div>
                  {boostForDeadline <= rem && (
                    <button onClick={() => handleBoost(boostForDeadline)}
                      style={{ marginTop:8, width:"100%", padding:"8px",
                        borderRadius:8, border:"1px solid " + C.blue + "50",
                        background:C.blue + "15", color:C.blue,
                        fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                      Verser {f(boostForDeadline)} maintenant
                    </button>
                  )}
                </div>
              )}

              {boostForDeadline === 0 && deadlineLabel && (
                <div style={{ padding:"8px 12px", background:C.pos + "10",
                  border:"1px solid " + C.pos + "30", borderRadius:10, marginBottom:12,
                  fontSize:12, color:C.pos }}>
                  ✅ Avec ton plan actuel, tu peux respecter le {deadlineLabel}.
                </div>
              )}

              {/* Options rapides */}
              <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
                {BOOST_OPTIONS.map(amt => {
                  const sim = simulateBoost(goal, amt);
                  if (!sim) return null;
                  return (
                    <div key={amt} style={{ flex:"1 1 130px", padding:"12px",
                      background:C.s2, border:"1px solid " + C.border, borderRadius:12 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:6 }}>
                        +{amt} € maintenant
                      </div>
                      {sim.completesGoal ? (
                        <div style={{ fontSize:11, color:C.pos, marginBottom:6 }}>🎉 Objectif atteint !</div>
                      ) : (
                        <div style={{ fontSize:11, color:C.label, lineHeight:1.55, marginBottom:6 }}>
                          Reste : <strong style={{ color:C.text }}>{f(sim.newRem)}</strong><br/>
                          Date estimée : <span style={{ color:C.gold }}>{sim.newDate}</span>
                          {deadlineLabel && (
                            <><br/>Date cible : <span style={{ color:C.label }}>{deadlineLabel}</span></>
                          )}
                          {sim.gapAfterBoost != null && (
                            <><br/>
                              <span style={{ color: sim.gapAfterBoost > 0 ? C.warn : C.pos }}>
                                {sim.gapAfterBoost > 0
                                  ? "≈ " + sim.gapAfterBoost + " mois de retard restant"
                                  : "Dans les délais ✓"}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                      <button onClick={() => handleBoost(amt)}
                        style={{ width:"100%", padding:"7px", borderRadius:8,
                          border:"1px solid " + C.blue + "50", background:C.blue + "15",
                          color:C.blue, fontSize:11, fontWeight:700,
                          cursor:"pointer", fontFamily:"inherit" }}>
                        Verser {amt} €
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Montant personnalisé */}
              <Lbl style={{ marginBottom:6 }}>AUTRE MONTANT</Lbl>
              <input type="number" value={boostCustom}
                onChange={e => setBoostCustom(e.target.value)}
                placeholder="Ex : 75" inputMode="decimal"
                style={{ width:"100%", background:C.s2, border:"1px solid " + C.border,
                  borderRadius:8, padding:"9px 12px", fontSize:13, color:C.text,
                  outline:"none", fontFamily:"inherit", marginBottom:8 }}/>
              {boostCustom && parseAmt(boostCustom) > 0 && (() => {
                const sim = simulateBoost(goal, parseAmt(boostCustom));
                if (!sim) return null;
                return (
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:12, color:C.label, marginBottom:6, lineHeight:1.6 }}>
                      {sim.completesGoal ? (
                        <span style={{ color:C.pos }}>🎉 Objectif atteint !</span>
                      ) : (
                        <>
                          Reste : {f(sim.newRem)} · Fin estimée :{" "}
                          <span style={{ color:C.gold }}>{sim.newDate}</span>
                          {sim.gapAfterBoost != null && (
                            <> · <span style={{ color: sim.gapAfterBoost > 0 ? C.warn : C.pos }}>
                              {sim.gapAfterBoost > 0
                                ? sim.gapAfterBoost + " mois de retard"
                                : "Dans les délais ✓"}
                            </span></>
                          )}
                          <><br/>Plan mensuel inchangé : {planned} €/mois</>
                        </>
                      )}
                    </div>
                    <button onClick={() => handleBoost(parseAmt(boostCustom))}
                      style={{ width:"100%", padding:"9px", borderRadius:8,
                        border:"1px solid " + C.blue + "50", background:C.blue + "15",
                        color:C.blue, fontSize:12, fontWeight:700,
                        cursor:"pointer", fontFamily:"inherit" }}>
                      Ajouter ce versement exceptionnel
                    </button>
                  </div>
                );
              })()}
              <DiscreetBtn onClick={() => { setShowBoost(false); setBoostCustom(""); }}
                style={{ marginTop:6, width:"100%", textAlign:"center" }}>
                Fermer
              </DiscreetBtn>
            </div>
          )}
        </>
      )}

      {/* ── Zone secondaire repliable (tous les cas) ── */}
      <div style={{ marginTop:14, borderTop:"1px solid " + C.border, paddingTop:10 }}>
        <DiscreetBtn onClick={() => setShowDetails(!showDetails)}
          style={{ width:"100%", textAlign:"center", fontSize:11 }}>
          {showDetails ? "▲ Masquer les détails" : "▼ Voir les détails"}
        </DiscreetBtn>

        {showDetails && (
          <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:8 }}>
            {/* Versement libre même sans plan (dans les détails) */}
            {!hasPlan && !done && (
              <div>
                <DiscreetBtn
                  onClick={() => setContribMode(contribMode === "freeContribution" ? null : "freeContribution")}
                  style={{ fontSize:12 }}>
                  + Ajouter un versement libre
                </DiscreetBtn>
                {contribMode === "freeContribution" && (
                  <div style={{ marginTop:8 }}>
                    <ContributionForm goal={goal} type="freeContribution"
                      onAdd={handleAddContrib} onCancel={() => setContribMode(null)}/>
                  </div>
                )}
              </div>
            )}

            {/* Historique */}
            {(goal.contributions || []).length > 0 && (
              <div>
                <Lbl style={{ marginBottom:6 }}>HISTORIQUE DES VERSEMENTS</Lbl>
                <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                  {[...(goal.contributions || [])].reverse().map((c) => {
                    const typeLabel = contribTypeLabel(c.type);
                    const isBal    = c.type === "initialBalance";
                    const isBoost  = c.type === "boost";
                    return (
                      <div key={c.id} style={{ display:"flex", alignItems:"center",
                        gap:10, padding:"7px 10px", background:C.bg, borderRadius:8,
                        border:"1px solid " + (isBoost ? C.blue + "40" : C.border),
                        opacity: isBal ? 0.65 : 1 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:700,
                            fontVariantNumeric:"tabular-nums",
                            color: isBal ? C.muted : isBoost ? C.blue : C.pos }}>
                            +{f(parseAmt(c.amount))}
                            {typeLabel && (
                              <span style={{ fontSize:10, fontWeight:500, marginLeft:7,
                                color:C.label }}>{typeLabel}</span>
                            )}
                          </div>
                          <div style={{ fontSize:11, color:C.label }}>
                            {c.date}{c.note && " · " + c.note}
                          </div>
                        </div>
                        {!isBal && (
                          <DangerBtn onClick={() => handleDeleteContrib(c.id)}
                            style={{ padding:"3px 8px", fontSize:11 }}>✕</DangerBtn>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions secondaires */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <DiscreetBtn onClick={onEdit} style={{ flex:1, textAlign:"center" }}>
                ✏️ Modifier l'objectif
              </DiscreetBtn>
              <DiscreetBtn onClick={toggleSuspend}
                style={{ flex:1, textAlign:"center",
                  color: goal.status === "suspendu" ? C.pos : C.label }}>
                {goal.status === "suspendu" ? "▶ Reprendre" : "⏸ Suspendre"}
              </DiscreetBtn>
              <DangerBtn onClick={onDelete}
                style={{ flex:1, padding:"6px 10px", fontSize:11 }}>
                Supprimer
              </DangerBtn>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}