import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getCampaigns } from "@/lib/finance";
import { badRequest, parseDate, parseEnum, parseNum, parseStr } from "@/lib/validate";

const STATUSES = ["ACTIVE", "COMPLETED", "PAUSED"] as const;

// GET /api/campaigns
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ rows: await getCampaigns() });
}

// POST /api/campaigns — overspend (spend > budget) is allowed; it happens.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = parseStr(body.name, { max: 120 });
  if (!name) return badRequest("Campaign name is required (max 120 chars).");
  const channel = parseStr(body.channel, { max: 60 });
  if (!channel) return badRequest("Channel is required (max 60 chars).");
  const status = parseEnum(body.status ?? "ACTIVE", STATUSES);
  if (!status) return badRequest("Status must be ACTIVE, COMPLETED, or PAUSED.");
  const startedAt = parseDate(body.startedAt);
  if (!startedAt) return badRequest("Enter a valid start date.");
  const budget = parseNum(body.budget, { min: 0, max: 100_000_000 });
  if (budget === null) return badRequest("Budget must be zero or more.");
  const spend = parseNum(body.spend ?? 0, { min: 0, max: 100_000_000 });
  if (spend === null) return badRequest("Spend must be zero or more.");
  const targetRevenue = parseNum(body.targetRevenue, { min: 0, max: 1_000_000_000 });
  if (targetRevenue === null) return badRequest("Target revenue must be zero or more.");
  const attributedRevenue = parseNum(body.attributedRevenue ?? 0, { min: 0, max: 1_000_000_000 });
  if (attributedRevenue === null) return badRequest("Attributed revenue must be zero or more.");

  const row = await prisma.campaign.create({
    data: {
      name,
      channel,
      status,
      startedAt,
      budget: Math.round(budget * 100) / 100,
      spend: Math.round(spend * 100) / 100,
      targetRevenue: Math.round(targetRevenue * 100) / 100,
      attributedRevenue: Math.round(attributedRevenue * 100) / 100,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
