import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { getLatestInsightBatch } from "@/lib/insights";
import { InsightsView, type InsightBatchView } from "@/components/insights/InsightsView";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const latest = await getLatestInsightBatch();
  const batch: InsightBatchView = latest
    ? {
        id: latest.id,
        summary: latest.summary,
        healthScore: latest.healthScore,
        source: latest.source,
        createdAt: latest.createdAt.toISOString(),
        items: latest.items.map((i) => ({
          id: i.id,
          title: i.title,
          body: i.body,
          category: i.category,
          severity: i.severity,
        })),
      }
    : null;

  return (
    <Shell user={session.user ?? {}}>
      <InsightsView batch={batch} />
    </Shell>
  );
}
