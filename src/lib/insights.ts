import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";
import { formatMoneyCompact } from "./utils";

// The Claude model used for the AI analyst. Override with INSIGHTS_MODEL.
const MODEL = process.env.INSIGHTS_MODEL || "claude-sonnet-5";

// The Gemini model used when GEMINI_API_KEY is set. Override with GEMINI_MODEL.
// "gemini-flash-latest" always points at the current free-tier flash model.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

// Free-tier daily quotas are counted PER MODEL, so each entry below is a
// separate quota bucket. When the preferred model is exhausted (429) or
// unavailable (404/503), geminiInsights retries the same request on the next
// one before falling through to the heuristic analyst.
const GEMINI_MODELS = [
  ...new Set([
    GEMINI_MODEL,
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-2.5-flash-lite",
  ]),
];

const INSIGHT_CATEGORIES = ["Revenue", "Expenses", "Products", "Campaigns", "Forecast"] as const;
const INSIGHT_SEVERITIES = ["POSITIVE", "INFO", "WARNING", "CRITICAL"] as const;

type Severity = "POSITIVE" | "INFO" | "WARNING" | "CRITICAL";

export interface InsightItem {
  title: string;
  body: string;
  category: string; // Revenue | Expenses | Products | Campaigns | Forecast
  severity: Severity;
}

export interface InsightPayload {
  summary: string;
  healthScore: number;
  insights: InsightItem[];
  source: "AI" | "HEURISTIC";
}

// --- Snapshot: the numbers the analyst reasons over -------------------------
interface Snapshot {
  months: { label: string; revenue: number; expenses: number; profit: number }[];
  revenueMoMPct: number; // latest month vs previous
  avgMarginPct: number; // trailing 6 months
  marginTrendPct: number; // margin last 3mo avg minus prior 3mo avg
  categoryTotals: { category: string; amount: number }[]; // trailing 6 months
  topProducts: { name: string; revenue: number; marginPct: number }[];
  worstProduct: { name: string; marginPct: number } | null;
  campaigns: { name: string; roi: number; attainmentPct: number; status: string }[];
  anomalies: { label: string; metric: string; deltaPct: number }[];
  refundRatePct: number;
}

async function buildSnapshot(): Promise<Snapshot> {
  const fin = await prisma.monthlyFinancial.findMany({ orderBy: { month: "asc" } });
  const months = fin.map((m) => ({
    label: m.month.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }),
    revenue: m.revenue,
    expenses: m.expenses,
    profit: m.revenue - m.expenses,
  }));

  const last = months[months.length - 1];
  const prev = months[months.length - 2];
  const revenueMoMPct = prev ? ((last.revenue - prev.revenue) / prev.revenue) * 100 : 0;

  const marginOf = (m: { revenue: number; profit: number }) => (m.profit / m.revenue) * 100;
  const tail6 = months.slice(-6);
  const avgMarginPct = tail6.reduce((s, m) => s + marginOf(m), 0) / tail6.length;
  const last3 = months.slice(-3);
  const prior3 = months.slice(-6, -3);
  const marginTrendPct =
    last3.reduce((s, m) => s + marginOf(m), 0) / 3 - prior3.reduce((s, m) => s + marginOf(m), 0) / 3;

  // Anomalies: z-score of month-over-month % changes, flag |z| > 1.8.
  const anomalies: Snapshot["anomalies"] = [];
  for (const metric of ["revenue", "expenses"] as const) {
    const deltas: number[] = [];
    for (let i = 1; i < months.length; i++) {
      deltas.push((months[i][metric] - months[i - 1][metric]) / months[i - 1][metric]);
    }
    const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
    const sd = Math.sqrt(deltas.reduce((s, d) => s + (d - mean) ** 2, 0) / deltas.length);
    deltas.forEach((d, i) => {
      if (sd > 0 && Math.abs((d - mean) / sd) > 1.8) {
        anomalies.push({ label: months[i + 1].label, metric, deltaPct: d * 100 });
      }
    });
  }

  const sixMonthsAgo = fin[Math.max(0, fin.length - 6)].month;
  const cats = await prisma.expenseByCategory.groupBy({
    by: ["category"],
    where: { month: { gte: sixMonthsAgo } },
    _sum: { amount: true },
  });
  const categoryTotals = cats
    .map((c) => ({ category: c.category, amount: c._sum.amount ?? 0 }))
    .sort((a, b) => b.amount - a.amount);

  const products = await prisma.product.findMany();
  const withRev = products.map((p) => ({
    name: p.name,
    revenue: p.price * p.unitsSold,
    marginPct: ((p.price - p.expense) / p.price) * 100,
  }));
  const topProducts = [...withRev].sort((a, b) => b.revenue - a.revenue).slice(0, 3);
  const worst = [...withRev].sort((a, b) => a.marginPct - b.marginPct)[0] ?? null;

  const campaignRows = await prisma.campaign.findMany();
  const campaigns = campaignRows.map((c) => ({
    name: c.name,
    roi: c.spend > 0 ? c.attributedRevenue / c.spend : 0,
    attainmentPct: (c.attributedRevenue / c.targetRevenue) * 100,
    status: c.status,
  }));

  const [refunded, total] = await Promise.all([
    prisma.transaction.count({ where: { status: "REFUNDED" } }),
    prisma.transaction.count(),
  ]);

  return {
    months: months.slice(-12),
    revenueMoMPct,
    avgMarginPct,
    marginTrendPct,
    categoryTotals,
    topProducts,
    worstProduct: worst ? { name: worst.name, marginPct: worst.marginPct } : null,
    campaigns,
    anomalies,
    refundRatePct: total > 0 ? (refunded / total) * 100 : 0,
  };
}

// Health score is always computed deterministically so the meter is honest
// whether or not the AI wrote the prose.
function computeHealthScore(s: Snapshot): number {
  let score = 50;
  score += Math.max(-15, Math.min(15, s.revenueMoMPct * 1.5));
  score += Math.max(-15, Math.min(20, (s.avgMarginPct - 15) * 0.8));
  score += Math.max(-10, Math.min(10, s.marginTrendPct * 2));
  score -= Math.min(10, s.anomalies.length * 4);
  score -= Math.min(8, Math.max(0, s.refundRatePct - 5));
  const goodCampaigns = s.campaigns.filter((c) => c.roi >= 3).length;
  score += Math.min(8, goodCampaigns * 2.5);
  return Math.max(0, Math.min(100, Math.round(score)));
}

// --- Heuristic analyst (no API key needed) -----------------------------------
function heuristicInsights(s: Snapshot): InsightPayload {
  const items: InsightItem[] = [];
  const last = s.months[s.months.length - 1];

  items.push({
    title: s.revenueMoMPct >= 0 ? "Revenue is compounding" : "Revenue dipped month-over-month",
    body: `Latest month closed at ${formatMoneyCompact(last.revenue)}, ${s.revenueMoMPct >= 0 ? "up" : "down"} ${Math.abs(s.revenueMoMPct).toFixed(1)}% vs the prior month. Trailing-6-month net margin averages ${s.avgMarginPct.toFixed(1)}%.`,
    category: "Revenue",
    severity: s.revenueMoMPct >= 0 ? "POSITIVE" : "WARNING",
  });

  items.push({
    title: s.marginTrendPct >= 0 ? "Margins are widening" : "Margin compression detected",
    body: `Net margin moved ${s.marginTrendPct >= 0 ? "+" : ""}${s.marginTrendPct.toFixed(1)} points comparing the last 3 months against the prior 3. ${s.marginTrendPct >= 0 ? "Operating leverage is kicking in as revenue scales." : "Review the largest expense lines before it erodes further."}`,
    category: "Expenses",
    severity: s.marginTrendPct >= 0 ? "POSITIVE" : "WARNING",
  });

  const topCat = s.categoryTotals[0];
  if (topCat) {
    const share = (topCat.amount / s.categoryTotals.reduce((x, c) => x + c.amount, 0)) * 100;
    items.push({
      title: `${topCat.category} dominates the cost base`,
      body: `${topCat.category} absorbed ${formatMoneyCompact(topCat.amount)} over the trailing 6 months — ${share.toFixed(0)}% of total spend. Benchmark this line against revenue growth to confirm it is buying output, not overhead.`,
      category: "Expenses",
      severity: "INFO",
    });
  }

  const hero = s.topProducts[0];
  if (hero) {
    items.push({
      title: `${hero.name} is the revenue engine`,
      body: `It leads the catalog at ${formatMoneyCompact(hero.revenue)} lifetime revenue on a ${hero.marginPct.toFixed(0)}% unit margin. Protect availability and consider a companion product at a lower entry price.`,
      category: "Products",
      severity: "POSITIVE",
    });
  }
  if (s.worstProduct && s.worstProduct.marginPct < 55) {
    items.push({
      title: `${s.worstProduct.name} drags unit economics`,
      body: `At ${s.worstProduct.marginPct.toFixed(0)}% unit margin it sits well below the catalog average. Reprice, renegotiate cost, or sunset it.`,
      category: "Products",
      severity: "WARNING",
    });
  }

  const bestCampaign = [...s.campaigns].sort((a, b) => b.roi - a.roi)[0];
  if (bestCampaign) {
    items.push({
      title: `${bestCampaign.name} is the standout campaign`,
      body: `Every $1 of spend returned $${bestCampaign.roi.toFixed(2)} in attributed revenue (${bestCampaign.attainmentPct.toFixed(0)}% of target). Shift incremental budget here from underperforming channels.`,
      category: "Campaigns",
      severity: bestCampaign.roi >= 3 ? "POSITIVE" : "INFO",
    });
  }

  for (const a of s.anomalies.slice(0, 2)) {
    items.push({
      title: `Unusual ${a.metric} swing in ${a.label}`,
      body: `${a.metric === "revenue" ? "Revenue" : "Expenses"} moved ${a.deltaPct >= 0 ? "+" : ""}${a.deltaPct.toFixed(1)}% month-over-month — more than 1.8 standard deviations from the typical change. Verify the driver (campaign, seasonality, or a booking error).`,
      category: "Forecast",
      severity: Math.abs(a.deltaPct) > 25 ? "CRITICAL" : "WARNING",
    });
  }

  const health = computeHealthScore(s);
  return {
    summary: `The business closed the latest month at ${formatMoneyCompact(last.revenue)} revenue with a ${s.avgMarginPct.toFixed(1)}% average net margin over the trailing half-year. Revenue moved ${s.revenueMoMPct >= 0 ? "+" : ""}${s.revenueMoMPct.toFixed(1)}% month-over-month and margins are ${s.marginTrendPct >= 0 ? "expanding" : "compressing"}. ${s.anomalies.length > 0 ? `${s.anomalies.length} statistical anomal${s.anomalies.length === 1 ? "y" : "ies"} warrant review.` : "No statistical anomalies detected in the series."}`,
    healthScore: health,
    insights: items,
    source: "HEURISTIC",
  };
}

// The instruction + financial snapshot both analysts reason over. Kept in one
// place so Claude and Gemini receive byte-for-byte identical input.
function analystPrompt(s: Snapshot): string {
  return `You are the CFO-level analyst for AURUM, a premium D2C luxury goods brand. Analyze this financial snapshot and report sharp, specific, non-generic findings. Cite the actual numbers. Return a 3-4 sentence executive summary plus 5-8 insights, each with a punchy title, a 2-3 sentence body (the finding, why it matters, and one concrete action), a category (one of ${INSIGHT_CATEGORIES.join(", ")}), and a severity (one of ${INSIGHT_SEVERITIES.join(", ")}).

Last 12 months (revenue / expenses / profit):
${s.months.map((m) => `${m.label}: ${Math.round(m.revenue)} / ${Math.round(m.expenses)} / ${Math.round(m.profit)}`).join("\n")}

Latest MoM revenue change: ${s.revenueMoMPct.toFixed(1)}%
Trailing-6mo avg net margin: ${s.avgMarginPct.toFixed(1)}% (trend ${s.marginTrendPct >= 0 ? "+" : ""}${s.marginTrendPct.toFixed(1)} pts, last 3mo vs prior 3mo)
Expense mix (trailing 6mo): ${s.categoryTotals.map((c) => `${c.category} ${Math.round(c.amount)}`).join(", ")}
Top products by lifetime revenue: ${s.topProducts.map((p) => `${p.name} (${Math.round(p.revenue)}, ${p.marginPct.toFixed(0)}% margin)`).join("; ")}
Weakest unit margin: ${s.worstProduct ? `${s.worstProduct.name} at ${s.worstProduct.marginPct.toFixed(0)}%` : "n/a"}
Campaign ROI (attributed revenue / spend): ${s.campaigns.map((c) => `${c.name} ${c.roi.toFixed(2)}x, ${c.attainmentPct.toFixed(0)}% of target, ${c.status}`).join("; ")}
Refund rate: ${s.refundRatePct.toFixed(1)}% of transactions
Statistical anomalies (|z| > 1.8 on MoM change): ${s.anomalies.length ? s.anomalies.map((a) => `${a.metric} ${a.deltaPct >= 0 ? "+" : ""}${a.deltaPct.toFixed(1)}% in ${a.label}`).join("; ") : "none"}`;
}

// --- Claude-powered analyst ---------------------------------------------------
async function aiInsights(s: Snapshot): Promise<InsightPayload | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1600,
      tools: [
        {
          name: "report_financial_insights",
          description: "Report an executive financial analysis for the AURUM dashboard.",
          input_schema: {
            type: "object",
            properties: {
              summary: {
                type: "string",
                description: "3-4 sentence executive summary of the company's financial position.",
              },
              insights: {
                type: "array",
                minItems: 5,
                maxItems: 8,
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Short, punchy headline." },
                    body: { type: "string", description: "2-3 sentences: the finding, why it matters, and one concrete action." },
                    category: { type: "string", enum: ["Revenue", "Expenses", "Products", "Campaigns", "Forecast"] },
                    severity: { type: "string", enum: ["POSITIVE", "INFO", "WARNING", "CRITICAL"] },
                  },
                  required: ["title", "body", "category", "severity"],
                },
              },
            },
            required: ["summary", "insights"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "report_financial_insights" },
      messages: [{ role: "user", content: analystPrompt(s) }],
    });

    const toolUse = message.content.find((c) => c.type === "tool_use");
    if (toolUse && toolUse.type === "tool_use") {
      const input = toolUse.input as { summary: string; insights: InsightItem[] };
      return {
        summary: input.summary,
        healthScore: computeHealthScore(s),
        insights: input.insights,
        source: "AI",
      };
    }
    return null;
  } catch (err) {
    console.error("Claude insights failed, using heuristic:", err);
    return null;
  }
}

// --- Gemini-powered analyst (free tier via Google AI Studio) ------------------
// Uses the REST API directly so no extra npm dependency is required. Get a free
// key (no credit card) at https://aistudio.google.com/apikey.
async function geminiInsights(s: Snapshot): Promise<InsightPayload | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // Force structured JSON that mirrors the InsightPayload shape. Gemini's
  // responseSchema is a subset of OpenAPI (type/properties/required/items/enum).
  const responseSchema = {
    type: "object",
    properties: {
      summary: { type: "string" },
      insights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            body: { type: "string" },
            category: { type: "string", enum: [...INSIGHT_CATEGORIES] },
            severity: { type: "string", enum: [...INSIGHT_SEVERITIES] },
          },
          required: ["title", "body", "category", "severity"],
        },
      },
    },
    required: ["summary", "insights"],
  };

  try {
    // Quota errors are per model — walk the fallback chain before giving up.
    let res: Response | null = null;
    for (const candidate of GEMINI_MODELS) {
      const attempt = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: analystPrompt(s) }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema,
              // Generous ceiling: current flash models spend "thinking" tokens
              // against this budget, so a low cap can truncate the JSON.
              maxOutputTokens: 8192,
            },
          }),
        },
      );
      if (attempt.ok) {
        res = attempt;
        break;
      }
      console.error(`Gemini insights failed (${candidate}):`, attempt.status, await attempt.text());
      if (![429, 404, 503].includes(attempt.status)) return null;
    }
    if (!res) return null;

    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text) as { summary: string; insights: InsightItem[] };
    if (!parsed.summary || !Array.isArray(parsed.insights) || parsed.insights.length === 0) {
      return null;
    }
    return {
      summary: parsed.summary,
      healthScore: computeHealthScore(s),
      insights: parsed.insights,
      source: "AI",
    };
  } catch (err) {
    console.error("Gemini insights failed, using fallback:", err);
    return null;
  }
}

// Generate a fresh batch, persist it, and return it with items.
export async function generateAndSaveInsights() {
  const snapshot = await buildSnapshot();
  // Prefer whichever AI key is configured (Claude, then Gemini), then fall back
  // to the deterministic heuristic analyst so the dashboard always produces output.
  const payload =
    (await aiInsights(snapshot)) ?? (await geminiInsights(snapshot)) ?? heuristicInsights(snapshot);

  const batch = await prisma.insightBatch.create({
    data: {
      summary: payload.summary,
      healthScore: payload.healthScore,
      source: payload.source,
      items: {
        create: payload.insights.map((i) => ({
          title: i.title,
          body: i.body,
          category: i.category,
          severity: i.severity,
        })),
      },
    },
    include: { items: true },
  });
  return batch;
}

export async function getLatestInsightBatch() {
  return prisma.insightBatch.findFirst({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
}
