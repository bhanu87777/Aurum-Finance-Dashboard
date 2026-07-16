"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { monthYearLabel } from "@/lib/utils";
import type { BudgetAlert } from "@/lib/budgets";

const DISMISS_KEY = "aurum-budget-banner-dismissed";

// Dismissal lives in sessionStorage, exposed via useSyncExternalStore so the
// server snapshot (never dismissed) hydrates cleanly.
let listeners: Array<() => void> = [];

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function getSnapshot(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

// One slim, dismissible strip above the KPI row — no toast spam, no nagging.
// Dismissal lasts for the browser session.
export function BudgetAlertBanner({ alerts }: { alerts: BudgetAlert[] }) {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (alerts.length === 0 || dismissed) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    for (const l of listeners) l();
  }

  const critical = alerts.filter((a) => a.level === "CRITICAL");
  const worst = alerts[0];
  const headline =
    critical.length > 0
      ? `${critical.length} categor${critical.length === 1 ? "y is" : "ies are"} over budget in ${monthYearLabel(worst.month)}`
      : `${alerts.length} categor${alerts.length === 1 ? "y is" : "ies are"} nearing budget in ${monthYearLabel(worst.month)}`;

  return (
    <div className="panel mb-5 flex items-center gap-3 px-5 py-3">
      <span className={critical.length > 0 ? "text-critical" : "text-serious"} aria-hidden>
        {critical.length > 0 ? "▲" : "◷"}
      </span>
      <p className="text-sm">
        <span className="font-semibold">{headline}</span>
        <span className="text-ink-secondary">
          {" "}
          — {worst.category} at <span className="num">{Math.round(worst.ratio * 100)}%</span>
          {alerts.length > 1 ? ` and ${alerts.length - 1} more` : ""}.
        </span>
      </p>
      <Link href="/budgets" className="btn-ghost ml-auto shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold">
        Review →
      </Link>
      <button onClick={dismiss} className="shrink-0 text-xs text-muted hover:text-ink" aria-label="Dismiss budget alerts for this session">
        ✕
      </button>
    </div>
  );
}
