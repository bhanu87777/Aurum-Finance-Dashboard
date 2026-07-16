import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Shell } from "@/components/Shell";
import { ImportWizard } from "@/components/transactions/import/ImportWizard";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <Shell user={session.user ?? {}}>
      <ImportWizard />
    </Shell>
  );
}
