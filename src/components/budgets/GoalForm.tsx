"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { MoneyField, SelectField, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import type { GoalRow } from "@/lib/goals";

const toYm = (iso: string) => iso.slice(0, 7);

// Mounted only while open — state initializes straight from props.
export function GoalForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: GoalRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const editing = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? "");
  const [metric, setMetric] = useState<string>(initial?.metric ?? "REVENUE");
  const [targetValue, setTargetValue] = useState(initial ? String(initial.targetValue) : "");
  const [startMonth, setStartMonth] = useState(initial ? toYm(initial.startMonth) : new Date().toISOString().slice(0, 7));
  const [deadline, setDeadline] = useState(initial ? toYm(initial.deadline) : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    const payload = { name, metric, targetValue: Number(targetValue), startMonth, deadline };
    const res = await fetch(editing ? `/api/goals/${initial!.id}` : "/api/goals", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    setBusy(false);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      setError(data?.error ?? "Something went wrong. Try again.");
      return;
    }
    toast({ kind: "success", title: editing ? "Goal updated" : "Goal created" });
    onSaved();
    onClose();
  }

  return (
    <Drawer
      open
      onClose={busy ? () => {} : onClose}
      title={editing ? "Edit goal" : "New goal"}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40">
            Cancel
          </button>
          <button type="button" onClick={onSubmit} disabled={busy} className="btn-gold rounded-xl px-5 py-2 text-xs disabled:opacity-60">
            {busy ? "Saving…" : editing ? "Save changes" : "Set goal"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="Name" id="gl-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} hint="e.g. FY27 Revenue" />
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Metric" id="gl-metric" value={metric} onChange={(e) => setMetric(e.target.value)}>
            <option value="REVENUE">Revenue</option>
            <option value="PROFIT">Profit</option>
          </SelectField>
          <MoneyField label="Target" id="gl-target" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="From month" id="gl-start" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} required />
          <TextField label="Deadline month" id="gl-deadline" type="month" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
        </div>
        <p className="text-xs text-muted">Progress accumulates {metric === "REVENUE" ? "revenue" : "profit"} across the inclusive month window.</p>
        {error && <p className="text-sm text-critical">{error}</p>}
      </div>
    </Drawer>
  );
}
