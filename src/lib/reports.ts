import { prisma } from "./prisma";

// Period reporting DTOs — plain JSON, same convention as finance.ts.

export type PeriodSummary = {
  start: string; // ISO first month
  end: string; // ISO last month
  months: number;
  revenue: number;
  expenses: number;
  profit: number;
  marginPct: number;
  avgMonthlyRevenue: number;
  categoryBreakdown: { category: string; amount: number }[];
  txCount: number;
  txVolume: number;
  refundedCount: number;
};

export type ComparisonMonthly = {
  idx: number;
  aLabel: string; // ISO month of the primary period
  bLabel: string | null; // ISO month of the comparison period (aligned by index)
  aRevenue: number | null;
  bRevenue: number | null;
  aExpenses: number | null;
  bExpenses: number | null;
  aProfit: number | null;
  bProfit: number | null;
};

export type PeriodComparison = {
  a: PeriodSummary;
  b: PeriodSummary;
  monthly: ComparisonMonthly[];
  deltas: {
    revenuePct: number | null;
    expensesPct: number | null;
    profitPct: number | null;
    marginPts: number | null;
    categoryDeltas: { category: string; aAmount: number; bAmount: number; deltaPct: number | null }[];
  };
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const pct = (cur: number, prev: number): number | null => (prev !== 0 ? round2(((cur - prev) / Math.abs(prev)) * 100) : null);

export async function getPeriodSummary(start: Date, end: Date): Promise<PeriodSummary> {
  // Transactions span whole days; months are first-of-month markers.
  const endExclusive = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 1));

  const [months, categories, txAgg, refunded] = await Promise.all([
    prisma.monthlyFinancial.findMany({ where: { month: { gte: start, lte: end } }, orderBy: { month: "asc" } }),
    prisma.expenseByCategory.groupBy({
      by: ["category"],
      where: { month: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { occurredAt: { gte: start, lt: endExclusive } },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where: { occurredAt: { gte: start, lt: endExclusive }, status: "REFUNDED" } }),
  ]);

  const revenue = round2(months.reduce((s, m) => s + m.revenue, 0));
  const expenses = round2(months.reduce((s, m) => s + m.expenses, 0));
  const profit = round2(revenue - expenses);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    months: months.length,
    revenue,
    expenses,
    profit,
    marginPct: revenue > 0 ? round2((profit / revenue) * 100) : 0,
    avgMonthlyRevenue: months.length > 0 ? round2(revenue / months.length) : 0,
    categoryBreakdown: categories
      .map((c) => ({ category: c.category, amount: round2(c._sum.amount ?? 0) }))
      .sort((x, y) => y.amount - x.amount),
    txCount: txAgg._count,
    txVolume: round2(txAgg._sum.amount ?? 0),
    refundedCount: refunded,
  };
}

export async function comparePeriods(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): Promise<PeriodComparison> {
  const [a, b, aMonths, bMonths] = await Promise.all([
    getPeriodSummary(aStart, aEnd),
    getPeriodSummary(bStart, bEnd),
    prisma.monthlyFinancial.findMany({ where: { month: { gte: aStart, lte: aEnd } }, orderBy: { month: "asc" } }),
    prisma.monthlyFinancial.findMany({ where: { month: { gte: bStart, lte: bEnd } }, orderBy: { month: "asc" } }),
  ]);

  const len = Math.max(aMonths.length, bMonths.length);
  const monthly: ComparisonMonthly[] = Array.from({ length: len }, (_, i) => {
    const am = aMonths[i];
    const bm = bMonths[i];
    return {
      idx: i,
      aLabel: am ? am.month.toISOString() : "",
      bLabel: bm ? bm.month.toISOString() : null,
      aRevenue: am ? am.revenue : null,
      bRevenue: bm ? bm.revenue : null,
      aExpenses: am ? am.expenses : null,
      bExpenses: bm ? bm.expenses : null,
      aProfit: am ? round2(am.revenue - am.expenses) : null,
      bProfit: bm ? round2(bm.revenue - bm.expenses) : null,
    };
  });

  const catMap = new Map(b.categoryBreakdown.map((c) => [c.category, c.amount]));
  const categories = Array.from(new Set([...a.categoryBreakdown.map((c) => c.category), ...catMap.keys()]));
  const categoryDeltas = categories
    .map((category) => {
      const aAmount = a.categoryBreakdown.find((c) => c.category === category)?.amount ?? 0;
      const bAmount = catMap.get(category) ?? 0;
      return { category, aAmount, bAmount, deltaPct: pct(aAmount, bAmount) };
    })
    .sort((x, y) => y.aAmount - x.aAmount);

  return {
    a,
    b,
    monthly,
    deltas: {
      revenuePct: pct(a.revenue, b.revenue),
      expensesPct: pct(a.expenses, b.expenses),
      profitPct: pct(a.profit, b.profit),
      marginPts: a.revenue > 0 && b.revenue > 0 ? round2(a.marginPct - b.marginPct) : null,
      categoryDeltas,
    },
  };
}

// Everything the print-ready report needs, in one call.
export type ReportData = {
  summary: PeriodSummary;
  monthly: { month: string; revenue: number; expenses: number; profit: number }[];
  topProducts: { name: string; category: string; revenue: number; txCount: number }[];
  campaigns: { name: string; channel: string; status: string; spend: number; attributedRevenue: number; targetRevenue: number }[];
};

export async function getReportData(start: Date, end: Date): Promise<ReportData> {
  const endExclusive = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 1));

  const [summary, months, byProduct, campaigns] = await Promise.all([
    getPeriodSummary(start, end),
    prisma.monthlyFinancial.findMany({ where: { month: { gte: start, lte: end } }, orderBy: { month: "asc" } }),
    prisma.transaction.groupBy({
      by: ["productId"],
      where: { occurredAt: { gte: start, lt: endExclusive }, status: { not: "REFUNDED" } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: 8,
    }),
    prisma.campaign.findMany({ where: { startedAt: { gte: start, lt: endExclusive } }, orderBy: { startedAt: "asc" } }),
  ]);

  const products = await prisma.product.findMany({
    where: { id: { in: byProduct.map((p) => p.productId) } },
    select: { id: true, name: true, category: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  return {
    summary,
    monthly: months.map((m) => ({
      month: m.month.toISOString(),
      revenue: m.revenue,
      expenses: m.expenses,
      profit: round2(m.revenue - m.expenses),
    })),
    topProducts: byProduct.map((p) => ({
      name: productById.get(p.productId)?.name ?? "(deleted product)",
      category: productById.get(p.productId)?.category ?? "—",
      revenue: round2(p._sum.amount ?? 0),
      txCount: p._count,
    })),
    campaigns: campaigns.map((c) => ({
      name: c.name,
      channel: c.channel,
      status: c.status,
      spend: c.spend,
      attributedRevenue: c.attributedRevenue,
      targetRevenue: c.targetRevenue,
    })),
  };
}

// Shared range math for the reports pages: resolve a period key + compare
// mode into concrete month windows, anchored to the latest booked month.
export type PeriodKey = "3m" | "6m" | "12m" | "ytd";
export type CompareKey = "prev" | "yoy";

export async function resolveReportRanges(period: PeriodKey, compare: CompareKey) {
  const latest = await prisma.monthlyFinancial.findFirst({ orderBy: { month: "desc" }, select: { month: true } });
  const anchor = latest?.month ?? new Date();
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();

  let aStart: Date;
  const aEnd = new Date(Date.UTC(y, m, 1));
  if (period === "ytd") {
    aStart = new Date(Date.UTC(y, 0, 1));
  } else {
    const n = period === "3m" ? 3 : period === "6m" ? 6 : 12;
    aStart = new Date(Date.UTC(y, m - n + 1, 1));
  }

  const spanMonths = (aEnd.getUTCFullYear() - aStart.getUTCFullYear()) * 12 + (aEnd.getUTCMonth() - aStart.getUTCMonth()) + 1;

  let bStart: Date;
  let bEnd: Date;
  if (compare === "yoy") {
    bStart = new Date(Date.UTC(aStart.getUTCFullYear() - 1, aStart.getUTCMonth(), 1));
    bEnd = new Date(Date.UTC(aEnd.getUTCFullYear() - 1, aEnd.getUTCMonth(), 1));
  } else {
    bEnd = new Date(Date.UTC(aStart.getUTCFullYear(), aStart.getUTCMonth() - 1, 1));
    bStart = new Date(Date.UTC(bEnd.getUTCFullYear(), bEnd.getUTCMonth() - spanMonths + 1, 1));
  }

  return { aStart, aEnd, bStart, bEnd };
}
