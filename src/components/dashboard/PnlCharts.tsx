"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, ChartTooltip, LegendKeys, useChartTheme } from "@/components/charts/chartKit";
import { formatMoneyCompact, monthYearLabel } from "@/lib/utils";
import type { MonthRow } from "@/lib/finance";

// Entity → color, constant across every chart (color follows the entity):
// revenue gold · expenses teal · profit violet · operational sky · non-op orange.
const money = (v: number) => formatMoneyCompact(v);

export function RevenueExpensesChart({ months }: { months: MonthRow[] }) {
  const t = useChartTheme();
  const data = months.map((m) => ({
    label: monthYearLabel(m.month),
    Revenue: m.revenue,
    Expenses: m.expenses,
  }));
  return (
    <ChartCard
      title="Revenue vs Expenses"
      subtitle="Monthly totals across the selected range"
      right={<LegendKeys items={[{ label: "Revenue", color: t.viz.gold, shape: "rect" }, { label: "Expenses", color: t.viz.teal, shape: "rect" }]} />}
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid {...t.gridProps} />
            <XAxis dataKey="label" tick={t.axisTick} axisLine={t.axisLine} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={t.axisTick} axisLine={false} tickLine={false} tickFormatter={money} width={52} />
            <Tooltip content={<ChartTooltip format={money} />} cursor={t.cursorLine} />
            <Area type="monotone" dataKey="Revenue" stroke={t.viz.gold} strokeWidth={2} fill={t.viz.gold} fillOpacity={0.1} activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }} isAnimationActive={false} />
            <Area type="monotone" dataKey="Expenses" stroke={t.viz.teal} strokeWidth={2} fill={t.viz.teal} fillOpacity={0.1} activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function MonthlyRevenueBar({ months }: { months: MonthRow[] }) {
  const t = useChartTheme();
  const data = months.map((m) => ({ label: monthYearLabel(m.month), Revenue: m.revenue }));
  return (
    <ChartCard title="Revenue by month" subtitle="One bar per month — single series">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 4 }} barCategoryGap="30%">
            <CartesianGrid {...t.gridProps} />
            <XAxis dataKey="label" tick={t.axisTick} axisLine={t.axisLine} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={t.axisTick} axisLine={false} tickLine={false} tickFormatter={money} width={52} />
            <Tooltip content={<ChartTooltip format={money} />} cursor={{ fill: t.hoverFill }} />
            <Bar dataKey="Revenue" fill={t.viz.gold} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function ProfitTrendChart({ months }: { months: MonthRow[] }) {
  const t = useChartTheme();
  const data = months.map((m) => ({
    label: monthYearLabel(m.month),
    "Net profit": m.profit,
  }));
  return (
    <ChartCard title="Net profit" subtitle="Revenue minus total expenses, by month">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid {...t.gridProps} />
            <XAxis dataKey="label" tick={t.axisTick} axisLine={t.axisLine} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={t.axisTick} axisLine={false} tickLine={false} tickFormatter={money} width={52} />
            <Tooltip content={<ChartTooltip format={money} />} cursor={t.cursorLine} />
            <Line type="monotone" dataKey="Net profit" stroke={t.viz.violet} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function OpexChart({ months }: { months: MonthRow[] }) {
  const t = useChartTheme();
  const data = months.map((m) => ({
    label: monthYearLabel(m.month),
    Operational: m.operational,
    "Non-operational": m.nonOperational,
  }));
  return (
    <ChartCard
      title="Operational vs non-operational"
      subtitle="Where the expense base actually sits"
      right={<LegendKeys items={[{ label: "Operational", color: t.viz.sky }, { label: "Non-operational", color: t.viz.orange }]} />}
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid {...t.gridProps} />
            <XAxis dataKey="label" tick={t.axisTick} axisLine={t.axisLine} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={t.axisTick} axisLine={false} tickLine={false} tickFormatter={money} width={52} />
            <Tooltip content={<ChartTooltip format={money} />} cursor={t.cursorLine} />
            <Line type="monotone" dataKey="Operational" stroke={t.viz.sky} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="Non-operational" stroke={t.viz.orange} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: t.surface, strokeWidth: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
