// ─── KACORP BUDGET V5 · components/UI.jsx ───────────────────────
// Atomes UI réutilisables. JAMAIS déclarés à l'intérieur d'autres composants.

import { C } from "../constants.js";
import { clamp } from "../utils/finance.js";

export function Ring({ value, max, color, size = 80, sw = 6, children }) {
  const r    = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const p    = max > 0 ? clamp(value / max, 0, 1) : 0;
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${p*circ} ${circ}`} strokeLinecap="round"
          style={{ transition:"stroke-dasharray 0.6s ease" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", textAlign:"center" }}>
        {children}
      </div>
    </div>
  );
}

export function Bar({ value, max, color, h = 6, style }) {
  const w = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
  return (
    <div style={{ height:h, background:C.border, borderRadius:99,
      overflow:"hidden", width:"100%", ...style }}>
      <div style={{ height:"100%", width:`${w}%`, background:color,
        borderRadius:99, transition:"width 0.5s ease" }}/>
    </div>
  );
}

export function Chip({ label, color }) {
  return (
    <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", color,
      border:`1px solid ${color}40`, borderRadius:6, padding:"2px 7px",
      background:`${color}10`, whiteSpace:"nowrap" }}>
      {label}
    </span>
  );
}

export function Card({ children, style }) {
  return (
    <div style={{ background:C.s1, border:`1px solid ${C.border}`,
      borderRadius:18, padding:"18px 16px", ...style }}>
      {children}
    </div>
  );
}

export function Lbl({ children, style }) {
  return (
    <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em",
      color:C.label, ...style }}>
      {children}
    </div>
  );
}

export function GoldBtn({ children, onClick, style, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ border:"none",
        background:`linear-gradient(135deg,${C.gold},#E8C878)`,
        color:"#080E0A", fontSize:14, fontWeight:800, borderRadius:14,
        padding:"14px 0", cursor:disabled ? "not-allowed" : "pointer",
        opacity:disabled ? 0.5 : 1, fontFamily:"inherit",
        letterSpacing:"0.04em", width:"100%", ...style }}>
      {children}
    </button>
  );
}

export function GhostBtn({ children, onClick, style }) {
  return (
    <button onClick={onClick}
      style={{ background:C.s2, border:`1px solid ${C.border}`,
        borderRadius:10, color:C.label, padding:"7px 13px",
        fontSize:12, fontWeight:600, cursor:"pointer",
        fontFamily:"inherit", letterSpacing:"0.03em",
        whiteSpace:"nowrap", ...style }}>
      {children}
    </button>
  );
}

export function DangerBtn({ children, onClick, style }) {
  return (
    <button onClick={onClick}
      style={{ background:`${C.neg}10`, border:`1px solid ${C.neg}30`,
        borderRadius:10, color:C.neg, padding:"7px 13px",
        fontSize:12, fontWeight:600, cursor:"pointer",
        fontFamily:"inherit", letterSpacing:"0.03em", ...style }}>
      {children}
    </button>
  );
}

// Field: input stable — JAMAIS déclaré à l'intérieur d'un autre composant
export function Field({ label, type = "text", value, onChange, placeholder, style, min, step }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {label && <Lbl>{label}</Lbl>}
      <input
        type={type}
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        min={min}
        step={step}
        inputMode={type === "number" ? "decimal" : undefined}
        style={{ width:"100%", background:C.s2, border:`1px solid ${C.border}`,
          borderRadius:10, padding:"10px 12px", fontSize:14, color:C.text,
          outline:"none", fontFamily:"inherit",
          fontVariantNumeric:"tabular-nums", ...style }}
      />
    </div>
  );
}

export function Textarea({ label, value, onChange, placeholder, rows = 2 }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {label && <Lbl>{label}</Lbl>}
      <textarea
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        style={{ width:"100%", background:C.s2, border:`1px solid ${C.border}`,
          borderRadius:10, padding:"10px 12px", fontSize:13, color:C.text,
          outline:"none", fontFamily:"inherit", resize:"none" }}
      />
    </div>
  );
}

export function StatRow({ label, value, color = C.label, sub }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between",
      alignItems:sub ? "flex-start" : "center",
      padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
      <div>
        <span style={{ fontSize:13, color:C.label }}>{label}</span>
        {sub && <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{sub}</div>}
      </div>
      <span style={{ fontSize:13, fontWeight:700, color,
        fontVariantNumeric:"tabular-nums", flexShrink:0, marginLeft:12 }}>
        {value}
      </span>
    </div>
  );
}

export function SectionSep({ label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, margin:"4px 0" }}>
      <div style={{ flex:1, height:1, background:C.border }}/>
      {label && <span style={{ fontSize:10, color:C.muted, letterSpacing:"0.12em" }}>{label}</span>}
      <div style={{ flex:1, height:1, background:C.border }}/>
    </div>
  );
}

export function InfoBox({ children, color = C.gold, icon, style }) {
  return (
    <div style={{ padding:"12px 14px", background:`${color}10`,
      border:`1px solid ${color}30`, borderRadius:12,
      fontSize:13, color:C.label, lineHeight:1.65, ...style }}>
      {icon && <span style={{ marginRight:6 }}>{icon}</span>}
      {children}
    </div>
  );
}