import { prisma } from "./prisma";

export type GoalStatus = "ON_TRACK" | "AT_RISK" | "ACHIEVED" | "EXPIRED";

export type GoalRow = {
  id: string;
  name: string;
  metric: "REVENUE" | "PROFIT";
  targetValue: number;
  startMonth: string; // ISO
  deadline: string; // ISO
  currentValue: number;
  progressPct: number;
  monthsTotal: number;
  monthsElapsed: number;
  status: GoalStatus;
};

function monthsBetween(a: Date, b: Date): number {
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

// Progress is derived from MonthlyFinancial at read time: currentValue is the
// cumulative revenue (or profit) inside the goal's inclusive month window.
// ON_TRACK when progress keeps pace with elapsed time.
export async function getGoalsWithProgress(now = new Date()): Promise<GoalRow[]> {
  const goals = await prisma.goal.findMany({ orderBy: { deadline: "asc" } });
  if (goals.length === 0) return [];

  const min = goals.reduce((d, g) => (g.startMonth < d ? g.startMonth : d), goals[0].startMonth);
  const max = goals.reduce((d, g) => (g.deadline > d ? g.deadline : d), goals[0].deadline);
  const months = await prisma.monthlyFinancial.findMany({
    where: { month: { gte: min, lte: max } },
    orderBy: { month: "asc" },
  });

  const nowMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return goals.map((g) => {
    const inWindow = months.filter((m) => m.month >= g.startMonth && m.month <= g.deadline);
    const currentValue = inWindow.reduce(
      (s, m) => s + (g.metric === "REVENUE" ? m.revenue : m.revenue - m.expenses),
      0
    );
    const progressPct = g.targetValue > 0 ? (currentValue / g.targetValue) * 100 : 0;

    const monthsTotal = monthsBetween(g.startMonth, g.deadline) + 1;
    const monthsElapsed = Math.max(0, Math.min(monthsTotal, monthsBetween(g.startMonth, nowMonth) + 1));
    const elapsedPct = (monthsElapsed / monthsTotal) * 100;

    const status: GoalStatus =
      progressPct >= 100
        ? "ACHIEVED"
        : nowMonth > g.deadline
          ? "EXPIRED"
          : progressPct >= elapsedPct
            ? "ON_TRACK"
            : "AT_RISK";

    return {
      id: g.id,
      name: g.name,
      metric: g.metric,
      targetValue: g.targetValue,
      startMonth: g.startMonth.toISOString(),
      deadline: g.deadline.toISOString(),
      currentValue: Math.round(currentValue * 100) / 100,
      progressPct: Math.round(progressPct * 10) / 10,
      monthsTotal,
      monthsElapsed,
      status,
    };
  });
}
