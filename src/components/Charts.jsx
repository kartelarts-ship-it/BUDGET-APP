// ─── KACORP BUDGET V5 · components/Charts.jsx ───────────────────

import { C } from "../constants.js";
import { clamp } from "../utils/finance.js";

export function DonutChart({ data, size = 180 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div style={{ width:size, height:size, borderRadius:"50%",
      background:C.border, display:"flex", alignItems:"center",
      justifyContent:"center" }}>
      <span style={{ fontSize:12, color:C.label }}>Aucune dépense</span>
    </div>
  );
  const cx = size/2, cy = size/2, r = size*0.38, ir = size*0.23;
  let cum = -Math.PI/2;
  const slices = data.filter(d => d.value > 0).map(d => {
    const a = (d.value / total) * 2 * Math.PI;
    const s = cum; cum += a; const e = cum;
    const x1 = cx+r*Math.cos(s), y1 = cy+r*Math.sin(s);
    const x2 = cx+r*Math.cos(e), y2 = cy+r*Math.sin(e);
    const ix1 = cx+ir*Math.cos(e), iy1 = cy+ir*Math.sin(e);
    const ix2 = cx+ir*Math.cos(s), iy2 = cy+ir*Math.sin(s);
    const lg = a > Math.PI ? 1 : 0;
    return {
      ...d,
      path: `M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${lg} 0 ${ix2} ${iy2} Z`,
      pct: (d.value / total) * 100,
    };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} opacity={0.9}>
          <title>{s.label}: {Math.round(s.pct)}%</title>
        </path>
      ))}
      <circle cx={cx} cy={cy} r={ir-2} fill={C.s1}/>
    </svg>
  );
}

export function BarChart({ data, color = C.pos, h = 110 }) {
  if (!data.length) return (
    <div style={{ height:h, display:"flex", alignItems:"center",
      justifyContent:"center" }}>
      <span style={{ color:C.label, fontSize:12 }}>Pas encore de données</span>
    </div>
  );
  const maxAbs = Math.max(...data.map(d => Math.abs(d.value)), 1);
  const bw     = Math.min(28, Math.max(8, Math.floor((300 - data.length*4) / data.length)));
  const mid    = h / 2;
  return (
    <svg viewBox={`0 0 ${data.length*(bw+8)} ${h+28}`}
      style={{ width:"100%", height:h+28, overflow:"visible" }}>
      <line x1={0} y1={mid} x2={data.length*(bw+8)} y2={mid}
        stroke={C.border} strokeWidth={1} strokeDasharray="3 3"/>
      {data.map((d, i) => {
        const ah  = Math.max((Math.abs(d.value)/maxAbs)*(h/2), 2);
        const x   = i*(bw+8);
        const neg = d.value < 0;
        return (
          <g key={i}>
            <rect x={x} y={neg?mid:mid-ah} width={bw} height={ah}
              rx={3} fill={neg ? C.neg : color} opacity={0.85}/>
            <text x={x+bw/2} y={h+18} textAnchor="middle"
              fill={C.label} fontSize={9} fontFamily="Inter,sans-serif">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}