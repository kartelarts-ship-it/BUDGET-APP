import { useState, useEffect } from "react";

// ─── PALETTE ────────────────────────────────────────────────────────────────
const C = {
  bg:      "#0B1117",
  surface: "#111827",
  border:  "#1F2937",
  gold:    "#D8B56D",
  pos:     "#6EE7B7",
  neg:     "#F87171",
  muted:   "#6B7280",
  label:   "#9CA3AF",
  text:    "#F9FAFB",
};

// ─── CATÉGORIES ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "housing",   label: "Logement",      icon: "🏠", color: "#D8B56D" },
  { id: "food",      label: "Alimentation",  icon: "🛒", color: "#6EE7B7" },
  { id: "transport", label: "Transport",     icon: "🚗", color: "#60A5FA" },
  { id: "health",    label: "Santé",         icon: "❤️",  color: "#F87171" },
  { id: "leisure",   label: "Loisirs",       icon: "🎬", color: "#A78BFA" },
  { id: "savings",   label: "Épargne",       icon: "💰", color: "#34D399" },
  { id: "other",     label: "Autres",        icon: "📦", color: "#94A3B8" },
];

// ─── HELPERS ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }).format(n || 0);

const pct = (part, total) =>
  total === 0 ? 0 : Math.min(100, (part / total) * 100);

const STORAGE_KEY = "kacorp_budget_v1";

const defaultExpenses = () =>
  Object.fromEntries(CATEGORIES.map((c) => [c.id, ""]));

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
};

const save = (data) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
};

// ─── RING SVG ───────────────────────────────────────────────────────────────
function Ring({ pct: p, color, size = 120 }) {
  const r = 48;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(p, 100) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 110 110" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="55" cy="55" r={r} fill="none" stroke={C.border} strokeWidth="8" />
      <circle
        cx="55" cy="55" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s cubic-bezier(.4,0,.2,1), stroke 0.4s" }}
      />
    </svg>
  );
}

// ─── SPLASH SCREEN ──────────────────────────────────────────────────────────
function Splash({ onStart }) {
  return (
    <div style={S.splashRoot}>
      <div style={S.splashInner}>
        {/* Logo */}
        <div style={S.logoWrap}>
          <img
            src="/logo-kacorp.png"
            alt="KACORP"
            style={S.logo}
            onError={(e) => { e.target.style.display = "none"; }}
          />
        </div>

        {/* Brand */}
        <div style={S.splashBrand}>KACORP</div>
        <div style={S.splashTitle}>BUDGET</div>

        {/* Tagline */}
        <p style={S.splashTagline}>
          Maîtrisez vos finances.<br />
          Visualisez vos dépenses.<br />
          Avancez avec clarté.
        </p>

        {/* Gold divider */}
        <div style={S.goldLine} />

        {/* CTA */}
        <button style={S.splashBtn} onClick={onStart}>
          Commencer
        </button>

        <div style={S.splashFooter}>
          Données stockées localement · Confidentialité garantie
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────
export default function KaCorpBudget() {
  const saved = load();
  const [started, setStarted] = useState(!!saved);
  const [income, setIncome] = useState(saved?.income || "");
  const [expenses, setExpenses] = useState(saved?.expenses || defaultExpenses());
  const [active, setActive] = useState(null);

  const inc = parseFloat(income) || 0;
  const totalExpenses = CATEGORIES.reduce(
    (sum, c) => sum + (parseFloat(expenses[c.id]) || 0), 0
  );
  const balance = inc - totalExpenses;
  const isOver = balance < 0;
  const spentPct = pct(totalExpenses, inc);

  // Auto-save
  useEffect(() => {
    if (started) save({ income, expenses });
  }, [income, expenses, started]);

  const handleExpense = (id, val) =>
    setExpenses((prev) => ({ ...prev, [id]: val }));

  const handleReset = () => {
    if (!window.confirm("Réinitialiser toutes les données ?")) return;
    setIncome("");
    setExpenses(defaultExpenses());
    setActive(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (!started) return <Splash onStart={() => setStarted(true)} />;

  return (
    <div style={S.root}>
      {/* Header */}
      <header style={S.header}>
        <div style={S.headerLeft}>
          <img
            src="/logo-kacorp.png"
            alt="KACORP"
            style={S.headerLogo}
            onError={(e) => { e.target.style.display = "none"; }}
          />
          <div>
            <div style={S.headerBrand}>KACORP</div>
            <div style={S.headerSub}>BUDGET</div>
          </div>
        </div>
        <button style={S.resetBtn} onClick={handleReset} title="Réinitialiser">
          ↺
        </button>
      </header>

      <main style={S.main}>

        {/* ── REVENU ── */}
        <section style={S.card}>
          <label style={S.fieldLabel}>REVENU NET MENSUEL</label>
          <div style={S.incomeRow}>
            <span style={S.euroSign}>€</span>
            <input
              type="number"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="0"
              style={S.incomeInput}
              inputMode="decimal"
            />
          </div>
          {inc > 0 && (
            <div style={S.incomeStats}>
              <span style={{ color: C.label, fontSize: 13 }}>
                Dépensé · <b style={{ color: C.text }}>{fmt(totalExpenses)}</b>
              </span>
              <span style={{ fontSize: 13, color: isOver ? C.neg : C.pos, fontWeight: 700 }}>
                {isOver ? `−${fmt(Math.abs(balance))}` : `+${fmt(balance)}`}
              </span>
            </div>
          )}
        </section>

        {/* ── SOLDE CENTRAL (signature) ── */}
        {inc > 0 && (
          <section style={S.balanceSection}>
            <div style={S.ringWrap}>
              <Ring pct={spentPct} color={isOver ? C.neg : C.gold} size={140} />
              <div style={S.ringInner}>
                <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.12em", marginBottom: 4 }}>
                  {isOver ? "DÉPASSEMENT" : "SOLDE"}
                </div>
                <div style={{ ...S.balanceAmt, color: isOver ? C.neg : C.pos }}>
                  {isOver ? "−" : "+"}{fmt(Math.abs(balance))}
                </div>
                {!isOver && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {((balance / inc) * 100).toFixed(0)}% restant
                  </div>
                )}
              </div>
            </div>
            {/* Budget bar */}
            <div style={S.barBg}>
              <div style={{
                ...S.barFill,
                width: `${Math.min(spentPct, 100)}%`,
                background: isOver
                  ? C.neg
                  : `linear-gradient(90deg, ${C.gold}, ${C.pos})`,
              }} />
            </div>
            <div style={S.barLabels}>
              <span style={{ color: C.muted, fontSize: 11 }}>0 €</span>
              <span style={{ color: C.muted, fontSize: 11 }}>{fmt(inc)}</span>
            </div>
          </section>
        )}

        {/* ── CATÉGORIES ── */}
        <section>
          <div style={S.sectionTitle}>DÉPENSES PAR CATÉGORIE</div>
          <div style={S.grid}>
            {CATEGORIES.map((cat) => {
              const val = parseFloat(expenses[cat.id]) || 0;
              const p = pct(val, inc);
              const isAct = active === cat.id;
              return (
                <div
                  key={cat.id}
                  style={{
                    ...S.catCard,
                    borderColor: isAct ? cat.color : C.border,
                    boxShadow: isAct ? `0 0 0 1px ${cat.color}40, 0 8px 24px ${cat.color}18` : "none",
                  }}
                  onClick={() => setActive(isAct ? null : cat.id)}
                >
                  <div style={S.catTop}>
                    <span style={S.catEmoji}>{cat.icon}</span>
                    <span style={S.catLabel}>{cat.label}</span>
                    {inc > 0 && val > 0 && (
                      <span style={{ fontSize: 11, color: cat.color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {p.toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <div style={S.miniBarBg}>
                    <div style={{
                      ...S.miniBarFill,
                      width: `${p}%`,
                      background: cat.color,
                    }} />
                  </div>
                  <div style={S.catInputRow} onClick={(e) => e.stopPropagation()}>
                    <span style={{ color: C.muted, fontSize: 15, marginRight: 4 }}>€</span>
                    <input
                      type="number"
                      value={expenses[cat.id]}
                      onChange={(e) => handleExpense(cat.id, e.target.value)}
                      placeholder="0"
                      style={S.catInput}
                      inputMode="decimal"
                    />
                  </div>
                  {val > 0 && (
                    <div style={{ fontSize: 11, color: cat.color, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                      {fmt(val)} / mois
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── RÉCAPITULATIF ── */}
        {inc > 0 && totalExpenses > 0 && (
          <section style={S.card}>
            <div style={S.sectionTitle}>RÉCAPITULATIF</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {CATEGORIES
                .filter((c) => (parseFloat(expenses[c.id]) || 0) > 0)
                .sort((a, b) => (parseFloat(expenses[b.id]) || 0) - (parseFloat(expenses[a.id]) || 0))
                .map((cat) => {
                  const val = parseFloat(expenses[cat.id]) || 0;
                  const p = pct(val, totalExpenses);
                  return (
                    <div key={cat.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: C.label, display: "flex", alignItems: "center", gap: 6 }}>
                          <span>{cat.icon}</span> {cat.label}
                        </span>
                        <span style={{ fontSize: 13, color: cat.color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                          {fmt(val)}
                        </span>
                      </div>
                      <div style={{ height: 5, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${p}%`,
                          background: cat.color,
                          borderRadius: 99,
                          transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
                        }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* ── PIED ── */}
        <div style={S.footer}>
          Données stockées localement · Aucune donnée transmise
        </div>
      </main>
    </div>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────────────
const S = {
  // ── Splash ──
  splashRoot: {
    minHeight: "100dvh",
    background: C.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
    padding: "0 24px",
  },
  splashInner: {
    maxWidth: 380,
    width: "100%",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 0,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    background: C.surface,
    border: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    overflow: "hidden",
  },
  logo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  splashBrand: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.35em",
    color: C.gold,
    marginBottom: 6,
  },
  splashTitle: {
    fontSize: 42,
    fontWeight: 800,
    color: C.text,
    letterSpacing: "-0.02em",
    marginBottom: 28,
    lineHeight: 1,
  },
  splashTagline: {
    fontSize: 16,
    lineHeight: 1.7,
    color: C.label,
    marginBottom: 32,
    fontWeight: 400,
  },
  goldLine: {
    width: 48,
    height: 2,
    background: C.gold,
    borderRadius: 2,
    marginBottom: 32,
    opacity: 0.6,
  },
  splashBtn: {
    width: "100%",
    padding: "16px 0",
    borderRadius: 14,
    border: "none",
    background: C.gold,
    color: "#0B1117",
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
    cursor: "pointer",
    letterSpacing: "0.04em",
    marginBottom: 24,
    transition: "opacity 0.15s",
  },
  splashFooter: {
    fontSize: 11,
    color: C.muted,
    letterSpacing: "0.05em",
  },

  // ── App shell ──
  root: {
    minHeight: "100dvh",
    background: C.bg,
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
    color: C.text,
    maxWidth: 480,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 20px 16px",
    borderBottom: `1px solid ${C.border}`,
    position: "sticky",
    top: 0,
    background: C.bg,
    zIndex: 10,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    objectFit: "contain",
    background: C.surface,
    padding: 2,
  },
  headerBrand: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.25em",
    color: C.gold,
    lineHeight: 1,
  },
  headerSub: {
    fontSize: 15,
    fontWeight: 700,
    color: C.text,
    letterSpacing: "0.1em",
    lineHeight: 1.2,
  },
  resetBtn: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.muted,
    width: 38,
    height: 38,
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "sans-serif",
  },
  main: {
    padding: "20px 16px 48px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  // ── Cards ──
  card: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 18,
    padding: "20px 18px",
  },

  // ── Income ──
  fieldLabel: {
    fontSize: 10,
    letterSpacing: "0.2em",
    color: C.muted,
    display: "block",
    marginBottom: 12,
    fontWeight: 600,
  },
  incomeRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  euroSign: {
    fontSize: 28,
    color: C.gold,
    fontWeight: 700,
    lineHeight: 1,
  },
  incomeInput: {
    background: "transparent",
    border: "none",
    outline: "none",
    color: C.text,
    fontSize: "clamp(30px, 8vw, 48px)",
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
    fontVariantNumeric: "tabular-nums",
    width: "100%",
    letterSpacing: "-0.02em",
  },
  incomeStats: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTop: `1px solid ${C.border}`,
  },

  // ── Balance ring ──
  balanceSection: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 18,
    padding: "24px 18px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  ringWrap: {
    position: "relative",
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  ringInner: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  balanceAmt: {
    fontSize: "clamp(18px, 5vw, 26px)",
    fontWeight: 800,
    fontVariantNumeric: "tabular-nums",
    letterSpacing: "-0.02em",
    lineHeight: 1.1,
  },
  barBg: {
    width: "100%",
    height: 6,
    background: C.border,
    borderRadius: 99,
    overflow: "hidden",
    marginBottom: 6,
  },
  barFill: {
    height: "100%",
    borderRadius: 99,
    transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
  },
  barLabels: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
  },

  // ── Section title ──
  sectionTitle: {
    fontSize: 10,
    letterSpacing: "0.2em",
    color: C.muted,
    fontWeight: 700,
    marginBottom: 14,
  },

  // ── Category grid ──
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  catCard: {
    background: C.surface,
    border: `1px solid`,
    borderRadius: 16,
    padding: "16px 14px",
    cursor: "pointer",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  catTop: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  catEmoji: {
    fontSize: 16,
    lineHeight: 1,
  },
  catLabel: {
    flex: 1,
    fontSize: 12,
    color: C.label,
    fontWeight: 500,
  },
  miniBarBg: {
    height: 3,
    background: C.border,
    borderRadius: 99,
    overflow: "hidden",
    marginBottom: 12,
  },
  miniBarFill: {
    height: "100%",
    borderRadius: 99,
    transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
  },
  catInputRow: {
    display: "flex",
    alignItems: "center",
  },
  catInput: {
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${C.border}`,
    outline: "none",
    color: C.text,
    fontSize: 20,
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
    fontVariantNumeric: "tabular-nums",
    width: "100%",
    paddingBottom: 4,
    letterSpacing: "-0.01em",
  },

  // ── Footer ──
  footer: {
    textAlign: "center",
    fontSize: 11,
    color: C.muted,
    letterSpacing: "0.07em",
    paddingTop: 8,
  },
};