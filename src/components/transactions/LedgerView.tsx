"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/dashboard/Tables";
import { formatMoney, dateLabel } from "@/lib/utils";
import type { TransactionRow } from "@/lib/finance";

const PAGE_SIZE = 15;
const STATUSES = ["ALL", "COMPLETED", "PENDING", "REFUNDED"] as const;

export function LedgerView() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("ALL");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async (q: string, s: string, p: number) => {
    setLoading(true);
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
  }, []);

  useEffect(() => {
    load("", "ALL", 1);
  }, [load]);

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
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = [
      "Date,Buyer,Email,Product,Quantity,Method,Status,Amount",
      ...data.rows.map((r) =>
        [
          dateLabel(r.occurredAt),
          esc(r.buyer),
          esc(r.email),
          esc(r.productName),
          r.quantity,
          r.method,
          r.status,
          r.amount.toFixed(2),
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aurum-transactions.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Transactions</h1>
          <p className="mt-1 text-sm text-ink-secondary">The full ledger — search, filter, export.</p>
        </div>
        <button onClick={exportCsv} className="btn-ghost rounded-xl px-4 py-2.5 text-xs font-bold">
          Export CSV ↓
        </button>
      </div>

      {/* One filter row above the content it scopes */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search buyer, email, or product…"
          value={query}
          onChange={(e) => onSearch(e.target.value)}
        />
        <div className="flex rounded-xl border border-border bg-surface p-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => onStatus(s)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                status === s ? "bg-[rgba(226,185,91,0.14)] text-gold" : "text-ink-secondary hover:text-ink"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <p className="ml-auto text-xs text-muted">{total.toLocaleString()} records</p>
      </div>

      {/* Refetch keeps the frame: previous rows hold at reduced opacity. */}
      <section className={`panel p-5 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                <th className="pb-2.5 pr-4 font-semibold">Date</th>
                <th className="pb-2.5 pr-4 font-semibold">Buyer</th>
                <th className="pb-2.5 pr-4 font-semibold">Product</th>
                <th className="pb-2.5 pr-4 font-semibold">Qty</th>
                <th className="pb-2.5 pr-4 font-semibold">Method</th>
                <th className="pb-2.5 pr-4 font-semibold">Status</th>
                <th className="pb-2.5 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-border/60 last:border-0">
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
                  <td className="num py-2.5 text-right font-bold">{formatMoney(t.amount)}</td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-muted">
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
    </div>
  );
}
