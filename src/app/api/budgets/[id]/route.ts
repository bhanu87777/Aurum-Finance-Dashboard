import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// DELETE /api/budgets/:id
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.budget.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Budget not found." }, { status: 404 });

  await prisma.budget.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
