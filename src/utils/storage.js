// ─── KACORP BUDGET V5 · utils/storage.js ────────────────────────
// Chargement, sauvegarde et migration automatique V4 → V5.
//
// Priorité de chargement : V5 → V4 (migration) → état par défaut.
// load() est appelé UNE SEULE FOIS, dans le useState initializer de App.jsx.

import {
  STORAGE_KEY,
  STORAGE_KEY_V4,
  DEFAULT_CATS,
  createDefaultState,
} from "../constants.js";

// ── Helpers internes ──────────────────────────────────────────
const tryParse = (key) => {
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
};

/** ISO YYYY-MM-DD de la date du jour, sans dépendre de finance.js */
const todayISO = () => {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" + String(d.getMonth() + 1).padStart(2, "0") +
    "-" + String(d.getDate()).padStart(2, "0")
  );
};

// ── Normalisation d'un objectif ───────────────────────────────
/**
 * Assure que chaque objectif possède tous les champs V5.
 * Utilisé aussi bien lors de la migration V4→V5 que lors de
 * la normalisation d'un état V5 déjà stocké (champs ajoutés
 * dans de futures versions).
 *
 * Règle sur les contributions :
 *   - Si l'objectif a déjà des contributions → on les conserve.
 *   - Si current > 0 mais contributions vide → on crée une
 *     contribution de type "initialBalance" datée d'aujourd'hui.
 *     Le type "initialBalance" l'exclut du taux d'épargne réel
 *     du mois car computeRealSavingsRate filtre par mois courant ;
 *     en pratique la date ancienne suffit, mais le type permet
 *     un filtrage explicite futur si besoin.
 *   - Si current = 0 → tableau vide.
 */
const normalizeGoal = (g) => {
  const base = {
    priority:        "normale",
    status:          "à jour",
    selectedPlan:    null,
    nextContribDate: null,
    contributions:   [],
    ...g,
  };

  // Garantir que contributions est bien un tableau
  if (!Array.isArray(base.contributions)) {
    base.contributions = [];
  }

  // Créer la contribution initialBalance si besoin
  if (base.contributions.length === 0) {
    const amt = parseFloat(String(base.current || 0).replace(",", ".")) || 0;
    if (amt > 0) {
      base.contributions = [
        {
          id:     "initialBalance",
          amount: String(amt),
          date:   todayISO(),        // date réelle, pas 2024-01-01
          note:   "Solde initial (migré)",
          type:   "initialBalance",  // exclu du taux d'épargne réel
        },
      ];
    }
  }

  return base;
};

// ── Normalisation d'un état complet ──────────────────────────
/**
 * Fusionne un état brut (V5 ou migré V4) avec l'état par défaut
 * pour garantir que tous les champs existent, que les tableaux
 * sont des tableaux, et que les settings ont leurs valeurs de repli.
 */
const normalizeState = (raw) => {
  const def = createDefaultState();
  return {
    ...def,
    income:     typeof raw.income === "string" ? raw.income : "",
    categories: Array.isArray(raw.categories) && raw.categories.length > 0
                  ? raw.categories
                  : def.categories,
    expenses:   raw.expenses && typeof raw.expenses === "object" && !Array.isArray(raw.expenses)
                  ? raw.expenses
                  : {},
    goals:      Array.isArray(raw.goals)
                  ? raw.goals.map(normalizeGoal)
                  : [],
    history:    Array.isArray(raw.history) ? raw.history : [],
    settings: {
      ...def.settings,
      ...(raw.settings && typeof raw.settings === "object" ? raw.settings : {}),
      // Champs V5 ajoutés — toujours présents avec valeur de repli
      safetyMarginPct:    typeof raw.settings?.safetyMarginPct === "number"
                            ? raw.settings.safetyMarginPct
                            : 10,
      safetyMarginCustom: raw.settings?.safetyMarginCustom ?? null,
    },
    started: raw.started === true,
  };
};

// ── API publique ──────────────────────────────────────────────

/**
 * Charge l'état de l'application.
 * Retourne { data, migrated } — à appeler UNE SEULE FOIS.
 *
 *   migrated = true  → données issues de kacorp_v4, afficher le toast de migration.
 *   migrated = false → données V5 ou état vierge.
 *   data = null      → aucune donnée stockée (premier lancement).
 */
export const load = () => {
  // ── Cas 1 : données V5 existantes ──────────────────────────
  const v5raw = tryParse(STORAGE_KEY);
  if (v5raw) {
    // Normalisation défensive : un ancien V5 peut manquer de champs
    // ajoutés depuis (ex: safetyMarginPct, contributions sur chaque objectif).
    return { data: normalizeState(v5raw), migrated: false };
  }

  // ── Cas 2 : migration depuis V4 ────────────────────────────
  const v4raw = tryParse(STORAGE_KEY_V4);
  if (v4raw) {
    // normalizeState gère la migration complète V4→V5 :
    // champs manquants, objectifs sans contributions, settings V5, etc.
    const migrated = normalizeState(v4raw);
    migrated.started = v4raw.started === true;
    return { data: migrated, migrated: true };
  }

  // ── Cas 3 : premier lancement ──────────────────────────────
  return { data: null, migrated: false };
};

/**
 * Persiste l'état courant sous la clé V5.
 * Silencieux en cas d'échec (quota dépassé, mode privé, etc.).
 */
export const save = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
};

/**
 * Supprime les deux clés (V4 et V5).
 * Appelé lors de la réinitialisation complète.
 */
export const clearAll = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_V4);
  } catch {}
};
