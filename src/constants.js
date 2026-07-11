// ─── KACORP BUDGET V5 · constants.js ────────────────────────────

export const C = {
  bg:"#080E0A", s1:"#0F1A12", s2:"#152019", border:"#1E3024",
  gold:"#D8B56D", goldDim:"#7A5E2A",
  pos:"#6EE7B7", neg:"#F87171", warn:"#FBBF24",
  text:"#F0F4F1", label:"#7A9A82", muted:"#2E4434",
  blue:"#60A5FA", purple:"#A78BFA",
};

export const STORAGE_KEY_V4 = "kacorp_v4";
export const STORAGE_KEY    = "kacorp_v5";

export const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
export const MONTH_FULL = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre"
];

export const ICONS = [
  "🏠","🛒","🚗","❤️","🎬","💰","📦","✈️","🏋️","📚",
  "🎓","💻","👕","🍽️","🎁","⚡","📱","🏥","🐾","🎮"
];
export const G_ICONS = [
  "🎯","🏖️","🚀","🏠","🚗","✈️","💍","🎓","💻","🛡️",
  "🌍","🏋️","💎","🎸","📸","🏄","🎨","🐕","🏦","🌱"
];
export const COLORS = [
  "#D8B56D","#6EE7B7","#60A5FA","#F87171","#A78BFA",
  "#34D399","#FBBF24","#FB923C","#E879F9","#94A3B8"
];

export const PRIORITIES = ["prioritaire","normale","secondaire"];
export const PRIORITY_LABELS = {
  prioritaire: "🔴 Prioritaire",
  normale:     "🟡 Normale",
  secondaire:  "🟢 Secondaire",
};
export const PRIORITY_WEIGHTS = { prioritaire:3, normale:2, secondaire:1 };

export const GOAL_SUGGESTIONS = [
  { name:"Fonds d'urgence",        icon:"🛡️", color:"#F87171" },
  { name:"Vacances",               icon:"🏖️", color:"#60A5FA" },
  { name:"Voiture",                icon:"🚗", color:"#FBBF24" },
  { name:"Logement",               icon:"🏠", color:"#D8B56D" },
  { name:"Formation",              icon:"🎓", color:"#A78BFA" },
  { name:"Matériel professionnel", icon:"💻", color:"#6EE7B7" },
  { name:"Remboursement de dette", icon:"🏦", color:"#FB923C" },
  { name:"Projet personnel",       icon:"🌱", color:"#34D399" },
  { name:"Autre",                  icon:"🎯", color:"#D8B56D" },
];

export const DEFAULT_CATS = [
  { id:"housing",   label:"Logement",     icon:"🏠", color:"#D8B56D", budget:0 },
  { id:"food",      label:"Alimentation", icon:"🛒", color:"#6EE7B7", budget:0 },
  { id:"transport", label:"Transport",    icon:"🚗", color:"#60A5FA", budget:0 },
  { id:"health",    label:"Santé",        icon:"❤️",  color:"#F87171", budget:0 },
  { id:"leisure",   label:"Loisirs",      icon:"🎬", color:"#A78BFA", budget:0 },
  { id:"savings",   label:"Épargne",      icon:"💰", color:"#34D399", budget:0 },
  { id:"other",     label:"Autres",       icon:"📦", color:"#94A3B8", budget:0 },
];

export const CURRENCY_SYMBOLS = { EUR:"€", USD:"$", GBP:"£", CHF:"Fr" };

export const SAFETY_MARGIN_OPTIONS = [5, 10, 15, 20];

export const PLAN_TYPES = ["rapide","équilibré","confortable","personnalisé"];

/** Factory : nouvel objectif vide — toujours appeler comme EMPTY_GOAL() */
export const EMPTY_GOAL = () => ({
  name:"", target:"", current:"", deadline:"",
  icon:"🎯", color:"#D8B56D", priority:"normale",
  selectedPlan:    null,   // { type, monthly, months, date, … }
  contributions:   [],     // [{ id, amount, date, note, type? }]
  status:          "à jour",
  nextContribDate: null,
});

/**
 * Factory d'état initial — TOUJOURS utiliser createDefaultState() plutôt que
 * l'objet littéral DEFAULT_STATE pour éviter le partage de références entre
 * les appels (tableaux et objets imbriqués seraient sinon partagés par référence).
 *
 * DEFAULT_STATE est conservé comme alias pratique pour les comparaisons de shape,
 * mais App.jsx et storage.js doivent appeler createDefaultState() lors d'une
 * création ou réinitialisation.
 */
export const createDefaultState = () => ({
  income:     "",
  categories: DEFAULT_CATS.map(c => ({ ...c })),  // copie superficielle suffisante
  expenses:   {},
  goals:      [],
  history:    [],
  settings: {
    currency:           "EUR",
    name:               "",
    savingsGoalPct:     20,
    safetyMarginPct:    10,
    safetyMarginCustom: null,
  },
  started: false,
});

/**
 * Alias statique pour la vérification de shape (ne pas utiliser pour initialiser
 * un state — préférer createDefaultState()).
 */
export const DEFAULT_STATE = createDefaultState();

export const NAV = [
  { id:"dashboard", label:"Dashboard", icon:"◈" },
  { id:"depenses",  label:"Dépenses",  icon:"◉" },
  { id:"objectifs", label:"Objectifs", icon:"◆" },
  { id:"stats",     label:"Stats",     icon:"▲" },
  { id:"settings",  label:"Réglages",  icon:"⚙" },
];
