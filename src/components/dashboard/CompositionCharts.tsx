"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
} from "recharts";
import { ChartCard, ChartTooltip, LegendKeys, useChartTheme, type ChartTheme } from "@/components/charts/chartKit";
import { formatMoneyCompact } from "@/lib/utils";
import type { CategoryRow, ProductRow, CampaignRow } from "@/lib/finance";

// Fixed slot order for expense categories — identity is stable across renders.
const CATEGORY_ORDER = ["Salaries", "Marketing", "Operations", "Infrastructure", "R&D"];
const slots = (t: ChartTheme) => [t.viz.gold, t.viz.teal, t.viz.violet, t.viz.rose, t.viz.sky, t.viz.orange];

export function ExpenseDonut({ categories }: { categories: CategoryRow[] }) {
  const t = useChartTheme();
  const SLOTS = slots(t);
  const totals = new Map<string, number>();
  for (const c of categories) totals.set(c.category, (totals.get(c.category) ?? 0) + c.amount);
  const data = CATEGORY_ORDER.filter((c) => totals.has(c)).map((c) => ({
    name: c,
    value: Math.round(totals.get(c)!),
  }));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <ChartCard
      title="Expense composition"
      subtitle="Share of total spend in the selected range"
      right={<LegendKeys items={data.map((d, i) => ({ label: d.name, color: SLOTS[i], shape: "dot" }))} />}
    >
      <div className="relative h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip format={(v) => formatMoneyCompact(v)} />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              stroke={t.surface}
              strokeWidth={2}
              paddingAngle={1}
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={SLOTS[i]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs text-muted">Total spend</p>
          <p className="text-xl font-bold">{formatMoneyCompact(total)}</p>
        </div>
      </div>
    </ChartCard>
  );
}

// Campaigns: attainment is a meter (fill = progress vs target), not a donut —
// the number is the story. Status rides an icon + label, never color alone.
export function CampaignBoard({ campaigns }: { campaigns: CampaignRow[] }) {
  return (
    <ChartCard title="Campaigns vs targets" subtitle="Attributed revenue against each campaign's target">
      <div className="flex flex-col gap-4">
        {campaigns.slice(0, 6).map((c) => {
          const pct = Math.min(130, (c.attributedRevenue / c.targetRevenue) * 100);
          const roi = c.spend > 0 ? c.attributedRevenue / c.spend : 0;
          const hit = pct >= 100;
          return (
            <div key={c.id}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="shrink-0 text-xs text-muted">
                  <span className="num font-bold text-ink">{formatMoneyCompact(c.attributedRevenue)}</span>
                  {" / "}
                  {formatMoneyCompact(c.targetRevenue)}
                </p>
              </div>
              {/* HTML meter (not SVG) — CSS variables resolve here, so it themes itself. */}
              <div className="h-2 overflow-hidden rounded-full" style={{ background: "rgba(226,185,91,0.14)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, pct)}%`,
                    background: hit ? "linear-gradient(90deg,#f0d68a,#d9ab45)" : "var(--viz-1)",
                  }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                <span>
                  {c.channel} · {c.status.toLowerCase()}
                </span>
                <span className="num">
                  {hit ? "✓" : "→"} {pct.toFixed(0)}% of target · {roi.toFixed(1)}x ROI
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

// Product economics: unit price vs unit cost, bubble size = units sold,
// color = collection (identity). Diagonal reference: margin widens below it.
export function ProductScatter({ products }: { products: ProductRow[] }) {
  const t = useChartTheme();
  const SLOTS = slots(t);
  const categories = Array.from(new Set(products.map((p) => p.category)));
  const byCat = categories.map((cat, i) => ({
    cat,
    color: SLOTS[i % SLOTS.length],
    rows: products
      .filter((p) => p.category === cat)
      .map((p) => ({ x: p.price, y: p.expense, z: p.unitsSold, name: p.name })),
  }));

  return (
    <ChartCard
      title="Unit economics by product"
      subtitle="Price vs unit cost — bubble size is units sold; lower-right = richer margin"
      right={<LegendKeys items={byCat.map((c) => ({ label: c.cat, color: c.color, shape: "dot" }))} />}
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid {...t.gridProps} />
            <XAxis
              type="number"
              dataKey="x"
              name="Price"
              tick={t.axisTick}
              axisLine={t.axisLine}
              tickLine={false}
              tickFormatter={(v: number) => formatMoneyCompact(v)}
              domain={[0, "dataMax"]}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Unit cost"
              tick={t.axisTick}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => formatMoneyCompact(v)}
              width={52}
            />
            <ZAxis type="number" dataKey="z" range={[60, 340]} name="Units sold" />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const p = payload[0].payload as { x: number; y: number; z: number; name: string };
                return (
                  <div
                    style={{
                      background: t.tooltipBg,
                      border: `1px solid ${t.tooltipBorder}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                    }}
                  >
                    <p style={{ color: t.ink, fontSize: 13, fontWeight: 700 }}>{p.name}</p>
                    <p style={{ color: t.inkSecondary, fontSize: 12, marginTop: 4 }}>
                      Price {formatMoneyCompact(p.x)} · Cost {formatMoneyCompact(p.y)}
                    </p>
                    <p style={{ color: t.inkSecondary, fontSize: 12 }}>
                      Margin {(((p.x - p.y) / p.x) * 100).toFixed(0)}% · {p.z.toLocaleString()} units
                    </p>
                  </div>
                );
              }}
            />
            {byCat.map((c) => (
              <Scatter key={c.cat} name={c.cat} data={c.rows} fill={c.color} fillOpacity={0.85} stroke={t.surface} strokeWidth={2} isAnimationActive={false} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
