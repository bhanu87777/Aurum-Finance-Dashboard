"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme/ThemeProvider";
import { rankMatches } from "@/lib/fuzzy";
import { formatMoney } from "@/lib/utils";
import type { TransactionRow } from "@/lib/finance";

type Item = {
  id: string;
  group: "Pages" | "Actions" | "Transactions" | "Products";
  label: string;
  hint?: string;
  run: () => void;
};

const PAGES: { label: string; href: string; chord: string }[] = [
  { label: "Dashboard", href: "/dashboard", chord: "g d" },
  { label: "Transactions", href: "/transactions", chord: "g t" },
  { label: "Catalog", href: "/catalog", chord: "g c" },
  { label: "Budgets", href: "/budgets", chord: "g b" },
  { label: "Reports", href: "/reports", chord: "g r" },
  { label: "Predictions", href: "/predictions", chord: "g p" },
  { label: "AI Insights", href: "/insights", chord: "g i" },
  { label: "Settings", href: "/settings", chord: "g s" },
];

const CHORD_WINDOW_MS = 800;

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

// Ctrl/Cmd+K palette + g-chord navigation + "?" shortcut sheet, one mount
// inside Shell so it's active exactly where the console is.
export function CommandPalette() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selIndex, setSelIndex] = useState(0);
  const [txResults, setTxResults] = useState<Item[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const helpRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const chordAt = useRef<number>(0);
  const [products, setProducts] = useState<{ id: string; name: string; category: string }[] | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setTxResults([]);
    setSelIndex(0);
  }, []);

  // Global key handling: palette toggle, chords, help.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (isTypingTarget(e.target) || document.querySelector("dialog[open]")) return;

      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (e.key === "g") {
        chordAt.current = Date.now();
        return;
      }
      if (chordAt.current && Date.now() - chordAt.current < CHORD_WINDOW_MS) {
        const page = PAGES.find((p) => p.chord === `g ${e.key}`);
        if (page) {
          e.preventDefault();
          router.push(page.href);
        }
        chordAt.current = 0;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // Native dialog sync.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      dlg.showModal();
      inputRef.current?.focus();
    }
    if (!open && dlg.open) dlg.close();
  }, [open]);

  useEffect(() => {
    const dlg = helpRef.current;
    if (!dlg) return;
    if (helpOpen && !dlg.open) dlg.showModal();
    if (!helpOpen && dlg.open) dlg.close();
  }, [helpOpen]);

  // Async entity search (debounced) once the query has substance. State
  // updates only happen inside the timeout/fetch callbacks (never sync).
  useEffect(() => {
    clearTimeout(debounce.current);
    const q = query.trim();
    debounce.current = setTimeout(
      async () => {
        if (q.length < 2) {
          setTxResults([]);
          return;
        }
        const res = await fetch(`/api/transactions?query=${encodeURIComponent(q)}&take=5`).catch(() => null);
        if (!res || !res.ok) return;
        const data: { rows: TransactionRow[] } = await res.json();
        setTxResults(
          data.rows.map((r) => ({
            id: `tx-${r.id}`,
            group: "Transactions" as const,
            label: `${r.buyer} · ${formatMoney(r.amount)}`,
            hint: r.productName,
            run: () => router.push(`/transactions?query=${encodeURIComponent(r.buyer)}`),
          }))
        );
      },
      q.length < 2 ? 0 : 250
    );
    return () => clearTimeout(debounce.current);
  }, [query, router]);

  // Product options load lazily on first open.
  useEffect(() => {
    if (!open || products) return;
    fetch("/api/products")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setProducts(data.rows);
      })
      .catch(() => {});
  }, [open, products]);

  const items = useMemo<Item[]>(() => {
    const nav: Item[] = PAGES.map((p) => ({
      id: `page-${p.href}`,
      group: "Pages",
      label: p.label,
      hint: p.chord,
      run: () => router.push(p.href),
    }));
    const actions: Item[] = [
      { id: "act-new-tx", group: "Actions", label: "New transaction", hint: "opens the ledger", run: () => router.push("/transactions") },
      { id: "act-import", group: "Actions", label: "Import transactions from CSV", run: () => router.push("/transactions/import") },
      { id: "act-theme", group: "Actions", label: `Switch to ${theme === "dark" ? "light" : "dark"} mode`, run: () => setTheme(theme === "dark" ? "light" : "dark") },
      { id: "act-report", group: "Actions", label: "Export PDF report", run: () => router.push("/reports") },
    ];

    const q = query.trim();
    if (!q) return [...nav, ...actions];

    const productItems: Item[] = (products ?? []).map((p) => ({
      id: `prod-${p.id}`,
      group: "Products",
      label: p.name,
      hint: p.category,
      run: () => router.push("/catalog"),
    }));

    return [
      ...rankMatches(q, [...nav, ...actions], (i) => i.label, 6),
      ...rankMatches(q, productItems, (i) => i.label, 4),
      ...txResults,
    ];
  }, [query, router, theme, setTheme, txResults, products]);

  const sel = Math.min(selIndex, Math.max(0, items.length - 1));

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[sel];
      if (item) {
        close();
        item.run();
      }
    }
  }

  let lastGroup = "";

  return (
    <>
      {/* Palette */}
      <dialog
        ref={dialogRef}
        className="dlg dlg-top mx-auto w-[calc(100vw-2rem)] max-w-lg"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        <div className="panel overflow-hidden">
          <input
            ref={inputRef}
            className="w-full border-b border-border bg-transparent px-5 py-4 text-sm outline-none placeholder:text-muted"
            placeholder="Search pages, actions, transactions, products…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelIndex(0);
            }}
            onKeyDown={onInputKey}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={items[sel] ? `palette-opt-${items[sel].id}` : undefined}
          />
          <ul id="palette-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
            {items.map((item, i) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;
              return (
                <li key={item.id}>
                  {showGroup && (
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted">{item.group}</p>
                  )}
                  <button
                    id={`palette-opt-${item.id}`}
                    role="option"
                    aria-selected={i === sel}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                      i === sel ? "seg-active" : "text-ink-secondary hover:bg-surface-2 hover:text-ink"
                    }`}
                    onMouseEnter={() => setSelIndex(i)}
                    onClick={() => {
                      close();
                      item.run();
                    }}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.hint && <span className="num shrink-0 text-[11px] text-muted">{item.hint}</span>}
                  </button>
                </li>
              );
            })}
            {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Nothing matches.</li>}
          </ul>
          <p className="border-t border-border px-5 py-2.5 text-[11px] text-muted">
            ↑↓ navigate · ⏎ open · esc close
          </p>
        </div>
      </dialog>

      {/* Shortcut sheet */}
      <dialog
        ref={helpRef}
        className="dlg m-auto w-[calc(100vw-2rem)] max-w-sm"
        onCancel={(e) => {
          e.preventDefault();
          setHelpOpen(false);
        }}
        onClick={(e) => {
          if (e.target === helpRef.current) setHelpOpen(false);
        }}
      >
        <div className="panel p-6">
          <h2 className="mb-4 font-display text-xl">Keyboard shortcuts</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-border/60">
                <td className="py-2 text-ink-secondary">Command palette</td>
                <td className="num py-2 text-right font-bold">Ctrl / ⌘ K</td>
              </tr>
              {PAGES.map((p) => (
                <tr key={p.href} className="border-b border-border/60">
                  <td className="py-2 text-ink-secondary">Go to {p.label}</td>
                  <td className="num py-2 text-right font-bold">{p.chord}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2 text-ink-secondary">This sheet</td>
                <td className="num py-2 text-right font-bold">?</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-4 flex justify-end">
            <button onClick={() => setHelpOpen(false)} className="btn-ghost rounded-xl px-4 py-2 text-xs font-bold">
              Close
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
