"use client";

import { useRouter } from "next/navigation";
import { Segmented } from "@/components/ui/Segmented";
import { ComparisonKpis } from "./ComparisonKpis";
import { ComparisonCharts } from "./ComparisonCharts";
import { DeltaTable } from "./DeltaTable";
import { monthYearLabel } from "@/lib/utils";
import type { CompareKey, PeriodComparison, PeriodKey } from "@/lib/reports";

const PERIODS = [
  { key: "3m", label: "Last 3 months" },
  { key: "6m", label: "Last 6 months" },
  { key: "12m", label: "Last 12 months" },
  { key: "ytd", label: "Year to date" },
] as const;

const COMPARES = [
  { key: "prev", label: "Previous period" },
  { key: "yoy", label: "Same period last year" },
] as const;

// Delta view: one set of charts for the primary period, the comparison
// period overlaid dashed, deltas computed for the reader.
export function ReportsView({
  comparison,
  period,
  compare,
}: {
  comparison: PeriodComparison;
  period: PeriodKey;
  compare: CompareKey;
}) {
  const router = useRouter();

  function setParams(nextPeriod: PeriodKey, nextCompare: CompareKey) {
    router.replace(`/reports?period=${nextPeriod}&compare=${nextCompare}`);
  }

  const { a, b } = comparison;
  const periodLabel = `${monthYearLabel(a.start)} – ${monthYearLabel(a.end)}`;
  const compareLabel = `${monthYearLabel(b.start)} – ${monthYearLabel(b.end)}`;

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Reports</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {periodLabel} <span className="text-muted">vs {compareLabel}</span>
          </p>
        </div>
        <a
          href={`/reports/print?period=${period}&compare=${compare}`}
          target="_blank"
          rel="noopener"
          className="btn-gold rounded-xl px-5 py-2.5 text-xs"
        >
          Export PDF ↓
        </a>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented options={PERIODS} value={period} onChange={(k) => setParams(k, compare)} />
        <span className="text-xs text-muted">compared to</span>
        <Segmented options={COMPARES} value={compare} onChange={(k) => setParams(period, k)} />
      </div>

      <ComparisonKpis comparison={comparison} />
      <ComparisonCharts comparison={comparison} />
      <DeltaTable comparison={comparison} />
    </div>
  );
}
