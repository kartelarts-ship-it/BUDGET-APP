// ─── KACORP BUDGET V5 · views/Stats.jsx ─────────────────────────

import { C, MONTHS, MONTH_FULL } from "../constants.js";
import { Card, Lbl, StatRow } from "../components/UI.jsx";
import { DonutChart, BarChart } from "../components/Charts.jsx";
import {
  parseAmt, fmtPct, computeCapacity, computeRealSavingsRate,
} from "../utils/finance.js";

export function Stats({ state, inc, totalExp, balance, f }) {
  const { capaciteEpargne } = computeCapacity(inc, totalExp, state.settings);
  const { totalVersed, rate: realSaveRate } = computeRealSavingsRate(state.goals, inc);

  // Historique
  const histData = [...state.history]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map(h => {
      const exp = Object.values(h.expenses || {}).reduce((s, v) => s + parseAmt(v), 0);
      const [, m] = h.month.split("-");
      return { label: MONTHS[parseInt(m) - 1], value: parseAmt(h.income) - exp };
    });
  histData.push({ label: MONTHS[new Date().getMonth()] + "*", value: balance });

  const monthStats = state.categories
    .map(c => ({ ...c, val: parseAmt(state.expenses[c.id] || 0) }))
    .filter(c => c.val > 0)
    .sort((a, b) => b.val - a.val);

  const biggest      = monthStats[0];
  const essential    = state.categories
    .filter(c => ["housing","food","health","transport"].includes(c.id))
    .reduce((s, c) => s + parseAmt(state.expenses[c.id] || 0), 0);
  const discretionary = totalExp - essential;

  const atteints = state.goals.filter(
    g => parseAmt(g.current) >= parseAmt(g.target)
  ).length;

  return (
    <div className="screen" style={{ padding:"18px 14px", display:"flex",
      flexDirection:"column", gap:12 }}>

      {/* Résumé */}
      <Card>
        <Lbl style={{ marginBottom:12 }}>RÉSUMÉ DU MOIS</Lbl>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          {[
            { label:"Revenus",   val:f(inc),       color:C.pos },
            { label:"Dépenses",  val:f(totalExp),  color:C.neg },
            { label:"Solde",     val:f(balance),   color:balance>=0?C.pos:C.neg },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ textAlign:"center", padding:"10px 4px",
              background:C.s2, borderRadius:12, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:10, color:C.label, marginBottom:4,
                letterSpacing:"0.08em" }}>{label.toUpperCase()}</div>
              <div style={{ fontSize:14, fontWeight:800, color,
                fontVariantNumeric:"tabular-nums" }}>{val}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Épargne réelle vs recommandée */}
      <Card>
        <Lbl style={{ marginBottom:12 }}>ÉPARGNE</Lbl>
        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
          <StatRow label="Épargne versée ce mois"   value={f(totalVersed)}
            color={C.pos}
            sub="Versements enregistrés dans les objectifs"/>
          <StatRow label="Taux d'épargne réel"      value={fmtPct(realSaveRate)}
            color={realSaveRate >= 20 ? C.pos : realSaveRate >= 10 ? C.warn : C.neg}/>
          <StatRow label="Capacité d'épargne"       value={f(capaciteEpargne)}
            color={C.gold}
            sub="Après marge de sécurité"/>
          <StatRow label="Taux recommandé"           value={fmtPct(state.settings.savingsGoalPct || 20)}
            color={C.label}/>
        </div>
      </Card>

      {/* Donut dépenses */}
      {monthStats.length > 0 && (
        <Card>
          <Lbl style={{ marginBottom:12 }}>GRAPHIQUE DE RÉPARTITION</Lbl>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:14 }}>
            <DonutChart
              data={monthStats.map(c => ({ label:c.label, value:c.val, color:c.color }))}
              size={170}/>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {monthStats.map(c => (
              <div key={c.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:2,
                  background:c.color, flexShrink:0 }}/>
                <span style={{ flex:1, fontSize:12, color:C.label }}>
                  {c.icon} {c.label}
                </span>
                <span style={{ fontSize:12, fontWeight:700, color:c.color,
                  fontVariantNumeric:"tabular-nums" }}>
                  {f(c.val)} · {totalExp > 0 ? fmtPct((c.val/totalExp)*100) : "—"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Bar chart évolution solde */}
      <Card>
        <Lbl style={{ marginBottom:12 }}>ÉVOLUTION DU SOLDE (6 mois)</Lbl>
        <BarChart data={histData} color={C.pos} h={100}/>
        <div style={{ fontSize:10, color:C.muted, marginTop:6 }}>* Mois en cours</div>
      </Card>

      {/* Stats détaillées */}
      <Card>
        <Lbl style={{ marginBottom:12 }}>STATISTIQUES</Lbl>
        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
          <StatRow label="Dépenses / revenu"
            value={inc > 0 ? fmtPct((totalExp/inc)*100) : "—"}/>
          <StatRow label="Dépenses essentielles"   value={f(essential)}      color={C.blue}/>
          <StatRow label="Dépenses non-essentielles" value={f(discretionary)} color={C.purple}/>
          {biggest && (
            <StatRow label={"Poste principal (" + biggest.label + ")"}
              value={f(biggest.val)} color={biggest.color}/>
          )}
          <StatRow label="Objectifs actifs"
            value={"" + state.goals.length} color={C.gold}/>
          <StatRow label="Objectifs atteints"
            value={"" + atteints} color={C.pos}/>
          <StatRow label="Marge de sécurité"
            value={f(
              state.settings.safetyMarginCustom > 0
                ? state.settings.safetyMarginCustom
                : inc * (state.settings.safetyMarginPct || 10) / 100
            )}
            color={C.muted}/>
        </div>
      </Card>

      {/* Historique archivé */}
      {state.history.length > 0 && (
        <Card>
          <Lbl style={{ marginBottom:12 }}>HISTORIQUE ARCHIVÉ</Lbl>
          {[...state.history].sort((a,b) => b.month.localeCompare(a.month)).map((h, i) => {
            const exp = Object.values(h.expenses||{}).reduce((s,v)=>s+parseAmt(v),0);
            const bal = parseAmt(h.income) - exp;
            const [y, m] = h.month.split("-");
            return (
              <div key={h.month} style={{ display:"flex", alignItems:"center",
                gap:12, padding:"11px 0",
                borderBottom: i < state.history.length-1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                  background: bal>=0 ? `${C.pos}15` : `${C.neg}15`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:11, fontWeight:700, color: bal>=0 ? C.pos : C.neg }}>
                  {MONTHS[parseInt(m)-1]}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>
                    {MONTH_FULL[parseInt(m)-1]} {y}
                  </div>
                  <div style={{ fontSize:11, color:C.label }}>
                    {f(parseAmt(h.income))} de revenus
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:14, fontWeight:800,
                    color: bal>=0 ? C.pos : C.neg,
                    fontVariantNumeric:"tabular-nums" }}>
                    {bal>=0?"+":"−"}{f(Math.abs(bal))}
                  </div>
                  <div style={{ fontSize:10, color:C.label }}>{f(exp)} dépensé</div>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Export PDF */}
      <button onClick={() => exportPDF(state, { inc, totalExp, balance, f, realSaveRate, capaciteEpargne })}
        style={{ padding:"15px", borderRadius:16, border:`1px solid ${C.goldDim}`,
          background:`${C.gold}10`, color:C.gold, fontSize:14, fontWeight:700,
          cursor:"pointer", fontFamily:"inherit", width:"100%",
          letterSpacing:"0.04em" }}>
        📄 Exporter le rapport PDF
      </button>
    </div>
  );
}

// ── Export PDF ─────────────────────────────────────────────────
function exportPDF(state, { inc, totalExp, balance, f, realSaveRate, capaciteEpargne }) {
  const d   = new Date();
  const ml  = MONTH_FULL[d.getMonth()] + " " + d.getFullYear();
  const isOver = balance < 0;
  const cats = state.categories
    .map(c => ({ ...c, val: parseAmt(state.expenses[c.id]||0) }))
    .filter(c => c.val > 0).sort((a,b) => b.val-a.val);

  const catsHTML = cats.map(c => {
    const p = totalExp>0 ? Math.round((c.val/totalExp)*100) : 0;
    return "<div style='display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f0f0f0'>"
      + "<span style='font-size:16px;width:24px'>" + c.icon + "</span>"
      + "<span style='flex:1;font-size:13px'>" + c.label + "</span>"
      + "<div style='width:80px;height:5px;background:#eee;border-radius:99px;overflow:hidden'>"
      +   "<div style='height:100%;width:" + p + "%;background:" + c.color + "'></div>"
      + "</div>"
      + "<span style='font-size:11px;color:#888;min-width:30px;text-align:right'>" + p + "%</span>"
      + "<span style='font-size:13px;font-weight:700;min-width:70px;text-align:right;color:" + c.color + "'>" + f(c.val) + "</span>"
      + "</div>";
  }).join("");

  const goalsHTML = state.goals.map(g => {
    const cur = parseAmt(g.current), tar = parseAmt(g.target);
    const pct = tar>0 ? Math.round((cur/tar)*100) : 0;
    const plan = g.selectedPlan ? g.selectedPlan.monthly + " €/mois" : "Sans plan";
    return "<div style='display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f0f0f0'>"
      + "<span style='font-size:16px;width:24px'>" + g.icon + "</span>"
      + "<div style='flex:1'>"
      +   "<div style='font-size:13px;font-weight:600'>" + g.name + "</div>"
      +   "<div style='font-size:11px;color:#888'>" + f(cur) + " / " + f(tar) + " · " + plan + "</div>"
      + "</div>"
      + "<div style='width:80px;height:5px;background:#eee;border-radius:99px;overflow:hidden'>"
      +   "<div style='height:100%;width:" + pct + "%;background:" + g.color + "'></div>"
      + "</div>"
      + "<span style='font-size:13px;font-weight:700;color:" + g.color + ";min-width:36px;text-align:right'>" + pct + "%</span>"
      + "</div>";
  }).join("");

  const html = "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'/>"
    + "<title>KACORP BUDGET V5 - " + ml + "</title>"
    + "<style>*{box-sizing:border-box;margin:0;padding:0}"
    + "body{font-family:Inter,sans-serif;background:#fff;color:#111;padding:40px;font-size:14px}"
    + ".hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;padding-bottom:18px;border-bottom:2px solid #D8B56D}"
    + ".brand{font-size:22px;font-weight:800}.brand span{color:#D8B56D}"
    + ".sec{margin-bottom:24px}.sec-t{font-size:10px;font-weight:700;letter-spacing:.2em;color:#888;text-transform:uppercase;margin-bottom:12px;padding-bottom:5px;border-bottom:1px solid #eee}"
    + ".grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}"
    + ".kpi{background:#f8f9fa;border-radius:10px;padding:12px;text-align:center;border:1px solid #eee}"
    + ".kpi-l{font-size:9px;font-weight:700;letter-spacing:.12em;color:#888;text-transform:uppercase;margin-bottom:5px}"
    + ".kpi-v{font-size:15px;font-weight:800}"
    + ".pos{color:#059669}.neg{color:#DC2626}.gold{color:#B8860B}"
    + ".ft{margin-top:32px;padding-top:14px;border-top:1px solid #eee;font-size:10px;color:#aaa;text-align:center}"
    + "</style></head><body>"
    + "<div class='hd'>"
    +   "<div class='brand'>KACORP <span>BUDGET</span> <span style='font-size:12px;color:#888'>V5</span></div>"
    +   "<div style='font-size:11px;color:#888'>" + ml + (state.settings.name ? " · " + state.settings.name : "") + "</div>"
    + "</div>"
    + "<div class='sec'><div class='sec-t'>Tableau de bord</div>"
    + "<div class='grid'>"
    +   "<div class='kpi'><div class='kpi-l'>Revenus</div><div class='kpi-v pos'>" + f(inc) + "</div></div>"
    +   "<div class='kpi'><div class='kpi-l'>Dépenses</div><div class='kpi-v neg'>" + f(totalExp) + "</div></div>"
    +   "<div class='kpi'><div class='kpi-l'>Capacité épargne</div><div class='kpi-v gold'>" + f(capaciteEpargne) + "</div></div>"
    +   "<div class='kpi'><div class='kpi-l'>Taux réel</div><div class='kpi-v " + (realSaveRate>=20?"pos":realSaveRate>=10?"gold":"neg") + "'>" + fmtPct(realSaveRate) + "</div></div>"
    + "</div></div>"
    + (cats.length > 0 ? "<div class='sec'><div class='sec-t'>Dépenses</div>" + catsHTML + "</div>" : "")
    + (state.goals.length > 0 ? "<div class='sec'><div class='sec-t'>Objectifs</div>" + goalsHTML + "</div>" : "")
    + "<div class='ft'>KACORP BUDGET V5 · " + d.toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"}) + " · Données confidentielles</div>"
    + "</body></html>";

  const win = window.open("", "_blank");
  if (!win) { alert("Autorisez les pop-ups pour générer le PDF."); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 600);
}