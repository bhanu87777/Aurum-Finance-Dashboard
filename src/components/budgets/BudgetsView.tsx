"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { BudgetEditor } from "./BudgetEditor";
import { BudgetBullets } from "./BudgetBullets";
import { GoalsPanel } from "./GoalsPanel";
import { monthYearLabel } from "@/lib/utils";
import type { BudgetVsActualRow } from "@/lib/budgets";
import type { GoalRow } from "@/lib/goals";

// One month in focus; the selector walks the booked months.
export function BudgetsView({
  rows,
  goals,
  latestMonth,
}: {
  rows: BudgetVsActualRow[];
  goals: GoalRow[];
  latestMonth: string;
}) {
  const router = useRouter();
  const toast = useToast();

  const months = useMemo(() => {
    const set = new Set(rows.map((r) => r.month));
    return Array.from(set).sort();
  }, [rows]);

  const [month, setMonth] = useState(() => (months.includes(latestMonth) ? latestMonth : months[months.length - 1] ?? latestMonth));
  const idx = months.indexOf(month);
  const monthRows = useMemo(() => rows.filter((r) => r.month === month), [rows, month]);

  const [copying, setCopying] = useState(false);

  async function copyForward() {
    // Copy this month's budgets into the following calendar month.
    const d = new Date(month);
    const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
    const fmt = (x: Date) => `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}`;
    setCopying(true);
    const res = await fetch("/api/budgets/copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromMonth: fmt(d), toMonth: fmt(target) }),
    }).catch(() => null);
    setCopying(false);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      toast({ kind: "error", title: "Copy failed", detail: data?.error });
      return;
    }
    const { count } = await res.json();
    toast({ kind: "success", title: `Copied ${count} budgets to ${monthYearLabel(target.toISOString())}` });
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Budgets & goals</h1>
          <p className="mt-1 text-sm text-ink-secondary">Planned spend against the books, and the targets that matter.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth(months[idx - 1])}
            disabled={idx <= 0}
            className="btn-ghost rounded-lg px-3 py-1.5 text-xs disabled:opacity-40"
            aria-label="Previous month"
          >
            ←
          </button>
          <p className="num w-24 text-center text-sm font-bold">{monthYearLabel(month)}</p>
          <button
            onClick={() => setMonth(months[idx + 1])}
            disabled={idx >= months.length - 1}
            className="btn-ghost rounded-lg px-3 py-1.5 text-xs disabled:opacity-40"
            aria-label="Next month"
          >
            →
          </button>
          <button onClick={copyForward} disabled={copying} className="btn-ghost ml-2 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40">
            {copying ? "Copying…" : "Copy to next month →"}
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <BudgetBullets rows={monthRows} month={month} />
        <BudgetEditor key={month} rows={monthRows} month={month} onSaved={() => router.refresh()} />
      </div>

      <GoalsPanel goals={goals} onChanged={() => router.refresh()} />
    </div>
  );
}
