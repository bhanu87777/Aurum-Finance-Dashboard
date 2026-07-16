"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { DateField, MoneyField, SelectField, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import type { TransactionRow } from "@/lib/finance";

type ProductOption = { id: string; name: string };

const METHODS = ["CARD", "WIRE", "PAYPAL"] as const;
const STATUSES = ["COMPLETED", "PENDING", "REFUNDED"] as const;

// Create + edit drawer. Mounted only while open (state initializes straight
// from props). On edit, status choices are limited to the legal transitions
// (PENDING → COMPLETED/REFUNDED, COMPLETED → REFUNDED).
export function TransactionForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: TransactionRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const editing = Boolean(initial);

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [buyer, setBuyer] = useState(initial?.buyer ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [quantity, setQuantity] = useState(initial ? String(initial.quantity) : "1");
  const [status, setStatus] = useState<string>(initial?.status ?? "COMPLETED");
  const [method, setMethod] = useState<string>(initial?.method ?? "CARD");
  const [date, setDate] = useState(initial ? initial.occurredAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [productId, setProductId] = useState(initial?.productId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load the product options once per mount.
  useEffect(() => {
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setProducts(data.rows.map((p: ProductOption) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {});
  }, []);

  const statusOptions = !editing
    ? STATUSES
    : initial!.status === "PENDING"
      ? STATUSES
      : initial!.status === "COMPLETED"
        ? (["COMPLETED", "REFUNDED"] as const)
        : (["REFUNDED"] as const);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    const payload = {
      buyer,
      email,
      amount: Number(amount),
      quantity: Number(quantity),
      status,
      method,
      occurredAt: date ? new Date(`${date}T12:00:00Z`).toISOString() : "",
      productId,
    };
    const res = await fetch(editing ? `/api/transactions/${initial!.id}` : "/api/transactions", {
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
    toast({ kind: "success", title: editing ? "Transaction updated" : "Transaction recorded" });
    onSaved();
    onClose();
  }

  return (
    <Drawer
      open
      onClose={busy ? () => {} : onClose}
      title={editing ? "Edit transaction" : "New transaction"}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40">
            Cancel
          </button>
          <button type="button" onClick={onSubmit} disabled={busy} className="btn-gold rounded-xl px-5 py-2 text-xs disabled:opacity-60">
            {busy ? "Saving…" : editing ? "Save changes" : "Record transaction"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="Buyer" id="tx-buyer" value={buyer} onChange={(e) => setBuyer(e.target.value)} required maxLength={120} />
        <TextField label="Buyer email" id="tx-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={160} />
        <SelectField label="Product" id="tx-product" value={productId} onChange={(e) => setProductId(e.target.value)} required>
          <option value="" disabled>
            Select a product…
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-3">
          <MoneyField label="Amount" id="tx-amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <TextField label="Quantity" id="tx-qty" type="number" min={1} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Method" id="tx-method" value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m.charAt(0) + m.slice(1).toLowerCase()}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Status"
            id="tx-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            hint={editing && initial!.status !== "PENDING" ? "Refunds are final." : undefined}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </SelectField>
        </div>
        <DateField label="Date" id="tx-date" value={date} onChange={(e) => setDate(e.target.value)} required />
        {error && <p className="text-sm text-critical">{error}</p>}
      </div>
    </Drawer>
  );
}
