import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getBudgets } from "@/lib/budgets";
import { badRequest, parseMonthUtc, parseNum, parseStr } from "@/lib/validate";

const MAX_ROWS = 120;

// GET /api/budgets?from=YYYY-MM&to=YYYY-MM
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const from = parseMonthUtc(url.searchParams.get("from")) ?? undefined;
  const to = parseMonthUtc(url.searchParams.get("to")) ?? undefined;
  return NextResponse.json({ rows: await getBudgets(from, to) });
}

// PUT /api/budgets — upsert rows on the (month, category) unique.
// One endpoint covers both create and edit; the editor saves per row.
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const rows: unknown = body.rows;
  if (!Array.isArray(rows) || rows.length === 0) return badRequest("Provide a non-empty rows array.");
  if (rows.length > MAX_ROWS) return badRequest(`At most ${MAX_ROWS} budget rows per request.`);

  const parsed: { month: Date; category: string; amount: number }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] as Record<string, unknown>;
    const month = parseMonthUtc(r.month);
    if (!month) return badRequest(`Row ${i + 1}: invalid month (use YYYY-MM).`);
    const category = parseStr(r.category, { max: 60 });
    if (!category) return badRequest(`Row ${i + 1}: category is required.`);
    const amount = parseNum(r.amount, { min: 0, max: 100_000_000 });
    if (amount === null) return badRequest(`Row ${i + 1}: amount must be zero or more.`);
    parsed.push({ month, category, amount: Math.round(amount * 100) / 100 });
  }

  await prisma.$transaction(
    parsed.map((r) =>
      prisma.budget.upsert({
        where: { month_category: { month: r.month, category: r.category } },
        update: { amount: r.amount },
        create: r,
      })
    )
  );

  return NextResponse.json({ count: parsed.length });
}
