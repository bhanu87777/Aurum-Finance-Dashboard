"use client";

import { useMemo } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";

/*
  Shared chart chrome for every AURUM chart.

  Recharts writes stroke/fill as SVG attributes where CSS var() does NOT
  resolve, so series and chrome colors live here as literal hex, keyed by
  theme, and components read them through useChartTheme().

  Both palettes are validated (dataviz six checks) against their surface:
  dark vs #14141c (worst adjacent CVD ΔE 32.9), light vs #fffdf8
  (normal-vision ΔE 16.7, CVD ΔE 8.1, all ≥ 3:1). Fixed order — never cycled.
*/
const CHART_TOKENS = {
  dark: {
    viz: {
      gold: "#b3882f",
      teal: "#1ca57e",
      violet: "#8677e6",
      rose: "#d55f88",
      sky: "#3d8ed6",
      orange: "#cf6a2c",
    },
    surface: "#14141c",
    grid: "#232330",
    axis: "#34343f",
    muted: "#8a8779",
    ink: "#f2efe6",
    inkSecondary: "#b8b5aa",
    good: "#0ca30c",
    serious: "#ec835a",
    critical: "#d03b3b",
    tooltipBg: "#191924",
    tooltipBorder: "rgba(255,255,255,0.12)",
    tooltipShadow: "0 8px 24px rgba(0,0,0,0.45)",
    hoverFill: "rgba(255,255,255,0.04)",
    spark: "#5b584d", // de-emphasis sparkline hue — the accent is the current point
    accent: "#e2b95b",
  },
  light: {
    viz: {
      gold: "#a17300",
      teal: "#0e7d5e",
      violet: "#6353c9",
      rose: "#b03a64",
      sky: "#2568a8",
      orange: "#a8511a",
    },
    surface: "#fffdf8",
    grid: "#e8e4d8",
    axis: "#cfcaba",
    muted: "#7d7a6d",
    ink: "#1b1a14",
    inkSecondary: "#565348",
    good: "#0a7d0a",
    serious: "#b04a24",
    critical: "#b32626",
    tooltipBg: "#fffdf8",
    tooltipBorder: "rgba(24,20,8,0.14)",
    tooltipShadow: "0 8px 24px rgba(30,25,10,0.14)",
    hoverFill: "rgba(24,20,8,0.04)",
    spark: "#a29d8c",
    accent: "#a87f24",
  },
} as const;

export type ChartTheme = ReturnType<typeof useChartTheme>;

export function useChartTheme() {
  const { theme } = useTheme();
  return useMemo(() => {
    const t = CHART_TOKENS[theme];
    return {
      ...t,
      // Solid hairline grid, horizontal lines only — recessive by design.
      gridProps: { stroke: t.grid, strokeWidth: 1, vertical: false } as const,
      axisTick: { fill: t.muted, fontSize: 11 } as const,
      axisLine: { stroke: t.axis, strokeWidth: 1 } as const,
      // Crosshair cursor for line/area charts.
      cursorLine: { stroke: t.axis, strokeWidth: 1 } as const,
    };
  }, [theme]);
}

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
  const t = useChartTheme();
  if (!active || !payload || payload.length === 0) return null;
  const fmt: Formatter = format ?? ((v) => v.toLocaleString("en-US"));
  return (
    <div
      style={{
        background: t.tooltipBg,
        border: `1px solid ${t.tooltipBorder}`,
        borderRadius: 10,
        padding: "10px 12px",
        boxShadow: t.tooltipShadow,
      }}
    >
      {label !== undefined && (
        <p style={{ color: t.muted, fontSize: 11, marginBottom: 6 }}>{String(label)}</p>
      )}
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: i === 0 ? 0 : 4 }}>
            <span style={{ width: 14, height: 2.5, borderRadius: 2, background: p.color ?? t.ink, flexShrink: 0 }} />
            <span style={{ color: t.ink, fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {fmt(Number(p.value), String(p.name))}
            </span>
            <span style={{ color: t.inkSecondary, fontSize: 12 }}>{String(p.name)}</span>
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
