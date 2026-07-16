import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { badRequest, parseEnum, parseMonthUtc, parseNum, parseStr } from "@/lib/validate";
import type { Prisma } from "@prisma/client";

const METRICS = ["REVENUE", "PROFIT"] as const;

// PATCH /api/goals/:id — partial update; the month window is re-validated.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.goal.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Prisma.GoalUpdateInput = {};

  if (body.name !== undefined) {
    const name = parseStr(body.name, { max: 120 });
    if (!name) return badRequest("Goal name is required (max 120 chars).");
    data.name = name;
  }
  if (body.metric !== undefined) {
    const metric = parseEnum(body.metric, METRICS);
    if (!metric) return badRequest("Metric must be REVENUE or PROFIT.");
    data.metric = metric;
  }
  if (body.targetValue !== undefined) {
    const targetValue = parseNum(body.targetValue, { min: 1, max: 10_000_000_000 });
    if (targetValue === null) return badRequest("Target must be a positive number.");
    data.targetValue = Math.round(targetValue * 100) / 100;
  }

  const startMonth = body.startMonth !== undefined ? parseMonthUtc(body.startMonth) : existing.startMonth;
  if (!startMonth) return badRequest("Invalid start month (use YYYY-MM).");
  const deadline = body.deadline !== undefined ? parseMonthUtc(body.deadline) : existing.deadline;
  if (!deadline) return badRequest("Invalid deadline month (use YYYY-MM).");
  if (deadline < startMonth) return badRequest("The deadline cannot be before the start month.");
  if (body.startMonth !== undefined) data.startMonth = startMonth;
  if (body.deadline !== undefined) data.deadline = deadline;

  const row = await prisma.goal.update({ where: { id }, data });
  return NextResponse.json(row);
}

// DELETE /api/goals/:id
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.goal.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
