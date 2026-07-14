import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Monogram } from "@/components/Monogram";

// Landing: brand statement + entry points. Signed-in users go straight in.
export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Monogram />
          <span className="font-display text-xl tracking-wide">AURUM</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost rounded-lg px-4 py-2 text-sm">
            Sign in
          </Link>
          <Link href="/signup" className="btn-gold rounded-lg px-4 py-2 text-sm">
            Create account
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pb-24 pt-10 text-center">
        <p className="mb-5 rounded-full border border-border-strong px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-ink-secondary">
          AI Finance Intelligence
        </p>
        <h1 className="font-display max-w-3xl text-5xl leading-tight sm:text-6xl">
          Your books, read like a <span className="text-gradient-gold">CFO</span>.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-ink-secondary">
          Two years of P&amp;L, product economics, and campaign performance in one
          dark-glass console — with least-squares revenue forecasting and an AI
          analyst that tells you what the numbers mean.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link href="/signup" className="btn-gold rounded-xl px-7 py-3.5 text-sm">
            Open the console
          </Link>
          <Link href="/login" className="btn-ghost rounded-xl px-7 py-3.5 text-sm">
            Demo: demo@aurum.finance
          </Link>
        </div>

        <div className="mt-20 grid w-full gap-4 text-left sm:grid-cols-3">
          <Feature
            title="Live financial telemetry"
            body="KPIs with sparklines, revenue vs. expenses, operational split, expense composition — every chart scoped by one date-range filter."
          />
          <Feature
            title="ML revenue forecasting"
            body="An ordinary-least-squares model fit on 24 months of revenue, with R², growth slope, and a 95% confidence band on the next year."
          />
          <Feature
            title="An analyst, not just charts"
            body="Claude reads the same snapshot you see and returns an executive summary, anomalies, and concrete recommendations."
          />
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        AURUM · a portfolio project — Next.js · PostgreSQL · Prisma · NextAuth · Recharts · Claude API
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="panel panel-hover p-6">
      <h3 className="mb-2 text-sm font-bold tracking-wide text-gold">{title}</h3>
      <p className="text-sm leading-relaxed text-ink-secondary">{body}</p>
    </div>
  );
}
