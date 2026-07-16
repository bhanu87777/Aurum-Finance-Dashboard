import { NextResponse } from "next/server";
import { TxStatus, TxMethod } from "@prisma/client";

// Hand-rolled request validation, matching the register-route idioms.
// Parsers return null when the value is absent or malformed; routes decide
// whether that is a 400 (required) or a skip (optional PATCH field).

export function parseStr(v: unknown, opts: { max?: number } = {}): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  if (opts.max && s.length > opts.max) return null;
  return s;
}

export function parseNum(v: unknown, opts: { min?: number; max?: number; int?: boolean } = {}): number | null {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  if (opts.int && !Number.isInteger(n)) return null;
  if (opts.min !== undefined && n < opts.min) return null;
  if (opts.max !== undefined && n > opts.max) return null;
  return n;
}

export function parseEnum<T extends string>(v: unknown, values: readonly T[]): T | null {
  return typeof v === "string" && (values as readonly string[]).includes(v) ? (v as T) : null;
}

// Accepts "YYYY-MM" or any ISO date; normalizes to first-of-month UTC.
export function parseMonthUtc(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const ym = /^(\d{4})-(\d{2})$/.exec(v.trim());
  if (ym) {
    const year = Number(ym[1]);
    const month = Number(ym[2]);
    if (month < 1 || month > 12) return null;
    return new Date(Date.UTC(year, month - 1, 1));
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function parseDate(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function badRequest(msg: string): NextResponse {
  return NextResponse.json({ error: msg }, { status: 400 });
}

// ---- Transactions: shared by POST, PATCH, and the CSV importer ----

export const TX_STATUSES = ["COMPLETED", "PENDING", "REFUNDED"] as const;
export const TX_METHODS = ["CARD", "WIRE", "PAYPAL"] as const;

// Legal status transitions. REFUNDED is terminal by design — the escape
// hatch for a mistaken refund is delete + recreate.
export function canTransition(from: TxStatus, to: TxStatus): boolean {
  if (from === to) return true;
  if (from === "PENDING") return to === "COMPLETED" || to === "REFUNDED";
  if (from === "COMPLETED") return to === "REFUNDED";
  return false; // REFUNDED
}

export type TxInput = {
  buyer: string;
  email: string;
  amount: number;
  quantity: number;
  status: TxStatus;
  method: TxMethod;
  occurredAt: Date;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateTransactionInput(
  body: Record<string, unknown>
): { ok: true; data: TxInput } | { ok: false; error: string } {
  const buyer = parseStr(body.buyer, { max: 120 });
  if (!buyer) return { ok: false, error: "Buyer name is required (max 120 chars)." };

  const email = parseStr(body.email, { max: 160 })?.toLowerCase() ?? null;
  if (!email || !EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid buyer email." };

  const amount = parseNum(body.amount, { min: 0.01, max: 10_000_000 });
  if (amount === null) return { ok: false, error: "Amount must be a positive number." };

  const quantity = parseNum(body.quantity ?? 1, { min: 1, max: 10_000, int: true });
  if (quantity === null) return { ok: false, error: "Quantity must be a positive whole number." };

  const status = parseEnum(body.status ?? "COMPLETED", TX_STATUSES);
  if (!status) return { ok: false, error: "Status must be COMPLETED, PENDING, or REFUNDED." };

  const method = parseEnum(body.method ?? "CARD", TX_METHODS);
  if (!method) return { ok: false, error: "Method must be CARD, WIRE, or PAYPAL." };

  const occurredAt = parseDate(body.occurredAt);
  if (!occurredAt) return { ok: false, error: "Enter a valid transaction date." };

  return {
    ok: true,
    data: {
      buyer,
      email,
      amount: Math.round(amount * 100) / 100,
      quantity,
      status,
      method,
      occurredAt,
    },
  };
}
