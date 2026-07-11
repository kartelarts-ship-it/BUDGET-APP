// ─── KACORP BUDGET V5 · components/GoalCard.jsx ─────────────────
// Carte d'objectif complète: progression, versements, simulation, statut.

import { useState, useCallback } from "react";
import { C } from "../constants.js";
import { Card, Lbl, Ring, Bar, Chip, GhostBtn, DangerBtn, GoldBtn } from "./UI.jsx";
import { ContributionForm } from "./ContributionForm.jsx";
import {
  parseAmt, fmtPct, clamp, computeGoalStatus, STATUS_COLORS,
  versedThisMonth, simulate, syncCurrent, daysRemainingInMonth,
} from "../utils/finance.js";

const SIM_OPTIONS = [25, 50, 100];

export function GoalCard({ goal, f, onUpdate, onDelete, capaciteEpargne, inc }) {
  const [showContrib, setShowContrib] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSim,     setShowSim]     = useState(false);
  const [simCustom,   setSimCustom]   = useState("");

  const cur    = parseAmt(goal.current);
  const tar    = parseAmt(goal.target) || 1;
  const pct    = clamp((cur / tar) * 100, 0, 100);
  const done   = cur >= tar;
  const rem    = Math.max(tar - cur, 0);
  const status = computeGoalStatus(goal);
  const sColor = STATUS_COLORS[status] || C.label;

  const versed  = versedThisMonth(goal);
  const planned = goal.selectedPlan ? parseAmt(goal.selectedPlan.monthly) : 0;
  const toVerse = Math.max(planned - versed, 0);
  const daysRem = daysRemainingInMonth();

  const dl     = goal.deadline
    ? Math.ceil((new Date(goal.deadline) - new Date()) / 86400000)
    : null;

  // Ajouter un versement
  const handleAddContrib = useCallback((contrib) => {
    const contributions = [...(goal.contributions || []), contrib];
    const updated = syncCurrent({ ...goal, contributions });
    updated.status = computeGoalStatus(updated);
    onUpdate(updated);
    setShowContrib(false);
  }, [goal, onUpdate]);

  // Supprimer un versement
  const handleDeleteContrib = useCallback((id) => {
    const contributions = (goal.contributions || []).filter(c => c.id !== id);
    const updated = syncCurrent({ ...goal, contributions });
    updated.status = computeGoalStatus(updated);
    onUpdate(updated);
  }, [goal, onUpdate]);

  // Suspendre / reprendre
  const toggleSuspend = () => {
    onUpdate({ ...goal, status: goal.status === "suspendu" ? "à jour" : "suspendu" });
  };

  // Adopter une simulation
  const adoptSim = (simResult) => {
    const newPlan = { ...goal.selectedPlan, monthly: simResult.newMonthly, months: simResult.newMonths, date: simResult.newDate, type: "personnalisé" };
    onUpdate({ ...goal, selectedPlan: newPlan });
    setShowSim(false);
  };

  return (
    <Card style={{ borderColor: done ? `${goal.color}60` : C.border,
      background: done ? `${goal.color}06` : C.s1 }}>

      {/* En-tête */}
      <div style={{ display:"flex", gap:12, marginBottom:14, alignItems:"flex-start" }}>
        <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, fontSize:22,
          background:`${goal.color}18`, display:"flex", alignItems:"center",
          justifyContent:"center" }}>
          {goal.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", flexWrap:"wrap", gap:4 }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.text, overflow:"hidden",
              textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"55%" }}>
              {goal.name}
            </div>
            <div style={{ display:"flex", gap:5, alignItems:"center", flexShrink:0 }}>
              <Chip label={status.toUpperCase()} color={sColor}/>
              {goal.priority !== "normale" && (
                <Chip
                  label={goal.priority === "prioritaire" ? "🔴 PRIO" : "🟢 SEC"}
                  color={goal.priority === "prioritaire" ? C.neg : C.pos}
                />
              )}
              {done
                ? <Chip label="ATTEINT ✓" color={goal.color}/>
                : dl !== null && <Chip
                    label={dl >= 0 ? dl + "j" : "EXPIRÉ"}
                    color={dl >= 0 ? C.warn : C.neg}/>
              }
            </div>
          </div>
          <div style={{ fontSize:11, color:C.label, marginTop:2 }}>
            Objectif : {f(tar)}
            {goal.selectedPlan && " · Plan : " + goal.selectedPlan.monthly + " €/mois"}
          </div>
        </div>
      </div>

      {/* Progression */}
      <div style={{ display:"flex", gap:14, alignItems:"center", marginBottom:14 }}>
        <Ring value={cur} max={tar} color={goal.color} size={70} sw={5}>
          <span style={{ fontSize:12, fontWeight:800, color:goal.color }}>
            {Math.round(pct)}%
          </span>
        </Ring>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:26, fontWeight:800, color:goal.color,
            fontVariantNumeric:"tabular-nums", marginBottom:2 }}>
            {f(cur)}
          </div>
          {done
            ? <div style={{ fontSize:12, color:goal.color, fontWeight:600 }}>🎉 Félicitations !</div>
            : <div style={{ fontSize:11, color:C.label }}>Encore {f(rem)} à atteindre</div>
          }
        </div>
      </div>
      <Bar value={cur} max={tar} color={goal.color} h={7}/>

      {/* Prochaine action */}
      {!done && planned > 0 && (
        <div style={{ marginTop:12, padding:"12px 14px",
          background: toVerse <= 0 ? `${C.pos}10` : `${C.gold}10`,
          border: `1px solid ${toVerse <= 0 ? C.pos : C.gold}30`,
          borderRadius:12 }}>
          <div style={{ fontSize:12, fontWeight:700,
            color: toVerse <= 0 ? C.pos : C.gold, marginBottom:4 }}>
            {toVerse <= 0 ? "✅ Prochaine action" : "📅 Prochaine action"}
          </div>
          {toVerse <= 0 ? (
            <div style={{ fontSize:13, color:C.label }}>
              Tu as déjà versé {f(versed)} ce mois-ci. {status === "en avance" ? "Tu es en avance !" : "Tu es à jour !"}
            </div>
          ) : (
            <div style={{ fontSize:13, color:C.label, lineHeight:1.6 }}>
              Mettre <strong style={{ color:C.gold }}>{f(toVerse)}</strong> de côté
              {daysRem > 0 ? " avant le " + (new Date(new Date().getFullYear(), new Date().getMonth()+1, 0)).getDate() + " du mois" : " aujourd'hui"}.
              <br/>
              <span style={{ fontSize:11, color:C.muted }}>
                Versé ce mois : {f(versed)} · Restant : {f(toVerse)} · {daysRem}j restants
              </span>
            </div>
          )}
        </div>
      )}

      {/* Plan d'épargne résumé */}
      {!done && goal.selectedPlan && (
        <div style={{ marginTop:8, fontSize:12, color:C.label }}>
          {goal.selectedPlan.monthly} €/mois · {goal.selectedPlan.months} mois · Fin : {goal.selectedPlan.date}
        </div>
      )}

      {/* Actions */}
      {!done && (
        <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
          <button onClick={() => setShowContrib(!showContrib)}
            style={{ flex:1, padding:"10px", borderRadius:10,
              border:`1.5px solid ${C.gold}50`, background:`${C.gold}10`,
              color:C.gold, fontSize:12, fontWeight:700, cursor:"pointer",
              fontFamily:"inherit", minWidth:120 }}>
            + Versement
          </button>
          <GhostBtn onClick={() => setShowSim(!showSim)}
            style={{ flex:1, minWidth:80 }}>
            Et si ?
          </GhostBtn>
          <GhostBtn onClick={toggleSuspend}
            style={{ flex:1, minWidth:80,
              color: goal.status==="suspendu" ? C.pos : C.label }}>
            {goal.status === "suspendu" ? "▶ Reprendre" : "⏸ Suspendre"}
          </GhostBtn>
        </div>
      )}

      {/* Formulaire versement */}
      {showContrib && (
        <div style={{ marginTop:12 }}>
          <ContributionForm
            goal={goal}
            onAdd={handleAddContrib}
            onCancel={() => setShowContrib(false)}
          />
        </div>
      )}

      {/* Simulation "Et si ?" */}
      {showSim && !done && (
        <div style={{ marginTop:12, padding:"14px", background:C.s2,
          border:`1px solid ${C.border}`, borderRadius:14 }}>
          <Lbl style={{ marginBottom:10 }}>ET SI JE VERSAIS PLUS ?</Lbl>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:10 }}>
            {SIM_OPTIONS.map(extra => {
              const sim = simulate(goal, extra);
              if (!sim) return null;
              return (
                <div key={extra} style={{ flex:1, minWidth:130, padding:"10px 12px",
                  background:C.s1, border:`1px solid ${C.border}`, borderRadius:10 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:4 }}>
                    +{extra} €/mois
                  </div>
                  <div style={{ fontSize:11, color:C.label, lineHeight:1.5 }}>
                    Fin : <span style={{ color:C.gold }}>{sim.newDate}</span>
                    {sim.gained != null && sim.gained > 0 &&
                      <><br/><span style={{ color:C.pos }}>{sim.gained} mois de gagnés</span></>
                    }
                  </div>
                  <button onClick={() => adoptSim(sim)}
                    style={{ marginTop:8, width:"100%", padding:"6px",
                      borderRadius:8, border:`1px solid ${C.gold}40`,
                      background:"transparent", color:C.gold, fontSize:11,
                      fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    Adopter ce plan
                  </button>
                </div>
              );
            })}
          </div>
          {/* Montant personnalisé */}
          <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
            <div style={{ flex:1 }}>
              <Lbl style={{ marginBottom:4 }}>MONTANT PERSONNALISÉ</Lbl>
              <input type="number" value={simCustom}
                onChange={e => setSimCustom(e.target.value)}
                placeholder="Ex : 75"
                inputMode="decimal"
                style={{ width:"100%", background:C.s1, border:`1px solid ${C.border}`,
                  borderRadius:8, padding:"8px 10px", fontSize:13, color:C.text,
                  outline:"none", fontFamily:"inherit" }}/>
            </div>
            {simCustom && parseAmt(simCustom) > 0 && (() => {
              const sim = simulate(goal, parseAmt(simCustom));
              if (!sim) return null;
              return (
                <div style={{ flex:2 }}>
                  <div style={{ fontSize:12, color:C.label }}>
                    Fin : <span style={{ color:C.gold }}>{sim.newDate}</span>
                    {sim.gained != null && sim.gained > 0 &&
                      <> · <span style={{ color:C.pos }}>+{sim.gained} mois</span></>
                    }
                  </div>
                  <button onClick={() => adoptSim(sim)}
                    style={{ marginTop:4, padding:"6px 12px", borderRadius:8,
                      border:`1px solid ${C.gold}40`, background:"transparent",
                      color:C.gold, fontSize:11, fontWeight:700,
                      cursor:"pointer", fontFamily:"inherit" }}>
                    Adopter
                  </button>
                </div>
              );
            })()}
          </div>
          <GhostBtn onClick={() => setShowSim(false)}
            style={{ marginTop:10, width:"100%" }}>Fermer</GhostBtn>
        </div>
      )}

      {/* Historique versements */}
      {(goal.contributions || []).length > 0 && (
        <div style={{ marginTop:10 }}>
          <button onClick={() => setShowHistory(!showHistory)}
            style={{ background:"none", border:"none", color:C.label,
              fontSize:12, cursor:"pointer", fontFamily:"inherit",
              padding:"4px 0" }}>
            {showHistory ? "▲" : "▼"} {(goal.contributions||[]).length} versement(s)
          </button>
          {showHistory && (
            <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:6 }}>
              {[...(goal.contributions||[])].reverse().map((c, i) => (
                <div key={c.id} style={{ display:"flex", alignItems:"center",
                  gap:10, padding:"8px 10px", background:C.s2,
                  borderRadius:10, border:`1px solid ${C.border}` }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700,
                      color:C.pos, fontVariantNumeric:"tabular-nums" }}>
                      +{f(parseAmt(c.amount))}
                    </div>
                    <div style={{ fontSize:11, color:C.label }}>
                      {c.date}
                      {c.note && " · " + c.note}
                    </div>
                  </div>
                  <DangerBtn onClick={() => handleDeleteContrib(c.id)}
                    style={{ padding:"4px 8px", fontSize:11 }}>
                    ✕
                  </DangerBtn>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Supprimer */}
      <DangerBtn onClick={onDelete}
        style={{ marginTop:12, width:"100%", padding:"8px",
          fontSize:12, fontWeight:700 }}>
        Supprimer cet objectif
      </DangerBtn>
    </Card>
  );
}