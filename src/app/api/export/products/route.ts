import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { csvResponse, toCsv } from "@/lib/csv";

// GET /api/export/products — full catalog as CSV.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.product.findMany({ orderBy: { name: "asc" } });
  const csv = toCsv(
    ["Name", "Category", "Price", "Unit cost", "Units sold", "Rating"],
    rows.map((p) => [p.name, p.category, p.price.toFixed(2), p.expense.toFixed(2), p.unitsSold, p.rating.toFixed(1)])
  );
  return csvResponse("aurum-products.csv", csv);
}
