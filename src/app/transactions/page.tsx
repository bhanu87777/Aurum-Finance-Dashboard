import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { LedgerView } from "@/components/transactions/LedgerView";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <Shell user={session.user ?? {}}>
      <LedgerView />
    </Shell>
  );
}
