import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Shell } from "@/components/Shell";
import { LedgerView } from "@/components/transactions/LedgerView";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { query } = await searchParams;

  const user = session.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email }, select: { preferences: true } })
    : null;
  const prefs = (user?.preferences ?? {}) as { ledgerPageSize?: number };
  const pageSize = [10, 15, 25, 50].includes(prefs.ledgerPageSize ?? 0) ? prefs.ledgerPageSize! : 15;

  return (
    <Shell user={session.user ?? {}}>
      <LedgerView initialQuery={query ?? ""} pageSize={pageSize} />
    </Shell>
  );
}
