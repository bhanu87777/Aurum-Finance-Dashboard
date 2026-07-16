import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { badRequest, parseDate, parseEnum, parseNum, parseStr } from "@/lib/validate";
import type { Prisma } from "@prisma/client";

const STATUSES = ["ACTIVE", "COMPLETED", "PAUSED"] as const;

// PATCH /api/campaigns/:id — partial update.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Prisma.CampaignUpdateInput = {};

  if (body.name !== undefined) {
    const name = parseStr(body.name, { max: 120 });
    if (!name) return badRequest("Campaign name is required (max 120 chars).");
    data.name = name;
  }
  if (body.channel !== undefined) {
    const channel = parseStr(body.channel, { max: 60 });
    if (!channel) return badRequest("Channel is required (max 60 chars).");
    data.channel = channel;
  }
  if (body.status !== undefined) {
    const status = parseEnum(body.status, STATUSES);
    if (!status) return badRequest("Status must be ACTIVE, COMPLETED, or PAUSED.");
    data.status = status;
  }
  if (body.startedAt !== undefined) {
    const startedAt = parseDate(body.startedAt);
    if (!startedAt) return badRequest("Enter a valid start date.");
    data.startedAt = startedAt;
  }
  for (const key of ["budget", "spend", "targetRevenue", "attributedRevenue"] as const) {
    if (body[key] !== undefined) {
      const n = parseNum(body[key], { min: 0, max: 1_000_000_000 });
      if (n === null) return badRequest(`${key} must be zero or more.`);
      data[key] = Math.round(n * 100) / 100;
    }
  }

  const row = await prisma.campaign.update({ where: { id }, data });
  return NextResponse.json(row);
}

// DELETE /api/campaigns/:id
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
