import { prisma } from "./prisma";

// Plain-JSON DTOs, same convention as finance.ts.
export type BudgetRow = { id: string; month: string; category: string; amount: number };

export type BudgetVsActualRow = {
  month: string; // ISO
  category: string;
  budget: number;
  actual: number;
  ratio: number; // actual / budget (0 when budget is 0)
};

export type BudgetAlert = {
  month: string; // ISO
  category: string;
  budget: number;
  actual: number;
  ratio: number;
  level: "WARNING" | "CRITICAL";
};

const WARNING_RATIO = 0.8;

export async function getBudgets(from?: Date, to?: Date): Promise<BudgetRow[]> {
  const rows = await prisma.budget.findMany({
    where: from || to ? { month: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : undefined,
    orderBy: [{ month: "asc" }, { category: "asc" }],
  });
  return rows.map((r) => ({ id: r.id, month: r.month.toISOString(), category: r.category, amount: r.amount }));
}

// Budget × actual (ExpenseByCategory), joined in JS on month+category.
export async function getBudgetVsActual(from: Date, to: Date): Promise<BudgetVsActualRow[]> {
  const where = { month: { gte: from, lte: to } };
  const [budgets, actuals] = await Promise.all([
    prisma.budget.findMany({ where, orderBy: [{ month: "asc" }, { category: "asc" }] }),
    prisma.expenseByCategory.findMany({ where }),
  ]);

  const actualByKey = new Map(actuals.map((a) => [`${a.month.toISOString()}|${a.category}`, a.amount]));
  return budgets.map((b) => {
    const actual = actualByKey.get(`${b.month.toISOString()}|${b.category}`) ?? 0;
    return {
      month: b.month.toISOString(),
      category: b.category,
      budget: b.amount,
      actual,
      ratio: b.amount > 0 ? actual / b.amount : 0,
    };
  });
}

// Alerts for the latest booked month — computed at read time, never stored.
export async function getBudgetAlerts(): Promise<BudgetAlert[]> {
  const latest = await prisma.monthlyFinancial.findFirst({ orderBy: { month: "desc" }, select: { month: true } });
  if (!latest) return [];

  const rows = await getBudgetVsActual(latest.month, latest.month);
  return rows
    .filter((r) => r.budget > 0 && r.ratio >= WARNING_RATIO)
    .map((r) => ({ ...r, level: r.ratio >= 1 ? ("CRITICAL" as const) : ("WARNING" as const) }))
    .sort((a, b) => b.ratio - a.ratio);
}
