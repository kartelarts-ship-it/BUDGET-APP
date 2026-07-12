// KACORP BUDGET V5.1 - utils/finance.js

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
  const d    = todayDate();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return last - d.getDate();
};

export const computeSafetyMargin = (inc, settings) => {
  if (settings.safetyMarginCustom != null && settings.safetyMarginCustom > 0)
    return Math.min(parseAmt(settings.safetyMarginCustom), inc);
  const pct = settings.safetyMarginPct != null ? settings.safetyMarginPct : 10;
  return inc * (pct / 100);
};

export const computeCapacity = (inc, totalExp, settings) => {
  const soldeDisponible = inc - totalExp;
  const margeSecurite   = computeSafetyMargin(inc, settings);
  return {
    soldeDisponible,
    margeSecurite,
    capaciteEpargne: Math.max(0, soldeDisponible - margeSecurite),
  };
};

export const computeRealSavingsRate = (goals, inc) => {
  const month = currentMonth();
  const totalVersedAmt = goals.reduce((s, g) => {
    return s + (g.contributions || [])
      .filter((c) => c.type !== "initialBalance" && c.date && c.date.startsWith(month))
      .reduce((a, c) => a + parseAmt(c.amount), 0);
  }, 0);
  return {
    totalVersed: totalVersedAmt,
    rate: inc > 0 ? (totalVersedAmt / inc) * 100 : 0,
  };
};

// ── Dates ──────────────────────────────────────────────────────
const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr.length === 10 ? dateStr + "T00:00:00" : dateStr);
  return isNaN(d.getTime()) ? null : d;
};

export const monthsUntil = (deadline) => {
  if (!deadline) return null;
  const d = parseLocalDate(deadline);
  if (!d) return null;
  const now    = todayDate();
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tgtDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (tgtDay < nowDay) return 0;
  const diff = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
  return Math.max(1, diff);
};

export const dateFromNowMonths = (n) => {
  if (!n || n <= 0) return "—";
  const d = new Date();
  d.setMonth(d.getMonth() + Math.round(n));
  return MONTH_FULL[d.getMonth()] + " " + d.getFullYear();
};

export const formatDeadline = (deadline) => {
  if (!deadline) return null;
  const d = parseLocalDate(deadline);
  if (!d) return null;
  return d.getDate() + " " + MONTH_FULL[d.getMonth()] + " " + d.getFullYear();
};

// ── Seuils de validité ─────────────────────────────────────────
const PLAN_MIN_MONTHLY = 10;
const PLAN_MAX_MONTHS  = 120;

export const planDurationLabel = (months) => {
  if (!months || months <= 0)
    return { label: "—", warning: false, invalid: true };
  if (months > PLAN_MAX_MONTHS)
    return { label: months + " mois", warning: true, invalid: true,
      warningText: "Durée supérieure à 10 ans — plan non proposé." };
  if (months > 60)
    return { label: months + " mois", warning: true, invalid: false,
      warningText: "Plan très long (" + months + " mois). Envisage d'augmenter la mensualité." };
  if (months > 36)
    return { label: months + " mois", warning: false, invalid: false,
      warningText: "Plan long mais acceptable." };
  return { label: months + " mois", warning: false, invalid: false };
};

export const estimatedEndDate = (goal) => {
  const rem     = Math.max(parseAmt(goal.target) - parseAmt(goal.current), 0);
  const monthly = goal.selectedPlan ? parseAmt(goal.selectedPlan.monthly) : 0;
  if (rem <= 0) return { months: 0, label: "Atteint" };
  if (monthly <= 0) return { months: null, label: "—" };
  const months = Math.ceil(rem / monthly);
  return { months, label: dateFromNowMonths(months) };
};

export const deadlineGapMonths = (goal) => {
  if (!goal.deadline || !goal.selectedPlan) return null;
  const { months: estMonths } = estimatedEndDate(goal);
  if (estMonths == null) return null;
  const targetMonths = monthsUntil(goal.deadline);
  if (targetMonths == null) return null;
  return estMonths - targetMonths;
};

export const computePlanStatus = (goal, capaciteEpargne) => {
  const plan = goal.selectedPlan;
  if (!plan) return { obsolete: false };
  const monthly = parseAmt(plan.monthly);
  const rem     = Math.max(parseAmt(goal.target) - parseAmt(goal.current), 0);
  if (rem <= 0) return { obsolete: false };
  if (monthly <= 0) return { obsolete: true, reason: "Mensualité invalide." };
  if (goal.deadline) {
    const moisRestants = monthsUntil(goal.deadline);
    if (moisRestants === 0)
      return { obsolete: true, reason: "La date cible est dépassée." };
    const requiredMonthly = moisRestants > 0 ? rem / moisRestants : Infinity;
    const delta = monthly - requiredMonthly;
    if (delta < -Math.max(requiredMonthly * 0.2, 20)) {
      return {
        obsolete: true,
        reason: "La date cible exige " + Math.round(requiredMonthly) +
                " €/mois, mais le plan est fixé à " + Math.round(monthly) + " €/mois.",
        requiredMonthly: Math.round(requiredMonthly),
        currentMonthly:  Math.round(monthly),
      };
    }
  }
  return { obsolete: false };
};

export const boostNeededForDeadline = (goal) => {
  if (!goal.deadline || !goal.selectedPlan) return null;
  const monthly   = parseAmt(goal.selectedPlan.monthly);
  const rem       = Math.max(parseAmt(goal.target) - parseAmt(goal.current), 0);
  const moisCible = monthsUntil(goal.deadline);
  if (!moisCible || moisCible <= 0 || monthly <= 0) return null;
  const canAccumulate = monthly * moisCible;
  if (canAccumulate >= rem) return 0;
  return Math.ceil(rem - canAccumulate);
};

export const buildTwoPlans = (goal, capaciteEpargne, inc) => {
  const rem = Math.max(parseAmt(goal.target) - parseAmt(goal.current), 0);
  if (rem <= 0) return { planAsked: null, planRec: null, noReasonablePlan: false };
  const cap = Math.max(capaciteEpargne, 0);

  const makePlan = (type, monthly, feasible) => {
    const m = Math.round(monthly);
    if (m < PLAN_MIN_MONTHLY) return null;
    const months = Math.ceil(rem / m);
    if (months > PLAN_MAX_MONTHS) return null;
    const dur = planDurationLabel(months);
    return {
      type,
      monthly:     m,
      months,
      date:        dateFromNowMonths(months),
      pctInc:      inc > 0 ? (m / inc) * 100 : null,
      warning:     dur.warning || feasible === false,
      warningText: feasible === false
        ? "Ce plan nécessite " + m + " €/mois, mais ta capacité actuelle est de " + Math.round(cap) + " €/mois."
        : (dur.warningText || null),
      feasible:    feasible !== false,
    };
  };

  let planAsked = null;
  if (goal.deadline) {
    const moisCible = monthsUntil(goal.deadline);
    if (moisCible > 0) {
      planAsked = makePlan("demandé", rem / moisCible, cap > 0 && (rem / moisCible) <= cap);
    }
  }

  let planRec = null;
  if (cap > 0) planRec = makePlan("recommandé", cap, true);

  if (planAsked && planRec && Math.abs(planAsked.monthly - planRec.monthly) <= 5)
    planAsked = null;

  return { planAsked, planRec, noReasonablePlan: !planAsked && !planRec };
};

// ── Versements ─────────────────────────────────────────────────
export const versedThisMonth = (goal) => {
  const month = currentMonth();
  return (goal.contributions || [])
    .filter((c) => c.type !== "initialBalance" && c.date && c.date.startsWith(month))
    .reduce((s, c) => s + parseAmt(c.amount), 0);
};

export const syncCurrent = (goal) => {
  const total = (goal.contributions || []).reduce((s, c) => s + parseAmt(c.amount), 0);
  return { ...goal, current: String(total) };
};

// ── Statut ────────────────────────────────────────────────────
// Ordre de priorité strict :
//   atteint → suspendu → à configurer (pas de plan) →
//   en avance → à jour → à faire → en retard
export const computeGoalStatus = (goal) => {
  const cur = parseAmt(goal.current);
  const tar = parseAmt(goal.target);
  if (tar > 0 && cur >= tar)       return "atteint";
  if (goal.status === "suspendu")  return "suspendu";
  if (!goal.selectedPlan)          return "à configurer";
  const planned = parseAmt(goal.selectedPlan.monthly);
  if (planned <= 0)                return "à configurer";
  const versed = versedThisMonth(goal);
  if (versed >= planned * 1.1)     return "en avance";
  if (versed >= planned * 0.9)     return "à jour";
  if (daysRemainingInMonth() > 0)  return "à faire";
  return "en retard";
};

export const STATUS_COLORS = {
  "atteint":        "#63D6AA",
  "en avance":      "#63D6AA",
  "à jour":         "#D8B56D",
  "à faire":        "#6FA8FF",
  "en retard":      "#FF7A7A",
  "suspendu":       "#537563",
  "à configurer":   "#A9BDB0",  // neutre, clair
};

// ── Boost ponctuel ────────────────────────────────────────────
export const simulateBoost = (goal, boostAmount) => {
  const rem   = Math.max(parseAmt(goal.target) - parseAmt(goal.current), 0);
  const boost = Math.min(parseAmt(boostAmount), rem);
  if (boost <= 0 || rem <= 0) return null;

  const planMonthly   = goal.selectedPlan ? parseAmt(goal.selectedPlan.monthly) : 0;
  const newRem        = Math.max(rem - boost, 0);
  const completesGoal = newRem <= 0;

  let newDate = "—", newMonths = null, gained = null;

  if (completesGoal) {
    newDate   = "Objectif atteint !";
    newMonths = 0;
    gained    = planMonthly > 0 ? Math.ceil(rem / planMonthly) : null;
  } else if (planMonthly > 0) {
    const oldMonths = Math.ceil(rem    / planMonthly);
    newMonths       = Math.ceil(newRem / planMonthly);
    gained          = oldMonths - newMonths;
    newDate         = dateFromNowMonths(newMonths);
  }

  let gapAfterBoost = null;
  if (goal.deadline && newMonths != null) {
    const targetMonths = monthsUntil(goal.deadline);
    if (targetMonths != null) gapAfterBoost = newMonths - targetMonths;
  }

  return { boostAmount: boost, newRem, newDate, newMonths, gained,
           planMonthly, completesGoal, gapAfterBoost };
};

// ── Répartition — UNIQUEMENT les objectifs avec selectedPlan valide ──
// Ne distribue JAMAIS d'argent à un objectif sans plan.
// Respecte : priorité desc → date cible asc → mensualité officielle → rem → remaining.
export const distributeGoals = (goals, capaciteEpargne) => {
  // Seuls les objectifs actifs ET ayant un plan valide participent
  const withPlan = goals.filter((g) =>
    parseAmt(g.current) < parseAmt(g.target) &&
    g.status !== "suspendu" &&
    g.selectedPlan &&
    parseAmt(g.selectedPlan.monthly) > 0
  );

  if (!withPlan.length || capaciteEpargne <= 0) return {};

  const sorted = [...withPlan].sort((a, b) => {
    const wa = PRIORITY_WEIGHTS[a.priority] || 2;
    const wb = PRIORITY_WEIGHTS[b.priority] || 2;
    if (wb !== wa) return wb - wa;
    const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return da - db;
  });

  let remaining = capaciteEpargne;
  const result  = {};

  sorted.forEach((g) => {
    const planned = parseAmt(g.selectedPlan.monthly);
    const rem     = Math.max(parseAmt(g.target) - parseAmt(g.current), 0);
    const alloc   = Math.min(planned, rem, remaining);
    result[g.id]  = alloc;
    remaining    -= alloc;
  });

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

  const lcat = categories.find((c) => c.id === "leisure");
  if (lcat) {
    const lAmt = parseAmt(expenses[lcat.id] || 0);
    if (lAmt > inc * 0.15 && goals.length > 0) {
      const saving = Math.round(lAmt * 0.2);
      const g = [...goals].sort(
        (a, b) => (parseAmt(b.target) - parseAmt(b.current)) -
                  (parseAmt(a.target) - parseAmt(a.current))
      )[0];
      if (g && g.selectedPlan) {
        const monthly   = parseAmt(g.selectedPlan.monthly);
        const rem       = Math.max(parseAmt(g.target) - parseAmt(g.current), 0);
        const oldMonths = monthly > 0 ? Math.ceil(rem / monthly) : null;
        const newMonths = (monthly + saving) > 0 ? Math.ceil(rem / (monthly + saving)) : null;
        const gains     = (oldMonths != null && newMonths != null) ? oldMonths - newMonths : 0;
        tips.push({
          icon: "💡",
          txt: "Réduire les loisirs de " + saving + " € te permettrait d'atteindre \"" +
               g.name + "\" " + (gains > 0 ? gains + " mois plus tôt" : "plus facilement") + ".",
        });
      }
    }
  }

  const hasFonds = goals.some(
    (g) => g.name && (g.name.toLowerCase().includes("urgence") || g.name.toLowerCase().includes("fonds"))
  );
  if (!hasFonds) {
    tips.push({
      icon: "🛡️",
      txt: "Pas de fonds d'urgence détecté. Recommandé : " +
           (f ? f(totalExp * 3) : "") + " à " + (f ? f(totalExp * 6) : "") + " (3-6 mois).",
    });
  }

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
