"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, ChartTooltip, LegendKeys, useChartTheme } from "@/components/charts/chartKit";
import { formatMoneyCompact, monthYearLabel } from "@/lib/utils";
import type { PeriodComparison } from "@/lib/reports";

const money = (v: number) => formatMoneyCompact(v);

// Solid = current period, dashed muted = comparison period, aligned by
// month offset so the shapes are directly comparable.
export function ComparisonCharts({ comparison }: { comparison: PeriodComparison }) {
  const t = useChartTheme();
  const data = comparison.monthly.map((m) => ({
    label: m.aLabel ? monthYearLabel(m.aLabel) : m.bLabel ? monthYearLabel(m.bLabel) : "",
    Revenue: m.aRevenue,
    "Revenue (prior)": m.bRevenue,
    Expenses: m.aExpenses,
    "Expenses (prior)": m.bExpenses,
    "Net profit": m.aProfit,
    "Net profit (prior)": m.bProfit,
  }));

  const charts: { title: string; cur: keyof (typeof data)[number]; prior: keyof (typeof data)[number]; color: string }[] = [
    { title: "Revenue", cur: "Revenue", prior: "Revenue (prior)", color: t.viz.gold },
    { title: "Expenses", cur: "Expenses", prior: "Expenses (prior)", color: t.viz.teal },
    { title: "Net profit", cur: "Net profit", prior: "Net profit (prior)", color: t.viz.violet },
  ];

  return (
    <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
      {charts.map((c) => (
        <ChartCard
          key={c.title}
          title={c.title}
          subtitle="Current period vs comparison"
          right={
            <LegendKeys
              items={[
                { label: "Current", color: c.color },
                { label: "Prior", color: t.muted },
              ]}
            />
          }
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
                <CartesianGrid {...t.gridProps} />
                <XAxis dataKey="label" tick={t.axisTick} axisLine={t.axisLine} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis tick={t.axisTick} axisLine={false} tickLine={false} tickFormatter={money} width={52} />
                <Tooltip content={<ChartTooltip format={money} />} cursor={t.cursorLine} />
                <Line
                  type="monotone"
                  dataKey={c.prior}
                  stroke={t.muted}
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey={c.cur}
                  stroke={c.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      ))}
    </div>
  );
}
