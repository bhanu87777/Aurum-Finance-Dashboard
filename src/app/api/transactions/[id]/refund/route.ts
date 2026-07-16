import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// POST /api/transactions/:id/refund — the explicit refund workflow.
// Any non-refunded transaction can be refunded; REFUNDED is terminal.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  if (existing.status === "REFUNDED") {
    return NextResponse.json({ error: "This transaction is already refunded." }, { status: 409 });
  }

  const row = await prisma.transaction.update({
    where: { id },
    data: { status: "REFUNDED" },
    include: { product: { select: { name: true } } },
  });

  return NextResponse.json({
    id: row.id,
    buyer: row.buyer,
    email: row.email,
    amount: row.amount,
    quantity: row.quantity,
    status: row.status,
    method: row.method,
    occurredAt: row.occurredAt.toISOString(),
    productId: row.productId,
    productName: row.product.name,
  });
}
