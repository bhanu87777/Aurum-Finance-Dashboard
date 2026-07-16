import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { badRequest, parseMonthUtc } from "@/lib/validate";

// POST /api/budgets/copy — { fromMonth, toMonth }. Upsert-copies every
// category row, the "recurring budget" convenience.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const fromMonth = parseMonthUtc(body.fromMonth);
  if (!fromMonth) return badRequest("Invalid source month (use YYYY-MM).");
  const toMonth = parseMonthUtc(body.toMonth);
  if (!toMonth) return badRequest("Invalid target month (use YYYY-MM).");
  if (fromMonth.getTime() === toMonth.getTime()) return badRequest("Source and target months are the same.");

  const source = await prisma.budget.findMany({ where: { month: fromMonth } });
  if (source.length === 0) return NextResponse.json({ error: "The source month has no budgets." }, { status: 404 });

  await prisma.$transaction(
    source.map((b) =>
      prisma.budget.upsert({
        where: { month_category: { month: toMonth, category: b.category } },
        update: { amount: b.amount },
        create: { month: toMonth, category: b.category, amount: b.amount },
      })
    )
  );

  return NextResponse.json({ count: source.length });
}
