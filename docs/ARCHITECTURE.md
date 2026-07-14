# AURUM — Architecture & Tooling Notes

A map of every tool used to build this project and how the pieces talk to each other.

---

## 1. The full tool / technology list

| Layer | Tool | Version | What it does here |
|-------|------|---------|-------------------|
| **Framework** | [Next.js](https://nextjs.org) (App Router) | 16.2.10 | The whole app — routing, server components, API routes, dev server. Runs on **Turbopack**. |
| **UI runtime** | React | 19.2.4 | Component rendering (both server and client components). |
| **Language** | TypeScript | 5.x | Types across the entire codebase. |
| **Styling** | Tailwind CSS | 4.x | Utility-first styling, via `@tailwindcss/postcss`. Theme tokens (`--gold`, `--ink`, …) live in `globals.css`. |
| **Fonts** | `next/font/google` | — | Loads *Manrope* (body) + *Playfair Display* (headings) at build time, no network request at runtime. |
| **Charts** | [Recharts](https://recharts.org) | 3.9.2 | All charts (line, area, donut, scatter, meters). Client-side SVG. |
| **Database** | PostgreSQL | 17 | The single source of truth. Runs as the Windows service `postgresql-x64-17` on `localhost:5432`. |
| **ORM** | [Prisma](https://www.prisma.io) | 6.19.3 | Type-safe DB access + schema/migrations. `@prisma/client` is the query API; `prisma` CLI does `db push` / `generate` / `seed`. |
| **Auth** | [NextAuth](https://next-auth.js.org) (Auth.js) | 4.24.14 | Email/password login with **JWT sessions** (no session table). |
| **Password hashing** | bcryptjs | 3.0.3 | Hashes passwords before they hit the DB; compares on login. |
| **AI analyst** | [`@anthropic-ai/sdk`](https://docs.anthropic.com) (Claude) | 0.110.0 | Reads a financial snapshot and returns structured insights via **tool use**. Optional — falls back to a heuristic. |
| **Seed / scripts** | tsx | 4.23.0 | Runs `prisma/seed.ts` (TypeScript) directly without a build step. |
| **Linting** | ESLint | 9.x + `eslint-config-next` | Code quality. |

Everything is one **Node.js process** (the Next.js server). There is no separate backend — the API routes *are* the backend.

---

## 2. How the layers are linked

```
Browser (React client components)
   │  HTTP: page navigation + fetch() calls
   ▼
Next.js server  ─────────────────────────────────────────────┐
   │                                                          │
   ├── Server Components (pages)   ── call ──►  src/lib/*  ──┐ │
   ├── API Route Handlers          ── call ──►  src/lib/*  ──┤ │
   │                                                        │ │
   │                                          ┌─────────────▼─▼──────┐
   │                                          │  src/lib (the glue)  │
   │                                          │  prisma · auth ·     │
   │                                          │  finance · insights  │
   │                                          └───────┬────────┬─────┘
   │                                                  │        │
   │                              Prisma Client ◄─────┘        └────► Anthropic SDK
   ▼                                    │                              │
PostgreSQL (localhost:5432)  ◄──────────┘                             ▼
                                                              Claude API (api.anthropic.com)
```

**`src/lib/` is the hub** every other part routes through — nothing talks to the database or Claude directly except code in `lib`.

- `lib/prisma.ts` — the one shared `PrismaClient` instance (reused across hot-reloads so the DB pool isn't exhausted).
- `lib/auth.ts` — NextAuth config (the Credentials provider, JWT callbacks).
- `lib/session.ts` — `getSession()` helper wrapping `getServerSession`.
- `lib/finance.ts` — all read queries for dashboard data; converts Prisma rows → plain JSON shapes for the client.
- `lib/insights.ts` — builds the financial snapshot, calls Claude (or the heuristic), and persists results.
- `lib/regression.ts` — pure math (no DB), the from-scratch forecast.
- `lib/utils.ts` — formatting helpers.

---

## 3. The main communication paths

### A) Signing in (auth flow)
```
Login form (client)
  → signIn("credentials")  [next-auth/react]
    → POST /api/auth/[...nextauth]        (NextAuth handler)
      → authOptions.authorize()  in lib/auth.ts
        → prisma.user.findUnique()  → PostgreSQL
        → bcrypt.compare(password, hash)
      → issues a signed JWT (secret = AUTH_SECRET)
  → JWT stored in the next-auth.session-token cookie
```
Every later request sends that cookie; server code reads it with `getSession()`. The user id is smuggled into the token by the `jwt` callback and surfaced by the `session` callback.

> ⚠️ The "decryption operation failed" error you hit earlier happens when the cookie was signed with a **different `AUTH_SECRET`** than the one currently in `.env`. Fix = clear cookies. Don't change the secret once users have logged in.

### B) Loading the dashboard (server-rendered, no client fetch)
```
GET /dashboard  → DashboardPage (server component)
  → getSession()               (redirect to /login if absent)
  → Promise.all([ getMonthlyFinancials(), getExpenseCategories(),
                  getProducts(), getRecentTransactions(), getCampaigns() ])
       └─ all in lib/finance.ts → Prisma → PostgreSQL
  → passes plain JSON props into <DashboardShell> (client)
       └─ Recharts renders the charts in the browser
```
`export const dynamic = "force-dynamic"` forces this to run fresh on every request (so it always reflects live data and never breaks at build time when the DB is down).

### C) The transactions ledger (client-driven fetch)
```
LedgerView (client)  ── user types / filters / pages ──►
  fetch("/api/transactions?query=&status=&page=")
    → GET route handler → getSession() guard
    → prisma.transaction.findMany({ where, skip, take })  → PostgreSQL
    → JSON { total, rows } back to the client → re-render table
```
Search is debounced 300ms; CSV export just re-fetches with `take=200`.

### D) AI Insights (the Claude path)
```
InsightsView "Generate" button (client)
  → POST /api/insights → getSession() guard
    → generateAndSaveInsights()  in lib/insights.ts
        1. buildSnapshot()   → many Prisma queries → PostgreSQL   (turn raw books into KPIs)
        2. aiInsights()      → Anthropic SDK → Claude API
             · uses TOOL USE: Claude must call the `report_financial_insights`
               tool, so the reply is guaranteed-structured JSON, not prose.
             · if ANTHROPIC_API_KEY is empty OR the call fails → returns null
        3. heuristicInsights()  ← deterministic fallback if step 2 gave null
        4. prisma.insightBatch.create()  → PostgreSQL   (persist the batch + items)
  → client calls router.refresh() → the /insights server component re-reads the latest batch
```
Key design choice: the **health score is always computed locally** (`computeHealthScore`), so the number is honest whether Claude or the heuristic wrote the prose. Model is `claude-sonnet-5` (override with `INSIGHTS_MODEL`).

---

## 4. Server vs. client components (who runs where)

- **Server components** (`page.tsx` files): run on the Node server, can touch Prisma/Claude directly, never ship secrets to the browser. They fetch data and pass it down as props.
- **Client components** (marked `"use client"`: `DashboardShell`, `LedgerView`, `InsightsView`, `Shell`, `Providers`, all charts): run in the browser, handle interactivity, and reach the server only through `fetch()` to `/api/*` routes or NextAuth helpers.
- `Providers.tsx` wraps the app in NextAuth's `<SessionProvider>` so client components can read session state.

---

## 5. Configuration & secrets (`.env`)

| Variable | Consumed by | Purpose |
|----------|-------------|---------|
| `DATABASE_URL` | Prisma (`schema.prisma`) | PostgreSQL connection string. |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | NextAuth (`lib/auth.ts`) | Signs & encrypts the JWT session cookie. |
| `NEXTAUTH_URL` | NextAuth | Base URL for callbacks. |
| `ANTHROPIC_API_KEY` | Anthropic SDK (`lib/insights.ts`) | Enables the real Claude analyst; empty = heuristic fallback. |
| `INSIGHTS_MODEL` | `lib/insights.ts` | Optional model override (default `claude-sonnet-5`). |

The Prisma schema is the contract for the DB: `User`, `MonthlyFinancial`, `ExpenseByCategory`, `Product`, `Transaction`, `Campaign`, `InsightBatch` → `Insight`. `prisma db push` turns that schema into real tables; `prisma generate` turns it into the typed client the whole app imports.

---

## 6. One-line summary

> A single **Next.js** process serves both the UI and the API. **React** components (server ones read data via **Prisma** from **PostgreSQL**; client ones fetch from `/api/*`). **NextAuth** guards everything with a bcrypt-checked JWT cookie. The AI Insights feature sends a computed snapshot to **Claude** via the **Anthropic SDK** using tool-use for structured output, with a deterministic heuristic fallback — and **Recharts** draws it all.
