"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/dashboard/Tables";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { CampaignForm } from "./CampaignForm";
import { formatMoneyCompact, dateLabel } from "@/lib/utils";
import type { CampaignRow } from "@/lib/finance";

export function CampaignsTable({ rows, onChanged }: { rows: CampaignRow[]; onChanged: () => void }) {
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<CampaignRow | null>(null);
  const [deleting, setDeleting] = useState<CampaignRow | null>(null);
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!deleting) return;
    setBusy(true);
    const res = await fetch(`/api/campaigns/${deleting.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setDeleting(null);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      toast({ kind: "error", title: "Delete failed", detail: data?.error });
      return;
    }
    toast({ kind: "success", title: "Campaign deleted" });
    onChanged();
  }

  return (
    <>
      <div className="mb-4 flex justify-end gap-2">
        <a href="/api/export/campaigns" className="btn-ghost rounded-xl px-4 py-2.5 text-xs font-bold">
          Export CSV ↓
        </a>
        <button
          onClick={() => {
            setEditRow(null);
            setFormOpen(true);
          }}
          className="btn-gold rounded-xl px-4 py-2.5 text-xs"
        >
          + New campaign
        </button>
      </div>

      <section className="panel p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th className="pb-2.5 pr-4 font-semibold">Campaign</th>
                <th className="pb-2.5 pr-4 font-semibold">Channel</th>
                <th className="pb-2.5 pr-4 font-semibold">Status</th>
                <th className="pb-2.5 pr-4 font-semibold">Started</th>
                <th className="pb-2.5 pr-4 text-right font-semibold">Spend / Budget</th>
                <th className="pb-2.5 pr-4 text-right font-semibold">Attributed / Target</th>
                <th className="pb-2.5 pr-4 text-right font-semibold">ROI</th>
                <th className="w-24 pb-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const roi = c.spend > 0 ? c.attributedRevenue / c.spend : 0;
                return (
                  <tr key={c.id} className="group border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4 font-semibold">{c.name}</td>
                    <td className="py-2.5 pr-4 text-ink-secondary">{c.channel}</td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-2.5 pr-4 text-ink-secondary">{dateLabel(c.startedAt)}</td>
                    <td className="num py-2.5 pr-4 text-right">
                      <span className="font-bold">{formatMoneyCompact(c.spend)}</span>
                      <span className="text-muted"> / {formatMoneyCompact(c.budget)}</span>
                    </td>
                    <td className="num py-2.5 pr-4 text-right">
                      <span className="font-bold">{formatMoneyCompact(c.attributedRevenue)}</span>
                      <span className="text-muted"> / {formatMoneyCompact(c.targetRevenue)}</span>
                    </td>
                    <td className="num py-2.5 pr-4 text-right">{roi.toFixed(1)}x</td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        <button
                          onClick={() => {
                            setEditRow(c);
                            setFormOpen(true);
                          }}
                          className="btn-ghost rounded-lg px-2.5 py-1 text-xs"
                          aria-label={`Edit ${c.name}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleting(c)}
                          className="btn-ghost rounded-lg px-2.5 py-1 text-xs text-critical"
                          aria-label={`Delete ${c.name}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-muted">
                    No campaigns yet — create the first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {formOpen && <CampaignForm initial={editRow} onClose={() => setFormOpen(false)} onSaved={onChanged} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete campaign?"
        body={`"${deleting?.name}" will be permanently removed.`}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={onDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
