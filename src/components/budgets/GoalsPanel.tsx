"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/dashboard/Tables";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { GoalForm } from "./GoalForm";
import { formatMoneyCompact, monthYearLabel } from "@/lib/utils";
import type { GoalRow } from "@/lib/goals";

export function GoalsPanel({ goals, onChanged }: { goals: GoalRow[]; onChanged: () => void }) {
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<GoalRow | null>(null);
  const [deleting, setDeleting] = useState<GoalRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await fetch(`/api/goals/${deleting.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setDeleting(null);

    if (!res || !res.ok) {
      toast({ kind: "error", title: "Delete failed" });
      return;
    }
    toast({ kind: "success", title: "Goal removed" });
    onChanged();
  }

  return (
    <>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold tracking-wide">Financial goals</h2>
          <p className="mt-0.5 text-xs text-muted">Cumulative targets, tracked against the books</p>
        </div>
        <button
          onClick={() => {
            setEditRow(null);
            setFormOpen(true);
          }}
          className="btn-gold rounded-xl px-4 py-2.5 text-xs"
        >
          + New goal
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {goals.map((g) => {
          const meterStatus =
            g.status === "ACHIEVED" ? "good" : g.status === "AT_RISK" ? "warning" : g.status === "EXPIRED" ? "critical" : "default";
          return (
            <div key={g.id} className="panel panel-hover group p-5">
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="font-semibold">{g.name}</p>
                <StatusBadge status={g.status} />
              </div>
              <p className="mb-4 text-xs text-muted">
                {g.metric === "REVENUE" ? "Revenue" : "Profit"} · {monthYearLabel(g.startMonth)} – {monthYearLabel(g.deadline)}
              </p>
              <ProgressMeter
                value={g.currentValue}
                max={g.targetValue}
                label={`${formatMoneyCompact(g.currentValue)} of ${formatMoneyCompact(g.targetValue)}`}
                valueLabel={`${Math.round(g.progressPct)}%`}
                status={meterStatus}
              />
              <div className="mt-3 flex items-center justify-between">
                <p className="text-[11px] text-muted">
                  {g.status === "ACHIEVED"
                    ? "Target met"
                    : g.status === "EXPIRED"
                      ? "Window closed"
                      : `${g.monthsElapsed} of ${g.monthsTotal} months elapsed`}
                </p>
                <div className="flex gap-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    onClick={() => {
                      setEditRow(g);
                      setFormOpen(true);
                    }}
                    className="btn-ghost rounded-lg px-2.5 py-1 text-xs"
                    aria-label={`Edit ${g.name}`}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleting(g)}
                    className="btn-ghost rounded-lg px-2.5 py-1 text-xs text-critical"
                    aria-label={`Delete ${g.name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && (
          <div className="panel col-span-full p-8 text-center text-sm text-muted">No goals yet — set the first target.</div>
        )}
      </div>

      {formOpen && <GoalForm initial={editRow} onClose={() => setFormOpen(false)} onSaved={onChanged} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete goal?"
        body={`"${deleting?.name}" will be removed. The underlying financials are untouched.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={onDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
