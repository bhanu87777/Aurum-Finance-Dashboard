import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getGoalsWithProgress } from "@/lib/goals";
import { badRequest, parseEnum, parseMonthUtc, parseNum, parseStr } from "@/lib/validate";

const METRICS = ["REVENUE", "PROFIT"] as const;

// GET /api/goals — goals with derived progress.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ rows: await getGoalsWithProgress() });
}

// POST /api/goals
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = parseStr(body.name, { max: 120 });
  if (!name) return badRequest("Goal name is required (max 120 chars).");
  const metric = parseEnum(body.metric, METRICS);
  if (!metric) return badRequest("Metric must be REVENUE or PROFIT.");
  const targetValue = parseNum(body.targetValue, { min: 1, max: 10_000_000_000 });
  if (targetValue === null) return badRequest("Target must be a positive number.");
  const startMonth = parseMonthUtc(body.startMonth);
  if (!startMonth) return badRequest("Invalid start month (use YYYY-MM).");
  const deadline = parseMonthUtc(body.deadline);
  if (!deadline) return badRequest("Invalid deadline month (use YYYY-MM).");
  if (deadline < startMonth) return badRequest("The deadline cannot be before the start month.");

  const row = await prisma.goal.create({
    data: { name, metric, targetValue: Math.round(targetValue * 100) / 100, startMonth, deadline },
  });
  return NextResponse.json(row, { status: 201 });
}
