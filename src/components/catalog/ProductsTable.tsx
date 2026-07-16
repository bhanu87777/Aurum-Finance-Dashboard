"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ProductForm } from "./ProductForm";
import { formatMoney } from "@/lib/utils";
import type { ProductRow } from "@/lib/finance";

export function ProductsTable({ rows, onChanged }: { rows: ProductRow[]; onChanged: () => void }) {
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<ProductRow | null>(null);
  const [deleting, setDeleting] = useState<ProductRow | null>(null);
  const [cascadeCount, setCascadeCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function onDelete(confirm: boolean) {
    if (!deleting) return;
    setBusy(true);
    const res = await fetch(`/api/products/${deleting.id}${confirm ? "?confirm=true" : ""}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);

    if (res && res.status === 409) {
      // The ledger would cascade — surface the count and ask again.
      const data = await res.json().catch(() => null);
      setCascadeCount(data?.transactionCount ?? 0);
      return;
    }
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      toast({ kind: "error", title: "Delete failed", detail: data?.error });
    } else {
      const data = await res.json().catch(() => null);
      toast({
        kind: "success",
        title: "Product deleted",
        detail: data?.deletedTransactions > 0 ? `${data.deletedTransactions} linked transactions were also removed.` : undefined,
      });
      onChanged();
    }
    setDeleting(null);
    setCascadeCount(null);
  }

  return (
    <>
      <div className="mb-4 flex justify-end gap-2">
        <a href="/api/export/products" className="btn-ghost rounded-xl px-4 py-2.5 text-xs font-bold">
          Export CSV ↓
        </a>
        <button
          onClick={() => {
            setEditRow(null);
            setFormOpen(true);
          }}
          className="btn-gold rounded-xl px-4 py-2.5 text-xs"
        >
          + New product
        </button>
      </div>

      <section className="panel p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th className="pb-2.5 pr-4 font-semibold">Product</th>
                <th className="pb-2.5 pr-4 font-semibold">Collection</th>
                <th className="pb-2.5 pr-4 text-right font-semibold">Price</th>
                <th className="pb-2.5 pr-4 text-right font-semibold">Unit cost</th>
                <th className="pb-2.5 pr-4 text-right font-semibold">Margin</th>
                <th className="pb-2.5 pr-4 text-right font-semibold">Units</th>
                <th className="pb-2.5 pr-4 text-right font-semibold">Rating</th>
                <th className="w-24 pb-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const margin = p.price > 0 ? ((p.price - p.expense) / p.price) * 100 : 0;
                return (
                  <tr key={p.id} className="group border-b border-border/60 last:border-0">
                    <td className="py-2.5 pr-4 font-semibold">{p.name}</td>
                    <td className="py-2.5 pr-4 text-ink-secondary">{p.category}</td>
                    <td className="num py-2.5 pr-4 text-right">{formatMoney(p.price)}</td>
                    <td className="num py-2.5 pr-4 text-right text-ink-secondary">{formatMoney(p.expense)}</td>
                    <td className="num py-2.5 pr-4 text-right">{margin.toFixed(0)}%</td>
                    <td className="num py-2.5 pr-4 text-right">{p.unitsSold.toLocaleString()}</td>
                    <td className="num py-2.5 pr-4 text-right">★ {p.rating.toFixed(1)}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        <button
                          onClick={() => {
                            setEditRow(p);
                            setFormOpen(true);
                          }}
                          className="btn-ghost rounded-lg px-2.5 py-1 text-xs"
                          aria-label={`Edit ${p.name}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setDeleting(p);
                            setCascadeCount(null);
                          }}
                          className="btn-ghost rounded-lg px-2.5 py-1 text-xs text-critical"
                          aria-label={`Delete ${p.name}`}
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
                    No products yet — add the first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {formOpen && <ProductForm initial={editRow} onClose={() => setFormOpen(false)} onSaved={onChanged} />}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={cascadeCount === null ? "Delete product?" : "This also deletes ledger history"}
        body={
          cascadeCount === null
            ? `"${deleting?.name}" will be permanently removed from the catalog.`
            : `"${deleting?.name}" has ${cascadeCount} transaction${cascadeCount === 1 ? "" : "s"} in the ledger. Deleting the product removes them too.`
        }
        confirmLabel={cascadeCount === null ? "Delete" : `Delete product + ${cascadeCount} transactions`}
        danger
        busy={busy}
        onConfirm={() => onDelete(cascadeCount !== null)}
        onClose={() => {
          setDeleting(null);
          setCascadeCount(null);
        }}
      />
    </>
  );
}
