import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { badRequest, parseEnum, parseNum } from "@/lib/validate";
import type { Prisma } from "@prisma/client";

const THEMES = ["dark", "light"] as const;
const RANGES = ["12m", "24m", "ytd"] as const;

// GET /api/account/preferences
export async function GET() {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { preferences: true },
  });
  return NextResponse.json({ preferences: user?.preferences ?? {} });
}

// PATCH /api/account/preferences — whitelist-merge into the JSON column.
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (body.theme !== undefined) {
    const theme = parseEnum(body.theme, THEMES);
    if (!theme) return badRequest("Theme must be dark or light.");
    patch.theme = theme;
  }
  if (body.defaultRange !== undefined) {
    const range = parseEnum(body.defaultRange, RANGES);
    if (!range) return badRequest("Default range must be 12m, 24m, or ytd.");
    patch.defaultRange = range;
  }
  if (body.ledgerPageSize !== undefined) {
    const size = parseNum(body.ledgerPageSize, { min: 10, max: 100, int: true });
    if (size === null) return badRequest("Ledger page size must be 10–100.");
    patch.ledgerPageSize = size;
  }
  if (Object.keys(patch).length === 0) return badRequest("Nothing to update.");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, preferences: true },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const merged = { ...(user.preferences as Record<string, unknown>), ...patch };
  await prisma.user.update({ where: { id: user.id }, data: { preferences: merged as Prisma.InputJsonValue } });
  return NextResponse.json({ preferences: merged });
}
