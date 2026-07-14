import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// TEMPORARY diagnostic endpoint. Reports DB connectivity + timing + which env
// vars are present (never their secret values). Remove after debugging.
export const dynamic = "force-dynamic";

// Mirror of lib/prisma.ts resolveDatabaseUrl, but with the password masked, so
// we can see the exact connection params Prisma is actually using on Vercel.
function maskedResolved(): string | null {
  const raw = process.env.DATABASE_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    url.searchParams.delete("channel_binding");
    if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
    if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "15");
    if (url.hostname.includes("-pooler") && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }
    url.password = "***";
    return url.toString();
  } catch {
    return "(unparseable)";
  }
}

export async function GET() {
  const env = {
    marker: "diag-v3-timing",
    region: process.env.VERCEL_REGION ?? null,
    sanitizedUrl: maskedResolved(),
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasDirectUrl: !!process.env.DIRECT_URL,
    nextauthUrl: process.env.NEXTAUTH_URL ?? null,
    dbHost: (process.env.DATABASE_URL ?? "").split("@")[1]?.split("/")[0] ?? null,
  };
  const t0 = Date.now();
  try {
    const r = await prisma.$queryRaw`SELECT 1 as ok`;
    return NextResponse.json({ ok: true, ms: Date.now() - t0, db: r, env });
  } catch (e: unknown) {
    const err = e as { message?: string; name?: string; code?: string };
    return NextResponse.json(
      {
        ok: false,
        ms: Date.now() - t0,
        error: (err?.message ?? String(e)).slice(0, 300),
        name: err?.name ?? null,
        code: err?.code ?? null,
        env,
      },
      { status: 500 },
    );
  }
}
