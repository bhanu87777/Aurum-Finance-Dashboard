import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { badRequest, parseStr } from "@/lib/validate";

// PATCH /api/account — rename the signed-in operator.
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = parseStr(body.name, { max: 80 });
  if (!name) return badRequest("Enter a name (max 80 chars).");

  await prisma.user.update({ where: { email: session.user.email }, data: { name } });
  return NextResponse.json({ ok: true, name });
}
