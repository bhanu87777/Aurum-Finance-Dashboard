import { PrismaClient, TxStatus, TxMethod, CampaignStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Deterministic PRNG so every reseed produces the same books.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260710);
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---- Time window: 24 full months ending last month (Jul 2024 – Jun 2026) ----
const MONTHS: Date[] = [];
for (let i = 0; i < 24; i++) {
  MONTHS.push(new Date(Date.UTC(2024, 6 + i, 1)));
}

// Seasonality multiplier for a premium D2C brand: Q4 gifting peak, summer dip.
const SEASON = [0.97, 0.95, 1.0, 1.06, 1.16, 1.24, 0.99, 0.96, 1.0, 1.02, 1.03, 0.98];
// index 0 = Jan ... 11 = Dec

const EXPENSE_CATEGORIES: { name: string; share: number }[] = [
  { name: "Salaries", share: 0.4 },
  { name: "Marketing", share: 0.19 },
  { name: "Operations", share: 0.16 },
  { name: "Infrastructure", share: 0.14 },
  { name: "R&D", share: 0.11 },
];

const PRODUCTS: { name: string; category: string; price: number; margin: number }[] = [
  { name: "Meridian Chronograph", category: "Timepieces", price: 1890, margin: 0.62 },
  { name: "Solstice Automatic", category: "Timepieces", price: 1240, margin: 0.58 },
  { name: "Atlas GMT Steel", category: "Timepieces", price: 980, margin: 0.55 },
  { name: "Aurum Signet Ring", category: "Jewelry", price: 640, margin: 0.68 },
  { name: "Lumière Pendant", category: "Jewelry", price: 720, margin: 0.66 },
  { name: "Cascade Tennis Bracelet", category: "Jewelry", price: 1480, margin: 0.64 },
  { name: "Noir Eau de Parfum", category: "Fragrance", price: 185, margin: 0.78 },
  { name: "Ambre Royale", category: "Fragrance", price: 210, margin: 0.76 },
  { name: "Vetiver d'Or", category: "Fragrance", price: 165, margin: 0.74 },
  { name: "Alpine Cashmere Scarf", category: "Apparel", price: 320, margin: 0.6 },
  { name: "Savile Overcoat", category: "Apparel", price: 1150, margin: 0.52 },
  { name: "Riviera Silk Shirt", category: "Apparel", price: 290, margin: 0.57 },
  { name: "Heritage Cardholder", category: "Leather", price: 145, margin: 0.7 },
  { name: "Voyager Weekender", category: "Leather", price: 890, margin: 0.61 },
  { name: "Ledger Belt", category: "Leather", price: 175, margin: 0.66 },
  { name: "Onyx Fountain Pen", category: "Accessories", price: 420, margin: 0.63 },
  { name: "Eclipse Sunglasses", category: "Accessories", price: 380, margin: 0.69 },
  { name: "Marble Desk Clock", category: "Accessories", price: 260, margin: 0.6 },
];

const FIRST = ["Ava","Liam","Noah","Maya","Ethan","Zara","Felix","Iris","Hugo","Nina","Oscar","Leila","Ravi","Sofia","Jonas","Elena","Marcus","Priya","Dario","Amara","Kenji","Freya","Tobias","Anika"];
const LAST = ["Sinclair","Moreau","Takahashi","Bennett","Rossi","Khan","Lindqvist","Okafor","Delacroix","Vance","Herrera","Novak","Ashworth","Mehta","Caruso","Winters","Duval","Sørensen","Alvarez","Nakamura"];

async function main() {
  console.log("Seeding AURUM…");

  // Wipe in dependency order so reseeding is idempotent.
  await prisma.insight.deleteMany();
  await prisma.insightBatch.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.expenseByCategory.deleteMany();
  await prisma.monthlyFinancial.deleteMany();
  await prisma.user.deleteMany();

  // Demo login
  await prisma.user.create({
    data: {
      email: "demo@aurum.finance",
      name: "Demo Operator",
      password: await bcrypt.hash("demo1234", 10),
    },
  });

  // ---- Monthly P&L: compounding growth × seasonality × noise ----
  const BASE_REVENUE = 182_000;
  const GROWTH = 1.028; // ~2.8% MoM
  for (let i = 0; i < MONTHS.length; i++) {
    const month = MONTHS[i];
    const season = SEASON[month.getUTCMonth()];
    const revenue = round2(BASE_REVENUE * Math.pow(GROWTH, i) * season * between(0.93, 1.07));
    // Expense ratio slowly improves as the brand scales (78% -> ~66%).
    const ratio = 0.78 - i * 0.005 + between(-0.02, 0.02);
    const expenses = round2(revenue * ratio);
    const opShare = between(0.68, 0.74);
    const operational = round2(expenses * opShare);
    const nonOperational = round2(expenses - operational);

    await prisma.monthlyFinancial.create({
      data: { month, revenue, expenses, operationalExpenses: operational, nonOperationalExpenses: nonOperational },
    });

    // Category composition with jitter, normalized back to the total.
    const jittered = EXPENSE_CATEGORIES.map((c) => ({ name: c.name, w: c.share * between(0.85, 1.15) }));
    const wSum = jittered.reduce((s, c) => s + c.w, 0);
    for (const c of jittered) {
      await prisma.expenseByCategory.create({
        data: { month, category: c.name, amount: round2((expenses * c.w) / wSum) },
      });
    }
  }

  // ---- Products ----
  const productRows = [];
  for (const p of PRODUCTS) {
    productRows.push(
      await prisma.product.create({
        data: {
          name: p.name,
          category: p.category,
          price: p.price,
          expense: round2(p.price * (1 - p.margin)),
          unitsSold: Math.floor(between(120, 2400) * (300 / p.price + 0.6)),
          rating: round2(between(3.9, 5)),
        },
      })
    );
  }

  // ---- Transactions: ~520, weighted toward recent months + Q4 ----
  const STATUSES: TxStatus[] = ["COMPLETED","COMPLETED","COMPLETED","COMPLETED","COMPLETED","COMPLETED","COMPLETED","COMPLETED","PENDING","REFUNDED"];
  const METHODS: TxMethod[] = ["CARD","CARD","CARD","CARD","CARD","WIRE","PAYPAL","PAYPAL"];
  const txCount = 520;
  for (let t = 0; t < txCount; t++) {
    // Bias toward later months: sqrt curve pushes mass to the recent end.
    const mi = Math.min(23, Math.floor(Math.sqrt(rand()) * 24));
    const month = MONTHS[mi];
    const season = SEASON[month.getUTCMonth()];
    if (season > 1.1 && rand() < 0.25) {
      // extra Q4 order — resample within the same month
    }
    const day = Math.floor(between(1, 28));
    const occurredAt = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day, Math.floor(between(8, 22)), Math.floor(between(0, 59))));
    const product = pick(productRows);
    const quantity = rand() < 0.8 ? 1 : Math.floor(between(2, 4));
    const first = pick(FIRST);
    const last = pick(LAST);
    await prisma.transaction.create({
      data: {
        buyer: `${first} ${last}`,
        email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, "")}@example.com`,
        amount: round2(product.price * quantity * between(0.95, 1.05)),
        quantity,
        status: pick(STATUSES),
        method: pick(METHODS),
        occurredAt,
        productId: product.id,
      },
    });
  }

  // ---- Campaigns ----
  const campaigns: { name: string; channel: string; status: CampaignStatus; startedAt: Date; budget: number; spendR: number; target: number; attainment: number }[] = [
    { name: "Winter Gold Edit", channel: "Paid Social", status: "COMPLETED", startedAt: new Date(Date.UTC(2025, 10, 1)), budget: 60_000, spendR: 0.97, target: 300_000, attainment: 1.18 },
    { name: "Maison Pop-up · Paris", channel: "Events", status: "COMPLETED", startedAt: new Date(Date.UTC(2025, 8, 12)), budget: 85_000, spendR: 1.0, target: 260_000, attainment: 0.92 },
    { name: "Signature Scent Launch", channel: "Influencer", status: "COMPLETED", startedAt: new Date(Date.UTC(2026, 1, 3)), budget: 45_000, spendR: 0.88, target: 180_000, attainment: 1.31 },
    { name: "Spring Capsule Drop", channel: "Email + CRM", status: "ACTIVE", startedAt: new Date(Date.UTC(2026, 3, 1)), budget: 30_000, spendR: 0.72, target: 150_000, attainment: 0.78 },
    { name: "Timepiece Trade-in", channel: "Retail Partners", status: "ACTIVE", startedAt: new Date(Date.UTC(2026, 4, 15)), budget: 52_000, spendR: 0.41, target: 220_000, attainment: 0.36 },
    { name: "Search — Evergreen Luxe", channel: "Paid Search", status: "PAUSED", startedAt: new Date(Date.UTC(2026, 0, 10)), budget: 40_000, spendR: 0.63, target: 120_000, attainment: 0.54 },
  ];
  for (const c of campaigns) {
    await prisma.campaign.create({
      data: {
        name: c.name,
        channel: c.channel,
        status: c.status,
        startedAt: c.startedAt,
        budget: c.budget,
        spend: round2(c.budget * c.spendR),
        targetRevenue: c.target,
        attributedRevenue: round2(c.target * c.attainment),
      },
    });
  }

  const fin = await prisma.monthlyFinancial.count();
  const tx = await prisma.transaction.count();
  console.log(`Seeded: ${fin} months, ${PRODUCTS.length} products, ${tx} transactions, ${campaigns.length} campaigns.`);
  console.log("Login: demo@aurum.finance / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
