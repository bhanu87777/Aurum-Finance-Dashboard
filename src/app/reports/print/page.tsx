import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getReportData, resolveReportRanges, type CompareKey, type PeriodKey } from "@/lib/reports";
import { PrintReport } from "@/components/reports/PrintReport";

export const dynamic = "force-dynamic";

const PERIODS: PeriodKey[] = ["3m", "6m", "12m", "ytd"];

// Print-ready report: no Shell, fixed-width charts, forced-light sheet.
// The browser's "Save as PDF" is the export path — no PDF library.
export default async function PrintReportPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; compare?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const period = (PERIODS.includes(params.period as PeriodKey) ? params.period : "12m") as PeriodKey;
  const compare = (params.compare === "yoy" ? "yoy" : "prev") as CompareKey;

  const { aStart, aEnd } = await resolveReportRanges(period, compare);
  const data = await getReportData(aStart, aEnd);

  return <PrintReport data={data} />;
}
