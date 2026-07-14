"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type InsightBatchView = {
  id: string;
  summary: string;
  healthScore: number;
  source: string;
  createdAt: string;
  items: { id: string; title: string; body: string; category: string; severity: string }[];
} | null;

const SEVERITY: Record<string, { icon: string; label: string; color: string }> = {
  POSITIVE: { icon: "▲", label: "Positive", color: "var(--good)" },
  INFO: { icon: "◆", label: "Info", color: "var(--ink-secondary)" },
  WARNING: { icon: "⚠", label: "Warning", color: "var(--warning)" },
  CRITICAL: { icon: "⨯", label: "Critical", color: "var(--critical)" },
};

export function InsightsView({ batch }: { batch: InsightBatchView }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/insights", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      setError("Generation failed — check the server logs.");
      return;
    }
    router.refresh();
  }

  const score = batch?.healthScore ?? 0;
  const meterColor = score >= 70 ? "linear-gradient(90deg,#f0d68a,#d9ab45)" : score >= 40 ? "#fab219" : "#d03b3b";
  const meterTrack = score >= 70 ? "rgba(226,185,91,0.14)" : score >= 40 ? "rgba(250,178,25,0.14)" : "rgba(208,59,59,0.14)";
  const health = score >= 70 ? "Healthy" : score >= 40 ? "Watchful" : "At risk";

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">AI Insights</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            The analyst reads the same books you see — summary, anomalies, and concrete next moves.
          </p>
        </div>
        <button onClick={generate} disabled={busy} className="btn-gold rounded-xl px-5 py-2.5 text-xs font-bold tracking-wide disabled:opacity-60">
          {busy ? "Analyzing the books…" : batch ? "Regenerate analysis" : "Generate analysis"}
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-critical">{error}</p>}

      {!batch ? (
        <div className="panel flex flex-col items-center gap-3 p-14 text-center">
          <p className="font-display text-2xl">No analysis yet</p>
          <p className="max-w-md text-sm text-ink-secondary">
            Run the analyst to get an executive summary, a financial health score, statistical anomaly flags, and
            recommendations. Uses the configured AI provider (Claude or Gemini) when a key is set, with a transparent heuristic fallback.
          </p>
        </div>
      ) : (
        <>
          {/* Summary + health meter */}
          <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <section className="panel p-6 xl:col-span-2">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold tracking-wide">Executive summary</h3>
                <span className="rounded-full border border-border-strong px-3 py-1 text-[10px] uppercase tracking-widest text-muted">
                  {batch.source === "AI" ? "AI analyst" : "Heuristic analyst"} ·{" "}
                  {new Date(batch.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              <p className="text-[15px] leading-relaxed text-ink-secondary">{batch.summary}</p>
            </section>

            <section className="panel flex flex-col justify-center p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Financial health</p>
              <div className="mt-3 flex items-baseline gap-3">
                <p className="text-[2.6rem] font-bold leading-none">{score}</p>
                <p className="text-sm text-ink-secondary">/ 100 · {health}</p>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full" style={{ background: meterTrack }}>
                <div className="h-full rounded-full" style={{ width: `${score}%`, background: meterColor }} />
              </div>
              <p className="mt-3 text-xs text-muted">
                Deterministic score from growth, margin trend, anomalies, refunds, and campaign ROI — independent of the
                prose.
              </p>
            </section>
          </div>

          {/* Insight cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {batch.items.map((item) => {
              const s = SEVERITY[item.severity] ?? SEVERITY.INFO;
              return (
                <article key={item.id} className="panel panel-hover p-5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="rounded-md border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted">
                      {item.category}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: s.color }}>
                      <span aria-hidden>{s.icon}</span>
                      {s.label}
                    </span>
                  </div>
                  <h4 className="mb-1.5 text-[15px] font-bold">{item.title}</h4>
                  <p className="text-sm leading-relaxed text-ink-secondary">{item.body}</p>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
