import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  badRequest,
  canTransition,
  parseDate,
  parseEnum,
  parseNum,
  parseStr,
  TX_METHODS,
  TX_STATUSES,
} from "@/lib/validate";
import type { Prisma } from "@prisma/client";

// PATCH /api/transactions/:id — partial update.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Prisma.TransactionUpdateInput = {};

  if (body.buyer !== undefined) {
    const buyer = parseStr(body.buyer, { max: 120 });
    if (!buyer) return badRequest("Buyer name is required (max 120 chars).");
    data.buyer = buyer;
  }
  if (body.email !== undefined) {
    const email = parseStr(body.email, { max: 160 })?.toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest("Enter a valid buyer email.");
    data.email = email;
  }
  if (body.amount !== undefined) {
    const amount = parseNum(body.amount, { min: 0.01, max: 10_000_000 });
    if (amount === null) return badRequest("Amount must be a positive number.");
    data.amount = Math.round(amount * 100) / 100;
  }
  if (body.quantity !== undefined) {
    const quantity = parseNum(body.quantity, { min: 1, max: 10_000, int: true });
    if (quantity === null) return badRequest("Quantity must be a positive whole number.");
    data.quantity = quantity;
  }
  if (body.method !== undefined) {
    const method = parseEnum(body.method, TX_METHODS);
    if (!method) return badRequest("Method must be CARD, WIRE, or PAYPAL.");
    data.method = method;
  }
  if (body.occurredAt !== undefined) {
    const occurredAt = parseDate(body.occurredAt);
    if (!occurredAt) return badRequest("Enter a valid transaction date.");
    data.occurredAt = occurredAt;
  }
  if (body.status !== undefined) {
    const status = parseEnum(body.status, TX_STATUSES);
    if (!status) return badRequest("Status must be COMPLETED, PENDING, or REFUNDED.");
    if (!canTransition(existing.status, status)) {
      return NextResponse.json(
        { error: `Cannot change a ${existing.status.toLowerCase()} transaction to ${status.toLowerCase()}.` },
        { status: 409 }
      );
    }
    data.status = status;
  }
  if (body.productId !== undefined) {
    const productId = parseStr(body.productId, { max: 40 });
    if (!productId) return badRequest("Select a product.");
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    data.product = { connect: { id: productId } };
  }

  const row = await prisma.transaction.update({
    where: { id },
    data,
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

// DELETE /api/transactions/:id
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });

  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
