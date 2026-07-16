import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getProducts } from "@/lib/finance";
import { badRequest, parseNum, parseStr } from "@/lib/validate";

// GET /api/products — full catalog (used by forms and the Catalog page).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ rows: await getProducts() });
}

// POST /api/products
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = parseStr(body.name, { max: 120 });
  if (!name) return badRequest("Product name is required (max 120 chars).");
  const category = parseStr(body.category, { max: 60 });
  if (!category) return badRequest("Category is required (max 60 chars).");
  const price = parseNum(body.price, { min: 0.01, max: 10_000_000 });
  if (price === null) return badRequest("Price must be a positive number.");
  const expense = parseNum(body.expense, { min: 0, max: 10_000_000 });
  if (expense === null) return badRequest("Unit cost must be zero or more.");
  const unitsSold = parseNum(body.unitsSold ?? 0, { min: 0, int: true });
  if (unitsSold === null) return badRequest("Units sold must be a whole number.");
  const rating = parseNum(body.rating ?? 0, { min: 0, max: 5 });
  if (rating === null) return badRequest("Rating must be between 0 and 5.");

  const row = await prisma.product.create({
    data: {
      name,
      category,
      price: Math.round(price * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      unitsSold,
      rating: Math.round(rating * 100) / 100,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
