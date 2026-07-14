"use client";

import { useMemo, useState } from "react";
import { StatTile } from "./StatTile";
import { RevenueExpensesChart, MonthlyRevenueBar, ProfitTrendChart, OpexChart } from "./PnlCharts";
import { ExpenseDonut, CampaignBoard, ProductScatter } from "./CompositionCharts";
import { RecentTransactions, TopProducts } from "./Tables";
import { formatMoneyCompact } from "@/lib/utils";
import type { CampaignRow, CategoryRow, MonthRow, ProductRow, TransactionRow } from "@/lib/finance";

type RangeKey = "12m" | "24m" | "ytd";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "12m", label: "Last 12 months" },
  { key: "24m", label: "Last 24 months" },
  { key: "ytd", label: "Year to date" },
];

// One filter row scopes every chart, stat, and table below it, so the
// numbers always agree (products are the all-time catalog and say so).
export function DashboardShell({
  months,
  categories,
  products,
  transactions,
  campaigns,
}: {
  months: MonthRow[];
  categories: CategoryRow[];
  products: ProductRow[];
  transactions: TransactionRow[];
  campaigns: CampaignRow[];
}) {
  const [range, setRange] = useState<RangeKey>("12m");

  const { scopedMonths, scopedCategories, scopedTransactions, kpis } = useMemo(() => {
    const latest = months.length ? new Date(months[months.length - 1].month) : new Date();
    let cutoff: Date;
    if (range === "ytd") {
      cutoff = new Date(Date.UTC(latest.getUTCFullYear(), 0, 1));
    } else {
      const back = range === "12m" ? 11 : 23;
      cutoff = new Date(Date.UTC(latest.getUTCFullYear(), latest.getUTCMonth() - back, 1));
    }
    const inRange = (iso: string) => new Date(iso) >= cutoff;

    const scopedMonths = months.filter((m) => inRange(m.month));
    const scopedCategories = categories.filter((c) => inRange(c.month));
    const scopedTransactions = transactions.filter((t) => inRange(t.occurredAt)).slice(0, 8);

    // Compare against the previous window of equal length.
    const n = scopedMonths.length;
    const prevWindow = months.filter((m) => !inRange(m.month)).slice(-n);
    const sum = (rows: MonthRow[], k: "revenue" | "expenses" | "profit") => rows.reduce((s, r) => s + r[k], 0);

    const revenue = sum(scopedMonths, "revenue");
    const expenses = sum(scopedMonths, "expenses");
    const profit = sum(scopedMonths, "profit");
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const pct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : undefined);
    const prevRevenue = sum(prevWindow, "revenue");
    const prevExpenses = sum(prevWindow, "expenses");
    const prevProfit = sum(prevWindow, "profit");
    const prevMargin = prevRevenue > 0 ? (prevProfit / prevRevenue) * 100 : undefined;

    return {
      scopedMonths,
      scopedCategories,
      scopedTransactions,
      kpis: {
        revenue,
        expenses,
        profit,
        margin,
        dRevenue: prevWindow.length === n ? pct(revenue, prevRevenue) : undefined,
        dExpenses: prevWindow.length === n ? pct(expenses, prevExpenses) : undefined,
        dProfit: prevWindow.length === n ? pct(profit, prevProfit) : undefined,
        dMargin: prevWindow.length === n && prevMargin !== undefined ? margin - prevMargin : undefined,
      },
    };
  }, [months, categories, transactions, range]);

  const deltaLabel = range === "ytd" ? "vs prior period" : `vs previous ${scopedMonths.length} mo`;

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      {/* Header + the one filter row */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Finance overview</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            The books at a glance — every panel below is scoped by this range.
          </p>
        </div>
        <div className="flex rounded-xl border border-border bg-surface p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                range === r.key ? "bg-[rgba(226,185,91,0.14)] text-gold" : "text-ink-secondary hover:text-ink"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Revenue"
          value={formatMoneyCompact(kpis.revenue)}
          delta={kpis.dRevenue}
          deltaLabel={deltaLabel}
          trend={scopedMonths.map((m) => m.revenue)}
        />
        <StatTile
          label="Expenses"
          value={formatMoneyCompact(kpis.expenses)}
          delta={kpis.dExpenses}
          deltaLabel={deltaLabel}
          upIsGood={false}
          trend={scopedMonths.map((m) => m.expenses)}
        />
        <StatTile
          label="Net profit"
          value={formatMoneyCompact(kpis.profit)}
          delta={kpis.dProfit}
          deltaLabel={deltaLabel}
          trend={scopedMonths.map((m) => m.profit)}
        />
        <StatTile
          label="Net margin"
          value={`${kpis.margin.toFixed(1)}%`}
          delta={kpis.dMargin}
          deltaLabel={`pts ${deltaLabel}`}
          trend={scopedMonths.map((m) => (m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0))}
        />
      </div>

      {/* P&L row */}
      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueExpensesChart months={scopedMonths} />
        </div>
        <MonthlyRevenueBar months={scopedMonths} />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ProfitTrendChart months={scopedMonths} />
        <OpexChart months={scopedMonths} />
        <ExpenseDonut categories={scopedCategories} />
      </div>

      {/* Products & campaigns */}
      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ProductScatter products={products} />
        </div>
        <CampaignBoard campaigns={campaigns} />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentTransactions rows={scopedTransactions} />
        </div>
        <TopProducts rows={products} />
      </div>
    </div>
  );
}
