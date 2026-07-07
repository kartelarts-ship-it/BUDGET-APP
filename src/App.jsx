import { useState, useEffect } from "react";

const CATEGORIES = [
  { id: "housing", label: "Logement", icon: "⌂", color: "#E8C547" },
  { id: "food", label: "Alimentation", icon: "◈", color: "#5BE8A0" },
  { id: "transport", label: "Transport", icon: "◎", color: "#5BC8E8" },
  { id: "health", label: "Santé", icon: "✦", color: "#E85B8A" },
  { id: "leisure", label: "Loisirs", icon: "◇", color: "#A05BE8" },
  { id: "savings", label: "Épargne", icon: "◆", color: "#E87A5B" },
  { id: "other", label: "Autres", icon: "○", color: "#8AE85B" },
];

const fmt = (n) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const pct = (part, total) => (total === 0 ? 0 : Math.min(100, (part / total) * 100));

export default function BudgetCalculator() {
  const [income, setIncome] = useState("");
  const [expenses, setExpenses] = useState(
    Object.fromEntries(CATEGORIES.map((c) => [c.id, ""]))
  );
  const [active, setActive] = useState(null);
  const [animKey, setAnimKey] = useState(0);

  const totalExpenses = CATEGORIES.reduce(
    (sum, c) => sum + (parseFloat(expenses[c.id]) || 0),
    0
  );
  const inc = parseFloat(income) || 0;
  const balance = inc - totalExpenses;
  const isOver = balance < 0;

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [income, expenses]);

  const handleExpense = (id, val) => {
    setExpenses((prev) => ({ ...prev, [id]: val }));
  };

  return (
    <div style={styles.root}>
      {/* Background texture */}
      <div style={styles.bgGrid} />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTag}>BUDGET MENSUEL</div>
          <h1 style={styles.title}>Calculateur<br />de Budget</h1>
          <p style={styles.subtitle}>Visualisez, maîtrisez, équilibrez.</p>
        </div>

        {/* Income */}
        <div style={styles.incomeBlock}>
          <label style={styles.incomeLabel}>REVENU NET MENSUEL</label>
          <div style={styles.incomeInputRow}>
            <span style={styles.euroSign}>€</span>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="0"
              style={styles.incomeInput}
            />
          </div>
          <div style={styles.incomeBar}>
            <div
              style={{
                ...styles.incomeBarFill,
                width: inc > 0 ? `${pct(totalExpenses, inc)}%` : "0%",
                background: isOver
                  ? "linear-gradient(90deg, #E85B8A, #ff2d55)"
                  : "linear-gradient(90deg, #E8C547, #5BE8A0)",
                transition: "width 0.6s cubic-bezier(.4,0,.2,1), background 0.4s",
              }}
            />
          </div>
          {inc > 0 && (
            <div style={styles.incomeStats}>
              <span style={{ color: "#888" }}>Dépenses: <b style={{ color: "#fff" }}>{fmt(totalExpenses)}</b></span>
              <span style={{ color: isOver ? "#E85B8A" : "#5BE8A0" }}>
                {isOver ? "Dépassement: " : "Solde: "}
                <b>{fmt(Math.abs(balance))}</b>
              </span>
            </div>
          )}
        </div>

        {/* Categories Grid */}
        <div style={styles.grid}>
          {CATEGORIES.map((cat) => {
            const val = parseFloat(expenses[cat.id]) || 0;
            const p = pct(val, inc);
            const isActive = active === cat.id;
            return (
              <div
                key={cat.id}
                style={{
                  ...styles.card,
                  border: isActive
                    ? `2px solid ${cat.color}`
                    : "2px solid #1e1e1e",
                  boxShadow: isActive ? `0 0 24px ${cat.color}44` : "none",
                }}
                onClick={() => setActive(isActive ? null : cat.id)}
              >
                <div style={styles.cardTop}>
                  <span style={{ ...styles.cardIcon, color: cat.color }}>
                    {cat.icon}
                  </span>
                  <span style={styles.cardLabel}>{cat.label}</span>
                  <span style={{ ...styles.cardPct, color: cat.color }}>
                    {inc > 0 ? `${p.toFixed(0)}%` : "—"}
                  </span>
                </div>

                {/* Mini bar */}
                <div style={styles.miniBarBg}>
                  <div
                    style={{
                      ...styles.miniBarFill,
                      width: `${p}%`,
                      background: cat.color,
                      transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
                    }}
                  />
                </div>

                <div style={styles.cardInputRow}>
                  <span style={styles.cardEuro}>€</span>
                  <input
                    type="number"
                    value={expenses[cat.id]}
                    onChange={(e) => handleExpense(cat.id, e.target.value)}
                    placeholder="0"
                    style={styles.cardInput}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {val > 0 && inc > 0 && (
                  <div style={{ ...styles.cardAmount, color: cat.color }}>
                    {fmt(val)} / mois
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        {inc > 0 && (
          <div style={styles.summary}>
            <div style={styles.summaryTitle}>RÉCAPITULATIF</div>
            <div style={styles.summaryBars}>
              {CATEGORIES.filter((c) => (parseFloat(expenses[c.id]) || 0) > 0).map(
                (cat) => {
                  const val = parseFloat(expenses[cat.id]) || 0;
                  return (
                    <div key={cat.id} style={styles.summaryRow}>
                      <span style={{ ...styles.summaryLabel, color: cat.color }}>
                        {cat.icon} {cat.label}
                      </span>
                      <div style={styles.summaryBarBg}>
                        <div
                          style={{
                            height: "100%",
                            width: `${pct(val, totalExpenses)}%`,
                            background: cat.color,
                            borderRadius: 4,
                            transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
                          }}
                        />
                      </div>
                      <span style={{ ...styles.summaryVal, color: cat.color }}>
                        {fmt(val)}
                      </span>
                    </div>
                  );
                }
              )}
            </div>

            <div style={{ ...styles.balanceBadge, borderColor: isOver ? "#E85B8A" : "#5BE8A0" }}>
              <div style={styles.balanceLabel}>{isOver ? "DÉPASSEMENT" : "SOLDE DISPONIBLE"}</div>
              <div style={{ ...styles.balanceAmount, color: isOver ? "#E85B8A" : "#5BE8A0" }}>
                {isOver ? "−" : "+"}{fmt(Math.abs(balance))}
              </div>
              {!isOver && inc > 0 && (
                <div style={styles.balanceSub}>
                  {((balance / inc) * 100).toFixed(1)}% de vos revenus
                </div>
              )}
            </div>
          </div>
        )}

        <div style={styles.footer}>
          Données stockées localement · Aucune donnée transmise
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0a0a0a",
    fontFamily: "'Courier New', 'Courier', monospace",
    color: "#fff",
    position: "relative",
    overflow: "hidden",
  },
  bgGrid: {
    position: "fixed",
    inset: 0,
    backgroundImage:
      "linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    opacity: 0.5,
    pointerEvents: "none",
  },
  container: {
    maxWidth: 760,
    margin: "0 auto",
    padding: "48px 24px 64px",
    position: "relative",
  },
  header: {
    marginBottom: 48,
  },
  headerTag: {
    fontSize: 11,
    letterSpacing: "0.3em",
    color: "#555",
    marginBottom: 12,
  },
  title: {
    fontSize: "clamp(40px, 8vw, 72px)",
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: "-0.02em",
    margin: "0 0 16px",
    fontFamily: "'Georgia', serif",
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    letterSpacing: "0.1em",
    margin: 0,
  },
  incomeBlock: {
    background: "#111",
    border: "2px solid #222",
    borderRadius: 12,
    padding: "28px 32px",
    marginBottom: 32,
  },
  incomeLabel: {
    fontSize: 10,
    letterSpacing: "0.25em",
    color: "#555",
    display: "block",
    marginBottom: 12,
  },
  incomeInputRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  euroSign: {
    fontSize: 32,
    color: "#E8C547",
    fontWeight: 700,
  },
  incomeInput: {
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#fff",
    fontSize: "clamp(32px, 6vw, 56px)",
    fontWeight: 700,
    fontFamily: "'Courier New', monospace",
    width: "100%",
    letterSpacing: "-0.02em",
  },
  incomeBar: {
    height: 4,
    background: "#222",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 16,
  },
  incomeBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  incomeStats: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 16,
    marginBottom: 32,
  },
  card: {
    background: "#111",
    borderRadius: 10,
    padding: "20px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 18,
  },
  cardLabel: {
    flex: 1,
    fontSize: 12,
    letterSpacing: "0.1em",
    color: "#aaa",
    textTransform: "uppercase",
  },
  cardPct: {
    fontSize: 11,
    fontWeight: 700,
  },
  miniBarBg: {
    height: 2,
    background: "#222",
    borderRadius: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  miniBarFill: {
    height: "100%",
    borderRadius: 1,
  },
  cardInputRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  cardEuro: {
    color: "#444",
    fontSize: 18,
  },
  cardInput: {
    background: "transparent",
    border: "none",
    borderBottom: "1px solid #2a2a2a",
    outline: "none",
    color: "#fff",
    fontSize: 22,
    fontFamily: "'Courier New', monospace",
    fontWeight: 700,
    width: "100%",
    paddingBottom: 4,
  },
  cardAmount: {
    fontSize: 11,
    marginTop: 8,
    letterSpacing: "0.05em",
  },
  summary: {
    background: "#111",
    border: "2px solid #222",
    borderRadius: 12,
    padding: "28px 32px",
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 10,
    letterSpacing: "0.25em",
    color: "#555",
    marginBottom: 24,
  },
  summaryBars: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    marginBottom: 32,
  },
  summaryRow: {
    display: "grid",
    gridTemplateColumns: "120px 1fr 80px",
    alignItems: "center",
    gap: 12,
  },
  summaryLabel: {
    fontSize: 12,
    letterSpacing: "0.05em",
  },
  summaryBarBg: {
    height: 6,
    background: "#1e1e1e",
    borderRadius: 4,
    overflow: "hidden",
  },
  summaryVal: {
    fontSize: 12,
    textAlign: "right",
    fontWeight: 700,
  },
  balanceBadge: {
    border: "1px solid",
    borderRadius: 8,
    padding: "20px 24px",
    textAlign: "center",
  },
  balanceLabel: {
    fontSize: 10,
    letterSpacing: "0.25em",
    color: "#555",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: "clamp(28px, 5vw, 48px)",
    fontWeight: 900,
    fontFamily: "'Georgia', serif",
    letterSpacing: "-0.02em",
  },
  balanceSub: {
    fontSize: 12,
    color: "#555",
    marginTop: 4,
  },
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: "#333",
    letterSpacing: "0.1em",
  },
};