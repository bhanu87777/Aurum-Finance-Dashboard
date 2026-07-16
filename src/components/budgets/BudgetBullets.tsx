"use client";

import { ChartCard } from "@/components/charts/chartKit";
import { formatMoneyCompact, monthYearLabel } from "@/lib/utils";
import type { BudgetVsActualRow } from "@/lib/budgets";

// Bullet bars, HTML/CSS (vars resolve here): the bar is actual spend, the
// strong tick is the budget. Status colors carry an icon + label per the
// reserved-status rule — never color alone.
export function BudgetBullets({ rows, month }: { rows: BudgetVsActualRow[]; month: string }) {
  const max = Math.max(...rows.map((r) => Math.max(r.actual, r.budget)), 1);

  return (
    <ChartCard title="Budget vs actual" subtitle={`Spend against plan — ${monthYearLabel(month)}`}>
      <div className="flex flex-col gap-4">
        {rows.map((r) => {
          const over = r.budget > 0 && r.ratio >= 1;
          const near = r.budget > 0 && !over && r.ratio >= 0.8;
          const fill = over ? "var(--critical)" : near ? "var(--serious)" : "var(--viz-1)";
          const barPct = (r.actual / max) * 100;
          const tickPct = (r.budget / max) * 100;
          return (
            <div key={r.category}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <p className="font-semibold">{r.category}</p>
                <p className="num text-xs text-muted">
                  <span className="font-bold text-ink">{formatMoneyCompact(r.actual)}</span>
                  {" of "}
                  {formatMoneyCompact(r.budget)}
                </p>
              </div>
              <div className="relative h-2.5 overflow-visible rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, barPct)}%`, background: fill }} />
                {/* Budget tick */}
                <span
                  className="absolute -top-0.5 h-3.5 w-0.5 rounded-full"
                  style={{ left: `${Math.min(100, tickPct)}%`, background: "var(--ink-secondary)" }}
                  aria-hidden
                />
              </div>
              <p className={`mt-1 text-[11px] ${over ? "text-critical" : near ? "text-serious" : "text-muted"}`}>
                {over ? "▲ over budget" : near ? "◷ nearing budget" : "✓ within budget"} ·{" "}
                <span className="num">{r.budget > 0 ? `${Math.round(r.ratio * 100)}% used` : "no budget set"}</span>
              </p>
            </div>
          );
        })}
        {rows.length === 0 && <p className="py-6 text-center text-sm text-muted">No budgets for this month yet — set them in the editor.</p>}
      </div>
    </ChartCard>
  );
}
