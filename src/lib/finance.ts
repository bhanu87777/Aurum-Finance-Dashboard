import { prisma } from "./prisma";

// Plain-JSON shapes handed from server components to client chart components.
export type MonthRow = {
  month: string; // ISO
  revenue: number;
  expenses: number;
  operational: number;
  nonOperational: number;
  profit: number;
};

export type CategoryRow = { month: string; category: string; amount: number };

export type ProductRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  expense: number;
  unitsSold: number;
  rating: number;
};

export type TransactionRow = {
  id: string;
  buyer: string;
  email: string;
  amount: number;
  quantity: number;
  status: string;
  method: string;
  occurredAt: string; // ISO
  productName: string;
};

export type CampaignRow = {
  id: string;
  name: string;
  channel: string;
  status: string;
  budget: number;
  spend: number;
  targetRevenue: number;
  attributedRevenue: number;
};

export async function getMonthlyFinancials(): Promise<MonthRow[]> {
  const rows = await prisma.monthlyFinancial.findMany({ orderBy: { month: "asc" } });
  return rows.map((r) => ({
    month: r.month.toISOString(),
    revenue: r.revenue,
    expenses: r.expenses,
    operational: r.operationalExpenses,
    nonOperational: r.nonOperationalExpenses,
    profit: Math.round((r.revenue - r.expenses) * 100) / 100,
  }));
}

export async function getExpenseCategories(): Promise<CategoryRow[]> {
  const rows = await prisma.expenseByCategory.findMany({ orderBy: { month: "asc" } });
  return rows.map((r) => ({ month: r.month.toISOString(), category: r.category, amount: r.amount }));
}

export async function getProducts(): Promise<ProductRow[]> {
  const rows = await prisma.product.findMany({ orderBy: { unitsSold: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    price: r.price,
    expense: r.expense,
    unitsSold: r.unitsSold,
    rating: r.rating,
  }));
}

export async function getRecentTransactions(limit = 12): Promise<TransactionRow[]> {
  const rows = await prisma.transaction.findMany({
    orderBy: { occurredAt: "desc" },
    take: limit,
    include: { product: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    buyer: r.buyer,
    email: r.email,
    amount: r.amount,
    quantity: r.quantity,
    status: r.status,
    method: r.method,
    occurredAt: r.occurredAt.toISOString(),
    productName: r.product.name,
  }));
}

export async function getCampaigns(): Promise<CampaignRow[]> {
  const rows = await prisma.campaign.findMany({ orderBy: { startedAt: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    channel: r.channel,
    status: r.status,
    budget: r.budget,
    spend: r.spend,
    targetRevenue: r.targetRevenue,
    attributedRevenue: r.attributedRevenue,
  }));
}
