import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { generateAndSaveInsights } from "@/lib/insights";

// POST /api/insights — run the analyst (Claude, or the heuristic fallback)
// over the current books and persist a fresh insight batch.
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batch = await generateAndSaveInsights();
  return NextResponse.json({ id: batch.id, source: batch.source, count: batch.items.length });
}
