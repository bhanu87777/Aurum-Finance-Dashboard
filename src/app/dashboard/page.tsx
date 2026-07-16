import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { BudgetAlertBanner } from "@/components/dashboard/BudgetAlertBanner";
import { getBudgetAlerts } from "@/lib/budgets";
import { prisma } from "@/lib/prisma";
import {
  getMonthlyFinancials,
  getExpenseCategories,
  getProducts,
  getRecentTransactions,
  getCampaigns,
} from "@/lib/finance";

// Always render per-request so the dashboard reflects the live books and
// never gets baked at build time (when the DB may be unreachable).
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [months, categories, products, transactions, campaigns, alerts, user] = await Promise.all([
    getMonthlyFinancials(),
    getExpenseCategories(),
    getProducts(),
    getRecentTransactions(40),
    getCampaigns(),
    getBudgetAlerts(),
    session.user?.email
      ? prisma.user.findUnique({ where: { email: session.user.email }, select: { preferences: true } })
      : null,
  ]);
  const prefs = (user?.preferences ?? {}) as { defaultRange?: string };
  const initialRange = ["12m", "24m", "ytd"].includes(prefs.defaultRange ?? "") ? (prefs.defaultRange as "12m" | "24m" | "ytd") : "12m";

  return (
    <Shell user={session.user ?? {}} alertCount={alerts.length}>
      <div className="mx-auto w-full max-w-[1600px]">
        <BudgetAlertBanner alerts={alerts} />
      </div>
      <DashboardShell
        months={months}
        categories={categories}
        products={products}
        transactions={transactions}
        campaigns={campaigns}
        initialRange={initialRange}
      />
    </Shell>
  );
}
