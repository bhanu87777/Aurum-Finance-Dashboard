import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { csvResponse, toCsv } from "@/lib/csv";

// GET /api/export/campaigns — all campaigns as CSV.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.campaign.findMany({ orderBy: { startedAt: "desc" } });
  const csv = toCsv(
    ["Name", "Channel", "Status", "Started", "Budget", "Spend", "Target revenue", "Attributed revenue"],
    rows.map((c) => [
      c.name,
      c.channel,
      c.status,
      c.startedAt.toISOString().slice(0, 10),
      c.budget.toFixed(2),
      c.spend.toFixed(2),
      c.targetRevenue.toFixed(2),
      c.attributedRevenue.toFixed(2),
    ])
  );
  return csvResponse("aurum-campaigns.csv", csv);
}
