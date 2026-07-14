"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartCard,
  ChartTooltip,
  LegendKeys,
  VIZ,
  SURFACE,
  gridProps,
  axisTick,
  axisLine,
  cursorLine,
} from "@/components/charts/chartKit";
import { formatMoneyCompact } from "@/lib/utils";
import type { RegressionResult } from "@/lib/regression";

const money = (v: number) => formatMoneyCompact(v);

// Revenue is gold everywhere; the dashed stroke — not a different hue —
// marks the forecast as a projection. The fit line takes violet.
export function PredictionsView({ result }: { result: RegressionResult }) {
  const [showForecast, setShowForecast] = useState(false);

  const historyCount = result.points.filter((p) => p.actual !== null).length;
  const data = useMemo(() => {
    const pts = showForecast ? result.points : result.points.slice(0, historyCount);
    return pts.map((p) => ({
      label: p.label,
      Actual: p.actual,
      "Regression fit": p.fitted,
      Forecast: p.forecast,
      band: p.lower !== null && p.upper !== null ? [p.lower, p.upper] : null,
    }));
  }, [result, showForecast, historyCount]);

  const forecastMonths = result.points.slice(historyCount);

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Revenue predictions</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Ordinary-least-squares regression fit on {historyCount} months of actuals, projected 12 months ahead.
          </p>
        </div>
        <button
          onClick={() => setShowForecast((s) => !s)}
          className={`rounded-xl px-5 py-2.5 text-xs font-bold tracking-wide ${showForecast ? "btn-ghost" : "btn-gold"}`}
        >
          {showForecast ? "Hide forecast" : "Show next 12 months"}
        </button>
      </div>

      {/* Model quality tiles */}
      <div className="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <ModelStat label="R² — goodness of fit" value={result.r2.toFixed(3)} sub="1.000 = the line explains everything" />
        <ModelStat label="Trend slope" value={`${formatMoneyCompact(result.slope)}/mo`} sub="revenue added each month on trend" />
        <ModelStat label="Avg MoM growth" value={`${result.avgMoMGrowthPct >= 0 ? "+" : ""}${result.avgMoMGrowthPct.toFixed(1)}%`} sub="mean month-over-month change" />
        <ModelStat label="Projected next 12 mo" value={formatMoneyCompact(result.nextYearTotal)} sub="sum of the forecast months" />
      </div>

      <ChartCard
        title="Actuals, fit, and forecast"
        subtitle={showForecast ? "Shaded band is the 95% confidence interval (±1.96σ of residuals)" : "Toggle the forecast to extend the trend 12 months"}
        right={
          <LegendKeys
            items={[
              { label: "Actual revenue", color: VIZ.gold, shape: "dot" },
              { label: "Regression fit", color: VIZ.violet },
              ...(showForecast ? [{ label: "Forecast (95% band)", color: VIZ.gold }] : []),
            ]}
          />
        }
      >
        <div className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 8 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" tick={axisTick} axisLine={axisLine} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={money} width={56} domain={["auto", "auto"]} />
              <Tooltip content={<ChartTooltip format={money} />} cursor={cursorLine} />
              {showForecast && (
                <Area
                  dataKey="band"
                  name="95% interval"
                  stroke="none"
                  fill={VIZ.gold}
                  fillOpacity={0.1}
                  connectNulls
                  legendType="none"
                  tooltipType="none"
                  isAnimationActive={false}
                />
              )}
              <Line
                type="monotone"
                dataKey="Regression fit"
                stroke={VIZ.violet}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              {showForecast && (
                <Line
                  type="monotone"
                  dataKey="Forecast"
                  stroke={VIZ.gold}
                  strokeWidth={2}
                  strokeDasharray="6 5"
                  dot={{ r: 3, fill: VIZ.gold, stroke: SURFACE, strokeWidth: 2 }}
                  connectNulls={false}
                isAnimationActive={false}
                />
              )}
              <Line
                type="monotone"
                dataKey="Actual"
                stroke={VIZ.gold}
                strokeWidth={2}
                dot={{ r: 4, fill: VIZ.gold, stroke: SURFACE, strokeWidth: 2 }}
                activeDot={{ r: 5, stroke: SURFACE, strokeWidth: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Table twin: every forecast value reachable without hovering. */}
      {showForecast && (
        <section className="panel mt-5 p-5">
          <h3 className="mb-3 text-sm font-bold tracking-wide">Forecast detail</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th className="pb-2.5 pr-4 font-semibold">Month</th>
                  <th className="pb-2.5 pr-4 text-right font-semibold">Forecast</th>
                  <th className="pb-2.5 pr-4 text-right font-semibold">Low (95%)</th>
                  <th className="pb-2.5 text-right font-semibold">High (95%)</th>
                </tr>
              </thead>
              <tbody>
                {forecastMonths.map((p) => (
                  <tr key={p.label} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-4 font-semibold">{p.label}</td>
                    <td className="num py-2 pr-4 text-right font-bold">{formatMoneyCompact(p.forecast ?? 0)}</td>
                    <td className="num py-2 pr-4 text-right text-ink-secondary">{formatMoneyCompact(p.lower ?? 0)}</td>
                    <td className="num py-2 text-right text-ink-secondary">{formatMoneyCompact(p.upper ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            Model: y = {formatMoneyCompact(result.slope)}·x + {formatMoneyCompact(result.intercept)} · residual σ ={" "}
            {formatMoneyCompact(result.sigma)} · fit computed from scratch (no ML library).
          </p>
        </section>
      )}
    </div>
  );
}

function ModelStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="panel panel-hover p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1.5 text-[1.6rem] font-bold leading-none">{value}</p>
      <p className="mt-2 text-xs text-muted">{sub}</p>
    </div>
  );
}
