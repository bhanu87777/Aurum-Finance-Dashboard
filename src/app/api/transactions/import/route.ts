import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { parseCsv } from "@/lib/csv";
import { badRequest, validateTransactionInput, type TxInput } from "@/lib/validate";

const MAX_BODY_BYTES = 1_000_000; // 1MB of CSV text
const MAX_DATA_ROWS = 2_000;
const PREVIEW_ROWS = 20;
const MAX_ERRORS = 50;

// Column mapping: transaction field -> CSV header name (string) or column index (number).
type Mapping = Partial<Record<"buyer" | "email" | "amount" | "quantity" | "occurredAt" | "product" | "status" | "method", string | number>>;

const REQUIRED_FIELDS = ["buyer", "email", "amount", "occurredAt", "product"] as const;

// POST /api/transactions/import — { csv, mapping, dryRun }.
// dryRun validates and previews; a real run createMany()s the valid rows.
// Products are resolved by case-insensitive exact name.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return badRequest("CSV exceeds the 1MB limit.");

  let body: { csv?: unknown; mapping?: unknown; dryRun?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return badRequest("Invalid request body.");
  }

  if (typeof body.csv !== "string" || !body.csv.trim()) return badRequest("Provide CSV content.");
  if (typeof body.mapping !== "object" || body.mapping === null) return badRequest("Provide a column mapping.");
  const mapping = body.mapping as Mapping;
  const dryRun = body.dryRun !== false;

  for (const f of REQUIRED_FIELDS) {
    if (mapping[f] === undefined || mapping[f] === "") {
      return badRequest(`Map a CSV column to "${f}".`);
    }
  }

  let grid: string[][];
  try {
    grid = parseCsv(body.csv);
  } catch (e) {
    return badRequest(e instanceof Error ? e.message : "Could not parse the CSV.");
  }
  if (grid.length < 2) return badRequest("The CSV needs a header row and at least one data row.");

  const header = grid[0].map((h) => h.trim());
  const dataRows = grid.slice(1);
  if (dataRows.length > MAX_DATA_ROWS) {
    return badRequest(`At most ${MAX_DATA_ROWS} data rows per import (got ${dataRows.length}).`);
  }

  // Resolve each mapped field to a column index once.
  const colIndex: Record<string, number> = {};
  for (const [field, ref] of Object.entries(mapping)) {
    if (ref === undefined || ref === "") continue;
    const idx = typeof ref === "number" ? ref : header.findIndex((h) => h.toLowerCase() === String(ref).trim().toLowerCase());
    if (idx < 0 || idx >= header.length) return badRequest(`Column "${ref}" for "${field}" not found in the CSV header.`);
    colIndex[field] = idx;
  }

  // One products query; resolve by case-insensitive exact name.
  const products = await prisma.product.findMany({ select: { id: true, name: true } });
  const productByName = new Map(products.map((p) => [p.name.trim().toLowerCase(), p.id]));

  const valid: Array<TxInput & { productId: string }> = [];
  const errors: { line: number; message: string }[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const line = i + 2; // 1-based, after the header
    const cell = (field: string) => (colIndex[field] !== undefined ? (row[colIndex[field]] ?? "").trim() : "");

    const parsed = validateTransactionInput({
      buyer: cell("buyer"),
      email: cell("email"),
      amount: cell("amount"),
      quantity: colIndex.quantity !== undefined && cell("quantity") !== "" ? cell("quantity") : 1,
      occurredAt: cell("occurredAt"),
      status: colIndex.status !== undefined && cell("status") !== "" ? cell("status").toUpperCase() : undefined,
      method: colIndex.method !== undefined && cell("method") !== "" ? cell("method").toUpperCase() : undefined,
    });
    if (!parsed.ok) {
      if (errors.length < MAX_ERRORS) errors.push({ line, message: parsed.error });
      continue;
    }

    const productName = cell("product");
    const productId = productByName.get(productName.toLowerCase());
    if (!productId) {
      if (errors.length < MAX_ERRORS) errors.push({ line, message: `Unknown product "${productName}".` });
      continue;
    }

    valid.push({ ...parsed.data, productId });
  }

  const errorCount = dataRows.length - valid.length;

  if (dryRun) {
    return NextResponse.json({
      validCount: valid.length,
      errorCount,
      preview: valid.slice(0, PREVIEW_ROWS).map((v) => ({
        buyer: v.buyer,
        email: v.email,
        amount: v.amount,
        quantity: v.quantity,
        status: v.status,
        method: v.method,
        occurredAt: v.occurredAt.toISOString(),
      })),
      errors,
    });
  }

  if (valid.length === 0) return badRequest("No valid rows to import.");
  const result = await prisma.transaction.createMany({ data: valid });
  return NextResponse.json({ inserted: result.count, errorCount, errors });
}
