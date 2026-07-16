import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getBudgetVsActual } from "@/lib/budgets";
import { prisma } from "@/lib/prisma";
import { csvResponse, toCsv } from "@/lib/csv";
import { parseMonthUtc } from "@/lib/validate";

// GET /api/export/budgets?from=YYYY-MM&to=YYYY-MM — budget vs actual as CSV.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  let from = parseMonthUtc(url.searchParams.get("from"));
  let to = parseMonthUtc(url.searchParams.get("to"));
  if (!from || !to) {
    const range = await prisma.budget.aggregate({ _min: { month: true }, _max: { month: true } });
    from = from ?? range._min.month ?? new Date();
    to = to ?? range._max.month ?? new Date();
  }

  const rows = await getBudgetVsActual(from, to);
  const csv = toCsv(
    ["Month", "Category", "Budget", "Actual", "Used %"],
    rows.map((r) => [r.month.slice(0, 7), r.category, r.budget.toFixed(2), r.actual.toFixed(2), Math.round(r.ratio * 100)])
  );
  return csvResponse("aurum-budgets.csv", csv);
}
