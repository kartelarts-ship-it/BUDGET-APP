// KACORP BUDGET V5.1 - views/Dashboard.jsx

import { useState, useRef, useEffect } from "react";
import { C } from "../constants.js";
import { Card, Lbl, GhostBtn, Ring, Bar, Chip, StatRow } from "../components/UI.jsx";
import {
  parseAmt, fmtPct, computeCapacity, computeRealSavingsRate,
  distributeGoals, buildTips, versedThisMonth, computeGoalStatus,
  STATUS_COLORS,
} from "../utils/finance.js";

export function Dashboard({ state, set, inc, totalExp, f }) {
  const [editIncome, setEditIncome] = useState(false);
  const inputRef = useRef();
  useEffect(() => {
    if (editIncome) setTimeout(() => inputRef.current?.focus(), 80);
  }, [editIncome]);

  const { soldeDisponible, margeSecurite, capaciteEpargne } =
    computeCapacity(inc, totalExp, state.settings);

  const { totalVersed, rate: realSaveRate } =
    computeRealSavingsRate(state.goals, inc);

  const recRate = inc > 0 ? (state.settings.savingsGoalPct || 20) : 0;

  // Objectifs actifs (non suspendus, non atteints)
  const activeGoals = state.goals.filter(
    (g) => parseAmt(g.current) < parseAmt(g.target) && g.status !== "suspendu"
  );

  // Objectifs avec plan valide seulement (pour répartition et totaux)
  const goalsWithPlan = activeGoals.filter(
    (g) => g.selectedPlan && parseAmt(g.selectedPlan.monthly) > 0
  );

  // distributeGoals ne distribue déjà qu'aux objectifs avec plan
  const allocation = distributeGoals(activeGoals, capaciteEpargne);
  const totalAlloc = Object.values(allocation).reduce((s, v) => s + v, 0);

  // totalPlanned = somme des mensualités des objectifs AVEC plan uniquement
  const totalPlanned = goalsWithPlan.reduce(
    (s, g) => s + parseAmt(g.selectedPlan.monthly), 0
  );

  // totalVersedMonth = tous les versements ce mois (y compris objectifs sans plan)
  const totalVersedMonth = state.goals.reduce((s, g) => s + versedThisMonth(g), 0);

  const resteAVerser = Math.max(totalPlanned - totalVersedMonth, 0);
  const resteLibre   = capaciteEpargne - totalAlloc;

  // Déficit = plans planifiés vs capacité
  const deficitPlan = Math.max(totalPlanned - capaciteEpargne, 0);

  const badgeLabel = realSaveRate >= 20 ? "EXCELLENT"
    : realSaveRate >= 10 ? "BON"
    : realSaveRate > 0   ? "À AMÉLIORER" : "NON MESURÉ";
  const badgeColor = realSaveRate >= 20 ? C.pos
    : realSaveRate >= 10 ? "#34D399"
    : realSaveRate > 0   ? C.warn : C.muted;

  const planStatus =
    deficitPlan > 0          ? "insuffisant" :
    resteLibre > inc * 0.15  ? "confortable" :
    resteLibre > 0           ? "équilibré"   :
    resteLibre > -inc * 0.1  ? "serré"       : "insuffisant";

  const planColor =
    planStatus === "confortable" ? C.pos :
    planStatus === "équilibré"   ? C.gold :
    planStatus === "serré"       ? C.warn : C.neg;

  const essential = state.categories
    .filter(c => ["housing","food","health","transport"].includes(c.id))
    .reduce((s, c) => s + parseAmt(state.expenses[c.id] || 0), 0);
  const variable = totalExp - essential;

  const tips = buildTips({
    inc, totalExp, capaciteEpargne,
    goals:      state.goals,
    categories: state.categories,
    expenses:   state.expenses,
    f,
  });

  const lastDayOfMonth = new Date(
    new Date().getFullYear(), new Date().getMonth() + 1, 0
  ).getDate();

  return (
    <div className="screen" style={{ padding:"18px 14px", display:"flex",
      flexDirection:"column", gap:12 }}>

      {/* Revenu */}
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:12 }}>
          <Lbl>REVENU MENSUEL NET</Lbl>
          <GhostBtn onClick={() => setEditIncome(v => !v)}>
            {editIncome ? "✓ Valider" : "Modifier"}
          </GhostBtn>
        </div>
        {editIncome ? (
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:26, color:C.gold, fontWeight:700 }}>€</span>
            <input ref={inputRef} type="number" inputMode="decimal"
              value={state.income} placeholder="0"
              onChange={e => set({ income: e.target.value })}
              onBlur={() => setEditIncome(false)}
              style={{ background:"transparent", border:"none", outline:"none",
                color:C.text, fontSize:40, fontWeight:800, width:"100%",
                fontVariantNumeric:"tabular-nums", fontFamily:"inherit" }}/>
          </div>
        ) : (
          <div onClick={() => setEditIncome(true)} style={{ cursor:"pointer" }}>
            <div style={{ fontSize:44, fontWeight:800, color:C.text,
              fontVariantNumeric:"tabular-nums", letterSpacing:"-0.025em", lineHeight:1 }}>
              {f(inc)}
            </div>
            <div style={{ fontSize:11, color:C.label, marginTop:4 }}>Appuyer pour modifier</div>
          </div>
        )}
      </Card>

      {/* KPIs 2×2 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Card style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <Lbl>SOLDE DISPONIBLE</Lbl>
          <div style={{ fontSize:22, fontWeight:800, fontVariantNumeric:"tabular-nums",
            color: soldeDisponible >= 0 ? C.pos : C.neg }}>
            {soldeDisponible < 0 ? "−" : "+"}{f(Math.abs(soldeDisponible))}
          </div>
          <div style={{ fontSize:10, color:C.label }}>Revenu − Dépenses</div>
        </Card>

        <Card style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <Lbl>CAPACITÉ D'ÉPARGNE</Lbl>
          <div style={{ fontSize:22, fontWeight:800, fontVariantNumeric:"tabular-nums",
            color: capaciteEpargne > 0 ? C.gold : C.neg }}>
            {f(capaciteEpargne)}
          </div>
          <div style={{ fontSize:10, color:C.label }}>Après marge ({f(margeSecurite)})</div>
        </Card>

        <Card style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
          <Lbl>TAUX D'ÉPARGNE RÉEL</Lbl>
          <Ring value={Math.max(realSaveRate, 0)} max={100} color={badgeColor} size={72} sw={6}>
            <span style={{ fontSize:14, fontWeight:800, color:badgeColor }}>
              {fmtPct(Math.max(realSaveRate, 0))}
            </span>
          </Ring>
          <Chip label={badgeLabel} color={badgeColor}/>
          <div style={{ fontSize:9, color:C.muted, textAlign:"center" }}>Versements enregistrés</div>
        </Card>

        <Card style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <Lbl>TAUX RECOMMANDÉ</Lbl>
          <div style={{ fontSize:22, fontWeight:800, color:C.gold }}>{fmtPct(recRate)}</div>
          <div style={{ fontSize:11, color:C.label }}>soit {f(inc * recRate / 100)} / mois</div>
          <Bar value={totalVersed} max={Math.max(inc * recRate / 100, 1)}
            color={totalVersed >= inc * recRate / 100 ? C.pos : C.gold}/>
        </Card>
      </div>

      {/* Plan du mois */}
      <Card style={{ background:C.s2 }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:12 }}>
          <Lbl>PLAN DU MOIS</Lbl>
          <Chip label={planStatus.toUpperCase()} color={planColor}/>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
          <StatRow label="Revenu"                  value={f(inc)}/>
          <StatRow label="Dépenses obligatoires"   value={f(essential)}        color={C.blue}/>
          <StatRow label="Dépenses variables"      value={f(variable)}         color={C.purple}/>
          <StatRow label="Marge de sécurité"       value={f(margeSecurite)}    color={C.muted}
            sub={fmtPct(state.settings.safetyMarginPct || 10) + " du revenu"}/>
          <StatRow label="Capacité d'épargne"      value={f(capaciteEpargne)}  color={C.gold}/>
          <StatRow label="Plans configurés"        value={f(totalPlanned)}     color={C.text}
            sub={goalsWithPlan.length + " objectif(s) avec plan"}/>
          <StatRow label="Déjà versé ce mois"      value={f(totalVersedMonth)} color={C.pos}/>
          <StatRow label="Reste à verser"          value={f(resteAVerser)}
            color={resteAVerser > 0 ? C.warn : C.pos}/>
          <StatRow label="Reste libre"             value={f(Math.max(resteLibre, 0))}
            color={resteLibre > 0 ? C.pos : C.neg}/>
        </div>

        {/* Alerte déficit */}
        {deficitPlan > 0 && (
          <div style={{ marginTop:12, padding:"10px 12px",
            background: C.neg + "12", border:"1px solid " + C.neg + "40",
            borderRadius:10, fontSize:13, color:C.label, lineHeight:1.65 }}>
            🔴 Tes plans nécessitent{" "}
            <strong style={{ color:C.neg }}>{f(totalPlanned)}</strong>/mois
            {" "}mais ta capacité est de{" "}
            <strong style={{ color:C.gold }}>{f(capaciteEpargne)}</strong>.
            {" "}Il manque{" "}
            <strong style={{ color:C.neg }}>{f(deficitPlan)}</strong>/mois.
          </div>
        )}

        {deficitPlan === 0 && (
          <div style={{ marginTop:12, padding:"10px 12px",
            background: planColor + "10", border:"1px solid " + planColor + "30",
            borderRadius:10, fontSize:13, color:C.label, lineHeight:1.6 }}>
            {planStatus === "confortable" && "✅ Budget confortable. Bonne gestion."}
            {planStatus === "équilibré"   && "⚖️ Budget équilibré. Reste vigilant."}
            {planStatus === "serré"       && "⚠️ Budget serré. Surveille les dépenses variables."}
            {planStatus === "insuffisant" && "🔴 Budget insuffisant. Réduis les dépenses ou ajuste les objectifs."}
          </div>
        )}
      </Card>

      {/* Actions du mois */}
      {activeGoals.length > 0 && (
        <Card>
          <Lbl style={{ marginBottom:12 }}>ACTIONS DU MOIS</Lbl>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {activeGoals.map(g => {
              const gStatus  = computeGoalStatus(g);
              const gSCol    = STATUS_COLORS[gStatus];
              const hasPlan  = !!(g.selectedPlan && parseAmt(g.selectedPlan.monthly) > 0);
              const gPlanned = hasPlan ? parseAmt(g.selectedPlan.monthly) : null;
              const gVersed  = versedThisMonth(g);
              const gToVerse = gPlanned != null ? Math.max(gPlanned - gVersed, 0) : null;

              let actionLabel;
              if (!hasPlan) {
                actionLabel = "Plan à configurer";
              } else if (gToVerse <= 0) {
                actionLabel = "✅ Mensualité du mois validée";
              } else if (gVersed > 0) {
                actionLabel = "Il reste " + f(gToVerse) + " à verser avant le " + lastDayOfMonth;
              } else {
                actionLabel = "Verser " + f(gPlanned) + " avant le " + lastDayOfMonth;
              }

              return (
                <div key={g.id} style={{ display:"flex", alignItems:"center",
                  gap:10, padding:"10px 12px", background:C.s2,
                  borderRadius:12, border:"1px solid " + C.border }}>
                  <span style={{ fontSize:20 }}>{g.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {g.name}
                    </div>
                    <div style={{ fontSize:11,
                      color: !hasPlan ? C.label : C.label }}>
                      {actionLabel}
                    </div>
                  </div>
                  <Chip label={gStatus.toUpperCase()} color={gSCol}/>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Répartition — uniquement objectifs avec plan */}
      {activeGoals.length > 0 && (
        <Card>
          <Lbl style={{ marginBottom:12 }}>RÉPARTITION DE L'ÉPARGNE</Lbl>
          {goalsWithPlan.length === 0 ? (
            <div style={{ padding:"14px", background:C.bg, borderRadius:10,
              border:"1px solid " + C.border, fontSize:13, color:C.label,
              lineHeight:1.6, textAlign:"center" }}>
              Aucun objectif n'a encore de plan sélectionné.<br/>
              Configure un plan pour répartir ta capacité d'épargne.
            </div>
          ) : (
            <>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {goalsWithPlan.map(g => (
                  <div key={g.id}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:13, color:C.label }}>{g.icon} {g.name}</span>
                      <span style={{ fontSize:13, fontWeight:700, color:g.color,
                        fontVariantNumeric:"tabular-nums" }}>
                        {f(allocation[g.id] || 0)}/mois
                      </span>
                    </div>
                    <Bar value={allocation[g.id] || 0}
                      max={Math.max(totalAlloc, 1)} color={g.color}/>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:10, fontSize:11, color:C.muted }}>
                Total alloué : {f(totalAlloc)} · Capacité : {f(capaciteEpargne)}
                {activeGoals.length > goalsWithPlan.length && (
                  <span style={{ color:C.label }}>
                    {" · "}{activeGoals.length - goalsWithPlan.length} objectif(s) sans plan
                  </span>
                )}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Conseils */}
      {tips.length > 0 && (
        <Card style={{ background:C.s2 }}>
          <Lbl style={{ marginBottom:10 }}>CONSEILS PERSONNALISÉS</Lbl>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {tips.map((t, i) => (
              <div key={i} style={{ fontSize:13, color:C.label, lineHeight:1.6,
                padding:"8px 10px", background:C.border + "40", borderRadius:10 }}>
                {t.icon} {t.txt}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}