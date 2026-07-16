"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Monogram } from "./Monogram";
import { ThemeToggle } from "./theme/ThemeToggle";
import { CommandPalette } from "./palette/CommandPalette";

// Operational pages first (view → manage → plan → report), AI last.
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/transactions", label: "Transactions", icon: "≣" },
  { href: "/catalog", label: "Catalog", icon: "◈" },
  { href: "/budgets", label: "Budgets", icon: "◎" },
  { href: "/reports", label: "Reports", icon: "▤" },
  { href: "/predictions", label: "Predictions", icon: "◮" },
  { href: "/insights", label: "AI Insights", icon: "✦" },
];

// App chrome: fixed sidebar on desktop, top bar on mobile.
// alertCount puts a gold badge on the Budgets nav item (pages compute it
// server-side via getBudgetAlerts(); the shell stays presentational).
export function Shell({
  user,
  alertCount = 0,
  children,
}: {
  user: { name?: string | null; email?: string | null };
  alertCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        const badge = item.href === "/budgets" && alertCount > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors ${
              active
                ? "bg-[rgba(226,185,91,0.10)] font-semibold text-gold"
                : "text-ink-secondary hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <span className="w-4 text-center" aria-hidden>
              {item.icon}
            </span>
            {item.label}
            {badge && (
              <span
                className="ml-auto rounded-full px-1.5 text-[10px] font-bold text-gold"
                style={{ background: "rgba(226,185,91,0.14)" }}
                aria-label={`${alertCount} budget alert${alertCount === 1 ? "" : "s"}`}
              >
                {alertCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border px-4 py-6 lg:flex">
        <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2">
          <Monogram />
          <span className="font-display text-lg tracking-wide">AURUM</span>
        </Link>
        {nav}
        <div className="mt-auto border-t border-border pt-4">
          <p className="truncate px-2 text-sm font-semibold">{user.name ?? "Operator"}</p>
          <p className="truncate px-2 text-xs text-muted">{user.email}</p>
          <Link
            href="/settings"
            className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
              pathname.startsWith("/settings") ? "bg-[rgba(226,185,91,0.10)] font-semibold text-gold" : "text-ink-secondary hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <span aria-hidden>⚙</span> Settings
          </Link>
          <ThemeToggle className="mt-2 w-full" />
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="btn-ghost mt-2 w-full rounded-lg px-3 py-2 text-xs"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Monogram size={28} />
          <span className="font-display tracking-wide">AURUM</span>
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-1.5 text-xs ${
                pathname.startsWith(item.href) ? "bg-[rgba(226,185,91,0.10)] font-semibold text-gold" : "text-ink-secondary"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button onClick={() => signOut({ callbackUrl: "/" })} className="px-2 py-1.5 text-xs text-muted">
            Exit
          </button>
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      <CommandPalette />
    </div>
  );
}
