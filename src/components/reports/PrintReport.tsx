"use client";

import { useEffect } from "react";
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { Monogram } from "@/components/Monogram";
import { formatMoney, formatMoneyCompact, monthYearLabel } from "@/lib/utils";
import type { ReportData } from "@/lib/reports";

// Light chart tokens, fixed values: the print sheet is always light no
// matter the app theme, and print viewports make ResponsiveContainer
// unreliable — every chart gets an explicit width.
const P = {
  gold: "#a17300",
  teal: "#0e7d5e",
  violet: "#6353c9",
  grid: "#e8e4d8",
  axis: "#cfcaba",
  muted: "#7d7a6d",
};

const money = (v: number) => formatMoneyCompact(v);

export function PrintReport({ data }: { data: ReportData }) {
  const { summary, monthly, topProducts, campaigns } = data;

  // Open the print dialog once charts have mounted (double-rAF settles SVG).
  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    return () => cancelAnimationFrame(raf);
  }, []);

  const chartData = monthly.map((m) => ({
    label: monthYearLabel(m.month),
    Revenue: m.revenue,
    Expenses: m.expenses,
    "Net profit": m.profit,
  }));

  return (
    <main className="print-sheet mx-auto max-w-[760px] px-8 py-10">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between border-b pb-5" style={{ borderColor: P.grid }}>
        <div className="flex items-center gap-3">
          <Monogram size={36} />
          <div>
            <p className="font-display text-xl tracking-wide">AURUM</p>
            <p className="text-xs" style={{ color: P.muted }}>
              Finance report
            </p>
          </div>
        </div>
        <p className="num text-sm font-semibold">
          {monthYearLabel(summary.start)} – {monthYearLabel(summary.end)}
        </p>
      </header>

      {/* KPIs */}
      <section className="mb-8 grid grid-cols-4 gap-4">
        {[
          { label: "Revenue", value: formatMoneyCompact(summary.revenue) },
          { label: "Expenses", value: formatMoneyCompact(summary.expenses) },
          { label: "Net profit", value: formatMoneyCompact(summary.profit) },
          { label: "Net margin", value: `${summary.marginPct.toFixed(1)}%` },
        ].map((k) => (
          <div key={k.label} className="print-panel p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.muted }}>
              {k.label}
            </p>
            <p className="num mt-1 text-xl font-bold">{k.value}</p>
          </div>
        ))}
      </section>

      {/* P&L chart */}
      <section className="print-panel mb-8 p-5">
        <h2 className="mb-3 text-sm font-bold tracking-wide">Monthly P&L</h2>
        <LineChart width={680} height={260} data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid stroke={P.grid} strokeWidth={1} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: P.muted, fontSize: 10 }} axisLine={{ stroke: P.axis }} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: P.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={money} width={52} />
          <Tooltip active={false} />
          <Line type="monotone" dataKey="Revenue" stroke={P.gold} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="Expenses" stroke={P.teal} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="Net profit" stroke={P.violet} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
        <div className="mt-2 flex gap-5 text-xs" style={{ color: P.muted }}>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 14, height: 2.5, borderRadius: 2, background: P.gold, display: "inline-block" }} /> Revenue
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 14, height: 2.5, borderRadius: 2, background: P.teal, display: "inline-block" }} /> Expenses
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 14, height: 2.5, borderRadius: 2, background: P.violet, display: "inline-block" }} /> Net profit
          </span>
        </div>
      </section>

      {/* Category breakdown */}
      <section className="print-panel mb-8 p-5">
        <h2 className="mb-3 text-sm font-bold tracking-wide">Expense composition</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-[10px] uppercase tracking-wider" style={{ borderColor: P.grid, color: P.muted }}>
              <th className="pb-2 pr-4 font-semibold">Category</th>
              <th className="pb-2 text-right font-semibold">Spend</th>
              <th className="pb-2 pl-6 text-right font-semibold">Share</th>
            </tr>
          </thead>
          <tbody>
            {summary.categoryBreakdown.map((c) => (
              <tr key={c.category} className="border-b last:border-0" style={{ borderColor: P.grid }}>
                <td className="py-2 pr-4 font-semibold">{c.category}</td>
                <td className="num py-2 text-right">{formatMoney(c.amount)}</td>
                <td className="num py-2 pl-6 text-right" style={{ color: P.muted }}>
                  {summary.expenses > 0 ? `${((c.amount / summary.expenses) * 100).toFixed(1)}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Top products */}
      <section className="print-panel mb-8 p-5">
        <h2 className="mb-3 text-sm font-bold tracking-wide">Top products by ledger revenue</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-[10px] uppercase tracking-wider" style={{ borderColor: P.grid, color: P.muted }}>
              <th className="pb-2 pr-4 font-semibold">Product</th>
              <th className="pb-2 pr-4 font-semibold">Collection</th>
              <th className="pb-2 pr-4 text-right font-semibold">Orders</th>
              <th className="pb-2 text-right font-semibold">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map((p) => (
              <tr key={p.name} className="border-b last:border-0" style={{ borderColor: P.grid }}>
                <td className="py-2 pr-4 font-semibold">{p.name}</td>
                <td className="py-2 pr-4" style={{ color: P.muted }}>
                  {p.category}
                </td>
                <td className="num py-2 pr-4 text-right">{p.txCount}</td>
                <td className="num py-2 text-right">{formatMoney(p.revenue)}</td>
              </tr>
            ))}
            {topProducts.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-sm" style={{ color: P.muted }}>
                  No ledger activity in this window.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Campaigns */}
      {campaigns.length > 0 && (
        <section className="print-panel mb-8 p-5">
          <h2 className="mb-3 text-sm font-bold tracking-wide">Campaigns launched in period</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[10px] uppercase tracking-wider" style={{ borderColor: P.grid, color: P.muted }}>
                <th className="pb-2 pr-4 font-semibold">Campaign</th>
                <th className="pb-2 pr-4 font-semibold">Channel</th>
                <th className="pb-2 pr-4 text-right font-semibold">Spend</th>
                <th className="pb-2 text-right font-semibold">Attributed / Target</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.name} className="border-b last:border-0" style={{ borderColor: P.grid }}>
                  <td className="py-2 pr-4 font-semibold">{c.name}</td>
                  <td className="py-2 pr-4" style={{ color: P.muted }}>
                    {c.channel}
                  </td>
                  <td className="num py-2 pr-4 text-right">{formatMoneyCompact(c.spend)}</td>
                  <td className="num py-2 text-right">
                    {formatMoneyCompact(c.attributedRevenue)} / {formatMoneyCompact(c.targetRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="flex items-center justify-between border-t pt-4 text-[10px]" style={{ borderColor: P.grid, color: P.muted }}>
        <span>AURUM · Finance Intelligence</span>
        <span>
          {summary.txCount} transactions · {summary.refundedCount} refunds · avg monthly revenue {formatMoneyCompact(summary.avgMonthlyRevenue)}
        </span>
      </footer>
    </main>
  );
}
