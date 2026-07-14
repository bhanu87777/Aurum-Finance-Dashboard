"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { formatPercent } from "@/lib/utils";

const SPARK = "#5b584d"; // de-emphasis hue — the accent is the current point
const ACCENT = "#e2b95b";

// Stat tile per the dataviz contract: label · value · signed delta vs a named
// period · 12-point sparkline (de-emphasis hue, current period accented).
export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  upIsGood = true,
  trend,
}: {
  label: string;
  value: string;
  delta?: number; // percent
  deltaLabel?: string;
  upIsGood?: boolean;
  trend?: number[];
}) {
  const good = delta !== undefined && (delta >= 0) === upIsGood;
  const spark = (trend ?? []).slice(-12).map((v, i) => ({ i, v }));
  const last = spark.length - 1;

  return (
    <div className="panel panel-hover flex items-center justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-1.5 text-[1.75rem] font-bold leading-none">{value}</p>
        {delta !== undefined && (
          <p className="mt-2 text-xs">
            {/* Arrow shows direction; color shows whether that direction is good. */}
            <span className={good ? "font-bold text-good" : "font-bold text-critical"}>
              {delta >= 0 ? "▲" : "▼"} {formatPercent(delta)}
            </span>{" "}
            <span className="text-muted">{deltaLabel}</span>
          </p>
        )}
      </div>
      {spark.length > 1 && (
        <div className="h-12 w-24 shrink-0" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <Area
                type="monotone"
                dataKey="v"
                stroke={SPARK}
                strokeWidth={2}
                fill={SPARK}
                fillOpacity={0.08}
                isAnimationActive={false}
                dot={(props: { index?: number; cx?: number; cy?: number }) =>
                  props.index === last ? (
                    <circle key="last" cx={props.cx} cy={props.cy} r={3.5} fill={ACCENT} stroke="#14141c" strokeWidth={2} />
                  ) : (
                    <g key={props.index} />
                  )
                }
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
