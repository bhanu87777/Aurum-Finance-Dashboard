"use client";

import { formatMoney, formatPercent } from "@/lib/utils";
import type { PeriodComparison } from "@/lib/reports";

// Per-category spend: current · prior · Δ · Δ%. Deltas are status-colored
// (rising spend reads as pressure), always signed, never color-alone.
export function DeltaTable({ comparison }: { comparison: PeriodComparison }) {
  const rows = comparison.deltas.categoryDeltas;

  return (
    <section className="panel p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold tracking-wide">Expense categories, period over period</h3>
        <p className="mt-0.5 text-xs text-muted">Current vs comparison window</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
              <th className="pb-2.5 pr-4 font-semibold">Category</th>
              <th className="pb-2.5 pr-4 text-right font-semibold">Current</th>
              <th className="pb-2.5 pr-4 text-right font-semibold">Prior</th>
              <th className="pb-2.5 pr-4 text-right font-semibold">Δ</th>
              <th className="pb-2.5 text-right font-semibold">Δ%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const delta = r.aAmount - r.bAmount;
              const up = delta > 0;
              return (
                <tr key={r.category} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-4 font-semibold">{r.category}</td>
                  <td className="num py-2.5 pr-4 text-right">{formatMoney(r.aAmount)}</td>
                  <td className="num py-2.5 pr-4 text-right text-ink-secondary">{formatMoney(r.bAmount)}</td>
                  <td className={`num py-2.5 pr-4 text-right font-bold ${up ? "text-critical" : "text-good"}`}>
                    {up ? "▲" : "▼"} {formatMoney(Math.abs(delta))}
                  </td>
                  <td className={`num py-2.5 text-right text-xs font-bold ${up ? "text-critical" : "text-good"}`}>
                    {r.deltaPct === null ? "—" : formatPercent(r.deltaPct)}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-muted">
                  No category data in this window.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
