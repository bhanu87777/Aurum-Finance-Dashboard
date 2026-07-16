"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/Tables";
import { Segmented } from "@/components/ui/Segmented";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { TransactionForm } from "./TransactionForm";
import { formatMoney, dateLabel } from "@/lib/utils";
import type { TransactionRow } from "@/lib/finance";

const STATUSES = ["ALL", "COMPLETED", "PENDING", "REFUNDED"] as const;

export function LedgerView({ initialQuery = "", pageSize = 15 }: { initialQuery?: string; pageSize?: number }) {
  const PAGE_SIZE = pageSize;
  const toast = useToast();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("ALL");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Selection is page-scoped: navigating or refetching clears it.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<TransactionRow | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async (q: string, s: string, p: number) => {
    setLoading(true);
    setSelected(new Set());
    const params = new URLSearchParams({ page: String(p), take: String(PAGE_SIZE) });
    if (q) params.set("query", q);
    if (s !== "ALL") params.set("status", s);
    const res = await fetch(`/api/transactions?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.rows);
      setTotal(data.total);
    }
    setLoading(false);
  }, [PAGE_SIZE]);

  useEffect(() => {
    // Initial load: `loading` starts true, so only the async completion sets state.
    const controller = new AbortController();
    const params = new URLSearchParams({ page: "1", take: String(PAGE_SIZE) });
    if (initialQuery) params.set("query", initialQuery);
    fetch(`/api/transactions?${params}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setRows(data.rows);
          setTotal(data.total);
        }
        setLoading(false);
      })
      .catch(() => {});
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reload() {
    load(query, status, page);
  }

  function onSearch(value: string) {
    setQuery(value);
    setPage(1);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(value, status, 1), 300);
  }

  function onStatus(value: (typeof STATUSES)[number]) {
    setStatus(value);
    setPage(1);
    load(query, value, 1);
  }

  function onPage(p: number) {
    setPage(p);
    load(query, status, p);
  }

  async function exportCsv() {
    const params = new URLSearchParams({ page: "1", take: "200" });
    if (query) params.set("query", query);
    if (status !== "ALL") params.set("status", status);
    const res = await fetch(`/api/transactions?${params}`);
    if (!res.ok) return;
    const data: { rows: TransactionRow[] } = await res.json();
    downloadCsv(data.rows, "aurum-transactions.csv");
  }

  function downloadCsv(list: TransactionRow[], filename: string) {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = [
      "Date,Buyer,Email,Product,Quantity,Method,Status,Amount",
      ...list.map((r) =>
        [dateLabel(r.occurredAt), esc(r.buyer), esc(r.email), esc(r.productName), r.quantity, r.method, r.status, r.amount.toFixed(2)].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  }

  async function bulk(action: "delete" | "setStatus", newStatus?: string) {
    setBulkBusy(true);
    const res = await fetch("/api/transactions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids: Array.from(selected), status: newStatus }),
    }).catch(() => null);
    setBulkBusy(false);
    setConfirmBulkDelete(false);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      toast({ kind: "error", title: "Bulk action failed", detail: data?.error });
      return;
    }
    const { count, skipped } = await res.json();
    toast({
      kind: "success",
      title: action === "delete" ? `Deleted ${count} transaction${count === 1 ? "" : "s"}` : `Updated ${count} transaction${count === 1 ? "" : "s"}`,
      detail: skipped > 0 ? `${skipped} skipped (refunds are final).` : undefined,
    });
    reload();
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allSelected = rows.length > 0 && selected.size === rows.length;

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Transactions</h1>
          <p className="mt-1 text-sm text-ink-secondary">The full ledger — search, filter, record, export.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} className="btn-ghost rounded-xl px-4 py-2.5 text-xs font-bold">
            Export CSV ↓
          </button>
          <Link href="/transactions/import" className="btn-ghost rounded-xl px-4 py-2.5 text-xs font-bold">
            Import CSV ↑
          </Link>
          <button
            onClick={() => {
              setEditRow(null);
              setFormOpen(true);
            }}
            className="btn-gold rounded-xl px-4 py-2.5 text-xs"
          >
            + New transaction
          </button>
        </div>
      </div>

      {/* One filter row above the content it scopes */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search buyer, email, or product…"
          value={query}
          onChange={(e) => onSearch(e.target.value)}
        />
        <Segmented
          options={STATUSES.map((s) => ({ key: s, label: s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase() }))}
          value={status}
          onChange={onStatus}
        />
        <p className="ml-auto text-xs text-muted">{total.toLocaleString()} records</p>
      </div>

      {/* Refetch keeps the frame: previous rows hold at reduced opacity. */}
      <section className={`panel p-5 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th className="w-8 pb-2.5 pr-3">
                  <input type="checkbox" aria-label="Select all on this page" checked={allSelected} onChange={toggleAll} className="accent-[var(--gold)]" />
                </th>
                <th className="pb-2.5 pr-4 font-semibold">Date</th>
                <th className="pb-2.5 pr-4 font-semibold">Buyer</th>
                <th className="pb-2.5 pr-4 font-semibold">Product</th>
                <th className="pb-2.5 pr-4 font-semibold">Qty</th>
                <th className="pb-2.5 pr-4 font-semibold">Method</th>
                <th className="pb-2.5 pr-4 font-semibold">Status</th>
                <th className="pb-2.5 pr-4 text-right font-semibold">Amount</th>
                <th className="w-12 pb-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="group border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${t.buyer}`}
                      checked={selected.has(t.id)}
                      onChange={() => toggleRow(t.id)}
                      className="accent-[var(--gold)]"
                    />
                  </td>
                  <td className="py-2.5 pr-4 text-ink-secondary">{dateLabel(t.occurredAt)}</td>
                  <td className="py-2.5 pr-4">
                    <p className="font-semibold">{t.buyer}</p>
                    <p className="text-xs text-muted">{t.email}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-ink-secondary">{t.productName}</td>
                  <td className="num py-2.5 pr-4">{t.quantity}</td>
                  <td className="py-2.5 pr-4 text-xs text-ink-secondary">{t.method}</td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="num py-2.5 pr-4 text-right font-bold">{formatMoney(t.amount)}</td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => {
                        setEditRow(t);
                        setFormOpen(true);
                      }}
                      className="btn-ghost rounded-lg px-2.5 py-1 text-xs opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                      aria-label={`Edit transaction for ${t.buyer}`}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm text-muted">
                    Nothing matches this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted">
            Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="btn-ghost rounded-lg px-3 py-1.5 text-xs disabled:opacity-40">
              ← Prev
            </button>
            <button onClick={() => onPage(page + 1)} disabled={page >= pages} className="btn-ghost rounded-lg px-3 py-1.5 text-xs disabled:opacity-40">
              Next →
            </button>
          </div>
        </div>
      </section>

      {/* Bulk action bar — slides in while a selection exists */}
      {selected.size > 0 && (
        <div className="toast-in fixed bottom-5 left-1/2 z-40 -translate-x-1/2">
          <div className="panel flex items-center gap-3 px-5 py-3">
            <p className="text-xs font-bold">{selected.size} selected</p>
            <span className="h-4 w-px bg-border-strong" aria-hidden />
            <button onClick={() => bulk("setStatus", "COMPLETED")} disabled={bulkBusy} className="btn-ghost rounded-lg px-3 py-1.5 text-xs disabled:opacity-40">
              Mark completed
            </button>
            <button onClick={() => bulk("setStatus", "REFUNDED")} disabled={bulkBusy} className="btn-ghost rounded-lg px-3 py-1.5 text-xs disabled:opacity-40">
              Refund
            </button>
            <button
              onClick={() => downloadCsv(rows.filter((r) => selected.has(r.id)), "aurum-transactions-selected.csv")}
              disabled={bulkBusy}
              className="btn-ghost rounded-lg px-3 py-1.5 text-xs disabled:opacity-40"
            >
              Export
            </button>
            <button
              onClick={() => setConfirmBulkDelete(true)}
              disabled={bulkBusy}
              className="rounded-lg bg-critical px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            >
              Delete
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-muted hover:text-ink" aria-label="Clear selection">
              ✕
            </button>
          </div>
        </div>
      )}

      {formOpen && <TransactionForm initial={editRow} onClose={() => setFormOpen(false)} onSaved={reload} />}

      <ConfirmDialog
        open={confirmBulkDelete}
        title="Delete transactions?"
        body={`This permanently removes ${selected.size} transaction${selected.size === 1 ? "" : "s"} from the ledger.`}
        confirmLabel="Delete"
        danger
        busy={bulkBusy}
        onConfirm={() => bulk("delete")}
        onClose={() => setConfirmBulkDelete(false)}
      />
    </div>
  );
}
