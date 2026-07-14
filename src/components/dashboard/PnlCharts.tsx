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
import { formatMoneyCompact, monthYearLabel } from "@/lib/utils";
import type { MonthRow } from "@/lib/finance";

// Entity → color, constant across every chart (color follows the entity):
// revenue gold · expenses teal · profit violet · operational sky · non-op orange.
const money = (v: number) => formatMoneyCompact(v);

export function RevenueExpensesChart({ months }: { months: MonthRow[] }) {
  const data = months.map((m) => ({
    label: monthYearLabel(m.month),
    Revenue: m.revenue,
    Expenses: m.expenses,
  }));
  return (
    <ChartCard
      title="Revenue vs Expenses"
      subtitle="Monthly totals across the selected range"
      right={<LegendKeys items={[{ label: "Revenue", color: VIZ.gold, shape: "rect" }, { label: "Expenses", color: VIZ.teal, shape: "rect" }]} />}
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" tick={axisTick} axisLine={axisLine} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={money} width={52} />
            <Tooltip content={<ChartTooltip format={money} />} cursor={cursorLine} />
            <Area type="monotone" dataKey="Revenue" stroke={VIZ.gold} strokeWidth={2} fill={VIZ.gold} fillOpacity={0.1} activeDot={{ r: 4, stroke: SURFACE, strokeWidth: 2 }} isAnimationActive={false} />
            <Area type="monotone" dataKey="Expenses" stroke={VIZ.teal} strokeWidth={2} fill={VIZ.teal} fillOpacity={0.1} activeDot={{ r: 4, stroke: SURFACE, strokeWidth: 2 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function MonthlyRevenueBar({ months }: { months: MonthRow[] }) {
  const data = months.map((m) => ({ label: monthYearLabel(m.month), Revenue: m.revenue }));
  return (
    <ChartCard title="Revenue by month" subtitle="One bar per month — single series">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 4 }} barCategoryGap="30%">
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" tick={axisTick} axisLine={axisLine} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={money} width={52} />
            <Tooltip content={<ChartTooltip format={money} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="Revenue" fill={VIZ.gold} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function ProfitTrendChart({ months }: { months: MonthRow[] }) {
  const data = months.map((m) => ({
    label: monthYearLabel(m.month),
    "Net profit": m.profit,
  }));
  return (
    <ChartCard title="Net profit" subtitle="Revenue minus total expenses, by month">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" tick={axisTick} axisLine={axisLine} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={money} width={52} />
            <Tooltip content={<ChartTooltip format={money} />} cursor={cursorLine} />
            <Line type="monotone" dataKey="Net profit" stroke={VIZ.violet} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: SURFACE, strokeWidth: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function OpexChart({ months }: { months: MonthRow[] }) {
  const data = months.map((m) => ({
    label: monthYearLabel(m.month),
    Operational: m.operational,
    "Non-operational": m.nonOperational,
  }));
  return (
    <ChartCard
      title="Operational vs non-operational"
      subtitle="Where the expense base actually sits"
      right={<LegendKeys items={[{ label: "Operational", color: VIZ.sky }, { label: "Non-operational", color: VIZ.orange }]} />}
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" tick={axisTick} axisLine={axisLine} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={money} width={52} />
            <Tooltip content={<ChartTooltip format={money} />} cursor={cursorLine} />
            <Line type="monotone" dataKey="Operational" stroke={VIZ.sky} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: SURFACE, strokeWidth: 2 }} isAnimationActive={false} />
            <Line type="monotone" dataKey="Non-operational" stroke={VIZ.orange} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: SURFACE, strokeWidth: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
