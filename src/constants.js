// ─── KACORP BUDGET V5 · constants.js ────────────────────────────

export const C = {
  // Fonds
  bg:     "#07110D",
  s1:     "#102019",
  s2:     "#162A20",
  border: "#315040",
  // Textes
  text:   "#F7F5EE",
  label:  "#A9BDB0",
  muted:  "#537563",
  // Accent principal
  gold:    "#D8B56D",
  goldDim: "#7A5E2A",
  // Fonctionnel
  pos:    "#63D6AA",
  neg:    "#FF7A7A",
  warn:   "#FBBF24",
  // Simulation uniquement
  blue:   "#6FA8FF",
  purple: "#A78BFA",
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
  "#D8B56D","#63D6AA","#6FA8FF","#FF7A7A","#A78BFA",
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
  { name:"Fonds d'urgence",        icon:"🛡️", color:"#FF7A7A" },
  { name:"Vacances",               icon:"🏖️", color:"#6FA8FF" },
  { name:"Voiture",                icon:"🚗", color:"#FBBF24" },
  { name:"Logement",               icon:"🏠", color:"#D8B56D" },
  { name:"Formation",              icon:"🎓", color:"#A78BFA" },
  { name:"Matériel professionnel", icon:"💻", color:"#63D6AA" },
  { name:"Remboursement de dette", icon:"🏦", color:"#FB923C" },
  { name:"Projet personnel",       icon:"🌱", color:"#34D399" },
  { name:"Autre",                  icon:"🎯", color:"#D8B56D" },
];

export const DEFAULT_CATS = [
  { id:"housing",   label:"Logement",     icon:"🏠", color:"#D8B56D", budget:0 },
  { id:"food",      label:"Alimentation", icon:"🛒", color:"#63D6AA", budget:0 },
  { id:"transport", label:"Transport",    icon:"🚗", color:"#6FA8FF", budget:0 },
  { id:"health",    label:"Santé",        icon:"❤️",  color:"#FF7A7A", budget:0 },
  { id:"leisure",   label:"Loisirs",      icon:"🎬", color:"#A78BFA", budget:0 },
  { id:"savings",   label:"Épargne",      icon:"💰", color:"#34D399", budget:0 },
  { id:"other",     label:"Autres",       icon:"📦", color:"#94A3B8", budget:0 },
];

export const CURRENCY_SYMBOLS = { EUR:"€", USD:"$", GBP:"£", CHF:"Fr" };

export const SAFETY_MARGIN_OPTIONS = [5, 10, 15, 20];

export const PLAN_TYPES = ["rapide","équilibré","confortable","personnalisé"];

export const EMPTY_GOAL = () => ({
  name:"", target:"", current:"", deadline:"",
  icon:"🎯", color:"#D8B56D", priority:"normale",
  selectedPlan:    null,
  contributions:   [],
  status:          "à jour",
  nextContribDate: null,
});

export const createDefaultState = () => ({
  income:     "",
  categories: DEFAULT_CATS.map(c => ({ ...c })),
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

export const DEFAULT_STATE = createDefaultState();

export const NAV = [
  { id:"dashboard", label:"Dashboard", icon:"◈" },
  { id:"depenses",  label:"Dépenses",  icon:"◉" },
  { id:"objectifs", label:"Objectifs", icon:"◆" },
  { id:"stats",     label:"Stats",     icon:"▲" },
  { id:"settings",  label:"Réglages",  icon:"⚙" },
];
