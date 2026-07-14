"use client";

import { formatMoney, dateLabel } from "@/lib/utils";
import type { ProductRow, TransactionRow } from "@/lib/finance";
import Link from "next/link";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: string; cls: string; label: string }> = {
    COMPLETED: { icon: "✓", cls: "text-good", label: "Completed" },
    PENDING: { icon: "◷", cls: "text-warning", label: "Pending" },
    REFUNDED: { icon: "↩", cls: "text-critical", label: "Refunded" },
    ACTIVE: { icon: "●", cls: "text-good", label: "Active" },
    PAUSED: { icon: "◷", cls: "text-warning", label: "Paused" },
  };
  const s = map[status] ?? { icon: "·", cls: "text-muted", label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${s.cls}`}>
      <span aria-hidden>{s.icon}</span>
      {s.label}
    </span>
  );
}

export function RecentTransactions({ rows }: { rows: TransactionRow[] }) {
  return (
    <section className="panel panel-hover p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-wide">Recent transactions</h3>
          <p className="mt-0.5 text-xs text-muted">Latest orders in the selected range</p>
        </div>
        <Link href="/transactions" className="btn-ghost rounded-lg px-3 py-1.5 text-xs">
          View all →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
              <th className="pb-2.5 pr-4 font-semibold">Buyer</th>
              <th className="pb-2.5 pr-4 font-semibold">Product</th>
              <th className="pb-2.5 pr-4 font-semibold">Date</th>
              <th className="pb-2.5 pr-4 font-semibold">Status</th>
              <th className="pb-2.5 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-border/60 last:border-0">
                <td className="py-2.5 pr-4 font-semibold">{t.buyer}</td>
                <td className="py-2.5 pr-4 text-ink-secondary">{t.productName}</td>
                <td className="py-2.5 pr-4 text-ink-secondary">{dateLabel(t.occurredAt)}</td>
                <td className="py-2.5 pr-4">
                  <StatusBadge status={t.status} />
                </td>
                <td className="num py-2.5 text-right font-bold">{formatMoney(t.amount)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-muted">
                  No transactions in this range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TopProducts({ rows }: { rows: ProductRow[] }) {
  const top = rows.slice(0, 7);
  const maxRevenue = Math.max(...top.map((p) => p.price * p.unitsSold), 1);
  return (
    <section className="panel panel-hover p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold tracking-wide">Top products</h3>
        <p className="mt-0.5 text-xs text-muted">By lifetime revenue — catalog-wide (all time)</p>
      </div>
      <div className="flex flex-col gap-3.5">
        {top.map((p) => {
          const revenue = p.price * p.unitsSold;
          const margin = ((p.price - p.expense) / p.price) * 100;
          return (
            <div key={p.id}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <p className="truncate font-semibold">{p.name}</p>
                <p className="num shrink-0 font-bold">
                  {revenue >= 1_000_000 ? `$${(revenue / 1_000_000).toFixed(2)}M` : `$${Math.round(revenue / 1000)}K`}
                </p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(226,185,91,0.14)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(revenue / maxRevenue) * 100}%`, background: "#b3882f" }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted">
                {p.category} · {p.unitsSold.toLocaleString()} units · {margin.toFixed(0)}% margin · ★ {p.rating.toFixed(1)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
