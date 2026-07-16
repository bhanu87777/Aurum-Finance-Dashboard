import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { ReportsView } from "@/components/reports/ReportsView";
import { comparePeriods, resolveReportRanges, type CompareKey, type PeriodKey } from "@/lib/reports";

export const dynamic = "force-dynamic";

const PERIODS: PeriodKey[] = ["3m", "6m", "12m", "ytd"];
const COMPARES: CompareKey[] = ["prev", "yoy"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; compare?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const period = (PERIODS.includes(params.period as PeriodKey) ? params.period : "12m") as PeriodKey;
  const compare = (COMPARES.includes(params.compare as CompareKey) ? params.compare : "prev") as CompareKey;

  const { aStart, aEnd, bStart, bEnd } = await resolveReportRanges(period, compare);
  const comparison = await comparePeriods(aStart, aEnd, bStart, bEnd);

  return (
    <Shell user={session.user ?? {}}>
      <ReportsView comparison={comparison} period={period} compare={compare} />
    </Shell>
  );
}
