"use client";

// Track + fill meter for budgets and goals. Fill is gold by default and
// shifts to the reserved status colors when the caller flags risk.
export function ProgressMeter({
  value,
  max,
  label,
  valueLabel,
  status = "default",
}: {
  value: number;
  max: number;
  label?: string;
  valueLabel?: string;
  status?: "default" | "warning" | "critical" | "good";
}) {
  const pct = max > 0 ? Math.max(0, (value / max) * 100) : 0;
  const fill =
    status === "critical"
      ? "var(--critical)"
      : status === "warning"
        ? "var(--serious)"
        : status === "good"
          ? "var(--good)"
          : "linear-gradient(120deg, #f0d68a, #d9ab45)";

  return (
    <div>
      {(label || valueLabel) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
          {label && <span className="text-ink-secondary">{label}</span>}
          <span className="num text-muted">{valueLabel ?? `${Math.round(pct)}%`}</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${Math.min(100, pct)}%`, background: fill }}
        />
      </div>
    </div>
  );
}
