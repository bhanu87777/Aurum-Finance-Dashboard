import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { badRequest, parseNum, parseStr } from "@/lib/validate";
import type { Prisma } from "@prisma/client";

// PATCH /api/products/:id — partial update.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Prisma.ProductUpdateInput = {};

  if (body.name !== undefined) {
    const name = parseStr(body.name, { max: 120 });
    if (!name) return badRequest("Product name is required (max 120 chars).");
    data.name = name;
  }
  if (body.category !== undefined) {
    const category = parseStr(body.category, { max: 60 });
    if (!category) return badRequest("Category is required (max 60 chars).");
    data.category = category;
  }
  if (body.price !== undefined) {
    const price = parseNum(body.price, { min: 0.01, max: 10_000_000 });
    if (price === null) return badRequest("Price must be a positive number.");
    data.price = Math.round(price * 100) / 100;
  }
  if (body.expense !== undefined) {
    const expense = parseNum(body.expense, { min: 0, max: 10_000_000 });
    if (expense === null) return badRequest("Unit cost must be zero or more.");
    data.expense = Math.round(expense * 100) / 100;
  }
  if (body.unitsSold !== undefined) {
    const unitsSold = parseNum(body.unitsSold, { min: 0, int: true });
    if (unitsSold === null) return badRequest("Units sold must be a whole number.");
    data.unitsSold = unitsSold;
  }
  if (body.rating !== undefined) {
    const rating = parseNum(body.rating, { min: 0, max: 5 });
    if (rating === null) return badRequest("Rating must be between 0 and 5.");
    data.rating = Math.round(rating * 100) / 100;
  }

  const row = await prisma.product.update({ where: { id }, data });
  return NextResponse.json(row);
}

// DELETE /api/products/:id — deleting a product CASCADES to its transactions,
// so when ledger rows exist the caller must resend with ?confirm=true.
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const transactionCount = await prisma.transaction.count({ where: { productId: id } });
  const confirmed = new URL(req.url).searchParams.get("confirm") === "true";
  if (transactionCount > 0 && !confirmed) {
    return NextResponse.json(
      {
        error: `Deleting "${existing.name}" also deletes its ${transactionCount} ledger transaction${transactionCount === 1 ? "" : "s"}.`,
        transactionCount,
      },
      { status: 409 }
    );
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true, deletedTransactions: transactionCount });
}
