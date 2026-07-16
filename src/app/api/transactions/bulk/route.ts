import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { badRequest, parseEnum, TX_STATUSES } from "@/lib/validate";
import type { Prisma, TxStatus } from "@prisma/client";

const MAX_IDS = 200;

// POST /api/transactions/bulk — { action: "delete" | "setStatus", ids, status? }.
// setStatus enforces the transition rules in the where-clause: REFUNDED rows
// never change, and only PENDING rows may become COMPLETED.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = parseEnum(body.action, ["delete", "setStatus"] as const);
  if (!action) return badRequest("Action must be delete or setStatus.");

  const ids: unknown = body.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((i) => typeof i !== "string")) {
    return badRequest("Provide a non-empty ids array.");
  }
  if (ids.length > MAX_IDS) return badRequest(`At most ${MAX_IDS} transactions per bulk action.`);

  if (action === "delete") {
    const result = await prisma.transaction.deleteMany({ where: { id: { in: ids as string[] } } });
    return NextResponse.json({ count: result.count, skipped: ids.length - result.count });
  }

  const status = parseEnum(body.status, TX_STATUSES);
  if (!status) return badRequest("Status must be COMPLETED, PENDING, or REFUNDED.");

  // Where-clause guard implementing canTransition() in bulk form.
  const allowedFrom: TxStatus[] =
    status === "COMPLETED" ? ["PENDING", "COMPLETED"] : status === "REFUNDED" ? ["PENDING", "COMPLETED", "REFUNDED"] : ["PENDING"];

  const where: Prisma.TransactionWhereInput = { id: { in: ids as string[] }, status: { in: allowedFrom } };
  const result = await prisma.transaction.updateMany({ where, data: { status } });
  return NextResponse.json({ count: result.count, skipped: ids.length - result.count });
}
