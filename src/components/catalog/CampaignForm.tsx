"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { DateField, MoneyField, SelectField, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import type { CampaignRow } from "@/lib/finance";

const STATUSES = ["ACTIVE", "COMPLETED", "PAUSED"] as const;

// Mounted only while open — state initializes straight from props.
export function CampaignForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: CampaignRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const editing = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? "");
  const [channel, setChannel] = useState(initial?.channel ?? "");
  const [status, setStatus] = useState<string>(initial?.status ?? "ACTIVE");
  const [startedAt, setStartedAt] = useState(
    initial?.startedAt ? initial.startedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [budget, setBudget] = useState(initial ? String(initial.budget) : "");
  const [spend, setSpend] = useState(initial ? String(initial.spend) : "0");
  const [targetRevenue, setTargetRevenue] = useState(initial ? String(initial.targetRevenue) : "");
  const [attributedRevenue, setAttributedRevenue] = useState(initial ? String(initial.attributedRevenue) : "0");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    const payload = {
      name,
      channel,
      status,
      startedAt: startedAt ? new Date(`${startedAt}T12:00:00Z`).toISOString() : "",
      budget: Number(budget),
      spend: Number(spend),
      targetRevenue: Number(targetRevenue),
      attributedRevenue: Number(attributedRevenue),
    };
    const res = await fetch(editing ? `/api/campaigns/${initial!.id}` : "/api/campaigns", {
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
    toast({ kind: "success", title: editing ? "Campaign updated" : "Campaign created" });
    onSaved();
    onClose();
  }

  return (
    <Drawer
      open
      onClose={busy ? () => {} : onClose}
      title={editing ? "Edit campaign" : "New campaign"}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40">
            Cancel
          </button>
          <button type="button" onClick={onSubmit} disabled={busy} className="btn-gold rounded-xl px-5 py-2 text-xs disabled:opacity-60">
            {busy ? "Saving…" : editing ? "Save changes" : "Create campaign"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="Name" id="cp-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
        <TextField
          label="Channel"
          id="cp-channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          required
          maxLength={60}
          hint="e.g. Paid Social, Events, Influencer"
        />
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Status" id="cp-status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </SelectField>
          <DateField label="Start date" id="cp-start" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MoneyField label="Budget" id="cp-budget" value={budget} onChange={(e) => setBudget(e.target.value)} required />
          <MoneyField label="Spend to date" id="cp-spend" value={spend} onChange={(e) => setSpend(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MoneyField label="Revenue target" id="cp-target" value={targetRevenue} onChange={(e) => setTargetRevenue(e.target.value)} required />
          <MoneyField label="Attributed revenue" id="cp-attr" value={attributedRevenue} onChange={(e) => setAttributedRevenue(e.target.value)} />
        </div>
        {error && <p className="text-sm text-critical">{error}</p>}
      </div>
    </Drawer>
  );
}
