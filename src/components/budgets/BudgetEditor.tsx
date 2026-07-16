"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { formatMoney, formatPercent, monthYearLabel } from "@/lib/utils";
import type { BudgetVsActualRow } from "@/lib/budgets";

// Inline editor: budget amounts save on blur / Enter via PUT upsert.
// Render with key={month} — switching months remounts and drops drafts.
export function BudgetEditor({
  rows,
  month,
  onSaved,
}: {
  rows: BudgetVsActualRow[];
  month: string;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function save(category: string) {
    const draft = drafts[category];
    if (draft === undefined) return;
    const current = rows.find((r) => r.category === category);
    if (current && Number(draft) === current.budget) return; // unchanged

    const ym = `${new Date(month).getUTCFullYear()}-${String(new Date(month).getUTCMonth() + 1).padStart(2, "0")}`;
    const res = await fetch("/api/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: [{ month: ym, category, amount: Number(draft) }] }),
    }).catch(() => null);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      toast({ kind: "error", title: "Budget not saved", detail: data?.error });
      return;
    }
    toast({ kind: "success", title: `${category} budget updated` });
    setDrafts((d) => {
      const next = { ...d };
      delete next[category];
      return next;
    });
    onSaved();
  }

  return (
    <section className="panel p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold tracking-wide">Budget editor</h3>
        <p className="mt-0.5 text-xs text-muted">{monthYearLabel(month)} — edits save on blur or Enter</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
              <th className="pb-2.5 pr-4 font-semibold">Category</th>
              <th className="pb-2.5 pr-4 text-right font-semibold">Budget</th>
              <th className="pb-2.5 pr-4 text-right font-semibold">Actual</th>
              <th className="pb-2.5 text-right font-semibold">Variance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const variancePct = r.budget > 0 ? ((r.actual - r.budget) / r.budget) * 100 : 0;
              const over = r.budget > 0 && r.actual > r.budget;
              return (
                <tr key={r.category} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-4 font-semibold">{r.category}</td>
                  <td className="py-2.5 pr-4 text-right">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      aria-label={`${r.category} budget`}
                      className="input num max-w-32 py-1.5 text-right text-sm"
                      value={drafts[r.category] ?? String(r.budget)}
                      onChange={(e) => setDrafts((d) => ({ ...d, [r.category]: e.target.value }))}
                      onBlur={() => save(r.category)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                    />
                  </td>
                  <td className="num py-2.5 pr-4 text-right">{formatMoney(r.actual)}</td>
                  <td className={`num py-2.5 text-right text-xs font-bold ${over ? "text-critical" : "text-good"}`}>
                    {over ? "▲" : "▼"} {formatPercent(Math.abs(variancePct)).replace("+", "")}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-muted">
                  No budgets for this month — use “Copy to next month” from a budgeted month, or seed one here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
