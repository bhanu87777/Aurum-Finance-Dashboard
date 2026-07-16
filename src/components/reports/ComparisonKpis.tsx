"use client";

import { formatMoneyCompact, formatPercent } from "@/lib/utils";
import type { PeriodComparison } from "@/lib/reports";

function DeltaChip({ delta, upIsGood = true, unit = "%" }: { delta: number | null; upIsGood?: boolean; unit?: string }) {
  if (delta === null) return <span className="text-xs text-muted">no comparison</span>;
  const good = (delta >= 0) === upIsGood;
  return (
    <span className={`text-xs font-bold ${good ? "text-good" : "text-critical"}`}>
      {delta >= 0 ? "▲" : "▼"} {unit === "%" ? formatPercent(delta) : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}${unit}`}
    </span>
  );
}

// KPI tiles: big current value, prior beneath, delta chip.
export function ComparisonKpis({ comparison }: { comparison: PeriodComparison }) {
  const { a, b, deltas } = comparison;
  const tiles = [
    { label: "Revenue", cur: formatMoneyCompact(a.revenue), prior: formatMoneyCompact(b.revenue), delta: deltas.revenuePct, upIsGood: true, unit: "%" },
    { label: "Expenses", cur: formatMoneyCompact(a.expenses), prior: formatMoneyCompact(b.expenses), delta: deltas.expensesPct, upIsGood: false, unit: "%" },
    { label: "Net profit", cur: formatMoneyCompact(a.profit), prior: formatMoneyCompact(b.profit), delta: deltas.profitPct, upIsGood: true, unit: "%" },
    { label: "Net margin", cur: `${a.marginPct.toFixed(1)}%`, prior: `${b.marginPct.toFixed(1)}%`, delta: deltas.marginPts, upIsGood: true, unit: " pts" },
  ];

  return (
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="panel panel-hover p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t.label}</p>
          <p className="num mt-1.5 text-[1.75rem] font-bold leading-none">{t.cur}</p>
          <p className="mt-2 text-xs">
            <DeltaChip delta={t.delta} upIsGood={t.upIsGood} unit={t.unit} />{" "}
            <span className="text-muted">vs {t.prior}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
