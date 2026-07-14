import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// TEMPORARY diagnostic endpoint. Reports DB connectivity + which env vars are
// present (never their secret values). Remove after debugging deployment.
export const dynamic = "force-dynamic";

export async function GET() {
  // Build marker + the connection params actually in effect on this deploy.
  const marker = "diag-v2-connect-timeout";
  let resolvedParams: string | null = null;
  try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    u.password = "***";
    resolvedParams = u.search || "(none)";
  } catch {
    resolvedParams = null;
  }
  const env = {
    marker,
    resolvedParams,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasDirectUrl: !!process.env.DIRECT_URL,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasNextauthSecret: !!process.env.NEXTAUTH_SECRET,
    nextauthUrl: process.env.NEXTAUTH_URL ?? null,
    // host portion only (no user/password) — safe to expose for debugging
    dbHost: (process.env.DATABASE_URL ?? "").split("@")[1]?.split("/")[0] ?? null,
  };
  try {
    const r = await prisma.$queryRaw`SELECT 1 as ok`;
    return NextResponse.json({ ok: true, db: r, env });
  } catch (e: unknown) {
    const err = e as { message?: string; name?: string; code?: string };
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? String(e),
        name: err?.name ?? null,
        code: err?.code ?? null,
        env,
      },
      { status: 500 },
    );
  }
}
