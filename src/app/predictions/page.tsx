import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { getMonthlyFinancials } from "@/lib/finance";
import { linearRegressionForecast } from "@/lib/regression";
import { monthYearLabel } from "@/lib/utils";
import { PredictionsView } from "@/components/predictions/PredictionsView";

export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const months = await getMonthlyFinancials();
  const labels = months.map((m) => monthYearLabel(m.month));
  const values = months.map((m) => m.revenue);

  // 12 future month labels continuing from the last actual month.
  const lastMonth = new Date(months[months.length - 1].month);
  const futureLabels: string[] = [];
  for (let i = 1; i <= 12; i++) {
    const d = new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() + i, 1));
    futureLabels.push(monthYearLabel(d.toISOString()));
  }

  const result = linearRegressionForecast(labels, values, futureLabels);

  return (
    <Shell user={session.user ?? {}}>
      <PredictionsView result={result} />
    </Shell>
  );
}
