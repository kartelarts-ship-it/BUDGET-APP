// ─── KACORP BUDGET V5 · utils/finance.js ────────────────────────
// Toutes les formules financières centralisées et documentées.

import { MONTH_FULL, PRIORITY_WEIGHTS, CURRENCY_SYMBOLS } from "../constants.js";

export const parseAmt = (v) =>
  Math.max(0, parseFloat(String(v || 0).replace(",", ".")) || 0);

export const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

export const fmt = (n, cur = "EUR") => {
  const sym = CURRENCY_SYMBOLS[cur] || "€";
  const str = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })
    .format(Math.abs(n || 0));
  return str + " " + sym;
};

export const fmtPct = (n) => Math.round(Math.max(0, n || 0)) + "%";

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const todayDate = () => new Date();

export const currentMonth = () => {
  const d = todayDate();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
};

export const daysRemainingInMonth = () => {
  const d   = todayDate();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return last - d.getDate();
};

// ── Marge de sécurité ──────────────────────────────────────────
// Si safetyMarginCustom défini → valeur fixe en €
// Sinon → safetyMarginPct % du revenu
export const computeSafetyMargin = (inc, settings) => {
  if (settings.safetyMarginCustom != null && settings.safetyMarginCustom > 0)
    return Math.min(parseAmt(settings.safetyMarginCustom), inc);
  const pct = settings.safetyMarginPct != null ? settings.safetyMarginPct : 10;
  return inc * (pct / 100);
};

// ── Capacité d'épargne ─────────────────────────────────────────
// soldeDisponible  = revenu − dépenses
// margeSecurite    = f(revenu, réglages)
// capaciteEpargne  = max(0, soldeDisponible − margeSecurite)
export const computeCapacity = (inc, totalExp, settings) => {
  const soldeDisponible = inc - totalExp;
  const margeSecurite   = computeSafetyMargin(inc, settings);
  return {
    soldeDisponible,
    margeSecurite,
    capaciteEpargne: Math.max(0, soldeDisponible - margeSecurite),
  };
};

// ── Taux d'épargne réel (basé sur versements enregistrés) ────
// NE PAS confondre avec le solde restant du mois
export const computeRealSavingsRate = (goals, inc) => {
  const month = currentMonth();
  const totalVersedAmt = goals.reduce((s, g) => {
    return s + (g.contributions || [])
      .filter((c) => c.date && c.date.startsWith(month))
      .reduce((a, c) => a + parseAmt(c.amount), 0);
  }, 0);
  return {
    totalVersed: totalVersedAmt,
    rate: inc > 0 ? (totalVersedAmt / inc) * 100 : 0,
  };
};

// ── Dates ──────────────────────────────────────────────────────
export const monthsUntil = (deadline) => {
  if (!deadline) return null;
  const d   = new Date(deadline);
  const now = todayDate();
  return Math.max(0,
    (d.getFullYear() - now.getFullYear()) * 12 +
    (d.getMonth() - now.getMonth())
  );
};

export const dateFromNowMonths = (n) => {
  if (!n || n <= 0) return "—";
  const d = new Date();
  d.setMonth(d.getMonth() + Math.round(n));
  return MONTH_FULL[d.getMonth()] + " " + d.getFullYear();
};

// ── Plans d'épargne ────────────────────────────────────────────
// Plan rapide      = min(50% capacité, montant restant)
// Plan équilibré   = min(25% capacité, montant restant)  ← recommandé
// Plan confortable = min(10% capacité, montant restant)
export const buildPlans = (goal, capaciteEpargne, inc, customMonthly) => {
  const rem = Math.max(parseAmt(goal.target) - parseAmt(goal.current), 0);
  if (rem <= 0) return [];
  const cap = Math.max(capaciteEpargne, 0);

  const makePlan = (type, monthly, recommended) => {
    const m = Math.min(Math.max(monthly, 1), rem, cap > 0 ? cap : rem);
    if (m <= 0) return null;
    const months = Math.ceil(rem / m);
    return {
      type,
      monthly:      Math.round(m),
      months,
      date:         dateFromNowMonths(months),
      pctInc:       inc > 0 ? (m / inc) * 100 : null,
      impactMarge:  cap - m,
      recommended:  !!recommended,
    };
  };

  const plans = [
    makePlan("rapide",      cap * 0.5),
    makePlan("équilibré",   cap * 0.25, true),
    makePlan("confortable", cap * 0.1),
  ].filter(Boolean);

  if (customMonthly != null && customMonthly > 0) {
    const cp = makePlan("personnalisé", customMonthly);
    if (cp) plans.push(cp);
  }
  return plans;
};

// ── Faisabilité d'une date cible ──────────────────────────────
// montant_restant / mois_restants = mensualité_requise
// Si mensualité_requise > capacite → date trop ambitieuse
export const feasibilityCheck = (goal, capaciteEpargne) => {
  const rem    = Math.max(parseAmt(goal.target) - parseAmt(goal.current), 0);
  const months = monthsUntil(goal.deadline);
  if (!months || months === 0 || rem === 0) return { feasible: true };
  const required = rem / months;
  const cap      = Math.max(capaciteEpargne, 0);
  if (cap <= 0) {
    return {
      feasible: false,
      reason: "Aucune capacité d'épargne disponible.",
      requiredMonthly:  required,
      realisticMonthly: 0,
      realisticMonths:  null,
      realisticDate:    "—",
    };
  }
  if (required > cap) {
    const realistic = Math.min(cap * 0.25, rem);
    const rMonths   = realistic > 0 ? Math.ceil(rem / realistic) : null;
    return {
      feasible:         false,
      requiredMonthly:  required,
      realisticMonthly: Math.round(realistic),
      realisticMonths:  rMonths,
      realisticDate:    dateFromNowMonths(rMonths),
    };
  }
  return { feasible: true, requiredMonthly: required };
};

// ── Versements ─────────────────────────────────────────────────
export const versedThisMonth = (goal) => {
  const month = currentMonth();
  return (goal.contributions || [])
    .filter((c) => c.date && c.date.startsWith(month))
    .reduce((s, c) => s + parseAmt(c.amount), 0);
};

// Recalcule goal.current comme somme de tous les versements
export const syncCurrent = (goal) => {
  const total = (goal.contributions || []).reduce((s, c) => s + parseAmt(c.amount), 0);
  return { ...goal, current: String(total) };
};

// ── Statut ────────────────────────────────────────────────────
// atteint   : current >= target
// suspendu  : marqué manuellement
// en avance : versé >= 110% du prévu
// à jour    : versé >= 90% du prévu
// en retard : versé < 90% du prévu
export const computeGoalStatus = (goal) => {
  const cur = parseAmt(goal.current);
  const tar = parseAmt(goal.target);
  if (tar > 0 && cur >= tar) return "atteint";
  if (goal.status === "suspendu") return "suspendu";
  const planned = goal.selectedPlan ? parseAmt(goal.selectedPlan.monthly) : 0;
  const versed  = versedThisMonth(goal);
  if (planned <= 0) return "à jour";
  if (versed >= planned * 1.1) return "en avance";
  if (versed >= planned * 0.9) return "à jour";
  return "en retard";
};

export const STATUS_COLORS = {
  "atteint":   "#34D399",
  "en avance": "#6EE7B7",
  "à jour":    "#D8B56D",
  "en retard": "#F87171",
  "suspendu":  "#94A3B8",
};

// ── Simulation "Et si ?" ───────────────────────────────────────
export const simulate = (goal, extraMonthly) => {
  const rem     = Math.max(parseAmt(goal.target) - parseAmt(goal.current), 0);
  const current = goal.selectedPlan ? parseAmt(goal.selectedPlan.monthly) : 0;
  const newM    = current + extraMonthly;
  if (newM <= 0 || rem <= 0) return null;
  const newMonths  = Math.ceil(rem / newM);
  const oldMonths  = current > 0 ? Math.ceil(rem / current) : null;
  const gained     = oldMonths != null ? oldMonths - newMonths : null;
  return {
    newMonthly: newM,
    newMonths,
    newDate:    dateFromNowMonths(newMonths),
    gained,
  };
};

// ── Répartition entre objectifs ───────────────────────────────
// 1ère passe: respecte les plans choisis
// 2ème passe: pondération par priorité sur le reste
// Redistribue l'excédent si un objectif est déjà atteint
export const distributeGoals = (goals, capaciteEpargne) => {
  const active = goals.filter(
    (g) =>
      parseAmt(g.current) < parseAmt(g.target) &&
      g.status !== "suspendu"
  );
  if (!active.length || capaciteEpargne <= 0) return {};

  let remaining = capaciteEpargne;
  const result  = {};

  // Passe 1: plans explicites
  active.forEach((g) => {
    if (g.selectedPlan) {
      const planned = parseAmt(g.selectedPlan.monthly);
      const rem     = Math.max(parseAmt(g.target) - parseAmt(g.current), 0);
      const alloc   = Math.min(planned, rem, remaining);
      result[g.id]  = alloc;
      remaining    -= alloc;
    }
  });

  // Passe 2: pondération sur ce qui reste
  const noPlan = active.filter((g) => !g.selectedPlan);
  if (noPlan.length && remaining > 0) {
    const totalW = noPlan.reduce(
      (s, g) => s + (PRIORITY_WEIGHTS[g.priority] || 2), 0
    );
    noPlan.forEach((g) => {
      const share = (PRIORITY_WEIGHTS[g.priority] || 2) / totalW * remaining;
      const rem   = Math.max(parseAmt(g.target) - parseAmt(g.current), 0);
      result[g.id] = (result[g.id] || 0) + Math.min(share, rem);
    });
  }

  return result;
};

// ── Conseils actionnables ─────────────────────────────────────
export const buildTips = ({ inc, totalExp, capaciteEpargne, goals, categories, expenses, f }) => {
  const tips = [];
  if (inc <= 0) return tips;

  const expRatio = totalExp / inc;

  if (expRatio > 0.9) {
    tips.push({
      icon: "🔴",
      txt: "Tes dépenses représentent " + fmtPct(expRatio * 100) +
           " du revenu. Réduire 50 € sur une catégorie variable augmenterait ta capacité d'épargne.",
    });
  }

  if (capaciteEpargne <= 0 && goals.length > 0) {
    tips.push({
      icon: "⚠️",
      txt: "Ta capacité d'épargne est nulle. Aucun objectif ne peut être financé sans réduire les dépenses.",
    });
  }

  // Loisirs surdimensionnés → lien avec objectif
  const lcat = categories.find((c) => c.id === "leisure");
  if (lcat) {
    const lAmt = parseAmt(expenses[lcat.id] || 0);
    if (lAmt > inc * 0.15 && goals.length > 0) {
      const saving = Math.round(lAmt * 0.2);
      const g = [...goals].sort((a, b) =>
        (parseAmt(b.target) - parseAmt(b.current)) - (parseAmt(a.target) - parseAmt(a.current))
      )[0];
      if (g && g.selectedPlan) {
        const gains = Math.floor(saving / parseAmt(g.selectedPlan.monthly) * 12);
        tips.push({
          icon: "💡",
          txt: "Réduire les loisirs de " + saving + " € te permettrait d'atteindre \"" +
               g.name + "\" " + (gains > 0 ? gains + " mois plus tôt" : "plus facilement") + ".",
        });
      }
    }
  }

  // Fonds d'urgence
  const hasFonds = goals.some(
    (g) => g.name && (g.name.toLowerCase().includes("urgence") || g.name.toLowerCase().includes("fonds"))
  );
  if (!hasFonds) {
    tips.push({
      icon: "🛡️",
      txt: "Pas de fonds d'urgence détecté. Recommandé : " +
           (f ? f(totalExp * 3) : "") + " à " + (f ? f(totalExp * 6) : "") + " (3-6 mois de dépenses).",
    });
  }

  // Objectif presque terminé
  goals.forEach((g) => {
    const cur = parseAmt(g.current), tar = parseAmt(g.target);
    if (tar > 0 && cur / tar >= 0.85 && cur < tar) {
      tips.push({
        icon: "🚀",
        txt: "\"" + g.name + "\" est à " + fmtPct((cur / tar) * 100) +
             ". Il ne reste que " + (f ? f(tar - cur) : Math.round(tar - cur) + " €") + " !",
      });
    }
  });

  return tips.slice(0, 4);
};
