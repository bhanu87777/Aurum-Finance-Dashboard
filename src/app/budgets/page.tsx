import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getBudgetVsActual, getBudgetAlerts } from "@/lib/budgets";
import { getGoalsWithProgress } from "@/lib/goals";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { BudgetsView } from "@/components/budgets/BudgetsView";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const range = await prisma.monthlyFinancial.aggregate({ _min: { month: true }, _max: { month: true } });
  const from = range._min.month ?? new Date();
  const to = range._max.month ?? new Date();

  const [rows, goals, alerts] = await Promise.all([
    getBudgetVsActual(from, to),
    getGoalsWithProgress(),
    getBudgetAlerts(),
  ]);

  return (
    <Shell user={session.user ?? {}} alertCount={alerts.length}>
      <BudgetsView rows={rows} goals={goals} latestMonth={to.toISOString()} />
    </Shell>
  );
}
