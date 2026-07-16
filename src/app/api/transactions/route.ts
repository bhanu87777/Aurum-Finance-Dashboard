import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { badRequest, parseStr, validateTransactionInput } from "@/lib/validate";
import type { Prisma, TxStatus } from "@prisma/client";

// GET /api/transactions?query=&status=&page=&take= — paginated ledger.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const query = url.searchParams.get("query")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take")) || 15));

  const where: Prisma.TransactionWhereInput = {};
  if (query) {
    where.OR = [
      { buyer: { contains: query } },
      { email: { contains: query } },
      { product: { name: { contains: query } } },
    ];
  }
  if (["COMPLETED", "PENDING", "REFUNDED"].includes(status)) {
    where.status = status as TxStatus;
  }

  const [total, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * take,
      take,
      include: { product: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({
    total,
    rows: rows.map((r) => ({
      id: r.id,
      buyer: r.buyer,
      email: r.email,
      amount: r.amount,
      quantity: r.quantity,
      status: r.status,
      method: r.method,
      occurredAt: r.occurredAt.toISOString(),
      productId: r.productId,
      productName: r.product.name,
    })),
  });
}

// POST /api/transactions — record a manual ledger entry.
// Intentionally does NOT touch MonthlyFinancial/ExpenseByCategory: the books
// are authoritative and independent of the ledger.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = validateTransactionInput(body);
  if (!parsed.ok) return badRequest(parsed.error);

  const productId = parseStr(body.productId, { max: 40 });
  if (!productId) return badRequest("Select a product.");
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const row = await prisma.transaction.create({
    data: { ...parsed.data, productId },
    include: { product: { select: { name: true } } },
  });

  return NextResponse.json(
    {
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
    },
    { status: 201 }
  );
}
