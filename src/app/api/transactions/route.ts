import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
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
      productName: r.product.name,
    })),
  });
}
