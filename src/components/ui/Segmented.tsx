"use client";

// The app's segmented control (range picker, status filter, tabs) — one
// implementation so the gold-tint active treatment stays consistent.
export function Segmented<K extends string>({
  options,
  value,
  onChange,
  size = "sm",
}: {
  options: readonly { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  size?: "sm" | "md";
}) {
  const pad = size === "md" ? "px-4 py-2" : "px-3.5 py-1.5";
  return (
    <div className="flex rounded-xl border border-border bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-lg ${pad} text-xs font-semibold transition-colors ${
            value === o.key ? "seg-active" : "text-ink-secondary hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
