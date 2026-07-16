"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info";
type ToastInput = { kind: ToastKind; title: string; detail?: string };
type ToastItem = ToastInput & { id: number };

const RULE: Record<ToastKind, string> = {
  success: "var(--good)",
  error: "var(--critical)",
  info: "var(--gold)",
};

const ToastContext = createContext<((t: ToastInput) => void) | null>(null);

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast must be used inside ToastProvider");
  return toast;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((t: ToastInput) => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((i) => (
          <div
            key={i.id}
            role="status"
            className="toast-in pointer-events-auto panel p-4"
            style={{ borderLeft: `2px solid ${RULE[i.kind]}` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{i.title}</p>
                {i.detail && <p className="mt-0.5 text-xs text-ink-secondary">{i.detail}</p>}
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                className="text-xs text-muted hover:text-ink"
                onClick={() => setItems((prev) => prev.filter((x) => x.id !== i.id))}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
