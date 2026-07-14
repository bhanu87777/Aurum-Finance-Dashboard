import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
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

  const [months, categories, products, transactions, campaigns] = await Promise.all([
    getMonthlyFinancials(),
    getExpenseCategories(),
    getProducts(),
    getRecentTransactions(40),
    getCampaigns(),
  ]);

  return (
    <Shell user={session.user ?? {}}>
      <DashboardShell
        months={months}
        categories={categories}
        products={products}
        transactions={transactions}
        campaigns={campaigns}
      />
    </Shell>
  );
}
