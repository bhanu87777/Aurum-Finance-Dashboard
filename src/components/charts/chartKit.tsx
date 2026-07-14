"use client";

/*
  Shared chart chrome for every AURUM chart.
  Series palette validated against the #14141c card surface
  (worst adjacent CVD ΔE 32.9, all slots ≥ 3:1). Fixed order — never cycled.
*/
export const VIZ = {
  gold: "#b3882f",
  teal: "#1ca57e",
  violet: "#8677e6",
  rose: "#d55f88",
  sky: "#3d8ed6",
  orange: "#cf6a2c",
} as const;

export const SURFACE = "#14141c";
export const GRID = "#232330";
export const AXIS = "#34343f";
export const MUTED = "#8a8779";
export const INK = "#f2efe6";
export const INK_SECONDARY = "#b8b5aa";

// Solid hairline grid, horizontal lines only — recessive by design.
export const gridProps = {
  stroke: GRID,
  strokeWidth: 1,
  vertical: false,
} as const;

export const axisTick = { fill: MUTED, fontSize: 11 } as const;
export const axisLine = { stroke: AXIS, strokeWidth: 1 } as const;

// Crosshair cursor for line/area charts.
export const cursorLine = { stroke: AXIS, strokeWidth: 1 } as const;

type Formatter = (value: number, name: string) => string;

// Recharts 3 injects these at render time; typed explicitly since the
// library's TooltipProps now reads them from context.
type TooltipContentProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number | string; name?: string | number; color?: string }>;
  label?: string | number;
  format?: Formatter;
};

// One tooltip, every series: value leads (strong), label follows, keyed by a
// short stroke of the series color. Names/labels are rendered as React text
// (no innerHTML), so untrusted strings stay inert.
export function ChartTooltip({ active, payload, label, format }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;
  const fmt: Formatter = format ?? ((v) => v.toLocaleString("en-US"));
  return (
    <div
      style={{
        background: "#191924",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 10,
        padding: "10px 12px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
      }}
    >
      {label !== undefined && (
        <p style={{ color: MUTED, fontSize: 11, marginBottom: 6 }}>{String(label)}</p>
      )}
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: i === 0 ? 0 : 4 }}>
            <span style={{ width: 14, height: 2.5, borderRadius: 2, background: p.color ?? INK, flexShrink: 0 }} />
            <span style={{ color: INK, fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {fmt(Number(p.value), String(p.name))}
            </span>
            <span style={{ color: INK_SECONDARY, fontSize: 12 }}>{String(p.name)}</span>
          </div>
        ))}
    </div>
  );
}

// Minimal legend: colored key + label in secondary ink (text never wears the
// series color). Rect keys for bars/areas, line keys for lines.
export function LegendKeys({
  items,
}: {
  items: { label: string; color: string; shape?: "line" | "rect" | "dot" }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-2 text-xs text-ink-secondary">
          {it.shape === "rect" ? (
            <span style={{ width: 10, height: 10, borderRadius: 3, background: it.color }} />
          ) : it.shape === "dot" ? (
            <span style={{ width: 8, height: 8, borderRadius: 99, background: it.color }} />
          ) : (
            <span style={{ width: 14, height: 2.5, borderRadius: 2, background: it.color }} />
          )}
          {it.label}
        </span>
      ))}
    </div>
  );
}

// Card wrapper every chart sits in: title, subtitle, right-slot, fixed body.
export function ChartCard({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel panel-hover flex flex-col p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold tracking-wide">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
