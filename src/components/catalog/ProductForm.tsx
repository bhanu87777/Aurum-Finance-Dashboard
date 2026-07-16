"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { MoneyField, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import type { ProductRow } from "@/lib/finance";

// Mounted only while open — state initializes straight from props.
export function ProductForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: ProductRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const editing = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [price, setPrice] = useState(initial ? String(initial.price) : "");
  const [expense, setExpense] = useState(initial ? String(initial.expense) : "");
  const [unitsSold, setUnitsSold] = useState(initial ? String(initial.unitsSold) : "0");
  const [rating, setRating] = useState(initial ? String(initial.rating) : "4.5");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    const payload = {
      name,
      category,
      price: Number(price),
      expense: Number(expense),
      unitsSold: Number(unitsSold),
      rating: Number(rating),
    };
    const res = await fetch(editing ? `/api/products/${initial!.id}` : "/api/products", {
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
    toast({ kind: "success", title: editing ? "Product updated" : "Product added" });
    onSaved();
    onClose();
  }

  return (
    <Drawer
      open
      onClose={busy ? () => {} : onClose}
      title={editing ? "Edit product" : "New product"}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-40">
            Cancel
          </button>
          <button type="button" onClick={onSubmit} disabled={busy} className="btn-gold rounded-xl px-5 py-2 text-xs disabled:opacity-60">
            {busy ? "Saving…" : editing ? "Save changes" : "Add product"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField label="Name" id="pr-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
        <TextField
          label="Collection"
          id="pr-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          maxLength={60}
          hint="e.g. Timepieces, Jewelry, Fragrance"
        />
        <div className="grid grid-cols-2 gap-3">
          <MoneyField label="Price" id="pr-price" value={price} onChange={(e) => setPrice(e.target.value)} required />
          <MoneyField label="Unit cost" id="pr-expense" value={expense} onChange={(e) => setExpense(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Units sold" id="pr-units" type="number" min={0} step={1} value={unitsSold} onChange={(e) => setUnitsSold(e.target.value)} />
          <TextField label="Rating (0–5)" id="pr-rating" type="number" min={0} max={5} step={0.1} value={rating} onChange={(e) => setRating(e.target.value)} />
        </div>
        {error && <p className="text-sm text-critical">{error}</p>}
      </div>
    </Drawer>
  );
}
